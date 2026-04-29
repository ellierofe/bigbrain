# Session log — 2026-04-29 — OUT-02 Phase 1 Batch 2 (closed)
Session ID: 2026-04-29-out02-phase1-batch2-k4w

## What we worked on

OUT-02 Phase 1 Batch 2 — the four remaining schemas to close out Phase 1's
storage layer: `topic_paths`, `generation_runs`, `generation_logs`,
`library_items`. Continuation of `2026-04-28-out02-phase1-batch1-r7n`.

## What was done

### Four schemas shipped end-to-end via `schema-to-db` + `db-migrate`

| # | Table | Migration | Cols | Indexes | FKs | Highlight |
|---|---|---|---|---|---|---|
| 1 | `topic_paths` | 0025 | 17 | 5 | 2 self | Tree table — `parent_id` CASCADE + `next_step_id` SET NULL + materialised `path` natural key |
| 2 | `generation_runs` | 0026 | 16 | 5 | 3 | 30-day TTL via `expires_at` + `kept` flag; sweepable transient state |
| 3 | `generation_logs` | 0027 | 16 | 6 | 3 | **Newly added mid-batch** — permanent analytics record (cost/tokens/latency); covers legacy `creation_logs` role |
| 4 | `library_items` | 0028 | 14 | 7 (incl. GIN) | 2 | Supersedes REG-01; markdown snapshot + structured tags jsonb |

All migrations applied to Neon project `damp-boat-57321258` and recorded in
`__drizzle_migrations` with journal-derived `when` values + correct hashes.

Files created:
- 4 schema docs: `01-design/schemas/{topic-paths,generation-runs,generation-logs,library-items}.md`
- 4 Drizzle table files: `02-app/lib/db/schema/content/{topic-paths,generation-runs,generation-logs,library-items}.ts`
- 4 migrations: `0025_dear_scourge.sql`, `0026_tiny_bastion.sql`, `0027_panoramic_ego.sql`, `0028_fine_next_avengers.sql` (+ matching snapshot files)
- Barrel `02-app/lib/db/schema/content/index.ts` updated

### ADR-006 amended with two addendums

- **Addendum A** — locks `topic_paths` storage = tree table (resolves an Open Question Phase 1 was meant to settle).
- **Addendum B** — locks the three-table persistence split (`generation_runs` + `generation_logs` + `library_items`), explains why split rather than collapse, marks REG-01 superseded, locks TTL = 30 days.

File: `00-project-management/decisions/adr-006-content-creation-prompt-architecture.md`.

### Backlog updated

- **REG-01:** marked superseded — folded into OUT-02 as `library_items` (mig 0028).
- **REG-02:** dependency switched from `REG-01` → `OUT-02`.
- **OUT-02:** status note advanced from "Phase 1 batch 1 complete 2026-04-28" → "Phase 1 batch 2 complete 2026-04-29"; per-batch detail line updated to reflect the four migrations + the mid-batch `generation_logs` addition.

## Decisions made

- **`topic_paths` storage = tree table.** Self-FK CASCADE + materialised `path` natural key. See ADR-006 Addendum A.
- **Three-table persistence split** (`generation_runs` transient + `generation_logs` permanent analytics + `library_items` saved keepers). See ADR-006 Addendum B. The `generation_logs` table was **not in the original Batch 2 plan** — added mid-session after the user surfaced the legacy `creation_logs` precedent ("we want analytics on all generations, not just saved ones"). Captured immediately to avoid the half-baked-now-painful-later scenario.
- **REG-01 superseded by `library_items`.** Confirmed during the "what's actually different between content registry and library?" conversation. Both schemas were tracking the same thing — saved content snapshots + tags + publish metadata. Folded.
- **`library_items.tags` = single jsonb array of structured tag objects** with a `kind` discriminator (8 V1 kinds: `audience_segment`, `offer`, `knowledge_asset`, `topic_path`, `topic_item`, `source_document`, `statistic`, `free_text`). User-corrected my earlier proposal of two separate `auto_tags` + `user_tags` columns: tags are pre-filled at save time but freely editable thereafter — no UI distinction means no DB distinction. GIN index on `tags` for containment queries.
- **`library_items.text` = markdown** (single column, mutates on edit, no version history). UI handles render-to-formatted-HTML for display + copy-to-clipboard. `structured_content` jsonb column kept nullable for V2 long-form per-section editing.
- **`library_items` publish metadata as first-class columns** (`publish_status`, `publish_date`, `published_url`, `platform`) — calendar views and posting-software integration are foreseeable enough to warrant typed columns over loose tags.
- **`generation_runs.variants[].text` mutates in place** pre-save; regeneration is the "undo" surface. No edit history within the variants jsonb.
- **`kept` flag on `generation_runs`** is denormalised over `EXISTS (SELECT 1 FROM library_items WHERE generation_run_id = X)` for cheap sweep queries. App-layer maintained — flips true on first save, flips back on last delete. No Postgres trigger.
- **`generation_logs` granularity = per-run** (not per-variant) for V1; `stage_id` column allows V2 long-form to add per-stage rows without schema change. Write-on-completion (single insert when run completes/errors).
- **Per-migration apply over batched apply** (Option A from the plan). Each table got its own `db-migrate` run, keeping Batch 1's clean per-table cadence.

No new ADRs warranted — the addendums to ADR-006 cover the durable architecture choices.

## What came up that wasn't planned

- **`generation_logs` table.** Not in the original 3-table Batch 2 scope (was `topic_paths` + `generation_runs` + `library_items`). Surfaced when the user described the legacy `creation_logs` pattern: "stats on all generations, not just saved." A 5-minute design conversation produced the three-table split (transient + permanent metrics + opt-in keepers). Added without disrupting the rest of the batch.
- **REG-01's actual role.** User asked the right question — "what's the difference between content registry and library?" The answer was "nothing meaningful, REG-01 was a placeholder before OUT-02 had a proper home for it." Marked superseded inline.
- **`auto_tags` vs `user_tags` correction.** I initially proposed two separate columns; user corrected the model — tags are pre-filled at creation but freely editable, no DB distinction needed. Schema drafted with single `tags` jsonb after that.
- **`text` format for short-form.** I'd been treating short-form as plain text; user clarified that markdown should be the canonical format even for short-form (with UI handling formatted-HTML render + clipboard). Schema spells this out.

## Backlog status changes

- **OUT-02:** "Phase 1 batch 1 complete 2026-04-28" → "Phase 1 batch 2 complete 2026-04-29"; per-batch detail line rewritten to capture the four migrations + the mid-batch `generation_logs` addition.
- **REG-01:** `planned` → **superseded** by OUT-02 (folded into `library_items`).
- **REG-02:** `Depends on: REG-01, DASH-01` → `Depends on: OUT-02 (library_items schema; REG-01 superseded), DASH-01`. Status unchanged (still planned).

No other features touched.

## What's next

OUT-02 Phase 1 storage layer is now complete. Two natural pickup paths:

1. **Phase 2 — code work, no schema gates.** Build the real assembler (skeleton async pre-pass, `bundles.ts` BUNDLE_RESOLVERS map, real fragment lookups) and the topic-engine query layer (`lib/content/topic-engine.ts`) that resolves `topic_paths.dataQuery` against live DNA/source tables.
2. **Phase 3 — seeds.** Populate the 5 V1 content types end-to-end (one per major picker group: IG caption, blog post, email newsletter edition, brainstorm-blog, sales page hook), the 38 legacy fragments, and the ~50 `topic_paths` rows for the V1 cascade catalogue.

Either order works. Phase 2 first means we have an unrunnable assembler waiting for seeds; Phase 3 first means we have unused seed rows waiting for code. My instinct: Phase 3 first — the seeds expose any remaining schema gaps and give Phase 2 something concrete to test against. User picks.

Outstanding from Batch 1 carry-over (still applies):
- **Skeleton async pre-pass:** the assembler sketch in `lib/llm/content/assemble.ts` flagged that `regex.replace` can't resolve async fragment lookups. Real impl needs to parse skeleton → batch-fetch fragments → sync substitute. Phase 2 work.
- **`bundles.ts`:** create the BUNDLE_RESOLVERS map (one resolver per slug from `prompt-vocabulary.md`). ~11 V1 slugs.
- **Cron sweep:** Vercel cron job at `02-app/app/api/cron/sweep-generation-runs/route.ts` to delete expired drafts. Daily; Phase 2 work alongside the assembler.

## Context for future sessions

### State of OUT-02 Phase 1 storage layer (closed)

- ✅ `prompt_fragments` (0021) — 6 kinds, append-only versioning
- ✅ `content_types` (0023) — 24 cols, jsonb shapes for prerequisites/strategy/topic context
- ✅ `prompt_stages` (0024) — 17 cols, 4 FKs, `stage_kind` pgEnum
- ✅ `topic_paths` (0025) — tree table, 17 cols, 2 self-FKs, `path` materialised
- ✅ `generation_runs` (0026) — transient, 16 cols, `expires_at` + `kept` for TTL
- ✅ `generation_logs` (0027) — permanent metrics, 16 cols, no `updated_at` (immutable)
- ✅ `library_items` (0028) — saved keepers, 14 cols, GIN on `tags`
- ✅ Eight-layer assembler sketch (`lib/llm/content/{types,assemble}.ts`)
- ✅ Prompt vocabulary doc (`04-documentation/reference/prompt-vocabulary.md`)
- ✅ ADR-006 amended with Addendums A + B

### Decisions worth re-reading next session

- `library_items.tags` is one jsonb array of typed tag objects, NOT two separate `auto_tags`/`user_tags` columns. Future "save modal pre-fill" work derives initial tags from `generation_runs.inputs` (audience, offer, topic_chain) — this is a UI/handler concern, not schema.
- The `kept` flag on `generation_runs` flips false when the LAST referencing library item is deleted (not the first). App-layer transaction with `EXISTS` re-check; no trigger.
- `generation_logs` has no `updated_at` — log rows are immutable by design. Don't add one without a reason.
- `library_items.publishedUrl` is `text` not `varchar(2048)` — never queried against, just displayed.
- `library_items.variantId` is `varchar(50)` because variant ids in `generation_runs.variants[]` jsonb are client-generated uuid v4 strings, not Postgres uuid type.

### Skills used this session

- `schema-to-db` × 4 (one per table) — clean runs, no friction
- `db-migrate` × 4 — clean runs; the journal-`when` callout from session `r7n` worked correctly first time on every migration
- No skill changes proposed this session

### Commit hygiene reminder

Per-session commit policy from 2026-04-27 onwards: this session's files only get committed (the four schema docs, four Drizzle files, four migrations, four snapshot files, one journal update, ADR-006 amendments, backlog updates, this session log). Pre-existing unstaged work from earlier sessions (the ~40 modified/untracked files visible at session start) stays unstaged for separate handling.
