ALTER TABLE "dna_knowledge_assets" ADD COLUMN "voc_mapping" jsonb;--> statement-breakpoint
ALTER TABLE "dna_knowledge_assets" ADD COLUMN "source_document_ids" uuid[];