# Protein bake-at-home premix: demand and economics research

## What this project is
A research workspace for a single-serve, high-protein baking premix (brownie, cake, cookie) for the Indian market, starting in Bengaluru. Buyers add their own liquid and bake at home. The product wedge is protein with real-dessert texture. Do not widen the wedge to "healthy" or "sugar-free" in any output.

## Order of work (hard rule)
1. **Demand phase** (`/demand`): passive listening, keyword demand, post drafts, reply analysis.
2. **Gate** (`/gate`): scores the demand evidence against `data/gate/criteria.json` and writes `data/gate/gate.json`.
3. **Economics phase** (`/economics`): pricing, channels, CAC. Runs only when `data/gate/gate.json` has `"status": "pass"`, or the user explicitly types "override gate".

Never start economics work because demand "seems likely". The gate exists so we do not model CAC for a product nobody wants.

## Current hypotheses (to test, not facts)
- Prices: ₹99 single, ₹249 three-pack, ₹549 seven-serve box
- Unit cost: about ₹45 per serving (ingredients + cup + label, before platform fees)
- Vegetarian (no egg powder in the pack)
- Early channels: weekend flea markets, Instagram with WhatsApp ordering
- Deferred: quick commerce, paid social, B2B (cafés, cloud kitchens, home bakers) until repeat data exists

Agents may challenge any of these with evidence. They may not silently replace them.

## Off limits
- Product formulation, ingredients, ratios, baking method. That is the founder's domain. Do not suggest changes. One exception: the `recipe-builder` agent, which runs only when the founder calls `/recipe`. It writes only to `data/formulation/suggestions/`, never edits `data/formulation/seed/`, and its output never goes into drafts or anything public.
- Posting, commenting, DMing or emailing anywhere on the user's behalf. Agents draft; the user posts.
- Fake accounts, personas or "a friend of mine" framing in drafts. If asked who is behind a post, the honest answer is someone exploring making this product.
- Fabricated customers, quotes, numbers or survey results. If data is missing, write `MISSING` and say what would fill it.

## Evidence grading (tag every finding)
| Grade | Meaning | Example |
|---|---|---|
| E1 | Behaviour | Paid, preordered, joined a waitlist, asked where to buy, or measurable search activity |
| E2 | Unprompted need in the wild | Reddit thread complaining protein brownies come out rubbery |
| E3 | Prompted interest | Replies to our own post saying "I'd try this" |
| E4 | Opinion or projection | Market reports, our assumptions, agent estimates |

Every row in every data file carries: source URL (or `manual`), date captured (YYYY-MM-DD), grade.
Market-size reports are E4 regardless of how official they look. Treat company-released "deficiency" stats as marketing unless a primary study is cited.

## Disclosure rules for anything public
Drafts must not contain: brand name, prices, unit cost, the single-serve cup format, which appliances it bakes in, or anything about how texture is solved. Ask about the problem, not the product. The one exception is a waitlist or preorder page, which the user approves line by line before it goes live.

## File layout
```
.claude/agents/     nine subagents (demand phase: 5, economics: 3, founder kitchen: recipe-builder)
.claude/commands/   /demand, /gate, /economics, /status, /recipe
data/
  signals/          passive listening (signals.csv)
  keywords/         autocomplete + trends output
  posts/            drafts.md, posted.csv (user fills URLs after posting)
  responses/        pulled replies, manual/ pastes, coded.csv
  gate/             criteria.json, decision.md, gate.json
  economics/        competitors.csv, survey/, channels.csv, cac_inputs.json, cac outputs
  formulation/      seed/ (read-only kit export, 28 Oct 2026), nutrition.csv, pantry.csv, suggestions/
reports/            human-readable summaries, numbered by step
app/                Next.js launch site + research app from the build kit (its own CLAUDE.md applies inside app/)
scripts/            keywords.py, reddit_pull.py, van_westendorp.py, cac_model.py, recipe_calc.py, subreddits.txt
```

## Writing style for all outputs
Direct, short, no em dashes (use commas, semicolons or colons). End every report with one clear recommendation and the single biggest risk to it.
