# Protein premix research agents (Claude Code)

Eight subagents that answer one question in order: **do people actually want this?** Only if the answer is yes do pricing, channels and CAC get modelled.

```
/demand ──► demand-scout  ┐
            keyword-finder ┘──► post-drafter ──► YOU POST BY HAND ──► (3 to 5 days)
/demand replies ──► response-analyst
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
| 3 | `/gate` | Pass, fail or insufficient against `data/gate/criteria.json` | Edit thresholds before running if you disagree |
| 4 | `/economics` | Competitor shelf, Van Westendorp survey, channel scoring, CAC Monte Carlo | Run the survey form it writes, export to `data/economics/survey/responses.csv` |
| any | `/status` | Where things stand, next action | |

`/economics override gate` runs economics anyway and stamps every report as unvalidated.

## What the agents will not do
- Post, comment or DM anywhere. You post.
- Touch the formulation.
- Invent customers, quotes or numbers. Gaps show as `MISSING`.

## Scripts (usable on their own)
- `scripts/keywords.py`: Google India, YouTube and Amazon.in autocomplete with a-z expansion, clustered into buy / make / problem / adjacent.
- `scripts/reddit_pull.py`: read-only search across `scripts/subreddits.txt` and thread pulls.
- `scripts/van_westendorp.py`: price sensitivity from a Google Form export; finds columns by header text.
- `scripts/cac_model.py`: `--template` prints an inputs file of E4 placeholders; running it gives CAC, LTV:CAC, break-even repeat rate and a tornado sensitivity per channel.

Every number in `cac_model.py --template` is a placeholder to be replaced. The model's main job before launch is to show which unknown matters most, so you know what to test first.
