import { describe, expect, it } from "vitest";
import { dailyCounts, gateProgress, headline, segments, type GateFileRow } from "./board";

const now = new Date("2026-10-29T12:00:00Z"); // 17:30 IST
const r = (iso: string, answers: Record<string, string | string[]>) => ({ createdAt: new Date(iso), answers });
const responses = [
  r("2026-10-28T18:45:00Z", { Q2: ["Whey / protein powder"], Q5: "₹100-150", Q9: "5" }), // 29 Oct 00:15 IST
  r("2026-10-27T10:00:00Z", { Q2: ["Regular food only (dal, paneer, eggs)"], Q5: "₹60-80", Q9: "2" }),
  r("2026-10-10T10:00:00Z", { Q5: "₹150+", Q9: "4" }), // skipped Q2, 19 days ago
];

describe("headline", () => {
  const h = headline(responses, 1, now);
  it("counts responses, the last 7 days and likely 4-5 among those who answered", () => {
    expect(h).toMatchObject({ responses: 3, last7: 2, waitlistJoins: 1, likelyAnswered: 3, likely45: 2 });
    expect(h.likely45Share).toBeCloseTo(2 / 3);
    expect(h.pay100Share).toBeCloseTo(2 / 3);
    expect(h.lastAt?.toISOString()).toBe("2026-10-28T18:45:00.000Z");
  });
  it("has no shares before anyone answers", () => {
    expect(headline([], 0, now)).toMatchObject({ responses: 0, likely45Share: null, pay100Share: null, lastAt: null });
  });
});

describe("dailyCounts", () => {
  it("buckets by India-time day and fills empty days up to today", () => {
    const days = dailyCounts(responses.slice(0, 2), now);
    expect(days).toEqual([{ day: "2026-10-27", n: 1 }, { day: "2026-10-28", n: 0 }, { day: "2026-10-29", n: 1 }]);
  });
  it("keeps at most the last maxDays days", () => {
    const days = dailyCounts(responses, now, 5);
    expect(days.map((d) => d.day)).toEqual(["2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29"]);
    expect(dailyCounts([], now)).toEqual([]);
  });
});

describe("segments", () => {
  it("splits anchor buyers, people who buy neither, and people who skipped Q2", () => {
    const [anchor, neither, skipped] = segments(responses);
    expect(anchor).toMatchObject({ n: 1, likely45: 1, share: 1, avg: 5 });
    expect(neither).toMatchObject({ n: 1, likely45: 0, share: 0, avg: 2 });
    expect(skipped).toMatchObject({ n: 1, likely45: 1 });
  });
});

describe("gateProgress", () => {
  const base = { order: 1, label: "x", source: "", captured: "2026-10-29", adds_survey: true, behaviour_count: null, interest_count: null };
  const files: GateFileRow[] = [
    { ...base, metric: "replies_total", threshold: 40, from_files: 5 },
    { ...base, metric: "e1_actions", threshold: 15, from_files: 0 },
    { ...base, metric: "behaviour_to_interest_ratio", threshold: 0.3, from_files: null, behaviour_count: 1, interest_count: 2 },
    { ...base, metric: "india_share_of_signals", threshold: 0.4, from_files: null, adds_survey: false },
  ];
  it("adds live survey numbers to the file counts", () => {
    const [replies, e1, ratio, india] = gateProgress(files, { responses: 3, waitlistJoins: 1, likely45: 2 });
    expect(replies).toMatchObject({ now: 8, needed: 40, status: "Not yet" });
    expect(e1).toMatchObject({ now: 1, status: "Not yet" });
    expect(ratio).toMatchObject({ now: 0.5, status: "Met" });
    expect(india).toMatchObject({ now: null, status: "No data yet" });
  });
});
