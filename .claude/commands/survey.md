---
description: Pull the latest survey answers, run the numbers and get feedback (survey-analyst).
argument-hint: "[Google Sheet link | path to a CSV]"
---
Argument: $ARGUMENTS

1. Get the newest responses into `data/survey/` using the first route that works:
   - The argument is a path to a CSV: copy it to `data/survey/responses.csv`.
   - `SURVEY_CSV_URL` is set (the sheet feed URL with its key): `curl -fsS "$SURVEY_CSV_URL" -o data/survey/responses.csv`. Never print the URL; it holds the key.
   - The argument is a Google Sheet link (or `SURVEY_SHEET_ID` is set) and a Google Sheets tool is connected: read the whole `Responses` tab and save the returned rows as JSON to `data/survey/responses.json`.
   - An older `data/survey/responses.csv` or `.json` exists: use it and say how old it is.
   - None of these: stop and tell the user to either run `/survey <sheet link>` or download the sheet's Responses tab as CSV to `data/survey/responses.csv`.
2. Launch the `survey-analyst` subagent.
3. Reply with: responses and waitlist joins, the ICP read, the price read against ₹99, the top worry, the feedback list from `reports/04_survey.md`, and its recommendation and biggest risk. If there are under 30 responses, say first that every percentage is directional.
