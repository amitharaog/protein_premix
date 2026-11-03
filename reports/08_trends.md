# Trend watch, 2026-11-03

## 1. Sources
- YouTube numbers: MISSING (YOUTUBE_API_KEY is not set). Fill with: add the key as a repo secret so `scripts/youtube_trends.py` can run before this routine. Web search on youtube.com was not used for titles today.
- Search interest: answered (Google Trends, India, 90 days, to 2026-11-03). Grade E1.
- Instagram: searched, no instagram.com result returned. 0 finds.
- Facebook: searched, no facebook.com result returned. 0 finds.
- Missing for Instagram and Facebook: a manual paste of hashtag or group posts by the founder (viewing only), or a search tool that indexes those sites.

## 2. What changed
First run (no previous row in history.csv). Interest week-over-week, last 7 days vs the 7 before, scale 0 to 100 per term:

| Term | Web | YouTube search |
|---|---|---|
| protein cookies | 27.7 vs 24.1 (up) | 15.7 vs 18.1 (down) |
| protein brownie | 6.3 vs 7.6 (down) | 10.6 vs 10.7 (flat) |
| protein dessert | 2.1 vs 0.9 (up) | 12.7 vs 11.6 (up) |
| high protein cake | 1.6 vs 3.1 (down) | 11.3 vs 13.4 (down) |
| protein mug cake | 0 vs 0 | 0.4 vs 1.4 |

Each term is scaled on its own, so compare direction within a term, not levels across terms. Small values are noisy.
Over 90 days, protein cookies web interest rose from 5.0 (first 30 days average) to 12.7 (last 30 days); protein brownie from 0 to 3.5.

## 3. Five fastest-growing YouTube videos this week
MISSING: YouTube numbers (YOUTUBE_API_KEY is not set). Would be filled by the API run.

## 4. Themes this week
MISSING. No posts captured today, so no theme ranking. Search interest favours cookies, then brownie, over mug cake.

## 5. Brands and shops active (E4)
Seen in web results, not on Instagram or Facebook, so context only:
- Myprotein India: protein brownie and Diwali snack box content, mug cake recipe blog.
- Hunar Setu (listing): protein brownies, sugar-free, about INR 80 per 40g piece.
- Fabbox on BigBasket: brownie protein bar.
- Brooklyn Creamery: protein ice cream bars; Get-A-Whey: protein ice cream; Amul: protein kulfi (reported April 2025).
Instagram: none found. Facebook: none found.

## 6. Instagram and Facebook finds
None. Search `site:` queries for protein brownie, protein dessert reels and protein mug cake returned no instagram.com or facebook.com pages.

## 7. What this does NOT show
- No Instagram or Facebook posts, counts or comments.
- No YouTube views today; views are reach, not buyers.
- Google Trends is relative, per term, and low-volume terms are noisy.
- No E2 rows (texture or taste complaints) captured today.
- Brand pages above are E4 and show supply, not demand.

## Recommendation
Treat "protein cookies" as the term with the most search interest and watch it daily; restore the YouTube key so reach and themes can be graded. Do not draw demand conclusions from today's run beyond the interest series.

Biggest risk: with no YouTube or social rows, interest data alone could mislead; one term (protein cookies, max 100) may be a short spike rather than a trend.
