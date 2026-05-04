ALTER TABLE "brands" ADD COLUMN "chat_pane_open" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "brands" ADD COLUMN "chat_pane_width" integer DEFAULT 360 NOT NULL;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "context_pane_state" jsonb;