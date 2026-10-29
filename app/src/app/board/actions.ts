"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { blockedReason, cleanArgs, RUNNABLE } from "@/lib/agents/commands";
import { checkRepo, dispatchRun, githubProblem } from "@/lib/agents/github";
import { boardState } from "@/lib/agents/state";
import { canStoreToken, savedGithubToken, storeGithubToken } from "@/lib/agents/token";
import { looksLikeGithubToken } from "@/lib/agents/vault";
import { activeRun, createRun, expireStaleRuns, failRun, MAX_RUNS_PER_DAY, runsLastDay } from "@/lib/queries/runs";
import { keyMatches } from "@/lib/secret";

// Run buttons and the Setup form on the agent board. Both re-check BOARD_KEY; a wrong key goes to the home page.

const keyed = z.object({ key: z.string().max(200) });
const startInput = keyed.extend({
  command: z.enum(RUNNABLE),
  args: z.string().max(300).optional(),
  from: z.string().max(80).regex(/^[a-z0-9-]*$/).optional(), // the agent page the button sits on; empty means the board
});
const tokenInput = keyed.extend({ token: z.string().max(400) });

/** Where the workflow reports back: always the production site, so a run started from a preview still lands. */
function boardOrigin(): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  if (site.startsWith("https://")) return site.replace(/\/+$/, "");
  const prod = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return prod ? `https://${prod}` : "https://mugcake.vercel.app";
}

export async function startRun(form: FormData) {
  const parsed = startInput.safeParse(Object.fromEntries(form));
  if (!parsed.success || !keyMatches(parsed.data.key, process.env.BOARD_KEY)) redirect("/");
  const { key, command, args, from } = parsed.data;
  const k = encodeURIComponent(key);
  const back = (notice: string) => `${from ? `/board/${from}` : "/board"}?key=${k}&notice=${notice}#run`;

  const { agents } = await boardState();
  if (blockedReason(command, agents)) redirect(back("blocked"));
  const saved = await savedGithubToken();
  if (!saved?.token) redirect(back("setup"));
  await expireStaleRuns();
  if (await activeRun()) redirect(back("busy"));
  if ((await runsLastDay()) >= MAX_RUNS_PER_DAY) redirect(back("cap"));

  // The run row comes first, so a GitHub problem shows up on the run's page with what to do about it.
  const id = await createRun(command, cleanArgs(command, args));
  const repo = await checkRepo(saved.token).catch(() => ({ ok: false as const, status: 0 }));
  if (!repo.ok) await failRun(id, githubProblem(repo.status));
  else if (!repo.workflowOnDefault) await failRun(id, githubProblem(404));
  else {
    const sent = await dispatchRun(saved.token, repo.defaultBranch, { run_id: id, command, board_url: boardOrigin() })
      .catch(() => ({ ok: false as const, status: 0, message: "could not reach GitHub" }));
    if (!sent.ok) await failRun(id, githubProblem(sent.status, sent.message));
  }
  redirect(`/board/runs/${id}?key=${k}`);
}

export async function saveGithubToken(form: FormData) {
  const parsed = tokenInput.safeParse(Object.fromEntries(form));
  if (!parsed.success || !keyMatches(parsed.data.key, process.env.BOARD_KEY)) redirect("/");
  const back = (notice: string) => `/board?key=${encodeURIComponent(parsed.data.key)}&notice=${notice}#setup`;
  const token = parsed.data.token.trim();

  if (!canStoreToken()) redirect(back("nosecret"));
  if (!looksLikeGithubToken(token)) redirect(back("badtoken"));
  const repo = await checkRepo(token).catch(() => ({ ok: false as const, status: 0 }));
  if (!repo.ok) redirect(back(repo.status === 401 ? "rejected" : "unreachable"));
  await storeGithubToken(token);
  redirect(back("saved"));
}
