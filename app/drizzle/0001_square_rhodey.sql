CREATE TYPE "public"."run_status" AS ENUM('requested', 'running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"command" text NOT NULL,
	"args" text,
	"status" "run_status" DEFAULT 'requested' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"run_url" text,
	"summary" text,
	"cost_usd" numeric(10, 4),
	"reports" jsonb,
	"board" jsonb,
	"error" text
);
--> statement-breakpoint
CREATE INDEX "agent_runs_requested_at_index" ON "agent_runs" USING btree ("requested_at" DESC NULLS LAST);