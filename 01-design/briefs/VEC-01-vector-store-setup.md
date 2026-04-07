# Vector Store Setup Brief
Feature ID: VEC-01
Status: complete
Last updated: 2026-04-01

## Summary
Enable pgvector in Neon and wire up an embedding pipeline so that text content can be stored as semantic vectors and retrieved by similarity. VEC-01 is the infrastructure layer: extension enabled, `embedding` columns added to relevant tables, a single `generateEmbedding()` function that calls the model and returns a vector, and a basic cosine similarity query helper. VEC-02 (semantic search API) builds the full retrieval interface on top of this.

## Use cases
- INP-03 (input processing pipeline) calls `generateEmbedding()` to embed extracted ideas and source documents as they're ingested
- RET-01 (unified retrieval) uses the similarity query helper to find semantically relevant content
- Content generation (OUT-02) uses retrieval to pull relevant source knowledge ingredients
- Chat (OUT-01) uses retrieval to answer "what do I know about X?" queries
- `dna_tov_samples.embedding` is needed to support future ToV similarity matching (deferred from DNA-01)

## User journey
No user-facing journey. This is a pure infrastructure deliverable.

Deliverables:
1. pgvector extension confirmed enabled on Neon `neondb` database
2. `embedding` columns added to all relevant tables (migration 0007)
3. `lib/llm/embeddings.ts` — `generateEmbedding(text: string): Promise<number[]>` using OpenAI `text-embedding-3-small`
4. `lib/retrieval/similarity.ts` — `findSimilar(embedding, table, limit)` cosine similarity query helper
5. `lib/retrieval/index.ts` — clean re-exports

## Data model

### Embedding columns to add (migration 0007)

All columns: `embedding vector(1536)`, nullable (populated async after insert, not at insert time).

| Table | Column | Text source field |
|---|---|---|
| `dna_tov_samples` | `embedding` | `sampleText` |
| `dna_business_overview` | `embedding` | `fullDescription` (fallback: `shortDescription`) |
| `dna_brand_meaning` | `embedding` | `meaningStatement` + `purposeStatement` (concatenated) |
| `dna_value_proposition` | `embedding` | `corePromise` + `fullStatement` (concatenated) |
| `dna_knowledge_assets` | `embedding` | `description` + `summary` (concatenated) |
| `src_source_documents` | `embedding` | `extractedText` |
| `src_statistics` | `embedding` | `statementText` + `context` (concatenated) |
| `src_testimonials` | `embedding` | `quoteText` |
| `src_stories` | `embedding` | `bodyText` |
| `src_own_research` | `embedding` | `summary` + `keyFindings` (concatenated) |

### HNSW indexes

One HNSW index per embedding column using `vector_cosine_ops`. Index parameters: `m = 16`, `ef_construction = 64` (pgvector defaults — sufficient for this data volume).

### `graph_nodes` embedding (deferred)

`graph_nodes.embedding` is deferred to KG-02. Ideas and Concepts extracted by INP-03 land in both FalkorDB and the `graph_nodes` mirror — the mirror can carry an embedding column, but that belongs in the KG-02/INP-03 scope rather than here.

## Embedding model

**Model:** OpenAI `text-embedding-3-small`
**Dimensions:** 1536
**Provider:** OpenAI API via `@ai-sdk/openai`
**Cost:** $0.02 / 1M tokens
**Env var:** `OPENAI_API_KEY` (add to `.env.local` + Vercel)

The `MODELS` constants in `lib/llm/client.ts` already define Anthropic, Google, and xAI clients. The embedding client will be a separate export in `lib/llm/embeddings.ts` — not added to `client.ts` since embeddings are a distinct concern from chat/generation.

## `generateEmbedding()` function

```ts
// lib/llm/embeddings.ts
generateEmbedding(text: string): Promise<number[]>
```

- Takes a string, returns a 1536-dimension float array
- Truncates input to 8191 tokens (model limit) — use character count approximation (1 token ≈ 4 chars), not a full tokeniser
- Used by: INP-03 (ingestion), any future background job that backfills embeddings

## `findSimilar()` query helper

```ts
// lib/retrieval/similarity.ts
findSimilar(
  embedding: number[],
  table: EmbeddableTable,
  options?: { limit?: number; threshold?: number }
): Promise<SimilarityResult[]>
```

- `EmbeddableTable` — union type of all tables with embedding columns
- Uses `<=>` (cosine distance) operator
- Default limit: 10. Default threshold: none (return top-N regardless of score)
- Returns: `{ id, score, ...selectedFields }` — which fields are returned depends on the table
- Thin helper only — not a full retrieval layer (that's VEC-02/RET-01)

## Update behaviour

Embedding columns are populated async — not at the time a row is inserted. Pattern:
1. Row inserted without embedding (column is nullable, defaults to null)
2. Background job or post-insert hook calls `generateEmbedding()` and updates the row
3. INP-03 will handle this inline during ingestion for source documents
4. For existing DNA rows (inserted before VEC-01): a one-off backfill script runs after migration

Embeddings are regenerated if the source text field changes (caller's responsibility to trigger this — no auto-trigger at DB level in v1).

## Relationships
### Knowledge graph (FalkorDB)
None directly. `graph_nodes.embedding` is deferred to KG-02.

### Postgres
- Migration 0007 adds `embedding vector(1536)` to 10 tables
- All tables already exist (created in migrations 0001–0006)
- Migration is purely additive — no existing columns modified

## Edge cases
- **Null text source field:** If the source text field is null (e.g. `src_source_documents.extractedText` not yet populated), skip embedding generation silently. Do not embed empty strings.
- **Text too long:** Truncate at ~32,000 characters (≈8000 tokens) before sending to the API. Log a warning but don't fail.
- **API failure:** `generateEmbedding()` throws — callers must handle. INP-03 should catch and leave the embedding null rather than failing the whole ingestion.
- **pgvector not enabled:** Migration 0007 will fail with `type "vector" does not exist`. Confirm extension is live before applying — `SELECT * FROM pg_extension WHERE extname = 'vector'`. It was enabled during INF-02 setup; verify rather than assume.

## Out of scope
- Full semantic search API — that's VEC-02
- Unified retrieval (combining vector + graph + structured queries) — that's RET-01
- `graph_nodes.embedding` — deferred to KG-02
- Streaming or batch embedding jobs — VEC-01 is the synchronous single-item function; batch jobs come later
- Embedding versioning / re-embedding on model change — not needed at this scale now
- Hybrid search (vector + full-text BM25) — future enhancement

## Open questions / TBDs
None — all decisions made in briefing.

## Decisions log
- 2026-04-01: Briefed. OpenAI `text-embedding-3-small` chosen (cheapest, 1536 dims, well-tested with pgvector HNSW). Embedding columns on 10 tables covering DNA singles, source knowledge, and ToV samples. `graph_nodes.embedding` deferred to KG-02. Basic `findSimilar()` folded into VEC-01 scope.
- 2026-04-01: Brief approved. pgvector 0.8.0 confirmed live on Neon (extname=vector, extversion=0.8.0). Status → in-progress.
- 2026-04-01: Build complete. Migration 0007 applied (10 ADD COLUMN + 10 CREATE INDEX HNSW). All verified in Neon. `lib/llm/embeddings.ts`, `lib/retrieval/similarity.ts`, `lib/retrieval/index.ts` created. `@ai-sdk/openai` installed. `OPENAI_API_KEY` placeholder added to `.env.local` — must be set before embeddings will work. Status → complete.
