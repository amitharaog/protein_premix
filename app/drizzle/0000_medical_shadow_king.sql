CREATE TYPE "public"."appliance" AS ENUM('microwave', 'air_fryer', 'otg', 'pressure_cooker');--> statement-breakpoint
CREATE TYPE "public"."finding_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('running', 'ok', 'partial', 'failed');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('planned', 'ordered', 'received', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."price_type" AS ENUM('entered', 'sale', 'mrp', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."question_type" AS ENUM('single', 'multi', 'scale_1_5', 'free_text');--> statement-breakpoint
CREATE TYPE "public"."recipe_status" AS ENUM('idea', 'testing', 'approved', 'retired');--> statement-breakpoint
CREATE TYPE "public"."stock_status" AS ENUM('in_stock', 'out_of_stock', 'dead', 'unknown');--> statement-breakpoint
CREATE TYPE "public"."url_kind" AS ENUM('product', 'search', 'b2b');--> statement-breakpoint
CREATE TABLE "account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	CONSTRAINT "account_provider_providerAccountId_pk" PRIMARY KEY("provider","providerAccountId")
);
--> statement-breakpoint
CREATE TABLE "competitor_price_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competitor_id" text NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"price_text" text,
	"price_inr" numeric(10, 2),
	"source_url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitors" (
	"id" text PRIMARY KEY NOT NULL,
	"brand" text NOT NULL,
	"product" text NOT NULL,
	"protein_g" numeric(6, 2),
	"protein_note" text,
	"pack" text,
	"price_text" text,
	"price_inr" numeric(10, 2),
	"price_per_serve_inr" numeric(10, 2),
	"format" text,
	"country" text,
	"source_url" text,
	"is_ours" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "formulation_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"section" text NOT NULL,
	"item" text NOT NULL,
	"detail" text NOT NULL,
	"source_url" text,
	"status" "finding_status" DEFAULT 'approved' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingredient_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ingredient_id" text NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"brand" text,
	"pack_g" numeric(10, 3),
	"price_inr" numeric(10, 2),
	"mrp_inr" numeric(10, 2),
	"price_type" "price_type" DEFAULT 'unknown' NOT NULL,
	"site" text,
	"url" text,
	"url_kind" "url_kind" DEFAULT 'product' NOT NULL,
	"manual_only" boolean DEFAULT false NOT NULL,
	"stock_status" "stock_status" DEFAULT 'unknown' NOT NULL,
	"note" text,
	"replaces_option" uuid,
	"last_checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ingredient_options_ingredient_id_position_unique" UNIQUE("ingredient_id","position")
);
--> statement-breakpoint
CREATE TABLE "ingredients" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"chosen_option_id" uuid,
	"protein_per_100g" numeric(6, 2),
	"kcal_per_100g" numeric(7, 2),
	"carbs_per_100g" numeric(6, 2),
	"sugar_per_100g" numeric(6, 2),
	"fat_per_100g" numeric(6, 2),
	"fibre_per_100g" numeric(6, 2),
	"is_vegan" boolean,
	"allergens" text[] DEFAULT '{}' NOT NULL,
	"nutrition_source" text,
	"checked_at" date
);
--> statement-breakpoint
CREATE TABLE "job_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" "job_status" DEFAULT 'running' NOT NULL,
	"summary" jsonb,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "kpis" (
	"id" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL,
	"note" text,
	"source_url" text NOT NULL,
	"date_label" text,
	"position" integer
);
--> statement-breakpoint
CREATE TABLE "market_findings" (
	"id" text PRIMARY KEY NOT NULL,
	"section" text NOT NULL,
	"item" text NOT NULL,
	"detail" text NOT NULL,
	"source_url" text,
	"published_at" date,
	"status" "finding_status" DEFAULT 'approved' NOT NULL,
	"found_by" text DEFAULT 'seed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "market_sizes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"segment" text NOT NULL,
	"size_2025" text,
	"forecast" text,
	"cagr" text,
	"source_url" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outreach_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"platform" text NOT NULL,
	"title" text,
	"body" text NOT NULL,
	"posted_at" timestamp with time zone,
	"post_url" text
);
--> statement-breakpoint
CREATE TABLE "price_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"option_id" uuid NOT NULL,
	"checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"price_inr" numeric(10, 2),
	"mrp_inr" numeric(10, 2),
	"pack_g" numeric(10, 3),
	"stock_status" "stock_status" NOT NULL,
	"source" text NOT NULL,
	"evidence" text
);
--> statement-breakpoint
CREATE TABLE "products" (
	"sku" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"flavour" text NOT NULL,
	"recipe_id" text,
	"net_g" numeric(6, 1) DEFAULT '50' NOT NULL,
	"mrp_inr" numeric(10, 2),
	"price_inr" numeric(10, 2),
	"pack_count" integer DEFAULT 1 NOT NULL,
	"lab_tested" boolean DEFAULT false NOT NULL,
	"lab_protein_g" numeric(6, 2),
	"lab_report_url" text,
	"fssai_licence" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"image_url" text
);
--> statement-breakpoint
CREATE TABLE "protein_sources" (
	"source" text PRIMARY KEY NOT NULL,
	"protein_pct" numeric(5, 2),
	"baking" text,
	"taste" text,
	"price_inr_per_kg" text,
	"diet" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "purchase_order_items" (
	"order_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"qty" integer NOT NULL,
	"unit_price_inr" numeric(10, 2),
	CONSTRAINT "purchase_order_items_order_id_option_id_pk" PRIMARY KEY("order_id","option_id"),
	CONSTRAINT "purchase_order_items_qty_check" CHECK ("purchase_order_items"."qty" > 0)
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "order_status" DEFAULT 'planned' NOT NULL,
	"site" text,
	"ordered_at" timestamp with time zone,
	"expected_at" date,
	"received_at" timestamp with time zone,
	"total_inr" numeric(10, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" text PRIMARY KEY NOT NULL,
	"quote" text NOT NULL,
	"paraphrase" boolean DEFAULT false NOT NULL,
	"source" text,
	"url" text,
	"sentiment" text,
	"theme" text
);
--> statement-breakpoint
CREATE TABLE "recipe_items" (
	"recipe_id" text NOT NULL,
	"ingredient_id" text NOT NULL,
	"grams" numeric(8, 3) NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "recipe_items_recipe_id_ingredient_id_pk" PRIMARY KEY("recipe_id","ingredient_id"),
	CONSTRAINT "recipe_items_grams_check" CHECK ("recipe_items"."grams" >= 0)
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text,
	"position" integer,
	"status" "recipe_status" DEFAULT 'idea' NOT NULL,
	"liquid" text DEFAULT 'milk',
	"liquid_ml" numeric(6, 1),
	"microwave_s" integer,
	"air_fryer_min" integer,
	"air_fryer_temp_c" integer,
	"otg_min" integer,
	"otg_temp_c" integer,
	"cooker_min" integer,
	"notes" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"razorpay_order_id" text,
	"razorpay_payment_id" text,
	"status" text DEFAULT 'created' NOT NULL,
	"email" text,
	"phone" text,
	"name" text,
	"address" jsonb,
	"items" jsonb NOT NULL,
	"subtotal_inr" numeric(10, 2) NOT NULL,
	"shipping_inr" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total_inr" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone,
	CONSTRAINT "shop_orders_razorpay_order_id_unique" UNIQUE("razorpay_order_id")
);
--> statement-breakpoint
CREATE TABLE "survey_questions" (
	"id" text PRIMARY KEY NOT NULL,
	"position" integer NOT NULL,
	"question" text NOT NULL,
	"type" "question_type" NOT NULL,
	"options" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"hint" text,
	"max_select" integer,
	"required" boolean DEFAULT false NOT NULL,
	"max_length" integer,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "survey_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"respondent_id" text NOT NULL,
	"answers" jsonb NOT NULL,
	"source" text DEFAULT 'web' NOT NULL,
	"utm" jsonb,
	"city" text,
	"ip_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "survey_responses_respondent_id_unique" UNIQUE("respondent_id")
);
--> statement-breakpoint
CREATE TABLE "survey_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL,
	"total_responses" integer NOT NULL,
	"results" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_bakes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" text NOT NULL,
	"appliance" "appliance" NOT NULL,
	"liquid" text,
	"liquid_ml" numeric(6, 1),
	"time_s" integer,
	"temp_c" integer,
	"taste_1_5" integer,
	"texture_1_5" integer,
	"moistness_1_5" integer,
	"aftertaste" boolean,
	"notes" text,
	"photo_url" text,
	"baked_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "test_bakes_taste_check" CHECK ("test_bakes"."taste_1_5" between 1 and 5),
	CONSTRAINT "test_bakes_texture_check" CHECK ("test_bakes"."texture_1_5" between 1 and 5),
	CONSTRAINT "test_bakes_moistness_check" CHECK ("test_bakes"."moistness_1_5" between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text,
	"emailVerified" timestamp,
	"image" text,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verdict_items" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"score" numeric(3, 1),
	"text" text NOT NULL,
	"position" integer
);
--> statement-breakpoint
CREATE TABLE "verificationToken" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp NOT NULL,
	CONSTRAINT "verificationToken_identifier_token_pk" PRIMARY KEY("identifier","token")
);
--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"phone" text,
	"name" text,
	"city" text,
	"pincode" text,
	"flavours" text[] DEFAULT '{}' NOT NULL,
	"appliance" "appliance"[],
	"price_band" text,
	"consent" boolean NOT NULL,
	"whatsapp_optin" boolean DEFAULT false NOT NULL,
	"referral_code" text NOT NULL,
	"referred_by" text,
	"utm" jsonb,
	"confirmed_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "waitlist_email_unique" UNIQUE("email"),
	CONSTRAINT "waitlist_referral_code_unique" UNIQUE("referral_code"),
	CONSTRAINT "waitlist_contact_check" CHECK ("waitlist"."email" is not null or "waitlist"."phone" is not null)
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitor_price_history" ADD CONSTRAINT "competitor_price_history_competitor_id_competitors_id_fk" FOREIGN KEY ("competitor_id") REFERENCES "public"."competitors"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_options" ADD CONSTRAINT "ingredient_options_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredient_options" ADD CONSTRAINT "ingredient_options_replaces_option_ingredient_options_id_fk" FOREIGN KEY ("replaces_option") REFERENCES "public"."ingredient_options"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ingredients" ADD CONSTRAINT "ingredients_chosen_option_id_ingredient_options_id_fk" FOREIGN KEY ("chosen_option_id") REFERENCES "public"."ingredient_options"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_option_id_ingredient_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."ingredient_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_order_id_purchase_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_option_id_ingredient_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."ingredient_options"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_ingredient_id_ingredients_id_fk" FOREIGN KEY ("ingredient_id") REFERENCES "public"."ingredients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_bakes" ADD CONSTRAINT "test_bakes_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_referred_by_waitlist_referral_code_fk" FOREIGN KEY ("referred_by") REFERENCES "public"."waitlist"("referral_code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "job_runs_job_started_at_index" ON "job_runs" USING btree ("job","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "price_history_option_id_checked_at_index" ON "price_history" USING btree ("option_id","checked_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "survey_responses_created_at_index" ON "survey_responses" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "survey_responses_answers_index" ON "survey_responses" USING gin ("answers");