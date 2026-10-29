import { colName, type Cell, type Sheet, type Style, xlsx } from "@/lib/xlsx";
import { scrubContact } from "./sheet";
import type { SurveyQuestion } from "./validate";

// The survey as an Excel file for the founder (board → Download Excel): every answer, one row per person, plus a
// Summary of formulas over those rows and a Notes tab. No emails or phones: contact details typed into answers are
// removed, and waitlist contacts never come here. Each formula carries its value too, for previews that never calculate.

export type WorkbookResponse = {
  id: string; respondentId: string; updatedAt: Date; utm: Record<string, string> | null;
  answers: Record<string, string | string[] | undefined>;
};

const ANCHOR = ["Whey / protein powder", "Protein bars or snacks"]; // as in board.ts and scripts/survey_analyze.py
const SEGMENTS = ["Buys whey or protein bars", "Buys neither", "Skipped Q2"];
const PAY_100_PLUS = ["₹100-150", "₹150+"];
const LAST = 1000; // Summary formulas read rows 2 to 1000 of Responses, so rows added under the data count too
const FIXED = ["#", "Response id", "Submitted (India time)", "Source (utm_source)", "utm_medium", "utm_campaign", "Shared by (ref)", "Joined waitlist"];

const lc = (s: string) => s.toLowerCase();
const text = (v: unknown) => (Array.isArray(v) ? v.join("; ") : v == null ? "" : String(v)).trim();
const ratio = (a: number, b: number) => (b ? a / b : 0);
const str = (v: string, s: Style = "cell"): Cell => ({ v, s });
const num = (v: number, s: Style = "cell"): Cell => ({ v, s });
const formula = (f: string, v: number | string, s: Style = "cell"): Cell => ({ f, v, s });
const q = (s: string) => `"${s.replace(/"/g, '""')}"`;

export function surveyWorkbook(questions: SurveyQuestion[], responses: WorkbookResponse[], joined: Set<string>, now: Date): Uint8Array {
  const rows = [...responses].sort((a, b) => a.updatedAt.getTime() - b.updatedAt.getTime());
  const cell = (r: WorkbookResponse, qn: SurveyQuestion): string | number | null => {
    const v = r.answers[qn.id];
    if (qn.type === "scale_1_5") {
      const n = Number(v);
      return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null;
    }
    const t = text(qn.type === "free_text" ? scrubContact(v) : v);
    return t || null;
  };
  const byId = new Map(questions.map((x) => [x.id, x]));
  const q2 = byId.get("Q2");
  const segmentOf = (r: WorkbookResponse) => {
    const v = q2 ? cell(r, q2) : null;
    if (v == null) return SEGMENTS[2];
    return ANCHOR.some((a) => lc(String(v)).includes(lc(a))) ? SEGMENTS[0] : SEGMENTS[1];
  };

  // ── Responses ──
  const qCol = new Map(questions.map((x, i) => [x.id, FIXED.length + i + 1]));
  const segCol = FIXED.length + questions.length + 1;
  const head: Cell[] = [...FIXED, ...questions.map((x) => `${x.id} ${x.question}`), ...(q2 ? ["Segment (from Q2)"] : [])].map((h) => str(h, "head"));
  const data = rows.map((r, i): Cell[] => {
    const row = i + 2;
    const q2ref = q2 ? `${colName(qCol.get("Q2")!)}${row}` : "";
    return [
      num(i + 1), str(r.id), { v: r.updatedAt, s: "date" }, str(r.utm?.utm_source || "direct (no tag)"),
      str(r.utm?.utm_medium ?? ""), str(r.utm?.utm_campaign ?? ""), str(r.utm?.ref ?? ""), str(joined.has(r.respondentId) ? "Yes" : "No"),
      ...questions.map((x): Cell => {
        const v = cell(r, x);
        return typeof v === "number" ? num(v) : str(v ?? "", "wrap");
      }),
      ...(q2 ? [formula(`IF(${q2ref}="",${q(SEGMENTS[2])},IF(OR(${ANCHOR.map((a) => `ISNUMBER(SEARCH(${q(a)},${q2ref}))`).join(",")}),${q(SEGMENTS[0])},${q(SEGMENTS[1])}))`, segmentOf(r))] : []),
    ];
  });
  const responsesSheet: Sheet = {
    name: "Responses",
    rows: [{ cells: head, height: 54 }, ...data],
    cols: [5, 38, 18, 18, 12, 14, 14, 10, ...questions.map((x) => (x.type === "free_text" ? 48 : x.type === "scale_1_5" ? 16 : 30)), 24],
    freeze: "C2",
    filter: `A1:${colName(q2 ? segCol : segCol - 1)}${rows.length + 1}`,
  };

  // ── Summary ──
  const range = (id: string) => (qCol.has(id) ? `Responses!$${colName(qCol.get(id)!)}$2:$${colName(qCol.get(id)!)}$${LAST}` : null);
  const SEG = `Responses!$${colName(segCol)}$2:$${colName(segCol)}$${LAST}`;
  const values = (id: string) => rows.map((r) => (byId.has(id) ? cell(r, byId.get(id)!) : null));
  const sum: (Cell[] | { cells: Cell[]; height?: number })[] = [
    [{ v: "muggoozz survey: summary", s: "title" }],
    { cells: [{ v: `Answers from the live survey as of ${fmtIst(now)} India time. Every number here is a formula over the Responses tab. Under 30 responses, percentages are directional only.`, s: "note" }], height: 30 },
    [],
    [str("Headline", "head"), str("Value", "head")],
  ];
  const at = (label: string, f: string, v: number, s: Style = "bold") => {
    sum.push([str(label), formula(f, v, s)]);
    return `B${sum.length}`;
  };
  const n = rows.length;
  at("Responses", `COUNTA(Responses!$B$2:$B$${LAST})`, n);
  const joins = rows.filter((r) => joined.has(r.respondentId)).length;
  const joinsRef = at("Joined the waitlist (E1, behaviour)", `COUNTIF(Responses!$H$2:$H$${LAST},"Yes")`, joins);
  const q9 = range("Q9");
  const likely = values("Q9").filter((v): v is number => typeof v === "number");
  if (q9) {
    const ans = at("Answered how likely they are to buy (Q9)", `COUNT(${q9})`, likely.length);
    const l45 = at("Likely 4 or 5 (E3, prompted)", `COUNTIF(${q9},">=4")`, likely.filter((v) => v >= 4).length);
    at("Share likely 4 or 5", `IF(${ans}=0,0,${l45}/${ans})`, ratio(likely.filter((v) => v >= 4).length, likely.length), "pct");
    at("Average likely, 1 to 5", `IF(${ans}=0,0,AVERAGE(${q9}))`, ratio(likely.reduce((a, b) => a + b, 0), likely.length), "dec1");
    at("Waitlist joins per 'likely 4 or 5' respondent (low means politeness)", `IF(${l45}=0,0,${joinsRef}/${l45})`, ratio(joins, likely.filter((v) => v >= 4).length), "dec2");
  }
  const q5 = range("Q5");
  if (q5) {
    const prices = values("Q5").filter((v): v is string => typeof v === "string");
    const ans = at("Answered the price question (Q5)", `COUNTA(${q5})`, prices.length);
    const hi = at("Would pay ₹100 or more per sachet", PAY_100_PLUS.map((p) => `COUNTIF(${q5},${q(p)})`).join("+"), prices.filter((p) => PAY_100_PLUS.includes(p)).length);
    at("Share paying ₹100 or more (hypothesis: ₹99 single)", `IF(${ans}=0,0,${hi}/${ans})`, ratio(prices.filter((p) => PAY_100_PLUS.includes(p)).length, prices.length), "pct");
  }

  for (const x of questions) {
    if (x.type === "free_text") continue;
    const rng = range(x.id)!;
    const vals = values(x.id);
    sum.push([]);
    sum.push({ cells: [str(`${x.id} ${x.question}`, "head"), str("Count", "head"), str("% of answered", "head")], height: 28 });
    const answered = vals.filter((v) => v != null).length;
    sum.push([str("Answered", "bold"), formula(x.type === "scale_1_5" ? `COUNT(${rng})` : `COUNTA(${rng})`, answered, "bold")]);
    const ansRef = `$B$${sum.length}`;
    const options = x.type === "scale_1_5" ? ["1", "2", "3", "4", "5"] : x.options;
    for (const o of options) {
      const row = sum.length + 1;
      const count = vals.filter((v) => v != null && (x.type === "scale_1_5" ? v === Number(o)
        : x.type === "multi" ? lc(String(v)).includes(lc(o)) : lc(String(v)) === lc(o))).length;
      const crit = x.type === "multi" ? `"*"&A${row}&"*"` : `A${row}`;
      sum.push([x.type === "scale_1_5" ? num(Number(o)) : str(o), formula(`COUNTIF(${rng},${crit})`, count), formula(`IF(${ansRef}=0,0,B${row}/${ansRef})`, ratio(count, answered), "pct")]);
    }
    if (x.type === "multi") sum.push([{ v: "People could pick more than one, so the shares add up to more than 100%.", s: "note" }]);
  }

  if (q2 && q9) {
    sum.push([]);
    sum.push({ cells: ["Anchor buyers against others (Q2)", "Responses", "Answered Q9", "Likely 4 or 5", "Average likely"].map((h) => str(h, "head")), height: 28 });
    for (const g of SEGMENTS) {
      const row = sum.length + 1;
      const inG = rows.filter((r) => segmentOf(r) === g);
      const l = inG.map((r) => cell(r, byId.get("Q9")!)).filter((v): v is number => typeof v === "number");
      sum.push([
        str(g), formula(`COUNTIF(${SEG},A${row})`, inG.length), formula(`COUNTIFS(${SEG},A${row},${q9},">=1")`, l.length),
        formula(`IF(C${row}=0,0,COUNTIFS(${SEG},A${row},${q9},">=4")/C${row})`, ratio(l.filter((v) => v >= 4).length, l.length), "pct"),
        formula(`IF(C${row}=0,0,AVERAGEIFS(${q9},${SEG},A${row}))`, ratio(l.reduce((a, b) => a + b, 0), l.length), "dec1"),
      ]);
    }
    sum.push([{ v: "The idea holds if anchor buyers are clearly more likely to buy, with 10 or more people in each group.", s: "note" }]);
  }
  const summarySheet: Sheet = { name: "Summary", rows: sum, cols: [52, 16, 16, 16, 16], merges: ["A2:E2"] };

  // ── Notes ──
  const notes: Sheet = {
    name: "Notes",
    cols: [110],
    rows: [
      [{ v: "About this file", s: "title" }],
      [{ v: `Downloaded from the agent board on ${fmtIst(now)} India time: ${n} responses.` }],
      [{ v: "Survey answers only. Waitlist emails and phone numbers are not in this file; they stay in the admin export." }],
      [{ v: "Any email or phone number typed into a free-text answer is replaced with [email removed] or [phone removed]." }],
      [{ v: "Submitted is the last time that person saved their answers (India time). One person who resubmits stays one row." }],
      [{ v: "Grades: a survey answer is prompted interest (E3); joining the waitlist is behaviour (E1)." }],
      [{ v: "Under 30 responses, every percentage is directional, not a finding." }],
      [],
      [{ v: "Tag every link you share, so this file can tell Instagram from LinkedIn", s: "bold" }],
      [{ v: "Instagram: https://mugcake.vercel.app/survey?utm_source=instagram&utm_campaign=<post name>" }],
      [{ v: "LinkedIn: https://mugcake.vercel.app/survey?utm_source=linkedin&utm_campaign=<post name>" }],
      [{ v: "Responses that came through an untagged link show as 'direct (no tag)' in the Source column." }],
      [],
      [{ v: "Keep this file private", s: "bold" }],
      [{ v: "Respondents were told nothing is shared. Do not upload it anywhere public or commit it to the repo." }],
    ],
  };
  return xlsx([responsesSheet, summarySheet, notes]);
}

export const fmtIst = (d: Date) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(d);
