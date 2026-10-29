import { headers } from "next/headers";
import { surveyResults } from "@/lib/queries/survey";
import { aggregate, avgLikelihood, modeOf, tally, type ResultRow } from "@/lib/survey/aggregate";
import { BAR, BarCard, Tile } from "@/components/stats";

// Survey results (SPEC §2.1 survey signals + §2.2 basics).

const fmtDate = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const show = (v: unknown) => (Array.isArray(v) ? v.join(", ") : v == null || v === "" ? "—" : String(v));

export default async function AdminHome() {
  const { questions, responses, waitlistCount } = await surveyResults();
  const rows = aggregate(questions, responses);
  const total = responses.length;
  const likely = avgLikelihood(responses);
  const topPrice = modeOf(rows, "Q5");
  const sources = tally(responses.map((r) => r.utm?.utm_source));
  const comments = responses.filter((r) => typeof r.answers.Q10 === "string" && r.answers.Q10.trim()).slice(0, 20);
  const h = await headers();
  const surveyUrl = `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}/survey`;

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-head text-2xl font-semibold uppercase tracking-wide text-frost">Survey results</h1>
          <p className="text-sm text-muted">Live from the database. Refresh the page for new answers.</p>
        </div>
        <a href="/admin/export" className="rounded-full bg-accent px-4 py-2 font-semibold text-accent-fg">Download CSV</a>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Headline numbers">
        <Tile label="Responses" value={String(total)} />
        <Tile label="Avg. likely to buy (1–5)" value={likely == null ? "—" : likely.toFixed(1)} />
        <Tile
          label="Top price band"
          value={!topPrice ? "—" : topPrice.tiedWith ? "Tied" : topPrice.option}
          sub={!topPrice ? undefined : topPrice.tiedWith ? `${topPrice.tiedWith + 1} bands at ${topPrice.count} each` : `${topPrice.count} of ${total}`}
        />
        <Tile label="Waitlist signups" value={String(waitlistCount)} />
      </section>

      {total === 0 ? (
        <p className="rounded-[14px] border border-line bg-panel p-4 text-muted">
          No responses yet. Share the survey: <span className="text-frost">{surveyUrl}</span>
        </p>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2">
            {questions.filter((q) => q.type !== "free_text").map((q) => (
              <QuestionCard key={q.id} rows={rows.filter((r) => r.qid === q.id)} multi={q.type === "multi"} />
            ))}
            <BarCard title="Where people came from" note="utm_source on the link they used" items={sources.map((s) => ({ label: s.value, count: s.count }))} denom={total} />
          </section>

          <section className="rounded-[14px] border border-line bg-panel p-4">
            <h2 className="font-head text-lg font-semibold uppercase text-frost">Must-buy or no-go (latest {comments.length})</h2>
            {comments.length === 0 ? <p className="mt-2 text-sm text-muted">No comments yet.</p> : (
              <ul className="mt-3 space-y-3">
                {comments.map((r) => (
                  <li key={r.id} className="border-l-2 pl-3" style={{ borderColor: BAR }}>
                    <p className="text-frost">“{String(r.answers.Q10)}”</p>
                    <p className="tabular mt-0.5 text-xs text-muted">{fmtDate.format(r.updatedAt)} · likely {show(r.answers.Q9)} · pays {show(r.answers.Q5)} · {r.utm?.utm_source ?? "direct"}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-[14px] border border-line bg-panel p-4">
            <h2 className="font-head text-lg font-semibold uppercase text-frost">Every response (latest first)</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs uppercase text-muted">
                  <tr>
                    <th className="py-2 pr-3">When (IST)</th>
                    <th className="py-2 pr-3">Source</th>
                    {questions.filter((q) => q.type !== "free_text").map((q) => <th key={q.id} className="py-2 pr-3">{q.id}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {responses.slice(0, 50).map((r) => (
                    <tr key={r.id} className="border-t border-line align-top">
                      <td className="tabular py-2 pr-3 whitespace-nowrap">{fmtDate.format(r.updatedAt)}</td>
                      <td className="py-2 pr-3">{r.utm?.utm_source ?? "direct"}</td>
                      {questions.filter((q) => q.type !== "free_text").map((q) => <td key={q.id} className="py-2 pr-3">{show(r.answers[q.id])}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > 50 && <p className="mt-2 text-xs text-muted">Showing 50 of {total}. The CSV has all of them.</p>}
          </section>
        </>
      )}
    </main>
  );
}

function QuestionCard({ rows, multi }: { rows: ResultRow[]; multi: boolean }) {
  const first = rows[0];
  if (!first) return null;
  return (
    <BarCard
      title={`${first.qid} · ${first.question}`}
      note={`${first.answered} of ${first.total_responses} answered${multi ? " · people could pick more than one" : ""}`}
      items={rows.map((r) => ({ label: r.option, count: r.count }))}
      denom={first.answered}
    />
  );
}
