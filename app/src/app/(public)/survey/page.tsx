import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { getAnswersFor, getSurveyQuestions } from "@/lib/queries/survey";
import { RID_COOKIE, signStart } from "@/lib/survey/guard";
import { SurveyClient } from "./survey-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Take the survey",
  description: "7 quick questions about desserts, cravings and protein. About a minute. No login.",
};

export default async function SurveyPage() {
  const questions = await getSurveyQuestions();
  const rid = (await cookies()).get(RID_COOKIE)?.value;
  const initial = rid ? await getAnswersFor(rid) : null;
  // Share links point at the host the visitor actually used (Vercel URL today, a custom domain later).
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const siteUrl = host ? `${h.get("x-forwarded-proto") ?? "https"}://${host}` : (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
  return (
    <SurveyClient
      questions={questions}
      initial={initial}
      startToken={signStart()}
      siteUrl={siteUrl}
    />
  );
}
