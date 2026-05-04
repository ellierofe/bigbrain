# Session log — 2026-05-02 — INP-12 Source × Lens design + Track A schema layer
Session ID: 2026-05-02-inp12-source-lens-design-k7p

## What we worked on

- **INP-12** (new): Source × Lens processing model + richer graph representation. Replaces INP-11's hardcoded 4-mode processing with a composable two-axis model. Brief written, approved, and largely implemented at the data layer.
- **ADR-002a** (new): graph schema amendment — adds `SourceChunk`, `SourceCollection`, `SourceItem`, `LensReport` node types + `PART_OF`, `IDENTIFIED_IN`, `ANALYSED_FROM` edges; softens "no AI inference" rule with two narrow exceptions for source summaries.
- **ADR-009** (new): Source × Lens model as a first-class architectural decision.
- **4 schema docs**: 2 new (`src-source-chunks.md`, `lens-reports.md`), 2 updated (`src-source-documents.md` v3, `processing-runs.md` v3).
- **4 Drizzle migrations**: generated and applied to dev DB.
- **Skill update**: `db-migrate` SKL-09 — 2 gotchas added.

Spans 2026-04-30 → 2026-05-02 (single conversation thread).

## What was done

### Diagnostic (started this session)
- Reviewed live DB state: 70 source documents (58 in inbox), 3 processing runs (all pending/skipped), zero graph nodes, zero edges, zero canonical-register entries. The system had been *gathering* sources for 12 days but never *committing* anything to the graph.
- Read the existing INP-11 commit code paths. Discovered: `commitAnalysis()` is fully implemented (not a stub as previously thought), but the "Save analysis" UI button never calls the API — explaining why no analysis runs had ever committed. Individual extraction commit code is also wired correctly; no duplicate-source-doc bug.
- Identified the structural gaps INP-11 left: hollow SourceDocument graph nodes (no chunking, no real summary, embedding from first ~500 chars only), 4 hardcoded processing modes that conflate "what kind of source" with "what lens", no canonical-resolution UI for People/Orgs, no first-class home for analysis output.

### Brief (`01-design/briefs/INP-12-source-lens-processing.md`)
- Drafted via `feature-brief` SKL using the Conversational context shortcut. Approved 2026-04-30.
- Resolved 7 TBDs inline at approval (chunking rules per source type, Inbox dropped in favour of "NEW" label on Sources, canonical-resolution thresholds 0.75 suggest / 0.92 strong, decision-support takes free-form textarea, embeddings stay on OpenAI for v1, Justyna sessions ending noted).
- Clarified gate split: only `feature-build` end-to-end and re-ingest day are gated on KG-04. Track A (ADRs, schema docs, migrations, prompts, layout-design) is ungated — proceeds in parallel with the politics graph port.

### ADRs
- **ADR-002a** (`00-project-management/decisions/adr-002a-graph-schema-amendment-source-lens.md`) accepted 2026-04-30. Written as a separate amendment ADR (not edits to ADR-002 in place) so the audit trail stays clean. Decides the 4 new node types, 3 new edges, expanded `DERIVED_FROM` to accept `SourceChunk` as target, two narrow exceptions to "no AI inference" rule for source summaries (with examples of what's still forbidden).
- **ADR-009** (`00-project-management/decisions/adr-009-source-lens-processing-model.md`) accepted 2026-05-01. Documents the Source × Lens model as a first-class architectural primitive. Records: 13 source types × 7 lenses, prompt composition `[base] + [source-type fragment] + [lens fragment]` with fragments living as on-disk markdown for editability, `authority` as orthogonal property, `surface-extraction`'s asymmetric output (no LensReport wrapper but full per-item review still). Ruled out: extending INP-11's 4 modes, collapsing into one dimension, code-constant fragments, auto-picking lens from source type.

### Schema docs
- **`src-source-chunks.md`** (new): one row per semantic chunk. Speaker-turn for transcripts, paragraph for documents, slide for pitch decks. Per-chunk embeddings. Mirrored as SourceChunk graph nodes. Immutable (re-chunking deletes + recreates).
- **`lens-reports.md`** (new): durable analysis-lens artefacts. Status `draft → committed → superseded`. Re-runnable via `supersededById` self-FK. `surface-extraction` excluded (writes no report). N:M with sources via uuid[] array (soft refs).
- **`src-source-documents.md`** (v3, updates v2): added `sourceType` (controlled vocab of 13), `authority` (4 values), `summary` (LLM-generated), `summaryGeneratedAt`, `chunkCount`, `embeddingGeneratedAt`. Dropped free-form `type` column. `tags` and `participantIds` made NOT NULL with `'{}'` defaults. Reframed table as parent of chunks rather than the only representation of a source.
- **`processing-runs.md`** (new schema doc, codifies v3): renamed `mode → lens`, dropped `analysisResult` (moves to `lens_reports.result`), dropped `title` and `topicClusters`, added `sourceTypeFilter`, `lensInput`, `promptFragmentsUsed`, `lensReportId` FK, `errorMessage`, `tokenUsage`, `status` type-changed to varchar(20). Embedding retained as deprecated.

All 4 approved 2026-05-01.

### Drizzle schema files
- `02-app/lib/db/schema/source.ts` — `srcSourceDocuments` rewritten for v3 (added `sql` import for array defaults).
- `02-app/lib/db/schema/source-chunks.ts` (new file) — `srcSourceChunks`.
- `02-app/lib/db/schema/lens-reports.ts` (new file) — `lensReports`.
- `02-app/lib/db/schema/inputs/processing-runs.ts` — rewritten for v3.
- `02-app/lib/db/schema/index.ts` — added `source-chunks` and `lens-reports` barrel exports.

### Migrations (generated via `schema-to-db`, applied via `db-migrate`)
- `0032_inp12_source_docs_v3.sql` — applied prior to this session.
- `0033_inp12_source_chunks.sql` — applied prior to this session.
- `0034_inp12_lens_reports.sql` — applied prior to this session.
- `0036_inp12_processing_runs_v3.sql` — applied this session via Neon MCP transaction (16 statements). Recorded in `drizzle.__drizzle_migrations` as id=36 with hash `31b9d80fc2d38996db583c624428f99acf41df8522912b6639ca6e459cab9efa`.
- (`0035_pane_open_default_false.sql` is unrelated — was already applied before this session.)

### Wipe
- `processing_runs` (3 rows) and `src_source_documents` (70 rows) deleted at start of session. Made the v3 migrations clean (no NULL backfills, no jsonb shape drift handling). Graph was already empty so no FalkorDB or canonical-register cleanup needed. User explicitly approved as test data.

### Verification (post-migration)
- Confirmed `processing_runs` has 15 columns matching the v3 schema doc exactly.
- 2 FKs verified (`brand_id` cascade, `lens_report_id` set-null).
- 5 indexes verified (PK, brand_status, embedding HNSW, lens_report btree, source_ids GIN).
- Cross-table column counts: docs 25, chunks 14, reports 17, runs 15. All match.

### Memory updates
- `~/.claude/projects/-Users-eleanorrofe-bigbrain/memory/project_processing_model.md` — fully rewritten to reflect INP-11 → INP-12 supersession, current Track A/Track B status, Justyna sessions ending note.

## Decisions made

- **INP-12 supersedes INP-11 conceptually but doesn't replace its shipped code.** INP-11 stays in the backlog as `done` for what it shipped; INP-12 is the new entry. Cleaner audit trail than reopening INP-11. Reference: backlog INP-11 "Remaining" line points to INP-12.
- **ADR-002a as separate amendment, not edits to ADR-002.** Preserves the original ADR's 2026-03-30 approval record. See ADR-002a §"Context" for the rationale.
- **ADR-009 as separate ADR (not folded into the brief).** The Source × Lens model is a first-class architectural primitive — future feature work will need to reference it independently of INP-12.
- **Wipe rather than backfill.** Three uncertainties (defaults for new NOT NULL columns, NULL handling on existing arrays, jsonb shape drift on `processing_history`) collapsed into "the table is empty, the migration is straightforward." User approved both tables as test data.
- **`surface-extraction` writes no LensReport but still goes through full per-item review.** Asymmetry is in output shape only, not in review path. Captured as an explicit clarification in ADR-009 after user feedback.
- **Lens reports use soft references (uuid[] arrays) for sources, not join tables.** GIN indexes give fast "find reports citing source X" queries; sources persist if reports are deleted. Same pattern as DNA soft refs.
- **`processingRunId` FK uses `ON DELETE restrict`** rather than cascade. Reports are durable; deleting a run shouldn't silently destroy its report.
- **`mode → lens` answered as "create" rather than "rename" at Drizzle prompt** for the `processing_runs` v3 migration. Table was empty so end state is identical, but the snapshot now records `mode` as deleted and `lens` as a fresh column. Acceptable per ADR-009 (the columns are semantically distinct under the new vocabulary). Decision recorded in INP-12 brief decisions log for future reference if a similar rename happens on a populated table.
- **Embeddings stay on OpenAI `text-embedding-3-small` for v1.** Gemini embedding evaluation deferred to re-ingest day if cost or latency bites. Not blocking INP-12.

## What came up that wasn't planned

- **BUG-01 already exists in the backlog** (line 921), surfaced 2026-05-01 by another session during OUT-01b build. The bug is the runtime fallout of our Drizzle schema rename: callers in `lib/db/queries/{sources,missions,dashboard}.ts`, `lib/processing/commit.ts`, `app/api/process/{batch,individual,reflective,synthesis}/route.ts` and `app/api/sources/route.ts` still reference the dropped `type` column on `src_source_documents`. `next build` fails on prerender as a result; dev server unaffected. **Mechanical fix** (~10 TS errors): rename `type` → `sourceType` across those files. Tracked separately as BUG-01. Added a "Known fallout" note to the INP-12 backlog entry pointing at BUG-01.
- **Migration 0035** (`pane_open_default_false`) sat between our INP-12 migrations because another work stream landed it during the same window. Unrelated, idempotent (column default already matched), and confirmed already applied before this session. Worth noting because it broke my initial counting of "pending vs applied" via the journal idx — see skill update below.

## Backlog status changes

- **INP-12** added: status `in-progress (track A schema layer done; prompts + layout remaining; feature-build blocked on KG-04)`. Brief approved 2026-04-30, updated 2026-05-02. Track A done items, Track A remaining, Track B gated items, and BUG-01 fallout all listed in the entry.
- **INP-11** updated: "Remaining" line now points to INP-12 ("Both items now folded into INP-12").

## What's next

**Track A remaining (ungated, in parallel with KG-04):**
- **Lens prompts** (port 3 from INP-11, draft 4 new). Land in `01-design/schemas/lens-prompts/`. Pure prose work, ~1 session.
- **Source-type schema fragments** (13 files in `01-design/schemas/extraction-schemas/`). Pure prose, ~1 session.
- **`layout-design` for the new UI surfaces**: Sources NEW label + filter chip, bulk-triage flow, lens picker, canonical-resolution micro-UI, contact-card sub-form, lens report page, per-item review/edit panels.

**Suggested order:** lens prompts → source-type fragments → layout-design (the layout work benefits from knowing the prompts first because UI shape mirrors lens output schemas).

**BUG-01:** mechanical caller updates (`type → sourceType` across ~8 files) to unblock `next build` and Vercel deploy. Cost ~30 min in a focused session. Not blocking INP-12 but blocking deployment. Worth doing before any further code changes ship.

**Track B (gated on KG-04):** wait for politics graph audit + import to complete. Then: canonical-resolution UI live, re-ingest day, feature-build end-to-end.

## Context for future sessions

- **The system is currently in a partially-broken state for *deployment*, not for *dev work*.** Dev server runs fine. Production deploy fails until BUG-01's caller updates land. Do not ship anything until BUG-01 is resolved.
- **The wipe of `src_source_documents` and `processing_runs` was intentional and approved.** Don't treat the empty tables as a bug or attempt to backfill from external sources.
- **INP-11's Drizzle code paths still exist in the codebase** (analyse.ts, commit.ts, commit-analysis.ts, the API routes) — they reference the *old* shape. They're broken right now (BUG-01) and will be replaced/rewritten when INP-12 implementation begins. Don't try to "fix" them to match the new schema in isolation; the right fix is the Source × Lens commit pipeline, not patching INP-11 commit code in place.
- **The 4 INP-12 migrations are applied to dev DB.** Do not regenerate them. The Drizzle schema files in `02-app/lib/db/schema/` are the source of truth for the table shape; they match the schema docs and the live DB.
- **ADR-002a softens the "no AI inference" rule narrowly** — only `SourceDocument.description` and `SourceChunk.description` are allowed to be LLM-generated. Reviewers of new ingestion code should treat any LLM-touched property beyond those (especially on Person, Organisation, or extracted Idea/Concept nodes) as a rule violation requiring justification.
- **Lens report `result` jsonb shapes are typed in `lib/types/processing.ts`** — not yet drafted for the 4 new lenses. Each lens needs its own TypeScript interface (`SelfReflectiveResult`, `PatternSpottingResult`, etc.) before the lens prompts can produce well-typed output.
- **Memory file `project_processing_model.md` was rewritten** — the old INP-11 content was preserved in the historical paragraph but the bulk of the file now describes INP-12 state. Future sessions reading memory should get the current picture, not the April one.

## Skill updates this session (Step H)

Two updates to `db-migrate` SKL-09 (`/Users/eleanorrofe/bigbrain/.claude/skills/db-migrate/SKILL.md`):

1. **Step A — pending-migration detection.** Replaced the prior "count journal entries vs table rows" guidance with hash-based detection. The reliable method is: SHA-256 each candidate `.sql` file's contents, then `SELECT EXISTS(... WHERE hash = '[hash]')` against `drizzle.__drizzle_migrations`. The previous count-based approach broke this session because Drizzle's internal bookkeeping creates a small offset between journal idx and table id that's invisible until you hit it. Lost ~5 minutes recovering.
2. **Step E — MCP transaction syntax gotcha.** Added a note that `mcp__Neon__run_sql_transaction`'s `sqlStatements` parameter rejects multi-line JSON array literals with "Expected array, received string" but accepts single-line `["stmt1", "stmt2", ...]` literals. Cost 2 wasted tool calls before I figured it out.

One update to `session-log` SKL-10 (`/Users/eleanorrofe/bigbrain/.claude/skills/session-log/SKILL.md`):

3. **Step I — parallel-session staging convention.** Rewrote the "What to stage" guidance to assume parallel sessions are normal (Ellie often runs multiple Claude windows scoped to different features). Each session commits only its own work via explicit pathspec (`git add path1 path2 ...`), never `git add .` or `git add -A`. Shared bookkeeping files (e.g. `_journal.json`, barrel indexes) get committed by whichever session lands first. The pre-commit gate now requires presenting BOTH the staged set AND the deliberately-unstaged set (with attributed owner sessions where known) so the human can spot miscategorisations. Surfaced when the working tree contained ~15 OUT-01b context-pane files alongside our INP-12 work and the existing skill guidance ("roll prior work into this commit or roll a separate catch-up commit") didn't match the actual workflow.

All three improvements are material — they directly address friction encountered in this session that future sessions would otherwise re-encounter.
