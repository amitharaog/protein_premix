# CLAUDE.md — Protein Mug Cake (research app + launch site)

Read this file fully before every task. Then read `docs/SPEC.md` for the feature you are touching.

## What this project is

One Next.js codebase with two faces that share one Neon Postgres database:

1. **Public launch site** (`/`, `/survey`, `/waitlist`, `/flavours`, later `/shop`) for a single-serve,
   eggless, gluten-free, bake-it-yourself protein mug cake premix sachet for India
   (~50 g, ~10 g protein; mix with milk or water; microwave ~1 min, air fryer ~10 min, OTG or pressure cooker).
   US analog: BĀK Goods.
2. **Private research app** (`/admin/*`, owner only): market dashboard, survey results, competitors,
   recipe/formulation lab, ingredient price tracker, purchase orders, weekly refresh log.

The owner is Amitha Gurre. There is exactly one admin role today; design for a small allowlist.

## Stack (do not swap without asking)

| Concern | Choice |
|---|---|
| Framework | Next.js 15, App Router, TypeScript strict, React Server Components by default |
| Database | **Neon** serverless Postgres, `@neondatabase/serverless` driver |
| ORM / migrations | Drizzle ORM + drizzle-kit (`drizzle-orm/neon-http` for queries, `neon-serverless` Pool only where a transaction is needed) |
| Auth | Auth.js v5 (`next-auth@5`) with Google provider, Drizzle adapter on Neon; admin = email in `ADMIN_EMAILS` |
| UI | Tailwind CSS v4 + shadcn/ui; charts with Recharts |
| Validation | Zod on every server action, route handler and seed file |
| Email | Resend (waitlist confirmation, weekly report) |
| Hosting | Vercel; Neon ↔ Vercel integration for preview branches |
| Scheduled jobs | Vercel Cron → `/api/cron/*` route handlers guarded by `CRON_SECRET` |
| Web research in jobs | Anthropic API (Claude) with the server-side web search tool; results land as *pending* rows |
| HTML parsing | `cheerio` for price pages |
| Payments (phase 5 only) | Razorpay (INR, UPI). Behind `FEATURE_SHOP=false` until FSSAI licence + lab report exist |
| Tests | Vitest (unit), Playwright (e2e smoke) |
| Package manager | pnpm |

## Commands

```bash
pnpm dev                 # local dev
pnpm build && pnpm start # prod build check — must pass before any task is "done"
pnpm lint && pnpm typecheck
pnpm test                # vitest
pnpm e2e                 # playwright smoke
pnpm db:generate         # drizzle-kit generate (after editing src/db/schema.ts)
pnpm db:migrate          # apply migrations to DATABASE_URL
pnpm db:seed             # load /seed/*.json (idempotent upserts)
pnpm job:prices          # run price check locally (same code as cron)
pnpm job:survey-report   # run weekly report locally
```

## Folder layout

```
src/
  app/
    (public)/            # launch site: page.tsx, survey/, waitlist/, flavours/, faq/, legal/
    admin/               # research app (server-side auth gate in layout.tsx)
    api/cron/            # prices, news, report — POST/GET with Bearer CRON_SECRET
    api/                 # survey submit, waitlist, razorpay webhook (phase 5)
  components/ui/         # shadcn
  components/            # shared app components
  db/schema.ts           # Drizzle schema — single source of truth; mirrors db/schema.sql
  db/index.ts            # neon client
  lib/                   # calc (nutrition, cost, FSSAI), survey aggregation, scrapers, anthropic
  jobs/                  # pure functions called by cron routes and pnpm scripts
seed/                    # JSON exported from the current Claude artifacts — DO NOT EDIT BY HAND
scripts/seed.ts
docs/                    # SPEC, REFRESH_JOBS, COMPLIANCE, DESIGN
```

## Hard rules (these come from the research so far — never break them)

1. **Never invent numbers.** Every market stat, competitor price or ingredient price shown must come from a DB row
   that has a `source_url` (or `price_type='entered'` for owner-typed prices). If a number is unknown, show "—".
2. **Owner-typed prices win.** Jobs must never overwrite an ingredient option whose `price_type='entered'`
   unless the live page clearly shows a different price; then write the new price, keep the old one in
   `price_history`, and flag it in the weekly report.
3. **Never delete ingredient options.** Out-of-stock or dead links get `stock_status` updated and a replacement
   option *added*.
4. **AI-found news is pending until approved.** The news job inserts `market_findings` with `status='pending'`.
   Only the admin can approve; only approved rows appear on dashboards.
5. **No health or medical claims on the public site.** No "builds muscle", "boosts immunity", "for diabetics", etc.
   "High protein" / "Source of protein" copy is only allowed when `lib/fssai.ts` says the recipe qualifies
   (see `docs/COMPLIANCE.md`) AND `products.lab_tested=true`. Until then use "~10 g protein (target, recipe in testing)".
6. **Public survey must work without login.** (The current Claude survey needs a Claude login — that is the main
   reason it has 0 responses.) Use a cookie `respondent_id` + rate limit + honeypot, not accounts.
7. **Personal data:** store waitlist emails/phones only with explicit consent checkbox; never send them to the AI
   APIs; admin export only. Respect India DPDP Act basics: purpose statement, delete-on-request endpoint.
8. Scrapers: honour robots.txt, 1 request / 3 s per host, real UA string with contact email, timeouts 15 s.
   Amazon.in and Flipkart are **manual-only** (they block bots) — show a "check manually" link, never scrape them.
9. Money is stored as `numeric(10,2)` INR; weights in grams `numeric(10,3)`. Never floats for money.
10. Every admin mutation goes through a server action that re-checks admin auth and validates with Zod.

## Conventions

- Server components fetch via functions in `src/lib/queries/*.ts`; client components never import the DB.
- Server actions live next to the route in `actions.ts`, named `verbNoun` (e.g. `approveFinding`).
- Use `revalidatePath` after mutations; dashboards are dynamic (`export const dynamic = 'force-dynamic'`) under `/admin`.
- Dates stored as `timestamptz` UTC; display in `Asia/Kolkata`.
- Currency display: `new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`.
- Accessibility: every chart has a table fallback (`<details>`), every form field a label, focus states visible.
- Mobile first: the public site is mostly visited from Instagram/WhatsApp links on phones.

## Definition of done (every task)

- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all pass.
- New tables have a migration; seed still runs idempotently.
- Acceptance criteria for the feature in `docs/SPEC.md` are checked off in the PR/commit message.
- No secrets in code; new env vars added to `.env.example`.
