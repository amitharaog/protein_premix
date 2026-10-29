import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/submit-button";
import { BAR, BarCard, Tile } from "@/components/stats";
import { blockedReason, RUNNABLE } from "@/lib/agents/commands";
import { AGENTS_REPO, checkRepo } from "@/lib/agents/github";
import { boardState } from "@/lib/agents/state";
import { canStoreToken, savedGithubToken } from "@/lib/agents/token";
import { activeRun, anyRunSucceeded, expireStaleRuns, recentRuns } from "@/lib/queries/runs";
import { surveyResults } from "@/lib/queries/survey";
import { keyMatches } from "@/lib/secret";
import { aggregate, tally } from "@/lib/survey/aggregate";
import { dailyCounts, gateProgress, headline, segments, type AgentRow, type GateRow } from "@/lib/survey/board";
import { saveGithubToken } from "./actions";
import { ActiveRun, Notice, RunButton, RunsTable } from "./run-ui";

// The owner's agent board: research agents and their status, Run buttons that start them on GitHub, live survey
// totals and progress toward the demand gate. The page shows aggregates only; its Excel download (./export) has every
// answer, with contact details removed. No emails or phones anywhere.
// Statuses come from scripts/agent_board.py, deployed with the site or reported back by the latest run.
// Guarded by BOARD_KEY in the link (/board?key=…); anything else is a plain 404.

export const metadata: Metadata = { title: "Agent board", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

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

const WORKFLOW_BRANCH = "claude/hopeful-sagan-gd3awd"; // where .github/workflows/research-agents.yml lives today
const GITHUB = `https://github.com/${AGENTS_REPO}`;

export default async function AgentBoard({ searchParams }: { searchParams: Promise<{ key?: string | string[]; notice?: string | string[] }> }) {
  const { key, notice } = await searchParams;
  const k = typeof key === "string" ? key : undefined;
  if (!k || !keyMatches(k, process.env.BOARD_KEY)) notFound();

  await expireStaleRuns();
  const [{ questions, responses, waitlistCount }, { agents, gate_files: gateFiles }, active, runs, saved, setupDone] = await Promise.all([
    surveyResults(), boardState(), activeRun(), recentRuns(6), savedGithubToken(), anyRunSucceeded(),
  ]);
  const repo = setupDone ? null : await checkRepo(saved?.token ?? null).catch(() => null);
  const canRun = Boolean(saved?.token);
  const noKeyLastRun = runs[0]?.status === "failed" && (runs[0].error ?? "").includes("ANTHROPIC_API_KEY");
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

      {!setupDone && (
        <section id="setup" aria-labelledby="setup-h" className="space-y-3 rounded-[14px] border border-gold/60 bg-panel p-4">
          <div>
            <h2 id="setup-h" className="font-head text-xl font-semibold uppercase text-frost">Setup, once</h2>
            <p className="max-w-3xl text-sm text-muted">
              The Run buttons start the agents on GitHub&apos;s computers (free for this public repo), the same as typing the command in Claude Code. Three things to do once; this box goes away after the first run that works.
            </p>
          </div>
          <ol className="space-y-4 text-sm">
            <SetupStep n={1} title="Make the agents' branch the default" state={repo == null ? "Could not check just now" : repo.ok && repo.workflowOnDefault ? "Done" : "To do"}>
              GitHub only starts this kind of run from the repo&apos;s default branch{repo?.ok && !repo.workflowOnDefault ? <>, which is <code className="text-fg">{repo.defaultBranch}</code> today</> : null}.
              Open <a href={`${GITHUB}/settings`} target="_blank" rel="noopener noreferrer" className="text-frost underline underline-offset-4">the repo&apos;s settings ↗</a>,
              find Default branch, press the two-arrows button, pick <code className="text-fg">{WORKFLOW_BRANCH}</code> and confirm.
            </SetupStep>
            <SetupStep n={2} title="Give GitHub a Claude key" state={noKeyLastRun ? "To do: the last run found no key" : "Checked on the first run"}>
              Open <a href={`${GITHUB}/settings/secrets/actions/new`} target="_blank" rel="noopener noreferrer" className="text-frost underline underline-offset-4">new repository secret ↗</a>.
              Name: <code className="text-fg">ANTHROPIC_API_KEY</code>. Secret: an API key from <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-frost underline underline-offset-4">console.anthropic.com ↗</a>,
              where you can also set a monthly spend limit. To use your Claude subscription instead, name it <code className="text-fg">CLAUDE_CODE_OAUTH_TOKEN</code> and paste what <code className="text-fg">claude setup-token</code> prints.
            </SetupStep>
            <SetupStep n={3} title="Let this board start runs" state={saved?.token ? `Done: token ending …${saved.hint}` : saved ? "Save it again: the server cannot read the saved one" : "To do"}>
              Create a token at <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener noreferrer" className="text-frost underline underline-offset-4">GitHub, fine-grained tokens ↗</a>:
              Repository access, Only select repositories, <code className="text-fg">protein_premix</code>; Permissions, Actions, Read and write. Generate it and paste it here.
              <TokenForm k={k} disabled={!canStoreToken()} />
            </SetupStep>
          </ol>
        </section>
      )}

      <section id="run" aria-labelledby="run-h" className="space-y-3">
        <div>
          <h2 id="run-h" className="font-head text-xl font-semibold uppercase text-frost">Run a step</h2>
          <p className="max-w-3xl text-xs text-muted">
            Each button runs the command on GitHub with Claude Code and brings the answer back here. Files the agents write are saved to the repo, except survey and recipe output, which stays on this board. One run at a time.
          </p>
        </div>
        <Notice code={typeof notice === "string" ? notice : undefined} />
        {active && <ActiveRun run={active} k={k} />}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {RUNNABLE.map((command) => (
            <div key={command} className="rounded-[14px] border border-line bg-panel p-3">
              <RunButton k={k} command={command} compact
                why={!canRun ? "Finish the setup above first." : active ? "Wait for the run in progress to end." : blockedReason(command, agents)} />
            </div>
          ))}
        </div>
        <div className="rounded-[14px] border border-line bg-panel p-4">
          <h3 className="font-head text-base font-semibold text-frost">Recent runs</h3>
          <div className="mt-2"><RunsTable runs={runs} k={k} /></div>
        </div>
        {setupDone && (
          <details className="text-sm">
            <summary className="cursor-pointer text-xs text-muted">GitHub token{saved?.hint ? ` (ending …${saved.hint})` : ""}: replace it</summary>
            <div className="mt-2 max-w-xl"><TokenForm k={k} disabled={!canStoreToken()} /></div>
          </details>
        )}
      </section>

      <section aria-labelledby="agents-h" className="space-y-3">
        <div>
          <h2 id="agents-h" className="font-head text-xl font-semibold uppercase text-frost">Agents</h2>
          <p className="text-xs text-muted">
            In the order the work runs; open one for its latest output, its Run button and its full instructions. Statuses come from the repo&apos;s data files as of {gateFiles[0]?.captured ?? "—"} and update after each run; economics stays locked until /gate writes a pass.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {PHASES.map((phase) => {
            const items = agents.filter((a) => a.phase === phase).sort((a, b) => a.order - b.order);
            if (!items.length) return null;
            return (
              <div key={phase} className="space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted">{STEPS[phase] ?? "Alongside"} · <span className="text-fg">{phase}</span></p>
                {items.map((a) => <AgentCard key={a.name} a={a} running={active?.command === a.command} href={`/board/${a.slug}?key=${encodeURIComponent(k)}`} />)}
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="survey-h" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="survey-h" className="font-head text-xl font-semibold uppercase text-frost">Survey, live</h2>
            <p className="text-xs text-muted">Straight from the database on every visit. Answers are prompted (E3); joining the waitlist is behaviour (E1).</p>
          </div>
          <a href={`/board/export?key=${encodeURIComponent(k)}`} download
            className="inline-flex h-11 items-center rounded-full border border-frost px-4 text-sm font-semibold text-frost hover:bg-frost hover:text-bg">
            Download every answer (Excel)
          </a>
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
          Runs started here update the statuses by themselves. After running an agent in Claude Code instead, refresh them with <code className="text-fg">pnpm board</code>, then commit and deploy.
        </p>
      </footer>
    </main>
  );
}

function SetupStep({ n, title, state, children }: { n: number; title: string; state: string; children: React.ReactNode }) {
  const done = state.startsWith("Done");
  return (
    <li className="space-y-1">
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-frost">{n}. {title}</span>
        <span className={`rounded-full border px-2 text-xs ${done ? "border-ok text-ok" : "border-line text-muted"}`}>{state}</span>
      </p>
      <div className="max-w-3xl space-y-2 text-muted">{children}</div>
    </li>
  );
}

function TokenForm({ k, disabled }: { k: string; disabled: boolean }) {
  return (
    <form action={saveGithubToken} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="key" value={k} />
      <label className="min-w-0 flex-1 basis-64 text-sm">
        <span className="sr-only">GitHub token</span>
        <input name="token" type="password" required maxLength={400} autoComplete="off" spellCheck={false} placeholder="github_pat_…"
          className="h-11 w-full rounded-md border border-line bg-bg px-3 text-fg placeholder:text-muted/70 focus:border-frost focus:outline-none" />
      </label>
      <SubmitButton pending="Checking…" disabled={disabled}
        className="h-11 rounded-full border border-frost px-4 text-sm font-semibold text-frost hover:bg-frost hover:text-bg disabled:cursor-not-allowed disabled:border-line disabled:text-muted">
        Save token
      </SubmitButton>
      <p className="w-full text-xs text-muted">{disabled ? "The server has no BOARD_TOKEN_SECRET yet, so it cannot keep a token." : "Kept encrypted; only its last four characters are shown again."}</p>
    </form>
  );
}

function AgentCard({ a, href, running }: { a: AgentRow; href: string; running: boolean }) {
  return (
    <Link href={href} className={`group block rounded-[14px] border border-line bg-panel p-3 transition-colors hover:border-frost focus-visible:border-frost ${a.status === "Locked" ? "opacity-70 hover:opacity-100" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 break-words text-sm font-semibold text-frost">{a.name}</h3>
        <span className={`shrink-0 rounded-full border px-2 text-xs ${running ? "border-gold text-gold" : pillClass(a.status)}`}>{running ? "Running" : a.status}</span>
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
