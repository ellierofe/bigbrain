ALTER TABLE "conversations" ADD COLUMN "skill_id" text;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "skill_state" jsonb;--> statement-breakpoint
CREATE INDEX "conversations_skill_id_idx" ON "conversations" USING btree ("skill_id");