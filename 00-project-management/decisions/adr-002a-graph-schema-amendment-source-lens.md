# ADR-002a — Graph schema amendment: SourceChunk, SourceCollection, SourceItem, LensReport, and the "no AI inference" rule

Status: accepted
Date: 2026-04-30
Related: ADR-002 (Knowledge Graph Schema, approved 2026-03-30), ADR-003 (Source Knowledge Schema), INP-12 (Source × Lens Processing brief)
Amends: ADR-002 §1 (node types), ADR-002 §2 (relationship types), ADR-002 §3 (description rules)

---

## Context

ADR-002 fixed the knowledge graph schema in March 2026. It defined twelve node types plus two infrastructure types, the relationship vocabulary, properties required on every node and edge, and twelve ingestion rules — including rule §3 ("No AI inference — describe only what is sourced").

INP-11 (multi-modal processing) shipped in April 2026 against this schema and exposed two structural gaps:

1. **The graph representation of a source is hollow.** A `SourceDocument` node currently stores the title, type, fileRef, and a templated description. The full text lives in Postgres only. There is no summary, no semantic chunking, no per-passage embedding. A 100k-character interview becomes one node with one embedding generated from the first ~500 words. Retrieval against it is lossy — and downstream features (chat, content creator, lens reports) can only retrieve at source-document granularity, not passage granularity.

2. **Analysis output (INP-11's batch / reflective / synthesis modes) has no graph home.** It lives on `processing_runs` rows. INP-12 promotes "lens reports" to first-class artefacts that should be addressable, traversable, and provenance-linked. This requires a new node type.

3. **`dataset` and `collection` source types** (per INP-12) are containers, not single documents. A Crunchbase export or 200 scraped tweets is one ingestion → many sibling items. The current schema can only represent this as one SourceDocument with no structure underneath.

INP-12's data shape requires four new node types and three new edge types. It also requires a stance on rule §3 — LLM-generated summaries on SourceDocument nodes are technically AI-produced text, even though they describe content already present in the source.

This ADR amends ADR-002 to settle these three points so INP-12 implementation can proceed.

---

## Decisions

### 1. Four new node types

| Label | Description |
|---|---|
| `SourceChunk` | A semantic chunk of a source document — speaker-turn for transcripts, paragraph for documents, slide for pitch decks. Each chunk has its own embedding, its own `text` property, and is linked to its parent SourceDocument via `PART_OF`. Enables passage-level retrieval and per-quote provenance. |
| `SourceCollection` | A container source representing one ingestion of many sibling items (a Crunchbase export, a scrape of an influencer's tweets, a dataset). Has metadata about the collection as a whole; the items live as `SourceItem` children. |
| `SourceItem` | An individual member of a SourceCollection — one row of a dataset, one tweet from a scrape, one entry in a CSV. Has its own embedding and is linked to its parent collection via `PART_OF`. Each item is independently addressable for retrieval. |
| `LensReport` | A first-class durable artefact representing the output of an analysis lens (`pattern-spotting`, `self-reflective`, `project-synthesis`, `catch-up`, `decision-support`, `content-ideas`) applied to a set of sources. Has a page, a status (`draft` / `committed` / `superseded`), and can be re-run. Items identified by the lens link back to the report via `IDENTIFIED_IN`. |

These extend the existing twelve content/knowledge nodes — they do not replace anything. `SourceDocument` keeps its current role; `SourceChunk` is its child. `SourceCollection` + `SourceItem` are alternatives to `SourceDocument` for collection-shaped sources.

### 2. Three new relationship types

| Relationship | From → To | Notes |
|---|---|---|
| `PART_OF` | `SourceChunk → SourceDocument`, `SourceItem → SourceCollection` | Structural parent/child. Cascade-delete in Postgres mirror; FalkorDB has no cascade so deletion is handled by the application layer. |
| `IDENTIFIED_IN` | `Idea → LensReport`, `Concept → LensReport`, `Methodology → LensReport`, `Person → LensReport`, `Organisation → LensReport` | When an item came from a lens report rather than from direct extraction. Sits alongside `DERIVED_FROM` (which still points to the underlying source documents). |
| `ANALYSED_FROM` | `LensReport → SourceDocument`, `LensReport → SourceCollection` | Which sources the lens was run over. Many-to-many — a lens report can draw on multiple sources. |

`DERIVED_FROM` (existing) gains an extension: in addition to `Idea, Concept → SourceDocument, Event` (the current ADR-002 specification), it now also accepts `Idea, Concept → SourceChunk` for the finer provenance grain a chunk-level extraction enables. Edges of this kind carry the same required properties as before (`description`, `source`, `createdAt`).

### 3. Soften "no AI inference" rule for source summaries and chunks

ADR-002 §5 rule 1 ("No AI inference — null not estimated. Describe only what the source supports") and ADR-002 §3 ("description… No AI inference — describe only what is sourced") are preserved as the default policy.

**Two narrow exceptions:**

1. **`SourceDocument.description` may be an LLM-generated summary** of the source's own content. The summary describes what is *already in* the source — it does not infer external facts. Generation must:
   - Be grounded in `extracted_text`
   - Not introduce claims, names, dates, or facts not present in the source
   - Be deterministic-ish (same source → similar summary; not creative variation)
   - Stamp `summary_generated_at` so re-summarisation is auditable

2. **`SourceChunk.text` is the verbatim chunk content** (not LLM output) — but if a chunk requires a summary or label for indexing (e.g. a per-paragraph topic tag), that label may be LLM-generated under the same rules above.

**The intent of rule 1 is preserved:** don't fabricate facts about external entities (people, organisations, events, claims). LLM compression of content already present in a source is not fabrication.

**What this does NOT permit:**
- Inferring a Person's role, employer, or location from a transcript when those facts aren't stated
- Inferring an Organisation's type, country, or relationships from indirect evidence
- Inferring a date, statistic, or claim that isn't explicitly in the text
- Generating a "description" property for an extracted Idea/Concept/etc. that goes beyond what the source supports

### 4. Properties for new node types

**`SourceChunk` required properties:**
- All ADR-002 §3 base properties (`id`, `name`, `description`, `source`, `file_ref`, `createdAt`, `updatedAt`)
- `text` — the verbatim chunk content
- `position` — integer ordinal within the parent source
- `chunk_type` — enum: `speaker-turn`, `paragraph`, `section`, `row`, `item`, `slide`
- `speaker` — optional, text (for `speaker-turn` chunks on transcripts)
- `embedding` — vector(1536), generated at ingest

The `name` property for a chunk is a short auto-generated label (e.g. `"Ross @ St Pancras [chunk 12 — Ross]"`). The `description` is the same as `text` truncated to ~200 chars or a short LLM-generated label under the §3 exception above.

**`SourceCollection` required properties:**
- All ADR-002 §3 base properties
- `collection_type` — enum: `dataset`, `tweet-stream`, `review-set`, `email-thread`, `other`
- `item_count` — integer
- `source_uri` — original location of the export/scrape if applicable

**`SourceItem` required properties:**
- All ADR-002 §3 base properties
- `position` — integer ordinal within the parent collection
- `text` — the item content
- `metadata` — jsonb, item-specific structured properties (e.g. tweet timestamp, dataset row values)
- `embedding` — vector(1536)

**`LensReport` required properties:**
- All ADR-002 §3 base properties
- `lens` — enum: the 7 lens values from INP-12 (`surface-extraction`, `self-reflective`, `project-synthesis`, `pattern-spotting`, `catch-up`, `decision-support`, `content-ideas`)
- `status` — enum: `draft`, `committed`, `superseded`
- `result` — jsonb, lens-specific structured output
- `committed_at` — timestamptz, nullable
- `superseded_by_id` — uuid, nullable, refs another LensReport
- `embedding` — vector(1536), generated from `name + summary`

### 5. Postgres mirror updates (extends GRF-02)

`graph_nodes` and `graph_edges` mirror tables work as-is — they're polymorphic on `label` already, with type-specific data in `properties` jsonb. The four new labels need no schema change to the mirror tables themselves.

However, INP-12 also introduces dedicated Postgres tables for SourceChunks and LensReports (per the INP-12 brief data model section): `src_source_chunks` and `lens_reports`. These are the *authority* for chunk text and lens report content. The graph node mirror in `graph_nodes` carries the indexable subset (id, name, description, embedding) and a foreign-key-style `properties.postgres_id` pointing back to the dedicated table.

This is the same pattern as `Methodology` → `dna_knowledge_assets` (per ADR-002 §3 selected properties): graph node is the addressable, traversable representation; Postgres holds the canonical content.

### 6. Authority on chunk vs source for retrieval

When a query needs the actual passage text:
- For `SourceChunk`: read from `src_source_chunks.text` (Postgres authority)
- For `SourceItem`: read from the dedicated source-item table (TBD — covered in INP-12 schema doc work)
- For `SourceDocument` summaries: read from `src_source_documents.summary` (Postgres authority)

The graph node `description` carries a short indexable description; the full text lives in Postgres. This matches the existing pattern in ADR-002 §4 ("FalkorDB is the authority for relationships and traversal. Neon is the authority for structured content and fast lookup").

---

## What was ruled out

| Option | Why rejected |
|---|---|
| Storing the full source text on the SourceDocument graph node | Fights ADR-002 §4 (FalkorDB is for traversal, Neon for structured content). Bloats node size. Doesn't enable passage retrieval — embeddings would still be source-level, not chunk-level. |
| Treating chunks as edges with `chunk_index` properties | Edges aren't first-class for traversal queries like "find similar chunks." Chunk needs an embedding, edges don't carry embeddings under our current pgvector pattern. |
| Lens reports as just a Postgres table with no graph node | Loses traversal — "what lens reports cited this source?", "what ideas came from which lens?" become harder. The graph mirror is what makes these queryable as a unit. |
| Wholesale rewrite of ADR-002 | The original schema is sound for the original twelve types. INP-12 extends rather than replaces. Amendment preserves the audit trail. |
| Auto-generated descriptions on extracted Ideas / Concepts / People / Orgs (extending the rule-1 exception further) | Crosses from "summarise present content" to "infer external facts" — exactly what rule 1 exists to prevent. The exception is narrow on purpose: source's own content only. |
| Re-running the seed scripts to add SourceChunk/SourceCollection/SourceItem/LensReport label declarations as enum-style constraints in FalkorDB | FalkorDB doesn't enforce labels at schema level; they're free-form strings. The constraint is in the application's `NodeLabel` union type (`lib/graph/types.ts`). The amendment adds the new labels to that union. |

---

## Consequences

- `lib/graph/types.ts` `NodeLabel` and `RelationshipType` unions get the four new labels and three new edge types; TypeScript compile-time enforcement extends to them.
- `lib/graph/write.ts` `writeNode()` / `writeEdge()` work as-is — they're polymorphic on label.
- Two new Postgres tables (`src_source_chunks`, `lens_reports`) plus updates to `src_source_documents` and `processing_runs` — all covered by separate INP-12 schema docs.
- The Source × Lens model itself (composition of source-type schema fragments × lens prompts, the seven lens values, the orchestration logic) is a separate architectural decision — covered in ADR-009 (proposed).
- `commit-analysis.ts` (the existing INP-11 commit code) gets rewritten to write `LensReport` nodes + `IDENTIFIED_IN` / `ANALYSED_FROM` edges instead of the current pattern of writing items directly with no first-class report representation.
- Source-document ingest (currently INP-01 / Krisp scrape) gains a chunking + summarising step before the SourceDocument graph node is written. Existing 67 transcripts are wiped and re-ingested under INP-12 (per INP-12 migration plan).
- ADR-002 §5 rule 1 stays in force everywhere except the two narrow exceptions above. New ingestion code reviewers should treat any LLM call producing a property other than `SourceDocument.description`, `SourceChunk.description`, or `SourceItem.description` as a rule-1 violation requiring justification.
- The "no AI inference" exception is auditable via `summary_generated_at` (and equivalent fields where added). When the rule is tightened or relaxed in future, the audit trail shows which descriptions were under which policy.
- KG-04 (politics graph port) is unaffected by this amendment. Politics nodes use the existing twelve labels; they don't need SourceChunk/Collection/Item/LensReport.
