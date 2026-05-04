---
status: approved
table: src_source_chunks
type: source-knowledge
related_features: INP-12, RET-01, KG-01, VEC-01
last_updated: 2026-05-01
depends_on: src-source-documents.md, ADR-002a, ADR-009
---

# Schema: src_source_chunks

Source knowledge. One row per semantic chunk of a source document. A chunk is a passage-grain unit of a source — a speaker turn in a transcript, a paragraph in a document, a slide in a pitch deck, a section in a report. Chunks exist so retrieval can operate at passage granularity (find the specific quote, the specific paragraph) rather than at source-document granularity, which is too coarse for a 100k-character interview to be useful.

Each chunk has its own embedding. Each chunk is mirrored as a `SourceChunk` graph node (per ADR-002a) and linked to its parent `SourceDocument` graph node via a `PART_OF` edge. Postgres is the authority for the chunk text; FalkorDB is the authority for the relationship traversal.

Chunks are immutable once written. If the chunking strategy for a source changes (e.g. better speaker-turn detection, or a re-summarisation pass triggers a re-chunk), all chunks for that source are deleted and regenerated as a unit — never edited in place. This keeps `position` ordinals stable and avoids drift between chunk text, embedding, and parent source.

## Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | Same UUID is used as the SourceChunk graph node id (matches the `src_source_documents` ↔ `SourceDocument` pattern). |
| `brandId` | uuid | not null, FK → `brands.id` cascade delete | Owning brand |
| `sourceDocumentId` | uuid | not null, FK → `src_source_documents.id` cascade delete | Parent source. Cascade ensures chunks die with their source. |
| `position` | integer | not null | Ordinal position within the parent source, starting at 0. Stable across re-chunks (re-chunking deletes and replaces the whole set). |
| `chunkType` | varchar(20) | not null | `speaker-turn \| paragraph \| section \| slide \| row \| item`. Determined by parent source type. |
| `text` | text | not null | The verbatim chunk content. Not paraphrased, not summarised — exact text from the source. |
| `speaker` | varchar(200) | nullable | Speaker name for `speaker-turn` chunks (transcripts). Null for other chunk types. Free-form text at this stage; canonical Person resolution happens at processing time, not chunk time. |
| `startOffset` | integer | nullable | Character offset into parent's `extracted_text` where this chunk begins. Enables traceability back to the original. Null if offset can't be determined (e.g. for collection items where there's no parent text). |
| `endOffset` | integer | nullable | Character offset where this chunk ends. |
| `tokenCount` | integer | nullable | Approximate token count for the chunk text. Useful for retrieval budgeting. |
| `metadata` | jsonb | not null, default '{}' | Chunk-type-specific properties. Examples: `{ slideNumber: 3, slideTitle: "Market opportunity" }` for pitch-deck slides; `{ sectionHeading: "Methodology" }` for report sections. |
| `embedding` | vector(1536) | nullable | OpenAI `text-embedding-3-small`. Generated at write time. Nullable so chunks can be inserted before embedding completes (background backfill pattern, same as RET-01). |
| `embeddingGeneratedAt` | timestamp with tz | nullable | Set when embedding is populated. Supports re-embedding under model changes. |
| `createdAt` | timestamp with tz | not null, defaultNow | |

No `updatedAt` — chunks are immutable. No `isArchived` — soft-delete handled at the parent source level.

## Indexes

- PK on `id`
- FK index on `(brandId, sourceDocumentId)`
- Composite index on `(sourceDocumentId, position)` — supports "give me chunks 0..N of this source" in order
- HNSW index on `embedding` (vector_cosine_ops) — semantic search
- Optional partial index on `(sourceDocumentId)` where `embedding IS NULL` — supports finding unembedded chunks for backfill

## Relationships

- Child of `src_source_documents` (FK + cascade)
- Mirrored as `SourceChunk` graph node in FalkorDB + `graph_nodes` mirror (per ADR-002a)
- Linked to parent SourceDocument graph node via `PART_OF` edge
- Can be the target of `DERIVED_FROM` edges from extracted Idea/Concept/Methodology nodes when an item is sourced from a specific chunk (finer provenance grain than source-level)

## Chunking rules per source type

Set at ingest time by the chunker, recorded in `chunkType`. Per INP-12 brief:

| Source type | Chunking strategy | `chunkType` value |
|---|---|---|
| `transcript` (any sub-flavour: client-interview, coaching-call, peer-conversation, supplier-conversation, accountability-checkin, meeting-notes) | Per speaker turn. Speaker name captured in `speaker` field. | `speaker-turn` |
| `internal-notes`, `voice-note`, `content-idea` | Per paragraph (double-newline split, with single-newline merge for short fragments). | `paragraph` |
| `research-document`, `report` | Per paragraph, with `metadata.sectionHeading` carrying the nearest heading above for context. | `paragraph` |
| `pitch-deck` | Per slide. `metadata.slideNumber` and `metadata.slideTitle` populated. | `slide` |
| `dataset` | Not chunked — datasets become nodes/edges/properties via dedicated ingestion scripts (per ADR-007 / SKL-09 pattern). No `src_source_chunks` rows. | n/a |
| `collection` | Not chunked — each `SourceItem` is its own embedded unit (one item = one row in a sibling table per INP-12 schema doc, not in `src_source_chunks`). | n/a |

The chunker lives in `lib/processing/chunk.ts` (to be implemented) and dispatches on the parent source's `sourceType`. The chunker is deterministic: same input → same chunks → same `position` ordinals.

## Notes

- **Why a separate table rather than chunks-on-source as JSONB?** Embeddings need pgvector columns. Per-row queries (e.g. "find similar chunks across all sources") need indexable rows, not nested JSON. Cascade delete on `sourceDocumentId` keeps the join cheap.
- **Why same UUID as the graph node id?** Matches the existing `SourceDocument` pattern (`commit.ts` line 90). Lets us write the chunk row first, then the graph node, with no second lookup. Same trade-off (UUID conflict surface) and same mitigation (UUIDs don't collide in practice).
- **Why no `description` column?** The `text` field *is* the description. The graph node `description` property uses `text` truncated to ~200 chars at write time, per ADR-002a §4.
- **Embedding text composition:** for chunks, the embedding is generated from `text` directly (no `name + text` prefix). The chunk has no separate name beyond an auto-generated label like `"<source title> [chunk N: <speaker?>]"` — that label is for graph node `name`, not for embedding.
- **Re-chunking flow** (rare): delete all chunks where `sourceDocumentId = X`, run the chunker, insert new chunks. The corresponding SourceChunk graph nodes + edges are also wiped and rewritten. Postgres FK cascade and graph-write atomicity (per `writeBatch()` in `lib/graph/write.ts`) make this safe.
- **What chunks can NOT carry:** any LLM-inferred property about external entities. The `text` is verbatim. `metadata` only carries structural facts from the source (slide number, section heading). Per ADR-002a §3, the only LLM-touched property allowed is `description` on the graph node, and only as a faithful summary of `text`.
