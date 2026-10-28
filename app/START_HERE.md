# START HERE: build the protein mug cake app with Claude Code

This kit holds everything Claude Code needs to build one app: a **public launch site** (survey, waitlist,
flavour voting, and a shop for later) plus your **private research app**. The research app replaces the
Claude dashboard, survey and ingredient planner. Both share one **Neon Postgres** database, and the app is
hosted on **Vercel**.

```
mugcake-build-kit/
  START_HERE.md        ← you are here (setup + the prompts to paste)
  CLAUDE.md            ← project rules Claude Code reads automatically
  .env.example
  db/schema.sql        ← full database design
  docs/SPEC.md         ← every page, feature and acceptance criterion
  docs/REFRESH_JOBS.md ← the Monday auto-refresh (survey, prices, news, email)
  docs/COMPLIANCE.md   ← FSSAI protein-claim maths, copy rules, DPDP basics
  docs/DESIGN.md       ← colours, fonts, UI rules (from your survey page)
  seed/*.json          ← ALL your current data, exported 28 Oct 2026
```

## 1. One-time setup (about 20 minutes)

1. **Accounts:** GitHub, [Vercel](https://vercel.com), [Neon](https://neon.tech), [Resend](https://resend.com), and Google Cloud (for the OAuth client). Add an Anthropic API key if you want the AI news scan.
2. **Neon:** create a project named `mugcake`. Choose region **AWS Asia Pacific (Singapore)**, which is closest to India. Copy both the **pooled** and the **direct** connection strings.
3. **Google OAuth:** create a Web client and add these redirect URIs:
   - `http://localhost:3000/api/auth/callback/google`
   - `https://<your-domain>/api/auth/callback/google`
4. **Install:** Node 20+, pnpm (`npm i -g pnpm`), and Claude Code (`npm i -g @anthropic-ai/claude-code`).
5. Make an empty folder and copy this kit's contents into it. Copy `.env.example` to `.env.local` and fill it in.
6. In that folder, run `git init`, then `claude`.

## 2. The kickoff prompt (paste this first)

```
You are building the project described in CLAUDE.md and docs/. Read CLAUDE.md, docs/SPEC.md,
docs/REFRESH_JOBS.md, docs/COMPLIANCE.md, docs/DESIGN.md and db/schema.sql fully before writing code.
Then look at every file in seed/ to understand the data shapes.

Work phase by phase exactly as in SPEC §0. Start with PHASE 1 ONLY:
- scaffold Next.js 15 (App Router, TS strict, Tailwind v4, shadcn/ui, pnpm) in this folder without
  deleting the existing docs/, seed/, db/ or CLAUDE.md
- Drizzle schema in src/db/schema.ts mirroring db/schema.sql exactly (enums, FKs, indexes), neon-http
  client, drizzle.config.ts using DATABASE_URL_UNPOOLED, generate + apply the first migration
- scripts/seed.ts with Zod validation and idempotent upserts per SPEC §4; print counts per table
- Auth.js v5 with Google + Drizzle adapter; /admin layout gate using ADMIN_EMAILS; sign-in page
- design tokens and fonts from docs/DESIGN.md; base public layout + admin shell (nav, mobile tab bar)
- Vitest + Playwright configured; GitHub Actions CI running lint, typecheck, test, build
- package.json scripts listed in CLAUDE.md
Before coding, show me a short plan and the file tree you will create. After coding, run
lint/typecheck/test/build and db:seed, fix everything, and report the seed counts.
Ask me only if something is truly blocked (e.g. a missing env var).
```

## 3. The follow-up prompts (one per phase, after the last phase is green)

**Phase 2: public survey + waitlist**
```
Implement SPEC §1 (public launch site) fully: /, /survey (no-login, cookie respondent id, Zod,
honeypot, rate limit, one-question-per-screen mobile flow, UTM capture), /waitlist with Resend
double opt-in and referral codes, /flavours/[slug], /faq, /privacy, /terms, /privacy/delete.
Enforce COMPLIANCE copy rules with a unit test that scans src/content for banned words.
Add Playwright e2e: complete the survey on a 390px viewport, join waitlist, see the response in /admin.
```

**Phase 3: research app**
```
Implement SPEC §2 (all /admin pages) and SPEC §3 calculation modules with unit tests and fixtures,
including the Classic Chocolate Fudge cost test. Make sure every number shown traces to a DB row
(rule 1 in CLAUDE.md). Build the formulation lab editor with live nutrition, cost, FSSAI badge,
allergen roll-up, test bakes with photo upload (Vercel Blob) and the approval rule. Build the
ingredient tracker, shopping list → purchase orders, and the Google Form CSV / Claude JSON import.
```

**Phase 4: weekly jobs**
```
Implement docs/REFRESH_JOBS.md: survey-snapshot, prices (per-site parsers with HTML fixtures and
tests, robots.txt, per-host rate limit, manual-only Amazon/Flipkart, variant-mismatch and
'entered' price rules, replacement search), news (Anthropic web search → pending findings, Zod-validated),
weekly-report email via Resend, /admin/jobs with Run now, vercel.json crons, idempotency per ISO week.
```

**Phase 5: shop (build it, keep the flag off)**
```
Implement products, cart and Razorpay checkout (orders API + webhook signature verification),
/admin/orders for shop orders, all behind FEATURE_SHOP and the lab_tested + fssai_licence guard.
```

## 4. Deploy
1. Push to GitHub, then go to Vercel → **Add New Project** and import the repo.
2. Vercel → **Integrations → Neon**: connect the project. This gives every preview deployment its own database branch.
3. Add all the env vars from `.env.example` to Vercel, including a new `CRON_SECRET`.
4. Run `pnpm db:migrate && pnpm db:seed` against production once, from your machine with the prod `DATABASE_URL_UNPOOLED`.
5. Add your domain, and update the Google OAuth redirect URI and `NEXT_PUBLIC_SITE_URL`.
6. After it's live, share the new `/survey` link in the outreach posts. Turn off the Claude weekly task once the Vercel cron has run successfully once.

## 5. Tips for getting a clean build from Claude Code
- Do one phase per session. Start each with: "Re-read CLAUDE.md and the SPEC section for this phase."
- Say "show me the plan first" for big phases, and check it against SPEC before it writes code.
- If it invents a number or a health claim, point it at CLAUDE.md hard rules 1 and 5.
- Ask it to commit after each green checkpoint, for example: "commit with a message listing the acceptance criteria met".
- Keep `seed/` untouched. To refresh the data later, re-export it from the old artifacts or edit it in `/admin`.

## Why there are 0 survey responses so far
The current survey page only saves answers for people signed in to a Claude account. That stops most people
from your outreach posts. The new `/survey` works for anyone with the link, so put it in every post.
