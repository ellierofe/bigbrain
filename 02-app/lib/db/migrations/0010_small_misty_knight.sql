ALTER TABLE "graph_nodes" ADD COLUMN "embedding" vector(1536);--> statement-breakpoint
CREATE INDEX "graph_nodes_embedding_idx" ON "graph_nodes" USING hnsw ("embedding" vector_cosine_ops);