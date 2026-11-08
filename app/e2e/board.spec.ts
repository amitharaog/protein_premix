import { randomUUID } from "node:crypto";
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
  await expect(page.getByRole("heading", { name: "Road to the demand gate" })).toBeVisible();
  // Every agent was removed to restart the research process: the board says so and offers nothing to run.
  await expect(page.getByText(/No agents yet: they were removed/)).toBeVisible();
  await expect(page.getByText("Nothing to run: there are no agents yet.")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Run \// })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Setup, once" })).toBeVisible();
});

test("the removed agents have no pages and no commands", async ({ request }) => {
  test.skip(key.length < 24, "BOARD_KEY is not set for this run");
  for (const slug of ["demand-scout", "trend-watcher", "recipe-builder"]) expect((await request.get(`/board/${slug}?key=${k}`)).status()).toBe(404);
  const auth = { authorization: `Bearer ${key}` };
  const scheduled = await request.post("/api/board/runs", { headers: auth, data: { event: "scheduled", command: "/trends", run_url: "https://github.com/amitharaog/protein_premix/actions/runs/7" } });
  expect(scheduled.status()).toBe(400); // no daily runs any more
});

test("names and contacts from the survey show on the board", async ({ page }) => {
  test.skip(key.length < 24 || !process.env.DATABASE_URL, "BOARD_KEY or DATABASE_URL is not set for this run");
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const rid = randomUUID();
  try {
    await db.query("insert into survey_responses (respondent_id, answers) values ($1, $2)", [rid, { Q9: "5", Q5: "₹100-150" }]);
    await db.query("insert into survey_contacts (respondent_id, name, phone, whatsapp_optin) values ($1, $2, $3, true)", [rid, "Board Test Person", "+919876543210"]);
    await page.goto(`/board?key=${k}`);
    await page.getByText(/^Names and contacts \(\d+\)$/).click();
    const row = page.getByRole("row", { name: /Board Test Person/ });
    await expect(row).toBeVisible();
    await expect(row.getByRole("link", { name: "+919876543210" })).toHaveAttribute("href", "https://wa.me/919876543210");
  } finally {
    await db.query("delete from survey_responses where respondent_id = $1", [rid]); // the contact goes with it
    await db.end();
  }
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

    const agents = JSON.parse(readFileSync("src/content/agent-board/agents.json", "utf8"));
    const gateFiles = JSON.parse(readFileSync("src/content/agent-board/gate_files.json", "utf8"));
    const board = {
      agents,
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

    await page.goto(`/board?key=${k}`);
    await expect(page.getByRole("heading", { name: "Setup, once" })).toHaveCount(0); // a run came back, so setup is done
    await expect(page.getByRole("link", { name: "Open" }).first()).toBeVisible();
    expect((await request.post("/api/board/runs", { headers: auth, data: { event: "finished", run_id: id, ok: false } })).status()).toBe(409);
  } finally {
    await db.query("delete from agent_runs where id = $1", [id]);
    await db.end();
  }
});
