# Session log — 2026-03-29 — source knowledge schemas
Session ID: 2026-03-29-src-schemas-m3p

## What we worked on
- M0 milestone: source knowledge schema definitions (prerequisite for SRC-01)

## What was done
- Reviewed M0 status and agreed minimum needed to start building: source knowledge schemas + graph schema (ADR-002). Remaining DNA drafts and process skills (SKL-05, 07, 08) can wait.
- Wrote 5 source knowledge schema files to `01-design/schemas/`:
  - `src-testimonials.md` — `src_testimonials`
  - `src-statistics.md` — `src_statistics`
  - `src-stories.md` — `src_stories`
  - `src-own-research.md` — `src_own_research`
  - `src-source-documents.md` — `src_source_documents`
- All 5 approved by end of session.
- Revised across sessions based on feedback:
  - Removed immutability framing — source knowledge is stable factual record but editable; added `updatedAt` to all 5 tables
  - `src_statistics`: expanded DNA links from content pillars only to also include audience segments, offers, and methodologies
  - `src-source-documents.md`: updated description from "filing cabinet" to "seeds" framing — source documents are the raw input that can be extracted into any structured type (src_*, DNA, graph nodes), not just other source knowledge tables

## Decisions made

See **ADR-003** (`00-project-management/decisions/adr-003-source-knowledge-schema.md`) for the full record. Summary:

- **Source knowledge vs DNA distinction:** Categorical, not about mutability. Both are editable. Source knowledge is stable because the facts are stable, not because the system locks them.
- **Stats link to any DNA type:** Audience segments, offers, content pillars, methodologies — all via soft uuid[] references.
- **Source documents as seeds:** A single document can be extracted into any type (src_*, DNA, graph nodes). Provenance anchor, not just a filing cabinet.
- **Stories:** Kept minimal (hook/tension/resolution/lesson). More dimensions acknowledged but not a priority — expand later.
- **own-research + statistics overlap is intentional:** No forced deduplication between `keyFindings` and standalone `src_statistics` rows.

## What came up that wasn't planned
- Stories schema noted as expandable in future but deliberately left minimal — nothing filed.
- `session-log` skill (SKL-10) updated to add Step C: ADR identification before drafting the log. Decisions that meet the ADR bar now get filed in `00-project-management/decisions/` and referenced from the session log rather than buried inline.

## Backlog status changes
- No status changes — SRC-01 remains `planned` (schemas are the prerequisite, not the implementation)

## What's next
- **Graph schema → ADR-002** — this is the remaining M0 blocker. Node types, relationship types, "good enough to start" not comprehensive.
- Once ADR-002 is done → M0 exit criteria met → M1 (storage layer) can begin
- M1 order: INF-00 (brands root) → INF-02 (Postgres) → DNA-01 + SRC-01 tables via `schema-to-db` (SKL-06) + `db-migrate` (SKL-09)

## Context for future sessions
- All 5 `src_*` schema files are approved and ready for `schema-to-db`
- `src_source_documents` must exist before other `src_*` tables reference it (via `sourceDocumentIds`)
- Soft uuid[] references used throughout — source knowledge survives DNA edits/deletes
- `src_statistics.methodologyIds` references `dna_knowledge_assets.id` (the methodology table name)
