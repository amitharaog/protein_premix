import type { SurveyQuestion } from "./validate";

type Answers = Record<string, string | string[] | undefined>;
type Response = { answers: Answers };

/** Legacy dashboard shape (SPEC §2.2): one row per question × option. */
export type ResultRow = {
  key: string; // "Qn|option"
  qid: string;
  question: string;
  option: string;
  count: number;
  answered: number; // responses that answered this question at all
  total_responses: number;
};

const asList = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : v == null || v === "" ? [] : [String(v)]);

export function aggregate(questions: SurveyQuestion[], responses: Response[]): ResultRow[] {
  const rows: ResultRow[] = [];
  for (const q of questions) {
    if (q.type === "free_text") continue;
    const options = q.type === "scale_1_5" ? ["1", "2", "3", "4", "5"] : q.options;
    const counts = new Map(options.map((o) => [o, 0]));
    let answered = 0;
    for (const r of responses) {
      const picked = asList(r.answers[q.id]).filter((o) => counts.has(o)); // unknown options are ignored
      if (!picked.length) continue;
      answered++;
      for (const o of new Set(picked)) counts.set(o, (counts.get(o) ?? 0) + 1);
    }
    for (const o of options) {
      rows.push({ key: `${q.id}|${o}`, qid: q.id, question: q.question, option: o, count: counts.get(o) ?? 0, answered, total_responses: responses.length });
    }
  }
  return rows;
}

/** Mean of Q9 (1-5), one decimal; null when nobody answered. */
export function avgLikelihood(responses: Response[], qid = "Q9"): number | null {
  const vals = responses.map((r) => Number(r.answers[qid])).filter((v) => v >= 1 && v <= 5);
  return vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10 : null;
}

/** Most picked option for a question; `tiedWith` counts other options with the same count. */
export function modeOf(rows: ResultRow[], qid: string): { option: string; count: number; tiedWith: number } | null {
  const picked = rows.filter((r) => r.qid === qid && r.count > 0);
  const best = picked.reduce<ResultRow | null>((a, r) => (!a || r.count > a.count ? r : a), null);
  return best ? { option: best.option, count: best.count, tiedWith: picked.filter((r) => r.count === best.count).length - 1 } : null;
}

/** Counts per value of a field (e.g. utm_source), largest first. */
export function tally(values: (string | null | undefined)[]): { value: string; count: number }[] {
  const m = new Map<string, number>();
  for (const v of values) m.set(v || "direct", (m.get(v || "direct") ?? 0) + 1);
  return [...m].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count);
}

const csvCell = (v: unknown) => {
  let s = Array.isArray(v) ? v.join("; ") : v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // stop spreadsheet formula injection from free-text answers
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** One row per response, one column per question (multi answers joined with "; "). */
export function toCsv(
  questions: { id: string; question: string }[],
  responses: { id: string; updatedAt: Date; source: string; utm: Record<string, string> | null; answers: Answers }[],
): string {
  const head = ["response_id", "updated_at_utc", "source", "utm_source", "utm_campaign", "ref", ...questions.map((q) => `${q.id} ${q.question}`)];
  const lines = responses.map((r) => [
    r.id, r.updatedAt.toISOString(), r.source, r.utm?.utm_source, r.utm?.utm_campaign, r.utm?.ref, ...questions.map((q) => r.answers[q.id]),
  ].map(csvCell).join(","));
  return [head.map(csvCell).join(","), ...lines].join("\n") + "\n";
}
