import { timingSafeEqual } from "node:crypto";
import { surveyResults, waitlistRespondentIds } from "@/lib/queries/survey";
import { toSheetCsv } from "@/lib/survey/sheet";

export const dynamic = "force-dynamic";

const matches = (given: string, expected: string) => {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

// Read-only feed for the Google Sheet: =IMPORTDATA(".../api/sheet/responses?key=…").
// Guarded by SHEET_EXPORT_TOKEN; unknown or missing key gets a plain 404. Survey answers only, no personal data.
export async function GET(req: Request) {
  const expected = process.env.SHEET_EXPORT_TOKEN;
  const key = new URL(req.url).searchParams.get("key") ?? "";
  if (!expected || expected.length < 24 || !matches(key, expected)) return new Response("Not found", { status: 404 });
  const [{ allQuestions, responses }, joined] = await Promise.all([surveyResults(), waitlistRespondentIds()]);
  return new Response(toSheetCsv(allQuestions, responses, joined), {
    headers: { "content-type": "text/csv; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
}
