import "server-only";
import { and, asc, count, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { surveyQuestions, surveyResponses, waitlist } from "@/db/schema";
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
