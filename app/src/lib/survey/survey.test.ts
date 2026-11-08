import { describe, expect, it } from "vitest";
import { questionCopy } from "@/content/survey";
import seed from "../../../seed/survey_questions.json";
import { hashIp, secondsSinceStart, signStart } from "./guard";
import { personalityFor } from "./personality";
import { cleanUtm, validateAnswers, type SurveyQuestion } from "./validate";

const questions: SurveyQuestion[] = seed.map((q) => ({
  id: q.id, question: q.question, type: q.type as SurveyQuestion["type"], options: q.options,
  hint: q.hint ?? null, maxSelect: q.max ?? null, required: q.required, maxLength: q.max_length ?? null,
}));
const minimal = { Q5: "₹60-80", Q9: "4" };

describe("validateAnswers", () => {
  it("accepts a minimal valid response", () => {
    expect(validateAnswers(questions, minimal)).toEqual({ ok: true, answers: minimal });
  });

  it("requires Q5 and Q9", () => {
    const r = validateAnswers(questions, { Q3: "Daily" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["Q5", "Q9"]);
  });

  it("rejects a single answer that is not an option", () => {
    expect(validateAnswers(questions, { ...minimal, Q3: "Hourly" }).ok).toBe(false);
  });

  it("enforces max_select on multi questions (Q6 ≤ 3, Q8 ≤ 2)", () => {
    expect(validateAnswers(questions, { ...minimal, Q6: ["Vanilla", "Red velvet", "Gulab jamun"] }).ok).toBe(true);
    expect(validateAnswers(questions, { ...minimal, Q6: ["Vanilla", "Red velvet", "Gulab jamun", "Gajar halwa"] }).ok).toBe(false);
    expect(validateAnswers(questions, { ...minimal, Q8: ["Price", "Effort to make", "Dry or rubbery texture"] }).ok).toBe(false);
  });

  it("rejects unknown and duplicate multi options", () => {
    expect(validateAnswers(questions, { ...minimal, Q1: ["Microwave", "Tandoor"] }).ok).toBe(false);
    expect(validateAnswers(questions, { ...minimal, Q1: ["Microwave", "Microwave"] }).ok).toBe(false);
  });

  it("drops empty answers and unknown question ids", () => {
    const r = validateAnswers(questions, { ...minimal, Q1: [], Q10: "  ", Q99: "hi" });
    expect(r).toEqual({ ok: true, answers: minimal });
  });

  it("caps Q10 at 1000 characters", () => {
    expect(validateAnswers(questions, { ...minimal, Q10: "a".repeat(1000) }).ok).toBe(true);
    expect(validateAnswers(questions, { ...minimal, Q10: "a".repeat(1001) }).ok).toBe(false);
  });

  it("only accepts 1-5 on the scale", () => {
    expect(validateAnswers(questions, { Q5: "₹40-60", Q9: "6" }).ok).toBe(false);
    expect(validateAnswers(questions, { Q5: "₹40-60", Q9: 5 }).ok).toBe(true);
  });

  it("rejects non-object input", () => {
    expect(validateAnswers(questions, "nope").ok).toBe(false);
  });
});

describe("cleanUtm", () => {
  it("keeps known keys only, trimmed", () => {
    expect(cleanUtm({ utm_source: " reddit ", ref: "abc", evil: "x" })).toEqual({ utm_source: "reddit", ref: "abc" });
    expect(cleanUtm({})).toBeNull();
  });
});

describe("guard", () => {
  it("signs and verifies the start time", () => {
    const t = signStart(1_000_000);
    expect(secondsSinceStart(t, 1_009_000)).toBe(9);
  });
  it("rejects a tampered token", () => {
    const [, sig] = signStart(1_000_000).split(".");
    expect(secondsSinceStart(`900000.${sig}`, 1_009_000)).toBeNull();
    expect(secondsSinceStart("garbage")).toBeNull();
  });
  it("hashes IPs and never returns the raw IP", () => {
    const h = hashIp("1.2.3.4");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
    expect(h).not.toContain("1.2.3.4");
    expect(hashIp(null)).toBeNull();
  });
});

describe("personalityFor", () => {
  it("picks the critic for low likelihood first", () => {
    expect(personalityFor({ Q9: "2", Q3: "Daily" }).id).toBe("critic");
  });
  it("picks the texture snob when rubbery texture is a worry", () => {
    expect(personalityFor({ Q9: "4", Q8: ["Dry or rubbery texture"] }).id).toBe("texture");
  });
  it("falls back to curious crumb", () => {
    expect(personalityFor({}).id).toBe("curious");
  });
  it("gives each answer to the 10 pm dilemma its own personality", () => {
    const q11 = seed.find((q) => q.id === "Q11")!;
    const ids = q11.options.map((o) => personalityFor({ Q9: "4", Q11: o }).id);
    expect(ids).toEqual(["chef", "sheepish", "unbothered", "raider", "monk"]);
  });
  it("puts people who cannot have gluten with the label detectives", () => {
    expect(personalityFor({ Q9: "5", Q13: "I can't have gluten (allergy or intolerance)", Q11: "Fight it. I am a monk." }).id).toBe("detective");
  });
  it("lets a big protein ask beat the dilemma, and the dilemma beat the daily craving", () => {
    expect(personalityFor({ Q9: "4", Q12: "Like a scoop of whey, 25 g or more", Q11: "Fight it. I am a monk." }).id).toBe("macro");
    expect(personalityFor({ Q9: "4", Q3: "Daily", Q11: "Order something sweet and feel a bit guilty" }).id).toBe("sheepish");
    expect(personalityFor({ Q9: "4", Q3: "Daily" }).id).toBe("midnight");
  });
});

describe("survey copy matches the questions", () => {
  const active = seed.filter((q) => q.active);
  it.each(active.map((q) => [q.id, q] as const))("%s has host copy, and its emoji and reactions name real options", (_, q) => {
    const copy = questionCopy[q.id];
    expect(copy, `no copy for ${q.id}`).toBeDefined();
    const options = q.type === "scale_1_5" ? ["1", "2", "3", "4", "5"] : q.options;
    for (const map of [copy.emoji, copy.reactions ?? {}, copy.short ?? {}]) {
      for (const key of Object.keys(map)) expect(options, `${q.id}: "${key}" is not an option`).toContain(key);
    }
    if (copy.style) {
      expect(q.type, `${q.id}: ${copy.style} needs a single choice`).toBe("single");
      for (const o of options) expect(copy.emoji[o], `${q.id}: no emoji for "${o}"`).toBeTruthy();
    }
    if (copy.style === "slider") for (const o of options) expect(copy.short?.[o], `${q.id}: no short label for "${o}"`).toBeTruthy();
  });
  it("keeps the required questions the analysis depends on", () => {
    expect(active.filter((q) => q.required).map((q) => q.id).sort()).toEqual(["Q5", "Q9"]);
  });
});
