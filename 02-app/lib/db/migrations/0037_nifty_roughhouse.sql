CREATE TABLE "entity_writes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"op" text NOT NULL,
	"field" text,
	"before" jsonb,
	"after" jsonb NOT NULL,
	"actor" text NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pending_writes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"op" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "metadata" jsonb;--> statement-breakpoint
ALTER TABLE "entity_writes" ADD CONSTRAINT "entity_writes_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_writes" ADD CONSTRAINT "pending_writes_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entity_writes_lookup_idx" ON "entity_writes" USING btree ("brand_id","entity_type","entity_id","at");--> statement-breakpoint
CREATE INDEX "pending_writes_conversation_status_idx" ON "pending_writes" USING btree ("conversation_id","status");