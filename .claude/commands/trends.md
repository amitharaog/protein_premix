---
description: Daily social trends for protein desserts in India from YouTube, Instagram and Facebook (trend-watcher). The agent board also runs it every morning.
---
1. If `YOUTUBE_API_KEY` is set and `data/trends/youtube_today.json` is missing or not from today, run `python3 scripts/youtube_trends.py --trends`. Never print the key. Without the key, carry on: trend-watcher works from web search and marks YouTube numbers MISSING.
2. Launch the `trend-watcher` subagent.
3. Reply with: what changed since the last run, the 3 fastest-growing YouTube videos with views per day and links, the top theme, any E1 rows, and the recommendation and biggest risk from `reports/08_trends.md`. Name every source that was MISSING and what would fill it.
