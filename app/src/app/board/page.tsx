import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SubmitButton } from "@/components/submit-button";
import { BAR, BarCard, pct, Tile } from "@/components/stats";
import { blockedReason, RUNNABLE } from "@/lib/agents/commands";
import { AGENTS_REF, AGENTS_REPO, checkRepo } from "@/lib/agents/github";
import { boardState } from "@/lib/agents/state";
import { canStoreToken, savedGithubToken } from "@/lib/agents/token";
import { activeRun, anyRunSucceeded, expireStaleRuns, recentRuns } from "@/lib/queries/runs";
import { surveyContactList, surveyResults, waitlistList, waitlistRespondentIds } from "@/lib/queries/survey";
import { keyMatches } from "@/lib/secret";
import { tally } from "@/lib/survey/aggregate";
import { dailyCounts, gateProgress, headline, segments, type AgentRow, type GateRow } from "@/lib/survey/board";
import { savedSince } from "@/lib/survey/sheet";
import { LEVEL_LABEL, overallVerdict, SURE_N, surveyVerdicts, waitlistCheck, type Aspect, type Level, type Overall } from "@/lib/survey/verdicts";
import { saveGithubToken } from "./actions";
import { ActiveRun, Notice, RunButton, RunsTable } from "./run-ui";

// The owner's research dashboard: plain-language "good to go?" verdicts from the new survey, live survey totals,
// names and contacts, progress toward the demand gate, then the research agents and their Run buttons. The page shows aggregates only; its Excel download (./export) has every
// answer, with contact details removed. No emails or phones anywhere.
// Statuses come from scripts/agent_board.py, deployed with the site or reported back by the latest run.
// Guarded by BOARD_KEY in the link (/board?key=…); anything else is a plain 404.

export const metadata: Metadata = { title: "Research dashboard", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

const PHASES = ["Demand", "Gate", "Economics", "Founder kitchen", "Outside this repo"];
const STEPS: Record<string, string> = { Demand: "Step 1", Gate: "Step 2", Economics: "Step 3" };
const MIN_N = 30; // scripts/survey_analyze.py: below this many responses, percentages are directional
const NEW_SURVEY_SINCE = new Date("2026-11-08T09:30:00Z"); // the sharper survey went live (same cut as the sheet's New tabs)

const PILL: Record<string, string> = { ready: "border-ok text-ok", ran: "border-ok text-ok", met: "border-ok text-ok", locked: "border-warn text-warn" };
const pillClass = (status: string) => PILL[status.split(":")[0].toLowerCase().replace(/[^a-z]/g, "")] ?? "border-line text-muted";
const fmtWhen = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const fmtDay = new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", day: "numeric", month: "short" });
const share = (v: number | null) => (v == null ? "—" : `${Math.round(v * 100)}%`);
const gateValue = (g: GateRow, v: number | null) =>
  v == null ? "—" : g.metric === "india_share_of_signals" ? share(v) : g.metric === "behaviour_to_interest_ratio" ? v.toFixed(2) : String(v);

const GITHUB = `https://github.com/${AGENTS_REPO}`;

export default async function AgentBoard({ searchParams }: { searchParams: Promise<{ key?: string | string[]; notice?: string | string[] }> }) {
  const { key, notice } = await searchParams;
  const k = typeof key === "string" ? key : undefined;
  if (!k || !keyMatches(k, process.env.BOARD_KEY)) notFound();

  await expireStaleRuns();
  const [{ responses, waitlistCount }, { agents, gate_files: gateFiles }, active, runs, saved, setupDone, contacts, joined, wl] = await Promise.all([
    surveyResults(), boardState(), activeRun(), recentRuns(6), savedGithubToken(), anyRunSucceeded(), surveyContactList(), waitlistRespondentIds(), waitlistList(),
  ]);
  const answersOf = new Map(responses.map((r) => [r.respondentId, r.answers]));
  const newRs = savedSince(responses, NEW_SURVEY_SINCE);
  const oldRs = responses.filter((r) => r.updatedAt.getTime() < NEW_SURVEY_SINCE.getTime());
  const aspects = surveyVerdicts(newRs, { joined, before: oldRs });
  const overall = overallVerdict(aspects, newRs.length, waitlistCheck(newRs, joined));
  const repo = setupDone ? null : await checkRepo(saved?.token ?? null).catch(() => null);
  const canRun = Boolean(saved?.token);
  const noKeyLastRun = runs[0]?.status === "failed" && (runs[0].error ?? "").includes("ANTHROPIC_API_KEY");
  const now = new Date();
  const h = headline(responses, waitlistCount, now);
  const days = dailyCounts(responses, now);
  const maxDay = Math.max(1, ...days.map((d) => d.n));
  const sources = tally(responses.map((r) => r.utm?.utm_source));
  const gate = gateProgress(gateFiles, { responses: h.responses, waitlistJoins: h.waitlistJoins, likely45: h.likely45 });
  const ready = agents.filter((a) => a.status === "Ready");
  const readyBy = [...new Set(ready.map((a) => a.command))].map((command) => ({ command, names: ready.filter((a) => a.command === command).map((a) => a.name) }));

  return (
    <main className="mx-auto max-w-6xl space-y-8 p-4 md:p-6">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted">Protein dessert research · owner only</p>
        <h1 className="font-head text-3xl font-semibold uppercase tracking-wide text-frost">Research dashboard</h1>
        <p className="max-w-3xl text-sm text-muted">
          {agents.length === 0 ? "No agents yet" : <>Ready to run now:{" "}
          {readyBy.length === 0 ? "nothing, every agent is waiting on an earlier step" : readyBy.map((r, i) => (
            <span key={r.command}>
              {i > 0 && (i === readyBy.length - 1 ? " and " : ", ")}
              <code className="rounded border border-line px-1 text-fg">{r.command}</code> ({r.names.join(", ")})
            </span>
          ))}</>}
          . Survey percentages stay directional until {MIN_N} responses; so far there are <span className="tabular text-frost">{h.responses}</span>.
        </p>
      </header>

      <section id="verdict" aria-labelledby="verdict-h" className="space-y-3">
        <div>
          <h2 id="verdict-h" className="font-head text-xl font-semibold uppercase text-frost">Is it good to go?</h2>
          <p className="max-w-3xl text-sm text-muted">
            From the <span className="tabular text-frost">{newRs.length}</span> answers to the new survey (since 8 Nov, 3 pm). Each card is one question about the idea, with a clear verdict, the number behind it and what it means for building. Under {SURE_N} answers a verdict says &quot;so far&quot;.
          </p>
          <p className="mt-1 text-xs text-muted">
            {(["go", "good-so-far", "borderline", "weak-so-far", "no", "too-few", "must-solve", "info"] as const).map((l) => (
              <span key={l} className="mr-3 inline-block whitespace-nowrap">{LEVEL_STYLE[l].icon} {LEVEL_LABEL[l]}</span>
            ))}
          </p>
        </div>
        <OverallBanner o={overall} />
        <div className="grid gap-4 md:grid-cols-2">
          {aspects.map((a) => <VerdictCard key={a.id} a={a} />)}
        </div>
        <p className="max-w-3xl text-xs text-muted">
          Survey answers are what people say (E3). The final go or no-go is the demand gate further down: it also needs real actions, like waitlist joins. The bars are starting points in src/lib/survey/verdicts.ts; change them there.
        </p>
      </section>

      <section aria-labelledby="survey-h" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="survey-h" className="font-head text-xl font-semibold uppercase text-frost">All answers, live</h2>
            <p className="text-xs text-muted">Old and new survey together, straight from the database on every visit. Answers are prompted (E3); joining the waitlist is behaviour (E1).</p>
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
          <Tile label="Would pay ₹100+" value={share(h.pay100Share)} sub="E3 · per serving" />
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

        <details className="rounded-[14px] border border-line bg-panel p-4">
          <summary className="cursor-pointer">
            <span className="font-head text-base font-semibold text-frost">Names and contacts ({contacts.length})</span>
            <span className="block text-xs text-muted">
              Asked at the end of the survey since 8 Nov 2026, with consent. Only you see them: here, in the Excel download and in the New contacts tab of your Google Sheet. Never the answers feed, the agents or the repo. Giving contact was required, so it is not a behaviour signal (E1); the waitlist still is.
            </span>
          </summary>
          {contacts.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No names yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs uppercase text-muted">
                  <tr>
                    <th className="py-2 pr-3">Name</th><th className="py-2 pr-3">WhatsApp</th><th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3 text-right">Likely, 1 to 5</th><th className="py-2 pr-3">Would pay</th><th className="py-2">Saved</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.map((c) => {
                    const a = answersOf.get(c.respondentId);
                    return (
                      <tr key={c.respondentId} className="border-t border-line">
                        <td className="py-2 pr-3">{c.name}</td>
                        <td className="tabular py-2 pr-3">
                          {c.phone ? (c.whatsappOptin ? <a className="underline" href={`https://wa.me/${c.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">{c.phone}</a> : c.phone) : "—"}
                          {c.phone && !c.whatsappOptin && <span className="block text-xs text-muted">no WhatsApp opt-in</span>}
                        </td>
                        <td className="py-2 pr-3">{c.email ? <a className="underline" href={`mailto:${c.email}`}>{c.email}</a> : "—"}</td>
                        <td className="tabular py-2 pr-3 text-right">{typeof a?.Q9 === "string" ? a.Q9 : "—"}</td>
                        <td className="py-2 pr-3">{typeof a?.Q5 === "string" ? a.Q5 : "—"}</td>
                        <td className="tabular py-2">{fmtWhen.format(c.updatedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </details>

        <details className="rounded-[14px] border border-line bg-panel p-4">
          <summary className="cursor-pointer">
            <span className="font-head text-base font-semibold text-frost">Waitlist ({wl.length})</span>
            <span className="block text-xs text-muted">
              Everyone who joined, oldest first, numbered the way the launch page tells them (&quot;You&apos;re number 31&quot;). &quot;launch&quot; is the public BRUKN page, &quot;survey&quot; the survey&apos;s last screen. Only you see this: here and in the Waitlist tab of your Google Sheet. E1, behaviour.
            </span>
          </summary>
          {wl.length === 0 ? (
            <p className="mt-3 text-sm text-muted">Nobody yet.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-xs uppercase text-muted">
                  <tr>
                    <th className="py-2 pr-3 text-right">#</th><th className="py-2 pr-3">Joined</th><th className="py-2 pr-3">From</th>
                    <th className="py-2 pr-3">WhatsApp</th><th className="py-2">Email</th>
                  </tr>
                </thead>
                <tbody>
                  {[...wl].reverse().map((w) => (
                    <tr key={w.position} className="border-t border-line">
                      <td className="tabular py-2 pr-3 text-right">{w.position}</td>
                      <td className="tabular py-2 pr-3">{fmtWhen.format(w.createdAt)}</td>
                      <td className="py-2 pr-3">{w.source}</td>
                      <td className="tabular py-2 pr-3">
                        {w.phone ? (w.whatsappOptin ? <a className="underline" href={`https://wa.me/${w.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">{w.phone}</a> : w.phone) : "—"}
                      </td>
                      <td className="py-2">{w.email ? <a className="underline" href={`mailto:${w.email}`}>{w.email}</a> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </details>
      </section>

      <section aria-labelledby="gate-h" className="space-y-3">
        <div>
          <h2 id="gate-h" className="font-head text-xl font-semibold uppercase text-frost">Road to the demand gate</h2>
          <p className="max-w-3xl text-xs text-muted">
            Raw counts against data/gate/criteria.json, before any checks for friends and family, one community or share from India. Survey answers count toward replies, the behaviour ratio and E1 actions.
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
              find Default branch, press the two-arrows button, pick <code className="text-fg">{AGENTS_REF}</code> and confirm.
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
            Each button runs the command on GitHub with Claude Code and brings the answer back here. Files the agents write are saved to the repo. One run at a time.
          </p>
        </div>
        <Notice code={typeof notice === "string" ? notice : undefined} />
        {active && <ActiveRun run={active} k={k} />}
        {RUNNABLE.length === 0 && <p className="rounded-[14px] border border-line bg-panel p-3 text-sm text-muted">Nothing to run: there are no agents yet.</p>}
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
            In the order the work runs; open one for its latest output, its Run button and its full instructions. Statuses come from the repo&apos;s data files as of {gateFiles[0]?.captured ?? "—"} and update after each run; economics stays locked until the gate passes.
          </p>
        </div>
        {agents.length === 0 && <p className="rounded-[14px] border border-line bg-panel p-4 text-sm text-muted">No agents yet: they were removed on 4 Nov 2026 to restart the research process. New ones will show here.</p>}
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

const LEVEL_STYLE: Record<Level, { box: string; badge: string; icon: string }> = {
  go: { box: "border-ok/70", badge: "border-ok bg-ok/15 text-ok", icon: "✅" },
  "good-so-far": { box: "border-ok/40", badge: "border-ok/70 text-ok", icon: "🟢" },
  borderline: { box: "border-warn/60", badge: "border-warn bg-warn/10 text-warn", icon: "🟡" },
  "weak-so-far": { box: "border-bad/40", badge: "border-bad/70 text-bad", icon: "🟠" },
  no: { box: "border-bad/70", badge: "border-bad bg-bad/15 text-bad", icon: "❌" },
  "too-few": { box: "border-line", badge: "border-line text-muted", icon: "⏳" },
  "must-solve": { box: "border-warn/60", badge: "border-warn bg-warn/10 text-warn", icon: "⚠️" },
  info: { box: "border-line", badge: "border-frost/60 text-frost", icon: "💡" },
};

function OverallBanner({ o }: { o: Overall }) {
  const st = LEVEL_STYLE[o.level];
  return (
    <div className={`rounded-[14px] border-2 bg-panel p-4 ${st.box}`} role="status">
      <p className="text-xs uppercase tracking-wide text-muted">Overall, from the four basics: buy, price, make at home, kitchen</p>
      <p className="mt-1 font-head text-2xl font-semibold text-frost">{st.icon} {o.title}</p>
      <p className="mt-1 max-w-3xl text-sm text-fg">{o.detail}</p>
      {o.action && <p className="mt-2 max-w-3xl text-sm text-muted">{o.action}</p>}
    </div>
  );
}

function VerdictCard({ a }: { a: Aspect }) {
  const st = LEVEL_STYLE[a.level];
  const total = a.n;
  return (
    <article className={`rounded-[14px] border bg-panel p-4 ${st.box}`} aria-labelledby={`v-${a.id}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h3 id={`v-${a.id}`} className="font-head text-lg font-semibold text-frost">{a.title}</h3>
        <span className={`shrink-0 rounded-full border px-3 py-0.5 text-sm font-semibold ${st.badge}`}>{st.icon} {LEVEL_LABEL[a.level]}</span>
      </div>
      <p className="mt-2 text-base font-semibold text-fg">{a.headline}</p>
      <p className="mt-1 text-sm text-muted">{a.meaning}</p>
      {a.breakdown.length > 0 && total > 0 && (
        <ul className="mt-3 space-y-1.5" aria-label={`${a.title}: answers`}>
          {a.breakdown.map((b) => {
            const p = pct(b.count, total);
            return (
              <li key={b.label} title={`${b.label}: ${b.count} (${p}%)`}>
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="text-fg">{b.label}</span>
                  <span className="tabular shrink-0 text-muted">{b.count} · {p}%</span>
                </div>
                <div className="mt-0.5 h-2 w-full bg-line/60">
                  <div className="h-full rounded-r-[3px]" style={{ width: `${p}%`, background: BAR, minWidth: b.count ? 3 : 0 }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {a.notes.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-muted">
          {a.notes.map((n) => <li key={n}>• {n}</li>)}
        </ul>
      )}
      <p className="mt-3 border-t border-line pt-2 text-[11px] text-muted">{a.source} · {a.rule}</p>
    </article>
  );
}
