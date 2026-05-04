ALTER TABLE "src_source_documents" ALTER COLUMN "tags" SET DEFAULT '{}'::text[];--> statement-breakpoint
ALTER TABLE "src_source_documents" ALTER COLUMN "tags" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "src_source_documents" ALTER COLUMN "participant_ids" SET DEFAULT '{}'::uuid[];--> statement-breakpoint
ALTER TABLE "src_source_documents" ALTER COLUMN "participant_ids" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "src_source_documents" ADD COLUMN "source_type" varchar(40) NOT NULL;--> statement-breakpoint
ALTER TABLE "src_source_documents" ADD COLUMN "authority" varchar(30) NOT NULL;--> statement-breakpoint
ALTER TABLE "src_source_documents" ADD COLUMN "summary" text;--> statement-breakpoint
ALTER TABLE "src_source_documents" ADD COLUMN "summary_generated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "src_source_documents" ADD COLUMN "chunk_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "src_source_documents" ADD COLUMN "embedding_generated_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "src_source_documents_brand_source_type_idx" ON "src_source_documents" USING btree ("brand_id","source_type");--> statement-breakpoint
CREATE INDEX "src_source_documents_brand_inbox_status_idx" ON "src_source_documents" USING btree ("brand_id","inbox_status");--> statement-breakpoint
CREATE INDEX "src_source_documents_tags_gin_idx" ON "src_source_documents" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "src_source_documents_participant_ids_gin_idx" ON "src_source_documents" USING gin ("participant_ids");--> statement-breakpoint
ALTER TABLE "src_source_documents" DROP COLUMN "type";