# data/survey

Filled when survey answers are pulled and run through `scripts/survey_analyze.py`. Everything here except this file and `exclude.txt` is gitignored: respondents were told nothing is shared.

| File | What it is |
|---|---|
| `responses.csv` or `.json` | the Responses tab of the Google Sheet (live feed of the website survey); anonymous answers only |
| `summary.json` | every number the report quotes, from `scripts/survey_analyze.py` |
| `tables.md` | the same numbers as tables |
| `coded_survey.csv` | one row per response in the `data/responses/coded.csv` schema; the demand gate counts it. Grade E3, or E1 if the respondent joined the waitlist |
| `history.csv` | headline numbers per run date, so each run can say what moved |
| `exclude.txt` | response ids to leave out (your own tests, friends and family), one per line, `#` for notes. Tracked in git: ids are random and say nothing about a person. Links tagged `utm_source=test` are left out too |

Waitlist emails and phone numbers never come here, and neither do the names and contacts from the survey's last step (required since 8 Nov 2026). They stay in the database and show only on the owner's board and its Excel download. Giving contact on the survey is required, so it is not a behaviour signal (E1); joining the waitlist still is.

## Live Google Sheet
The founder's online sheet pulls every answer from the site's feed (`/api/sheet/responses`) with `IMPORTDATA`, so it updates by itself about once an hour, and right away when the number in `Summary!B4` changes. Its Summary tab is formulas over the Responses tab. `scripts/live_sheet.py` prints every cell to write, and its header lists the build steps. The feed key (`SHEET_EXPORT_TOKEN`) lives only on Vercel and in the sheet's `Responses!A1`, never in this repo.

## Survey v2 (from 8 Nov 2026)
The survey became the "Ministry of Cravings" dessert census: it no longer describes the product, and it asks more specific questions. New: Q11 (the 10 pm dilemma: bake in a mug and indulge, or buy and feel guilty), Q12 (how much protein a dessert needs, with reference amounts), Q13 (gluten); Q4 (eggs) is back on. The old questions keep their answer options, so counts add up across the change, but Q9 and Q5 are worded differently (before, the intro screen described the product and Q5 said "sachet"). Responses submitted before 8 Nov 2026 have no Q11, Q12, Q13 or Q4 answers: report those questions on newer responses only, and say so. In the feed and the sheet, Q11 is column S, Q12 T, Q13 U.

## Survey v3 (also 8 Nov 2026)
Sharper questions, each tied to a decision: Q14 triggers (positioning), Q15 what they reach for now (the competition), Q16 last dessert spend (a real price anchor next to Q5), Q17 guilt after dessert, Q18 effort they accept at home (format). Q11 now asks only what people do at 10 pm. Q4 is off. Feed and sheet columns: Q14 V, Q15 W, Q16 X, Q17 Y, Q18 Z. The public link is now https://ministryofcravings.vercel.app/survey; mugcake.vercel.app/survey forwards there with its tags, and its /api and /board keep working.
