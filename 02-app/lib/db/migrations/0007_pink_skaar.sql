ALTER TABLE "dna_business_overview" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "dna_brand_meaning" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "dna_value_proposition" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "dna_tov_samples" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "dna_knowledge_assets" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "src_own_research" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "src_source_documents" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "src_statistics" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "src_stories" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
ALTER TABLE "src_testimonials" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
CREATE INDEX "dna_business_overview_embedding_idx" ON "dna_business_overview" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "dna_brand_meaning_embedding_idx" ON "dna_brand_meaning" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "dna_value_proposition_embedding_idx" ON "dna_value_proposition" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "dna_tov_samples_embedding_idx" ON "dna_tov_samples" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "dna_knowledge_assets_embedding_idx" ON "dna_knowledge_assets" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "src_own_research_embedding_idx" ON "src_own_research" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "src_source_documents_embedding_idx" ON "src_source_documents" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "src_statistics_embedding_idx" ON "src_statistics" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "src_stories_embedding_idx" ON "src_stories" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "src_testimonials_embedding_idx" ON "src_testimonials" USING hnsw ("embedding" vector_cosine_ops);