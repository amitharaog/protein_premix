import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import type { SurveyQuestion } from "./validate";
import { surveyWorkbook } from "./workbook";

const q = (id: string, type: SurveyQuestion["type"], question: string, options: string[] = []): SurveyQuestion =>
  ({ id, question, type, options, hint: null, maxSelect: null, required: false, maxLength: null });
const questions = [
  q("Q2", "multi", "How do you currently get extra protein?", ["Whey / protein powder", "Protein bars or snacks", "Regular food only (dal, paneer, eggs)"]),
  q("Q5", "single", "What would you pay for one sachet (protein-based)?", ["₹80-100", "₹100-150", "₹150+"]),
  q("Q9", "scale_1_5", "If it tasted good, how likely are you to buy it?"),
  q("Q10", "free_text", "What would make this a must-buy or a no-go for you?"),
];
const at = (s: string) => new Date(s);
const responses = [
  { id: "r1", respondentId: "a", updatedAt: at("2026-10-29T10:00:00Z"), utm: { utm_source: "instagram" }, answers: { Q2: ["Whey / protein powder"], Q5: "₹100-150", Q9: "5", Q10: "mail me at x@y.com" } },
  { id: "r2", respondentId: "b", updatedAt: at("2026-10-29T11:00:00Z"), utm: null, answers: { Q2: ["Regular food only (dal, paneer, eggs)"], Q5: "₹80-100", Q9: "3" } },
  { id: "r3", respondentId: "c", updatedAt: at("2026-10-29T09:00:00Z"), utm: null, answers: { Q9: "4" } },
];
const sheets = (file: Uint8Array) => {
  const files = unzipSync(file);
  return [1, 2, 3].map((n) => strFromU8(files[`xl/worksheets/sheet${n}.xml`]));
};

describe("surveyWorkbook", () => {
  const [resp, summary, notes] = sheets(surveyWorkbook(questions, responses, new Set(["a"]), at("2026-10-29T15:00:00Z")));

  it("puts one row per response, oldest first, with sources, waitlist and contact details removed", () => {
    expect(resp.indexOf(">r3<")).toBeLessThan(resp.indexOf(">r1<"));
    expect(resp).toContain(">instagram<");
    expect(resp).toContain(">direct (no tag)<");
    expect(resp).toContain("mail me at [email removed]");
    expect(resp).not.toContain("x@y.com");
    expect(resp.match(/>Yes</g)).toHaveLength(1);
  });

  it("segments each row by Q2 with a formula and its value", () => {
    expect(resp).toContain("<v>Buys whey or protein bars</v>");
    expect(resp).toContain("<v>Buys neither</v>");
    expect(resp).toContain("<v>Skipped Q2</v>");
  });

  it("summarises with formulas over Responses, each carrying the value Excel will compute", () => {
    expect(summary).toContain("<f>COUNTA(Responses!$B$2:$B$1000)</f><v>3</v>");
    expect(summary).toContain("<f>COUNTIF(Responses!$K$2:$K$1000,&quot;&gt;=4&quot;)</f><v>2</v>"); // likely 4 or 5
    expect(summary).toContain("<f>COUNTIF(Responses!$J$2:$J$1000,&quot;₹100-150&quot;)+COUNTIF(Responses!$J$2:$J$1000,&quot;₹150+&quot;)</f><v>1</v>");
    expect(summary).toContain("<v>0.5</v>"); // half of the two who answered Q5 pay ₹100+
  });

  it("explains itself without contact details", () => {
    expect(notes).toContain("Waitlist emails and phone numbers are not in this file");
    expect(notes).toContain("utm_source=linkedin");
  });
});
