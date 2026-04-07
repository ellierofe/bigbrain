CREATE TABLE "dna_brand_intros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"kind" varchar(50) NOT NULL,
	"label" varchar(200),
	"platform" varchar(100),
	"body" text NOT NULL,
	"character_count" integer,
	"character_limit" integer,
	"word_count" integer,
	"is_current" boolean DEFAULT true NOT NULL,
	"value_prop_id" uuid,
	"audience_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dna_tone_of_voice" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"language" varchar(20) DEFAULT 'en-GB' NOT NULL,
	"grammatical_person" varchar(50) DEFAULT 'first_singular' NOT NULL,
	"dimensions" jsonb,
	"summary" text,
	"linguistic_notes" text,
	"emotional_resonance" text,
	"brand_vocabulary" jsonb,
	"generated_from_samples_at" timestamp with time zone,
	"last_edited_by_human_at" timestamp with time zone,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dna_tov_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"label" varchar(200) NOT NULL,
	"format_type" varchar(50) NOT NULL,
	"subtype" varchar(100),
	"dimension_deltas" jsonb,
	"tonal_tags" text[],
	"notes" text,
	"do_not_use" text[],
	"structural_guidance" text,
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dna_tov_samples" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"format_type" varchar(50) NOT NULL,
	"subtype" varchar(100),
	"body" text NOT NULL,
	"notes" text,
	"source_context" text,
	"tonal_tags" text[],
	"is_current" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dna_competitor_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"label" varchar(200) NOT NULL,
	"scope" text,
	"is_current" boolean DEFAULT true NOT NULL,
	"own_brand_assessment_id" uuid,
	"matrix_axes" jsonb,
	"matrix_data" jsonb,
	"summary_insights" text,
	"ai_analysed_at" timestamp with time zone,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dna_competitors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"analysis_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"competitor_type" varchar(50) NOT NULL,
	"url" varchar(500),
	"overview" text,
	"is_own_brand" boolean DEFAULT false NOT NULL,
	"positioning_strategy" jsonb,
	"brand_message" jsonb,
	"personality" jsonb,
	"brand_identity" jsonb,
	"brand_presence" jsonb,
	"core_offer" jsonb,
	"reviews" jsonb,
	"ai_generated" boolean DEFAULT false NOT NULL,
	"ai_generated_at" timestamp with time zone,
	"manual_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dna_knowledge_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"kind" varchar(50) NOT NULL,
	"proprietary" boolean DEFAULT true NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"summary" text,
	"principles" text,
	"origin" text,
	"key_components" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"flow" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"objectives" text,
	"problems_solved" text,
	"contexts" text,
	"prior_knowledge" text,
	"resources" text,
	"target_audience_ids" uuid[],
	"related_offer_ids" uuid[],
	"graph_node_id" varchar(200),
	"detail" jsonb,
	"visual_prompt" text,
	"faqs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dna_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"offer_type" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"overview" text,
	"usp" text,
	"usp_explanation" text,
	"target_audience_ids" uuid[],
	"knowledge_asset_id" uuid,
	"pricing" jsonb,
	"scarcity" text,
	"guarantee" jsonb,
	"customer_journey_stage" varchar(50),
	"sales_funnel_notes" text,
	"cta" text,
	"visual_prompt" text,
	"internal_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dna_entity_outcomes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"offer_id" uuid,
	"knowledge_asset_id" uuid,
	"kind" varchar(50) NOT NULL,
	"body" text NOT NULL,
	"question" text,
	"faq_type" varchar(50),
	"objection_addressed" text,
	"value_statement" text,
	"category" varchar(50),
	"sort_order" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dna_platforms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"platform_type" varchar(50) NOT NULL,
	"handle" varchar(200),
	"is_active" boolean DEFAULT true NOT NULL,
	"primary_objective" text,
	"audience" text,
	"content_strategy" text,
	"posting_frequency" varchar(100),
	"content_formats" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"character_limits" jsonb,
	"content_pillar_ids" uuid[],
	"hashtag_strategy" text,
	"engagement_approach" text,
	"customer_journey_stage" varchar(50),
	"growth_function" text,
	"content_pillar_themes" text,
	"subtopic_ideas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"structure_and_features" jsonb,
	"analytics_goals" text,
	"performance_summary" text,
	"do_not_do" text[],
	"usp" text,
	"notes" text,
	"sort_order" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid,
	"slug" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"type" varchar(50) NOT NULL,
	"purpose" text,
	"usage" text,
	"content" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "src_own_research" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"title" varchar(300) NOT NULL,
	"short_label" varchar(200),
	"type" varchar(50) NOT NULL,
	"summary" text NOT NULL,
	"methodology" text,
	"key_findings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_document_ids" uuid[],
	"published_url" varchar(500),
	"conducted_at" date,
	"topic" varchar(200),
	"tags" text[],
	"content_pillar_ids" uuid[],
	"is_public" boolean DEFAULT true NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "src_source_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"title" varchar(300) NOT NULL,
	"type" varchar(50) NOT NULL,
	"description" text,
	"file_url" varchar(500) NOT NULL,
	"file_size" integer,
	"mime_type" varchar(100),
	"extracted_text" text,
	"external_source" varchar(500),
	"tags" text[],
	"is_archived" boolean DEFAULT false NOT NULL,
	"document_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "src_statistics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"stat" text NOT NULL,
	"short_label" varchar(200),
	"source" varchar(500) NOT NULL,
	"source_url" varchar(500),
	"source_year" smallint,
	"notes" text,
	"topic" varchar(200),
	"tags" text[],
	"audience_segment_ids" uuid[],
	"offer_ids" uuid[],
	"content_pillar_ids" uuid[],
	"methodology_ids" uuid[],
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "src_stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"title" varchar(300) NOT NULL,
	"subject" varchar(50) NOT NULL,
	"narrative" text NOT NULL,
	"hook" text,
	"tension" text,
	"resolution" text,
	"lesson" text,
	"type" varchar(50) DEFAULT 'origin' NOT NULL,
	"audience_segment_ids" uuid[],
	"content_pillar_ids" uuid[],
	"tags" text[],
	"is_public" boolean DEFAULT true NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"occurred_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "src_testimonials" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"client_name" varchar(200) NOT NULL,
	"client_title" varchar(200),
	"client_company" varchar(200),
	"quote" text NOT NULL,
	"edited_quote" text,
	"result" text,
	"context" text,
	"type" varchar(50) DEFAULT 'quote' NOT NULL,
	"source_url" varchar(500),
	"media_url" varchar(500),
	"audience_segment_ids" uuid[],
	"offer_ids" uuid[],
	"tags" text[],
	"is_public" boolean DEFAULT true NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"collected_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dna_brand_intros" ADD CONSTRAINT "dna_brand_intros_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dna_brand_intros" ADD CONSTRAINT "dna_brand_intros_value_prop_id_dna_value_proposition_id_fk" FOREIGN KEY ("value_prop_id") REFERENCES "public"."dna_value_proposition"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dna_brand_intros" ADD CONSTRAINT "dna_brand_intros_audience_id_dna_audience_segments_id_fk" FOREIGN KEY ("audience_id") REFERENCES "public"."dna_audience_segments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dna_tone_of_voice" ADD CONSTRAINT "dna_tone_of_voice_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dna_tov_applications" ADD CONSTRAINT "dna_tov_applications_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dna_tov_samples" ADD CONSTRAINT "dna_tov_samples_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dna_competitor_analyses" ADD CONSTRAINT "dna_competitor_analyses_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dna_competitors" ADD CONSTRAINT "dna_competitors_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dna_competitors" ADD CONSTRAINT "dna_competitors_analysis_id_dna_competitor_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."dna_competitor_analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dna_knowledge_assets" ADD CONSTRAINT "dna_knowledge_assets_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dna_offers" ADD CONSTRAINT "dna_offers_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dna_offers" ADD CONSTRAINT "dna_offers_knowledge_asset_id_dna_knowledge_assets_id_fk" FOREIGN KEY ("knowledge_asset_id") REFERENCES "public"."dna_knowledge_assets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dna_entity_outcomes" ADD CONSTRAINT "dna_entity_outcomes_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dna_entity_outcomes" ADD CONSTRAINT "dna_entity_outcomes_offer_id_dna_offers_id_fk" FOREIGN KEY ("offer_id") REFERENCES "public"."dna_offers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dna_entity_outcomes" ADD CONSTRAINT "dna_entity_outcomes_knowledge_asset_id_dna_knowledge_assets_id_fk" FOREIGN KEY ("knowledge_asset_id") REFERENCES "public"."dna_knowledge_assets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dna_platforms" ADD CONSTRAINT "dna_platforms_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_components" ADD CONSTRAINT "prompt_components_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "src_own_research" ADD CONSTRAINT "src_own_research_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "src_source_documents" ADD CONSTRAINT "src_source_documents_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "src_statistics" ADD CONSTRAINT "src_statistics_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "src_stories" ADD CONSTRAINT "src_stories_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "src_testimonials" ADD CONSTRAINT "src_testimonials_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dna_tov_samples_format_current_idx" ON "dna_tov_samples" USING btree ("format_type","is_current");--> statement-breakpoint
CREATE INDEX "dna_entity_outcomes_offer_kind_idx" ON "dna_entity_outcomes" USING btree ("offer_id","kind");--> statement-breakpoint
CREATE INDEX "dna_entity_outcomes_asset_kind_idx" ON "dna_entity_outcomes" USING btree ("knowledge_asset_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "prompt_components_brand_slug_idx" ON "prompt_components" USING btree ("brand_id","slug");