// The commands the agent board can start. Empty since 4 Nov 2026, when the founder removed every agent to restart the
// research process. A new agent's command goes here, and in scripts/board_report.py COMMANDS, when it is added.
import type { AgentRow } from "@/lib/survey/board";

export const RUNNABLE: readonly string[] = [];

export const isRunnable = (c: string): boolean => RUNNABLE.includes(c);

/** Who runs and roughly how long it takes on GitHub, for the Run buttons. */
export const COMMAND_INFO: Record<string, { agents: string; takes: string }> = {};

/** Why a command cannot start now, judged from the agents' statuses; null when it can. */
export function blockedReason(command: string, agents: AgentRow[]): string | null {
  const owners = agents.filter((a) => a.command === command);
  return owners.length && owners.every((a) => a.status === "Locked") ? "Locked until the demand gate passes." : null;
}
