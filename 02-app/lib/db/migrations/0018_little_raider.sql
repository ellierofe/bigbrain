CREATE TABLE "idea_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idea_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "idea_tags" ADD CONSTRAINT "idea_tags_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idea_tags_unique_idx" ON "idea_tags" USING btree ("idea_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idea_tags_idea_idx" ON "idea_tags" USING btree ("idea_id");--> statement-breakpoint
CREATE INDEX "idea_tags_entity_idx" ON "idea_tags" USING btree ("entity_type","entity_id");