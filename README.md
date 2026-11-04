# Protein premix research (Claude Code)

The research question: **do people actually want this?** Only if the answer is yes do pricing, channels and CAC get modelled (see `CLAUDE.md` for the rules every piece of work follows).

## Where things stand (4 Nov 2026)
Every research agent, its commands and everything the agents produced were removed so the process can restart. Git history keeps them if anything is needed again. What stays:
- The website survey at mugcake.vercel.app/survey, its answers in the database, and the live Google Sheet that pulls them (`scripts/live_sheet.py` has the recipe).
- The agent board (`/board?key=…`): live survey numbers, the road to the demand gate (`data/gate/criteria.json`), the Excel download, the run history, and Run buttons for agents once new ones exist.
- `.github/workflows/research-agents.yml`, which runs an agent's command with Claude Code when you press Run on the board. It has nothing to run until new agents are added, and no daily schedule.
- The founder's formulation files in `data/formulation/`, untouched.

## Adding an agent again
1. Write `.claude/agents/<name>.md` (frontmatter: name, description, tools, model) and its command in `.claude/commands/`.
2. To show it on the board, add it to `PLAN`, `OUTPUTS` and `REPORTS` in `scripts/agent_board.py`, then run `pnpm board` in `app/`.
3. To give it a Run button, add its command to `RUNNABLE` (and `COMMAND_INFO`) in `app/src/lib/agents/commands.ts` and to `COMMANDS` in `scripts/board_report.py`.

## Scripts (usable on their own)
- `scripts/survey_analyze.py`: survey numbers from the sheet feed (CSV or JSON): segments, price bands, worries, flags, gate-ready rows and a run history. Removes emails and phone numbers from comments.
- `scripts/live_sheet.py`: the cells of the live Google Sheet (Responses via IMPORTDATA, Summary formulas, Notes).
- `scripts/keywords.py`: Google India, YouTube and Amazon.in autocomplete with a-z expansion, clustered into buy / make / problem / adjacent.
- `scripts/reddit_pull.py`: read-only search across `scripts/subreddits.txt` and thread pulls.
- `scripts/youtube_trends.py --terms FILE`: recent YouTube videos for India per search term, with views, likes, comments and views per day, from the official YouTube Data API (needs `YOUTUBE_API_KEY`); `--trends` adds Google Trends interest.
- `scripts/van_westendorp.py`: price sensitivity from a Google Form export; finds columns by header text.
- `scripts/recipe_calc.py`: `match` ranks recipes by what is in your pantry; `calc` gives grams per serving and per batch, estimated protein, kcal and cost.
- `scripts/cac_model.py`: `--template` prints an inputs file of E4 placeholders; running it gives CAC, LTV:CAC, break-even repeat rate and a tornado sensitivity per channel.
- `scripts/agent_board.py` and `scripts/board_report.py`: the board's agent statuses, and the workflow's side of a run (GitHub OIDC, no stored secret).

Python 3.9+, standard library only (optional: `pip install pytrends` for Google Trends).
