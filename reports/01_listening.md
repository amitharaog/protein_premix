# 01 Listening report (captured 2026-10-29)

## Status: TARGET NOT MET. Real signal count: 6 (target 60). Stopped rather than pad.

## Source access
- Reddit: MISSING. scripts/reddit_pull.py returned 403 on every endpoint (site-wide and all 13 subreddits). old.reddit.com is blocked for WebFetch. WebSearch with site:reddit.com returned zero Reddit URLs across 4 queries. This is an access block, not subreddit rules. No subreddit was skipped for rules. Fill with: a Reddit API key (OAuth) in the script, or the founder manually pasting threads into data/responses/manual/.
- Amazon.in / Flipkart: MISSING. Search surfaced no listings or reviews. Fill with: founder pasting 1-3 star reviews and rating counts from listing pages.
- YouTube: MISSING. Search returned no video pages, so no title/channel/views/comments. Fill with: manual list of top videos, or YouTube Data API.
- Quora / Instagram: not attempted (themes only, would not count).
- Reached: Myprotein India sample-pack reviews (5 reviews), one recipe blog comment.

## Counts
By platform: myprotein.co.in 5, recipe blog 1.
By theme: taste 2, texture 2, protein_source 1, all others 0.
By intent: 4 (bought) 4, 3 (looking to buy) 1, 0 (noise) 1; intent 1 and 2: 0.

## Five strongest pieces of evidence
1. Myprotein India verified buyer, 3 stars, "Just taste good but very chewy" (E1, bought, texture complaint). https://www.myprotein.co.in/p/12665468/reviews
2. Verified buyer 5 stars, "Savior for Sweet cravings!" (E1, bought a protein brownie in India). Same URL.
3. Verified buyer 4 stars, uses it for chocolate cravings and bulking (E1; fitness buyer). Same URL.
4. Verified buyer 5 stars, "Amazing taste" (E1). Same URL.
5. Blog comment on texanerin.com about protein-powder flavor (E2, weak, global, themes only). https://www.texanerin.com/protein-brownies/
Caveat: rows 1 to 4 are one SKU, a 5-review sample pack from 2021-2022 (listed 4.4 stars, 5 ratings, about Rs 299). They are E1 but tiny and old. Not independent evidence.

## Competitor complaints, ranked
1. Chewy/rubbery texture: 1 signal (Myprotein India). Not statistically meaningful.
Non-signal context (E4, recipe-blog explanations, not consumer evidence): overbaking, whey setting, chalky or aftertaste from protein powder, dryness.

## India vs global
India-specific: 5. Global: 1.

## What this evidence does NOT show
It does not show whether Indian buyers want a bake-at-home protein premix, how often protein brownies disappoint on texture, or whether people would pay Rs 99 per serve. There are zero Reddit, Flipkart, Amazon.in or YouTube data points, so the E2 "unprompted need in the wild" layer is empty, not negative. The Myprotein reviews are a ready-to-eat dough sample, not a premix. Absence of rows here reflects blocked access, not absence of demand. Rating counts (E1 proxy) are MISSING for every Amazon/Flipkart listing.

## Recommendation
Do not run /gate on this; it is too thin to score. Have the founder export Reddit threads and Amazon.in/Flipkart 1-3 star reviews manually, or provide Reddit API credentials, then rerun.
Biggest risk: gating on blocked-source silence and misreading it as low demand.
