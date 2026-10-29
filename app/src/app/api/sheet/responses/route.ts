import { isAgentCaller } from "@/lib/agents/caller";
import { surveyResults, waitlistRespondentIds } from "@/lib/queries/survey";
import { keyMatches } from "@/lib/secret";
import { toSheetCsv } from "@/lib/survey/sheet";

export const dynamic = "force-dynamic";

// Read-only feed for the Google Sheet: =IMPORTDATA(".../api/sheet/responses?key=…"), guarded by SHEET_EXPORT_TOKEN.
// The research-agents workflow reads it too, for /survey and /gate runs, with its GitHub OIDC token as a Bearer header.
// Anything else gets a plain 404. Survey answers only, no personal data.
export async function GET(req: Request) {
  if (!keyMatches(new URL(req.url).searchParams.get("key"), process.env.SHEET_EXPORT_TOKEN) && !(await isAgentCaller(req))) {
    return new Response("Not found", { status: 404 });
  }
  const [{ allQuestions, responses }, joined] = await Promise.all([surveyResults(), waitlistRespondentIds()]);
  return new Response(toSheetCsv(allQuestions, responses, joined), {
    headers: { "content-type": "text/csv; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
}
