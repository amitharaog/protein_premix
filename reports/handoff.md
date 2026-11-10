# Session handoff (10 Nov 2026)

Read this first in a new session, together with `CLAUDE.md` and `app/CLAUDE.md`. Live numbers are not in this file on purpose (the repo is public and respondents were told nothing is shared): read them from the research dashboard or the Neon database.

## Where things live
- Repo branches: work on `claude/hopeful-sagan-gd3awd`; production is `claude/friendly-faraday-2jitqf` (fast-forward it to ship).
- Site: https://ministryofcravings.vercel.app (Vercel team `team_lvOY1dDa4ZVAO6OQ64g7pMPV`, project `prj_EojRxbRMfchHI6QpWq7nNfCHmAYo`). If a push does not trigger a production build, deploy it with the Vercel connector (git source, ref + sha).
- Database: Neon project `spring-morning-63055372`, database `mugcake`. Read-only queries with aggregates only; never destructive SQL without asking.
- Survey: `/survey` ("Dessert census", Ministry of Cravings). The new survey started 8 Nov 2026, 3 pm IST (`2026-11-08T09:30:00Z`); answers before that are frozen.
- Waitlist: the survey's last screen is the only public waitlist today.
- Research dashboard: `/board?key=...` (the founder has the link). It shows the "Is it good to go?" verdicts (`app/src/lib/survey/verdicts.ts`).
- Google Sheet "muggoozz survey (live)" in the founder's Drive: tabs New summary, New responses, New contacts pull from `/api/sheet/*` with IMPORTDATA about once an hour. To refresh now, type the next number in New summary B4.
- Customer launch page: https://ministryofcravings.vercel.app/launch, brand BRUKN (was QIXO), rustic kraft look, scroll story (windmill kraft sachet, drawn speckled mug, milk, microwave, golden top). PUBLIC since 10 Nov 2026 (`FEATURE_LAUNCH_PAGE=true` on Vercel production); the waitlist form is on and tells each person their place on the list (the 30 survey sign-ups come first, so the first launch sign-up is #31). The nutrition table shows only in the owner preview, with dashes until a lab report exists. Code in `app/src/app/(launch)/`, timeline in `app/src/lib/launch/timeline.ts`, copy in `app/src/content/launch.ts`, photo credits in `app/src/app/(launch)/launch/img/CREDITS.md`.

## Decisions so far
- Brand name is BRUKN (since 10 Nov; QIXO before), used on `/launch` only; the survey never names it. Trademark: no exact BRUKN found in a web search; brukn.com is taken; the founder still has to run the IP India phonetic search in Class 30.
- The product is flavour-neutral on every page: the founder never said chocolate.
- The founder chose to make `/launch` public on 10 Nov to grow the waitlist, accepting that the survey is no longer blind for people who see it. Tag links so survey answers from people who saw the page can be told apart.
- Payments: a payment gateway was asked for on 9 Nov and paused. It needs the founder's choice on the demand gate (CLAUDE.md: economics only after the gate passes or "override gate"), FSSAI registration before taking money for food, and a Razorpay account. `app/CLAUDE.md` keeps payments behind `FEATURE_SHOP=false`.

## Findings so far (E3, mostly the founder's own network)
- Of the four basics on the dashboard, buy, price and kitchen pass; "Will they make it at home?" is borderline: about 6 in 10 will spend 2+ minutes, about 4 in 10 want ready to eat.
- Likely buyers (4 or 5) are slightly more willing to make it than others, but about a third of them, and about 4 in 10 waitlist joiners, picked "ready to eat".
- Almost all new-survey responses came in through WhatsApp (forwards into student groups). Friends and family are not marked yet; the founder should mark the names they know in New contacts.

## ILS Mid Sprint Review (track: Consumer brand, D2C)
The review guide asks for: M.1 deck (10 slides), M.2 research data room, M.3 concept demo, M.4 proof of demand pack, M.5 Phase 2 plan. Friends and family count for at most 20% of any number; every number needs a record.
Status on 9 Nov:
- M.3 demo: mostly ready (`/launch`).
- M.4: waitlist sign-ups exist, but no proof files and no friends-and-family marking; 0 of 5 paid pre-orders from outside the network.
- Missing: buyer interviews (15+ needed, none logged in the repo), 2+ supplier quotes for COGS, packaging mock test with 20+ buyers, persona, competitor scan, deck, Phase 2 plan.
- `data/` research folders have been empty since the 4 Nov restart; `data/gate/gate.json` does not exist yet.

## Open next steps
1. Founder: buyer interviews and 2 supplier quotes; mark known names in New contacts; use tagged links (`utm_source`, `utm_campaign`) for every new share.
2. Claude, when asked: draft the deck, data room files and proof of demand pack; draft Reddit and run-club posts; a QR poster; an optional "How did you get this link?" survey question.
3. Founder decision pending: gate override and pre-orders with payments.

## Standing rules from the founder
- Never read `app/.env.local`; never print secrets (SHEET_EXPORT_TOKEN, BOARD_TOKEN_SECRET, keys).
- Survey answers and contacts never go into git, AI agents or `/api/sheet/responses`; never repeat respondents' names, phones or emails. Aggregate counts only.
- No posting or messaging on the founder's behalf; drafts only. No fake personas. No fabricated numbers: write MISSING.
- Public drafts: no brand name, prices, unit cost, format, appliance or texture method. No "healthy", "sugar-free" or "guilt-free" claims. No em dashes.
- Formulation is off limits. No pull requests unless asked.
