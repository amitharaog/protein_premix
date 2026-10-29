import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyButton } from "@/components/copy-button";
import { MiniMarkdown } from "@/components/mini-markdown";
import agentsJson from "@/content/agent-board/agents.json";
import { keyMatches } from "@/lib/secret";
import type { AgentRow } from "@/lib/survey/board";

// One agent from the board: what it does, how to run it, what it writes, and its full instructions.
// Same key as /board; agents run in Claude Code, so this page explains the command rather than running it.

export const metadata: Metadata = { title: "Agent", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

const agents = agentsJson as AgentRow[];
const CLAUDE_CODE = "https://claude.ai/code";
const PILL: Record<string, string> = { ready: "border-ok text-ok", ran: "border-ok text-ok", locked: "border-warn text-warn" };
const pillClass = (status: string) => PILL[status.split(":")[0].toLowerCase().replace(/[^a-z]/g, "")] ?? "border-line text-muted";
const EXAMPLES: Record<string, string> = { "/recipe": "/recipe whey, cocoa, almond flour, jaggery" };

export default async function AgentPage({ params, searchParams }: {
  params: Promise<{ agent: string }>;
  searchParams: Promise<{ key?: string | string[] }>;
}) {
  const [{ agent }, { key }] = await Promise.all([params, searchParams]);
  const k = typeof key === "string" ? key : undefined;
  if (!k || !keyMatches(k, process.env.BOARD_KEY)) notFound();
  const a = agents.find((x) => x.slug === agent);
  if (!a) notFound();

  const status = a.status.split(":")[0];
  const runnable = ["Ready", "Ran", "On call"].includes(status);
  const example = EXAMPLES[a.command] ?? a.command;

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <Link href={`/board?key=${encodeURIComponent(k)}`} className="text-sm text-muted underline underline-offset-4 hover:text-fg">← All agents</Link>

      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted">{a.phase}</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-head text-3xl font-semibold text-frost">{a.name}</h1>
          <span className={`rounded-full border px-2 text-xs ${pillClass(a.status)}`}>{a.status}</span>
        </div>
        <p className="text-fg">{a.job}</p>
        {a.description && <p className="text-sm text-muted">{a.description}</p>}
      </header>

      <section aria-labelledby="run-h" className="rounded-[14px] border border-line bg-panel p-4">
        <h2 id="run-h" className="font-head text-lg font-semibold uppercase text-frost">How to run it</h2>
        {a.status === "Scheduled" ? (
          <p className="mt-2 text-sm">This one runs by itself in the Claude desktop app (Cowork, then Scheduled). Nothing to run from here.</p>
        ) : (
          <>
            {status === "Waiting" && <p className="mt-2 text-sm text-warn">Not yet: it waits for {a.waiting_on}. When that is done, run it the same way.</p>}
            {status === "Locked" && <p className="mt-2 text-sm text-warn">Locked until the demand gate passes. Run /gate once there is enough evidence; economics opens after a pass.</p>}
            <ol className={`mt-3 list-decimal space-y-3 pl-5 text-sm ${runnable ? "" : "opacity-70"}`}>
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
          </>
        )}
      </section>

      <section aria-labelledby="out-h" className="rounded-[14px] border border-line bg-panel p-4">
        <h2 id="out-h" className="font-head text-lg font-semibold uppercase text-frost">What it writes</h2>
        <p className="mt-2 break-all text-sm"><code className="text-frost">{a.output}</code>{a.rows != null && <span className="text-muted"> · {a.rows} rows</span>}</p>
        {a.output_url ? (
          <a href={a.output_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-frost underline underline-offset-4">View it on GitHub ↗</a>
        ) : (
          <p className="mt-1 text-sm text-muted">{a.output_note}</p>
        )}
        {(a.model || a.tools) && (
          <p className="mt-3 text-xs text-muted">{a.model && <>Model: {a.model}</>}{a.model && a.tools && " · "}{a.tools && <>Tools: {a.tools}</>}</p>
        )}
      </section>

      <section aria-labelledby="ins-h" className="rounded-[14px] border border-line bg-panel p-4">
        <h2 id="ins-h" className="font-head text-lg font-semibold uppercase text-frost">Full instructions</h2>
        <p className="mt-1 text-xs text-muted">{a.status === "Scheduled" ? "About this task." : `From .claude/agents/${a.slug}.md, the file the agent follows.`}</p>
        <div className="mt-3"><MiniMarkdown text={a.instructions} /></div>
      </section>
    </main>
  );
}
