CREATE TABLE "topic_paths" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parent_id" uuid,
	"path" varchar(200) NOT NULL,
	"step_level" integer NOT NULL,
	"category" varchar(50) NOT NULL,
	"label" varchar(200) NOT NULL,
	"surface_kind" varchar(20) NOT NULL,
	"data_query" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"has_data_check" jsonb,
	"multi_select" boolean DEFAULT false NOT NULL,
	"prompt_template" text,
	"next_step_id" uuid,
	"display_order" integer DEFAULT 0 NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "topic_paths" ADD CONSTRAINT "topic_paths_parent_id_topic_paths_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."topic_paths"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "topic_paths" ADD CONSTRAINT "topic_paths_next_step_id_topic_paths_id_fk" FOREIGN KEY ("next_step_id") REFERENCES "public"."topic_paths"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "topic_paths_path_idx" ON "topic_paths" USING btree ("path");--> statement-breakpoint
CREATE INDEX "topic_paths_parent_display_order_idx" ON "topic_paths" USING btree ("parent_id","display_order");--> statement-breakpoint
CREATE INDEX "topic_paths_category_status_step_idx" ON "topic_paths" USING btree ("category","status","step_level");--> statement-breakpoint
CREATE INDEX "topic_paths_step_level_status_idx" ON "topic_paths" USING btree ("step_level","status");