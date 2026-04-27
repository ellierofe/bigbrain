# Session log — 2026-04-27 — OUT-02 Phase 1 foundations
Session ID: 2026-04-27-out02-phase1-foundations-h4r

## What we worked on

- OUT-02 Phase 1 — schema layer for the eight-layer prompt model
- DNA-07b — new backlog entry for platform/ToV/content-type taxonomy consolidation (filed mid-session)
- Snapshot drift in `02-app/lib/db/migrations/meta/` — fixed as a side effect of running `drizzle-kit generate`
- Skill update to `feature-request` — lineage-suffix ID convention added

Continuation of `2026-04-27-out02-architecture-planning-q3v` (planning session earlier today). This session is the implementation kick-off.

## What was done

### `prompt_fragments` — shipped end-to-end

Built the unified fragment library per ADR-006. Six kinds (`persona`, `worldview`, `craft`, `context`, `proofing`, `output_contract`), append-only versioning via `(slug, version)` unique constraint, `status` enum (`draft`/`active`/`archived`), no `brandId` (single-tenant V1), `placeholders` jsonb for declared expected placeholders, indexes on `(slug, version)` unique and `(kind, status)`.

Files:
- `01-design/schemas/prompt-fragments.md` — new schema doc with kind reference, versioning explainer, usage notes
- `01-design/schemas/_archived-prompt-components.md` — old draft schema doc archived (the legacy 5-kind shape is superseded)
- `02-app/lib/db/schema/content/prompt-fragments.ts` — new Drizzle file
- `02-app/lib/db/schema/content/index.ts` — new barrel for the `content/` subfolder
- `02-app/lib/db/schema/index.ts` — re-exports `./content`
- `02-app/lib/db/schema/dna/prompt-components.ts` — deleted (superseded)
- `02-app/lib/db/schema/dna/index.ts` — removed `./prompt-components` export
- `02-app/lib/db/migrations/0021_prompt_fragments.sql` — migration file (DROP `prompt_components` CASCADE; CREATE `prompt_fragments` + 2 indexes)
- `02-app/lib/db/migrations/meta/0021_snapshot.json` — fresh snapshot reflecting current actual DB state

Migration applied to Neon (`damp-boat-57321258`) via `mcp__Neon__run_sql_transaction` — `prompt_components` (0 rows) dropped, `prompt_fragments` created with 13 columns + 3 indexes (PK + 2 added). Recorded in `__drizzle_migrations` with hash `316e1e0d...`.

### `content_types` — drafted but paused

Got through Steps A–F of `schema-to-db` for `content_types`. Schema, Drizzle file, migration SQL all drafted in conversation but **no files written**. Paused at the hard gate when the prerequisites vocabulary investigation surfaced a deeper taxonomy-shape problem (see "What came up").

### Snapshot drift in Drizzle migrations — fixed

When running `drizzle-kit generate` for `prompt_fragments`, Drizzle prompted about unrelated columns (`voc_mapping`, `customer_journey`, `source_document_ids`) — investigation revealed migrations 0019 and 0020 were applied in earlier sessions without their snapshot files (`0019_snapshot.json`, `0020_snapshot.json`) being created. The 0018 snapshot was the most recent state Drizzle could see.

Resolved by letting Drizzle generate `0021_snapshot.json` with the spurious column-creation prompts answered as "create" (those columns already exist in the actual DB), then **stripping the spurious ALTER statements from the SQL file** before applying. The snapshot is correct (reflects actual DB state); the SQL only contains the prompt_fragments work. Future migrations should now diff cleanly.

### DNA-07b filed

Captured the platform/ToV/content-type taxonomy consolidation gap as a new backlog entry (`DNA-07b`). Added between DNA-07 and DNA-08 in `00-project-management/backlog.md`. Updates: OUT-02 dependency line gained `DNA-07b`, OUT-02 status note flagged Phase 1 as paused, layer count summary updated (65 total, 61 planned).

### Skill update — `feature-request`

Added a one-paragraph note to Step C of `.claude/skills/feature-request/SKILL.md` explaining the lineage-suffix ID convention (`DNA-07b` rather than a fresh top-level ID when the idea refines an existing feature). Self-improvement check from the `feature-request` run that filed DNA-07b.

## Decisions made

- **`prompt_fragments` schema implementation choices** (per ADR-006):
  - Six kinds, `(slug, version)` unique constraint enabling append-only versioning, `status` enum, no `brandId` (V1 single-tenant). Documented in `01-design/schemas/prompt-fragments.md`.
- **Path A on platform-specific prerequisites** — defer to DNA-07b rather than building fragile platform locks now or doing the taxonomy consolidation inline mid-session. Trigger: noticed the legacy CSV's `prerequisites` column had platform-specific entries (`blog`/`podcast`/`webinar`/etc.) that semantically meant "needs a configured platform of this kind" — but BigBrain's `dna_platforms.platform_type` taxonomy is medium-grouped (`social`/`owned_content`/`email`/`video`/`audio`/`other`), too coarse to express that. And critically: for Ellie's self-use V1, the picker locks would never trip because she has all platforms configured — exactly the wrong way to validate the architecture. Better to fix the taxonomy seam once than route around it four times.
- **DROP `prompt_components` rather than evolve it** — old draft schema (5 kinds, with `brandId`, `isActive` boolean) is superseded by the eight-layer model. Verified table was empty (0 rows, 0 app code refs) before approving. Migration 0021 dropped + recreated as `prompt_fragments`.
- **Lineage-suffix backlog ID convention** — `DNA-07b` rather than a fresh top-level ID for refinements/follow-ons. Codified in `feature-request` skill.

No new ADRs warranted — this session implemented ADR-006 rather than establishing new architecture.

## What came up that wasn't planned

- **Snapshot drift in Drizzle migrations** — discovered when `drizzle-kit generate` prompted about unrelated rename ambiguities. Resolved as part of running migration 0021. Going forward, future migrations will diff cleanly. Worth a small addition to `schema-to-db` skill at Step G: after `drizzle-kit generate`, verify both the SQL file *and* the snapshot file are present in `meta/`. If only SQL was created, that's a signal of trouble. Not added in this session — flagged here for next time.

- **Platform / ToV / content-type taxonomy seam** — surfaced during the prerequisites vocabulary investigation. The four overlapping taxonomies (`dna_platforms.platform_type`, `dna_tov_applications.format_type`, `dna_tov_samples.format_type`, plus `content_types.format_type`) make platform-specific behaviour fragile in OUT-02 (picker locks, ToV cascade, Topic Engine "platform" category, prerequisite checks all depend on it). Filed as `DNA-07b`.

- **Drizzle's interactive rename prompt requires a real TTY** — piped input doesn't work, must be run in user's terminal. Worth adding to `schema-to-db`: "If `drizzle-kit generate` fails because of an interactive rename/create prompt, surface this back to the human — don't try to pipe answers in."

## Backlog status changes

- **DNA-07b** added (status `planned`, size M, layer `data + cross`). New entry between DNA-07 and DNA-08.
- **OUT-02** dependency line updated to include `DNA-07b`. Status note updated: Phase 1 paused 2026-04-27 pending DNA-07b. Partial-progress note added: prompt_fragments shipped (migration 0021), content_types drafted but paused.
- **Layer count summary** updated: Data (DNA) 10 → 11; Total 64 → 65, planned 60 → 61.

No status changes for any other features.

## What's next

OUT-02 Phase 1 is paused on **DNA-07b**. The user is doing DNA-07b in a separate window/session. When DNA-07b lands, resume OUT-02 Phase 1 from:

1. **Re-confirm `content_types` schema** with platform-specific prerequisite vocabulary now expressible. Specifically: re-read DNA-07b's outcome (canonical platform taxonomy + parameterised slug syntax for `prerequisites` jsonb), then update the `content_types` draft accordingly. Should be a small revision — most fields don't change, just the `prerequisites` semantics.
2. **Run `schema-to-db content_types`** through to migration. Should be a clean pure-additive migration (CREATE TABLE only, no FKs in this one).
3. **Run `schema-to-db prompt_stages`** — now content_types exists and can be FK-targeted. Has 3 FKs to `prompt_fragments` + 1 FK to `content_types`. Includes `stageKindEnum` pgEnum. FK cascades: `content_types → prompt_stages` is `cascade`, `prompt_fragments → prompt_stages` is `restrict`.
4. **Pause for assembler sketch** (per the original plan). Write `lib/llm/content/assemble.ts` against the three Batch 1 schemas — pressure-tests the jsonb shapes (`craft_fragment_config`, `topic_context_config`) before we commit them in Batch 2.
5. **Then Batch 2**: `topic_paths`, `generation_runs`, `library_items`.

## Context for future sessions

### State of OUT-02 Phase 1 right now

- ✅ `prompt_fragments` — schema doc, Drizzle file, DB table, all in sync. Snapshot 0021 reflects actual DB state.
- ⏸️ `content_types` — drafted in conversation but no files written. Paused at hard gate. **Don't proceed without DNA-07b's outcome** — the `prerequisites` jsonb vocabulary depends on it.
- ⏳ `prompt_stages`, `topic_paths`, `generation_runs`, `library_items` — not started.
- ⏳ Assembler, bundle resolvers, topic engine query layer — not started.
- ⏳ Seeds (38 fragments + 5 V1 content types + topic_paths rows) — not started.

### The prerequisites vocabulary — what was investigated

Parsed the legacy CSV (`04-documentation/reference/legacy_prompts/Content Creation Live Data.csv`) — 95 content types use 15 distinct prereq slug values (`brand`, `tov`, `audience`, `valueproposition`, `offer`/`offers` (drift), `expertise`, `blog`, `newsletter`, `podcast`, `video`, `webinar`, `central_bio`, `quiz`, `leadgen`). Of these:
- **Direct port to BigBrain DNA tables**: `brand`, `tov`, `audience`, `valueproposition` → `value_proposition`, `offer`, `expertise` → `knowledge_asset`, `central_bio` → `brand_intro:central`
- **Need DNA-07b's instance-shaped platform taxonomy**: `blog`, `newsletter`, `podcast`, `video`, `webinar`
- **DNA-08-dependent (parked)**: `quiz`, `leadgen` → `lead_magnet:<kind>`

Anticipated `prerequisites` syntax: simple slugs (`brand`, `audience`) for has-data checks, parameterised slugs (`platform:podcast`, `lead_magnet:quiz`) for filtered checks. Final shape ratified by DNA-07b.

Plan to also create `04-documentation/reference/prerequisite-vocabulary.md` once DNA-07b's outcome is known — documenting the canonical vocabulary + legacy CSV remap so the V1 port doesn't drift.

### Defaults for `content_types` to remember

- `defaultVariantCount`: 5 for short-form, 1 for long-form/multi-step, **10 for "ideas" content types** (per Ellie). Set per-row at seed time from legacy CSV's `numshots` column.
- `topicBarEnabled`: true by default; sales pages and offer-driven types set false. When false, `strategyFields` does the heavy lifting (offer selection, audience pre-fill).
- `formatType` gets touched by DNA-07b's taxonomy work — don't lock content_types' shape on this until DNA-07b decides whether `format_type` taxonomy is shared or layered.

### Migration / git hygiene reminder

Migrations 0009 through 0020 (and now 0021 + the snapshot drift fix) are not committed to git yet. The repo only has 2 commits ever; everything since `278ecb3` is uncommitted. Worth committing soon — separate concern from OUT-02 work, but flagged.

### Drizzle quirks for the next migration

- `drizzle-kit generate` must run in a TTY (interactive prompts can't be piped to)
- For DROP+CREATE on a renamed-shape table (like prompt_components → prompt_fragments), choose **"create table"** not "rename" when prompted — they're conceptually distinct tables
- Verify both SQL file and `meta/NNNN_snapshot.json` exist after generate; missing snapshot = silent corruption that bites future migrations

### Skills modified this session

- `feature-request/SKILL.md` — added lineage-suffix ID convention to Step C
- `schema-to-db/SKILL.md` — added TTY requirement for `drizzle-kit generate` (Step G.2) and snapshot file verification (Step G.4). Both lessons learned this session.
