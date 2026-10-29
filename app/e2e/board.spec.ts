import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { Client } from "pg";

const key = process.env.BOARD_KEY ?? "";
const k = encodeURIComponent(key);

test("the agent board opens only with its key", async ({ page, request }) => {
  expect((await request.get("/board")).status()).toBe(404);
  expect((await request.get("/board?key=wrong-key-wrong-key-wrong-key")).status()).toBe(404);
  test.skip(key.length < 24, "BOARD_KEY is not set for this run");

  await page.goto(`/board?key=${k}`);
  await expect(page.getByRole("heading", { name: "Agent board" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "demand-scout" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Road to the demand gate" })).toBeVisible();
  // No GitHub token saved here, so setup shows and the Run buttons wait for it.
  await expect(page.getByRole("heading", { name: "Setup, once" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Run /gate" })).toBeDisabled();
  await expect(page.getByText("Finish the setup above first.").first()).toBeVisible();
});

test("an agent card opens its page with its Run button and instructions", async ({ page }) => {
  test.skip(key.length < 24, "BOARD_KEY is not set for this run");
  await page.goto(`/board?key=${k}`);
  await page.getByRole("link", { name: /^demand-scout/ }).click();
  await expect(page.getByRole("heading", { name: "demand-scout", level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Run it" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Run /demand" })).toBeDisabled();
  await page.getByText("Or run it yourself in Claude Code").click();
  await expect(page.getByRole("button", { name: "Copy" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Full instructions" })).toBeVisible();
  expect((await page.request.get("/board/demand-scout")).status()).toBe(404);
  expect((await page.request.get(`/board/not-an-agent?key=${k}`)).status()).toBe(404);
});

test("the Excel download needs the key and is a real workbook", async ({ request }) => {
  expect((await request.get("/board/export")).status()).toBe(404);
  test.skip(key.length < 24, "BOARD_KEY is not set for this run");
  const res = await request.get(`/board/export?key=${k}`);
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toContain("spreadsheetml");
  expect(res.headers()["content-disposition"]).toMatch(/muggoozz_survey_\d{4}-\d\d-\d\d\.xlsx/);
  expect((await res.body()).subarray(0, 2).toString()).toBe("PK");
});

test("a run reported by the workflow shows up on the board", async ({ page, request }) => {
  test.skip(key.length < 24 || !process.env.DATABASE_URL, "BOARD_KEY or DATABASE_URL is not set for this run");
  const auth = { authorization: `Bearer ${key}` };
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const { rows } = await db.query<{ id: string }>("insert into agent_runs (command) values ('/gate') returning id");
  const id = rows[0].id;
  try {
    expect((await request.post("/api/board/runs", { data: { event: "started", run_id: id, run_url: "https://github.com/x/y/actions/runs/1" } })).status()).toBe(404);
    expect((await request.post("/api/board/runs", { headers: auth, data: { event: "started", run_id: id, run_url: "javascript:alert(1)" } })).status()).toBe(400);

    const started = await request.post("/api/board/runs", { headers: auth, data: { event: "started", run_id: id, run_url: "https://github.com/amitharaog/protein_premix/actions/runs/123" } });
    expect(started.status()).toBe(200);
    expect(await started.json()).toMatchObject({ id, command: "/gate" });

    await page.goto(`/board/runs/${id}?key=${k}`);
    await expect(page.getByText(/Running on GitHub for/)).toBeVisible();

    const agents = JSON.parse(readFileSync("src/content/agent-board/agents.json", "utf8")) as { slug: string; status: string }[];
    const gateFiles = JSON.parse(readFileSync("src/content/agent-board/gate_files.json", "utf8"));
    const board = {
      agents: agents.map((a) => (a.slug === "demand-gate" ? { ...a, status: "Ran: insufficient" } : a)),
      gate_files: gateFiles,
      generated_at: new Date(Date.now() + 60_000).toISOString().slice(0, 19) + "Z",
    };
    const finished = await request.post("/api/board/runs", {
      headers: auth,
      data: {
        event: "finished", run_id: id, ok: true, cost_usd: 0.4211,
        summary: "**Status: insufficient.** Weakest link: buy-intent keywords.",
        reports: { "data/gate/decision.md": "## The call\n\nInsufficient: 7 survey responses, no signals yet." },
        board,
      },
    });
    expect(finished.status()).toBe(200);

    await page.goto(`/board/runs/${id}?key=${k}`);
    await expect(page.getByRole("heading", { name: "What the agents said" })).toBeVisible();
    await expect(page.getByText("Weakest link: buy-intent keywords.")).toBeVisible();
    await expect(page.getByText("Insufficient: 7 survey responses, no signals yet.")).toBeVisible();
    await expect(page.getByText("$0.42")).toBeVisible();

    await page.goto(`/board/demand-gate?key=${k}`);
    await expect(page.getByText("Ran: insufficient").first()).toBeVisible();
    await expect(page.getByText("Insufficient: 7 survey responses, no signals yet.")).toBeVisible();

    await page.goto(`/board?key=${k}`);
    await expect(page.getByRole("heading", { name: "Setup, once" })).toHaveCount(0); // a run came back, so setup is done
    await expect(page.getByRole("link", { name: "Open" }).first()).toBeVisible();
    expect((await request.post("/api/board/runs", { headers: auth, data: { event: "finished", run_id: id, ok: false } })).status()).toBe(409);
  } finally {
    await db.query("delete from agent_runs where id = $1", [id]);
    await db.end();
  }
});
