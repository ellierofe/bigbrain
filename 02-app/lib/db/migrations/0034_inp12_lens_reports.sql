CREATE TABLE "lens_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"lens" varchar(30) NOT NULL,
	"title" varchar(300) NOT NULL,
	"summary" text,
	"result" jsonb NOT NULL,
	"lens_input" text,
	"source_ids" uuid[] DEFAULT '{}'::uuid[] NOT NULL,
	"processing_run_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"committed_at" timestamp with time zone,
	"superseded_by_id" uuid,
	"committed_item_count" integer DEFAULT 0 NOT NULL,
	"embedding" vector(1536),
	"embedding_generated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lens_reports" ADD CONSTRAINT "lens_reports_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lens_reports" ADD CONSTRAINT "lens_reports_processing_run_id_processing_runs_id_fk" FOREIGN KEY ("processing_run_id") REFERENCES "public"."processing_runs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lens_reports" ADD CONSTRAINT "lens_reports_superseded_by_id_lens_reports_id_fk" FOREIGN KEY ("superseded_by_id") REFERENCES "public"."lens_reports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lens_reports_brand_status_idx" ON "lens_reports" USING btree ("brand_id","status");--> statement-breakpoint
CREATE INDEX "lens_reports_processing_run_idx" ON "lens_reports" USING btree ("processing_run_id");--> statement-breakpoint
CREATE INDEX "lens_reports_superseded_by_idx" ON "lens_reports" USING btree ("superseded_by_id");--> statement-breakpoint
CREATE INDEX "lens_reports_embedding_idx" ON "lens_reports" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "lens_reports_source_ids_gin_idx" ON "lens_reports" USING gin ("source_ids");