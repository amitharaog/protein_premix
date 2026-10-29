import { surveyResults, waitlistRespondentIds } from "@/lib/queries/survey";
import { keyMatches } from "@/lib/secret";
import { surveyWorkbook } from "@/lib/survey/workbook";

export const dynamic = "force-dynamic";

// Every survey answer as an Excel file, built fresh on each download. Same key as /board; anything else is a plain 404.
// Contact details typed into answers are removed, and waitlist emails and phones never come here (admin export only).
export async function GET(req: Request) {
  if (!keyMatches(new URL(req.url).searchParams.get("key"), process.env.BOARD_KEY)) return new Response("Not found", { status: 404 });
  const [{ questions, responses }, joined] = await Promise.all([surveyResults(), waitlistRespondentIds()]);
  const now = new Date();
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
  return new Response(Buffer.from(surveyWorkbook(questions, responses, joined, now)), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="muggoozz_survey_${day}.xlsx"`,
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
      "referrer-policy": "no-referrer",
    },
  });
}
