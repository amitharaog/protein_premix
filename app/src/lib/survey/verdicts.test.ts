import { describe, expect, it } from "vitest";
import seed from "../../../seed/survey_questions.json";
import { levelFor, overallVerdict, surveyVerdicts, waitlistCheck, type VerdictResponse } from "./verdicts";

const person = (i: number, answers: VerdictResponse["answers"]): VerdictResponse => ({ respondentId: `r${i}`, answers });
const many = (n: number, answers: VerdictResponse["answers"], from = 0) => Array.from({ length: n }, (_, i) => person(from + i, answers));
const byId = (rs: VerdictResponse[], joined = new Set<string>()) => Object.fromEntries(surveyVerdicts(rs, { joined }).map((a) => [a.id, a]));

describe("levelFor", () => {
  it("needs answers before it leans, and 30 before it is sure", () => {
    expect(levelFor(0.9, 4, 0.6, 0.4)).toBe("too-few");
    expect(levelFor(0.9, 5, 0.6, 0.4)).toBe("good-so-far");
    expect(levelFor(0.9, 30, 0.6, 0.4)).toBe("go");
    expect(levelFor(0.5, 30, 0.6, 0.4)).toBe("borderline");
    expect(levelFor(0.2, 10, 0.6, 0.4)).toBe("weak-so-far");
    expect(levelFor(0.2, 30, 0.6, 0.4)).toBe("no");
    expect(levelFor(null, 30, 0.6, 0.4)).toBe("too-few");
  });
});

describe("surveyVerdicts", () => {
  it("reads demand from Q9 and checks it against waitlist joins", () => {
    const rs = [...many(4, { Q9: "5" }), person(9, { Q9: "2" })];
    const a = byId(rs, new Set(["r0"])).demand;
    expect(a.headline).toBe("80% would likely buy (4 of 5 said 4 or 5)");
    expect(a.level).toBe("good-so-far");
    expect(a.notes.join(" ")).toContain("1 of 4 likely buyers joined the waitlist (25%; the gate wants 30% or more)");
    expect(a.notes.join(" ")).toContain("may be politeness");
  });

  it("counts every appliance it can be made in, pressure cooker included", () => {
    const rs = [...many(4, { Q1: ["Pressure cooker"] }), person(4, { Q1: ["Microwave"] }), person(5, { Q1: ["None of these"] })];
    const a = byId(rs).kitchen;
    expect(a.headline).toBe("83% have a microwave, air fryer, oven or pressure cooker (5 of 6)");
    expect(a.level).toBe("good-so-far");
    expect(a.notes).toContain("17% (1 of 6) have a microwave.");
  });

  it("treats ₹80-100 and up as willing to pay around ₹99, with real spend as a check", () => {
    const rs = [...many(3, { Q5: "₹60-80", Q16: "Under ₹50" }), ...many(2, { Q5: "₹100-150", Q16: "₹200 or more" }, 3)];
    const a = byId(rs).price;
    expect(a.value).toBeCloseTo(0.4);
    expect(a.level).toBe("borderline");
    expect(a.notes.join(" ")).toContain("Real spend: 40% (2 of 5) spent ₹100 or more");
  });

  it("flags a make-at-home problem when most want ready-to-eat", () => {
    const rs = [...many(28, { Q18: "None. Ready to eat or nothing" }), ...many(2, { Q18: "I enjoy proper baking" }, 28)];
    const a = byId(rs).make;
    expect(a.level).toBe("no");
    expect(a.meaning).toContain("rethink the format");
  });

  it("finds the top craving moment and the top worry", () => {
    const rs = [...many(4, { Q14: ["Late at night", "Stress or a rough day"], Q8: ["Dry or rubbery texture"] }), person(8, { Q14: ["Chai or coffee time"], Q8: ["Price"] })];
    const v = byId(rs);
    expect(v.moment.headline).toBe("Top trigger: Late at night (80% of 5)");
    expect(v.worry.level).toBe("must-solve");
    expect(v.worry.meaning).toContain("dry or rubbery texture");
  });

  it("names every option it counts exactly as the survey does", () => {
    const options = new Set(seed.flatMap((q) => q.options));
    const v = byId(many(5, {}));
    for (const a of Object.values(v)) for (const b of a.breakdown) expect(options.has(b.label.replace(/^\d · .*$/, "1")), `${a.id}: ${b.label}`).toBe(true);
  });
});

describe("overallVerdict", () => {
  const basics = { Q9: "5", Q5: "₹100-150", Q18: "2 minutes, one bowl, no mess", Q1: ["Microwave"] };
  it("waits for answers, then leans, then decides", () => {
    expect(overallVerdict(surveyVerdicts(many(3, basics), { joined: new Set() }), 3).title).toBe("Not enough answers yet");
    const early = overallVerdict(surveyVerdicts(many(8, basics), { joined: new Set() }), 8);
    expect(early.title).toBe("Looks good so far");
    expect(early.detail).toContain("22 more");
    expect(overallVerdict(surveyVerdicts(many(30, basics), { joined: new Set() }), 30).title).toBe("Good to go to the next step");
  });

  it("says not good when a basic clearly fails", () => {
    const rs = many(30, { ...basics, Q5: "Wouldn't pay for this" });
    const o = overallVerdict(surveyVerdicts(rs, { joined: new Set() }), 30);
    expect(o.title).toBe("Not good yet");
    expect(o.detail).toContain("will they pay around ₹99");
  });

  it("puts what people did next to what they said", () => {
    const rs = many(8, basics);
    const joined = new Set(["r0", "r1"]);
    expect(waitlistCheck(rs, joined)).toEqual({ likely: 8, joined: 2 });
    const o = overallVerdict(surveyVerdicts(rs, { joined }), 8, waitlistCheck(rs, joined));
    expect(o.action).toBe("Real actions: 2 of 8 likely buyers joined the waitlist (25%; the gate wants 30% or more).");
    expect(overallVerdict(surveyVerdicts(many(8, { Q9: "2" }), { joined }), 8, waitlistCheck(many(8, { Q9: "2" }), joined)).action).toBeNull();
  });
});
