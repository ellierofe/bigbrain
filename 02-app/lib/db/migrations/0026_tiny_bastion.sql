CREATE TABLE "generation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_type_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"parent_run_id" uuid,
	"status" varchar(20) DEFAULT 'generating' NOT NULL,
	"inputs" jsonb NOT NULL,
	"assembled_prompt" text,
	"fragment_versions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"model_used" varchar(100),
	"variants" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"error_text" text,
	"kept" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "generation_runs" ADD CONSTRAINT "generation_runs_content_type_id_content_types_id_fk" FOREIGN KEY ("content_type_id") REFERENCES "public"."content_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_runs" ADD CONSTRAINT "generation_runs_stage_id_prompt_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."prompt_stages"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_runs" ADD CONSTRAINT "generation_runs_parent_run_id_generation_runs_id_fk" FOREIGN KEY ("parent_run_id") REFERENCES "public"."generation_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "generation_runs_status_expires_at_idx" ON "generation_runs" USING btree ("status","expires_at");--> statement-breakpoint
CREATE INDEX "generation_runs_content_type_created_idx" ON "generation_runs" USING btree ("content_type_id","created_at");--> statement-breakpoint
CREATE INDEX "generation_runs_stage_idx" ON "generation_runs" USING btree ("stage_id");--> statement-breakpoint
CREATE INDEX "generation_runs_parent_run_idx" ON "generation_runs" USING btree ("parent_run_id");