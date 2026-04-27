CREATE TYPE "public"."mission_phase" AS ENUM('exploring', 'synthesising', 'producing', 'complete', 'paused');--> statement-breakpoint
CREATE TABLE "mission_contacts" (
	"mission_id" uuid NOT NULL,
	"contact_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mission_inputs" (
	"mission_id" uuid NOT NULL,
	"source_document_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mission_stats" (
	"mission_id" uuid NOT NULL,
	"stat_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mission_verticals" (
	"mission_id" uuid NOT NULL,
	"vertical_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "missions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"name" text NOT NULL,
	"thesis" text,
	"phase" "mission_phase" DEFAULT 'exploring' NOT NULL,
	"graph_node_id" varchar(100),
	"client_project_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verticals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"graph_node_id" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "verticals_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "mission_contacts" ADD CONSTRAINT "mission_contacts_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_contacts" ADD CONSTRAINT "mission_contacts_contact_id_contacts_id_fk" FOREIGN KEY ("contact_id") REFERENCES "public"."contacts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_inputs" ADD CONSTRAINT "mission_inputs_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_inputs" ADD CONSTRAINT "mission_inputs_source_document_id_src_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."src_source_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_stats" ADD CONSTRAINT "mission_stats_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_stats" ADD CONSTRAINT "mission_stats_stat_id_src_statistics_id_fk" FOREIGN KEY ("stat_id") REFERENCES "public"."src_statistics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_verticals" ADD CONSTRAINT "mission_verticals_mission_id_missions_id_fk" FOREIGN KEY ("mission_id") REFERENCES "public"."missions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mission_verticals" ADD CONSTRAINT "mission_verticals_vertical_id_verticals_id_fk" FOREIGN KEY ("vertical_id") REFERENCES "public"."verticals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "missions" ADD CONSTRAINT "missions_graph_node_id_graph_nodes_id_fk" FOREIGN KEY ("graph_node_id") REFERENCES "public"."graph_nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "verticals" ADD CONSTRAINT "verticals_graph_node_id_graph_nodes_id_fk" FOREIGN KEY ("graph_node_id") REFERENCES "public"."graph_nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "mission_contacts_mission_idx" ON "mission_contacts" USING btree ("mission_id");--> statement-breakpoint
CREATE INDEX "mission_contacts_contact_idx" ON "mission_contacts" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "mission_inputs_mission_idx" ON "mission_inputs" USING btree ("mission_id");--> statement-breakpoint
CREATE INDEX "mission_inputs_source_idx" ON "mission_inputs" USING btree ("source_document_id");--> statement-breakpoint
CREATE INDEX "mission_stats_mission_idx" ON "mission_stats" USING btree ("mission_id");--> statement-breakpoint
CREATE INDEX "mission_stats_stat_idx" ON "mission_stats" USING btree ("stat_id");--> statement-breakpoint
CREATE INDEX "mission_verticals_mission_idx" ON "mission_verticals" USING btree ("mission_id");--> statement-breakpoint
CREATE INDEX "mission_verticals_vertical_idx" ON "mission_verticals" USING btree ("vertical_id");--> statement-breakpoint
CREATE INDEX "missions_brand_idx" ON "missions" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "missions_phase_idx" ON "missions" USING btree ("phase");