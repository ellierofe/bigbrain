CREATE TABLE "library_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generation_run_id" uuid,
	"variant_id" varchar(50),
	"content_type_id" uuid NOT NULL,
	"text" text NOT NULL,
	"structured_content" jsonb,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"publish_status" varchar(20) DEFAULT 'draft' NOT NULL,
	"publish_date" timestamp with time zone,
	"published_url" text,
	"platform" varchar(50),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "library_items" ADD CONSTRAINT "library_items_generation_run_id_generation_runs_id_fk" FOREIGN KEY ("generation_run_id") REFERENCES "public"."generation_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "library_items" ADD CONSTRAINT "library_items_content_type_id_content_types_id_fk" FOREIGN KEY ("content_type_id") REFERENCES "public"."content_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "library_items_content_type_created_idx" ON "library_items" USING btree ("content_type_id","created_at");--> statement-breakpoint
CREATE INDEX "library_items_publish_status_date_idx" ON "library_items" USING btree ("publish_status","publish_date");--> statement-breakpoint
CREATE INDEX "library_items_platform_status_date_idx" ON "library_items" USING btree ("platform","publish_status","publish_date");--> statement-breakpoint
CREATE INDEX "library_items_generation_run_idx" ON "library_items" USING btree ("generation_run_id");--> statement-breakpoint
CREATE INDEX "library_items_created_idx" ON "library_items" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "library_items_tags_gin_idx" ON "library_items" USING gin ("tags");