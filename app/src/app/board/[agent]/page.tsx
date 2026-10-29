import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { MiniMarkdown } from "@/components/mini-markdown";
import { blockedReason, isRunnable } from "@/lib/agents/commands";
import { boardState } from "@/lib/agents/state";
import { savedGithubToken } from "@/lib/agents/token";
import { activeRun, latestReport, recentRuns } from "@/lib/queries/runs";
import { keyMatches } from "@/lib/secret";
import { ActiveRun, fmtWhen, Notice, RunButton, RunPill, RunsTable } from "../run-ui";

// One agent from the board: its Run button, its latest output, its recent runs and its full instructions.
// Same key as /board.

export const metadata: Metadata = { title: "Agent", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

const CLAUDE_CODE = "https://claude.ai/code";
const PILL: Record<string, string> = { ready: "border-ok text-ok", ran: "border-ok text-ok", locked: "border-warn text-warn" };
const pillClass = (status: string) => PILL[status.split(":")[0].toLowerCase().replace(/[^a-z]/g, "")] ?? "border-line text-muted";
const EXAMPLES: Record<string, string> = { "/recipe": "/recipe whey, cocoa, almond flour, jaggery" };

export default async function AgentPage({ params, searchParams }: {
  params: Promise<{ agent: string }>;
  searchParams: Promise<{ key?: string | string[]; notice?: string | string[] }>;
}) {
  const [{ agent }, { key, notice }] = await Promise.all([params, searchParams]);
  const k = typeof key === "string" ? key : undefined;
  if (!k || !keyMatches(k, process.env.BOARD_KEY)) notFound();
  const { agents } = await boardState();
  const a = agents.find((x) => x.slug === agent);
  if (!a) notFound();

  const command = isRunnable(a.command) ? a.command : null;
  const [active, saved, report, runs] = await Promise.all([
    activeRun(), savedGithubToken(), a.report ? latestReport(a.report) : null, command ? recentRuns(5, command) : [],
  ]);
  const example = EXAMPLES[a.command] ?? a.command;
  const why = !command ? null : !saved?.token ? "Finish the one-time setup on the board first." : active ? "Wait for the run in progress to end." : blockedReason(command, agents);
  const kq = encodeURIComponent(k);

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <Link href={`/board?key=${kq}`} className="text-sm text-muted underline underline-offset-4 hover:text-fg">← All agents</Link>

      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted">{a.phase}</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-head text-3xl font-semibold text-frost">{a.name}</h1>
          <span className={`rounded-full border px-2 text-xs ${pillClass(a.status)}`}>{a.status}</span>
        </div>
        <p className="text-fg">{a.job}</p>
        {a.description && <p className="text-sm text-muted">{a.description}</p>}
      </header>

      <section id="run" aria-labelledby="run-h" className="space-y-3 rounded-[14px] border border-line bg-panel p-4">
        <h2 id="run-h" className="font-head text-lg font-semibold uppercase text-frost">Run it</h2>
        {!command ? (
          <p className="text-sm">This one runs by itself in the Claude desktop app (Cowork, then Scheduled). Nothing to run from here.</p>
        ) : (
          <>
            <Notice code={typeof notice === "string" ? notice : undefined} />
            {active && <ActiveRun run={active} k={k} />}
            <RunButton k={k} command={command} from={a.slug} why={why} />
            <details className="text-sm">
              <summary className="cursor-pointer text-xs text-muted">Or run it yourself in Claude Code</summary>
              <ol className="mt-3 list-decimal space-y-3 pl-5">
                <li>
                  Open Claude Code with the <span className="text-frost">protein_premix</span> repo.{" "}
                  <a href={CLAUDE_CODE} target="_blank" rel="noopener noreferrer" className="text-frost underline underline-offset-4">Open Claude Code ↗</a>
                </li>
                <li>
                  <span>Type this and press Enter:</span>
                  <span className="mt-2 flex flex-wrap items-center gap-2">
                    <code className="rounded-md border border-line bg-bg px-2 py-1 text-base text-frost">{example}</code>
                    <CopyButton text={example} className="h-9 rounded-full border border-line px-3 text-xs font-semibold text-fg hover:border-frost" />
                  </span>
                  {a.command_hint && <span className="mt-1 block text-xs text-muted">What you can add after {a.command}: {a.command_hint}</span>}
                </li>
                <li>Or simply ask Claude in your chat: <span className="text-frost">&ldquo;run {a.command} for me&rdquo;</span>.</li>
              </ol>
            </details>
          </>
        )}
      </section>

      <section aria-labelledby="out-h" className="space-y-3 rounded-[14px] border border-line bg-panel p-4">
        <h2 id="out-h" className="font-head text-lg font-semibold uppercase text-frost">Latest output</h2>
        <p className="break-all text-sm">
          <code className="text-frost">{a.output}</code>{a.rows != null && <span className="text-muted"> · {a.rows} rows</span>}
          {a.output_url && <> · <a href={a.output_url} target="_blank" rel="noopener noreferrer" className="text-frost underline underline-offset-4">on GitHub ↗</a></>}
        </p>
        {report ? (
          <>
            <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <RunPill status={report.status} />
              <span><code>{a.report}</code> from the {report.command} run on {report.finishedAt ? fmtWhen.format(report.finishedAt) : "—"}</span>
              <Link href={`/board/runs/${report.runId}?key=${kq}`} className="text-frost underline underline-offset-4">Open the run</Link>
            </p>
            <div className="border-t border-line pt-3"><MiniMarkdown text={report.content} /></div>
          </>
        ) : (
          <p className="text-sm text-muted">{a.output_url ? "No run from this board has sent it back yet; the GitHub link has the current file." : a.output_note || "Nothing yet."}</p>
        )}
        {(a.model || a.tools) && (
          <p className="text-xs text-muted">{a.model && <>Model: {a.model}</>}{a.model && a.tools && " · "}{a.tools && <>Tools: {a.tools}</>}</p>
        )}
      </section>

      {runs.length > 0 && (
        <section aria-labelledby="runs-h" className="rounded-[14px] border border-line bg-panel p-4">
          <h2 id="runs-h" className="font-head text-lg font-semibold uppercase text-frost">Recent {a.command} runs</h2>
          <div className="mt-2"><RunsTable runs={runs} k={k} /></div>
        </section>
      )}

      <section aria-labelledby="ins-h" className="rounded-[14px] border border-line bg-panel p-4">
        <h2 id="ins-h" className="font-head text-lg font-semibold uppercase text-frost">Full instructions</h2>
        <p className="mt-1 text-xs text-muted">{command ? `From .claude/agents/${a.slug}.md, the file the agent follows.` : "About this task."}</p>
        <div className="mt-3"><MiniMarkdown text={a.instructions} /></div>
      </section>
    </main>
  );
}
