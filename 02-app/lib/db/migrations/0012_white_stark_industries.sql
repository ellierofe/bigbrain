ALTER TABLE "processing_runs" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
CREATE INDEX "processing_runs_embedding_idx" ON "processing_runs" USING hnsw ("embedding" vector_cosine_ops);