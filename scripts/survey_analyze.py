#!/usr/bin/env python3
"""Survey numbers for the survey-analyst agent: counts, segments and gate-ready coding. Standard library only.

Reads the live survey data in any of these shapes:
  - the Google Sheet feed (/api/sheet/responses) or a CSV download of the sheet's Responses tab:
    fixed columns incl. joined_waitlist, then "Qn question" columns
  - the admin download (/admin/export): response_id, updated_at_utc, ..., then "Qn question" columns
  - a .json file holding the Responses tab as rows (a list of lists, header first, or {"values": [...]})
Multi answers are joined with "; ". Emails and phone numbers in free text are removed before anything is written.

Writes to --out (default data/survey/):
  summary.json       every number the report uses (the agent must quote these, not recompute)
  tables.md          the same numbers as markdown tables
  coded_survey.csv   one row per response in the data/responses/coded.csv schema, for the demand gate
  history.csv        one row per run date (headline numbers), so the next run can say what moved

Grades: a survey answer is prompted, so E3; a respondent who joined the waitlist is E1.

Usage: python3 scripts/survey_analyze.py data/survey/responses.csv [--out data/survey/] [--date YYYY-MM-DD]
Data under data/survey/ stays out of git (see .gitignore): respondents were told nothing is shared.
"""
import argparse, csv, json, os, re, sys
from collections import Counter
from datetime import date, datetime

# The anchor TG: people who already buy protein products (see the ICP discussion in reports/04_survey.md).
ANCHOR_OPTIONS = {"Whey / protein powder", "Protein bars or snacks"}
FAST_APPLIANCES = {"Microwave", "Air fryer"}
PRICE_BANDS = ["₹40-60", "₹60-80", "₹80-100", "₹100-150", "₹150+"]  # cheapest first; "Wouldn't pay" sits outside
NO_PAY = "Wouldn't pay for this"
FREQUENT_CRAVING = {"Daily", "3-5 times a week"}
MIN_SEGMENT = 10        # below this a segment comparison is not read
ICP_GAP_POINTS = 15     # anchor must beat others by this many points on "likely 4-5"
DIRECTIONAL_N = 30      # under this, every percentage is directional only
HISTORY_FIELDS = ["date", "n", "waitlist_joins", "avg_likely", "pct_likely_4_5", "pct_pay_100_plus", "pct_wouldnt_pay",
                  "anchor_n", "icp_read", "top_worry"]
GATE_FIELDS = ["date_captured", "platform", "post_id", "url_or_manual", "reply_excerpt", "has_problem",
               "past_behaviour", "stated_interest", "asked_where_to_buy", "shared_price", "theme", "grade"]


def split_multi(v):
    return [x.strip() for x in (v or "").split(";") if x.strip()]


def scrub(text):
    text = re.sub(r"[^\s@]+@[^\s@]+\.[^\s@]+", "[email removed]", text or "")
    return re.sub(r"\+?\d(?:[\s-]?\d){9,}", "[phone removed]", text)


def read(path):
    if path.endswith(".json"):
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
        table = data.get("values", []) if isinstance(data, dict) else data
        head = [str(h) for h in table[0]] if table else []
        rows = [{h: "" if v is None else str(v) for h, v in zip(head, row + [""] * (len(head) - len(row)))}
                for row in table[1:] if any(str(v).strip() for v in row)]
    else:
        with open(path, newline="", encoding="utf-8-sig") as f:
            rows = list(csv.DictReader(f))
    if not rows:
        return [], {}
    qcols = {}
    for h in rows[0].keys():
        m = re.match(r"^(Q\d+)\b\s*(.*)$", h or "")
        if m:
            qcols[m.group(1)] = (h, m.group(2).strip())
    return rows, qcols


def pct(n, d):
    return round(100 * n / d, 1) if d else None


def likely(r, qcols):
    col = qcols.get("Q9", (None,))[0]
    try:
        return int(float(r.get(col, "") or 0))
    except ValueError:
        return 0


def segment_stats(rows, qcols):
    n = len(rows)
    lk = [likely(r, qcols) for r in rows]
    lk = [x for x in lk if 1 <= x <= 5]
    q5 = qcols.get("Q5", (None,))[0]
    bands = Counter((r.get(q5) or "").strip() for r in rows if (r.get(q5) or "").strip()) if q5 else Counter()
    answered5 = sum(bands.values())
    at_least = lambda b: sum(bands[x] for x in PRICE_BANDS[PRICE_BANDS.index(b):])
    return {
        "n": n,
        "likely_answered": len(lk),
        "avg_likely": round(sum(lk) / len(lk), 2) if lk else None,
        "pct_likely_4_5": pct(sum(1 for x in lk if x >= 4), len(lk)),
        "price_answered": answered5,
        "pct_pay_80_plus": pct(at_least("₹80-100"), answered5),
        "pct_pay_100_plus": pct(at_least("₹100-150"), answered5),
        "pct_wouldnt_pay": pct(bands[NO_PAY], answered5),
        "price_bands": {b: bands[b] for b in PRICE_BANDS + [NO_PAY]},
    }


def when(stamps):
    """First and last stamp. Parsed when possible; otherwise the file order (the sheet feed is oldest first)."""
    try:
        keyed = sorted(stamps, key=lambda s: datetime.fromisoformat(s.replace("Z", "+00:00")))
    except ValueError:
        keyed = stamps
    return (keyed[0], keyed[-1]) if keyed else (None, None)


def write_history(path, row):
    """One row per run date; a second run on the same day replaces that day's row."""
    old = []
    if os.path.exists(path):
        with open(path, newline="", encoding="utf-8") as f:
            old = [r for r in csv.DictReader(f) if r.get("date") != row["date"]]
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=HISTORY_FIELDS)
        w.writeheader()
        w.writerows(sorted(old + [row], key=lambda r: r["date"]))


def distribution(rows, col):
    counts, answered = Counter(), 0
    for r in rows:
        picked = split_multi(r.get(col))
        if picked:
            answered += 1
            counts.update(set(picked))
    return answered, counts


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("csv")
    ap.add_argument("--out", default="data/survey/")
    ap.add_argument("--date", default=date.today().isoformat(), help="date_captured for coded rows")
    args = ap.parse_args()

    rows, qcols = read(args.csv)
    os.makedirs(args.out, exist_ok=True)
    n = len(rows)
    if not n:
        with open(os.path.join(args.out, "summary.json"), "w", encoding="utf-8") as f:
            json.dump({"n": 0, "note": "no responses yet"}, f, indent=1)
        with open(os.path.join(args.out, "coded_survey.csv"), "w", newline="", encoding="utf-8") as f:
            csv.DictWriter(f, fieldnames=GATE_FIELDS).writeheader()
        with open(os.path.join(args.out, "tables.md"), "w", encoding="utf-8") as f:
            f.write("# Survey numbers\n\n0 responses. Nothing to analyse yet.\n")
        print("0 responses. Nothing to analyse yet.")
        return

    has_wl = "joined_waitlist" in rows[0]
    wl = sum(1 for r in rows if (r.get("joined_waitlist") or "").lower() == "yes") if has_wl else None
    src = Counter((r.get("utm_source") or "").strip() or "direct" for r in rows)
    top_src, top_n = src.most_common(1)[0]
    stamp_col = "submitted_at_ist" if "submitted_at_ist" in rows[0] else "updated_at_utc"
    first, last = when([r[stamp_col] for r in rows if r.get(stamp_col)])

    questions = {}
    for qid, (col, text) in sorted(qcols.items(), key=lambda kv: int(kv[0][1:])):
        answered, counts = distribution(rows, col)
        if qid == "Q10" or not answered and qid in ("Q4", "Q6", "Q7"):
            continue
        questions[qid] = {"question": text, "answered": answered,
                          "options": {k: {"count": v, "pct_of_answered": pct(v, answered)} for k, v in counts.most_common()}}

    q2 = qcols.get("Q2", (None,))[0]
    is_anchor = [bool(q2 and ANCHOR_OPTIONS & set(split_multi(r.get(q2)))) for r in rows]
    anchor = [r for r, x in zip(rows, is_anchor) if x]
    others = [r for r, x in zip(rows, is_anchor) if not x]
    a, o = segment_stats(anchor, qcols), segment_stats(others, qcols)
    if a["n"] >= MIN_SEGMENT and o["n"] >= MIN_SEGMENT and a["pct_likely_4_5"] is not None and o["pct_likely_4_5"] is not None:
        gap = round(a["pct_likely_4_5"] - o["pct_likely_4_5"], 1)
        icp = "confirmed" if gap >= ICP_GAP_POINTS else ("reversed" if gap <= -ICP_GAP_POINTS else "no clear difference")
    else:
        gap, icp = None, f"not enough data (need {MIN_SEGMENT}+ in each segment)"

    q1 = qcols.get("Q1", (None,))[0]
    kit = [set(split_multi(r.get(q1))) for r in rows if q1 and split_multi(r.get(q1))]
    q3 = qcols.get("Q3", (None,))[0]
    crave = [(r.get(q3) or "").strip() for r in rows if q3 and (r.get(q3) or "").strip()]
    q8 = qcols.get("Q8", (None,))[0]
    w_answered, worries = distribution(rows, q8) if q8 else (0, Counter())
    q10 = qcols.get("Q10", (None,))[0]
    comments = [{"text": scrub(r.get(q10).strip()), "likely": likely(r, qcols) or None, "source": (r.get("utm_source") or "direct"),
                 "joined_waitlist": (r.get("joined_waitlist") or "").lower() == "yes" if has_wl else None}
                for r in rows if q10 and (r.get(q10) or "").strip()]

    by_source = {}
    for s in src:
        seg = [r for r in rows if ((r.get("utm_source") or "").strip() or "direct") == s]
        st = segment_stats(seg, qcols)
        by_source[s] = {"n": st["n"], "pct_likely_4_5": st["pct_likely_4_5"],
                        "waitlist": sum(1 for r in seg if (r.get("joined_waitlist") or "").lower() == "yes") if has_wl else None}

    flags = []
    if n < DIRECTIONAL_N:
        flags.append(f"Only {n} responses: every percentage is directional (need {DIRECTIONAL_N}+).")
    if top_n / n > 0.6 and n >= 5:
        flags.append(f"{round(100 * top_n / n)}% of responses came from one source ({top_src}); treat as one community, not the market.")
    if src.get("direct", 0) / n > 0.5:
        flags.append("Over half the responses have no utm_source; they may be friends and family. Tag every shared link.")
    if not has_wl:
        flags.append("This CSV has no joined_waitlist column (admin download); E1 waitlist actions are MISSING here. Use the sheet feed.")

    summary = {
        "n": n, "first": first, "last": last, "time_zone": "IST" if stamp_col.endswith("ist") else "UTC",
        "waitlist_joins": wl, "waitlist_rate_pct": pct(wl, n) if wl is not None else None,
        "sources": dict(src.most_common()), "by_source": by_source,
        "overall": segment_stats(rows, qcols),
        "segments": {"definition": f"anchor = Q2 includes one of {sorted(ANCHOR_OPTIONS)}", "anchor": a, "others": o,
                     "likely_gap_points": gap, "icp_read": icp},
        "appliances": {"answered": len(kit),
                       "pct_microwave_or_air_fryer": pct(sum(1 for k in kit if k & FAST_APPLIANCES), len(kit)),
                       "pct_cooker_or_otg_only": pct(sum(1 for k in kit if not k & FAST_APPLIANCES and k - {"None of these"}), len(kit)),
                       "pct_none": pct(sum(1 for k in kit if k == {"None of these"}), len(kit))},
        "craving": {"answered": len(crave), "pct_daily_or_3_5_week": pct(sum(1 for c in crave if c in FREQUENT_CRAVING), len(crave))},
        "worries": {"answered": w_answered, "ranked": [{"worry": k, "count": v, "pct_of_answered": pct(v, w_answered)} for k, v in worries.most_common()]},
        "questions": questions, "comments": comments, "flags": flags,
        "grades": {"survey_answers": "E3", "waitlist_joins": "E1"},
    }
    with open(os.path.join(args.out, "summary.json"), "w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=1)

    with open(os.path.join(args.out, "coded_survey.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=GATE_FIELDS)
        w.writeheader()
        for r in rows:
            joined = (r.get("joined_waitlist") or "").lower() == "yes"
            top_worry = (split_multi(r.get(q8)) or [""])[0] if q8 else ""
            w.writerow({
                "date_captured": args.date, "platform": "survey",
                "post_id": (r.get("utm_campaign") or r.get("utm_source") or "direct").strip(),
                "url_or_manual": f"survey:{r.get('response_id', '')}",
                "reply_excerpt": scrub((r.get(q10) or "").strip())[:200] if q10 else "",
                "has_problem": "no", "past_behaviour": "no",
                "stated_interest": "yes" if likely(r, qcols) >= 4 else "no",
                "asked_where_to_buy": "yes" if joined else "no",
                "shared_price": (r.get(qcols["Q5"][0]) or "").strip() if "Q5" in qcols else "",
                "theme": top_worry, "grade": "E1" if joined else "E3",
            })

    lines = [f"# Survey numbers ({n} responses, {summary['first']} to {summary['last']} {summary['time_zone']})", ""]
    lines += ["| Metric | Value |", "|---|---|"]
    ov = summary["overall"]
    for label, val in [("Responses", n), ("Joined waitlist (E1)", f"{wl} ({summary['waitlist_rate_pct']}%)" if wl is not None else "MISSING"),
                       ("Avg likely to buy (1-5)", ov["avg_likely"]), ("Likely 4-5", f"{ov['pct_likely_4_5']}%"),
                       ("Would pay ₹80+", f"{ov['pct_pay_80_plus']}%"), ("Would pay ₹100+", f"{ov['pct_pay_100_plus']}%"),
                       ("Wouldn't pay", f"{ov['pct_wouldnt_pay']}%"),
                       ("Has microwave or air fryer", f"{summary['appliances']['pct_microwave_or_air_fryer']}%"),
                       ("Craves daily or 3-5x a week", f"{summary['craving']['pct_daily_or_3_5_week']}%")]:
        lines.append(f"| {label} | {val} |")
    lines += ["", f"## Anchor vs others ({summary['segments']['definition']})", "",
              "| Segment | n | Avg likely | Likely 4-5 | Pay ₹80+ | Pay ₹100+ |", "|---|---|---|---|---|---|"]
    for name, st in (("Anchor (buys protein)", a), ("Others", o)):
        lines.append(f"| {name} | {st['n']} | {st['avg_likely']} | {st['pct_likely_4_5']}% | {st['pct_pay_80_plus']}% | {st['pct_pay_100_plus']}% |")
    lines += ["", f"ICP read: **{icp}**" + (f" (gap {gap} points)" if gap is not None else ""), "",
              "## Worries", "", "| Worry | Count | % of answered |", "|---|---|---|"]
    lines += [f"| {x['worry']} | {x['count']} | {x['pct_of_answered']}% |" for x in summary["worries"]["ranked"]]
    lines += ["", "## Sources", "", "| utm_source | n | Likely 4-5 | Waitlist |", "|---|---|---|---|"]
    lines += [f"| {s} | {v['n']} | {v['pct_likely_4_5']}% | {v['waitlist'] if v['waitlist'] is not None else 'MISSING'} |" for s, v in by_source.items()]
    if flags:
        lines += ["", "## Flags", ""] + [f"- {x}" for x in flags]
    with open(os.path.join(args.out, "tables.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

    write_history(os.path.join(args.out, "history.csv"), {
        "date": args.date, "n": n, "waitlist_joins": "" if wl is None else wl, "avg_likely": ov["avg_likely"],
        "pct_likely_4_5": ov["pct_likely_4_5"], "pct_pay_100_plus": ov["pct_pay_100_plus"], "pct_wouldnt_pay": ov["pct_wouldnt_pay"],
        "anchor_n": a["n"], "icp_read": icp, "top_worry": summary["worries"]["ranked"][0]["worry"] if summary["worries"]["ranked"] else "",
    })

    print("\n".join(lines))


if __name__ == "__main__":
    main()
