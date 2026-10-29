---
description: Score demand evidence against the gate criteria and decide pass, fail or insufficient.
---
1. If `data/survey/coded_survey.csv` does not exist, say survey answers and waitlist joins are not included and suggest running `/survey` first.
2. Show the user the thresholds in `data/gate/criteria.json` in a short table and note they can edit them before the run.
3. Launch the `demand-gate` subagent.
4. Reply with the status, the metric table, the weakest link and the next test. If `pass`, say `/economics` is unlocked.
