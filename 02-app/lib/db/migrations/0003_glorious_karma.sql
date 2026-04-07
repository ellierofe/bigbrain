CREATE TABLE "dna_business_overview" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"business_name" varchar(200) NOT NULL,
	"legal_name" varchar(200),
	"owner_name" varchar(200),
	"vertical" varchar(200) NOT NULL,
	"specialism" text NOT NULL,
	"business_model" varchar(100),
	"founding_year" integer,
	"founder_names" text[],
	"geographic_focus" varchar(200),
	"stage" varchar(100),
	"short_description" text,
	"full_description" text,
	"website_url" varchar(500),
	"primary_email" varchar(200),
	"social_handles" jsonb,
	"notes" text,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dna_brand_meaning" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"vision" text,
	"vision_notes" text,
	"mission" text,
	"mission_notes" text,
	"purpose" text,
	"purpose_notes" text,
	"values" jsonb,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dna_value_proposition" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"core_statement" text,
	"target_customer" text,
	"problem_solved" text,
	"outcome_delivered" text,
	"unique_mechanism" text,
	"differentiators" text[],
	"alternatives_addressed" jsonb,
	"elevator_pitch" text,
	"internal_notes" text,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dna_brand_identity" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"colours" jsonb,
	"typography" jsonb,
	"logo_assets" jsonb,
	"motifs" text,
	"image_style" text,
	"image_style_examples" text[],
	"icon_style" text,
	"design_principles" text[],
	"do_not_use" text,
	"brand_guideline_url" varchar(500),
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dna_audience_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"segment_name" varchar(200) NOT NULL,
	"persona_name" varchar(100),
	"summary" text,
	"demographics" jsonb,
	"psychographics" jsonb,
	"role_context" text,
	"problems" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"desires" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"objections" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"shared_beliefs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"avatar_prompt" text,
	"avatar_url" varchar(500),
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dna_business_overview" ADD CONSTRAINT "dna_business_overview_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dna_brand_meaning" ADD CONSTRAINT "dna_brand_meaning_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dna_value_proposition" ADD CONSTRAINT "dna_value_proposition_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dna_brand_identity" ADD CONSTRAINT "dna_brand_identity_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dna_audience_segments" ADD CONSTRAINT "dna_audience_segments_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dna_business_overview_brand_idx" ON "dna_business_overview" USING btree ("brand_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dna_brand_meaning_brand_idx" ON "dna_brand_meaning" USING btree ("brand_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dna_value_proposition_brand_idx" ON "dna_value_proposition" USING btree ("brand_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dna_brand_identity_brand_idx" ON "dna_brand_identity" USING btree ("brand_id");