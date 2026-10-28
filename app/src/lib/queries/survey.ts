import "server-only";
import { and, asc, count, desc, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { surveyQuestions, surveyResponses } from "@/db/schema";
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

export async function surveyStats() {
  const [total] = await db.select({ n: count() }).from(surveyResponses);
  const latest = await db.select().from(surveyResponses).orderBy(desc(surveyResponses.updatedAt)).limit(20);
  return { total: total?.n ?? 0, latest };
}
