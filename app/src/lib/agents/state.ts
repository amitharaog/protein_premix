import "server-only";
import agentsJson from "@/content/agent-board/agents.json";
import gateJson from "@/content/agent-board/gate_files.json";
import metaJson from "@/content/agent-board/meta.json";
import { newerBoard, type BoardSnapshot } from "@/lib/queries/runs";
import type { AgentRow, GateFileRow } from "@/lib/survey/board";

/**
 * Agent statuses and gate counts: the copy deployed with the site (scripts/agent_board.py), unless a run
 * from the board has reported a newer one since.
 */
export async function boardState(): Promise<BoardSnapshot> {
  const deployed: BoardSnapshot = { agents: agentsJson as AgentRow[], gate_files: gateJson as GateFileRow[], generated_at: metaJson.generated_at };
  return (await newerBoard(deployed.generated_at)) ?? deployed;
}
