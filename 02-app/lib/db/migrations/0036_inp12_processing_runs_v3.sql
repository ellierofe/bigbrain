ALTER TABLE "processing_runs" ALTER COLUMN "status" SET DATA TYPE varchar(20);--> statement-breakpoint
ALTER TABLE "processing_runs" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "processing_runs" ADD COLUMN "lens" varchar(30) NOT NULL;--> statement-breakpoint
ALTER TABLE "processing_runs" ADD COLUMN "source_type_filter" varchar(40);--> statement-breakpoint
ALTER TABLE "processing_runs" ADD COLUMN "lens_input" text;--> statement-breakpoint
ALTER TABLE "processing_runs" ADD COLUMN "prompt_fragments_used" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "processing_runs" ADD COLUMN "lens_report_id" uuid;--> statement-breakpoint
ALTER TABLE "processing_runs" ADD COLUMN "error_message" text;--> statement-breakpoint
ALTER TABLE "processing_runs" ADD COLUMN "token_usage" jsonb;--> statement-breakpoint
ALTER TABLE "processing_runs" ADD CONSTRAINT "processing_runs_lens_report_id_lens_reports_id_fk" FOREIGN KEY ("lens_report_id") REFERENCES "public"."lens_reports"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "processing_runs_lens_report_idx" ON "processing_runs" USING btree ("lens_report_id");--> statement-breakpoint
CREATE INDEX "processing_runs_source_ids_gin_idx" ON "processing_runs" USING gin ("source_ids");--> statement-breakpoint
ALTER TABLE "processing_runs" DROP COLUMN "mode";--> statement-breakpoint
ALTER TABLE "processing_runs" DROP COLUMN "title";--> statement-breakpoint
ALTER TABLE "processing_runs" DROP COLUMN "analysis_result";--> statement-breakpoint
ALTER TABLE "processing_runs" DROP COLUMN "topic_clusters";