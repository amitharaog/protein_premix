#!/usr/bin/env python3
"""Contents of the founder's live Google Sheet of the survey. Standard library only.

The sheet pulls every answer from the site's feed (/api/sheet/responses?key=SHEET_EXPORT_TOKEN) with IMPORTDATA, so it
updates by itself (about hourly) and right away when the founder changes the number in Summary!B4. Every number on the
Summary tab is a formula over the Responses tab. This prints the cells to write as JSON:

  responses_a1   the IMPORTDATA formula for Responses!A1 (holds the feed key: never commit or print it)
  summary        rows for the Summary tab, from A1 (headline, one block per question, anchor buyers against others)
  segments       rows for the Segments tab, from A1 (one ARRAYFORMULA per column; Summary counts over it)
  notes          rows for the Notes tab, from A1
  format         which Summary cells are headers, notes, percentages and decimals

Build it (a Claude session with the Google Drive and Google Sheets connectors):
  1. Create a blank spreadsheet with Drive; rename Sheet1 to Responses; add Summary (first), Segments and Notes.
  2. Write summary, segments and notes first, then responses_a1, each with update_formulas from A1.
  3. Format: header rows bold white on navy, Summary!B4 yellow (the refresh input), percent and decimal formats,
     freeze row 1 on Responses, India time zone.
  4. Tell the founder to click Allow access on the Responses tab once.
The feed key lives only in Vercel (sensitive). To get a value to put in the formula, set a new SHEET_EXPORT_TOKEN on
Vercel and redeploy production; the old key stops working.

Feed columns: A response_id, B submitted_at_ist, C source, D utm_source, E utm_medium, F utm_campaign, G ref,
H joined_waitlist, then every question in number order (Q1 in I to Q10 in R); switched-off questions stay as empty
columns, so these letters do not move.

Usage: python3 scripts/live_sheet.py --key KEY [--site https://mugcake.vercel.app] > content.json
"""
import argparse, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORDER = ["Q3", "Q2", "Q1", "Q8", "Q5", "Q9"]  # the survey's order; Q10 is free text and stays on Responses
ANCHOR = "Whey / protein powder|Protein bars or snacks"  # as in scripts/survey_analyze.py
SEGMENTS = ["Buys whey or protein bars", "Buys neither", "Skipped Q2"]


def build(key, site):
    qs = {q["id"]: q for q in json.load(open(os.path.join(ROOT, "app", "seed", "survey_questions.json"), encoding="utf-8"))}
    col = {qid: chr(ord("I") + int(qid[1:]) - 1) for qid in qs}
    rng = lambda qid: f"Responses!${col[qid]}$2:${col[qid]}"
    blank = [None] * 5
    rows = [
        ["muggoozz survey, live", None, None, None, None],
        ["Every answer from the live survey lands in the Responses tab; every number below is a formula over it. "
         "Under 30 responses, percentages are directional only.", None, None, None, None],
        blank,
        ["Refresh now: change this number (type the next one)", 1, None, None, None],
        ["Google also pulls new answers by itself, about once an hour.", None, None, None, None],
        blank,
        ["Headline", "Value", None, None, None],
    ]
    fmt = {"heads": [7], "notes": [2, 5], "answered": [], "pct": [], "dec1": [], "dec2": [], "input": "B4"}

    def add(label, formula, kind=None):
        rows.append([label, formula, None, None, None])
        if kind:
            fmt[kind].append(f"B{len(rows)}")
        return len(rows)

    n = add("Responses", "=COUNTA(Responses!$A$2:$A)")
    wl = add("Joined the waitlist (E1, behaviour)", '=COUNTIF(Responses!$H$2:$H,"yes")')
    ans = add("Answered how likely they are to buy (Q9)", f"=COUNT({rng('Q9')})")
    l45 = add("Likely 4 or 5 (E3, prompted)", f'=COUNTIF({rng("Q9")},">=4")')
    add("Share likely 4 or 5", f"=IF(B{ans}=0,0,B{l45}/B{ans})", "pct")
    add("Average likely, 1 to 5", f"=IF(B{ans}=0,0,AVERAGE({rng('Q9')}))", "dec1")
    add("Waitlist joins per 'likely 4 or 5' respondent (low means politeness)", f"=IF(B{l45}=0,0,B{wl}/B{l45})", "dec2")
    pans = add("Answered the price question (Q5)", f"=COUNTA({rng('Q5')})")
    hi = add("Would pay ₹100 or more per sachet", f'=COUNTIF({rng("Q5")},"₹100-150")+COUNTIF({rng("Q5")},"₹150+")')
    add("Share paying ₹100 or more (hypothesis: ₹99 single)", f"=IF(B{pans}=0,0,B{hi}/B{pans})", "pct")
    add("Latest response (India time)", f'=IF(B{n}=0,"",INDEX(Responses!$B$2:$B,B{n}))')

    for qid in ORDER:
        q = qs[qid]
        scale = q["type"] == "scale_1_5"
        rows += [blank, [f"{qid} {q['question']}", "Count", "% of answered", None, None]]
        fmt["heads"].append(len(rows))
        rows.append(["Answered", f"=COUNT({rng(qid)})" if scale else f"=COUNTA({rng(qid)})", None, None, None])
        a = len(rows)
        fmt["answered"].append(a)
        for o in (["1", "2", "3", "4", "5"] if scale else q["options"]):
            r = len(rows) + 1
            crit = f'"*"&$A{r}&"*"' if q["type"] == "multi" else f"$A{r}"
            rows.append([int(o) if scale else o, f"=COUNTIF({rng(qid)},{crit})", f"=IF($B${a}=0,0,B{r}/$B${a})", None, None])
            fmt["pct"].append(f"C{r}")
        if q["type"] == "multi":
            rows.append(["People could pick more than one, so the shares add up to more than 100%.", None, None, None, None])
            fmt["notes"].append(len(rows))

    rows += [blank, ["Anchor buyers against others (Q2)", "Responses", "Answered Q9", "Likely 4 or 5", "Average likely"]]
    fmt["heads"].append(len(rows))
    seg, lik = "Segments!$A$2:$A", "Segments!$B$2:$B"
    for g in SEGMENTS:
        r = len(rows) + 1
        rows.append([g, f"=COUNTIF({seg},$A{r})", f'=COUNTIFS({seg},$A{r},{lik},">=1")',
                     f'=IF(C{r}=0,0,COUNTIFS({seg},$A{r},{lik},">=4")/C{r})', f"=IF(C{r}=0,0,AVERAGEIFS({lik},{seg},$A{r}))"])
        fmt["pct"].append(f"D{r}")
        fmt["dec1"].append(f"E{r}")
    rows.append(["The idea holds if anchor buyers are clearly more likely to buy, with 10 or more people in each group.",
                 None, None, None, None])
    fmt["notes"].append(len(rows))

    q2, q9 = f"Responses!${col['Q2']}$2:${col['Q2']}", rng("Q9")
    segments = [
        ["Segment (from Q2)", "Likely to buy (Q9)"],
        [f'=ARRAYFORMULA(IF(Responses!$A$2:$A="",,IF({q2}="","{SEGMENTS[2]}",IF(REGEXMATCH({q2},"{ANCHOR}"),"{SEGMENTS[0]}","{SEGMENTS[1]}"))))',
         f'=ARRAYFORMULA(IF(Responses!$A$2:$A="",,{q9}))'],
    ]
    notes = [
        ["About this sheet"],
        [f"Responses pulls every survey answer from {site} (formula in Responses!A1). It holds survey answers only: waitlist "
         "emails and phone numbers are never in this feed, and any email or phone number typed into an answer shows as "
         "[email removed] or [phone removed]."],
        ["Google pulls new answers by itself about once an hour. To pull them right now, change the number in Summary!B4."],
        ["The first time the sheet opens, Responses shows #REF! with an Allow access button. Click it once."],
        ["Submitted is the last time that person saved their answers, in India time. A person who answers again stays one row."],
        ["Grades: a survey answer is prompted interest (E3); joining the waitlist is behaviour (E1)."],
        [f"Tag every link you share so the utm_source column can tell places apart: {site}/survey?utm_source=linkedin&utm_campaign=post1 "
         "(utm_source=instagram for Instagram). Untagged links leave utm_source blank."],
        ["Keep this sheet private: respondents were told nothing is shared, and the formula in Responses!A1 holds the feed's key."],
    ]
    feed = f"{site}/api/sheet/responses?key={key}"
    return {"responses_a1": f'=IMPORTDATA("{feed}&refresh="&Summary!$B$4)', "summary": rows, "segments": segments,
            "notes": notes, "format": fmt}


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--key", required=True, help="SHEET_EXPORT_TOKEN, as set on Vercel")
    ap.add_argument("--site", default="https://mugcake.vercel.app")
    a = ap.parse_args()
    print(json.dumps(build(a.key, a.site.rstrip("/")), ensure_ascii=False, indent=1))
