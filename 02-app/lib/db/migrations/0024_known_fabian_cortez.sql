CREATE TYPE "public"."stage_kind" AS ENUM('single', 'blueprint', 'copy', 'synthesis');--> statement-breakpoint
CREATE TABLE "prompt_stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_type_id" uuid NOT NULL,
	"stage_order" integer NOT NULL,
	"stage_kind" "stage_kind" NOT NULL,
	"persona_fragment_id" uuid NOT NULL,
	"worldview_fragment_id" uuid,
	"task_framing" text NOT NULL,
	"structural_skeleton" text NOT NULL,
	"craft_fragment_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"output_contract_fragment_id" uuid NOT NULL,
	"output_contract_extras" text,
	"default_model" varchar(100),
	"min_tokens" integer,
	"max_tokens" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prompt_stages" ADD CONSTRAINT "prompt_stages_content_type_id_content_types_id_fk" FOREIGN KEY ("content_type_id") REFERENCES "public"."content_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_stages" ADD CONSTRAINT "prompt_stages_persona_fragment_id_prompt_fragments_id_fk" FOREIGN KEY ("persona_fragment_id") REFERENCES "public"."prompt_fragments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_stages" ADD CONSTRAINT "prompt_stages_worldview_fragment_id_prompt_fragments_id_fk" FOREIGN KEY ("worldview_fragment_id") REFERENCES "public"."prompt_fragments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_stages" ADD CONSTRAINT "prompt_stages_output_contract_fragment_id_prompt_fragments_id_fk" FOREIGN KEY ("output_contract_fragment_id") REFERENCES "public"."prompt_fragments"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "prompt_stages_content_type_stage_order_idx" ON "prompt_stages" USING btree ("content_type_id","stage_order");--> statement-breakpoint
CREATE INDEX "prompt_stages_persona_fragment_idx" ON "prompt_stages" USING btree ("persona_fragment_id");--> statement-breakpoint
CREATE INDEX "prompt_stages_worldview_fragment_idx" ON "prompt_stages" USING btree ("worldview_fragment_id");--> statement-breakpoint
CREATE INDEX "prompt_stages_output_contract_fragment_idx" ON "prompt_stages" USING btree ("output_contract_fragment_id");