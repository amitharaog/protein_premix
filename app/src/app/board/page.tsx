import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BAR, BarCard, Tile } from "@/components/stats";
import agentsJson from "@/content/agent-board/agents.json";
import gateJson from "@/content/agent-board/gate_files.json";
import { surveyResults } from "@/lib/queries/survey";
import { keyMatches } from "@/lib/secret";
import { aggregate, tally } from "@/lib/survey/aggregate";
import { dailyCounts, gateProgress, headline, segments, type AgentRow, type GateFileRow, type GateRow } from "@/lib/survey/board";

// The owner's agent board: research agents and their status (from the repo's data files, refreshed with `pnpm board`),
// live survey totals and progress toward the demand gate. Read-only and aggregates only: no emails, phones or comments.
// Guarded by BOARD_KEY in the link (/board?key=…); anything else is a plain 404.

export const metadata: Metadata = { title: "Agent board", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

const agents = agentsJson as AgentRow[];
const gateFiles = gateJson as GateFileRow[];
const PHASES = ["Demand", "Gate", "Economics", "Founder kitchen", "Outside this repo"];
const STEPS: Record<string, string> = { Demand: "Step 1", Gate: "Step 2", Economics: "Step 3" };
const MIN_N = 30; // scripts/survey_analyze.py: below this many responses, percentages are directional
const HYPOTHESIS_SINGLE = "₹99"; // CLAUDE.md price hypothesis for one serving

const PILL: Record<string, string> = { ready: "border-ok text-ok", ran: "border-ok text-ok", met: "border-ok text-ok", locked: "border-warn text-warn" };
const pillClass = (status: string) => PILL[status.split(":")[0].toLowerCase().replace(/[^a-z]/g, "")] ?? "border-line text-muted";
const fmtWhen = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const fmtDay = new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", day: "numeric", month: "short" });
const share = (v: number | null) => (v == null ? "—" : `${Math.round(v * 100)}%`);
const gateValue = (g: GateRow, v: number | null) =>
  v == null ? "—" : g.metric === "india_share_of_signals" ? share(v) : g.metric === "behaviour_to_interest_ratio" ? v.toFixed(2) : String(v);

export default async function AgentBoard({ searchParams }: { searchParams: Promise<{ key?: string | string[] }> }) {
  const { key } = await searchParams;
  const k = typeof key === "string" ? key : undefined;
  if (!k || !keyMatches(k, process.env.BOARD_KEY)) notFound();

  const { questions, responses, waitlistCount } = await surveyResults();
  const now = new Date();
  const h = headline(responses, waitlistCount, now);
  const days = dailyCounts(responses, now);
  const maxDay = Math.max(1, ...days.map((d) => d.n));
  const rows = aggregate(questions, responses);
  const price = rows.filter((r) => r.qid === "Q5");
  const worries = rows.filter((r) => r.qid === "Q8").sort((a, b) => b.count - a.count);
  const sources = tally(responses.map((r) => r.utm?.utm_source));
  const gate = gateProgress(gateFiles, { responses: h.responses, waitlistJoins: h.waitlistJoins, likely45: h.likely45 });
  const ready = agents.filter((a) => a.status === "Ready");
  const readyBy = [...new Set(ready.map((a) => a.command))].map((command) => ({ command, names: ready.filter((a) => a.command === command).map((a) => a.name) }));

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-4 md:p-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted">muggoozz research</p>
        <h1 className="font-head text-3xl font-semibold uppercase tracking-wide text-frost">Agent board</h1>
        <p className="max-w-3xl text-sm text-muted">
          Ready to run now:{" "}
          {readyBy.length === 0 ? "nothing, every agent is waiting on an earlier step" : readyBy.map((r, i) => (
            <span key={r.command}>
              {i > 0 && (i === readyBy.length - 1 ? " and " : ", ")}
              <code className="rounded border border-line px-1 text-fg">{r.command}</code> ({r.names.join(", ")})
            </span>
          ))}
          . Survey percentages stay directional until {MIN_N} responses; so far there are <span className="tabular text-frost">{h.responses}</span>.
        </p>
      </header>

      <section aria-labelledby="agents-h" className="space-y-3">
        <div>
          <h2 id="agents-h" className="font-head text-xl font-semibold uppercase text-frost">Agents</h2>
          <p className="text-xs text-muted">
            In the order the work runs; open one to see how to run it and what it does. A status comes from the repo&apos;s data files as of {gateFiles[0]?.captured ?? "—"}; economics stays locked until /gate writes a pass.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PHASES.map((phase) => {
            const items = agents.filter((a) => a.phase === phase).sort((a, b) => a.order - b.order);
            if (!items.length) return null;
            return (
              <div key={phase} className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted">{STEPS[phase] ?? "Alongside"} · <span className="text-fg">{phase}</span></p>
                {items.map((a) => <AgentCard key={a.name} a={a} href={`/board/${a.slug}?key=${encodeURIComponent(k)}`} />)}
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="survey-h" className="space-y-3">
        <div>
          <h2 id="survey-h" className="font-head text-xl font-semibold uppercase text-frost">Survey, live</h2>
          <p className="text-xs text-muted">Straight from the database on every visit. Answers are prompted (E3); joining the waitlist is behaviour (E1).</p>
        </div>
        {h.responses < MIN_N && (
          <p className="rounded-[14px] border border-warn/50 bg-panel p-3 text-sm text-warn">
            Directional only: {h.responses} of the {MIN_N} responses needed before a percentage means much.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Tile label="Responses" value={String(h.responses)} sub="All time" />
          <Tile label="New this week" value={String(h.last7)} sub="Last 7 days" />
          <Tile label="Waitlist joins" value={String(h.waitlistJoins)} sub="E1, behaviour" />
          <Tile label="Likely 4 or 5" value={share(h.likely45Share)} sub={`E3 · ${h.likely45} of ${h.likelyAnswered}`} />
          <Tile label="Would pay ₹100+" value={share(h.pay100Share)} sub="E3 · per sachet" />
          <Tile label="Last new response" value={h.lastAt ? fmtWhen.format(h.lastAt) : "—"} sub="India time" small />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <figure className="rounded-[14px] border border-line bg-panel p-4">
            <figcaption>
              <h3 className="font-head text-base font-semibold text-frost">New responses per day</h3>
              <p className="text-xs text-muted">India time, from the first response, at most the last 60 days</p>
            </figcaption>
            {days.length === 0 ? <p className="mt-3 text-sm text-muted">No responses yet.</p> : (
              <>
                <div className="mt-3 flex h-32 items-end justify-center gap-px" role="img" aria-label={`New responses per day from ${days[0].day} to ${days[days.length - 1].day}`}>
                  {days.map((d) => (
                    <div key={d.day} title={`${fmtDay.format(new Date(d.day))}: ${d.n}`} className="max-w-10 flex-1 rounded-t-[3px]"
                      style={{ height: `${(d.n / maxDay) * 100}%`, minHeight: d.n ? 4 : 1, background: d.n ? BAR : "var(--line)" }} />
                  ))}
                </div>
                <p className="tabular mt-1 text-center text-xs text-muted">
                  {fmtDay.format(new Date(days[0].day))}{days.length > 1 && ` to ${fmtDay.format(new Date(days[days.length - 1].day))}`}
                </p>
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer text-xs text-muted">Table view</summary>
                  <table className="mt-2 w-full text-left">
                    <thead className="text-xs text-muted"><tr><th className="py-1">Day</th><th className="py-1 text-right">New responses</th></tr></thead>
                    <tbody>{days.map((d) => <tr key={d.day} className="border-t border-line"><td className="tabular py-1">{d.day}</td><td className="tabular py-1 text-right">{d.n}</td></tr>)}</tbody>
                  </table>
                </details>
              </>
            )}
          </figure>
          {price.length > 0 && (
            <BarCard title="What they would pay for one sachet" note={`${price[0].answered} answered · working hypothesis ${HYPOTHESIS_SINGLE} a single`}
              items={price.map((r) => ({ label: r.option, count: r.count }))} denom={price[0].answered} />
          )}
          {worries.length > 0 && (
            <BarCard title="What would worry them" note={`${worries[0].answered} answered · people could pick more than one`}
              items={worries.map((r) => ({ label: r.option, count: r.count }))} denom={worries[0].answered} />
          )}
          <BarCard title="Where responses came from" note="utm_source on the shared link; direct means the link had no tag"
            items={sources.map((s) => ({ label: s.value, count: s.count }))} denom={h.responses} />
        </div>

        <figure className="rounded-[14px] border border-line bg-panel p-4">
          <figcaption>
            <h3 className="font-head text-base font-semibold text-frost">Anchor buyers against others</h3>
            <p className="max-w-3xl text-xs text-muted">
              Anchor: already buys whey or protein bars (Q2). The idea holds if this group is clearly more likely to buy than people who buy neither. Q2 is optional, so skips get their own row.
            </p>
          </figcaption>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[420px] text-left text-sm">
              <thead className="text-xs uppercase text-muted">
                <tr><th className="py-2 pr-3">Group</th><th className="py-2 pr-3 text-right">Responses</th><th className="py-2 pr-3 text-right">Likely 4 or 5</th><th className="py-2 text-right">Average, 1 to 5</th></tr>
              </thead>
              <tbody>
                {segments(responses).map((g) => (
                  <tr key={g.segment} className="border-t border-line">
                    <td className="py-2 pr-3">{g.segment}</td>
                    <td className="tabular py-2 pr-3 text-right">{g.n}</td>
                    <td className="tabular py-2 pr-3 text-right">{share(g.share)}</td>
                    <td className="tabular py-2 text-right">{g.avg == null ? "—" : g.avg.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </figure>
      </section>

      <section aria-labelledby="gate-h" className="space-y-3">
        <div>
          <h2 id="gate-h" className="font-head text-xl font-semibold uppercase text-frost">Road to the demand gate</h2>
          <p className="max-w-3xl text-xs text-muted">
            Raw counts before /gate runs its own checks (friends and family, one community, share from India). Survey answers count toward replies, the behaviour ratio and E1 actions, as data/gate/criteria.json says.
          </p>
        </div>
        <div className="overflow-x-auto rounded-[14px] border border-line bg-panel p-4">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="text-xs uppercase text-muted">
              <tr><th className="py-2 pr-3">Metric</th><th className="py-2 pr-3 text-right">Now</th><th className="py-2 pr-3 text-right">Needed</th><th className="py-2">Status</th></tr>
            </thead>
            <tbody>
              {gate.map((g) => (
                <tr key={g.metric} className="border-t border-line">
                  <td className="py-2 pr-3">{g.label}</td>
                  <td className="tabular py-2 pr-3 text-right">{gateValue(g, g.now)}</td>
                  <td className="tabular py-2 pr-3 text-right">{gateValue(g, g.needed)}</td>
                  <td className="py-2"><span className={`rounded-full border px-2 text-xs ${pillClass(g.status)}`}>{g.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-line pt-4 text-sm">
        <Link href="/survey" className="text-frost underline underline-offset-4">Open the survey</Link>
        <Link href="/admin" className="text-frost underline underline-offset-4">Results and CSV (admin sign-in)</Link>
        <p className="text-xs text-muted">
          Feedback on the answers: run <code className="text-fg">/survey</code> in Claude Code. After an agent runs, refresh the statuses with <code className="text-fg">pnpm board</code>, then commit and deploy.
        </p>
      </footer>
    </main>
  );
}

function AgentCard({ a, href }: { a: AgentRow; href: string }) {
  return (
    <Link href={href} className={`group block rounded-[14px] border border-line bg-panel p-3 transition-colors hover:border-frost focus-visible:border-frost ${a.status === "Locked" ? "opacity-70 hover:opacity-100" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 break-words text-sm font-semibold text-frost">{a.name}</h3>
        <span className={`shrink-0 rounded-full border px-2 text-xs ${pillClass(a.status)}`}>{a.status}</span>
      </div>
      <p className="mt-1 text-xs text-muted">{a.job}</p>
      <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
        <code className="rounded border border-line px-1 text-fg">{a.command}</code>
        {a.model && <span>{a.model}</span>}
      </p>
      <p className="mt-2 text-xs text-fg">{a.next_step}</p>
      <p className="mt-1 break-all text-[11px] text-muted">{a.output}{a.rows != null ? ` · ${a.rows} rows` : ""}</p>
      <p className="mt-2 text-xs font-semibold text-frost group-hover:underline">Open →</p>
    </Link>
  );
}
