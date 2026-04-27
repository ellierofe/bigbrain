CREATE TABLE "processing_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"mode" text NOT NULL,
	"source_ids" uuid[] DEFAULT '{}' NOT NULL,
	"title" text,
	"extraction_result" jsonb,
	"analysis_result" jsonb,
	"topic_clusters" jsonb,
	"status" text DEFAULT 'pending' NOT NULL,
	"committed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "src_source_documents" ADD COLUMN "inbox_status" text;--> statement-breakpoint
ALTER TABLE "src_source_documents" ADD COLUMN "processing_history" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "src_source_documents" ADD COLUMN "participant_ids" uuid[];--> statement-breakpoint
ALTER TABLE "processing_runs" ADD CONSTRAINT "processing_runs_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "processing_runs_brand_status_idx" ON "processing_runs" USING btree ("brand_id","status");