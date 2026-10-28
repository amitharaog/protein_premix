-- Protein Mug Cake — Neon Postgres schema (reference DDL).
-- Source of truth in code is src/db/schema.ts (Drizzle). Keep the two identical.
-- Auth.js tables (user, account, session, verificationToken) come from @auth/drizzle-adapter — not listed here.

create extension if not exists pgcrypto;

-- ───────────── enums ─────────────
create type price_type      as enum ('entered','sale','mrp','unknown');
create type url_kind        as enum ('product','search','b2b');
create type stock_status    as enum ('in_stock','out_of_stock','dead','unknown');
create type finding_status  as enum ('pending','approved','rejected');
create type order_status    as enum ('planned','ordered','received','cancelled');
create type recipe_status   as enum ('idea','testing','approved','retired');
create type appliance       as enum ('microwave','air_fryer','otg','pressure_cooker');
create type question_type   as enum ('single','multi','scale_1_5','free_text');
create type job_status      as enum ('running','ok','partial','failed');

-- ───────────── survey ─────────────
create table survey_questions (
  id          text primary key,              -- 'Q1'..'Q10'
  position    int  not null,
  question    text not null,
  type        question_type not null,
  options     jsonb not null default '[]',   -- array of strings, order = display order
  hint        text,
  max_select  int,                           -- Q6=3, Q8=2
  required    boolean not null default false,
  max_length  int,
  active      boolean not null default true
);

create table survey_responses (
  id            uuid primary key default gen_random_uuid(),
  respondent_id text not null unique,        -- httpOnly cookie; resubmits update the row
  answers       jsonb not null,              -- {Q1:[..],Q3:"..",Q9:"4",Q10:".."}
  source        text not null default 'web', -- web | claude_artifact | google_form | import
  utm           jsonb,                       -- utm_source/medium/campaign from landing URL
  city          text,                        -- optional, from waitlist join, never from IP lookup
  ip_hash       text,                        -- sha256(ip + SALT) for rate limiting only
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on survey_responses (created_at);
create index on survey_responses using gin (answers);

-- weekly snapshots so the dashboard can show "change since last week"
create table survey_snapshots (
  id              uuid primary key default gen_random_uuid(),
  taken_at        timestamptz not null default now(),
  total_responses int not null,
  results         jsonb not null           -- [{key:'Q1|Microwave',qid,question,option,count,answered,total_responses}]
);

-- ───────────── waitlist (launch site) ─────────────
create table waitlist (
  id             uuid primary key default gen_random_uuid(),
  email          text unique,
  phone          text,                      -- E.164, optional (WhatsApp updates)
  name           text,
  city           text,
  pincode        text,
  flavours       text[] not null default '{}',
  appliance      appliance[],
  price_band     text,
  consent        boolean not null,          -- must be true to insert
  whatsapp_optin boolean not null default false,
  referral_code  text not null unique,      -- 6-char, generated
  referred_by    text references waitlist(referral_code),
  utm            jsonb,
  confirmed_at   timestamptz,
  deleted_at     timestamptz,               -- DPDP delete request → soft delete + scrub PII
  created_at     timestamptz not null default now(),
  check (email is not null or phone is not null)
);

-- ───────────── ingredients & prices ─────────────
create table ingredients (
  id                text primary key,        -- 'wpc80', 'casein', ...
  name              text not null,
  category          text,                    -- protein | flour | sweetener | leavening | flavour | inclusion | fibre | fat | packaging
  chosen_option_id  uuid,                    -- FK added below
  protein_per_100g  numeric(6,2),            -- nutrition: fill from supplier spec / IFCT 2017
  kcal_per_100g     numeric(7,2),
  carbs_per_100g    numeric(6,2),
  sugar_per_100g    numeric(6,2),
  fat_per_100g      numeric(6,2),
  fibre_per_100g    numeric(6,2),
  is_vegan          boolean,
  allergens         text[] not null default '{}',   -- milk, tree_nut, soy, ...
  nutrition_source  text,
  checked_at        date
);

create table ingredient_options (
  id               uuid primary key default gen_random_uuid(),
  ingredient_id    text not null references ingredients(id) on delete cascade,
  position         int  not null,            -- 0 = original primary, 1 = backup, 2+ = replacements
  title            text not null,
  brand            text,
  pack_g           numeric(10,3),
  price_inr        numeric(10,2),
  mrp_inr          numeric(10,2),
  price_type       price_type not null default 'unknown',
  site             text,
  url              text,
  url_kind         url_kind not null default 'product',
  manual_only      boolean not null default false,  -- true for amazon.in / flipkart.com
  stock_status     stock_status not null default 'unknown',
  note             text,
  replaces_option  uuid references ingredient_options(id),
  last_checked_at  timestamptz,
  created_at       timestamptz not null default now(),
  unique (ingredient_id, position)
);
alter table ingredients add constraint ingredients_chosen_fk
  foreign key (chosen_option_id) references ingredient_options(id);

create table price_history (
  id           uuid primary key default gen_random_uuid(),
  option_id    uuid not null references ingredient_options(id) on delete cascade,
  checked_at   timestamptz not null default now(),
  price_inr    numeric(10,2),
  mrp_inr      numeric(10,2),
  pack_g       numeric(10,3),
  stock_status stock_status not null,
  source       text not null,               -- job | manual
  evidence     text
);
create index on price_history (option_id, checked_at desc);

-- ───────────── recipes / formulation lab ─────────────
create table recipes (
  id               text primary key,        -- slug
  name             text not null,
  type             text,                    -- Global | Indian
  position         int,
  status           recipe_status not null default 'idea',
  liquid           text default 'milk',     -- milk | water | either
  liquid_ml        numeric(6,1),
  microwave_s      int,
  air_fryer_min    int,
  air_fryer_temp_c int,
  otg_min          int,
  otg_temp_c       int,
  cooker_min       int,
  notes            text,
  updated_at       timestamptz not null default now()
);

create table recipe_items (
  recipe_id     text not null references recipes(id) on delete cascade,
  ingredient_id text not null references ingredients(id),
  grams         numeric(8,3) not null check (grams >= 0),
  position      int not null,
  primary key (recipe_id, ingredient_id)
);

create table test_bakes (
  id             uuid primary key default gen_random_uuid(),
  recipe_id      text not null references recipes(id) on delete cascade,
  appliance      appliance not null,
  liquid         text,
  liquid_ml      numeric(6,1),
  time_s         int,
  temp_c         int,
  taste_1_5      int check (taste_1_5 between 1 and 5),
  texture_1_5    int check (texture_1_5 between 1 and 5),
  moistness_1_5  int check (moistness_1_5 between 1 and 5),
  aftertaste     boolean,
  notes          text,
  photo_url      text,                       -- Vercel Blob
  baked_at       timestamptz not null default now()
);

-- ───────────── purchase orders (ingredient buying) ─────────────
create table purchase_orders (
  id           uuid primary key default gen_random_uuid(),
  status       order_status not null default 'planned',
  site         text,
  ordered_at   timestamptz,
  expected_at  date,
  received_at  timestamptz,
  total_inr    numeric(10,2),
  notes        text,
  created_at   timestamptz not null default now()
);
create table purchase_order_items (
  order_id        uuid not null references purchase_orders(id) on delete cascade,
  option_id       uuid not null references ingredient_options(id),
  qty             int not null check (qty > 0),
  unit_price_inr  numeric(10,2),
  primary key (order_id, option_id)
);

-- ───────────── market research ─────────────
create table kpis (
  id          text primary key,             -- 'k1'..
  label       text not null,
  value       text not null,                -- kept as text on purpose: values arrive as "INR 44,048 Cr (2025)"
  note        text,
  source_url  text not null,
  date_label  text,
  position    int
);

create table market_sizes (
  id          uuid primary key default gen_random_uuid(),
  segment     text not null,
  size_2025   text,
  forecast    text,
  cagr        text,
  source_url  text not null
);

create table market_findings (                 -- seeded from market_notes.json; news job appends here
  id           text primary key,              -- 'n1'..'n42', news job uses 'nw-YYYYMMDD-xx'
  section      text not null,                 -- Appliance access | Channels | Consumers | Regulation | Voice of customer | News
  item         text not null,
  detail       text not null,
  source_url   text,                          -- required unless section = 'Voice of customer'
  published_at date,
  status       finding_status not null default 'approved',
  found_by     text not null default 'seed',  -- seed | news_job | admin
  created_at   timestamptz not null default now(),
  reviewed_at  timestamptz
);

create table competitors (
  id                   text primary key,       -- 'c1'..; 'you' = our planned product
  brand                text not null,
  product              text not null,
  protein_g            numeric(6,2),
  protein_note         text,
  pack                 text,
  price_text           text,                   -- as listed, e.g. "214 / 428"
  price_inr            numeric(10,2),          -- single comparable INR price when known
  price_per_serve_inr  numeric(10,2),
  format               text,
  country              text,
  source_url           text,
  is_ours              boolean not null default false,
  updated_at           timestamptz not null default now()
);
create table competitor_price_history (
  id             uuid primary key default gen_random_uuid(),
  competitor_id  text not null references competitors(id) on delete cascade,
  checked_at     timestamptz not null default now(),
  price_text     text,
  price_inr      numeric(10,2),
  source_url     text not null
);

create table quotes (
  id text primary key, quote text not null, paraphrase boolean not null default false,
  source text, url text, sentiment text, theme text
);
create table outreach_posts (
  id uuid primary key default gen_random_uuid(),
  platform text not null, title text, body text not null, posted_at timestamptz, post_url text
);
create table protein_sources (
  source text primary key, protein_pct numeric(5,2), baking text, taste text,
  price_inr_per_kg text, diet text, notes text
);
create table formulation_notes (
  id text primary key, section text not null, item text not null, detail text not null,
  source_url text, status finding_status not null default 'approved'
);
create table verdict_items (
  id text primary key, kind text not null,  -- score | risk | opportunity
  score numeric(3,1), text text not null, position int
);

-- ───────────── products & shop (phase 5, feature-flagged) ─────────────
create table products (
  sku            text primary key,
  name           text not null,
  flavour        text not null,
  recipe_id      text references recipes(id),
  net_g          numeric(6,1) not null default 50,
  mrp_inr        numeric(10,2),
  price_inr      numeric(10,2),
  pack_count     int not null default 1,       -- 1, 5, 10
  lab_tested     boolean not null default false,
  lab_protein_g  numeric(6,2),                  -- per sachet, from NABL lab report
  lab_report_url text,
  fssai_licence  text,
  is_active      boolean not null default false,
  image_url      text
);
create table shop_orders (
  id                uuid primary key default gen_random_uuid(),
  razorpay_order_id text unique,
  razorpay_payment_id text,
  status            text not null default 'created',   -- created | paid | failed | refunded | shipped
  email             text, phone text, name text,
  address           jsonb,
  items             jsonb not null,                    -- [{sku, qty, price_inr}]
  subtotal_inr      numeric(10,2) not null,
  shipping_inr      numeric(10,2) not null default 0,
  total_inr         numeric(10,2) not null,
  created_at        timestamptz not null default now(),
  paid_at           timestamptz
);

-- ───────────── jobs ─────────────
create table job_runs (
  id           uuid primary key default gen_random_uuid(),
  job          text not null,                -- prices | news | survey_snapshot | weekly_report
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  status       job_status not null default 'running',
  summary      jsonb,                        -- counts + human text used in the weekly email
  error        text
);
create index on job_runs (job, started_at desc);
