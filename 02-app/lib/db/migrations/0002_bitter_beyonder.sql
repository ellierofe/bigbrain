CREATE TABLE "graph_edges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_node_id" varchar(100) NOT NULL,
	"to_node_id" varchar(100) NOT NULL,
	"relationship_type" varchar(100) NOT NULL,
	"description" text,
	"source" varchar(100),
	"properties" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "graph_nodes" (
	"id" varchar(100) PRIMARY KEY NOT NULL,
	"label" varchar(100) NOT NULL,
	"name" varchar(500) NOT NULL,
	"description" text,
	"source" varchar(100),
	"file_ref" varchar(500),
	"properties" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "graph_edges" ADD CONSTRAINT "graph_edges_from_node_id_graph_nodes_id_fk" FOREIGN KEY ("from_node_id") REFERENCES "public"."graph_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "graph_edges" ADD CONSTRAINT "graph_edges_to_node_id_graph_nodes_id_fk" FOREIGN KEY ("to_node_id") REFERENCES "public"."graph_nodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "graph_edges_from_idx" ON "graph_edges" USING btree ("from_node_id");--> statement-breakpoint
CREATE INDEX "graph_edges_to_idx" ON "graph_edges" USING btree ("to_node_id");--> statement-breakpoint
CREATE INDEX "graph_edges_type_idx" ON "graph_edges" USING btree ("relationship_type");--> statement-breakpoint
CREATE INDEX "graph_nodes_label_idx" ON "graph_nodes" USING btree ("label");--> statement-breakpoint
CREATE INDEX "graph_nodes_name_idx" ON "graph_nodes" USING btree ("name");