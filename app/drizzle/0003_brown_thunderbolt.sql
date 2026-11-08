CREATE TABLE "survey_contacts" (
	"respondent_id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"whatsapp_optin" boolean DEFAULT false NOT NULL,
	"consent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "survey_contacts_contact_check" CHECK ("survey_contacts"."email" is not null or "survey_contacts"."phone" is not null)
);
--> statement-breakpoint
ALTER TABLE "survey_contacts" ADD CONSTRAINT "survey_contacts_respondent_id_survey_responses_respondent_id_fk" FOREIGN KEY ("respondent_id") REFERENCES "public"."survey_responses"("respondent_id") ON DELETE cascade ON UPDATE no action;