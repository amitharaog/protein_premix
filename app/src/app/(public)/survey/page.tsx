import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getAnswersFor, getSurveyQuestions } from "@/lib/queries/survey";
import { RID_COOKIE, signStart } from "@/lib/survey/guard";
import { SurveyClient } from "./survey-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Take the survey",
  description: "10 questions about desserts, cravings and protein. About 2 minutes. No login.",
};

export default async function SurveyPage() {
  const questions = await getSurveyQuestions();
  const rid = (await cookies()).get(RID_COOKIE)?.value;
  const initial = rid ? await getAnswersFor(rid) : null;
  return (
    <SurveyClient
      questions={questions}
      initial={initial}
      startToken={signStart()}
      siteUrl={process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}
    />
  );
}
