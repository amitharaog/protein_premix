// Numbers for the owner's agent board (/board). Pure functions over survey rows, so they are unit tested.
// Same definitions as scripts/survey_analyze.py: anchor = Q2 includes whey or bars; skipping Q2 puts you in neither group.

type Answers = Record<string, string | string[] | undefined>;
export type BoardResponse = { answers: Answers; createdAt: Date };

export const ANCHOR_OPTIONS = ["Whey / protein powder", "Protein bars or snacks"];
export const PAY_100_PLUS = ["₹100-150", "₹150+"];

const DAY_MS = 86_400_000;
const istDay = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : v == null || v === "" ? [] : [String(v)]);
const likelyOf = (r: BoardResponse) => {
  const v = Number(r.answers.Q9);
  return v >= 1 && v <= 5 ? v : null;
};

export function headline(responses: BoardResponse[], waitlistJoins: number, now: Date) {
  const likely = responses.map(likelyOf).filter((v): v is number => v != null);
  const prices = responses.map((r) => r.answers.Q5).filter((v): v is string => typeof v === "string" && v !== "");
  const likely45 = likely.filter((v) => v >= 4).length;
  const lastAt = responses.reduce<Date | null>((a, r) => (!a || r.createdAt > a ? r.createdAt : a), null);
  return {
    responses: responses.length,
    last7: responses.filter((r) => now.getTime() - r.createdAt.getTime() < 7 * DAY_MS).length,
    waitlistJoins,
    likelyAnswered: likely.length,
    likely45,
    likely45Share: likely.length ? likely45 / likely.length : null,
    pay100Share: prices.length ? prices.filter((p) => PAY_100_PLUS.includes(p)).length / prices.length : null,
    lastAt,
  };
}

/** New responses per India-time day, from the first response to today, at most `maxDays` days. */
export function dailyCounts(responses: BoardResponse[], now: Date, maxDays = 60): { day: string; n: number }[] {
  if (!responses.length) return [];
  const counts = new Map<string, number>();
  for (const r of responses) counts.set(istDay(r.createdAt), (counts.get(istDay(r.createdAt)) ?? 0) + 1);
  const today = Date.parse(istDay(now) + "T00:00:00Z");
  const first = Math.max(Date.parse([...counts.keys()].sort()[0] + "T00:00:00Z"), today - (maxDays - 1) * DAY_MS);
  const days: { day: string; n: number }[] = [];
  for (let t = first; t <= today; t += DAY_MS) {
    const day = new Date(t).toISOString().slice(0, 10);
    days.push({ day, n: counts.get(day) ?? 0 });
  }
  return days;
}

export type Segment = { segment: string; n: number; likelyAnswered: number; likely45: number; share: number | null; avg: number | null };

export function segments(responses: BoardResponse[]): Segment[] {
  const groups: [string, BoardResponse[]][] = [["Buys whey or protein bars", []], ["Buys neither", []], ["Skipped the question", []]];
  for (const r of responses) {
    const picks = list(r.answers.Q2);
    groups[!picks.length ? 2 : picks.some((p) => ANCHOR_OPTIONS.includes(p)) ? 0 : 1][1].push(r);
  }
  return groups.map(([segment, rows]) => {
    const likely = rows.map(likelyOf).filter((v): v is number => v != null);
    const likely45 = likely.filter((v) => v >= 4).length;
    return {
      segment, n: rows.length, likelyAnswered: likely.length, likely45,
      share: likely.length ? likely45 / likely.length : null,
      avg: likely.length ? Math.round((likely.reduce((a, b) => a + b, 0) / likely.length) * 10) / 10 : null,
    };
  });
}

// Rows written by scripts/agent_board.py into src/content/agent-board/.
export type AgentRow = {
  order: number; name: string; slug: string; phase: string; command: string; job: string; model: string;
  status: string; waiting_on: string; output: string; rows: number | null; next_step: string;
  description: string; tools: string; command_hint: string; instructions: string;
  output_exists: boolean; output_url: string; output_note: string; report: string;
};
export type GateFileRow = {
  order: number; metric: string; label: string; threshold: number; from_files: number | null; adds_survey: boolean;
  source: string; behaviour_count: number | null; interest_count: number | null; captured: string;
};
export type GateRow = { metric: string; label: string; now: number | null; needed: number; status: "Met" | "Not yet" | "No data yet" };

/** Each gate metric now: counts from the repo files plus live survey numbers where criteria.json lists the survey. */
export function gateProgress(files: GateFileRow[], survey: { responses: number; waitlistJoins: number; likely45: number }): GateRow[] {
  return files.map((g) => {
    let now = g.from_files;
    if (g.metric === "replies_total") now = (now ?? 0) + survey.responses;
    if (g.metric === "e1_actions") now = (now ?? 0) + survey.waitlistJoins;
    if (g.metric === "behaviour_to_interest_ratio") {
      const interest = (g.interest_count ?? 0) + survey.likely45;
      now = interest ? Math.round((((g.behaviour_count ?? 0) + survey.waitlistJoins) / interest) * 100) / 100 : null;
    }
    return { metric: g.metric, label: g.label, now, needed: g.threshold, status: now == null ? "No data yet" : now >= g.threshold ? "Met" : "Not yet" };
  });
}
