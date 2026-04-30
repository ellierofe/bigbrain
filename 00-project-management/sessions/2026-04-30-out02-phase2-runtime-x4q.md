# Session log — 2026-04-30 — OUT-02 Phase 2 closed (assembler + bundles + topic engine + cron)
Session ID: `2026-04-30-out02-phase2-runtime-x4q`

## What we worked on

OUT-02 Phase 2 — the runtime layer for the content creator. Continuation of `2026-04-29-out02-phase3-seeds-q7m`. Phase 2 has four sub-tasks; all four shipped this session:

1. Real eight-layer assembler (replaces the regex sketch from Phase 1 batch 1)
2. DNA bundle resolvers (Layer 5 building blocks — 10 V1 slugs)
3. Topic engine (interprets `topic_paths.dataQuery` against live DNA)
4. Vercel cron sweep for expired `generation_runs`

Phase 2 closes today. OUT-02 runtime is complete; the picker UI is the next workstream.

## What was done

### Sub-task 1 — Real assembler

Replaced `02-app/lib/llm/content/assemble.ts` from the Phase 1 sketch (regex placeholder substitution, every resolver stubbed) with a working implementation. New supporting files:

- `02-app/lib/llm/content/fragments.ts` — fragment registry. `getFragmentById` (FK pins, any version) + `getFragmentsBySlugs` (latest active version per slug, batched in one query). Both populate the `fragment_versions` audit map persisted on `generation_runs`.
- `02-app/lib/llm/content/placeholders.ts` — 22 placeholder resolvers across Groups A/B/C from `prompt-vocabulary.md`. Per-call `AssemblerCtx` carries a DNA cache (each table read at most once per assemble call) plus content-type meta (slug, platformType, formatType, subtype) for channel-aware bundles. Cached DNA accessors re-exported for use from `bundles.ts`.

Substitution pipeline (per Ellie's spec — two fragment expansion passes):
1. Pass 1 — substitute `${fragment_slug}` tokens with fragment content
2. Pass 2 — substitute `${fragment_slug}` again (catches one level of nested fragment refs)
3. Pass 3 — substitute `${placeholder}` from inputs / DNA / settings

Anything still matching `${...}` after pass 3 throws. Fail-closed by design.

Constants `ALL_PLACEHOLDERS` and `BUNDLE_SLUGS_V1` exported from `02-app/lib/llm/content/types.ts` — single source of truth for the vocabulary.

**Drift fixes shipped during this sub-task** so the smoke could run end-to-end (Path B: fix in place rather than build against broken data):
- Bumped `topic` and `topic_platform` fragments to v=2 with renamed placeholders. Archived v=1 rows.
  - `${post_topic}` → `${selected}`
  - `${audiencepromptstring}` → `${segment_name}`
  - `${customer_journey}` → `${customer_journey_stage}` (new placeholder added to vocab Group A)
  - `${contentplatformstring}` → `${platform_name}`
- Renamed inline `${contentplatformstring}` → `${platform_name}` in newsletter-edition's structural skeleton.
- Updated `04-documentation/reference/legacy-fragment-placeholder-drift.md` to show V1 callsites resolved; remaining drift parked for fragments not in V1 use; added a content-overlap note about `topic_platform` echoing Layer 5 bundles.

**Vocab corrections:**
- Added `${customer_journey_stage}` to vocab Group A (`prompt-vocabulary.md` + `PLACEHOLDERS_GROUP_A` constant).
- Corrected vocab doc references: `${brand_name}` reads from `dna_business_overview.business_name` (not `brand_name`); `${tov_core}` reads `dna_tone_of_voice.summary` (not `core_descriptors`).

**Seed-data corrections:**
- `topic_context_config` on all 3 content_types was missing `uses_topic_engine` + `platform_metadata` keys — Layer 5 silently rendered empty. Added: IG `(true, when_platform_selected, free_text_only)`, newsletter `(true, always, dna_only)`, brainstorm `(true, when_platform_selected, free_text_only)`.
- `craft_fragment_config` type definition (`fragment_ids`, `CraftTier[]`) didn't match seed canonical (`slugs: string[]`, `tiers: Record<label, slugs[]>`). Updated `types.ts` to match storage reality.
- `seed-out02-content-types.ts` slug→id resolver now picks **latest active version** per slug (was: arbitrary by insertion order — would break with v=2 fragments).

### Sub-task 2 — DNA bundle resolvers

`02-app/lib/llm/content/bundles.ts` filled in with all 10 V1 resolvers. Read-only, side-effect-free, per-call DNA cache via shared `AssemblerCtx`:

- `audience_summary` — segment_name + persona + role_context / summary
- `audience_voc` — bulleted problems / desires / objections from selected segment
- `offer_full` — full offer block: name, USP, outcomes, benefits, pricing, guarantee, CTA
- `offer_summary` — name + USP + top 3 outcomes
- `tov_frame` — ToV essence + linguistic notes + 2 samples (subtype → format_type → cross-bucket fallback per `channel-taxonomy.md`)
- `topic_intro` — topic-chain leaf as a header line
- `value_proposition` — core_statement + up to 3 differentiators
- `brand_meaning` — vision / mission / purpose / values (tolerates string-array OR object-array shapes for `values`)
- `knowledge_asset` — overview + principles + key_components + flow
- `recent_research` — last 3 `src_own_research` rows (returns null when empty — current state)

Bundles that need an entity but the strategy didn't pre-select one return null (assembler skips). `audience_*` defaults to first active segment when not pre-selected.

### Sub-task 3 — Topic engine

`02-app/lib/content/topic-engine.ts` — picker-facing API + cascade resolver:
- `listCategories(brandId)` — step-1 categories with has-data gating
- `listChildren(brandId, parentId, params)` — children of any node (structural OR data-explosion)
- `checkHasData(brandId, node, params)` — gate evaluator for all 5 query kinds
- `resolveChain(brandId, leafPath, params, selectedItems)` — fills the leaf's `prompt_template` and returns `TopicChain` ready for `generation_runs.inputs.topic_chain`
- `resolveFreeText(text)` — escape hatch
- `getNode(path)` — by dotted natural key

Five `dataQuery` kinds covered: `static`, `table`, `single`, `jsonb_array`, `joined`. Filter strings parsed via a whitelist grammar (`field=literal`, `field!=literal`, `field IS NOT NULL`) — never interpolated as raw SQL. Per-table label/placeholder projection map at `TABLE_PROJECTIONS`.

The leaf resolver is "Wized-style madlibs" per Ellie's confirmation: topic engine fills all 18 distinct placeholders found in `topic_paths.prompt_template` itself before producing `prompt_template_resolved`. Assembler-side placeholder vocab keeps the 8 overlapping names so other prompt locations (skeleton, fragments) can use them.

**Bug caught in smoke + fixed:** jsonb_array element extraction was using `JSON.stringify` for object shapes whose label-bearing field wasn't in the fallback chain. Audience VOC arrays use `{ text, category }` — added `text` as the first fallback key. Confirmed all live shapes (`text` for VOC, `finding` for key_findings, `name` for brand_meaning.values) now render as plain strings.

### Sub-task 4 — Cron sweep

- `02-app/app/api/cron/sweep-generation-runs/route.ts` — auth-guarded `GET` handler. `DELETE FROM generation_runs WHERE expires_at < now() AND kept = false`. Returns `{ ok, deletedCount, durationMs }`. Auth via `Authorization: Bearer ${CRON_SECRET}` (Vercel's standard cron auth pattern).
- `02-app/vercel.json` — daily schedule at 03:15 UTC.
- `02-app/.env.example` — added `CRON_SECRET` with generation note (`openssl rand -base64 32`).

**Action required from Ellie before deploying:** run `openssl rand -base64 32`, copy the output, set `CRON_SECRET=<that value>` in `.env.local` AND in Vercel project env. Without it, the route returns 500.

### Smoke tests

All passing 2026-04-30:
- `02-app/lib/llm/content/__smoke__/assemble-smoke.ts <slug>` — assembles each V1 content type end-to-end. Final lengths: instagram-caption 25,573 / newsletter-edition 9,021 / brainstorm-blog-posts 5,030 chars. Verifies Layer 5 lights up with real DNA bundles.
- `02-app/lib/content/__smoke__/topic-engine-smoke.ts` — walks audience cascade (categories → segments → aspects → items), resolves leaf, plugs into assembler. Verifies free-text path. Confirmed `${aspect_label}`, `${segment_name}`, `${selected_items_joined}` all resolve.
- `02-app/lib/db/__smoke__/sweep-generation-runs-smoke.ts` — inserts 3 fixture rows (expired+unkept, expired+kept, fresh+unkept), runs the sweep DELETE, confirms only the right one dies. Cleans up after itself.

## Decisions made

- **Path B for drift handling** (fix in place, then build assembler) chosen over Path A (build against broken data, fix later). Reasoning: V1 drift surface was tiny (4 placeholder names, 2 fragments, 1 skeleton) and validating the assembler against a stage that actually assembles is much more useful than mocking. Documented inline in the assembler / drift doc.
- **Two fragment expansion passes** (per Ellie's preference, mirroring legacy Wized behaviour). Bounded recursion — no cycle detection needed because pass 2 re-runs the same substitution; anything unresolved after pass 2 throws.
- **Topic engine resolves leaf placeholders itself** ("madlibs" pattern, mirroring Ellie's Wized `constructPrompt()` function). Topic-engine-private placeholders (`${stat}`, `${quote}`, `${narrative_or_summary}`, etc.) never reach the assembler. Assembler-side vocab keeps the overlap (`${segment_name}`, `${offer_name}`, etc.) for non-topic prompt locations.
- **DNA cache is per-`assemble()` call** — generation runs are short-lived; per-call cache avoids stale-data bugs without adding TTL infra.
- **Cron auth via Vercel's `Bearer ${CRON_SECRET}` convention** — standard, well-documented, single env var, works for both scheduled triggers and manual admin runs.

No new ADRs from this session's decisions — they're all reversible implementation choices documented inline in the relevant files. ADR-008 (skills as a chat primitive distinct from OUT-02's content architecture) was authored in a parallel workstream this week and committed in the catch-up commit alongside this session — see "What came up" below.

## What came up that wasn't planned

Items 1–4 below are now captured as backlog entries / drift-doc notes, so they're discoverable without reading this log:

1. **No `newsletter`/`email` ToV samples** — `tov_frame` bundle's sample block silently empty for newsletter generations. Captured as an addition to DNA-09's "Deferred from DNA-09 scope" section in the backlog: option (a) add samples, option (b) add `newsletter → blog` to `FORMAT_FALLBACKS`.
2. **`topic_platform` fragment content overlaps Layer 5 bundles** — mild echo where Layer 5 ("the problems faced by X") is followed by Layer 6 ("The specific topic to consider is the problems faced by X"). Captured in `04-documentation/reference/legacy-fragment-placeholder-drift.md` under the `topic_platform` deferred-cleanup entry.
3. **`platform` strategy field id used in seeds isn't in the `StrategyFieldId` union** — works via type cast in `placeholders.ts`. Captured as backlog entry **OUT-02-PL2: StrategyFieldId vocabulary tightening**.
4. **Only the audience cascade is smoke-tested** — offer / methodology / mission / own_research / source_material / brand_proof paths are coded but unverified against real data. Captured as backlog entry **OUT-02-PL1: Topic engine cascade coverage tests**.
5. **`group_by` data_query hint** on `source_material.document` is currently ignored by the executor. Inline TODO in topic-engine.ts; not severe enough to warrant its own backlog entry. Decide at picker UI time whether the picker honours it.
6. **Pre-existing unstaged work surfaced at commit time:**
   - `00-project-management/decisions/adr-008-skills-vs-content-creation-architecture.md` (skills as a chat primitive distinct from OUT-02)
   - `01-design/briefs/OUT-01a-chat-skills-infrastructure.md`
   - `00-project-management/backlog.md` modifications adding OUT-01a/b/c entries + UX-14 (generation gating) + DNA-02 dependency updates
   - These were not from this session — separate prior work. Per Ellie's call: split into a "catch-up" commit before this session's commit. Procedural, not a real "issue".

## Backlog status changes

- **OUT-02** — status note updated to reflect Phases 1–3 all closed by 2026-04-30. Phase 4 (UI) is the remaining workstream. Phase 2 implementation log added under the entry; Phase 4 next-steps added.
- **OUT-02-PL1** — added (cascade smoke coverage, S, planned)
- **OUT-02-PL2** — added (StrategyFieldId vocab tightening, XS, planned)
- **DNA-09** — added a sample-coverage gap note to the deferred-scope paragraph (newsletter/email samples missing)

No other backlog status changes from this session's code work. (The OUT-01a/b/c additions in the working tree are from prior unstaged work, not this session.)

## What's next

Two concurrent paths emerged from this session:

1. **OUT-01a / b / c (chat skills infrastructure)** — newly defined this week per ADR-008. Skills as a chat primitive, separate from OUT-02's content-creation architecture. First consumer: DNA-02 generation flows. Now blocking `DNA-02` on the backlog.
2. **OUT-02 Phase 4 (picker UI)** — now unblocked by the runtime work. Topic engine is the data layer; assembler is the model-call substrate. Picker → Strategy panel → variant editor → library.

If picking up OUT-02 Phase 4 next: start with the picker, which sits on top of `topic-engine.ts`. Server actions wrap `listCategories` / `listChildren` / `checkHasData` / `resolveChain`. UI is a 1–4 step modal cascade. Architecture doc Part 4 covers it.

If picking up OUT-01a next: ADR-008 is the spec; brief is at `01-design/briefs/OUT-01a-chat-skills-infrastructure.md`; this is greenfield (not built on OUT-02 internals).

Action item: set `CRON_SECRET` in Vercel project env before the next deploy, otherwise the scheduled cron returns 500.

## Context for future sessions

- The legacy fragment drift doc lists 5 fragments still carrying legacy placeholder names — they don't block V1 because no V1 stage references them, but any new content type pulling them will fail-closed at assemble time. Resolve via the documented pattern (v=2 + archive v=1) when needed.
- `assembler-side` placeholder vocab and `topic-engine-side` placeholder vocab have an 8-name overlap (`segment_name`, `offer_name`, `platform_name`, `asset_name`, `aspect_label`, `selected_items_joined`, `value`, `selected`). They're the same names by design — the topic engine resolves them inside `prompt_template_resolved`, the assembler resolves them anywhere else they appear (skeletons, fragments).
- The cron route is wired but **CRON_SECRET must be set in Vercel project env before the first scheduled run will work**. Without it, the route returns 500.
- Smoke tests are committed and runnable any time. They use real Neon data (live `BRAND_ID`) and the sweep test cleans up after itself. Useful as regression tests when touching any of the runtime files.
- Memory file `project_out02_state.md` is fully updated with current state and now references ADR-008.
