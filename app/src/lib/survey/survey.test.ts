import { describe, expect, it } from "vitest";
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
  it("picks mithai royalty when most flavours are Indian", () => {
    expect(personalityFor({ Q9: "4", Q6: ["Kesar pista", "Gulab jamun", "Vanilla"] }).id).toBe("mithai");
  });
  it("falls back to curious crumb", () => {
    expect(personalityFor({}).id).toBe("curious");
  });
});
