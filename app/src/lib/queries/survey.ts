import "server-only";
import { and, asc, count, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { surveyContacts, surveyQuestions, surveyResponses, waitlist } from "@/db/schema";
import type { Answers, SurveyQuestion } from "@/lib/survey/validate";

export async function getSurveyQuestions(): Promise<SurveyQuestion[]> {
  const rows = await db.select().from(surveyQuestions).where(eq(surveyQuestions.active, true)).orderBy(asc(surveyQuestions.position));
  return rows.map((r) => ({
    id: r.id, question: r.question, type: r.type, options: r.options, hint: r.hint,
    maxSelect: r.maxSelect, required: r.required, maxLength: r.maxLength,
  }));
}

export async function getAnswersFor(respondentId: string): Promise<Answers | null> {
  const [row] = await db.select({ answers: surveyResponses.answers }).from(surveyResponses)
    .where(eq(surveyResponses.respondentId, respondentId)).limit(1);
  return row?.answers ?? null;
}

export type SavedContact = { name: string; email: string | null; phone: string | null; whatsappOptin: boolean };

/** The name and contact this browser gave before, to prefill the last step. Only ever shown back to the same cookie. */
export async function getContactFor(respondentId: string): Promise<SavedContact | null> {
  const [row] = await db.select({ name: surveyContacts.name, email: surveyContacts.email, phone: surveyContacts.phone, whatsappOptin: surveyContacts.whatsappOptin })
    .from(surveyContacts).where(eq(surveyContacts.respondentId, respondentId)).limit(1);
  return row ?? null;
}

export type ContactRow = SavedContact & { respondentId: string; updatedAt: Date };

/** Every name and contact from the survey, newest first. Owner-only pages (the board and its Excel) call this; nothing else. */
export async function surveyContactList(): Promise<ContactRow[]> {
  return db.select({
    respondentId: surveyContacts.respondentId, name: surveyContacts.name, email: surveyContacts.email, phone: surveyContacts.phone,
    whatsappOptin: surveyContacts.whatsappOptin, updatedAt: surveyContacts.updatedAt,
  }).from(surveyContacts).orderBy(desc(surveyContacts.updatedAt));
}

/** Names and contacts with their response, for the founder's private sheet (/api/sheet/contacts). Nothing else calls it. */
export async function sheetContacts() {
  return db.select({
    id: surveyResponses.id, updatedAt: surveyResponses.updatedAt, answers: surveyResponses.answers,
    name: surveyContacts.name, phone: surveyContacts.phone, email: surveyContacts.email, whatsappOptin: surveyContacts.whatsappOptin,
  }).from(surveyContacts).innerJoin(surveyResponses, eq(surveyContacts.respondentId, surveyResponses.respondentId));
}

/** Distinct respondents from one hashed IP in the last hour (resubmits by the same cookie update one row). */
export async function recentSubmitsFromIp(ipHash: string): Promise<number> {
  const [row] = await db.select({ n: count() }).from(surveyResponses)
    .where(and(eq(surveyResponses.ipHash, ipHash), gt(surveyResponses.updatedAt, new Date(Date.now() - 3600_000))));
  return row?.n ?? 0;
}

/** Everything the results dashboard and CSV export need. Small data today; paginate past ~10k responses. */
export async function surveyResults() {
  const [all, responses, [wl]] = await Promise.all([
    db.select().from(surveyQuestions).orderBy(asc(surveyQuestions.position)),
    db.select().from(surveyResponses).orderBy(desc(surveyResponses.updatedAt)),
    db.select({ n: count() }).from(waitlist).where(isNull(waitlist.deletedAt)),
  ]);
  const toQ = (r: (typeof all)[number]): SurveyQuestion => ({
    id: r.id, question: r.question, type: r.type, options: r.options, hint: r.hint,
    maxSelect: r.maxSelect, required: r.required, maxLength: r.maxLength,
  });
  return {
    questions: all.filter((q) => q.active).map(toQ),
    allQuestions: all.map(toQ),
    responses,
    waitlistCount: wl?.n ?? 0,
  };
}

/** Respondent ids that joined the waitlist from the thank-you screen. Ids only: never emails or phones. */
export async function waitlistRespondentIds(): Promise<Set<string>> {
  const rows = await db
    .select({ rid: sql<string | null>`${waitlist.utm}->>'respondent_id'` })
    .from(waitlist)
    .where(isNull(waitlist.deletedAt));
  return new Set(rows.map((r) => r.rid).filter((r): r is string => Boolean(r)));
}
