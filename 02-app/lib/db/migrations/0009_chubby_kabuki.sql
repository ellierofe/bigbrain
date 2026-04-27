CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text,
	"organisation" text,
	"role" text,
	"graph_node_id" varchar(100),
	"krisp_participant_id" text,
	"contact_type" text,
	"tags" text[],
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meeting_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"name" text NOT NULL,
	"match_patterns" text[] DEFAULT '{}' NOT NULL,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"source_type_override" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pending_inputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"title" text NOT NULL,
	"input_date" date,
	"krisp_meeting_id" text,
	"raw_text" text,
	"extraction_result" jsonb NOT NULL,
	"participant_ids" uuid[],
	"tags" text[],
	"status" text DEFAULT 'pending' NOT NULL,
	"committed_at" timestamp with time zone,
	"source_document_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "src_source_documents" ADD COLUMN "krisp_meeting_id" text;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meeting_types" ADD CONSTRAINT "meeting_types_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_inputs" ADD CONSTRAINT "pending_inputs_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pending_inputs" ADD CONSTRAINT "pending_inputs_source_document_id_src_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."src_source_documents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contacts_brand_email_idx" ON "contacts" USING btree ("brand_id","email");--> statement-breakpoint
CREATE INDEX "contacts_brand_name_idx" ON "contacts" USING btree ("brand_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "pending_inputs_brand_krisp_idx" ON "pending_inputs" USING btree ("brand_id","krisp_meeting_id");--> statement-breakpoint
CREATE INDEX "pending_inputs_brand_status_idx" ON "pending_inputs" USING btree ("brand_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "src_source_documents_brand_krisp_idx" ON "src_source_documents" USING btree ("brand_id","krisp_meeting_id");--> statement-breakpoint
CREATE INDEX "contacts_name_trgm_idx" ON "contacts" USING gin ("name" gin_trgm_ops);