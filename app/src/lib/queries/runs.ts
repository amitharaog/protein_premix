import "server-only";
import { and, count, desc, eq, gt, inArray, isNotNull, lt, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { agentRuns, boardSettings } from "@/db/schema";
import type { AgentRow, GateFileRow } from "@/lib/survey/board";

// Agent runs started from the board, and the board's own settings. Runs report back through /api/board/runs.

export const STALE_MS = 2 * 3600_000; // the workflow times out well before this, so a run this old without word has died
export const MAX_RUNS_PER_DAY = 12;

export type BoardSnapshot = { agents: AgentRow[]; gate_files: GateFileRow[]; generated_at: string };

// Everything but the heavy jsonb columns, for lists.
const listed = {
  id: agentRuns.id, command: agentRuns.command, args: agentRuns.args, status: agentRuns.status,
  requestedAt: agentRuns.requestedAt, startedAt: agentRuns.startedAt, finishedAt: agentRuns.finishedAt,
  runUrl: agentRuns.runUrl, commitUrl: agentRuns.commitUrl, costUsd: agentRuns.costUsd, error: agentRuns.error,
};
export type RunRow = { [K in keyof typeof listed]: (typeof agentRuns.$inferSelect)[K] };
const open = inArray(agentRuns.status, ["requested", "running"]);

export async function recentRuns(limit = 8, command?: string): Promise<RunRow[]> {
  return db.select(listed).from(agentRuns)
    .where(command ? eq(agentRuns.command, command) : undefined)
    .orderBy(desc(agentRuns.requestedAt)).limit(limit);
}

/** One run with what it sent back, for its page. */
export async function getRun(id: string) {
  const [row] = await db.select({ ...listed, summary: agentRuns.summary, reports: agentRuns.reports }).from(agentRuns)
    .where(eq(agentRuns.id, id)).limit(1);
  return row ?? null;
}

/** The run in progress, if any. Only one runs at a time. */
export async function activeRun(): Promise<RunRow | null> {
  const [row] = await db.select(listed).from(agentRuns)
    .where(and(open, gt(agentRuns.requestedAt, new Date(Date.now() - STALE_MS))))
    .orderBy(desc(agentRuns.requestedAt)).limit(1);
  return row ?? null;
}

export async function expireStaleRuns() {
  await db.update(agentRuns)
    .set({ status: "failed", finishedAt: new Date(), error: "No word back from GitHub within 2 hours. Open the GitHub run for its log." })
    .where(and(open, lt(agentRuns.requestedAt, new Date(Date.now() - STALE_MS))));
}

export async function runsLastDay(): Promise<number> {
  const [row] = await db.select({ n: count() }).from(agentRuns).where(gt(agentRuns.requestedAt, new Date(Date.now() - 86_400_000)));
  return row?.n ?? 0;
}

export async function createRun(command: string, args: string | null): Promise<string> {
  const [row] = await db.insert(agentRuns).values({ command, args }).returning({ id: agentRuns.id });
  return row.id;
}

export async function failRun(id: string, error: string) {
  await db.update(agentRuns).set({ status: "failed", finishedAt: new Date(), error }).where(eq(agentRuns.id, id));
}

/** The workflow picked the run up. Repeats are fine; a finished run cannot restart. */
export async function markStarted(id: string, runUrl: string) {
  const [row] = await db.update(agentRuns)
    .set({ status: "running", startedAt: sql`coalesce(${agentRuns.startedAt}, now())`, runUrl })
    .where(and(eq(agentRuns.id, id), open))
    .returning({ id: agentRuns.id, command: agentRuns.command, args: agentRuns.args });
  return row ?? null;
}

export async function markFinished(id: string, r: {
  ok: boolean; summary?: string; costUsd?: number; error?: string; commitUrl?: string;
  reports?: Record<string, string>; board?: BoardSnapshot;
}) {
  const [row] = await db.update(agentRuns)
    .set({
      status: r.ok ? "succeeded" : "failed", finishedAt: new Date(), summary: r.summary ?? null,
      costUsd: r.costUsd == null ? null : r.costUsd.toFixed(4), error: r.ok ? null : r.error ?? "The run failed. Open the GitHub run for its log.",
      commitUrl: r.commitUrl ?? null, reports: r.reports ?? null, board: r.board ?? null,
    })
    .where(and(eq(agentRuns.id, id), ne(agentRuns.status, "succeeded")))
    .returning({ id: agentRuns.id });
  return row ?? null;
}

/** Agent statuses as the newest finished run left them, if that is newer than the copy deployed with the site. */
export async function newerBoard(deployedAt: string): Promise<BoardSnapshot | null> {
  const [row] = await db.select({ board: agentRuns.board }).from(agentRuns)
    .where(and(eq(agentRuns.status, "succeeded"), isNotNull(agentRuns.board)))
    .orderBy(desc(agentRuns.finishedAt)).limit(1);
  const board = row?.board as BoardSnapshot | null | undefined;
  return board && board.generated_at > deployedAt ? board : null;
}

/** The newest version of one report a run sent back (reports are keyed by the agent's report path). */
export async function latestReport(path: string) {
  const content = sql<string | null>`${agentRuns.reports} ->> ${path}`;
  const [row] = await db.select({ runId: agentRuns.id, command: agentRuns.command, status: agentRuns.status, finishedAt: agentRuns.finishedAt, content })
    .from(agentRuns).where(and(isNotNull(agentRuns.finishedAt), sql`${content} is not null`))
    .orderBy(desc(agentRuns.finishedAt)).limit(1);
  return row?.content ? { ...row, content: row.content } : null;
}

/** Setup is done once any run has come back successful. */
export async function anyRunSucceeded(): Promise<boolean> {
  const [row] = await db.select({ id: agentRuns.id }).from(agentRuns).where(eq(agentRuns.status, "succeeded")).limit(1);
  return Boolean(row);
}

export async function getSetting(key: string): Promise<Record<string, string> | null> {
  const [row] = await db.select({ value: boardSettings.value }).from(boardSettings).where(eq(boardSettings.key, key)).limit(1);
  return row?.value ?? null;
}

export async function saveSetting(key: string, value: Record<string, string>) {
  await db.insert(boardSettings).values({ key, value })
    .onConflictDoUpdate({ target: boardSettings.key, set: { value, updatedAt: new Date() } });
}
