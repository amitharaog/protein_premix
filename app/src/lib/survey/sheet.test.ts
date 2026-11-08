import { describe, expect, it } from "vitest";
import { SHEET_FIXED_COLUMNS, contactsCsv, localPhone, parseSince, savedSince, scrubContact, toSheetCsv } from "./sheet";

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

describe("since filter for the New responses tab", () => {
  const rows = [{ id: "old", updatedAt: new Date("2026-10-30T07:25:00Z") }, { id: "new", updatedAt: new Date("2026-11-08T09:30:00Z") }];
  it("keeps responses saved at or after the moment, and everything without one", () => {
    expect(savedSince(rows, new Date("2026-11-08T09:30:00Z")).map((r) => r.id)).toEqual(["new"]);
    expect(savedSince(rows, null).map((r) => r.id)).toEqual(["old", "new"]);
  });
  it("reads ISO times and refuses anything else", () => {
    expect(parseSince("2026-11-08T09:30:00Z")).toEqual(new Date("2026-11-08T09:30:00Z"));
    expect(parseSince(null)).toBeNull();
    expect(parseSince("")).toBeNull();
    expect(parseSince("yesterday")).toBe("invalid");
    expect(parseSince("1")).toBe("invalid");
  });
});

describe("contactsCsv for the New contacts tab", () => {
  const csv = contactsCsv([
    { id: "r2", updatedAt: new Date("2026-11-08T10:00:00Z"), name: "=Asha", phone: "+919876543210", email: null, whatsappOptin: true, answers: { Q9: "5", Q5: "₹100-150" } },
    { id: "r1", updatedAt: new Date("2026-11-08T09:40:00Z"), name: "Ravi", phone: null, email: "ravi@example.com", whatsappOptin: false, answers: {} },
  ]);
  const [head, first, second] = csv.trim().split("\n");

  it("lists name, contact and the two key answers, oldest first, matched by response id", () => {
    expect(head).toBe("response_id,submitted_at_ist,name,phone,email,whatsapp_ok,whatsapp_link,likely_to_buy_q9,would_pay_q5");
    expect(first).toBe("r1,2026-11-08 15:10,Ravi,,ravi@example.com,no,,,");
    expect(second).toBe("r2,2026-11-08 15:30,'=Asha,98765 43210,,yes,https://wa.me/919876543210,5,₹100-150");
  });

  it("writes Indian mobiles so the sheet keeps them as text", () => {
    expect(localPhone("+919876543210")).toBe("98765 43210");
    expect(localPhone(null)).toBe("");
  });
});
