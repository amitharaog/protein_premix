import { describe, expect, it, vi } from "vitest";
import { checkRepo, dispatchRun, githubProblem } from "./github";

const reply = (status: number, body?: unknown) => new Response(body == null ? null : JSON.stringify(body), { status });

describe("checkRepo", () => {
  it("reads the default branch and looks for the workflow file there", async () => {
    const f = vi.fn().mockResolvedValueOnce(reply(200, { default_branch: "main" })).mockResolvedValueOnce(reply(200, {}));
    expect(await checkRepo("tok", f)).toEqual({ ok: true, defaultBranch: "main", workflowOnDefault: true });
    expect(f.mock.calls[0][0]).toBe("https://api.github.com/repos/amitharaog/protein_premix");
    expect(f.mock.calls[0][1].headers.authorization).toBe("Bearer tok");
    expect(f.mock.calls[1][0]).toBe("https://api.github.com/repos/amitharaog/protein_premix/contents/.github/workflows/research-agents.yml?ref=main");
  });

  it("says when the workflow is not on the default branch, and when the token is refused", async () => {
    const missing = vi.fn().mockResolvedValueOnce(reply(200, { default_branch: "old" })).mockResolvedValueOnce(reply(404, {}));
    expect(await checkRepo("tok", missing)).toEqual({ ok: true, defaultBranch: "old", workflowOnDefault: false });
    expect(await checkRepo("bad", vi.fn().mockResolvedValue(reply(401, {})))).toEqual({ ok: false, status: 401 });
  });

  it("works without a token for the public repo check", async () => {
    const f = vi.fn().mockResolvedValueOnce(reply(200, { default_branch: "main" })).mockResolvedValueOnce(reply(200, {}));
    await checkRepo(null, f);
    expect(f.mock.calls[0][1].headers.authorization).toBeUndefined();
  });
});

describe("dispatchRun", () => {
  it("starts the workflow on the branch with the run's inputs", async () => {
    const f = vi.fn().mockResolvedValue(reply(204));
    expect(await dispatchRun("tok", "main", { run_id: "r", command: "/gate" }, f)).toEqual({ ok: true });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://api.github.com/repos/amitharaog/protein_premix/actions/workflows/research-agents.yml/dispatches");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ ref: "main", inputs: { run_id: "r", command: "/gate" } });
  });

  it("passes GitHub's reason back in plain words", async () => {
    const f = vi.fn().mockResolvedValue(reply(403, { message: "Resource not accessible by personal access token" }));
    const r = await dispatchRun("tok", "main", {}, f);
    expect(r).toEqual({ ok: false, status: 403, message: "Resource not accessible by personal access token" });
    expect(githubProblem(403)).toMatch(/Actions read and write/);
    expect(githubProblem(404)).toMatch(/default branch/);
    expect(githubProblem(401)).toMatch(/expired/);
  });
});
