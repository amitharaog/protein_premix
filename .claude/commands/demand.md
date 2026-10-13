---
description: Run the demand phase. Listening and keywords in parallel, then post drafts. Use "/demand replies" after posting to analyse responses.
argument-hint: "[replies]"
---
Argument: $ARGUMENTS

If the argument is empty:
1. Launch the `demand-scout` and `keyword-finder` subagents in parallel (one message, two Agent calls).
2. When both finish, launch `post-drafter`.
3. Reply with: signal count and intent mix, the 3 strongest keyword findings, which subreddits were skipped for rules, and the list of drafts. Remind the user to post by hand, fill `data/posts/posted.csv`, wait 3 to 5 days, then run `/demand replies`.

If the argument is `replies`:
1. Check `data/posts/posted.csv` has at least one URL. If not, stop and say so.
2. Launch `response-analyst`.
3. Reply with reach, reply rate, behaviour-to-interest ratio, and whether the evidence looks ready for `/gate`.
