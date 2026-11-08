# Seed data (exported 28 Oct 2026 from the Claude artifacts)

| File | Rows | From | Goes to table(s) |
|---|---|---|---|
| `survey_questions.json` | 13 | survey page | `survey_questions` |
| `ingredients_catalog.json` | 42 | planner `catalog` (prices checked 26 Oct 2026) | `ingredients`, `ingredient_options` |
| `recipes.json` | 17 | planner `recipes` (items = ingredient id + grams) | `recipes`, `recipe_items` |
| `recipe_estimates.json` | 10 | dashboard `recipes` (kcal, macros, cost estimates) | reference / `recipes.notes` |
| `competitors.json` | 19 | dashboard | `competitors` |
| `market_notes.json` | 42 | dashboard `market_notes` | `market_findings` |
| `kpis.json` | 11 | dashboard | `kpis` |
| `market_sizes.json` | 10 | dashboard | `market_sizes` |
| `quotes.json` | 25 | dashboard | `quotes` |
| `outreach_posts.json` | 5 | dashboard `posts` | `outreach_posts` |
| `protein_sources.json` | 14 | dashboard | `protein_sources` |
| `formulation_notes.json` | 25 | dashboard | `formulation_notes` |
| `verdict.json` | 18 | dashboard | `verdict_items` |

The survey had **0 responses** at export time, so there is no response file.

Shapes, briefly:
- **Catalog doc**: `{id, name, chosen (index into options), checked_at, options:[{title, brand, pack_g, price_inr, price_type, site, url, url_kind, note}]}`.
  - `price_type` is one of `entered | sale | mrp | unknown`.
  - Stock hints from the 26 Oct check are inside `note`, e.g. "OUT OF STOCK / unavailable on PharmEasy". Parse them into `stock_status`.
- **Recipe doc**: `{slug, name, type: Global|Indian, order, total_g, protein_g, items:[{id, label, grams}]}`.
  - `protein_g` and `total_g` are estimates from the recipe agent, not lab values.
- **Competitors**: `price` is free text (e.g. `"214 / 428 (new flavours 225/450)"`). Only parse it to a number when it's a single plain number.

**Edited 28 Oct 2026 at the founder's request:** `survey_questions.json` Q5 now says 25–32 g protein and made with gluten-free ingredients (was about 10 g), and the old ₹100+ band is split into ₹100-150 and ₹150+. No responses existed, so nothing became incomparable. Later the same day the founder replaced the gram target with "protein-based" in public copy. On 29 Oct 2026 the founder asked to drop "made with gluten-free ingredients" from the survey, so Q5 now reads "What would you pay for one sachet (protein-based)?" (1 response existed, the founder's own test).

**Edited 28 Oct 2026 at the founder's request:** the survey is cut to 7 questions. The array order is the display order (Q3, Q2, Q1, Q8, Q5, Q9, Q10). Q4 (eggless), Q6 (flavours) and Q7 (where to buy) stay in the file with `active: false`, so they can be switched back on.

**Edited 8 Nov 2026 at the founder's request (survey v2):** the survey asks more specific questions and no longer describes the product; it runs as the "Ministry of Cravings" dessert census. The array order is the display order: Q11 (new: the 10 pm dilemma, bake in a mug and indulge or buy and feel guilty), Q3, Q2, Q12 (new: how much protein a dessert needs, with everyday reference amounts), Q13 (new: gluten), Q4 (eggs, switched back on), Q1, Q8, Q9, Q5, Q10. Q6 and Q7 stay off. Answer options of the old questions are unchanged, so counts stay comparable; question wording changed: Q9 now describes the idea in one line (before, the intro screen described the product), and Q5 asks for "one serving" instead of "one sachet (protein-based)". Responses before 8 Nov 2026 have no Q11, Q12, Q13 or Q4 answers; compare Q9 and Q5 across the change with that in mind.
