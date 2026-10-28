import { requireAdmin } from "@/auth";
import { surveyResults } from "@/lib/queries/survey";
import { toCsv } from "@/lib/survey/aggregate";

export const dynamic = "force-dynamic";

// Admin-only CSV of every survey response (all questions, including switched-off ones).
export async function GET() {
  if (!(await requireAdmin())) return new Response("Not found", { status: 404 });
  const { allQuestions, responses } = await surveyResults();
  const day = new Date().toISOString().slice(0, 10);
  return new Response(toCsv(allQuestions, responses), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="survey-responses-${day}.csv"`,
      "cache-control": "no-store",
    },
  });
}
