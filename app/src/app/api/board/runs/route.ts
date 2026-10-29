import { z } from "zod";
import { isAgentCaller } from "@/lib/agents/caller";
import { markFinished, markStarted } from "@/lib/queries/runs";

export const dynamic = "force-dynamic";

// The research-agents workflow reports here: "started" (and gets back what to run), then "finished" with the
// agent's closing message, the reports it wrote and the agent statuses afterwards. Callers prove who they are
// with a GitHub OIDC token from that workflow (or BOARD_KEY); anything else gets a plain 404.

const githubUrl = (kind: "actions/runs/\\d+" | "commit/[0-9a-f]{7,40}") =>
  z.string().max(300).regex(new RegExp(`^https://github\\.com/[\\w.-]+/[\\w.-]+/${kind}$`));

const agentRow = z.object({
  order: z.number(), name: z.string().max(80), slug: z.string().max(80), phase: z.string().max(80), command: z.string().max(80),
  job: z.string().max(300), model: z.string().max(40), status: z.string().max(80), waiting_on: z.string().max(300),
  output: z.string().max(300), rows: z.number().nullable(), next_step: z.string().max(300), description: z.string().max(2000),
  tools: z.string().max(300), command_hint: z.string().max(300), instructions: z.string().max(40_000),
  output_exists: z.boolean(), output_url: z.string().max(400).regex(/^(https:\/\/github\.com\/.*)?$/), output_note: z.string().max(300), report: z.string().max(200),
});
const gateFile = z.object({
  order: z.number(), metric: z.string().max(80), label: z.string().max(120), threshold: z.number(), from_files: z.number().nullable(),
  adds_survey: z.boolean(), source: z.string().max(300), behaviour_count: z.number().nullable(), interest_count: z.number().nullable(),
  captured: z.string().max(20),
});

const body = z.discriminatedUnion("event", [
  z.object({ event: z.literal("started"), run_id: z.uuid(), run_url: githubUrl("actions/runs/\\d+") }),
  z.object({
    event: z.literal("finished"),
    run_id: z.uuid(),
    ok: z.boolean(),
    summary: z.string().max(20_000).optional(),
    cost_usd: z.number().nonnegative().max(1000).optional(),
    error: z.string().max(2000).optional(),
    commit_url: githubUrl("commit/[0-9a-f]{7,40}").optional(),
    reports: z.record(z.string().max(200), z.string().max(200_000))
      .refine((r) => Object.keys(r).length <= 20, "at most 20 reports").optional(),
    board: z.object({
      agents: z.array(agentRow).max(30),
      gate_files: z.array(gateFile).max(30),
      generated_at: z.string().regex(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/),
    }).optional(),
  }),
]);

const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "cache-control": "no-store" } });

export async function POST(req: Request) {
  if (!(await isAgentCaller(req))) return new Response("Not found", { status: 404 });
  if (Number(req.headers.get("content-length") ?? 0) > 4_000_000) return json({ error: "too large" }, 413);
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid", issues: parsed.error.issues.slice(0, 5).map((i) => i.path.join(".") + ": " + i.message) }, 400);
  const b = parsed.data;

  if (b.event === "started") {
    const run = await markStarted(b.run_id, b.run_url);
    return run ? json(run) : json({ error: "no such run waiting to start" }, 409);
  }
  const done = await markFinished(b.run_id, {
    ok: b.ok, summary: b.summary, costUsd: b.cost_usd, error: b.error, commitUrl: b.commit_url, reports: b.reports, board: b.board,
  });
  return done ? json({ id: done.id }) : json({ error: "no such run, or it already finished" }, 409);
}
