import { sheetContacts } from "@/lib/queries/survey";
import { keyMatches } from "@/lib/secret";
import { contactsCsv, parseSince, savedSince } from "@/lib/survey/sheet";

export const dynamic = "force-dynamic";

// Names and contacts for the founder's private Google Sheet ("New contacts" tab):
// =IMPORTDATA(".../api/sheet/contacts?since=…&key=…"). Only the sheet key opens it. Unlike /api/sheet/responses,
// the research agents' GitHub token is NOT accepted here, so contacts never reach an AI. Anything else is a plain 404.
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  if (!keyMatches(params.get("key"), process.env.SHEET_EXPORT_TOKEN)) return new Response("Not found", { status: 404 });
  const since = parseSince(params.get("since"));
  if (since === "invalid") return new Response("since must be a time like 2026-11-08T09:30:00Z", { status: 400 });
  return new Response(contactsCsv(savedSince(await sheetContacts(), since)), {
    headers: { "content-type": "text/csv; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex", "referrer-policy": "no-referrer" },
  });
}
