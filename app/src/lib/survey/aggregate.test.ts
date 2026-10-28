import { describe, expect, it } from "vitest";
import { aggregate, avgLikelihood, modeOf, tally, toCsv } from "./aggregate";
import type { SurveyQuestion } from "./validate";

const qs: SurveyQuestion[] = [
  { id: "Q1", question: "Kit?", type: "multi", options: ["Microwave", "Air fryer"], hint: null, maxSelect: null, required: false, maxLength: null },
  { id: "Q5", question: "Pay?", type: "single", options: ["₹60-80", "₹80-100"], hint: null, maxSelect: null, required: true, maxLength: null },
  { id: "Q9", question: "Likely?", type: "scale_1_5", options: ["1", "2", "3", "4", "5"], hint: null, maxSelect: null, required: true, maxLength: null },
  { id: "Q10", question: "Why?", type: "free_text", options: [], hint: null, maxSelect: null, required: false, maxLength: 1000 },
];

// Fixture of 3 responses with known counts (SPEC §3).
const responses = [
  { answers: { Q1: ["Microwave", "Air fryer"], Q5: "₹60-80", Q9: "5", Q10: "fudgy pls" } },
  { answers: { Q1: ["Microwave", "Tandoor"], Q5: "₹60-80", Q9: "4" } },
  { answers: { Q1: [], Q5: "₹80-100", Q9: "2" } },
];

describe("aggregate", () => {
  const rows = aggregate(qs, responses);
  const get = (key: string) => rows.find((r) => r.key === key)!;

  it("counts options and answered per question", () => {
    expect(get("Q1|Microwave")).toMatchObject({ count: 2, answered: 2, total_responses: 3 });
    expect(get("Q1|Air fryer").count).toBe(1);
    expect(get("Q5|₹60-80")).toMatchObject({ count: 2, answered: 3 });
    expect(get("Q9|5").count).toBe(1);
  });

  it("ignores unknown options and does not count an empty array as answered", () => {
    expect(rows.find((r) => r.option === "Tandoor")).toBeUndefined();
    expect(get("Q1|Microwave").answered).toBe(2);
  });

  it("skips free text", () => {
    expect(rows.some((r) => r.qid === "Q10")).toBe(false);
  });

  it("averages likelihood and finds the mode", () => {
    expect(avgLikelihood(responses)).toBe(3.7);
    expect(avgLikelihood([])).toBeNull();
    expect(modeOf(rows, "Q5")).toEqual({ option: "₹60-80", count: 2, tiedWith: 0 });
    expect(modeOf(aggregate(qs, responses.slice(1)), "Q5")?.tiedWith).toBe(1);
    expect(modeOf(aggregate(qs, []), "Q5")).toBeNull();
  });
});

describe("tally", () => {
  it("groups blanks as direct, largest first", () => {
    expect(tally(["reddit", null, "reddit", ""])).toEqual([{ value: "reddit", count: 2 }, { value: "direct", count: 2 }]);
  });
});

describe("toCsv", () => {
  it("neutralises spreadsheet formulas in answers", () => {
    const csv = toCsv([{ id: "Q10", question: "Why?" }], [
      { id: "r1", updatedAt: new Date("2026-10-28T10:00:00Z"), source: "web", utm: null, answers: { Q10: "=HYPERLINK(1)" } },
    ]);
    expect(csv.trim().split("\n")[1].endsWith(",'=HYPERLINK(1)")).toBe(true);
  });

  it("quotes commas, quotes and newlines and joins multi answers", () => {
    const csv = toCsv([{ id: "Q1", question: "Kit?" }, { id: "Q10", question: "Why, though?" }], [
      { id: "r1", updatedAt: new Date("2026-10-28T10:00:00Z"), source: "web", utm: { utm_source: "reddit" }, answers: { Q1: ["Microwave", "Air fryer"], Q10: 'say "hi",\nok' } },
    ]);
    expect(csv).toBe(
      'response_id,updated_at_utc,source,utm_source,utm_campaign,ref,Q1 Kit?,"Q10 Why, though?"\n' +
      'r1,2026-10-28T10:00:00.000Z,web,reddit,,,Microwave; Air fryer,"say ""hi"",\nok"\n',
    );
  });
});
