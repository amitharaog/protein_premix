import { describe, expect, it } from "vitest";
import type { AgentRow } from "@/lib/survey/board";
import { blockedReason, cleanArgs, isRunnable } from "./commands";

const agents = (statuses: Record<string, string>) => Object.entries(statuses).map(([slug, status]) => ({ slug, status }) as AgentRow);

describe("agent commands", () => {
  it("knows which commands the board may start", () => {
    expect(isRunnable("/gate")).toBe(true);
    expect(isRunnable("/status")).toBe(false);
    expect(isRunnable("Cowork schedule")).toBe(false);
  });

  it("keeps economics locked until the gate passes", () => {
    expect(blockedReason("/economics", agents({ "demand-gate": "Ready" }))).toMatch(/Locked/);
    expect(blockedReason("/economics", agents({ "demand-gate": "Ran: fail" }))).toMatch(/Locked/);
    expect(blockedReason("/economics", agents({ "demand-gate": "Ran: pass" }))).toBeNull();
  });

  it("holds /demand replies until posts are listed, and lets the rest run", () => {
    expect(blockedReason("/demand replies", agents({ "response-analyst": "Waiting" }))).toMatch(/posted\.csv/);
    expect(blockedReason("/demand replies", agents({ "response-analyst": "Ready" }))).toBeNull();
    expect(blockedReason("/demand", agents({}))).toBeNull();
    expect(blockedReason("/survey", agents({}))).toBeNull();
  });

  it("takes text for /recipe only", () => {
    expect(cleanArgs("/recipe", "  whey,\n cocoa ")).toBe("whey, cocoa");
    expect(cleanArgs("/recipe", "")).toBe("pantry");
    expect(cleanArgs("/gate", "anything")).toBeNull();
  });
});
