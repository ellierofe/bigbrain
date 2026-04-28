CREATE TABLE "content_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"name" varchar(200) NOT NULL,
	"description" text,
	"icon" varchar(50),
	"picker_group" varchar(50) NOT NULL,
	"platform_type" varchar(50) NOT NULL,
	"format_type" varchar(50) NOT NULL,
	"subtype" varchar(50),
	"is_multi_step" boolean DEFAULT false NOT NULL,
	"prerequisites" jsonb DEFAULT '{"channels":[],"lead_magnets":[],"dna":[]}'::jsonb NOT NULL,
	"default_variant_count" integer DEFAULT 5 NOT NULL,
	"default_min_chars" integer,
	"default_max_chars" integer,
	"topic_bar_enabled" boolean DEFAULT true NOT NULL,
	"strategy_fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"topic_context_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"seo" boolean DEFAULT false NOT NULL,
	"customer_journey_stage" varchar(50),
	"time_saved_minutes" integer,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "content_types_slug_idx" ON "content_types" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "content_types_picker_group_status_idx" ON "content_types" USING btree ("picker_group","status");--> statement-breakpoint
CREATE INDEX "content_types_platform_type_status_idx" ON "content_types" USING btree ("platform_type","status");--> statement-breakpoint
CREATE INDEX "content_types_status_idx" ON "content_types" USING btree ("status");