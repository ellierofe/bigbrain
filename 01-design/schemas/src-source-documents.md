---
status: approved
table: src_source_documents
type: source-knowledge
related_features: SRC-01, SRC-02, INF-04, PROV-01, INP-03
last_updated: 2026-04-02
---

# Schema: src_source_documents

Source knowledge. One row per source document. The original files and materials that underpin other source knowledge types — the PDFs, transcripts, notes, and raw documents that testimonials, research, and statistics came from. Primarily a provenance layer: you rarely query this table directly, but it closes the audit trail.

## Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | |
| `brandId` | uuid | not null, FK → `brands.id` | Owning brand |
| `title` | varchar(300) | not null | Human-readable name for the document |
| `type` | varchar(50) | not null | `transcript \| session-note \| research \| voice-note \| image \| email \| document \| other` — content/intent type, not file format. Format is captured in `mimeType`. |
| `description` | text | nullable | What this document is and why it's here |
| `fileUrl` | varchar(500) | **nullable** | Vercel Blob URL of the stored file. Null for paste-only inputs (INP-03 text pipeline). |
| `fileSize` | integer | nullable | File size in bytes |
| `mimeType` | varchar(100) | nullable | e.g. `application/pdf`, `text/plain` |
| `extractedText` | text | nullable | Plain text extracted from the document (for search and LLM context) |
| `externalSource` | varchar(500) | nullable | Origin URL or reference if document came from outside (e.g. scraped page, email thread) |
| `tags` | text[] | nullable | Free-form context tags. Used to filter within a type — e.g. type=`transcript` + tags=`["coaching", "client:acme"]`. No predefined list; user-defined vocabulary. |
| `isArchived` | boolean | not null, default false | Soft delete |
| `documentDate` | date | nullable | Date of the document itself (not upload date). Used for temporal graph edges — nodes derived from this document get `ON_DATE`/`IN_MONTH`/`IN_YEAR` edges to the matching Date node. If absent, commit date is used instead. |
| `createdAt` | timestamp with tz | not null, defaultNow | |
| `updatedAt` | timestamp with tz | not null, defaultNow | |

## Relationships

- Referenced by `src_own_research.sourceDocumentIds` — the underlying data files
- Referenced by `src_testimonials` indirectly via `sourceUrl` (when testimonial came from a document)
- `fileUrl` references Vercel Blob (INF-04)
- `extractedText` is the input to embedding generation (VEC-01)

## Notes

- This table stores the seeds. The originals live here; the structured knowledge extracted from them lives elsewhere — in other `src_*` tables, DNA records, or graph nodes. A single source document might yield a testimonial, three statistics, a methodology insight, and a graph node. The document itself is the provenance anchor for all of them.
- `extractedText` enables semantic search across source documents even without structured extraction. Populated during ingestion (INP-03 paste pipeline, INP-05 file pipeline).
- Documents that come in via `INP-05` (research ingestion) will land here first before being processed into structured source knowledge items or graph nodes.
- Re-uploading a corrected file should update the existing entry (update `fileUrl`, `extractedText`) rather than creating a duplicate. Archive if the document is superseded entirely.
- `fileUrl` is nullable because INP-03 accepts pasted plain text with no associated file. File-based ingestion paths (INP-01, INP-05) always populate `fileUrl`.
