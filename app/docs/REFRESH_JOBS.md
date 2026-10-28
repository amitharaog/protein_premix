# Weekly refresh jobs

These replace the Claude scheduled task that refreshes the dashboard, survey and planner every Monday.
Each job is a pure-ish function in `src/jobs/*.ts`, called by:
- a Vercel Cron route `src/app/api/cron/<job>/route.ts`, which needs `Authorization: Bearer ${CRON_SECRET}`
- the admin "Run now" button
- a `pnpm job:<name>` script

Every run writes one `job_runs` row: `running` first, then `ok`, `partial` or `failed`, with a `summary` JSON.

## vercel.json

```json
{
  "crons": [
    { "path": "/api/cron/survey-snapshot", "schedule": "0 3 * * 1" },
    { "path": "/api/cron/prices",          "schedule": "5 3 * * 1" },
    { "path": "/api/cron/news",            "schedule": "20 3 * * 1" },
    { "path": "/api/cron/weekly-report",   "schedule": "45 3 * * 1" }
  ]
}
```
All schedules are UTC, so 03:00 UTC on Monday is 08:30 IST. Set `export const maxDuration = 300` on the prices and news routes.

---

## 1. `survey-snapshot`
1. Load the active `survey_questions` and all `survey_responses`.
2. Run `aggregate()`. Its output is the legacy rows: `{key:"Qn|option", qid, question, option, count, answered, total_responses}`.
3. Insert a `survey_snapshots` row.
4. Summary:
   - `total_responses`
   - `delta_vs_last` (vs the previous snapshot)
   - `avg_likelihood_Q9` (1 dp, `null` if there are no answers)
   - `top_price_band_Q5` (with its count)
   - `top3_flavours_Q6`
   - `top_worry_Q8`
   - `new_comments_Q10` (the count since the last snapshot)

## 2. `prices`
For every ingredient, check the **chosen option plus position 1 (the backup)**, and also any replacement options added in the last 30 days.

```
for option:
  if option.manual_only (amazon.in, flipkart.com) or url_kind != 'product':
      record stock_status unchanged, add to summary.manual_check list, continue
  fetch(url) with UA "MugcakeResearchBot/1.0 (+mailto:OWNER_EMAIL)", 15 s timeout,
       per-host queue 1 req / 3 s, robots.txt respected (cache robots per run)
  parser = PARSERS[hostname]  // bigbasket, healthkart, muscleblaze, 1mg, pharmeasy, truemeds, urbanplatter, indiamart
  result = parser(html) -> { price_inr?, mrp_inr?, pack_g?, in_stock?: boolean, variant_label? }
  HTTP 404/410 or "page not found" -> stock_status = 'dead'
  "out of stock" | "currently unavailable" | "notify me" | no add-to-cart -> 'out_of_stock'
```

Write rules (the same rules the Claude routine follows):
- **Variant mismatch.** If `pack_g` on the page ≠ the option's `pack_g`, the page probably opened a different size. HealthKart does this. Don't change the price. Add a note instead: "link opens N g variant at ₹X".
  - Exception: if the product itself shrank (title still says the same item, only one size is listed), update `pack_g` and the price, and flag it as **shrinkflation** in the summary (e.g. Nescafe Classic 100 g → 90 g).
- **price_type = 'entered'.** Overwrite only if the page shows a clearly different price for the same pack. Keep the old value in `price_history` and list it under `summary.entered_overwritten`.
- **Otherwise**, if the price differs, update `price_inr`/`mrp_inr`/`price_type='sale'` and append the change to `summary.price_changes` as `{ingredient, option, old, new, pct}`.
- **Always** insert a `price_history` row, set `last_checked_at = now()` and set `ingredients.checked_at = today`.
- **Out of stock or dead.** Set `stock_status`. If it's the chosen option or the backup, try to find a replacement:
  1. Search the other supported stores for the same brand + product.
  2. Build the search URL from the `site_search` templates in `src/lib/scrapers/sites.ts`.
  3. Parse the first plausible result whose title shares ≥ 60 % of its tokens with the original.
  4. Insert it as a new option with `replaces_option = <id>` and note "added <date> as replacement".
  5. Never delete an option. Never auto-change `chosen_option_id`; the report suggests switching instead.
- Big moves (> 25 %) are listed first in the report.

Parsers: each is a small file with a fixture test (`__fixtures__/<site>.html`). Prefer JSON-LD `Product`/`Offer` when the page has it, then `og:price:amount`, then CSS selectors. When parsing fails, keep the old values and log `parse_failed`, which makes the run `partial`.

## 3. `news` (AI-assisted, human-approved)
Use the Anthropic Messages API with the server-side **web search tool**. Put the model id in `ANTHROPIC_MODEL`, and check the current tool version string in the Anthropic docs.

Prompt template (`src/jobs/news.prompt.ts`):
```
You are a market analyst. Search news from the last 7 days (today = {{date}}) for:
1) new Indian protein mug cake / protein dessert / protein bake-mix launches;
2) price changes for these competitors: {{competitor list brand + product + current price + url}};
3) FSSAI rules on protein claims, labelling or front-of-pack warnings;
4) quick-commerce protein category statistics in India.
Return ONLY JSON: {"findings":[{"section","item","detail","source_url","published_at"}],
"competitor_updates":[{"competitor_id","price_text","price_inr","source_url","evidence"}]}
Rules: include an item only if you opened the source and it was published within the last 7 days,
every item needs source_url, never estimate or invent numbers, detail ≤ 400 chars. Empty arrays are fine.
```

Then:
1. Validate the result with Zod.
2. Drop items with no `source_url`, and items whose URL is already in `market_findings`.
3. Insert the rest with `status = 'pending'`, `found_by = 'news_job'` and `id = 'nw-YYYYMMDD-<n>'`.
4. Competitor updates also go into a pending list (`competitor_price_history` with a `pending` flag, or a `pending_updates` JSON in `job_runs.summary`). The admin applies them with one click.

Send **no** personal data (waitlist or responses) to the API.

## 4. `weekly-report`
This job gathers the latest summaries of the other three jobs, plus:
- purchase orders with `status = 'ordered'` and `ordered_at` older than 10 days (possibly late)
- pending finding counts

It sends one email via Resend to `REPORT_EMAIL`. The subject leads with the most important fact, for example: "Mug cake weekly: 12 survey replies (+9), whey 1 kg up 64 %, 2 items out of stock".

The body has these sections:
1. survey count and change vs last week, then the signals: price band, average likelihood to buy, top flavours
2. new market findings awaiting approval (with links)
3. ingredient price changes (item, old → new ₹)
4. out-of-stock items and the replacements added
5. manual checks needed (Amazon/Flipkart list)
6. late orders
7. what was updated

If nothing changed, send a one-line email, or set `REPORT_SKIP_IF_QUIET=true` to send nothing.

## Failure handling
- Each job catches per-item errors. One bad page must not fail the run.
- If a whole job throws, mark it `failed` and still send the weekly report, with a red line saying which job failed and the error message.
- The idempotency key is `job + ISO week`, so a second cron fire in the same week is a no-op unless it's forced from admin.
