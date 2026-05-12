ALTER TABLE "src_source_documents" ADD COLUMN "ingestion_log_id" uuid;--> statement-breakpoint
ALTER TABLE "src_source_chunks" ADD COLUMN "image_refs" text[];--> statement-breakpoint
ALTER TABLE "src_source_chunks" ADD COLUMN "image_description" text;--> statement-breakpoint
ALTER TABLE "processing_runs" ADD COLUMN "unexpected" jsonb DEFAULT '[]'::jsonb NOT NULL;