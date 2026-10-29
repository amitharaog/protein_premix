import Link from "next/link";
import { AutoRefresh } from "@/components/auto-refresh";
import { SubmitButton } from "@/components/submit-button";
import { COMMAND_INFO, type RunnableCommand } from "@/lib/agents/commands";
import type { RunRow } from "@/lib/queries/runs";
import { startRun } from "./actions";

// Pieces shared by the board, the agent pages and the run page: Run buttons, run status, notices.

export const fmtWhen = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

const RUN_STYLE: Record<RunRow["status"], [string, string]> = {
  requested: ["Starting", "border-line text-muted"],
  running: ["Running", "border-gold text-gold"],
  succeeded: ["Done", "border-ok text-ok"],
  failed: ["Failed", "border-bad text-bad"],
};

export function RunPill({ status }: { status: RunRow["status"] }) {
  const [label, cls] = RUN_STYLE[status];
  return <span className={`shrink-0 rounded-full border px-2 text-xs ${cls}`}>{label}</span>;
}

export function took(from: Date | null, to: Date | null): string {
  if (!from) return "—";
  const min = Math.round(((to ?? new Date()).getTime() - from.getTime()) / 60_000);
  return min < 1 ? "under a minute" : min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${min % 60} min`;
}

export const usd = (v: string | null) => (v == null ? "—" : `$${Number(v).toFixed(2)}`);

const NOTICES: Record<string, [string, "ok" | "warn"]> = {
  blocked: ["That step cannot run yet: the reason is under its button.", "warn"],
  setup: ["Run buttons need the one-time setup first: see Setup on the board.", "warn"],
  busy: ["Another run is still going. One at a time: this button works again when it ends.", "warn"],
  cap: ["That makes 12 runs in a day, the most the board starts. Try again tomorrow, or run it in Claude Code.", "warn"],
  nosecret: ["The server has no BOARD_TOKEN_SECRET, so it cannot keep a token. Ask Claude to add it in Vercel.", "warn"],
  badtoken: ["That does not look like a GitHub token. A fine-grained one starts with github_pat_.", "warn"],
  rejected: ["GitHub did not accept that token. Check it was copied whole and has not expired.", "warn"],
  unreachable: ["Could not reach GitHub just now. Try again in a minute.", "warn"],
  saved: ["Token saved. The Run buttons work once the steps above are done.", "ok"],
};

export function Notice({ code }: { code?: string }) {
  const n = code ? NOTICES[code] : undefined;
  if (!n) return null;
  return (
    <p role="status" className={`rounded-[14px] border bg-panel p-3 text-sm ${n[1] === "ok" ? "border-ok/60 text-ok" : "border-warn/50 text-warn"}`}>{n[0]}</p>
  );
}

/**
 * One command's Run button. `why` explains a disabled button. /recipe takes the founder's ingredients;
 * `from` is the agent page the button sits on, so notices come back there.
 */
export function RunButton({ k, command, from = "", why, compact = false }: {
  k: string; command: RunnableCommand; from?: string; why?: string | null; compact?: boolean;
}) {
  const info = COMMAND_INFO[command];
  const off = Boolean(why);
  return (
    <form action={startRun} className={compact ? "space-y-1" : "space-y-2"}>
      <input type="hidden" name="key" value={k} />
      <input type="hidden" name="command" value={command} />
      <input type="hidden" name="from" value={from} />
      {command === "/recipe" && !off && (
        <label className="block text-sm">
          <span className="text-muted">Ingredients you have, comma-separated (empty means your pantry list)</span>
          <input name="args" maxLength={300} placeholder="whey, cocoa, almond flour, jaggery" autoComplete="off"
            className="mt-1 h-11 w-full rounded-md border border-line bg-bg px-3 text-fg placeholder:text-muted/70 focus:border-frost focus:outline-none" />
        </label>
      )}
      <SubmitButton pending="Starting…" disabled={off}
        className="h-11 rounded-full border border-frost bg-frost px-4 text-sm font-semibold text-bg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:border-line disabled:bg-transparent disabled:text-muted">
        Run {command}
      </SubmitButton>
      <p className="text-xs text-muted">{why ?? `Runs ${info.agents}. Usually ${info.takes}; you can close this page meanwhile.`}</p>
    </form>
  );
}

/** The run in progress, with a link to its page. Refreshes the page until it ends. */
export function ActiveRun({ run, k }: { run: RunRow; k: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[14px] border border-gold/60 bg-panel p-3 text-sm">
      <AutoRefresh seconds={15} />
      <RunPill status={run.status} />
      <span>
        <code className="text-frost">{run.command}</code>{" "}
        {run.status === "requested" ? "asked GitHub to start it" : `running for ${took(run.startedAt, null)}`} · since {fmtWhen.format(run.requestedAt)}
      </span>
      <Link href={`/board/runs/${run.id}?key=${encodeURIComponent(k)}`} className="font-semibold text-frost underline underline-offset-4">Follow it →</Link>
    </div>
  );
}

export function RunsTable({ runs, k }: { runs: RunRow[]; k: string }) {
  if (!runs.length) return <p className="text-sm text-muted">No runs from the board yet.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="text-xs uppercase text-muted">
          <tr><th className="py-2 pr-3">Started</th><th className="py-2 pr-3">Step</th><th className="py-2 pr-3">Result</th><th className="py-2 pr-3 text-right">Took</th><th className="py-2 pr-3 text-right">API cost</th><th className="py-2" /></tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr key={r.id} className="border-t border-line align-top">
              <td className="tabular py-2 pr-3">{fmtWhen.format(r.requestedAt)}</td>
              <td className="py-2 pr-3"><code className="text-frost">{r.command}</code></td>
              <td className="py-2 pr-3"><RunPill status={r.status} /></td>
              <td className="tabular py-2 pr-3 text-right">{took(r.startedAt, r.finishedAt)}</td>
              <td className="tabular py-2 pr-3 text-right">{usd(r.costUsd)}</td>
              <td className="py-2 text-right"><Link href={`/board/runs/${r.id}?key=${encodeURIComponent(k)}`} className="text-frost underline underline-offset-4">Open</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
