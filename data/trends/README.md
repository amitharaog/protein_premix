# data/trends

Filled every morning by `/trends` (trend-watcher): what the protein dessert segment in India is doing on YouTube, Instagram and Facebook. Public content only, read-only.

| File | What it is |
|---|---|
| `queries.txt` | the search terms followed every day; edit freely |
| `youtube_today.json` | today's YouTube numbers from the official YouTube Data API (`scripts/youtube_trends.py`); says `missing` when there is no `YOUTUBE_API_KEY`. Rewritten every run, so kept out of git |
| `interest.csv` | Google Trends interest in India over 90 days, web and YouTube search, when Google answers |
| `posts.csv` | every video and post found, one row per URL: `date_captured,platform,url,title_or_excerpt,channel_or_account,account_type,published,views,likes,comments,views_per_day,theme,grade` |
| `history.csv` | one row per day: `date,new_youtube_videos_7d,youtube_views_7d,top_video_url,instagram_finds,facebook_finds,e1,e2,e4,top_theme` |

Instagram and Facebook rows come from what search engines show (title, snippet, date). Both sites forbid automated collection, so nothing here logs in to them or fetches their pages. Real Instagram numbers need the Instagram Graph API with a business account.

The day's report is `reports/08_trends.md`.
