import { describe, expect, it } from "vitest";
import type { AgentRow } from "@/lib/survey/board";
import { blockedReason, isRunnable, RUNNABLE } from "./commands";

const agent = (command: string, status: string) => ({ slug: "a", command, status }) as AgentRow;

describe("agent commands", () => {
  it("starts nothing while there are no agents", () => {
    expect(RUNNABLE).toHaveLength(0);
    for (const c of ["/demand", "/survey", "/trends", "/gate", "/economics", "/recipe"]) expect(isRunnable(c)).toBe(false);
  });

  it("holds a command whose agents are all locked", () => {
    expect(blockedReason("/x", [agent("/x", "Locked")])).toMatch(/Locked/);
    expect(blockedReason("/x", [agent("/x", "Locked"), agent("/x", "Ready")])).toBeNull();
    expect(blockedReason("/x", [])).toBeNull();
  });
});
