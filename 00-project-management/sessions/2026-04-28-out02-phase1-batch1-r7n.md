# Session log — 2026-04-28 — OUT-02 Phase 1 batch 1 + assembler sketch
Session ID: 2026-04-28-out02-phase1-batch1-r7n

## What we worked on

- OUT-02 Phase 1 — schemas 2 & 3 (`content_types`, `prompt_stages`) plus the eight-layer assembler sketch
- Prompt vocabulary reference doc — placeholder + bundle slug vocabularies enumerated
- Skill update to `db-migrate` — journal `when` value usage clarified

Continuation of `2026-04-27-out02-phase1-foundations-h4r` (which shipped `prompt_fragments` and paused on `content_types` pending DNA-07b's outcome). DNA-07b shipped 2026-04-27 in a parallel session, so this session resumed Phase 1 from `content_types` onward.

## What was done

### `content_types` — shipped end-to-end

Schema doc → Drizzle file → migration 0023 → applied to Neon. Brand-new table, 24 columns, no FKs (intentional — `prompt_stages` FKs back to here).

Files:
- `01-design/schemas/content-types.md` — new schema doc (status: approved)
- `02-app/lib/db/schema/content/content-types.ts` — Drizzle table
- `02-app/lib/db/schema/content/index.ts` — added export
- `02-app/lib/db/migrations/0023_safe_stardust.sql` — migration
- `02-app/lib/db/migrations/meta/0023_snapshot.json` — snapshot

Migration applied to Neon (`damp-boat-57321258`) via `mcp__Neon__run_sql_transaction`. Recorded in `__drizzle_migrations` with hash `eb31100489…`.

The `prerequisites` shape was finalised against DNA-07b's outputs: `{ channels: string[]; lead_magnets: string[]; dna: PrerequisiteDnaKey[] }` where `dna` is a closed enum of 8 values (`brand`, `tov`, `audience`, `value_proposition`, `offers`, `expertise`, `central_bio`, `brand_meaning`).

### `prompt_stages` — shipped end-to-end

Same pipeline. 17 columns, 4 FKs, 1 new pgEnum (`stage_kind`).

Files:
- `01-design/schemas/prompt-stages.md` — new schema doc (status: approved)
- `02-app/lib/db/schema/content/prompt-stages.ts` — Drizzle table + enum
- `02-app/lib/db/schema/content/index.ts` — added export
- `02-app/lib/db/migrations/0024_known_fabian_cortez.sql` — migration
- `02-app/lib/db/migrations/meta/0024_snapshot.json` — snapshot

Migration applied. Hash `359bea3d70…`. FK delete semantics: `content_types → prompt_stages` is `cascade` (stages meaningless without parent); all three `prompt_fragments → prompt_stages` FKs are `restrict` (fragments are append-only-versioned; archive instead of delete).

### Assembler sketch — pressure-tested the jsonb shapes

Per the original Phase 1 plan: pause after Batch 1 to sketch the eight-layer assembler before committing to Batch 2. Goal was to confirm the four jsonb shapes (`prerequisites`, `strategy_fields`, `topic_context_config`, `craft_fragment_config`) survive a real walk through all 8 layers.

Files:
- `02-app/lib/llm/content/types.ts` — runtime types for the four jsonb shapes plus `GenerationInputs`/`StrategyAnswers`/`TopicChain`/`GenerationSettings`
- `02-app/lib/llm/content/assemble.ts` — eight-layer assembler walking every layer with stubbed bundle/fragment resolvers

**Outcome: all four shapes survived.** No schema changes needed. Sketch type-checks clean (only pre-existing unrelated `Trash2` error).

### Prompt vocabulary reference doc

The sketch surfaced two undocumented vocabularies the assembler depends on. Filed at:

- `04-documentation/reference/prompt-vocabulary.md` — new reference doc

Documents:
- **Placeholders** (`${...}` substitutions) in three groups: A. Strategy/selection (10 placeholders), B. Brand DNA (8 placeholders), C. Output/structural (3 placeholders). Resolution order, fail-closed semantics, no-escape-syntax-in-V1.
- **Bundle slugs** (named DNA resolvers referenced from `topic_context_config.dna_pulls[]`): 11 V1 slugs (`offer_full`, `offer_summary`, `audience_voc`, `audience_summary`, `tov_frame`, `topic_intro`, `value_proposition`, `brand_meaning`, `knowledge_asset`, `competitor_context`, `recent_research`) — what each pulls, naming conventions, ordering rules.

This doc is the source of truth; the assembler imports from constants in `02-app/lib/llm/content/types.ts` + `bundles.ts` (latter not yet created).

### Architecture doc deltas

- `01-design/content-creation-architecture.md` — `content_types` field renamed `category` → `picker_group` (with explanation). Worked example (sales-page-aida) updated. Otherwise unchanged.

### Skill update — `db-migrate`

`.claude/skills/db-migrate/SKILL.md` Step E got a callout reminding always to read the `when` value directly from `_journal.json`'s entry for the specific migration's tag, with an `UPDATE` recovery snippet if the wrong value is inserted. Triggered by a self-improvement check after I used the wrong `created_at` for migration 0024 (copy-paste drift from 0023's transcript) and had to UPDATE-fix it.

## Decisions made

- **Renamed `content_types.category` → `picker_group`** — removes the collision with `dna_platforms.category` (channel taxonomy from DNA-07b). The two are distinct concepts; same word was a footgun. Architecture doc and worked example updated to match.
- **`strategyFields` jsonb shape locked at `[{id, required}]`** — picker-scoped field IDs (e.g. `offer`, `audience_segment`, `sales_page_angle`), not column names. Closed enum of 7 V1 IDs in `lib/llm/content/types.ts`. Resolves an Open Question from the architecture doc that was left as "jsonb" without committing to a shape.
- **`stageKind` as pgEnum, but other catalogue columns stay `varchar`** — different reasons. `stage_kind` is genuinely closed (`single`/`blueprint`/`copy`/`synthesis`); enum migration cost is justified. `picker_group`/`platformType`/`formatType` evolve faster than the schema (channel taxonomy changes, new picker categories) — varchar with TS-layer enum is the safer pattern. Mirrors DNA-07b's `dna_platforms.category` decision.
- **FK delete semantics on `prompt_stages`** — `cascade` from `content_types` (stages are children, no standalone meaning); `restrict` from `prompt_fragments` (versioning is append-only; soft-delete via `status='archived'` is the correct path).
- **`(contentTypeId, stageOrder)` unique constraint** — prevents accidental duplicate stage rows. Cheap insurance at V1 scale.
- **`craftFragmentConfig.fragment_ids` are slugs, not uuids** — slug refs survive fragment versioning naturally (latest active version wins at resolve time). Architecture doc was loose on this.
- **`platformType` column kept (not renamed `channel`)** — column-name parity with the architecture doc; rename round-trip not worth it. Mirrors DNA-07b's "table name kept" decision.
- **V1 simplification of `topic_context_config.platform_metadata` enum** — `'when_platform_selected'` is effectively identical to `'always'` because every content type has NOT NULL `platform_type`. Kept distinct for V2 forward compat (multi-platform content types may need conditional injection).
- **Skill self-improvement: `db-migrate` journal-`when` callout added.** Real bug caught and fixed in-session — propose-and-merged at Step H of `db-migrate`.

No new ADRs warranted — Phase 1 implements ADR-006, doesn't establish new architecture.

## What came up that wasn't planned

- **`db-migrate` `created_at` drift** — when applying migration 0024, I used `1777324717499` (a timestamp adjacent to 0023's) instead of reading the journal entry. Caught immediately, fixed via UPDATE, and the skill got a callout to prevent repeat.
- **Skeleton resolution requires async pre-pass** — surfaced by the assembler sketch. The simple `regex.replace` pattern is wrong because fragment-slug resolution is async. Production assembler must parse skeleton → batch-fetch fragments → sync substitute. Not blocking schema work; flagged inline in `assemble.ts` for the build phase.
- **Unstaged tree** — found ~50 unstaged files from prior sessions when starting Step A of the session log. ~10 are from this session; the rest pre-date it. Surfacing for separate handling at commit time (see "Context for future sessions").

## Backlog status changes

- **OUT-02** — status note advanced. Was: "Phase 1 unblocked 2026-04-27 (DNA-07b shipped…)". Now: Phase 1 batch 1 complete (`prompt_fragments` + `content_types` + `prompt_stages` shipped); assembler sketch validated jsonb shapes; placeholder + bundle vocabularies documented. Next pickup: Batch 2 (`topic_paths`, `generation_runs`, `library_items`).

No other features touched. No new entries.

## What's next

OUT-02 Phase 1 Batch 2 — three more schemas:

1. **`topic_paths`** — declares the 1–4 step Topic Engine cascade. Open design question: tree-shaped table (parent_id, materialised path) vs single jsonb config. Architecture doc Part 8 Open Question 10 flags it; brief should lock. Lean tree table for queryability.
2. **`generation_runs`** — system-of-record for in-flight + recently-generated work. Persists from moment-of-submit. Includes `inputs` jsonb (matches the `GenerationInputs` shape now defined in `lib/llm/content/types.ts`), `assembled_prompt` text, `fragment_versions` jsonb map for reproducibility, `variants` jsonb array.
3. **`library_items`** — opt-in registry of explicitly-saved variants. May fold REG-01 (content registry) into here.

After Batch 2: seed the 38 legacy fragments + 5 V1 content types + topic_paths rows. Then build the assembler properly (skeleton pre-pass, real bundle resolvers, real fragment lookups). That's Phase 2/3 territory — separate session.

Phase 1 won't be "done" until Batch 2 ships and seeds land. Today's wrap is a clean batch-1 break.

## Context for future sessions

### State of OUT-02 Phase 1 right now

- ✅ `prompt_fragments` (0021) — 6 kinds, append-only versioning
- ✅ `content_types` (0023) — 24 cols, no FKs, jsonb shapes for prerequisites/strategy/topic context
- ✅ `prompt_stages` (0024) — 17 cols, 4 FKs, `stage_kind` pgEnum
- ✅ Assembler sketch + jsonb shape validation — `lib/llm/content/{types,assemble}.ts`
- ✅ Prompt vocabulary doc — `04-documentation/reference/prompt-vocabulary.md`
- ⏳ `topic_paths`, `generation_runs`, `library_items` — Batch 2
- ⏳ Real assembler (skeleton pre-pass, bundle resolvers, fragment lookups) — Phase 2
- ⏳ Seeds (38 fragments + 5 content types + topic_paths) — Phase 3

### Outstanding for build phase (not blocking schema)

Per the assembler sketch:
- **Skeleton pre-pass:** regex.replace can't resolve async fragment lookups. Real impl parses skeleton for `${slug}` refs, distinguishes placeholders from fragment slugs (placeholder vocabulary is a closed set in `prompt-vocabulary.md`), batch-fetches fragments in one query, then substitutes synchronously. Flagged inline in `assemble.ts`.
- **`bundles.ts`:** create the BUNDLE_RESOLVERS map (one resolver per slug from `prompt-vocabulary.md`). Each resolver pulls specific DNA fields and formats them as a Layer 5 block. ~11 V1 slugs.

### Commit hygiene reminder

Found ~50 unstaged files in the working tree at start of session-log step. ~10 are this session's; the rest are pre-existing. Per-session commit policy (established 2026-04-27, commit `95ab4e7`) means **only this session's files get committed** — pre-existing unstaged work from prior sessions stays unstaged for the human to handle separately or roll into a future catch-up commit. Not silently riding along.

### Skills modified this session

- `.claude/skills/db-migrate/SKILL.md` — journal-`when` callout added (Step E).
