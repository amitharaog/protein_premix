# Protein premix research agents (Claude Code)

Ten subagents that answer one question in order: **do people actually want this?** Only if the answer is yes do pricing, channels and CAC get modelled.

```
/demand ──► demand-scout  ┐
            keyword-finder ┘──► post-drafter ──► YOU POST BY HAND ──► (3 to 5 days)
/demand replies ──► response-analyst
/survey ──► survey-analyst   (website survey, any time it has new answers)
/gate ──► demand-gate ──► pass? ──► /economics ──► pricing-analyst ┐
                                                   channel-analyst ┘──► cac-modeler
```

## Setup (5 minutes)
1. Unzip, `cd protein-premix-research`, run `claude`.
2. Python 3.9+. Scripts use the standard library only. Optional: `pip install pytrends` for Google Trends.
3. Optional but recommended: a Reddit read-only app at https://www.reddit.com/prefs/apps (type "script"), then
   `export REDDIT_CLIENT_ID=... REDDIT_CLIENT_SECRET=...`. Without it the Reddit script falls back to public endpoints, which often get blocked; the agent then uses web search instead.
4. Optional: export Google Keyword Planner results for your phrases (free with a Google Ads account, location India) to `data/keywords/keyword_planner.csv`. This is the only source of real search volume.

## Run order
| Step | You type | What happens | Your manual part |
|---|---|---|---|
| 1 | `/demand` | Reddit, marketplace reviews, YouTube listening; autocomplete keywords; post drafts | Read `data/posts/drafts.md`, post the ones you like, fill `posted.csv` |
| 2 | `/demand replies` | Pulls Reddit replies, codes everything | Paste LinkedIn, Instagram, WhatsApp and form replies into `data/responses/manual/` first |
| 2b | `/survey <Google Sheet link>` | Pulls the website survey answers, runs `scripts/survey_analyze.py`, writes feedback to `reports/04_survey.md` and survey rows for the gate | Share the survey link with `?utm_source=<place>` so sources can be told apart |
| 3 | `/gate` | Pass, fail or insufficient against `data/gate/criteria.json` | Edit thresholds before running if you disagree |
| 4 | `/economics` | Competitor shelf, Van Westendorp survey, channel scoring, CAC Monte Carlo | Run the survey form it writes, export to `data/economics/survey/responses.csv` |
| any | `/status` | Where things stand, next action | |
| any | `/recipe whey, cocoa, almond flour, ...` | Founder-only: which recipes you can bake with what you have, with grams per serving and per batch | Optional: fill `data/formulation/pantry.csv` with what you have and how many grams |

`/economics override gate` runs economics anyway and stamps every report as unvalidated.

## What the agents will not do
- Post, comment or DM anywhere. You post.
- Touch the formulation, except `recipe-builder` when you call `/recipe`. It only suggests, in `data/formulation/suggestions/`.
- Invent customers, quotes or numbers. Gaps show as `MISSING`.

## Scripts (usable on their own)
- `scripts/keywords.py`: Google India, YouTube and Amazon.in autocomplete with a-z expansion, clustered into buy / make / problem / adjacent.
- `scripts/reddit_pull.py`: read-only search across `scripts/subreddits.txt` and thread pulls.
- `scripts/agent_board.py`: one row per agent with its status (Ran, Ready, Waiting, Locked) worked out from the data files, plus the gate metrics counted from them. Feeds the agent board.
- `scripts/survey_analyze.py`: survey numbers from the Google Sheet (CSV or JSON): segments, price bands, worries, flags, gate-ready rows and a run history. Removes emails and phone numbers from comments.
- `scripts/van_westendorp.py`: price sensitivity from a Google Form export; finds columns by header text.
- `scripts/recipe_calc.py`: `match` ranks your recipes by what is in your pantry; `calc` gives grams per serving and per batch, estimated protein, kcal and cost, and checks the mix against your formulation notes.
- `scripts/cac_model.py`: `--template` prints an inputs file of E4 placeholders; running it gives CAC, LTV:CAC, break-even repeat rate and a tornado sensitivity per channel.

Every number in `cac_model.py --template` is a placeholder to be replaced. The model's main job before launch is to show which unknown matters most, so you know what to test first.
