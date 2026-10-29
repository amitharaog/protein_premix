import { describe, expect, it } from "vitest";
import { SHEET_FIXED_COLUMNS, scrubContact, toSheetCsv } from "./sheet";

const questions = [
  { id: "Q10", question: "Why?" },
  { id: "Q2", question: "Protein?" },
  { id: "Q9", question: "Likely?" },
];
const base = { source: "web", utm: null };

describe("toSheetCsv", () => {
  const csv = toSheetCsv(questions, [
    { ...base, id: "r2", respondentId: "rid-2", updatedAt: new Date("2026-10-29T15:30:00Z"), utm: { utm_source: "reddit" }, answers: { Q2: ["Whey / protein powder", "Protein bars or snacks"], Q9: "5", Q10: "=cmd" } },
    { ...base, id: "r1", respondentId: "rid-1", updatedAt: new Date("2026-10-29T10:00:00Z"), answers: { Q9: "3" } },
  ], new Set(["rid-2"]));
  const [head, first, second] = csv.trim().split("\n");

  it("keeps fixed columns, then questions in Q-number order regardless of input order", () => {
    expect(head).toBe([...SHEET_FIXED_COLUMNS, "Q2 Protein?", "Q9 Likely?", "Q10 Why?"].join(","));
  });

  it("orders rows oldest first, stamps IST time and flags waitlist joins without personal data", () => {
    expect(first.startsWith("r1,2026-10-29 15:30,web,,,,,no,")).toBe(true);
    expect(second.startsWith("r2,2026-10-29 21:00,web,reddit,,,,yes,")).toBe(true);
    expect(csv).not.toMatch(/rid-/);
  });

  it("joins multi answers and neutralises formulas", () => {
    expect(second).toContain("Whey / protein powder; Protein bars or snacks,5,'=cmd");
  });
});

describe("scrubContact", () => {
  it("removes emails and phone numbers typed into free text, keeps price bands and options", () => {
    expect(scrubContact("Ping me at foo.bar@gmail.com or +91 98450 12345, or 9845012345")).toBe(
      "Ping me at [email removed] or [phone removed], or [phone removed]",
    );
    expect(scrubContact("₹100-150")).toBe("₹100-150");
    expect(scrubContact(["Microwave", "Air fryer"])).toEqual(["Microwave", "Air fryer"]);
  });
});
