# SPEC — Protein Mug Cake: launch site + research app

Working brand name: **"Mugwell"** is a placeholder. Every brand string comes from `src/config/brand.ts`, so a rename is a one-line change.
Audience: urban Indian 18–35s. Many are vegetarian. They are protein-curious, order on quick commerce, and visit from Instagram or WhatsApp links on phones.

---

## 0. Build phases (do them in order; each ends deployable)

| Phase | Scope | Exit criteria |
|---|---|---|
| **1. Foundation** | Repo, Neon + Drizzle schema, seed, Auth.js admin gate, layout, design tokens, CI | `pnpm db:seed` loads all `/seed` files; `/admin` blocks non-admins; Vercel preview deploys |
| **2. Public survey + waitlist** | `/`, `/survey`, `/waitlist`, `/flavours`, `/faq`, legal pages | Survey works logged-out on mobile; results appear in admin within 1 s; waitlist double-opt-in email sends |
| **3. Research app** | Admin dashboard, survey results, market, competitors, formulation lab, ingredient tracker, orders | All current Claude-artifact data is visible and editable; recipe cost and protein compute live |
| **4. Weekly jobs** | Price check, news scan (pending queue), survey snapshot, weekly email | Vercel Cron runs Monday 08:30 IST; job_runs shows ok; email arrives |
| **5. Shop (flagged off)** | Product pages, cart, Razorpay checkout, order admin | Only enabled when `FEATURE_SHOP=true` **and** products have `lab_tested=true` + `fssai_licence` |

---

## 1. Public launch site

### 1.1 `/` Landing page
Sections, in order:
1. **Hero**: the headline is a working idea, e.g. "Warm protein cake in a mug. 1 minute." Under it: "~50 g sachet · ~10 g protein (target) · Eggless · Gluten-free", then two CTAs: **Take the 2-min survey** (primary) and **Join the waitlist**.
2. **How it works**: 3 steps (Tear → Mix with 4 tbsp milk or water → Bake). An appliance switcher (tabs: Microwave 1 min / Air fryer 10 min at 160 °C / OTG / Pressure cooker) changes the step-3 text. Times come from the `recipes` row marked "hero" (`config.heroRecipeId`). Show "times being tested" until that recipe's `status = 'approved'`.
3. **Flavours**: cards from `recipes` with status `testing|approved`. Each card has a **vote** button that posts to `/api/flavour-vote`, stored as a waitlist flavour or anonymously in survey Q6. Show the live vote count once there are 20 or more votes in total.
4. **Why** (honest positioning): "a better dessert swap", not a supplement. There are no health claims (see COMPLIANCE).
5. **FAQ** (accordion): eggless? gluten-free? which protein? does it work without a microwave? price? when? Answers are kept in `src/content/faq.ts`.
6. **Footer**: waitlist form (email or WhatsApp number), Instagram link, legal links, and the FSSAI licence number once it exists.

Non-functional: LCP < 2.0 s on 4G Moto G, the page works without JS (forms are server actions), OG image per page, `hreflang en-IN`.

### 1.2 `/survey`
- Questions come from the `survey_questions` table (seeded from `seed/survey_questions.json`, 10 questions, the same wording as the current Claude survey).
- **No login.** Set an httpOnly cookie `rid` = random UUID on first visit. Submitting upserts `survey_responses` on `respondent_id`, so the respondent can edit later.
- Validation (Zod, server side):
  - Single answers must be one of the options.
  - Multi answers are a subset of the options, respecting `max_select` (Q6 ≤ 3, Q8 ≤ 2).
  - Q5 and Q9 are required.
  - Q10 is at most 1000 chars.
- Anti-spam: a hidden honeypot field, at most 5 submits per `ip_hash` per hour, and reject submits faster than 8 s after page load.
- Capture `utm_*` from the URL into `utm` (for example, which Reddit or Instagram post the respondent came from).
- One question per screen on mobile (progress bar, back button). On desktop, one long form. Keyboard and screen-reader accessible.
- Thank-you screen: "Want first dibs? Join the waitlist", with the email/phone inline. It links the response to the waitlist entry by `respondent_id`.
- Share buttons (WhatsApp, copy link) with a `?utm_source=share&ref=<code>` link.

### 1.3 `/waitlist`
- Fields:
  - email or WhatsApp phone (at least one)
  - name (optional)
  - city + pincode (optional)
  - favourite flavours (multi)
  - appliance(s) owned
  - consent checkbox (required, unticked by default)
  - WhatsApp opt-in (separate checkbox)
- Email gets double opt-in via Resend: the confirmation link sets `confirmed_at`.
- Referral: each signup gets a `referral_code`. `/w/<code>` shows "Your position" plus a share link, with position = rank by `created_at` minus 3 × referrals (show it, but don't promise rewards yet).
- `/privacy/delete` lets someone request deletion by email. A magic link confirms it, then PII is scrubbed and `deleted_at` is set.

### 1.4 `/flavours/[slug]`
Shows one flavour with an ingredient list. Nutrition is shown **only** once the recipe status is `approved`. The vote button is here too.

### 1.5 Legal
`/privacy` and `/terms` come from templates in `src/content/legal/*.md`. They mark "To be reviewed by a lawyer" in an HTML comment.

---

## 2. Research app (`/admin`, admin only)

The layout has a left nav on desktop and a bottom tab bar on mobile. Every page shows a "Last refreshed" stamp read from `job_runs`.

### 2.1 `/admin` Overview (replaces the Claude dashboard)
- **KPI row**:
  - survey responses (with Δ vs last snapshot)
  - waitlist signups (Δ 7 d)
  - average likelihood to buy (mean of Q9, 1 decimal)
  - top price band (mode of Q5)
  - readiness score (from `verdict_items` kind = score)
- **Survey signals**:
  - bar chart of Q5 price bands
  - bar chart of Q6 flavours
  - Q1 appliance access
  - Q8 worries
  - Q10 latest 10 comments
- **Market**: `kpis` cards. Each has a source link and date.
- **Verdict**: score and reasoning, plus risk and opportunity lists.
- **Action items** (computed):
  - pending findings count
  - out-of-stock chosen ingredients
  - purchase orders `ordered` > 10 days ago ("possibly late")
  - ingredients never checked or checked more than 14 days ago
- Every chart has a `<details>` data table under it. Empty states say "No responses yet. Share the survey: <link> [Copy]".

### 2.2 `/admin/survey`
- Per-question results: count per option, answered per question, % of answered.
- Filters: date range, source, `utm_source`.
- Cross-tab picker: pick two questions and get a heat table. Example: Q5 price × Q1 appliance.
- Response list with full answers. Export CSV.
- **Import**:
  - (a) Upload a Google Form CSV with a column mapper UI. Map each column to a Qn and each answer to an option; unmapped answers go to "Other".
  - (b) Paste JSON from the Claude survey artifact export (`{answers, at}` docs).
  - Imports are marked `source = 'google_form' | 'claude_artifact'`.
- The aggregation lives in `lib/survey/aggregate.ts` as a pure function, with unit tests. It returns the exact shape `{key:"Qn|option", qid, question, option, count, answered, total_responses}` so the snapshot format matches the old dashboard.

### 2.3 `/admin/market`
- Tabs: KPIs · Market sizes · Findings · Quotes · Outreach posts.
- **Findings** has a status filter. The **Pending** tab has Approve / Edit / Reject buttons, each with a source link preview. Only approved rows show on the Overview.
- Admins can add a finding manually (source URL required unless the section is "Voice of customer").
- **Outreach posts**:
  - copy-to-clipboard
  - mark as posted (with the post URL)
  - a UTM link generator per post, so survey responses can be attributed to it

### 2.4 `/admin/competitors`
- A table with sort and filter: India vs global, format, and protein per serve.
- Our product (`is_ours = true`) is highlighted.
- Scatter chart: price per serve (INR) vs protein g, our target shown as a ring.
- Per-row price history sparkline from `competitor_price_history`.
- Add/edit form. `source_url` is required to save a price.

### 2.5 `/admin/lab` Formulation lab (most important admin feature)
- **Recipe list**:
  - status chips (idea/testing/approved/retired) and type Global/Indian
  - computed protein g, kcal, cost per sachet
  - FSSAI claim badge ("High protein ✓", "Source of protein ✓" or "No claim")
- **Recipe editor** `/admin/lab/[id]`:
  - Ingredient rows: grams as an editable number with a ±0.1/±1 stepper.
  - Live totals: total g (warn if not within 45–60 g), protein g, kcal, carbs, sugar, fat, fibre, protein per 100 g, protein per 100 kcal, kcal from protein %.
  - Cost per sachet uses each ingredient's chosen option: `grams × price_inr / pack_g`. Show "—" for any ingredient with an unknown price, and list which are missing.
  - Cost at 3 scales: retail packs (today), and bulk ×0.6 and ×0.4 multipliers stored in `config.bulkFactors` (editable, clearly labelled as assumptions).
  - FSSAI panel from `lib/fssai.ts`, with thresholds shown.
  - Allergen roll-up (milk, tree nut, …) and "Vegan?" / "Eggless ✓" / "Gluten-free ingredients ✓ (needs lab test)".
  - Appliance instructions fields.
  - "Duplicate recipe" and "Compare with…": a side-by-side of 2–3 recipes.
- **Test bakes**:
  - Log bakes per recipe × appliance: taste, texture, moistness 1–5, aftertaste, notes, and a photo (Vercel Blob).
  - Chart of average scores per appliance.
  - A recipe can move to `approved` only when it has at least 3 bakes on each of microwave and air fryer averaging at least 4.
- **Reference**: `protein_sources` and `formulation_notes` tables (read-only cards + edit).
- Nutrition per ingredient: `ingredients.protein_per_100g` etc. These are not in the seed. Show a "Nutrition missing" list with an inline editor. Until they're filled, protein uses `recipes.protein_g` from the seed (marked "estimate").

### 2.6 `/admin/ingredients` Ingredient tracker (replaces the planner's catalog)
- One row per ingredient:
  - name, chosen option (title, site, pack, price, ₹/100 g)
  - stock badge, backup option
  - last checked
  - recipes that use it
- Expand a row to see all options with price history. Admins can:
  - set the chosen option
  - add an option
  - mark one out of stock
  - type a price (sets `price_type = 'entered'`)
- `manual_only` options (Amazon.in / Flipkart) show an "Open & check" button and a quick price input.
- **Shopping list builder**: pick recipes × number of test sachets. The builder:
  1. totals the grams needed per ingredient
  2. rounds up to whole packs of the chosen option
  3. groups the packs by site
  4. estimates the cost
  5. "Create purchase order" turns the list into draft POs, one per site
- Price-change feed (last 30 days) from `price_history`.

### 2.7 `/admin/orders`
- POs with status flow planned → ordered → received (or cancelled), expected date, and items.
- A late badge when `ordered` is more than 10 days old with no `received_at`.
- Receiving a PO can update the stock level of that ingredient (optional `on_hand_g` field — add it if you build this).

### 2.8 `/admin/jobs`
- A table of `job_runs`, with "Run now" buttons that call the same functions as cron (admin auth, not CRON_SECRET).
- It shows the summary JSON prettily and the last error.

### 2.9 `/admin/waitlist`
Count, confirmed %, chart of signups per day, top cities, flavour picks, referrers, and CSV export (admin only).

---

## 3. Shared calculation modules (all pure, all unit-tested)

| Module | Function | Notes |
|---|---|---|
| `lib/calc/nutrition.ts` | `recipeNutrition(items, ingredients)` | Sum over grams × per-100 g / 100. Returns `{ total_g, protein_g, kcal, carbs_g, sugar_g, fat_g, fibre_g, missing: string[] }` |
| `lib/calc/cost.ts` | `recipeCost(items, options, factor = 1)` | Uses the chosen option. Returns `{ cost_inr, missing: string[] }`. Rounded to 2 dp at the end only |
| `lib/fssai.ts` | `proteinClaim(n)` | See COMPLIANCE.md for the thresholds. Returns `'high' \| 'source' \| 'none'` plus a reason string |
| `lib/survey/aggregate.ts` | `aggregate(questions, responses)` | Exact legacy shape. Also `avgLikelihood`, `modeOf('Q5')`, `crossTab(qa, qb)` |
| `lib/shopping.ts` | `shoppingList(recipes × qty, catalog)` | Packs = ceil(need_g / pack_g) |

Fixture tests must include:
- the **Classic Chocolate Fudge** seed recipe: 58 g total, cost with the current catalog prices
- a survey fixture of 3 responses with known counts
- edge cases: multi answers with an unknown option (ignored and counted in `unknown`), and an empty array (not counted as answered)

---

## 4. Seeding (`scripts/seed.ts`)
- Reads every `/seed/*.json` and validates it with Zod (schemas in `src/db/seed-schemas.ts`), then does an idempotent upsert on the natural keys.
- Mapping:
  - `ingredients_catalog.json`: `ingredients` + `ingredient_options`. `chosen` is the index into `options`, so set `chosen_option_id` to that option's id. Set `manual_only = true` when the site is Amazon.in or Flipkart. Parse stock hints such as "OUT OF STOCK" in a note into `stock_status`.
  - `recipes.json`: `recipes` + `recipe_items` (`items[].id` = ingredient id). Keep `protein_g` / `total_g` as `notes` "seed estimate".
  - `recipe_estimates.json`: a reference table, or just store `kcal`/`cost` estimates in recipe `notes`.
  - `market_notes.json`: `market_findings` (status approved, found_by seed).
  - `competitors.json`: `competitors`. `id = 'you'` sets `is_ours = true`. Parse `price` to `price_inr` only when it's a single plain number.
  - `kpis`, `market_sizes`, `quotes`, `outreach_posts`, `protein_sources`, `formulation_notes`, `verdict` go to their tables 1:1.
  - `survey_questions.json`: `survey_questions`.
- It prints a summary of the counts per table.

## 5. Design
See `docs/DESIGN.md`. Summary: a warm bakery palette (cocoa, cream, kesar-orange accent). Fraunces for display, Figtree for body. There's a dark mode. Admin uses the same tokens but is denser.

## 6. Analytics & SEO
- Vercel Analytics plus server-side events in a table you add if needed (`survey_started`, `survey_completed`, `waitlist_joined`, `flavour_voted`), with the UTM.
- Sitemap and robots; admin is `noindex`.
- `generateMetadata` per page; JSON-LD `Product` only after launch.
