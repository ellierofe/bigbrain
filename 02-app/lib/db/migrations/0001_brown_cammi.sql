CREATE TABLE "canonical_register" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"canonical_name" varchar(500) NOT NULL,
	"variations" text[] DEFAULT '{}' NOT NULL,
	"dedup_key" varchar(500) NOT NULL,
	"graph_node_id" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "canonical_register_dedup_key_unique" UNIQUE("dedup_key")
);
