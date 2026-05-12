---
status: approved
table: processing_runs
type: processing-internal
related_features: INP-11, INP-12
last_updated: 2026-05-06
supersedes: prior INP-11 implementation (no formal schema doc existed)
related_docs: src-source-documents.md, src-source-chunks.md, lens-reports.md
---

# Schema: processing_runs

A transient compute record. One row per LLM call against the Source × Lens model. Captures *what was asked of the LLM*, *what the LLM returned*, and *how the user resolved it* (committed, skipped, in-flight). Not the durable artefact — that's `lens_reports` for analysis lenses, or graph nodes for `surface-extraction`.

This table is the chain of custody for processing. It exists for: debugging ("what prompt produced this junk?"), idempotency ("did we already run this lens on these sources?"), audit ("when did this lens report get committed and from which run?"), and re-runnability ("re-run with the same sources and a tweaked prompt").

INP-11 used a similar table that conflated compute records with output records (`analysis_result` was on the run row itself). INP-12 splits: `processing_runs` is purely transient/diagnostic; `lens_reports` holds the durable output. This schema doc codifies the new shape.

## Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | |
| `brandId` | uuid | not null, FK → `brands.id` cascade delete | |
| `lens` | varchar(30) | not null | **RENAMED from `mode` (v2 INP-11).** One of the 7 lens values per ADR-009: `surface-extraction \| self-reflective \| project-synthesis \| pattern-spotting \| catch-up \| decision-support \| content-ideas`. |
| `sourceIds` | uuid[] | not null | Sources the run was applied to. Soft refs to `src_source_documents.id`. |
| `sourceTypeFilter` | varchar(40) | nullable | Optional: when the run was scoped to one source type within a multi-type selection. Mostly null in v1. |
| `lensInput` | text | nullable | Free-form input that shaped the run (e.g. decision text for `decision-support`). Mirrors `lens_reports.lensInput` for analysis lenses. |
| `promptFragmentsUsed` | jsonb | not null, default '[]'::jsonb | Array of `{ path: string, gitSha?: string }` recording which schema-fragment files were composed into the prompt. Lets us trace "this run used the v3 client-interview fragment with the v2 pattern-spotting lens prompt." |
| `extractionResult` | jsonb | nullable | **Only populated for `lens='surface-extraction'`.** Raw `ExtractionResult` from `extractFromText()` — the per-source extracted items (ideas, concepts, people, etc.) before user review. After commit, the user-confirmed subset is written to graph nodes; this column retains the raw result for audit. |
| `unexpected` | jsonb | not null, default '[]'::jsonb | **NEW (INP-12 follow-up #5, 2026-05-06).** Universal `unexpected[]` array — `Array<{ observation, why, sourceRefs }>` — populated only when `lens='surface-extraction'`. Surface-extraction does not produce a `lens_reports` row, so its `unexpected[]` (per `_base.md`) cannot attach there; this column is the storage. The per-item review UI surfaces these alongside the regular extracted items for individual commit/discard. Empty array (default) for analysis-lens runs (their `unexpected[]` lives on `lens_reports.result.unexpected`) and for `surface-extraction` runs that returned nothing left-field. |
| `analysisResult` | jsonb | nullable | **DROPPED in v3 (was on INP-11 `processing_runs`).** Analysis output now lives on `lens_reports.result` for the 6 analysis lenses. |
| `lensReportId` | uuid | nullable, FK → `lens_reports.id` | **NEW.** Populated on commit for analysis lenses. The lens report this run produced. Null for `surface-extraction` runs (no lens report) and for runs in `pending` status. |
| `status` | varchar(20) | not null, default 'pending' | `pending \| committed \| skipped \| failed`. `pending` = LLM returned, awaiting user review. `committed` = user reviewed, items/report written. `skipped` = user discarded. `failed` = LLM call errored, no result. |
| `errorMessage` | text | nullable | Populated when `status='failed'`. Human-readable diagnosis. |
| `tokenUsage` | jsonb | nullable | `{ promptTokens, completionTokens, totalTokens, model }` — captured from the LLM response for cost tracking. Optional; null for older or instrumented-out paths. |
| `committedAt` | timestamp with tz | nullable | Set when `status` flips to `committed`. |
| `embedding` | vector(1536) | nullable | **Deprecated in v3.** Embedding lives on `lens_reports.embedding` for analysis lenses; for `surface-extraction`, the per-item nodes have their own embeddings. Retained as nullable for backward-compatibility with existing INP-11 rows; not populated by new code. |
| `createdAt` | timestamp with tz | not null, defaultNow | |

## Indexes

- PK on `id`
- FK index on `(brandId, status)` — supports "show pending runs" queries
- FK index on `lensReportId`
- GIN index on `sourceIds` — supports "find runs that touched this source"

## Relationships

- N:M with `src_source_documents` via `sourceIds` array (soft ref)
- 1:1 with `lens_reports` via `lensReportId` (FK)
- Drives the surface-extraction commit pipeline: `extractionResult` → `commitExtraction()` → graph node writes
- Drives the analysis-lens commit pipeline: `result` (read from the request body, since `analysisResult` is dropped) → `lens_reports` row → graph node writes for confirmed items

## Status lifecycle

```
   ┌─→ pending ─→ committed
LLM ─┤              ↓
     │         (lens_reports row, graph items)
     ├─→ pending ─→ skipped
     │              ↓
     │         (terminal — no graph writes)
     └─→ failed
              ↓
         (terminal — errorMessage populated)
```

- A run starts in `pending` status when the LLM returns (or in `failed` if the call errors).
- The user reviews per-item in the UI. On commit: `status` → `committed`, `committedAt` populated, `lensReportId` set (for analysis lenses), graph items written (for surface-extraction) or `IDENTIFIED_IN` edges written (for analysis lenses).
- On skip: `status` → `skipped`. No graph writes. The run is a record of "we tried this and chose not to use it."
- A failed run can be re-tried — the re-try is a new `processing_runs` row, not a status flip on the old.

## Removed in v3

- `analysisResult` (jsonb) — moved to `lens_reports.result`. Per INP-12 wipe-and-re-ingest, the existing 3 INP-11 rows with this column populated are wiped along with everything else; no migration needed.
- `mode` (varchar) — renamed to `lens` with the 7-value vocabulary from ADR-009.

## Notes

- **Why is this not just a queue table?** Because it carries the prompt provenance (`promptFragmentsUsed`) and the raw LLM output for surface-extraction (`extractionResult`). When something looks wrong in the graph, this row is the place that records what the LLM was actually asked and what it actually said — irrespective of what got committed afterwards.
- **Why `extractionResult` stays here for surface-extraction (not on a separate table or `lens_reports`)?** Surface-extraction has no lens report. The per-item ideas/concepts/people the LLM proposed need to live somewhere between LLM-returns and user-commits. This row holds them. Once committed, the confirmed subset becomes graph nodes; the unreviewed/rejected items remain in this jsonb for audit ("we proposed Person 'Justyna K' on 2026-04-22 and the user rejected the match").
- **Why `lens` rather than `mode`?** Vocabulary alignment with ADR-009. Mode implied "the system chose a mode for this run"; lens implies "the user chose a frame to apply." The latter matches the actual UX.
- **Why `promptFragmentsUsed` as jsonb rather than two FK columns?** A run composes 2+ fragments (base + source-type + lens). Variable-arity = jsonb. Recording the git sha lets us reproduce the exact prompt later if a fragment file changes.
- **Why retain `embedding` as deprecated rather than dropping?** Backward-compatibility with the 3 existing INP-11 rows during the transitional period (before the wipe-and-re-ingest). Once the wipe runs, the column can be dropped in a follow-up migration. Keeping it as nullable + unused is cheaper than splitting into two tables.
- **Why no `updatedAt`?** Runs are append-only after the initial insert + status transition. The status transition is captured by `committedAt` (or implied by `status` flipping to `skipped`/`failed`). Adding `updatedAt` would imply mutability we don't want.
- **Migration from v2 (INP-11):** per INP-12, the existing 3 rows (1 batch pending, 1 batch skipped, 1 reflective pending) are wiped. The migration is: drop `analysisResult` column, rename `mode` → `lens`, add `lensReportId` FK, add `sourceTypeFilter`, add `lensInput`, add `promptFragmentsUsed`, add `errorMessage`, add `tokenUsage`. After migration, application code starts writing rows under v3 shape. No data migration needed because no rows survive.
- **What this table is NOT:** a job queue. There's no `assignedWorker` or `attemptCount` or `nextRetryAt`. A run is invoked synchronously from a request; if the request fails or times out, the row stays in `pending` (or `failed`) and the user re-runs from the UI. If we ever want async batch processing, that's a different table.
