CREATE TABLE "src_source_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"brand_id" uuid NOT NULL,
	"source_document_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"chunk_type" varchar(20) NOT NULL,
	"text" text NOT NULL,
	"speaker" varchar(200),
	"start_offset" integer,
	"end_offset" integer,
	"token_count" integer,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"embedding" vector(1536),
	"embedding_generated_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "src_source_chunks" ADD CONSTRAINT "src_source_chunks_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "src_source_chunks" ADD CONSTRAINT "src_source_chunks_source_document_id_src_source_documents_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."src_source_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "src_source_chunks_embedding_idx" ON "src_source_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "src_source_chunks_source_position_idx" ON "src_source_chunks" USING btree ("source_document_id","position");--> statement-breakpoint
CREATE INDEX "src_source_chunks_brand_source_idx" ON "src_source_chunks" USING btree ("brand_id","source_document_id");