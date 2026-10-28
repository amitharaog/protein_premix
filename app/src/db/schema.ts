// Drizzle schema: single source of truth. Mirrors db/schema.sql; keep the two identical.
import { sql } from "drizzle-orm";
import {
  boolean, check, date, foreignKey, index, integer, jsonb, numeric, pgEnum, pgTable,
  primaryKey, text, timestamp, unique, uuid, type AnyPgColumn,
} from "drizzle-orm/pg-core";

// ───────────── enums ─────────────
export const priceType = pgEnum("price_type", ["entered", "sale", "mrp", "unknown"]);
export const urlKind = pgEnum("url_kind", ["product", "search", "b2b"]);
export const stockStatus = pgEnum("stock_status", ["in_stock", "out_of_stock", "dead", "unknown"]);
export const findingStatus = pgEnum("finding_status", ["pending", "approved", "rejected"]);
export const orderStatus = pgEnum("order_status", ["planned", "ordered", "received", "cancelled"]);
export const recipeStatus = pgEnum("recipe_status", ["idea", "testing", "approved", "retired"]);
export const appliance = pgEnum("appliance", ["microwave", "air_fryer", "otg", "pressure_cooker"]);
export const questionType = pgEnum("question_type", ["single", "multi", "scale_1_5", "free_text"]);
export const jobStatus = pgEnum("job_status", ["running", "ok", "partial", "failed"]);

const money = (name: string) => numeric(name, { precision: 10, scale: 2 });
const grams = (name: string) => numeric(name, { precision: 10, scale: 3 });
const tstz = (name: string) => timestamp(name, { withTimezone: true });

// ───────────── survey ─────────────
export const surveyQuestions = pgTable("survey_questions", {
  id: text("id").primaryKey(),
  position: integer("position").notNull(),
  question: text("question").notNull(),
  type: questionType("type").notNull(),
  options: jsonb("options").$type<string[]>().notNull().default([]),
  hint: text("hint"),
  maxSelect: integer("max_select"),
  required: boolean("required").notNull().default(false),
  maxLength: integer("max_length"),
  active: boolean("active").notNull().default(true),
});

export const surveyResponses = pgTable("survey_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  respondentId: text("respondent_id").notNull().unique(),
  answers: jsonb("answers").$type<Record<string, string | string[]>>().notNull(),
  source: text("source").notNull().default("web"),
  utm: jsonb("utm").$type<Record<string, string>>(),
  city: text("city"),
  ipHash: text("ip_hash"),
  createdAt: tstz("created_at").notNull().defaultNow(),
  updatedAt: tstz("updated_at").notNull().defaultNow(),
}, (t) => [
  index().on(t.createdAt),
  index().using("gin", t.answers),
]);

export const surveySnapshots = pgTable("survey_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  takenAt: tstz("taken_at").notNull().defaultNow(),
  totalResponses: integer("total_responses").notNull(),
  results: jsonb("results").notNull(),
});

// ───────────── waitlist ─────────────
export const waitlist = pgTable("waitlist", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique(),
  phone: text("phone"),
  name: text("name"),
  city: text("city"),
  pincode: text("pincode"),
  flavours: text("flavours").array().notNull().default(sql`'{}'`),
  appliance: appliance("appliance").array(),
  priceBand: text("price_band"),
  consent: boolean("consent").notNull(),
  whatsappOptin: boolean("whatsapp_optin").notNull().default(false),
  referralCode: text("referral_code").notNull().unique(),
  referredBy: text("referred_by"),
  utm: jsonb("utm"),
  confirmedAt: tstz("confirmed_at"),
  deletedAt: tstz("deleted_at"),
  createdAt: tstz("created_at").notNull().defaultNow(),
}, (t) => [
  foreignKey({ columns: [t.referredBy], foreignColumns: [t.referralCode] }),
  check("waitlist_contact_check", sql`${t.email} is not null or ${t.phone} is not null`),
]);

// ───────────── ingredients & prices ─────────────
export const ingredients = pgTable("ingredients", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  category: text("category"),
  chosenOptionId: uuid("chosen_option_id").references((): AnyPgColumn => ingredientOptions.id),
  proteinPer100g: numeric("protein_per_100g", { precision: 6, scale: 2 }),
  kcalPer100g: numeric("kcal_per_100g", { precision: 7, scale: 2 }),
  carbsPer100g: numeric("carbs_per_100g", { precision: 6, scale: 2 }),
  sugarPer100g: numeric("sugar_per_100g", { precision: 6, scale: 2 }),
  fatPer100g: numeric("fat_per_100g", { precision: 6, scale: 2 }),
  fibrePer100g: numeric("fibre_per_100g", { precision: 6, scale: 2 }),
  isVegan: boolean("is_vegan"),
  allergens: text("allergens").array().notNull().default(sql`'{}'`),
  nutritionSource: text("nutrition_source"),
  checkedAt: date("checked_at"),
});

export const ingredientOptions = pgTable("ingredient_options", {
  id: uuid("id").primaryKey().defaultRandom(),
  ingredientId: text("ingredient_id").notNull().references(() => ingredients.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  title: text("title").notNull(),
  brand: text("brand"),
  packG: grams("pack_g"),
  priceInr: money("price_inr"),
  mrpInr: money("mrp_inr"),
  priceType: priceType("price_type").notNull().default("unknown"),
  site: text("site"),
  url: text("url"),
  urlKind: urlKind("url_kind").notNull().default("product"),
  manualOnly: boolean("manual_only").notNull().default(false),
  stockStatus: stockStatus("stock_status").notNull().default("unknown"),
  note: text("note"),
  replacesOption: uuid("replaces_option").references((): AnyPgColumn => ingredientOptions.id),
  lastCheckedAt: tstz("last_checked_at"),
  createdAt: tstz("created_at").notNull().defaultNow(),
}, (t) => [unique().on(t.ingredientId, t.position)]);

export const priceHistory = pgTable("price_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  optionId: uuid("option_id").notNull().references(() => ingredientOptions.id, { onDelete: "cascade" }),
  checkedAt: tstz("checked_at").notNull().defaultNow(),
  priceInr: money("price_inr"),
  mrpInr: money("mrp_inr"),
  packG: grams("pack_g"),
  stockStatus: stockStatus("stock_status").notNull(),
  source: text("source").notNull(),
  evidence: text("evidence"),
}, (t) => [index().on(t.optionId, t.checkedAt.desc())]);

// ───────────── recipes / formulation lab ─────────────
export const recipes = pgTable("recipes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type"),
  position: integer("position"),
  status: recipeStatus("status").notNull().default("idea"),
  liquid: text("liquid").default("milk"),
  liquidMl: numeric("liquid_ml", { precision: 6, scale: 1 }),
  microwaveS: integer("microwave_s"),
  airFryerMin: integer("air_fryer_min"),
  airFryerTempC: integer("air_fryer_temp_c"),
  otgMin: integer("otg_min"),
  otgTempC: integer("otg_temp_c"),
  cookerMin: integer("cooker_min"),
  notes: text("notes"),
  updatedAt: tstz("updated_at").notNull().defaultNow(),
});

export const recipeItems = pgTable("recipe_items", {
  recipeId: text("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  ingredientId: text("ingredient_id").notNull().references(() => ingredients.id),
  grams: numeric("grams", { precision: 8, scale: 3 }).notNull(),
  position: integer("position").notNull(),
}, (t) => [
  primaryKey({ columns: [t.recipeId, t.ingredientId] }),
  check("recipe_items_grams_check", sql`${t.grams} >= 0`),
]);

const score = (name: string) => integer(name);
export const testBakes = pgTable("test_bakes", {
  id: uuid("id").primaryKey().defaultRandom(),
  recipeId: text("recipe_id").notNull().references(() => recipes.id, { onDelete: "cascade" }),
  appliance: appliance("appliance").notNull(),
  liquid: text("liquid"),
  liquidMl: numeric("liquid_ml", { precision: 6, scale: 1 }),
  timeS: integer("time_s"),
  tempC: integer("temp_c"),
  taste15: score("taste_1_5"),
  texture15: score("texture_1_5"),
  moistness15: score("moistness_1_5"),
  aftertaste: boolean("aftertaste"),
  notes: text("notes"),
  photoUrl: text("photo_url"),
  bakedAt: tstz("baked_at").notNull().defaultNow(),
}, (t) => [
  check("test_bakes_taste_check", sql`${t.taste15} between 1 and 5`),
  check("test_bakes_texture_check", sql`${t.texture15} between 1 and 5`),
  check("test_bakes_moistness_check", sql`${t.moistness15} between 1 and 5`),
]);

// ───────────── purchase orders ─────────────
export const purchaseOrders = pgTable("purchase_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: orderStatus("status").notNull().default("planned"),
  site: text("site"),
  orderedAt: tstz("ordered_at"),
  expectedAt: date("expected_at"),
  receivedAt: tstz("received_at"),
  totalInr: money("total_inr"),
  notes: text("notes"),
  createdAt: tstz("created_at").notNull().defaultNow(),
});

export const purchaseOrderItems = pgTable("purchase_order_items", {
  orderId: uuid("order_id").notNull().references(() => purchaseOrders.id, { onDelete: "cascade" }),
  optionId: uuid("option_id").notNull().references(() => ingredientOptions.id),
  qty: integer("qty").notNull(),
  unitPriceInr: money("unit_price_inr"),
}, (t) => [
  primaryKey({ columns: [t.orderId, t.optionId] }),
  check("purchase_order_items_qty_check", sql`${t.qty} > 0`),
]);

// ───────────── market research ─────────────
export const kpis = pgTable("kpis", {
  id: text("id").primaryKey(),
  label: text("label").notNull(),
  value: text("value").notNull(),
  note: text("note"),
  sourceUrl: text("source_url").notNull(),
  dateLabel: text("date_label"),
  position: integer("position"),
});

export const marketSizes = pgTable("market_sizes", {
  id: uuid("id").primaryKey().defaultRandom(),
  segment: text("segment").notNull(),
  size2025: text("size_2025"),
  forecast: text("forecast"),
  cagr: text("cagr"),
  sourceUrl: text("source_url").notNull(),
});

export const marketFindings = pgTable("market_findings", {
  id: text("id").primaryKey(),
  section: text("section").notNull(),
  item: text("item").notNull(),
  detail: text("detail").notNull(),
  sourceUrl: text("source_url"),
  publishedAt: date("published_at"),
  status: findingStatus("status").notNull().default("approved"),
  foundBy: text("found_by").notNull().default("seed"),
  createdAt: tstz("created_at").notNull().defaultNow(),
  reviewedAt: tstz("reviewed_at"),
});

export const competitors = pgTable("competitors", {
  id: text("id").primaryKey(),
  brand: text("brand").notNull(),
  product: text("product").notNull(),
  proteinG: numeric("protein_g", { precision: 6, scale: 2 }),
  proteinNote: text("protein_note"),
  pack: text("pack"),
  priceText: text("price_text"),
  priceInr: money("price_inr"),
  pricePerServeInr: money("price_per_serve_inr"),
  format: text("format"),
  country: text("country"),
  sourceUrl: text("source_url"),
  isOurs: boolean("is_ours").notNull().default(false),
  updatedAt: tstz("updated_at").notNull().defaultNow(),
});

export const competitorPriceHistory = pgTable("competitor_price_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  competitorId: text("competitor_id").notNull().references(() => competitors.id, { onDelete: "cascade" }),
  checkedAt: tstz("checked_at").notNull().defaultNow(),
  priceText: text("price_text"),
  priceInr: money("price_inr"),
  sourceUrl: text("source_url").notNull(),
});

export const quotes = pgTable("quotes", {
  id: text("id").primaryKey(),
  quote: text("quote").notNull(),
  paraphrase: boolean("paraphrase").notNull().default(false),
  source: text("source"),
  url: text("url"),
  sentiment: text("sentiment"),
  theme: text("theme"),
});

export const outreachPosts = pgTable("outreach_posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  platform: text("platform").notNull(),
  title: text("title"),
  body: text("body").notNull(),
  postedAt: tstz("posted_at"),
  postUrl: text("post_url"),
});

export const proteinSources = pgTable("protein_sources", {
  source: text("source").primaryKey(),
  proteinPct: numeric("protein_pct", { precision: 5, scale: 2 }),
  baking: text("baking"),
  taste: text("taste"),
  priceInrPerKg: text("price_inr_per_kg"),
  diet: text("diet"),
  notes: text("notes"),
});

export const formulationNotes = pgTable("formulation_notes", {
  id: text("id").primaryKey(),
  section: text("section").notNull(),
  item: text("item").notNull(),
  detail: text("detail").notNull(),
  sourceUrl: text("source_url"),
  status: findingStatus("status").notNull().default("approved"),
});

export const verdictItems = pgTable("verdict_items", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  score: numeric("score", { precision: 3, scale: 1 }),
  text: text("text").notNull(),
  position: integer("position"),
});

// ───────────── products & shop (phase 5, feature-flagged) ─────────────
export const products = pgTable("products", {
  sku: text("sku").primaryKey(),
  name: text("name").notNull(),
  flavour: text("flavour").notNull(),
  recipeId: text("recipe_id").references(() => recipes.id),
  netG: numeric("net_g", { precision: 6, scale: 1 }).notNull().default("50"),
  mrpInr: money("mrp_inr"),
  priceInr: money("price_inr"),
  packCount: integer("pack_count").notNull().default(1),
  labTested: boolean("lab_tested").notNull().default(false),
  labProteinG: numeric("lab_protein_g", { precision: 6, scale: 2 }),
  labReportUrl: text("lab_report_url"),
  fssaiLicence: text("fssai_licence"),
  isActive: boolean("is_active").notNull().default(false),
  imageUrl: text("image_url"),
});

export const shopOrders = pgTable("shop_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  razorpayOrderId: text("razorpay_order_id").unique(),
  razorpayPaymentId: text("razorpay_payment_id"),
  status: text("status").notNull().default("created"),
  email: text("email"),
  phone: text("phone"),
  name: text("name"),
  address: jsonb("address"),
  items: jsonb("items").notNull(),
  subtotalInr: money("subtotal_inr").notNull(),
  shippingInr: money("shipping_inr").notNull().default("0"),
  totalInr: money("total_inr").notNull(),
  createdAt: tstz("created_at").notNull().defaultNow(),
  paidAt: tstz("paid_at"),
});

// ───────────── jobs ─────────────
export const jobRuns = pgTable("job_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  job: text("job").notNull(),
  startedAt: tstz("started_at").notNull().defaultNow(),
  finishedAt: tstz("finished_at"),
  status: jobStatus("status").notNull().default("running"),
  summary: jsonb("summary"),
  error: text("error"),
}, (t) => [index().on(t.job, t.startedAt.desc())]);

// ───────────── Auth.js (Drizzle adapter, Postgres shape) ─────────────
export const users = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable("account", {
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("providerAccountId").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
}, (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })]);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable("verificationToken", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires", { mode: "date" }).notNull(),
}, (t) => [primaryKey({ columns: [t.identifier, t.token] })]);
