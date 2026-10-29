// The commands the agent board can start, and when each may run. Same rules as .claude/commands/*.md, which the run follows.
import type { AgentRow } from "@/lib/survey/board";

export const RUNNABLE = ["/demand", "/demand replies", "/survey", "/gate", "/economics", "/recipe"] as const;
export type RunnableCommand = (typeof RUNNABLE)[number];

export const isRunnable = (c: string): c is RunnableCommand => (RUNNABLE as readonly string[]).includes(c);

/** Who runs and roughly how long it takes on GitHub, for the Run buttons. */
export const COMMAND_INFO: Record<RunnableCommand, { agents: string; takes: string }> = {
  "/demand": { agents: "demand-scout and keyword-finder, then post-drafter", takes: "20 to 40 minutes" },
  "/demand replies": { agents: "response-analyst", takes: "10 to 20 minutes" },
  "/survey": { agents: "survey-analyst", takes: "5 to 10 minutes" },
  "/gate": { agents: "demand-gate", takes: "5 to 10 minutes" },
  "/economics": { agents: "pricing-analyst and channel-analyst, then cac-modeler", takes: "30 to 60 minutes" },
  "/recipe": { agents: "recipe-builder", takes: "5 to 15 minutes" },
};

/** Why a command cannot start now, judged from the agents' statuses; null when it can. */
export function blockedReason(command: RunnableCommand, agents: AgentRow[]): string | null {
  const status = (slug: string) => agents.find((a) => a.slug === slug)?.status ?? "";
  if (command === "/demand replies" && status("response-analyst").startsWith("Waiting")) {
    return "Waits for posts you publish: add their links to data/posts/posted.csv first.";
  }
  if (command === "/economics" && status("demand-gate") !== "Ran: pass") return "Locked until /gate writes a pass.";
  return null;
}

/** /recipe takes the founder's ingredients; nothing else takes text from the board. */
export function cleanArgs(command: RunnableCommand, args: string | undefined): string | null {
  if (command !== "/recipe") return null;
  const a = (args ?? "").replace(/\s+/g, " ").trim();
  return a || "pantry";
}
