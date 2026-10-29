// GitHub calls for the agent board: check the saved token, and start the research-agents workflow.
// The token is a fine-grained one the founder makes, limited to this repo with Actions read and write.

export const AGENTS_REPO = "amitharaog/protein_premix";
export const AGENTS_WORKFLOW = "research-agents.yml";
const API = "https://api.github.com";

type Fetch = typeof fetch;
const headers = (token: string | null): Record<string, string> => ({
  ...(token ? { authorization: `Bearer ${token}` } : {}),
  accept: "application/vnd.github+json",
  "x-github-api-version": "2022-11-28",
  "user-agent": "muggoozz-agent-board",
});

export type RepoCheck = { ok: true; defaultBranch: string; workflowOnDefault: boolean } | { ok: false; status: number };

/**
 * Does GitHub accept the token, and is the workflow file on the default branch? GitHub only starts
 * workflow_dispatch workflows whose file is on the default branch. A public repo answers any valid token
 * (and, for this check, no token), so whether the token may start runs only shows on the first run.
 */
export async function checkRepo(token: string | null, f: Fetch = fetch): Promise<RepoCheck> {
  const repo = await f(`${API}/repos/${AGENTS_REPO}`, { headers: headers(token), cache: "no-store" });
  if (!repo.ok) return { ok: false, status: repo.status };
  const { default_branch: defaultBranch } = (await repo.json()) as { default_branch: string };
  const file = await f(`${API}/repos/${AGENTS_REPO}/contents/.github/workflows/${AGENTS_WORKFLOW}?ref=${encodeURIComponent(defaultBranch)}`,
    { headers: headers(token), cache: "no-store" });
  return { ok: true, defaultBranch, workflowOnDefault: file.ok };
}

/** Starts the workflow on `ref`. GitHub answers 204 with no body; the run then reports back to the board by itself. */
export async function dispatchRun(token: string, ref: string, inputs: Record<string, string>, f: Fetch = fetch):
  Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const res = await f(`${API}/repos/${AGENTS_REPO}/actions/workflows/${AGENTS_WORKFLOW}/dispatches`, {
    method: "POST",
    headers: { ...headers(token), "content-type": "application/json" },
    body: JSON.stringify({ ref, inputs }),
    cache: "no-store",
  });
  if (res.ok) return { ok: true };
  const body = (await res.json().catch(() => ({}))) as { message?: unknown };
  return { ok: false, status: res.status, message: String(body.message ?? res.statusText).slice(0, 300) };
}

/** Plain words for a failed GitHub call. */
export function githubProblem(status: number, message = ""): string {
  if (status === 401) return "GitHub did not accept the saved token: it may have expired. Save a new one under Setup.";
  if (status === 403) return "The token cannot start runs: give it Actions read and write on protein_premix, then save it again.";
  if (status === 404) return "GitHub cannot find the workflow on the repo's default branch: see step 1 under Setup.";
  if (status === 422) return `GitHub refused the run: ${message || "check the workflow file"}.`;
  return `GitHub answered ${status}${message ? `: ${message}` : ""}.`;
}
