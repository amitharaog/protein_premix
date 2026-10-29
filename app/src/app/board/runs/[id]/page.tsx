import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoRefresh } from "@/components/auto-refresh";
import { MiniMarkdown } from "@/components/mini-markdown";
import { boardState } from "@/lib/agents/state";
import { getRun } from "@/lib/queries/runs";
import { keyMatches } from "@/lib/secret";
import { fmtWhen, RunPill, took, usd } from "../../run-ui";

// One run started from the board: progress while it runs, then the agents' closing message and every report it
// sent back. Same key as /board. Survey and recipe output only ever lives here, never in the repo.

export const metadata: Metadata = { title: "Agent run", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

export default async function RunPage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ key?: string | string[] }>;
}) {
  const [{ id }, { key }] = await Promise.all([params, searchParams]);
  const k = typeof key === "string" ? key : undefined;
  if (!k || !keyMatches(k, process.env.BOARD_KEY)) notFound();
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [run, { agents }] = await Promise.all([getRun(id), boardState()]);
  if (!run) notFound();

  const open = run.status === "requested" || run.status === "running";
  const reports = Object.entries(run.reports ?? {});
  const kq = encodeURIComponent(k);

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      {open && <AutoRefresh seconds={15} />}
      <Link href={`/board?key=${kq}`} className="text-sm text-muted underline underline-offset-4 hover:text-fg">← All agents</Link>

      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-muted">Agent run</p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-head text-3xl font-semibold text-frost">{run.command}</h1>
          <RunPill status={run.status} />
        </div>
        {run.args && <p className="text-sm text-muted">With: <span className="text-fg">{run.args}</span></p>}
        <p className="tabular text-sm text-muted">
          Asked {fmtWhen.format(run.requestedAt)} · took {took(run.startedAt, run.finishedAt)} · API cost {usd(run.costUsd)}
        </p>
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {run.runUrl && <a href={run.runUrl} target="_blank" rel="noopener noreferrer" className="text-frost underline underline-offset-4">GitHub log ↗</a>}
          {run.commitUrl && <a href={run.commitUrl} target="_blank" rel="noopener noreferrer" className="text-frost underline underline-offset-4">What it saved to the repo ↗</a>}
        </p>
      </header>

      {open && (
        <p role="status" className="rounded-[14px] border border-gold/60 bg-panel p-3 text-sm">
          {run.status === "requested"
            ? "Asked GitHub to start it. It usually starts within a minute; this page checks every 15 seconds."
            : `Running on GitHub for ${took(run.startedAt, null)}. You can close this page: the result stays here.`}
        </p>
      )}
      {run.status === "failed" && run.error && (
        <p role="alert" className="rounded-[14px] border border-bad/60 bg-panel p-3 text-sm text-bad">{run.error}</p>
      )}

      {run.summary && (
        <section aria-labelledby="sum-h" className="rounded-[14px] border border-line bg-panel p-4">
          <h2 id="sum-h" className="font-head text-lg font-semibold uppercase text-frost">What the agents said</h2>
          <div className="mt-3"><MiniMarkdown text={run.summary} /></div>
        </section>
      )}

      {reports.map(([path, content]) => {
        const owner = agents.find((a) => a.report === path);
        return (
          <section key={path} aria-label={path} className="rounded-[14px] border border-line bg-panel p-4">
            <h2 className="font-head text-lg font-semibold uppercase text-frost">{owner ? owner.name : "Report"}</h2>
            <p className="break-all text-xs text-muted"><code>{path}</code>{owner && <> · <Link href={`/board/${owner.slug}?key=${kq}`} className="text-frost underline underline-offset-4">Agent page</Link></>}</p>
            <div className="mt-3 border-t border-line pt-3"><MiniMarkdown text={content} /></div>
          </section>
        );
      })}

      {!open && !run.summary && !reports.length && run.status === "succeeded" && (
        <p className="text-sm text-muted">The run finished without a message or report.</p>
      )}
    </main>
  );
}
