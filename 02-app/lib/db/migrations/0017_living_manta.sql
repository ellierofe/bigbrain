CREATE TABLE "client_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"name" text NOT NULL,
	"organisation_id" uuid NOT NULL,
	"brief" text,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"graph_node_id" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idea_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idea_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organisations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"name" text NOT NULL,
	"graph_node_id" varchar(100),
	"website" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"content_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_inputs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"source_document_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_missions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"mission_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_stats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"stat_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "client_projects" ADD CONSTRAINT "client_projects_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_projects" ADD CONSTRAINT "client_projects_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_projects" ADD CONSTRAINT "client_projects_graph_node_id_graph_nodes_id_fk" FOREIGN KEY ("graph_node_id") REFERENCES "public"."graph_nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_projects" ADD CONSTRAINT "idea_projects_idea_id_ideas_id_fk" FOREIGN KEY ("idea_id") REFERENCES "public"."ideas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_projects" ADD CONSTRAINT "idea_projects_project_id_client_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."client_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organisations" ADD CONSTRAINT "organisations_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organisations" ADD CONSTRAINT "organisations_graph_node_id_graph_nodes_id_fk" FOREIGN KEY ("graph_node_id") REFERENCES "public"."graph_nodes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_content" ADD CONSTRAINT "project_content_project_id_client_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."client_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_inputs" ADD CONSTRAINT "project_inputs_project_id_client_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."client_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_inputs" ADD CONSTRAINT "project_inputs_source_document_id_src_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."src_source_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_missions" ADD CONSTRAINT "project_missions_project_id_client_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."client_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_stats" ADD CONSTRAINT "project_stats_project_id_client_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."client_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_stats" ADD CONSTRAINT "project_stats_stat_id_src_statistics_id_fk" FOREIGN KEY ("stat_id") REFERENCES "public"."src_statistics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_projects_brand_idx" ON "client_projects" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "client_projects_org_idx" ON "client_projects" USING btree ("organisation_id");--> statement-breakpoint
CREATE INDEX "client_projects_status_idx" ON "client_projects" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idea_projects_idea_idx" ON "idea_projects" USING btree ("idea_id");--> statement-breakpoint
CREATE INDEX "idea_projects_project_idx" ON "idea_projects" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "organisations_brand_idx" ON "organisations" USING btree ("brand_id");--> statement-breakpoint
CREATE INDEX "project_content_project_idx" ON "project_content" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_content_content_idx" ON "project_content" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "project_inputs_project_idx" ON "project_inputs" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_inputs_source_idx" ON "project_inputs" USING btree ("source_document_id");--> statement-breakpoint
CREATE INDEX "project_missions_project_idx" ON "project_missions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_missions_mission_idx" ON "project_missions" USING btree ("mission_id");--> statement-breakpoint
CREATE INDEX "project_stats_project_idx" ON "project_stats" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_stats_stat_idx" ON "project_stats" USING btree ("stat_id");