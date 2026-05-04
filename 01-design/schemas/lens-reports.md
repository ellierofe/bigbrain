---
status: approved
table: lens_reports
type: processing-output
related_features: INP-12, OUT-01, OUT-02, RET-01
last_updated: 2026-05-01
depends_on: src-source-documents.md, processing-runs.md, ADR-002a, ADR-009
---

# Schema: lens_reports

Durable, first-class artefact representing the output of an analysis lens applied to a set of sources. One row per committed-or-draft lens report. Distinct from `processing_runs` (transient compute records) — `lens_reports` is the *output* worth keeping.

Six of the seven lenses (per ADR-009) write a `LensReport` on commit: `self-reflective`, `project-synthesis`, `pattern-spotting`, `catch-up`, `decision-support`, `content-ideas`. The seventh (`surface-extraction`) writes items directly to the graph and produces no lens report — its output *is* the graph items.

A lens report has a page (addressable URL), a status (`draft` / `committed` / `superseded`), and is re-runnable. Re-running the same lens on the same source set creates a new report and supersedes the old via `supersededById` rather than mutating in place — preserves audit trail. Items the lens identifies link to the report via `IDENTIFIED_IN` graph edges (per ADR-002a) and to the underlying sources via `DERIVED_FROM`.

## Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | Same UUID is used as the LensReport graph node id (matches the SourceDocument pattern). |
| `brandId` | uuid | not null, FK → `brands.id` cascade delete | Owning brand |
| `lens` | varchar(30) | not null | `self-reflective \| project-synthesis \| pattern-spotting \| catch-up \| decision-support \| content-ideas`. Note: `surface-extraction` is excluded — it writes no lens report. |
| `title` | varchar(300) | not null | Editable. Auto-suggested from sources + lens at draft time (e.g. `"Pattern spotting across 7 fundraising interviews — May 2026"`). |
| `summary` | text | nullable | One-paragraph user-facing overview of the report. LLM-generated on commit, editable. Used as embedding text and as preview in retrieval results. |
| `result` | jsonb | not null | Lens-specific structured output. Schema varies by lens — typed in `lib/types/processing.ts` (one interface per lens: `SelfReflectiveResult`, `PatternSpottingResult`, etc.). The reviewed-and-edited form, not the raw LLM output. |
| `lensInput` | text | nullable | Free-form input that shaped the lens (e.g. decision text for `decision-support`, focus area hint for `catch-up`). Null if the lens didn't take input. |
| `sourceIds` | uuid[] | not null | Sources the lens was applied to. References `src_source_documents.id` (and/or `src_source_collections.id` once that exists). Soft references — sources persist if their links to reports are broken. |
| `processingRunId` | uuid | not null, FK → `processing_runs.id` | The run that produced this report. One-to-one. |
| `status` | varchar(20) | not null, default 'draft' | `draft \| committed \| superseded`. `draft` = lens output exists but no items written to graph. `committed` = items written; report is the canonical record. `superseded` = a later re-run replaced this one (still readable for audit). |
| `committedAt` | timestamp with tz | nullable | Set when status flips to `committed`. |
| `supersededById` | uuid | nullable, FK → `lens_reports.id` | When re-run with the same source set, the new report supersedes the old. Old stays in the table; chain forms a versioned history. |
| `committedItemCount` | integer | not null, default 0 | Number of items the user confirmed and committed to the graph (for display/debugging — actual items live as graph nodes with `IDENTIFIED_IN` edges to this report). |
| `embedding` | vector(1536) | nullable | OpenAI `text-embedding-3-small`. Generated from `title + ' — ' + summary` on commit. Enables retrieval ("find lens reports about X"). |
| `embeddingGeneratedAt` | timestamp with tz | nullable | |
| `createdAt` | timestamp with tz | not null, defaultNow | |
| `updatedAt` | timestamp with tz | not null, defaultNow | |

## Indexes

- PK on `id`
- FK index on `(brandId, status)` — supports "show me all draft reports" / "all committed reports for this brand"
- FK index on `processingRunId`
- FK index on `supersededById`
- HNSW index on `embedding` (vector_cosine_ops) — semantic search across reports
- GIN index on `sourceIds` — supports "find all lens reports that drew on this source"

## Relationships

- 1:1 with `processing_runs` via `processingRunId` (transient compute record → durable artefact)
- N:M with `src_source_documents` via `sourceIds` array (soft ref — see notes)
- Self-reference via `supersededById` for versioning chain
- Mirrored as `LensReport` graph node in FalkorDB + `graph_nodes` mirror (per ADR-002a)
- Linked from extracted Idea/Concept/Methodology/Person/Organisation graph nodes via `IDENTIFIED_IN` edges
- Linked to source graph nodes via `ANALYSED_FROM` edges

## Status lifecycle

```
draft → committed → superseded
            ↓
       (terminal)
```

- **`draft`**: lens has run, structured output exists in `result`, no items written to graph yet. User is reviewing per-item. Editable freely.
- **`committed`**: user has confirmed items; graph nodes + edges written; `committedItemCount` populated. Report is now a durable, citable artefact. `result` becomes immutable in v1 (edit-then-recommit deferred to v2).
- **`superseded`**: a later re-run on the same source set produced a new report; this one is no longer the canonical version. Still readable. `supersededById` points to the successor.

A draft can be discarded (deleted outright; the `processing_run` flips to `status='skipped'`). A committed report can only be replaced via re-run, never deleted in v1 (audit trail preservation).

## Lens-specific `result` schemas (summary)

Full TypeScript interfaces in `lib/types/processing.ts` — drafted during INP-12 implementation. High-level shape:

| Lens | Top-level `result` keys |
|---|---|
| `self-reflective` | `summary`, `period`, `commitmentsAndFollowthrough[]`, `recurringBlockers[]`, `emergingThemes[]`, `shiftsInThinking[]`, `energyAndMomentum`, `keyRealisations[]`, `metaAnalysis[]`, `unexpected[]` (ports from INP-11 reflective output; `unexpected[]` per the universal base contract) |
| `project-synthesis` | `summary`, `projectName`, `methodology{}`, `whatWorked[]`, `whatDidntWork[]`, `reusablePatterns[]`, `caseStudyNarrative`, `contentAngles[]`, `openThreads[]`, `unexpected[]` (ports from INP-11) |
| `pattern-spotting` | `summary`, `dateRange`, `recurringThemes[]`, `convergences[]`, `divergences[]`, `synthesisedInsights[]`, `gaps[]`, `unexpected[]` (ports from INP-11 batch) |
| `catch-up` | `summary`, `since`, `whatChanged[]`, `whoSaidWhat[]`, `newDevelopments[]`, `unresolvedFromLastTime[]`, `unexpected[]` (new — drafted during implementation) |
| `decision-support` | `summary`, `decisionText`, `decisionFraming{}`, `evidenceFor[]`, `evidenceAgainst[]`, `gaps[]`, `suggestedNextSteps[]`, `unexpected[]` (new) |
| `content-ideas` | `summary`, `hooks[]`, `angles[]`, `formats[]`, `audienceHypotheses[]`, `unexpected[]` (new) |

Each entry within these arrays carries `sourceRefs[]` — populated with source `id` UUIDs (never titles or dates) — so commit can write `DERIVED_FROM` edges accurately. The exception is `gaps[]` items where they describe absences (no source contributed, by definition); these omit `sourceRefs`.

**Universal `unexpected[]` field**: every lens (including `surface-extraction`, which writes its `unexpected[]` to a dedicated property on the processing run rather than a LensReport, since surface-extraction does not produce a report) carries an `unexpected: Array<{ observation: string, why: string, sourceRefs: string[] }>`. This field exists so the LLM can surface left-field observations the lens's frame couldn't see — a surprising connection, a contradiction, an aside that could matter. Defined in `extraction-schemas/_base.md`. Bar is "genuinely worth surfacing", not "fill the field"; empty array is the typical right answer. The per-item review UI surfaces these alongside the lens's primary output for user review and individual commit/discard.

## Notes

- **Why distinct from `processing_runs`?** `processing_runs` is *one row per LLM call*. `lens_reports` is *one row per artefact worth keeping*. A run can be re-run (creating a new run); a report has versioned history via supersession. Conflating them mixes compute records with output records — fine until you want history, then you're stuck. INP-11 conflated them; INP-12 splits.
- **Why same UUID as graph node id?** Same pattern as SourceDocument and SourceChunk. Write the row, write the graph node with the same id, no extra lookup.
- **Why are `sourceIds` soft references (array column, not a join table)?** Sources should persist even if a lens report is deleted. A join table would force cascade decisions we don't want to make. The GIN index on the array gives us fast "find reports that cite source X" queries without the join table overhead.
- **Why is `surface-extraction` excluded from this table?** Surface extraction's "report" is the set of graph items written. Wrapping that in a LensReport would be ceremony — there's no synthesis, no narrative, no per-lens output schema worth preserving as a unit. The processing_run record + the items themselves + their `DERIVED_FROM` edges are the full provenance trail.
- **Embedding text composition:** `title + ' — ' + summary`. Both fields are user-reviewed (editable on draft, immutable on commit), so the embedding represents the canonical-form report.
- **Re-running a lens** creates a new `processing_runs` row + new `lens_reports` row in `draft` status. On commit of the new report, the old report's status flips to `superseded` and `supersededById` is set on the old. Items committed by the old report stay in the graph (we don't auto-delete) but get flagged in the UI as "from superseded report — review for staleness."
- **Versioning chain queries** ("show me all versions of this report") use a recursive CTE on `supersededById`. Three or four versions deep is realistic; not optimised beyond that.
- **No `is_archived` column** — superseded reports serve the audit role; archive is not a state we need.
- **What this table is NOT:** it's not the place where individual extracted items live. Items live as graph nodes (Idea, Concept, Person, etc.). The `result` jsonb holds the *structured analysis* the lens produced; the *items extracted from that analysis* are graph nodes linked back via `IDENTIFIED_IN`.
