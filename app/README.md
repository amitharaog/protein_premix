# Launch site + research app

The Next.js app built from the build kit. Rules: `CLAUDE.md`. Features: `docs/SPEC.md`. Setup and phase prompts: `START_HERE.md`.

## Live

https://ministryofcravings.vercel.app/survey (Vercel project `mugcake`, team amitharaog's projects, functions in Singapore `sin1`). The old https://mugcake.vercel.app forwards its survey pages there (`src/middleware.ts`); its `/api` and `/board` keep working. Env vars are set in Vercel; Google sign-in keys are not yet.

## Status

| Phase | State |
|---|---|
| 1. Foundation | Done: schema + migration, seed (all 14 files, idempotent), Auth.js Google gate on `/admin`, design tokens, Vitest, Playwright, CI |
| 2. Public site | `/survey` done (7 questions, one per screen, no login), plus an inline waitlist with consent. Results at `/admin` (bars per question, comments, sources, every response, CSV download). Still to do: landing page, `/waitlist` with double opt-in, flavours, FAQ, legal pages |
| 3 to 5 | Not started |

## Database

Neon project `mugcake` (AWS Singapore), database `mugcake`. All tables have been created there. Connection strings live in `.env.local`, which is never committed.

## Run locally

```bash
pnpm install
pnpm db:migrate && pnpm db:seed   # against DATABASE_URL in .env.local
pnpm dev                          # http://localhost:3000/survey
```

To use a local Postgres instead, point `DATABASE_URL` at `postgresql://...@localhost...`. The app switches to the node-postgres driver for localhost URLs. Tests use `.env.test`.

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm e2e
```

## Before the survey goes public

The repo's research rules say a public page must be approved line by line before it goes live. Copy lives in two places:
- `src/content/survey.ts`: the Minister of Cravings' jokes, emoji, reactions, results and waitlist text
- the `survey_questions` table (seeded from `seed/survey_questions.json`): question wording and answer options

Since 8 Nov 2026 (survey v2) the survey runs as the "Ministry of Cravings" dessert census and never names or describes the product; Q5 asks for "one serving". `src/content/content.test.ts` fails if the copy around the questions mentions the product, gluten or a gram figure. A question added in the database before its copy exists still shows, with a plain host line.

Since 8 Nov 2026 the survey is not anonymous: its last step requires a name and a WhatsApp number or email, with consent (`src/lib/survey/contact.ts`). They are saved in `survey_contacts` in the same statement as the answers, and only the board (`/board?key=…`, "Names and contacts") and its Excel download (Contacts tab) show them. The last screen lets the person delete them again.
