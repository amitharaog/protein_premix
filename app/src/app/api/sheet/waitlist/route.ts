import { waitlistList } from "@/lib/queries/survey";
import { keyMatches } from "@/lib/secret";
import { waitlistCsv } from "@/lib/survey/sheet";

export const dynamic = "force-dynamic";

// The whole waitlist (launch page and survey sign-ups) for the founder's private Google Sheet ("Waitlist" tab):
// =IMPORTDATA(".../api/sheet/waitlist?key=…"). Only the sheet key opens it; the research agents' token is NOT accepted,
// so emails and phones never reach an AI. Other query parameters (such as since) are ignored. Anything else is a 404.
export async function GET(req: Request) {
  if (!keyMatches(new URL(req.url).searchParams.get("key"), process.env.SHEET_EXPORT_TOKEN)) return new Response("Not found", { status: 404 });
  return new Response(waitlistCsv(await waitlistList()), {
    headers: { "content-type": "text/csv; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex", "referrer-policy": "no-referrer" },
  });
}
