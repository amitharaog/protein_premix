import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import { brand } from "@/config/brand";
import { getAnswersFor, getContactFor, getSurveyQuestions } from "@/lib/queries/survey";
import { RID_COOKIE, signStart } from "@/lib/survey/guard";
import { SurveyClient } from "./survey-client";

export const dynamic = "force-dynamic";

export const viewport: Viewport = { themeColor: "#172062", colorScheme: "light" };

export const metadata: Metadata = {
  title: "The dessert census",
  description: "Declare your cravings: a 3-minute, slightly unserious survey about desserts, cravings and protein. No login.",
};

export default async function SurveyPage() {
  const questions = await getSurveyQuestions();
  const rid = (await cookies()).get(RID_COOKIE)?.value;
  const [initial, initialContact] = rid ? await Promise.all([getAnswersFor(rid), getContactFor(rid)]) : [null, null];
  // Share links point at the host the visitor actually used (Vercel URL today, a custom domain later).
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const siteUrl = host ? `${h.get("x-forwarded-proto") ?? "https"}://${host}` : brand.siteUrl;
  return (
    <SurveyClient
      questions={questions}
      initial={initial}
      initialContact={initialContact}
      startToken={signStart()}
      siteUrl={siteUrl}
    />
  );
}
