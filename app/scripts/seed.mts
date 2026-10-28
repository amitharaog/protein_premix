// Loads /seed/*.json into the database with idempotent upserts on natural keys (SPEC §4).
// Run: pnpm db:seed   (ENV_FILE=.env.test pnpm db:seed for the local test database)
import { config } from "dotenv";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import * as s from "../src/db/schema.ts";
import * as z from "../src/db/seed-schemas.ts";

config({ path: process.env.ENV_FILE ?? ".env.local" });
const { db } = await import("../src/db/index.ts");

const read = <T,>(file: string, schema: { parse: (v: unknown) => T }): T =>
  schema.parse(JSON.parse(readFileSync(new URL(`../seed/${file}`, import.meta.url), "utf8")));

/** Stable UUID from text, so tables keyed by uuid still upsert idempotently. */
const stableId = (...parts: string[]) => {
  const h = createHash("sha1").update(parts.join("|")).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-5${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const num = (v: number | null | undefined) => (v == null ? null : String(v));
/** Only a single plain number counts as a price (SPEC §4). */
const plainPrice = (text: string | null | undefined) =>
  text && /^\s*₹?\s*\d+(\.\d+)?\s*$/.test(text) ? text.replace(/[^\d.]/g, "") : null;
const stockFrom = (note: string | null | undefined) =>
  /out of stock|unavailable/i.test(note ?? "") ? ("out_of_stock" as const)
    : /dead link|404|page not found/i.test(note ?? "") ? ("dead" as const) : ("unknown" as const);
const excluded = (cols: string[]) => Object.fromEntries(cols.map((c) => [c, sql.raw(`excluded."${c}"`)]));

const counts: Record<string, number> = {};
const tally = (t: string, n: number) => (counts[t] = (counts[t] ?? 0) + n);

// ── survey questions
const questions = read("survey_questions.json", z.surveyQuestionsFile);
for (const [i, q] of questions.entries()) {
  await db.insert(s.surveyQuestions).values({
    id: q.id, position: i + 1, question: q.question, type: q.type, options: q.options,
    hint: q.hint ?? null, maxSelect: q.max ?? null, required: q.required, maxLength: q.max_length ?? null,
  }).onConflictDoUpdate({
    target: s.surveyQuestions.id,
    set: excluded(["position", "question", "type", "options", "hint", "max_select", "required", "max_length"]),
  });
}
tally("survey_questions", questions.length);

// ── ingredients + options
const catalog = read("ingredients_catalog.json", z.catalogFile);
for (const ing of catalog) {
  await db.insert(s.ingredients).values({ id: ing.id, name: ing.name, checkedAt: ing.checked_at ?? null })
    .onConflictDoUpdate({ target: s.ingredients.id, set: excluded(["name", "checked_at"]) });
  let chosenId: string | null = null;
  for (const [pos, o] of ing.options.entries()) {
    const site = o.site ?? "";
    const [row] = await db.insert(s.ingredientOptions).values({
      ingredientId: ing.id, position: pos, title: o.title, brand: o.brand ?? null, packG: num(o.pack_g),
      priceInr: num(o.price_inr), priceType: o.price_type, site: o.site ?? null, url: o.url ?? null,
      urlKind: o.url_kind ?? "product", manualOnly: /amazon\.in|flipkart/i.test(site),
      stockStatus: stockFrom(o.note), note: o.note ?? null,
      lastCheckedAt: ing.checked_at ? new Date(`${ing.checked_at}T00:00:00Z`) : null,
    }).onConflictDoUpdate({
      target: [s.ingredientOptions.ingredientId, s.ingredientOptions.position],
      set: excluded(["title", "brand", "pack_g", "price_inr", "price_type", "site", "url", "url_kind", "manual_only", "stock_status", "note", "last_checked_at"]),
    }).returning({ id: s.ingredientOptions.id });
    if (pos === ing.chosen) chosenId = row.id;
    tally("ingredient_options", 1);
  }
  await db.update(s.ingredients).set({ chosenOptionId: chosenId }).where(sql`${s.ingredients.id} = ${ing.id}`);
}
tally("ingredients", catalog.length);

// ── recipes + items (duplicate ingredient lines in a recipe are summed: the PK is recipe × ingredient)
const recipes = read("recipes.json", z.recipesFile);
const estimates = new Map(read("recipe_estimates.json", z.recipeEstimatesFile).map((e) => [e.name, e]));
for (const r of recipes) {
  const e = estimates.get(r.name);
  const notes = [
    `seed estimate: total ${r.total_g} g, protein ${r.protein_g} g (not lab values)`,
    e && `estimate: ${e.kcal} kcal, carbs ${e.carbs_g} g, fat ${e.fat_g} g, ingredient cost ₹${e.cost_inr}`,
    e?.liquid && `liquid: ${e.liquid}`, e?.microwave && `microwave: ${e.microwave}`,
    e?.air_fryer && `air fryer: ${e.air_fryer}`, e?.otg && `OTG: ${e.otg}`,
    e?.pressure_cooker && `pressure cooker: ${e.pressure_cooker}`, e?.notes,
  ].filter(Boolean).join("\n");
  await db.insert(s.recipes).values({ id: r.slug, name: r.name, type: r.type, position: r.order, notes })
    .onConflictDoUpdate({ target: s.recipes.id, set: excluded(["name", "type", "position", "notes"]) });
  const merged = new Map<string, number>();
  for (const it of r.items) merged.set(it.id, (merged.get(it.id) ?? 0) + it.grams);
  for (const [pos, [ingredientId, grams]] of [...merged].entries()) {
    await db.insert(s.recipeItems).values({ recipeId: r.slug, ingredientId, grams: String(+grams.toFixed(3)), position: pos })
      .onConflictDoUpdate({ target: [s.recipeItems.recipeId, s.recipeItems.ingredientId], set: excluded(["grams", "position"]) });
    tally("recipe_items", 1);
  }
}
tally("recipes", recipes.length);

// ── market research
const notes = read("market_notes.json", z.marketNotesFile);
for (const n of notes) {
  await db.insert(s.marketFindings).values({
    id: n.id, section: n.section, item: n.item, detail: n.detail, sourceUrl: n.source_url ?? null, status: "approved", foundBy: "seed",
  }).onConflictDoUpdate({ target: s.marketFindings.id, set: excluded(["section", "item", "detail", "source_url"]) });
}
tally("market_findings", notes.length);

const comps = read("competitors.json", z.competitorsFile);
for (const c of comps) {
  await db.insert(s.competitors).values({
    id: c.id, brand: c.brand, product: c.product, proteinG: num(c.protein_g), proteinNote: c.protein_note ?? null,
    pack: c.pack ?? null, priceText: c.price ?? null, priceInr: plainPrice(c.price), pricePerServeInr: num(c.price_per_serve_inr),
    format: c.format ?? null, country: c.country ?? null, sourceUrl: c.source_url ?? null, isOurs: c.id === "you",
  }).onConflictDoUpdate({
    target: s.competitors.id,
    set: excluded(["brand", "product", "protein_g", "protein_note", "pack", "price_text", "price_inr", "price_per_serve_inr", "format", "country", "source_url", "is_ours"]),
  });
}
tally("competitors", comps.length);

const kpis = read("kpis.json", z.kpisFile);
for (const [i, k] of kpis.entries()) {
  await db.insert(s.kpis).values({ id: k.id, label: k.label, value: k.value, note: k.note ?? null, sourceUrl: k.source_url, dateLabel: k.date ?? null, position: i })
    .onConflictDoUpdate({ target: s.kpis.id, set: excluded(["label", "value", "note", "source_url", "date_label", "position"]) });
}
tally("kpis", kpis.length);

const sizes = read("market_sizes.json", z.marketSizesFile);
for (const m of sizes) {
  await db.insert(s.marketSizes).values({ id: stableId("market_size", m.segment, m.source_url), segment: m.segment, size2025: m.size_2025 ?? null, forecast: m.forecast ?? null, cagr: m.cagr ?? null, sourceUrl: m.source_url })
    .onConflictDoUpdate({ target: s.marketSizes.id, set: excluded(["size_2025", "forecast", "cagr"]) });
}
tally("market_sizes", sizes.length);

const quotes = read("quotes.json", z.quotesFile);
for (const q of quotes) {
  await db.insert(s.quotes).values({ id: q.id, quote: q.quote, paraphrase: q.paraphrase, source: q.source ?? null, url: q.url ?? null, sentiment: q.sentiment ?? null, theme: q.theme ?? null })
    .onConflictDoUpdate({ target: s.quotes.id, set: excluded(["quote", "paraphrase", "source", "url", "sentiment", "theme"]) });
}
tally("quotes", quotes.length);

const posts = read("outreach_posts.json", z.outreachPostsFile);
for (const p of posts) {
  await db.insert(s.outreachPosts).values({ id: stableId("post", p.platform, p.title ?? ""), platform: p.platform, title: p.title ?? null, body: p.body })
    .onConflictDoUpdate({ target: s.outreachPosts.id, set: excluded(["body"]) });
}
tally("outreach_posts", posts.length);

const sources = read("protein_sources.json", z.proteinSourcesFile);
for (const p of sources) {
  await db.insert(s.proteinSources).values({ source: p.source, proteinPct: num(p.protein_pct), baking: p.baking ?? null, taste: p.taste ?? null, priceInrPerKg: p.price_inr_per_kg ?? null, diet: p.diet ?? null, notes: p.notes ?? null })
    .onConflictDoUpdate({ target: s.proteinSources.source, set: excluded(["protein_pct", "baking", "taste", "price_inr_per_kg", "diet", "notes"]) });
}
tally("protein_sources", sources.length);

const fnotes = read("formulation_notes.json", z.formulationNotesFile);
for (const f of fnotes) {
  await db.insert(s.formulationNotes).values({ id: f.id, section: f.section, item: f.item, detail: f.detail, sourceUrl: f.source_url ?? null })
    .onConflictDoUpdate({ target: s.formulationNotes.id, set: excluded(["section", "item", "detail", "source_url"]) });
}
tally("formulation_notes", fnotes.length);

const verdict = read("verdict.json", z.verdictFile);
for (const [i, v] of verdict.entries()) {
  await db.insert(s.verdictItems).values({ id: v.id, kind: v.kind, score: num(v.score), text: v.text, position: i })
    .onConflictDoUpdate({ target: s.verdictItems.id, set: excluded(["kind", "score", "text", "position"]) });
}
tally("verdict_items", verdict.length);

console.table(counts);
process.exit(0);
