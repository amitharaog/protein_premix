import { csvCell } from "./aggregate";

// Live feed for the Google Sheet (IMPORTDATA). Survey answers only: no emails, phones or IP hashes ever go here.
// Columns are fixed (all questions in Q1..Qn order, switched-off ones stay as empty columns) so sheet formulas never shift.

export type SheetQuestion = { id: string; question: string };
export type SheetResponse = {
  id: string;
  respondentId: string;
  updatedAt: Date;
  source: string;
  utm: Record<string, string> | null;
  answers: Record<string, string | string[] | undefined>;
};

const qNum = (id: string) => Number(id.replace(/\D/g, "")) || 0;

// Someone may type an email or phone number into a free-text answer; it never reaches the sheet (or an AI reading it).
export const scrubContact = (v: string | string[] | undefined) =>
  typeof v === "string"
    ? v.replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, "[email removed]").replace(/\+?\d(?:[\s-]?\d){9,}/g, "[phone removed]")
    : v;

const istStamp = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(d).replace(",", "");

export const SHEET_FIXED_COLUMNS = ["response_id", "submitted_at_ist", "source", "utm_source", "utm_medium", "utm_campaign", "ref", "joined_waitlist"];

export function toSheetCsv(questions: SheetQuestion[], responses: SheetResponse[], waitlistRespondents: Set<string>): string {
  const qs = [...questions].sort((a, b) => qNum(a.id) - qNum(b.id));
  const head = [...SHEET_FIXED_COLUMNS, ...qs.map((q) => `${q.id} ${q.question}`)];
  const rows = [...responses]
    .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())
    .map((r) => [
      r.id, istStamp(r.updatedAt), r.source, r.utm?.utm_source, r.utm?.utm_medium, r.utm?.utm_campaign, r.utm?.ref,
      waitlistRespondents.has(r.respondentId) ? "yes" : "no",
      ...qs.map((q) => scrubContact(r.answers[q.id])),
    ].map(csvCell).join(","));
  return [head.map(csvCell).join(","), ...rows].join("\n") + "\n";
}

/**
 * `?since=2026-11-08T09:30:00Z` on the feed keeps only responses saved at or after that moment, so the sheet's
 * "New responses" tab gets the new survey's answers while the old tabs stay frozen. Null when absent; "invalid" when unreadable.
 */
export function parseSince(raw: string | null): Date | null | "invalid" {
  if (raw == null || raw === "") return null;
  const d = new Date(raw);
  return /^\d{4}-\d{2}-\d{2}/.test(raw) && !Number.isNaN(d.getTime()) ? d : "invalid";
}

export const savedSince = <T extends { updatedAt: Date }>(rows: T[], since: Date | null): T[] =>
  since ? rows.filter((r) => r.updatedAt.getTime() >= since.getTime()) : rows;

// ── Names and contacts for the founder's private sheet ("New contacts" tab), from /api/sheet/contacts ──
// A separate feed from the answers: it takes only the sheet key, never the research agents' token, so contacts
// never reach an AI. Each row carries its response_id to match the New responses tab.

export const SHEET_CONTACT_COLUMNS = [
  "response_id", "submitted_at_ist", "name", "phone", "email", "whatsapp_ok", "whatsapp_link", "likely_to_buy_q9", "would_pay_q5",
];

export type SheetContact = {
  id: string; updatedAt: Date; name: string; phone: string | null; email: string | null; whatsappOptin: boolean;
  answers: Record<string, string | string[] | undefined>;
};

/** +919876543210 -> "98765 43210": the space keeps the sheet from turning it into a number or a formula. */
export const localPhone = (p: string | null) => {
  if (!p) return "";
  const m = p.match(/^\+91(\d{5})(\d{5})$/);
  return m ? `${m[1]} ${m[2]}` : p.replace(/^\+/, "");
};

export function contactsCsv(rows: SheetContact[]): string {
  const body = [...rows]
    .sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime())
    .map((r) => [
      r.id, istStamp(r.updatedAt), r.name, localPhone(r.phone), r.email ?? "", r.whatsappOptin ? "yes" : "no",
      r.whatsappOptin && r.phone ? `https://wa.me/${r.phone.replace(/\D/g, "")}` : "",
      typeof r.answers.Q9 === "string" ? r.answers.Q9 : "", typeof r.answers.Q5 === "string" ? r.answers.Q5 : "",
    ].map(csvCell).join(","));
  return [SHEET_CONTACT_COLUMNS.join(","), ...body].join("\n") + "\n";
}

// ── The whole waitlist for the founder's private sheet ("Waitlist" tab), from /api/sheet/waitlist ──
export const SHEET_WAITLIST_COLUMNS = ["number", "joined_at_ist", "came_from", "email", "phone", "whatsapp_ok", "whatsapp_link"];

export function waitlistCsv(rows: { position: number; createdAt: Date; source: string; email: string | null; phone: string | null; whatsappOptin: boolean }[]): string {
  const body = rows.map((r) => [
    String(r.position), istStamp(r.createdAt), r.source, r.email ?? "", localPhone(r.phone), r.whatsappOptin && r.phone ? "yes" : "no",
    r.whatsappOptin && r.phone ? `https://wa.me/${r.phone.replace(/\D/g, "")}` : "",
  ].map(csvCell).join(","));
  return [SHEET_WAITLIST_COLUMNS.join(","), ...body].join("\n") + "\n";
}
