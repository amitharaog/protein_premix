import { isAgentCaller } from "@/lib/agents/caller";
import { surveyResults, waitlistRespondentIds } from "@/lib/queries/survey";
import { keyMatches } from "@/lib/secret";
import { parseSince, savedSince, toSheetCsv } from "@/lib/survey/sheet";

export const dynamic = "force-dynamic";

// Read-only feed for the Google Sheet: =IMPORTDATA(".../api/sheet/responses?key=…"), guarded by SHEET_EXPORT_TOKEN.
// The research-agents workflow reads it too, for /survey and /gate runs, with its GitHub OIDC token as a Bearer header.
// Anything else gets a plain 404. Survey answers only, no personal data. Optional ?since=<ISO time> keeps only responses
// saved from then on (the sheet's "New responses" tab uses it).
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  if (!keyMatches(params.get("key"), process.env.SHEET_EXPORT_TOKEN) && !(await isAgentCaller(req))) {
    return new Response("Not found", { status: 404 });
  }
  const since = parseSince(params.get("since"));
  if (since === "invalid") return new Response("since must be a time like 2026-11-08T09:30:00Z", { status: 400 });
  const [{ allQuestions, responses }, joined] = await Promise.all([surveyResults(), waitlistRespondentIds()]);
  return new Response(toSheetCsv(allQuestions, savedSince(responses, since), joined), {
    headers: { "content-type": "text/csv; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
}
