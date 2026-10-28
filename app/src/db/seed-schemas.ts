// Zod shapes of /seed/*.json (exported 28 Oct 2026). The seed script validates every file before writing.
import { z } from "zod";

const str = z.string().nullish();
const n = z.number().nullish();

export const surveyQuestionsFile = z.array(z.object({
  id: z.string().regex(/^Q\d+$/),
  question: z.string(),
  options: z.array(z.string()),
  type: z.enum(["single", "multi", "scale_1_5", "free_text"]),
  hint: str,
  max: n,
  max_length: n,
  required: z.boolean(),
  active: z.boolean().default(true),
}));

export const catalogFile = z.array(z.object({
  id: z.string(),
  name: z.string(),
  chosen: z.number().int(),
  checked_at: str,
  options: z.array(z.object({
    title: z.string(),
    brand: str,
    pack_g: n,
    price_inr: n,
    price_type: z.enum(["entered", "sale", "mrp", "unknown"]),
    site: str,
    url: str,
    url_kind: z.enum(["product", "search", "b2b"]).nullish(),
    note: str,
  })),
}));

export const recipesFile = z.array(z.object({
  slug: z.string(),
  name: z.string(),
  type: z.enum(["Global", "Indian"]),
  order: z.number().int(),
  total_g: z.number(),
  protein_g: z.number(),
  items: z.array(z.object({ id: z.string(), label: str, grams: z.number().nonnegative() })),
}));

export const recipeEstimatesFile = z.array(z.object({
  name: z.string(),
  kcal: n, carbs_g: n, fat_g: n, cost_inr: n,
  liquid: str, microwave: str, air_fryer: str, otg: str, pressure_cooker: str, notes: str,
}).passthrough());

export const marketNotesFile = z.array(z.object({ id: z.string(), section: z.string(), item: z.string(), detail: z.string(), source_url: str }));

export const competitorsFile = z.array(z.object({
  id: z.string(), brand: z.string(), product: z.string(), protein_g: n, protein_note: str, pack: str,
  price: z.union([z.string(), z.number()]).nullish().transform((v) => (v == null ? v : String(v))),
  price_per_serve_inr: n, format: str, country: str, source_url: str,
}));

export const kpisFile = z.array(z.object({ id: z.string(), label: z.string(), value: z.string(), note: str, source_url: z.string(), date: str }));

export const marketSizesFile = z.array(z.object({ segment: z.string(), size_2025: str, forecast: str, cagr: str, source_url: z.string() }));

export const quotesFile = z.array(z.object({
  id: z.string(), quote: z.string(), paraphrase: z.boolean(), source: str, url: str, sentiment: str, theme: str,
}));

export const outreachPostsFile = z.array(z.object({ platform: z.string(), title: str, body: z.string() }));

export const proteinSourcesFile = z.array(z.object({
  source: z.string(), protein_pct: n, baking: str, taste: str,
  price_inr_per_kg: z.union([z.string(), z.number()]).nullish().transform((v) => (v == null ? v : String(v))),
  diet: str, notes: str,
}));

export const formulationNotesFile = z.array(z.object({ id: z.string(), section: z.string(), item: z.string(), detail: z.string(), source_url: str }));

export const verdictFile = z.array(z.object({ id: z.string(), kind: z.string(), score: n, text: z.string() }));
