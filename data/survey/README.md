# data/survey

Filled by `/survey` (survey-analyst). Everything here except this file and `exclude.txt` is gitignored: respondents were told nothing is shared.

| File | What it is |
|---|---|
| `responses.csv` or `.json` | the Responses tab of the Google Sheet (live feed of the website survey); anonymous answers only |
| `summary.json` | every number the report quotes, from `scripts/survey_analyze.py` |
| `tables.md` | the same numbers as tables |
| `coded_survey.csv` | one row per response in the `data/responses/coded.csv` schema; the demand gate counts it. Grade E3, or E1 if the respondent joined the waitlist |
| `history.csv` | headline numbers per run date, so each run can say what moved |
| `exclude.txt` | response ids to leave out (your own tests, friends and family), one per line, `#` for notes. Tracked in git: ids are random and say nothing about a person. Links tagged `utm_source=test` are left out too |

Waitlist emails and phone numbers never come here. They stay in the database and the admin export.
