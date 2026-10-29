import { keyMatches } from "@/lib/secret";
import { isAgentWorkflowToken } from "./oidc";

/**
 * Calls from the research-agents workflow (its GitHub OIDC token) or from the owner (BOARD_KEY),
 * sent as `Authorization: Bearer …`.
 */
export async function isAgentCaller(req: Request): Promise<boolean> {
  const token = req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return false;
  if (keyMatches(token, process.env.BOARD_KEY)) return true;
  return token.split(".").length === 3 && isAgentWorkflowToken(token);
}
