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
