# Unified Retrieval Layer Brief
Feature ID: RET-01
Status: approved
Last updated: 2026-04-20

## Summary

A single retrieval interface that combines vector search (semantic), graph traversal (relational), and Postgres queries (structured) to provide context for chat, content creation, and processing. Consumers call retrieval functions or the LLM invokes them as tools — the retrieval layer handles ranking, deduplication, and source attribution. Designed to scale from ~300 to 30,000+ graph nodes and to adapt as the schema evolves with new node types, relationship types, and data sources.

## Use cases

### UC-1: Chat context injection (primary)
- **Who:** The chat LLM (OUT-01), via tool calls
- **When:** User asks a question in chat ("what do I know about reshoring?", "what have I said about AI security?")
- **What happens:** LLM decides which retrieval tools to call based on the query. Results are injected as context for the response. Multiple tool calls may chain — e.g. semantic search finds a node, then graph traversal finds connected nodes.
- **Priority:** v1

### UC-2: Explicit context binding (chat + content)
- **Who:** The user, via UI selection (topic bar / context picker)
- **When:** User selects specific DNA items, source knowledge, or graph nodes as focus context before chatting or creating content
- **What happens:** Selected items are loaded directly by ID — no search involved. The retrieval layer provides `getDnaItem(type, id)` and similar structured accessors.
- **Note:** The legacy Moogul system had a 3-level drill-down: category → specific item → detail facet (e.g. Audience → "Scale-up CEOs" → Pain points). BigBrain should support the same pattern. The UI design lives in OUT-01/OUT-02 briefs; RET-01 provides the data access functions.
- **Priority:** v1

### UC-3: Content creation context assembly
- **Who:** The content creation system (OUT-02), automatically
- **When:** User creates content (LinkedIn post, sales page, blog post, email sequence)
- **What happens:** Context is assembled from multiple sources based on content type:
  - **Always loaded:** Tone of voice, banned words, relevant copywriting guidance (from prompt library)
  - **Loaded based on selections:** Audience segment, offer, methodology, content pillar, platform — whichever the content type requires
  - **Searched:** Relevant testimonials, statistics, stories, graph knowledge (via vector search scoped to the topic)
  - **Structured differently by content type:** Sales pages need offer data + objections + social proof. Social posts need topic + audience + hooks. Email sequences need offer + journey stage.
- **Note:** The legacy system had per-content-type prompt templates that specified which data to load and which copywriting techniques to inject. BigBrain's equivalent is a content type registry that declares its retrieval requirements.
- **Priority:** v1 (basic), full content type registry is OUT-02

### UC-4: Sub-agent retrieval (chat + content)
- **Who:** The LLM, autonomously during a response
- **When:** The LLM realises mid-response it needs more context ("let me check if there are testimonials about this")
- **What happens:** LLM calls retrieval tools (same ones as UC-1) to fetch additional context, then incorporates it. Multi-step tool use — the AI SDK handles chaining natively.
- **Priority:** v1 (same tools as UC-1, no additional work)

### UC-5: Processing context injection (INP-09)
- **Who:** The extraction pipeline, before running LLM extraction
- **When:** A source document is being processed (individual extraction mode)
- **What happens:** Retrieval injects: (a) relevant DNA context (business overview, audience segments) so the LLM can judge relevance, (b) existing graph nodes with similar names/descriptions so the LLM can merge rather than duplicate.
- **Priority:** v2 — depends on INP-09 being built. The retrieval functions exist in v1; the integration is INP-09's job.

### UC-6: Dedup similarity check
- **Who:** The extraction pipeline or the review UI
- **When:** Before committing extracted items to the graph, or during queue review (INP-10)
- **What happens:** Vector similarity search against existing graph nodes to surface near-duplicates. User decides whether to merge or create new.
- **Note:** `findSimilarNodes()` already exists and handles this. RET-01 doesn't need to add much — the function is there, INP-10 will build the UI around it.
- **Priority:** Already exists for basic case. INP-10 adds the review UI.

### UC-7: Graph exploration
- **Who:** The user, via the graph explorer (KG-03)
- **When:** User wants to browse connected knowledge — "show me everything connected to this person" or "what topics cluster together"
- **What happens:** Graph traversal from a starting node, N hops out. Returns connected nodes with relationship types and descriptions.
- **Priority:** v2 — KG-03 is a separate feature. RET-01 provides the traversal functions.

### UC-8: Analysis result retrieval
- **Who:** Chat LLM or user browsing
- **When:** "What themes came up across my mastermind calls?" — could be answered by retrieving an existing batch analysis rather than re-running
- **What happens:** Search `processing_runs` for relevant analysis results. Once analysis → graph commit is wired (M2 deferred item), these also become graph nodes and are searchable via UC-1.
- **Priority:** v1 (simple — just include `processing_runs` in searchable tables)

## Retrieval modes

The layer provides three retrieval modes. Consumers can use them independently or combine results.

### Mode 1: Semantic search (vector)
- Embed the query, search across all embeddable tables
- **Cross-table search:** Unlike the current `findSimilar()` which searches one table at a time, RET-01 provides a unified search that queries multiple tables in parallel and merges results
- **Tables searched:** `graph_nodes`, `src_source_documents`, `src_statistics`, `src_testimonials`, `src_stories`, `src_own_research`, `processing_runs` (analysis results), and optionally DNA tables
- **Filtering:** By source type, date range, tags, node label
- **Returns:** Ranked results with score, source type, source ID, label/title, snippet, and metadata

### Mode 2: Structured lookup (Postgres)
- Load specific records by type and ID
- **DNA accessors:** `getDna(type, id?)` — returns structured DNA data. When `id` is omitted, returns the singular item (business overview, value prop) or list of items (audience segments, offers)
- **Source knowledge accessors:** `getSource(type, id?)` — returns source documents, statistics, testimonials, stories, research
- **Graph node lookup:** `getNode(id)` — returns node with all properties, plus immediate connections (1-hop edges)
- **Processing run lookup:** `getRun(id)` — returns analysis result
- **Filtering:** By brand, tags, archived status, date range

### Mode 3: Graph traversal (FalkorDB)
- Traverse from a starting node through relationships
- **Operations:**
  - `traverseFrom(nodeId, depth?, relationshipTypes?, nodeLabels?)` — return connected subgraph
  - `findPaths(fromNodeId, toNodeId, maxDepth?)` — shortest path(s) between two nodes
  - `getNeighbourhood(nodeId)` — 1-hop connections with relationship metadata
- **Uses FalkorDB** for multi-hop traversal (where it has a genuine advantage over SQL)
- **Falls back to Neon mirror** for 1-hop lookups and when FalkorDB is unavailable
- **Returns:** Nodes and edges with full metadata

## LLM tool interface

For chat (OUT-01), retrieval is exposed as LLM tools. The LLM decides when and how to call them.

### Tool: `search_knowledge`
```typescript
{
  query: string           // natural language search query
  filters?: {
    types?: string[]      // e.g. ['Idea', 'Concept', 'Person'] or ['testimonial', 'statistic']
    dateRange?: { from?: string, to?: string }
    tags?: string[]
  }
  limit?: number          // default 10
}
```
Runs Mode 1 (semantic search) across all relevant tables. Returns ranked results with source attribution.

### Tool: `get_brand_dna`
```typescript
{
  dnaType: 'business_overview' | 'brand_meaning' | 'value_proposition' | 'brand_identity'
         | 'audience_segments' | 'offers' | 'methodologies' | 'content_pillars'
         | 'platforms' | 'lead_magnets' | 'tone_of_voice' | 'competitors'
  itemId?: string         // for plural types — omit to get all items of this type
  facet?: string          // e.g. 'pain_points', 'faqs', 'features' — for drill-down
}
```
Runs Mode 2 (structured lookup). Returns the requested DNA data.

### Tool: `get_source_knowledge`
```typescript
{
  sourceType: 'documents' | 'statistics' | 'testimonials' | 'stories' | 'research' | 'analysis'
  itemId?: string
  query?: string          // optional — if provided, vector search within this source type
}
```
Mode 2 (by ID) or Mode 1 (by query within a source type).

### Tool: `explore_graph`
```typescript
{
  nodeId: string
  depth?: number          // default 1, max 3
  relationshipTypes?: string[]  // filter to specific edge types
  nodeLabels?: string[]         // filter to specific node types
}
```
Runs Mode 3 (graph traversal). Returns the connected subgraph.

### Tool design principles
- **The LLM decides which tools to call.** Retrieval doesn't try to guess what's needed — it provides clean tools and lets the model reason.
- **Tools can chain.** The AI SDK supports multi-step tool use. The LLM can search → find a node → explore its graph neighbourhood in a single response turn.
- **Every result includes source attribution.** Type, ID, name, date, confidence score, and a `reason` field explaining why this result was included (populated by the retrieval layer for search results, or "explicitly requested" for lookups).

## Source attribution

Every retrieval result carries attribution metadata:

```typescript
interface RetrievalSource {
  id: string
  type: 'graph_node' | 'dna' | 'source_document' | 'statistic' | 'testimonial'
       | 'story' | 'research' | 'analysis' | 'processing_run'
  subtype?: string        // e.g. node label ('Idea', 'Person'), DNA type, source type
  name: string            // human-readable label
  date?: string           // created or document date
  score?: number          // similarity score (0-1) for search results, absent for lookups
  reason: string          // why this was retrieved ("semantic match", "graph neighbour of X", "explicitly requested")
  snippet?: string        // text excerpt used for context
  url?: string            // internal link to view this item in the dashboard
}
```

For chat responses, sources are collected during retrieval and returned alongside the response. The chat UI displays them as a non-intrusive indicator (icon/popover) — not inline citations. Source display design is OUT-01's concern.

## Ranking and merging

When semantic search returns results from multiple tables:

1. **Score normalisation:** Cosine similarity scores from different tables are already on the same scale (0-1), so no normalisation needed.
2. **Type-aware boosting:** Configurable per use case. Example:
   - Strategy discussion: DNA entries boosted +0.1, source docs unchanged
   - Content creation: Testimonials/stats boosted +0.1, graph nodes unchanged
   - General query: No boosting, pure similarity ranking
3. **Deduplication:** If a graph node and a source document refer to the same entity (matched via `canonical_register` or high similarity), merge them — return the richer record with both sources noted.
4. **Recency signal:** Optional recency boost — items from the last 30 days get a small bump. Configurable, off by default.
5. **Result limit:** Default 10 per search. Configurable up to 50. LLM can issue multiple searches if it needs more.

## Data model / fields

RET-01 does not create new tables. It queries existing tables:

| Table | What it provides | Embedding column |
|---|---|---|
| `graph_nodes` | Knowledge graph nodes (ideas, concepts, people, orgs...) | `embedding` (1536) |
| `graph_edges` | Relationships between nodes | — |
| `src_source_documents` | Transcripts, documents, research files | `embedding` (1536) |
| `src_statistics` | Data points and stats | `embedding` (1536) |
| `src_testimonials` | Client quotes and social proof | `embedding` (1536) |
| `src_stories` | Narratives for content | `embedding` (1536) |
| `src_own_research` | Original studies and analyses | `embedding` (1536) |
| `processing_runs` | Analysis results from INP-11 | needs `embedding` column — add in v1 |
| `dna_*` (15 tables) | Brand DNA structured data | 5 have embeddings, rest are structured lookup |
| `canonical_register` | Entity resolution / dedup | — |

### New column needed
- `processing_runs.embedding` (vector 1536) — for semantic search over analysis results. Add via migration.

### No new tables
Retrieval is a read layer over existing storage.

## Schema adaptability

The retrieval layer must handle schema evolution gracefully — new node types, new relationship types, new properties, new data sources.

### Design for adaptability:
1. **Graph queries are label-agnostic by default.** `search_knowledge` searches all node labels unless filtered. Adding a new node type to ADR-002 automatically makes it searchable — no retrieval code changes needed.
2. **Embeddable table registry.** A configuration object lists which tables are searchable and how to extract labels/snippets from them. Adding a new source type means adding one entry to this registry.
3. **LLM tool schemas are declarative.** The `dnaType` and `sourceType` enums in tool definitions are the only places that need updating when new types are added. These can be derived from the schema at build time rather than hardcoded.
4. **Graph traversal is type-agnostic.** `traverseFrom()` traverses all relationship types by default. New relationship types in FalkorDB are automatically traversable.
5. **Embedding generation at write time.** Every graph node write and source document write generates an embedding. No backfill needed for new data. (Requires a small change to `writeNode()` in `lib/graph/write.ts`.)

### Political KG migration considerations:
- New node types (e.g. `Politician`, `Committee`, `Constituency`, `Bill`) will need adding to `NodeLabel` in `types.ts` and ADR-002. Retrieval handles them automatically once they exist.
- At 30k+ nodes, vector search performance depends on HNSW index quality. Current index is already configured (`vector_cosine_ops`). May need `ef_search` tuning at scale — measure before optimising.
- FalkorDB traversal at 30k nodes is well within its performance envelope — it's designed for millions.
- The Neon mirror (`graph_nodes` + `graph_edges`) will grow but Postgres handles 30k rows trivially.

### FalkorDB native vector search (v2 — VEC-03)
FalkorDB supports HNSW vector indexes natively ([FalkorDB skills reference](https://github.com/FalkorDB/skills)). This enables **combined semantic + structural queries** in a single Cypher call — e.g. "find nodes whose description is semantically close to X that are also within 2 hops of node Y." pgvector can't do this; it requires two separate calls (vector search in Neon, then traversal in FalkorDB).

Every graph node already carries a natural-language `description` property. Generating an embedding vector from this description and storing it as a property on the FalkorDB node (alongside the Neon mirror embedding) would:
1. Enable semantic search within graph traversals
2. Enrich the graph data itself — descriptions + embeddings make nodes more meaningful and queryable
3. Support queries that combine distance, similarity, and relationship type in one pass

**v1 approach:** Embeddings stored in Neon only. Semantic search via pgvector, graph traversal via FalkorDB, combined by chaining tool calls.

**v2 approach (VEC-03):** Embeddings also stored as properties on FalkorDB nodes. Create HNSW vector indexes in FalkorDB. Enable combined semantic+structural Cypher queries. This becomes especially valuable at 30k+ nodes where the two-step pattern may add latency.

Backlogged as VEC-03. See `00-project-management/backlog.md`.

## Embedding generation at write time

Currently, embeddings are generated separately from graph writes (or not at all for many nodes). RET-01 requires that every searchable item has an embedding.

**Change to `writeNode()`:** After writing a node to FalkorDB and the Neon mirror, generate an embedding from `name + ' — ' + description` and update the `graph_nodes.embedding` column. This ensures all new nodes are immediately searchable via pgvector. (In v2/VEC-03, the same embedding would also be stored as a property on the FalkorDB node for native graph vector search.)

**Change to source document writes:** After creating/updating a `src_source_documents` row with `extractedText`, generate an embedding. Already partially implemented — needs to be consistent.

**Backfill existing data:** One-time script to generate embeddings for all `graph_nodes` and `src_source_documents` rows where `embedding IS NULL`. Run once, then the write-time generation prevents future gaps.

## Cost tracking

Every retrieval call logs:
- Timestamp
- Tool/function called
- Embedding generation cost (if query was embedded)
- Number of results returned
- Token estimate of returned context

This feeds into a per-session and per-day cost tracker. Not a separate table — logged to application telemetry. Detailed design deferred to implementation.

## Update behaviour

RET-01 is read-only — it queries existing data, never writes (except embedding generation at write time, which is a side-effect of the write path, not retrieval itself). No versioning or update behaviour needed for the retrieval layer itself.

## Relationships

### Knowledge graph (FalkorDB)
RET-01 reads from FalkorDB for Mode 3 (graph traversal). Uses the existing connection in `lib/graph/`.

### Postgres
RET-01 reads from all tables listed in the data model section. No new foreign keys. Uses existing Drizzle schemas.

### Dependencies
- KG-02 (done — write API)
- VEC-01 (done — vector setup)
- DNA-01 (done — DNA schema)
- SRC-01 (done — source schema)
- All dependencies are satisfied.

### Enables
- OUT-01 (chat interface) — primary consumer
- OUT-02 (content creator) — context assembly
- INP-09 (context-aware extraction) — knowledge injection
- INP-10 (dedup detection) — similarity search
- OUT-05 (strategy coherence) — DNA cross-referencing

## UI/UX notes

RET-01 is a backend layer — no UI. Source attribution display is designed in OUT-01 and OUT-02.

## Edge cases

### Empty state
- No embeddings exist yet → semantic search returns empty results. Structured lookups still work. LLM tools should handle empty results gracefully ("I don't have any information about that topic yet").

### Partial embeddings
- Some items have embeddings, some don't → search only returns items with embeddings. Log a warning if >20% of a table has null embeddings (suggests backfill is needed).

### FalkorDB unavailable
- Graph traversal falls back to Neon mirror for 1-hop queries. Multi-hop traversal returns an error with a clear message. Chat LLM uses other tools (semantic search, structured lookup) instead.

### Very large result sets
- Cap at configurable limit (default 10, max 50). LLM can issue multiple searches rather than requesting 100 results.

### Query too vague
- "Tell me everything" → semantic search with a vague embedding returns low-confidence results. The LLM should recognise low scores and ask the user to be more specific rather than returning noise.

### Cost runaway
- Token budget per chat turn: configurable, default [TBD — needs testing]. If retrieval results exceed the budget, truncate lowest-scored results. Log when truncation occurs.

## Out of scope (v1)

- **Content type registry** — the per-content-type declaration of what data to load. This is OUT-02's concern. RET-01 provides the functions; OUT-02 decides what to call.
- **Prompt library** — copywriting techniques, banned words, hooks, CTAs. These are loaded by the content creation system, not retrieved. Storage TBD (could be `prompt_components` table, markdown files, or skill definitions).
- **Graph explorer UI** — KG-03, separate feature. RET-01 provides the traversal functions.
- **Caching** — not needed at current scale. Add if latency becomes an issue at 30k+ nodes.
- **Reranking** — cross-encoder reranking of search results. Measure retrieval quality first; add if semantic search alone isn't good enough.
- **Hybrid search** — combining keyword (BM25) with vector search. pgvector doesn't support this natively. Evaluate if semantic-only search misses obvious keyword matches.
- **FalkorDB vector indexes** — storing embeddings as node properties in FalkorDB for combined semantic + structural Cypher queries. Backlogged as VEC-03. v1 uses pgvector only; FalkorDB handles traversal only.

## Open questions / TBDs

1. **Token budget per chat turn** — needs testing to find the right balance between context richness and cost. Start with no hard limit, measure actual usage, then set a default.
2. **Backfill strategy** — run once before v1 ships, or build a `/api/admin/backfill-embeddings` endpoint? Leaning toward a one-time script.
3. **Processing runs embedding** — what text to embed? The `analysis_result` JSON stringified? Or extract a summary field? Needs a decision before migration.
4. **FalkorDB read API implementation** — Cypher queries for traversal. Need to decide: raw Cypher in the retrieval layer, or an abstraction layer? Leaning toward thin wrappers around Cypher, same pattern as `writeNode()`.

## Decisions log

- **Brief approved 2026-04-20** — all use cases, retrieval modes, LLM tool interface, and schema adaptability approach confirmed.
- **FalkorDB native vector search deferred to VEC-03** — v1 uses pgvector only. Evaluate after RET-01 v1 is live at scale. Backlogged as VEC-03.
- **FalkorDB skills repo noted as implementation reference** — https://github.com/FalkorDB/skills — Cypher patterns for vector indexes, full-text search, read-only queries, parameterization.
