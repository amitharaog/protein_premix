// Plain-language "good to go?" readings of the new survey, for the owner's dashboard (/board).
// Each aspect is one build question, one number and two bars: at or above `go` it is good, under `no` it is not.
// The bars are starting points Claude set on 8 Nov 2026 as research defaults; change them here if the founder decides.
// Survey answers are prompted interest (E3). The formal go / no-go is the demand gate (data/gate/criteria.json), which
// also needs behaviour such as waitlist joins, so the dashboard says so next to these readings.

type Answers = Record<string, string | string[] | undefined>;
export type VerdictResponse = { respondentId: string; answers: Answers };

export const SURE_N = 30; // from this many answers a reading counts; below it, it is "so far"
export const LEAN_N = 5;  // below this many answers there is no reading at all
export const GATE_BEHAVIOUR_RATIO = 0.3; // data/gate/criteria.json behaviour_to_interest_ratio

export type Level = "go" | "good-so-far" | "borderline" | "weak-so-far" | "no" | "too-few" | "must-solve" | "info";

export type Aspect = {
  id: string;
  title: string;            // the build question, e.g. "Would people buy it?"
  source: string;           // which survey questions, e.g. "Q9"
  n: number;                // people who answered
  value: number | null;     // the share the bars apply to
  headline: string;         // "80% would likely buy (4 of 5)"
  meaning: string;          // what it means for building, given the level
  level: Level;
  rule: string;             // the bars, in words
  breakdown: { label: string; count: number }[];
  notes: string[];
};

export const LEVEL_LABEL: Record<Level, string> = {
  go: "Good to go",
  "good-so-far": "Looks good so far",
  borderline: "Borderline",
  "weak-so-far": "Looks weak so far",
  no: "Not good",
  "too-few": "Not enough answers",
  "must-solve": "Must solve",
  info: "Insight",
};

const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : v == null || v === "" ? [] : [String(v)]);
const pctText = (v: number) => `${Math.round(v * 100)}%`;
const answered = (rs: VerdictResponse[], q: string) => rs.filter((r) => list(r.answers[q]).length > 0);
const countOf = (rs: VerdictResponse[], q: string, options: string[]) =>
  options.map((label) => ({ label, count: rs.filter((r) => list(r.answers[q]).includes(label)).length }));
const sortDesc = (b: { label: string; count: number }[]) => [...b].sort((x, y) => y.count - x.count);
/** Options sharing the highest count above zero, so a tie is named in full ("Taste and Price"), never hidden. */
const leaders = (sorted: { label: string; count: number }[]) => sorted.filter((b) => b.count > 0 && b.count === sorted[0].count);
const joinAnd = (xs: string[]) => (xs.length <= 1 ? (xs[0] ?? "") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
const NEAR = 0.05; // within 5 points of a bar, a verdict could flip with a few answers

export function levelFor(value: number | null, n: number, go: number, no: number): Level {
  if (value == null || n < LEAN_N) return "too-few";
  if (value >= go) return n >= SURE_N ? "go" : "good-so-far";
  if (value < no) return n >= SURE_N ? "no" : "weak-so-far";
  return "borderline";
}

const good = (l: Level) => l === "go" || l === "good-so-far";
const bad = (l: Level) => l === "no" || l === "weak-so-far";
const pick = (l: Level, m: { good: string; mid: string; bad: string }) =>
  l === "too-few" ? "Too few answers to say yet." : good(l) ? m.good : bad(l) ? m.bad : m.mid;

type Bars = { go: number; no: number };

function shareAspect(
  rs: VerdictResponse[], q: string, hits: string[], bars: Bars,
  base: Omit<Aspect, "n" | "value" | "level" | "headline" | "meaning" | "breakdown" | "notes"> & {
    options: string[]; say: (pct: string, k: number, n: number) => string; meaning: { good: string; mid: string; bad: string };
  },
): Aspect {
  const who = answered(rs, q);
  const k = who.filter((r) => list(r.answers[q]).some((a) => hits.includes(a))).length;
  const n = who.length;
  const value = n ? k / n : null;
  const level = levelFor(value, n, bars.go, bars.no);
  const line = value == null || n < LEAN_N ? null : [bars.go, bars.no].find((b) => Math.abs(value - b) < NEAR);
  return {
    id: base.id, title: base.title, source: base.source, rule: base.rule, n, value, level,
    headline: n ? base.say(pctText(value ?? 0), k, n) : "No answers yet",
    meaning: pick(level, base.meaning),
    breakdown: countOf(who, q, base.options),
    notes: line == null ? [] : [`Right at the line (${pctText(line)}): one or two answers could change this verdict.`],
  };
}

const Q9 = ["1", "2", "3", "4", "5"];
const Q9_LABEL: Record<string, string> = { "1": "1 · Never", "2": "2 · Meh", "3": "3 · Maybe", "4": "4 · Probably", "5": "5 · Take my money" };
const Q5 = ["₹40-60", "₹60-80", "₹80-100", "₹100-150", "₹150+", "Wouldn't pay for this"];
const Q11 = ["Make something quick at home", "Order in (Swiggy, Zomato, Blinkit)", "Eat whatever sweet is already at home", "Nothing. I wait it out."];
const Q14 = ["Right after lunch or dinner", "Late at night", "Stress or a rough day", "Boredom or scrolling", "Chai or coffee time", "After a workout", "Celebrating or treating myself", "That time of the month"];
const Q15 = ["Chocolate", "Ice cream", "Mithai", "Biscuits or cookies", "Bakery cake, brownie or pastry", "Protein bar", "Homemade dessert"];
const Q17 = ["Happy. Zero regrets.", "A little guilty", "Guilty enough to skip it next time"];
const Q18 = ["None. Ready to eat or nothing", "2 minutes, one bowl, no mess", "10-15 minutes is fine", "I enjoy proper baking"];
const Q12 = ["Don't care, dessert is dessert", "A little, about 5 g", "Like 2 eggs, about 12 g", "Like a protein bar, about 20 g", "Like a scoop of whey, 25 g or more"];
const Q13 = ["I can't have gluten (allergy or intolerance)", "I'd pick gluten-free if I had the choice", "Don't mind either way", "Wait, what's gluten?"];
const Q1 = ["Microwave", "Air fryer", "OTG / oven", "Pressure cooker", "None of these"];
const Q8 = ["Taste / protein aftertaste", "Dry or rubbery texture", "Price", "Sugar / ingredients", "Whether the protein claim is true", "Effort to make"];
const ANCHOR = ["Whey / protein powder", "Protein bars or snacks"];

/** Share of answers to `q` that are one of `hits`, as "x% (k of n)", or null when nobody answered. */
function shareNote(rs: VerdictResponse[], q: string, hits: string[]) {
  const who = answered(rs, q);
  if (!who.length) return null;
  const k = who.filter((r) => list(r.answers[q]).some((a) => hits.includes(a))).length;
  return { k, n: who.length, text: `${pctText(k / who.length)} (${k} of ${who.length})` };
}

/** The survey's behaviour check (E1): likely buyers (4 or 5 on Q9) and how many of them joined the waitlist. */
export function waitlistCheck(rs: VerdictResponse[], joined: Set<string>) {
  const likelyIds = answered(rs, "Q9").filter((r) => ["4", "5"].includes(String(r.answers.Q9))).map((r) => r.respondentId);
  return { likely: likelyIds.length, joined: likelyIds.filter((id) => joined.has(id)).length };
}
export type Behaviour = ReturnType<typeof waitlistCheck>;
const behaviourText = (b: Behaviour) =>
  `${b.joined} of ${b.likely} likely buyers joined the waitlist (${pctText(b.joined / b.likely)}; the gate wants ${pctText(GATE_BEHAVIOUR_RATIO)} or more)`;

export function surveyVerdicts(rs: VerdictResponse[], opts: { joined: Set<string>; before?: VerdictResponse[] }): Aspect[] {
  const aspects: Aspect[] = [];

  // 1. Would people buy it? (Q9)
  const demand = shareAspect(rs, "Q9", ["4", "5"], { go: 0.6, no: 0.4 }, {
    id: "demand", title: "Would people buy it?", source: "Q9", options: Q9,
    rule: "Good to go when 60% or more say 4 or 5, with 30+ answers. Not good under 40%.",
    say: (p, k, n) => `${p} would likely buy (${k} of ${n} said 4 or 5)`,
    meaning: {
      good: "People want it. Next: turn that interest into action, like waitlist joins or a taste test.",
      mid: "Interest is lukewarm. Read what the 3s wrote in the last question to see what would win them over.",
      bad: "Most people are not keen. Read the 'hard no' answers before building more.",
    },
  });
  demand.breakdown = demand.breakdown.map((b) => ({ ...b, label: Q9_LABEL[b.label] ?? b.label }));
  const fives = shareNote(rs, "Q9", ["5"]);
  if (fives) demand.notes.push(`${fives.text} said 5, "take my money".`);
  const wl = waitlistCheck(rs, opts.joined);
  if (wl.likely) {
    demand.notes.push(
      `Reality check: ${behaviourText(wl)}.` +
      (wl.joined / wl.likely < GATE_BEHAVIOUR_RATIO ? " Until that rises, some of this interest may be politeness." : ""),
    );
  }
  const before = opts.before ?? [];
  const oldLikely = shareNote(before, "Q9", ["4", "5"]);
  if (oldLikely) demand.notes.push(`Old survey (before 8 Nov, 3 pm): ${oldLikely.text} said 4 or 5. It asked differently, so it is not the same question.`);
  aspects.push(demand);

  // 2. Will they pay around ₹99? (Q5, with Q16 as a real-spend check)
  const price = shareAspect(rs, "Q5", ["₹80-100", "₹100-150", "₹150+"], { go: 0.5, no: 0.3 }, {
    id: "price", title: "Will they pay around ₹99?", source: "Q5, Q16", options: Q5,
    rule: "Good to go when 50% or more pick ₹80-100 or higher. Not good under 30%.",
    say: (p, k, n) => `${p} would pay ₹80-100 or more for one serving (${k} of ${n})`,
    meaning: {
      good: "₹99 looks acceptable to most. Keep it as the working price; preorders are the real test.",
      mid: "₹99 is a stretch for many. Watch the ₹60-80 group: an intro price or smaller pack may be needed.",
      bad: "₹99 looks too high for most people asked. Rethink price before anything else.",
    },
  });
  const nope = shareNote(rs, "Q5", ["Wouldn't pay for this"]);
  if (nope && nope.k) price.notes.push(`${nope.text} would not pay for it at all.`);
  const spent = shareNote(rs, "Q16", ["₹100-200", "₹200 or more"]);
  if (spent) price.notes.push(`Real spend: ${spent.text} spent ₹100 or more on the last dessert they bought for themselves.`);
  const oldPay = shareNote(before, "Q5", ["₹80-100", "₹100-150", "₹150+"]);
  if (oldPay) price.notes.push(`Old survey (before 8 Nov, 3 pm): ${oldPay.text} picked ₹80-100 or more. It asked about a sachet, so it is not the same question.`);
  price.notes.push("Survey reading (E3). Price decisions wait for the demand gate.");
  aspects.push(price);

  // 3. Is there a clear craving moment? (Q14, Q3)
  const trig = answered(rs, "Q14");
  const trigCounts = sortDesc(countOf(trig, "Q14", Q14));
  const topT = leaders(trigCounts);
  const topTNames = joinAnd(topT.map((b) => b.label));
  const moment: Aspect = {
    id: "moment", title: "Is there a clear craving moment?", source: "Q14, Q3",
    n: trig.length, value: trig.length ? (topT[0]?.count ?? 0) / trig.length : null, level: "too-few",
    rule: "Clear when 40% or more pick the same trigger. Unclear under 25%.",
    headline: !trig.length ? "No answers yet" : topT.length > 1
      ? `Top triggers: ${topTNames} (each ${pctText(topT[0].count / trig.length)} of ${trig.length})`
      : `Top trigger: ${topTNames} (${pctText(topT[0].count / trig.length)} of ${trig.length})`,
    meaning: "", breakdown: trigCounts.filter((b) => b.count > 0), notes: [],
  };
  moment.level = levelFor(moment.value, moment.n, 0.4, 0.25);
  moment.meaning = pick(moment.level, {
    good: `${topT.length > 1 ? "Clear moments" : "There is a clear moment"} to build and market for: ${topTNames.toLowerCase()}.`,
    mid: "Two or three moments compete. Lead your first message with the top one.",
    bad: "No single moment stands out yet. Keep the message about cravings in general.",
  });
  const often = shareNote(rs, "Q3", ["Daily", "3-5 times a week"]);
  if (often) moment.notes.push(`${often.text} crave something sweet daily or 3 to 5 times a week.`);
  aspects.push(moment);

  // 4. Will they make it at home? (Q18, with Q11 for what they do today)
  const make = shareAspect(rs, "Q18", Q18.slice(1), { go: 0.7, no: 0.5 }, {
    id: "make", title: "Will they make it at home?", source: "Q18, Q11", options: Q18,
    rule: "Good to go when 70% or more will spend at least 2 minutes. Not good under 50%.",
    say: (p, k, n) => `${p} will put in at least 2 minutes (${k} of ${n})`,
    meaning: {
      good: "Making it at home is not a barrier. A quick, one-bowl dessert fits how they live.",
      mid: "A good chunk want ready-to-eat. Keep the making part as close to zero effort as possible.",
      bad: "Most want ready-to-eat. A make-at-home product will struggle; rethink the format before building.",
    },
  });
  const q11 = answered(rs, "Q11");
  if (q11.length) {
    const counts = countOf(q11, "Q11", Q11);
    const c = counts.map((b) => pctText(b.count / q11.length));
    make.notes.push(`At 10 pm today: ${c[0]} make something at home, ${c[1]} order in, ${c[2]} eat what is at home, ${c[3]} wait it out (${q11.length} answers).`);
    if (q11.length >= LEAN_N && counts[0].count / q11.length < 0.25) {
      make.notes.push(`Only ${c[0]} make something at home today, so for most people this would be a new habit.`);
    }
  }
  aspects.push(make);

  // 5. Can they make it? (Q1; the four appliances in docs/SPEC.md's how-it-works switcher)
  const kitchen = shareAspect(rs, "Q1", Q1.slice(0, 4), { go: 0.8, no: 0.6 }, {
    id: "kitchen", title: "Can they make it?", source: "Q1", options: Q1,
    rule: "Good to go when 80% or more have a microwave, air fryer, oven or pressure cooker. Not good under 60%.",
    say: (p, k, n) => `${p} have a microwave, air fryer, oven or pressure cooker (${k} of ${n})`,
    meaning: {
      good: "Almost everyone has what it takes to make it.",
      mid: "Some cannot make it at home. Check which appliance most of them do have.",
      bad: "Too many people lack the appliance it needs.",
    },
  });
  const micro = shareNote(rs, "Q1", ["Microwave"]);
  if (micro) kitchen.notes.push(`${micro.text} have a microwave.`);
  aspects.push(kitchen);

  // 6. Does protein matter? (Q12, Q2)
  const protein = shareAspect(rs, "Q12", Q12.slice(2), { go: 0.5, no: 0.3 }, {
    id: "protein", title: "Does protein matter to them?", source: "Q12, Q2", options: Q12,
    rule: "Good to go when 50% or more want at least 12 g (like 2 eggs). Not good under 30%.",
    say: (p, k, n) => `${p} want at least 12 g of protein in a dessert (${k} of ${n})`,
    meaning: {
      good: "Protein is a real reason to buy, not just a nice extra.",
      mid: "Protein matters to some. Lead with taste; protein is the bonus.",
      bad: "Protein is not why they would buy. Taste has to carry it.",
    },
  });
  const big = shareNote(rs, "Q12", ["Like a scoop of whey, 25 g or more"]);
  if (big) protein.notes.push(`${big.text} want 25 g or more, like a scoop of whey.`);
  const anchor = shareNote(rs, "Q2", ANCHOR);
  if (anchor) protein.notes.push(`${anchor.text} already buy whey or protein bars.`);
  aspects.push(protein);

  // 7. Is guilt a real pain? (Q17)
  const guilt = shareAspect(rs, "Q17", Q17.slice(1), { go: 0.5, no: 0.3 }, {
    id: "guilt", title: "Is guilt a real pain?", source: "Q17", options: Q17,
    rule: "A real pain when 50% or more feel guilty after dessert. Not a pain under 30%.",
    say: (p, k, n) => `${p} feel guilty after dessert (${k} of ${n})`,
    meaning: {
      good: "Guilt is real. 'A real dessert that also has protein' speaks to it; never make health claims.",
      mid: "Some guilt, not a lot. Use it as a supporting message, not the main one.",
      bad: "Little guilt: people enjoy dessert as it is. Do not build the message around guilt.",
    },
  });
  aspects.push(guilt);

  // 8. Does gluten-free matter? (Q13)
  const gluten = shareAspect(rs, "Q13", Q13.slice(0, 2), { go: 0.3, no: 0.15 }, {
    id: "gluten", title: "Does gluten-free matter?", source: "Q13", options: Q13,
    rule: "A selling point when 30% or more need or prefer gluten-free. Not one under 15%.",
    say: (p, k, n) => `${p} need or would pick gluten-free (${k} of ${n})`,
    meaning: {
      good: "Gluten-free is a real selling point for this group.",
      mid: "Gluten-free helps a minority. A nice extra, not the headline.",
      bad: "Gluten-free does not move most people. Do not lead with it.",
    },
  });
  const what = shareNote(rs, "Q13", ["Wait, what's gluten?"]);
  if (what && what.k) gluten.notes.push(`${what.text} asked "what's gluten?".`);
  aspects.push(gluten);

  // 9. Biggest worry to solve (Q8)
  const w = answered(rs, "Q8");
  const worries = sortDesc(countOf(w, "Q8", Q8));
  const topW = leaders(worries);
  const topWNames = joinAnd(topW.map((b) => b.label));
  const wShare = w.length ? (topW[0]?.count ?? 0) / w.length : null;
  aspects.push({
    id: "worry", title: "What would stop them?", source: "Q8", n: w.length, value: wShare,
    level: w.length < LEAN_N ? "too-few" : (wShare ?? 0) >= 0.4 ? "must-solve" : "info",
    rule: "Flagged as a must-solve when 40% or more share the same worry.",
    headline: !w.length ? "No answers yet" : topW.length > 1
      ? `Top worries, tied: ${topWNames} (each ${pctText(wShare ?? 0)} of ${w.length})`
      : `Top worry: ${topWNames} (${pctText(wShare ?? 0)} of ${w.length})`,
    meaning: w.length < LEAN_N ? "Too few answers to say yet." : (wShare ?? 0) >= 0.4
      ? `Must solve before launch: ${topWNames.toLowerCase()}.`
      : "No single worry dominates. Keep an eye on the top two.",
    breakdown: worries.filter((b) => b.count > 0), notes: [],
  });

  // 10. What are we up against? (Q15)
  const r15 = answered(rs, "Q15");
  const reach = sortDesc(countOf(r15, "Q15", Q15));
  const tier = (bs: { label: string; count: number }[]) =>
    `${joinAnd(bs.map((b) => b.label.toLowerCase()))} (${pctText(bs[0].count / r15.length)}${bs.length > 1 ? " each" : ""})`;
  const firstTier = leaders(reach);
  const secondTier = leaders(reach.filter((b) => b.count < (firstTier[0]?.count ?? 0)));
  aspects.push({
    id: "competition", title: "What are you up against?", source: "Q15", n: r15.length,
    value: null, level: r15.length < LEAN_N ? "too-few" : "info",
    rule: "An insight, not a pass or fail.",
    headline: r15.length && firstTier.length ? `They reach for ${tier(firstTier)}${secondTier.length ? `, then ${tier(secondTier)}` : ""}` : "No answers yet",
    meaning: r15.length < LEAN_N ? "Too few answers to say yet." : "This is your real competition at the moment of craving: the taste has to beat it.",
    breakdown: reach.filter((b) => b.count > 0), notes: [],
  });

  return aspects;
}

export type Overall = { level: Level; title: string; detail: string; action: string | null };

/** One line for the top of the dashboard, from the four aspects that decide whether the idea works at all,
 * plus the waitlist check: what people did, not just what they said. */
export function overallVerdict(aspects: Aspect[], n: number, behaviour?: Behaviour): Overall {
  const action = behaviour?.likely ? `Real actions: ${behaviourText(behaviour)}.` : null;
  const say = (level: Level, title: string, detail: string): Overall => ({ level, title, detail, action });
  const core = ["demand", "price", "make", "kitchen"].map((id) => aspects.find((a) => a.id === id)).filter((a): a is Aspect => Boolean(a));
  const names = (as: Aspect[]) => as.map((a) => a.title.replace(/\?$/, "").toLowerCase()).join("; ");
  if (n < LEAN_N) return say("too-few", "Not enough answers yet", `${n} answers to the new survey. Readings start at ${LEAN_N}; trust them at ${SURE_N}.`);
  const failing = core.filter((a) => bad(a.level));
  const notGood = core.filter((a) => !good(a.level));
  if (failing.some((a) => a.level === "no")) return say("no", "Not good yet", `With ${n} answers, these fail: ${names(failing)}. Fix them before building more.`);
  if (n < SURE_N) {
    if (!notGood.length) return say("good-so-far", "Looks good so far", `All four basics look good with ${n} answers. Get to ${SURE_N} (${SURE_N - n} more) before trusting it.`);
    return say(failing.length ? "weak-so-far" : "borderline", failing.length ? "Looks weak so far" : "Mixed so far",
      `With ${n} answers, watch: ${names(notGood)}. Get to ${SURE_N} (${SURE_N - n} more) before deciding.`);
  }
  if (!notGood.length) return say("go", "Good to go to the next step", `All four basics pass with ${n} answers. The final call is the demand gate below: it also needs real actions like waitlist joins.`);
  return say("borderline", "Mixed: fix these first", `With ${n} answers, these are not there yet: ${names(notGood)}.`);
}
