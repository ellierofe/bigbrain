# Session log — 2026-04-29 — OUT-02 Phase 3 (seeds shipped end-to-end)
Session ID: 2026-04-29-out02-phase3-seeds-q7m

## What we worked on

OUT-02 Phase 3 — seed data for the content creator. Three sub-tasks shipped end-to-end against the live Neon DB (`damp-boat-57321258`):
1. 38 `prompt_fragments` ported from legacy CSV
2. 4 fresh fragments + 3 V1 `content_types` + 3 `prompt_stages`
3. 101 `topic_paths` (full V1 cascade catalogue)

Continuation of `2026-04-29-out02-phase1-batch2-k4w` (Phase 1 storage layer closed earlier today).

## What was done

### Sub-task 1 — Legacy fragment port (38 rows)

Ported `04-documentation/reference/legacy_files/content_creation/Centralised Prompt Data Live.csv` into `prompt_fragments` via TS seed script. Re-categorised across the six new kinds (ADR-006):
- 24 `craft` (legacy `copywriting` direct map)
- 8 `context` (7 legacy `context` + 1 reclassified — `dna_tov`, marked `status='archived'` as it was for DNA generation, not OUT-02)
- 4 `proofing` (banned_words, labels, visual_formatting, no_fluff)
- 2 `output_contract` (json_five, json_ten — reclassified from legacy `proofing`)

Files:
- `02-app/lib/db/seed/out02-fragments-data.ts` (CSV-derived, regenerated via Python)
- `02-app/lib/db/seed/seed-out02-fragments.ts` (idempotent runner; upsert on `(slug, version)`)
- `02-app/package.json` — `db:seed:out02-fragments` script
- `04-documentation/reference/legacy-fragment-placeholder-drift.md` — Phase 2 punchlist: 9 fragments use 16 legacy `${...}` placeholder names (`audiencepromptstring`, `post_topic`, `tov_guideline`, etc.) that don't match the new vocabulary. Verbatim-port-then-audit per the brief; the rename happens when each fragment is exercised in Phase 2.

### Sub-task 2 — V1 content types (3 rows + 3 stages + 4 new fragments)

Three single-step content types, each with one stage:
- `instagram-caption` — 5 variants, json_five output, persona_social_copywriter + worldview_social_engagement
- `newsletter-edition` — 5 newsletter editions, json_five output, persona_owned_content_strategist + worldview_owned_content
- `brainstorm-blog-posts` — 10 ideas, json_ten output, same owned-content persona/worldview

Four fresh fragments authored to back the eight-layer model (legacy CSV had no personas/worldviews):
- `persona_social_copywriter`
- `persona_owned_content_strategist` (lifted near-verbatim from the well-pitched legacy newsletter primer)
- `worldview_social_engagement` (NEW prose — hook-is-the-post, one-angle-per-post, speak-to-one-person, engagement-as-metric)
- `worldview_owned_content` (NEW prose — earn-attention, business-as-messenger-not-message, format-respect)

Stage data captures all eight layers from the legacy CSV: `primer` → Layer 1, `second_primer` → Layer 3 task framing, `page_structure` → Layer 6 skeleton, `copywriting` → Layer 7 craft list, `instructions` → Layer 8 output contract + extras.

Files:
- `02-app/lib/db/seed/out02-content-types-data.ts`
- `02-app/lib/db/seed/seed-out02-content-types.ts`
- `02-app/package.json` — `db:seed:out02-content-types` script

### Sub-task 3 — topic_paths catalogue (101 rows)

Built the full V1 cascade catalogue from the architecture doc Part 3 spec — 12 step-1 categories, all sub-trees, all leaf prompt templates. Generated via Python (build script kept at `/tmp/topic-paths-build/` for trace, not committed).

Counts by category: audience 10, offer 20, knowledge_asset 21, platform 8, value_proposition 9, brand_meaning 6, brand_proof 7, source_material 2, own_research 6, mission 9, idea 2, free_text 1. By step level: 12 step-1, 22 step-2, 43 step-3, 24 step-4. By surfaceKind: 12 category, 8 entity, 49 aspect, 29 item, 3 sub_category. 55 leaves total (every leaf has a `promptTemplate`; no non-leaf has one).

Files:
- `02-app/lib/db/seed/out02-topic-paths-data.ts`
- `02-app/lib/db/seed/seed-out02-topic-paths.ts` (two-pass insert — pass 1 upserts with `parent_id=null`; pass 2 sets `parent_id` from the path→id map)
- `02-app/package.json` — `db:seed:out02-topic-paths` script

### Verification

- All three seeders idempotent (re-ran each, row counts unchanged, no duplicates)
- `prompt_fragments`: 42 total (38 legacy + 4 new)
- `content_types`: 3
- `prompt_stages`: 3, all wired to fragments by FK
- `topic_paths`: 101 rows, 0 orphans (every step >1 row has a parent_id)
- Project-wide `npx tsc --noEmit` clean across all seed files

## Decisions made

- **Verbatim port for legacy fragments** (option a from the placeholder-drift fork). Brief said "port verbatim, audit during use" — this preserves the legacy content unchanged and produces a punchlist for Phase 2 rather than rewriting blind. The 9 affected fragments won't assemble cleanly until placeholders are renamed (drift doc lists the mapping).
- **`dna_tov` reclassified to `context`/`archived`** rather than dropped. It was a DNA-generation fragment misfiled in `proofing`; archiving keeps the trace without polluting active OUT-02 content.
- **TS seed script over SQL migrations** for all three sub-tasks. Phase 3 is iterative — fragments and content types will be edited as the assembler exercises them in Phase 2. SQL migrations would mean a new migration per typo. The data files are the source of truth; runners upsert idempotently.
- **3 V1 content types, not 5.** User trim mid-session: blog post + sales page hook are long-form / multi-step territory and belong with OUT-02a. The legacy newsletter "5 editions per run" pattern keeps newsletter single-step compatible.
- **101 topic_paths rows, not "~50".** Brief estimate predates the architecture doc's full Part 3 catalogue. The spec is the authority; rows are cheap; built the full catalogue.
- **Personas/worldviews authored (4 of them)** rather than scraped one-to-one from the legacy CSV. Legacy CSV had `primer` (persona) but no separate worldview layer — that's an ADR-006 introduction. Personas drew from legacy primers (one near-verbatim); worldviews are fresh prose interpreting ADR-006's intent. User skipped the review gate ("seed them now").
- **Newsletter as 5-options single-step** preserved from legacy `numshots: one` + `${json_five}` pattern, not "one full newsletter". This makes it compatible with the json_five output contract and consistent with IG.

No ADRs warranted.

## What came up that wasn't planned

- **Topic paths spec is denser than the brief's "~50" estimate.** Architecture doc Part 3 catalogues all 12 categories with full sub-trees including all single-value aspects of offer / knowledge_asset / value_proposition / brand_meaning. Built the full spec; flagged to user for sign-off before committing.
- **Legacy `dna_tov` fragment** surfaced as misfiled during the kind-mapping exercise — it was for DNA generation, not OUT-02. Reclassified inline rather than dropping.
- **Path resolution for parent links** in topic_paths required a two-pass insert because `parent_id` is a self-FK (and Drizzle's `onConflictDoUpdate` wouldn't accept the dependent UUID at first-insert time). Pass 1 = upsert with `parent_id=null`, pass 2 = `UPDATE … SET parent_id` from the path→id map. Clean.

## Backlog status changes

- **OUT-02:** "Phase 1 batch 2 complete 2026-04-29" → "Phase 3 complete 2026-04-29; Phase 2 (assembler code + topic-engine query layer + cron sweep) is next." Phase 3 sub-bullet under Note: shipped 38 fragments + 4 new + 3 content types + 3 stages + 101 topic_paths.

No other features touched.

## What's next

OUT-02 **Phase 2 — code work, no schema gates.** Storage layer + seeds are now both fully populated. Phase 2 covers:

1. **Real assembler** with skeleton async pre-pass — replaces the regex-replace sketch in `02-app/lib/llm/content/assemble.ts`. Parse skeleton → batch-fetch fragments → sync substitute.
2. **`bundles.ts` BUNDLE_RESOLVERS map** — ~11 V1 slugs from `prompt-vocabulary.md` (offer_full, offer_summary, audience_voc, audience_summary, tov_frame, topic_intro, value_proposition, brand_meaning, knowledge_asset, competitor_context, recent_research). Each resolver pulls specific DNA fields and formats as a Layer 5 block.
3. **Topic-engine query layer** at `02-app/lib/content/topic-engine.ts` — interprets `topic_paths.dataQuery` jsonb against live DNA/source tables to surface picker options at each cascade step.
4. **Vercel cron sweep** at `02-app/app/api/cron/sweep-generation-runs/route.ts` — daily delete of expired drafts (`expires_at < now() AND kept = false`).

Once Phase 2 lands, Phase 3 fragments can be exercised against real generation — at which point the placeholder-drift punchlist (`04-documentation/reference/legacy-fragment-placeholder-drift.md`) becomes the next workstream.

## Context for future sessions

- **Seeders are idempotent.** Edit any of the three data files (`out02-fragments-data.ts`, `out02-content-types-data.ts`, `out02-topic-paths-data.ts`) and re-run the matching `db:seed:out02-*` script. Upsert keys: `(slug, version)` for fragments, `slug` for content_types, `(content_type_id, stage_order)` for stages, `path` for topic_paths.
- **9 of the 38 legacy fragments do NOT yet assemble cleanly.** They use 16 unknown legacy `${...}` placeholder names (full list in `legacy-fragment-placeholder-drift.md`). The other 29 have zero placeholders or only stable ones — safe to use as-is. This is by design (verbatim port).
- **Personas/worldviews are an open editorial surface.** I authored the worldview prose without review; user explicitly said "seed them now, these are working fine" but flag for re-read once the assembler runs them. Located by slug: `worldview_owned_content`, `worldview_social_engagement`, `persona_social_copywriter`, `persona_owned_content_strategist`.
- **`topic_paths.dataQuery` and `hasDataCheck`** vocabularies are interpreted at runtime by the topic-engine query layer (Phase 2). The resolver code does not exist yet — the seed rows declare WHAT to fetch but not HOW. When Phase 2 builds the resolver, expect minor jsonb shape adjustments as edge cases surface (offer-id parameter encoding, jsonb `@>` filter syntax for stats/testimonials).
- **`source_material.document` is one-step** (entity acts as multi-select item leaf). Unlike legacy where step 2 = type and step 3 = document, the new model treats type/tag/date as filter chips on a single document picker. Same for `idea.entity` — multi-select on the captured-ideas list, no further steps.
- **Long-form content (blog post, sales page) is now firmly in OUT-02a territory** — confirmed mid-session. The 5 V1 types from the brief (which included those two) is no longer the V1 set; it's 3 single-step types (IG, newsletter, brainstorm-blog) + 2 deferred. Flag this if anyone references "the 5 V1 content types" — that count is now wrong for V1.

### Skills used

- `session-log` (this skill) — clean run

### Commit hygiene

Per-session commit policy from 2026-04-27 onwards: this session's files only get committed (3 data files, 3 seed runners, package.json scripts addition, drift doc, this session log, backlog update). Pre-existing unstaged work (`02-app/components/create-offer-modal.tsx` modified at session start) stays unstaged.
