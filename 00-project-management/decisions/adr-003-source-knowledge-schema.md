# ADR-003: Source Knowledge Schema Design

> Status: APPROVED
> Date: 2026-03-29
> Decides: Data model for source knowledge (testimonials, statistics, stories, own research, source documents) — structure, mutability, cross-references, and conceptual distinctions

---

## Context

Source knowledge is one of the two main storage types in BigBrain (alongside Brand DNA). Before implementing SRC-01, the schema needed to be fully defined. Five types were identified in the domain model: testimonials, statistics, stories, own research, and source documents.

Several design questions needed resolving:
- What's the right distinction between source knowledge and Brand DNA?
- Should source knowledge items be immutable (append-only) or editable?
- How should source knowledge cross-reference DNA elements?
- What is the role of source documents relative to the other four types?

---

## Decisions

### 1. Source knowledge vs Brand DNA: categorical distinction, not mutability

**Decision:** The distinction between source knowledge and Brand DNA is categorical, not about mutability. Both are editable.

- **Brand DNA** is strategic — it evolves as thinking evolves, market conditions change, and the business develops. It's always "current state."
- **Source knowledge** is factual record — things that happened, were said, were measured. A testimonial doesn't change because the market changes. A statistic doesn't update because strategy shifts. The record is stable because the facts are stable.

**Consequence:** All source knowledge tables have both `createdAt` and `updatedAt`. Editing is allowed for corrections. The immutability principle from early drafts was wrong — what's actually true is that source knowledge items are *stable by nature*, not *locked by design*. For own research specifically: if a follow-up study is run, create a new entry (the original is a historical record). Corrections to an existing entry are fine.

### 2. Source documents as seeds, not just provenance

**Decision:** `src_source_documents` is not merely a filing cabinet or provenance layer — it's the seed table. A single source document can be extracted into any structured type across the system: other `src_*` rows, DNA records, or graph nodes.

For example, a client project debrief might yield: a testimonial, three statistics, a methodology insight (DNA), and several graph nodes. The source document is the provenance anchor for all of them.

**Consequence:** The description and notes in `src_source_documents` reflect this — "The originals live here; the structured knowledge extracted from them lives elsewhere." The table is the starting point for the input processing pipeline (INP-03/INP-05), not just an archive.

### 3. Statistics link to any DNA type via soft references

**Decision:** `src_statistics` can link to audience segments, offers, content pillars, and methodologies — not just content pillars as initially drafted.

A stat about buyer behaviour is relevant to audience segments. A stat about ROI is relevant to offers. A stat validating an approach is relevant to a methodology. Restricting links to content pillars only would make the stat harder to surface in the right generation contexts.

**Implementation:** Four separate nullable `uuid[]` columns (`audienceSegmentIds`, `offerIds`, `contentPillarIds`, `methodologyIds`), all soft references (not enforced FKs). Same pattern used throughout the DNA schemas.

**Why soft references (not hard FKs)?** Source knowledge should persist even if referenced DNA items are deleted or restructured. Enforced FKs would create fragile dependencies in the wrong direction — the knowledge shouldn't disappear because a strategy element was revised.

### 4. Own research and statistics overlap intentionally

**Decision:** Key findings from `src_own_research` can also exist as standalone `src_statistics` rows. No deduplication is enforced.

A survey's findings live in `src_own_research.keyFindings` (for context — what was studied, how, the full finding in context) and optionally also as `src_statistics` rows (for independent use — a citable data point without needing to load the full research record). Both representations serve different retrieval purposes. Forcing one to reference the other would add complexity with no benefit.

### 5. Stories: minimal schema now, expandable later

**Decision:** `src_stories` stores full narrative plus four structural fields (hook, tension, resolution, lesson). More granular story dimensions (character, obstacle, scenario, initial state, desire, outcome) were identified but not implemented.

Stories are not a current priority. The four structural fields are sufficient for prompt injection use cases — short-form content can be built from hook/tension/resolution/lesson without the full narrative. The schema will be expanded when stories become a content priority.

---

## What was ruled out

| Option | Why rejected |
|---|---|
| Immutable source knowledge (append-only, no edits) | Conceptually wrong — the stability is in the nature of the facts, not a system constraint. Corrections should be possible. |
| Hard FK constraints for DNA cross-references | Source knowledge must survive DNA restructuring. Soft uuid[] references are the right pattern. |
| Single `relatedDnaIds` JSONB object for all DNA links on statistics | Separate columns per DNA type are cleaner to query and index than a JSONB blob of mixed IDs. |
| Separate vector DB for source document search | pgvector in Neon handles this via `extractedText` embeddings. Consistent with ADR-001. |

---

## Consequences

- All 5 source knowledge tables are ready for `schema-to-db` (SKL-06) and migration
- `src_source_documents` must be created before other `src_*` tables (referenced via `sourceDocumentIds`)
- The processing pipeline (INP-03/INP-05) should treat `src_source_documents` as the intake point — documents land here first, then structured extraction populates other tables
- `src_statistics.methodologyIds` references `dna_knowledge_assets.id` (the methodology table)
- Schema files: `01-design/schemas/src-testimonials.md`, `src-statistics.md`, `src-stories.md`, `src-own-research.md`, `src-source-documents.md` — all approved
