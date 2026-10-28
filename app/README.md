# Launch site + research app

The Next.js app built from the build kit. Rules: `CLAUDE.md`. Features: `docs/SPEC.md`. Setup and phase prompts: `START_HERE.md`.

## Live

https://mugcake.vercel.app/survey (Vercel project `mugcake`, team amitharaog's projects, functions in Singapore `sin1`). Env vars are set in Vercel; Google sign-in keys are not yet.

## Status

| Phase | State |
|---|---|
| 1. Foundation | Done: schema + migration, seed (all 14 files, idempotent), Auth.js Google gate on `/admin`, design tokens, Vitest, Playwright, CI |
| 2. Public site | `/survey` done (interactive, one question per screen, no login), plus an inline waitlist with consent. Still to do: landing page, `/waitlist` with double opt-in, flavours, FAQ, legal pages |
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
- `src/content/survey.ts`: the mug's jokes, emoji, results and waitlist text
- the `survey_questions` table: question wording, kept identical to the old survey so the results stay comparable

Q5 mentions "one sachet (about 10 g protein)". That reveals the format, which the disclosure rules normally keep out of public drafts. Decide whether to keep it.
