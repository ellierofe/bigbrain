---
status: approved
table: src_source_documents
type: source-knowledge
related_features: SRC-01, SRC-02, INF-04, PROV-01, INP-03, INP-11, INP-12
last_updated: 2026-05-01
supersedes: prior version (approved 2026-04-02)
related_docs: src-source-chunks.md, lens-reports.md, processing-runs.md
---

# Schema: src_source_documents

Source knowledge. One row per source document. The original files and materials that underpin everything else extracted by the system — transcripts, research papers, voice notes, reports, pitch decks, internal notes. Holds the seed text and the structural metadata; the chunked retrievable units live in `src_source_chunks`; the structured items extracted from them live as graph nodes and (where applicable) other `src_*` rows.

This is v3 of the schema. v1 (approved 2026-03-29) was the initial source-knowledge model. v2 (approved 2026-04-02) added `inboxStatus`, `processingHistory`, and `participantIds` for INP-11. v3 (this document, INP-12) adds source-type vocabulary, authority property, summary, and chunk-count convenience field; deprecates the free-form `type` vocabulary in favour of the controlled `sourceType` vocabulary; reframes the table as the *parent* of `src_source_chunks` rather than the only representation of a source.

## Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | Same UUID is used as the SourceDocument graph node id (existing convention). |
| `brandId` | uuid | not null, FK → `brands.id` cascade delete | Owning brand |
| `title` | varchar(300) | not null | Human-readable name. For Krisp transcripts, this is the meeting title. Editable. |
| `sourceType` | varchar(40) | not null | **NEW (replaces `type`).** Controlled vocabulary per ADR-009: `client-interview \| coaching-call \| peer-conversation \| supplier-conversation \| accountability-checkin \| meeting-notes \| internal-notes \| research-document \| dataset \| pitch-deck \| report \| collection \| content-idea`. Drives prompt fragment selection at processing time. Manually assigned at ingest in v1; INP-08 will auto-classify in a later iteration. |
| `authority` | varchar(30) | not null | **NEW.** `own \| peer \| external-authoritative \| external-sample`. Captures evidence weight independently of source type. Defaults populated by source type (`internal-notes`/`report`/`content-idea` → `own`; `peer-conversation`/`accountability-checkin`/`coaching-call` → `peer`; `research-document` → `external-authoritative`; scraped/sample materials → `external-sample`). Editable. Used by retrieval to weight sources for content generation. |
| `description` | text | nullable | What this document is and why it's here. User-editable. Distinct from `summary` (which is LLM-generated content overview). |
| `summary` | text | nullable | **NEW.** ~300-word LLM-generated overview of the source's content. Generated at ingest from `extractedText`. Stored on the SourceDocument graph node `description` property (per ADR-002a §3 narrow exception to the no-AI-inference rule). Used as embedding text and as preview in retrieval results. Re-generatable. |
| `summaryGeneratedAt` | timestamp with tz | nullable | **NEW.** Set when `summary` is populated. Audit trail for re-summarisation. |
| `chunkCount` | integer | not null, default 0 | **NEW.** Convenience count of `src_source_chunks` rows for this source. Updated by trigger (or application-side on chunk insert/delete). Lets list views show "12 chunks" without a count query. Zero for `dataset` and `collection` sources (which don't chunk). |
| `fileUrl` | varchar(500) | nullable | Vercel Blob URL of the stored file. Null for paste-only inputs (e.g. INP-03 text paste). |
| `fileSize` | integer | nullable | File size in bytes |
| `mimeType` | varchar(100) | nullable | e.g. `application/pdf`, `text/plain` |
| `extractedText` | text | nullable | Plain text extracted from the file (or pasted directly). Source for chunking and summary generation. Immutable post-ingest in v3 — corrections require re-ingest. |
| `externalSource` | varchar(500) | nullable | Origin URL or reference if document came from outside (scraped page, email thread, etc.) |
| `tags` | text[] | not null, default '{}' | Free-form context tags. Auto-suggestions from summary at ingest, fully editable. No predefined list; user-defined vocabulary. |
| `participantIds` | uuid[] | not null, default '{}' | References to `Person` graph nodes. Suggested from speaker-turn analysis at ingest; user confirms during triage. Used to filter sources by who was involved. |
| `inboxStatus` | varchar(20) | nullable | `new \| triaged`. `new` for auto-scraped or fresh-uploaded items that haven't been reviewed; `triaged` once the user has assigned source type, authority, tags, and participants. Drives the "NEW" label on Sources page (per INP-12; replaces the separate Inbox page). Null for sources where inbox tracking doesn't apply (e.g. one-off manual creates). |
| `processingHistory` | jsonb | not null, default '[]'::jsonb | Array of `{ date: string, lens: string, processingRunId: string, lensReportId?: string }`. Tracks every processing run this source was part of, regardless of lens. Lets the source detail view show "processed 3 times: pattern-spotting on 2026-04-15, surface-extraction on 2026-04-22, decision-support on 2026-05-01". |
| `documentDate` | date | nullable | Date of the document itself (not upload date). Used for temporal graph edges — extracted nodes get `ON_DATE`/`IN_MONTH`/`IN_YEAR` edges to the matching Date node. If absent, processing date is used. |
| `isArchived` | boolean | not null, default false | Soft delete |
| `embedding` | vector(1536) | nullable | OpenAI `text-embedding-3-small` of `title + ' — ' + summary`. Re-embedded when summary changes. Indexes the source as a whole; chunk-level retrieval uses `src_source_chunks.embedding`. |
| `embeddingGeneratedAt` | timestamp with tz | nullable | |
| `krispMeetingId` | text | nullable | Krisp meeting identifier for transcripts ingested via SKL-10 (`/krisp-ingest`). Unique per `(brandId, krispMeetingId)`. |
| `createdAt` | timestamp with tz | not null, defaultNow | |
| `updatedAt` | timestamp with tz | not null, defaultNow | |

## Removed in v3

- `type` (varchar(50)) — replaced by `sourceType` with a controlled vocabulary. Per INP-12 wipe-and-re-ingest, no migration needed.

## Indexes

- PK on `id`
- FK index on `brandId`
- Composite index on `(brandId, sourceType)` — supports filtered list views ("show me all client-interviews")
- Composite index on `(brandId, inboxStatus)` — supports the "NEW" filter chip
- HNSW index on `embedding` (vector_cosine_ops)
- Unique index on `(brandId, krispMeetingId)` where `krispMeetingId IS NOT NULL` — prevents duplicate Krisp ingests
- GIN index on `tags` — supports tag-filter queries
- GIN index on `participantIds` — supports "find sources involving Person X"

## Relationships

- Parent of `src_source_chunks` (1:N, FK + cascade delete)
- Referenced by `lens_reports.sourceIds` (N:M, soft ref via array)
- Referenced by `processing_runs.sourceIds` (N:M, soft ref via array)
- Referenced by `src_own_research.sourceDocumentIds` — the underlying data files for own research records
- `fileUrl` references Vercel Blob (INF-04)
- Mirrored as `SourceDocument` graph node in FalkorDB + `graph_nodes` mirror

## Source type defaults for `authority`

| Source type | Default `authority` |
|---|---|
| `internal-notes`, `report`, `content-idea` | `own` |
| Your own `pitch-deck` | `own` (override needed at ingest) |
| `peer-conversation`, `accountability-checkin`, `coaching-call` | `peer` |
| `client-interview`, `supplier-conversation`, `meeting-notes` | `peer` (when collaborative) or `external-authoritative` (when client/supplier is the authority) — defaults to `peer`, often overridden |
| `research-document` | `external-authoritative` |
| External `pitch-deck`, scraped `collection`, `dataset` from third parties | `external-sample` (for pattern-only) or `external-authoritative` (for evidence) — defaults to `external-sample`, often overridden |

Defaults are starting points, always editable at ingest. Authority shapes retrieval weighting downstream — `own` and `peer` for voice generation, `external-authoritative` for cited claims, never `external-sample` for either.

## Notes

- **Reframed in v3:** this table now holds the *parent record* of a source. The retrievable units (passages, quotes) live in `src_source_chunks`. The structured items extracted from a source live as graph nodes (`Idea`, `Concept`, `Person`, etc.) with `DERIVED_FROM` edges back to either the SourceDocument node or a SourceChunk node depending on provenance grain.
- **Why `summary` is mutable but `extractedText` is not:** `extractedText` is the canonical record of what was in the source. Re-summarisation is a normal flow (model improves, prompt improves). Re-extracting the text would require re-uploading the file — a different operation, not a property edit.
- **Why a controlled `sourceType` vocabulary?** INP-11 used a free-form `type` field with values like `transcript`, `session-note`, `research`. This made it impossible to compose prompt fragments per type or to compute reliable defaults for `authority`. ADR-009's two-axis model requires a controlled vocabulary; this table is the home of that vocabulary.
- **Why `chunkCount` as a stored column rather than a query?** Avoids `COUNT(*)` on every list view render. Updated by application-side logic on chunk insert/delete (acceptable drift risk; can be reconciled by a periodic cron if needed).
- **Why `inboxStatus` is nullable rather than `default 'new'`?** Sources can be created in contexts where "inbox" doesn't apply — e.g. a manual paste of a single quote. Null means "not subject to inbox triage." `'new'` means "needs triage." `'triaged'` means "user has reviewed."
- **Datasets and collections share this table** — they get rows here too, with `sourceType='dataset'` or `'collection'`. Their per-row/per-item data lives elsewhere (dedicated ingestion writes nodes/edges directly for `dataset`; sibling SourceItem rows for `collection` per ADR-002a). For these source types, `chunkCount` stays 0, `extractedText` may be null, and `summary` describes the collection as a whole.
- **Migration from v2:** per INP-12, the existing 67 transcripts are wiped and re-ingested. No in-place migration needed for `type → sourceType` or for backfilling `summary`/`chunkCount`/`authority`. The wipe-and-re-ingest is the migration.
- **The `src_source_documents` ↔ `SourceDocument` graph node UUID match** is preserved — same id used for both, same lookup pattern as before.
