CREATE TABLE "prompt_fragments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(100) NOT NULL,
	"kind" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"purpose" text,
	"usage" text,
	"content" text NOT NULL,
	"placeholders" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP TABLE "prompt_components" CASCADE;--> statement-breakpoint
CREATE UNIQUE INDEX "prompt_fragments_slug_version_idx" ON "prompt_fragments" USING btree ("slug","version");--> statement-breakpoint
CREATE INDEX "prompt_fragments_kind_status_idx" ON "prompt_fragments" USING btree ("kind","status");
