#!/usr/bin/env python3
"""Contents of the founder's live Google Sheet of the survey. Standard library only.

The sheet pulls every answer from the site's feed (/api/sheet/responses?key=SHEET_EXPORT_TOKEN) with IMPORTDATA, so it
updates by itself (about hourly) and right away when the founder changes the number in Summary!B4. Every number on the
Summary tab is a formula over the Responses tab. This prints the cells to write as JSON:

  responses_a1   the IMPORTDATA formula for Responses!A1 (holds the feed key: never commit or print it)
  summary        rows for the Summary tab, from A1 (headline, one block per question, anchor buyers against others,
                 where responses came from)
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
H joined_waitlist, then every question in number order (Q1 in I to Q18 in Z); switched-off questions stay as empty
columns, so these letters do not move.

Since 8 Nov 2026 3 pm (the new survey) the sheet has two sets of tabs: Responses, Summary and Segments hold the answers
from before, frozen as values; New responses, New summary and New segments are live and show only answers saved since
then (the feed's ?since=). Build the new set with:
  --responses-tab "New responses" --summary-tab "New summary" --segments-tab "New segments" --since 2026-11-08T09:30:00Z
A New contacts tab holds the names and contacts from the survey's last step: its A1 is the New responses formula with
/api/sheet/responses swapped for /api/sheet/contacts (that feed takes only the sheet key; the agents cannot read it).
New responses has a Name column in A (frozen; a lookup from New contacts by response_id), so its feed starts in B:
build that set with --name-column as well. response_id, source, utm_medium, ref and the switched-off questions are
hidden columns there.

Usage: python3 scripts/live_sheet.py --key KEY [--site https://ministryofcravings.vercel.app] [tab options] > content.json
"""
import argparse, json, os
from datetime import datetime, timedelta, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ORDER = ["Q11", "Q14", "Q3", "Q15", "Q16", "Q17", "Q2", "Q12", "Q13", "Q18", "Q1", "Q8", "Q9", "Q5"]  # survey order; Q10 is free text
ANCHOR = "Whey / protein powder|Protein bars or snacks"  # as in scripts/survey_analyze.py
SEGMENTS = ["Buys whey or protein bars", "Buys neither", "Skipped Q2"]
SOURCES = ["linkedin", "instagram", "whatsapp"]  # utm_source values the founder shares links with


def build(key, site, responses_tab="Responses", summary_tab="Summary", segments_tab="Segments", since=None, name_column=False):
    qs = {q["id"]: q for q in json.load(open(os.path.join(ROOT, "app", "seed", "survey_questions.json"), encoding="utf-8"))}
    quote = lambda t: t if t.isalnum() else "'" + t.replace("'", "''") + "'"
    R, S, G = quote(responses_tab), quote(summary_tab), quote(segments_tab)
    title = "Dessert census (Ministry of Cravings), live"
    if since:
        ist = datetime.fromisoformat(since.replace("Z", "+00:00")).astimezone(timezone(timedelta(hours=5, minutes=30)))
        title = f"Dessert census, new answers since {ist.day} {ist:%b %Y}, {ist:%I:%M %p}".replace(" 0", " ").replace("AM", "am").replace("PM", "pm") + ", live"
    letters = lambda n: (letters((n - 1) // 26) if n > 26 else "") + chr(65 + (n - 1) % 26)  # 1 -> A, 27 -> AA
    off = 1 if name_column else 0  # a Name column in A pushes the whole feed one column right
    fx = lambda n: letters(n + off)  # fixed feed columns: 1 response_id, 2 submitted, 4 utm_source, 8 joined_waitlist
    col = {qid: letters(8 + int(qid[1:]) + off) for qid in qs}  # Q1 is column 9 (I), or J with a Name column
    rng = lambda qid: f"{R}!${col[qid]}$2:${col[qid]}"
    blank = [None] * 5
    rows = [
        [title, None, None, None, None],
        [f"Every answer from the live survey lands in the {responses_tab} tab; every number below is a formula over it. "
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

    n = add("Responses", f"=COUNTA({R}!${fx(1)}$2:${fx(1)})")
    wl = add("Joined the waitlist (E1, behaviour)", f'=COUNTIF({R}!${fx(8)}$2:${fx(8)},"yes")')
    ans = add("Answered how likely they are to buy (Q9)", f"=COUNT({rng('Q9')})")
    l45 = add("Likely 4 or 5 (E3, prompted)", f'=COUNTIF({rng("Q9")},">=4")')
    add("Share likely 4 or 5", f"=IF(B{ans}=0,0,B{l45}/B{ans})", "pct")
    add("Average likely, 1 to 5", f"=IF(B{ans}=0,0,AVERAGE({rng('Q9')}))", "dec1")
    add("Waitlist joins per 'likely 4 or 5' respondent (low means politeness)", f"=IF(B{l45}=0,0,B{wl}/B{l45})", "dec2")
    pans = add("Answered the price question (Q5)", f"=COUNTA({rng('Q5')})")
    hi = add("Would pay ₹100 or more per serving", f'=COUNTIF({rng("Q5")},"₹100-150")+COUNTIF({rng("Q5")},"₹150+")')
    add("Share paying ₹100 or more (hypothesis: ₹99 single)", f"=IF(B{pans}=0,0,B{hi}/B{pans})", "pct")
    add("Latest response (India time)", f'=IF(B{n}=0,"",INDEX({R}!${fx(2)}$2:${fx(2)},B{n}))')

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
    seg, lik = f"{G}!$A$2:$A", f"{G}!$B$2:$B"
    for g in SEGMENTS:
        r = len(rows) + 1
        rows.append([g, f"=COUNTIF({seg},$A{r})", f'=COUNTIFS({seg},$A{r},{lik},">=1")',
                     f'=IF(C{r}=0,0,COUNTIFS({seg},$A{r},{lik},">=4")/C{r})', f"=IF(C{r}=0,0,AVERAGEIFS({lik},{seg},$A{r}))"])
        fmt["pct"].append(f"D{r}")
        fmt["dec1"].append(f"E{r}")
    rows.append(["The idea holds if anchor buyers are clearly more likely to buy, with 10 or more people in each group.",
                 None, None, None, None])
    fmt["notes"].append(len(rows))

    rows += [blank, ["Where responses came from (utm_source on the link)", "Responses", "% of all", None, None]]
    fmt["heads"].append(len(rows))
    src = f"{R}!${fx(4)}$2:${fx(4)}"
    for label in SOURCES + ["No tag (link shared without utm_source)", "Other tags"]:
        r = len(rows) + 1
        count = (f"=COUNTIF({src},$A{r})" if label in SOURCES
                 else f"=$B${n}-COUNTA({src})" if label.startswith("No tag") else f"=$B${n}-SUM(B{r - len(SOURCES) - 1}:B{r - 1})")
        rows.append([label, count, f"=IF($B${n}=0,0,B{r}/$B${n})", None, None])
        fmt["pct"].append(f"C{r}")
    rows.append([f"A tagged link lands in its own row, for example {site}/survey?utm_source=linkedin&utm_campaign=post1",
                 None, None, None, None])
    fmt["notes"].append(len(rows))

    q2, q9 = f"{R}!${col['Q2']}$2:${col['Q2']}", rng("Q9")
    segments = [
        ["Segment (from Q2)", "Likely to buy (Q9)"],
        [f'=ARRAYFORMULA(IF({R}!${fx(1)}$2:${fx(1)}="",,IF({q2}="","{SEGMENTS[2]}",IF(REGEXMATCH({q2},"{ANCHOR}"),"{SEGMENTS[0]}","{SEGMENTS[1]}"))))',
         f'=ARRAYFORMULA(IF({R}!${fx(1)}$2:${fx(1)}="",,{q9}))'],
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
    feed = f"{site}/api/sheet/responses?" + (f"since={since}&" if since else "") + f"key={key}"
    out = {"responses_a1": f'=IMPORTDATA("{feed}&refresh="&{S}!$B$4)', "summary": rows, "segments": segments,
            "notes": notes, "format": fmt}
    if name_column:  # Name in A, looked up by response_id from the contacts tab (A response_id, C name)
        out["name_a1"], out["name_a2"] = "Name", f"=ARRAYFORMULA(IF(B2:B=\"\",,IFERROR(VLOOKUP(B2:B,'New contacts'!$A$2:$C,3,FALSE),\"\")))"
        out["responses_b1"] = out.pop("responses_a1")
    return out


if __name__ == "__main__":
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--key", required=True, help="SHEET_EXPORT_TOKEN, as set on Vercel")
    ap.add_argument("--site", default="https://ministryofcravings.vercel.app")
    ap.add_argument("--responses-tab", default="Responses")
    ap.add_argument("--summary-tab", default="Summary")
    ap.add_argument("--segments-tab", default="Segments")
    ap.add_argument("--since", default=None, help="ISO time: only answers saved from then on (feed ?since=)")
    ap.add_argument("--name-column", action="store_true", help="the responses tab has a Name lookup in A; the feed starts in B")
    a = ap.parse_args()
    print(json.dumps(build(a.key, a.site.rstrip("/"), a.responses_tab, a.summary_tab, a.segments_tab, a.since, a.name_column), ensure_ascii=False, indent=1))
