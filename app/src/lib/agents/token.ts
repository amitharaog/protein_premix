import "server-only";
import { getSetting, saveSetting } from "@/lib/queries/runs";
import { seal, unseal } from "./vault";

// The GitHub token the board starts runs with. Saved encrypted from the board's Setup form; never shown again,
// only its last four characters. Without BOARD_TOKEN_SECRET on the server, nothing can be saved or read.

const KEY = "github_token";

export const canStoreToken = () => (process.env.BOARD_TOKEN_SECRET ?? "").length >= 24;

export async function savedGithubToken(): Promise<{ token: string | null; hint: string; savedAt: string } | null> {
  const v = await getSetting(KEY);
  if (!v?.sealed) return null;
  return { token: unseal(v.sealed, process.env.BOARD_TOKEN_SECRET), hint: v.hint ?? "", savedAt: v.savedAt ?? "" };
}

export async function storeGithubToken(token: string) {
  await saveSetting(KEY, { sealed: seal(token, process.env.BOARD_TOKEN_SECRET), hint: token.slice(-4), savedAt: new Date().toISOString() });
}
