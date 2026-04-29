CREATE TABLE "generation_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generation_run_id" uuid,
	"content_type_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"model_used" varchar(100) NOT NULL,
	"status" varchar(20) NOT NULL,
	"error_class" varchar(50),
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"total_tokens" integer,
	"cost_usd" numeric(10, 6),
	"latency_ms" integer,
	"variant_count" integer NOT NULL,
	"streaming_mode" varchar(20),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "generation_logs" ADD CONSTRAINT "generation_logs_generation_run_id_generation_runs_id_fk" FOREIGN KEY ("generation_run_id") REFERENCES "public"."generation_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_logs" ADD CONSTRAINT "generation_logs_content_type_id_content_types_id_fk" FOREIGN KEY ("content_type_id") REFERENCES "public"."content_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_logs" ADD CONSTRAINT "generation_logs_stage_id_prompt_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."prompt_stages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "generation_logs_content_type_created_idx" ON "generation_logs" USING btree ("content_type_id","created_at");--> statement-breakpoint
CREATE INDEX "generation_logs_model_created_idx" ON "generation_logs" USING btree ("model_used","created_at");--> statement-breakpoint
CREATE INDEX "generation_logs_status_created_idx" ON "generation_logs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "generation_logs_created_idx" ON "generation_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "generation_logs_generation_run_idx" ON "generation_logs" USING btree ("generation_run_id");