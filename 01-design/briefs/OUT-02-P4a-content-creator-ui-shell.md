# Content Creator UI Shell Brief
Feature ID: OUT-02-P4a
Status: complete
Last updated: 2026-05-01
Parent: `01-design/briefs/OUT-02-content-creator-single-step.md` (parent OUT-02)
Architecture: `01-design/content-creation-architecture.md` (approved 2026-04-26, ADR-006)
Phase: 4a of OUT-02 (UI workstream split — 4a shell, 4b generation+variants+library, 4c chat-on-variant)

## Summary

Build the UI shell for the content creator: the **picker** at `/content` and the **generation surface** at `/content/create/[slug]?run=[runId]`. The generation surface assembles user input across three left-rail blocks (Strategy / Topic Engine / Settings), shows an empty right pane until Generate is pressed, then creates a `generation_runs` row, calls the existing `assemble()` to build the eight-layer prompt, and returns the assembled prompt for inspection. **No model call yet, no variant cards, no save flow, no library page** — those land in 4b. **No chat-on-variant** — that's 4c.

Phase 4a's job is to prove the input-collection layer end-to-end against the Phase-2 runtime (assembler, topic-engine, bundles, placeholder resolvers) and to lock the picker → generation-surface UX at the molecule layer so 4b can plug the model call and variant cards into a known frame.

## Use cases

### UC-1 (primary): Pick a content type and reach a Generate-ready state
- **Who:** Ellie
- **When:** Wants to start producing content
- **Trigger:** Sidebar "Create" → `/content` picker → click an unlocked card → land on `/content/create/[slug]`
- **Outcome:** All Strategy fields filled, Topic Engine cascade resolved to a leaf (or content type doesn't require one), Settings reviewed. Generate becomes enabled. On click, a `generation_runs` row is inserted; the assembled prompt is returned and rendered in the right pane.

### UC-2: Hit a locked card and resolve it
- **Who:** Ellie
- **When:** Picker shows a content type whose prerequisites aren't met (e.g. an offer-driven type with no active offer)
- **Trigger:** Click locked card OR click "+ Add X" deeplink on the lock affordance
- **Outcome:** User lands on the relevant DNA page (`/dna/offers`, `/dna/platforms`, etc.) to add the missing thing, then returns to the picker.

### UC-3: Switch content type from inside the generation surface
- **Who:** Ellie
- **When:** Already on `/content/create/instagram-caption`, wants to try newsletter instead
- **Trigger:** "Switch content type" control in the surface header (legacy pattern, retained)
- **Outcome:** Returns to picker (or opens a switcher dropdown). Phase-4a behaviour: link back to `/content` — dropdown is V2 polish.

### UC-4: Backtrack the Topic Engine
- **Who:** Ellie
- **When:** Picked the wrong category at step 1 or wants to change a step-2 selection
- **Trigger:** Click an earlier step's selector
- **Outcome:** Steps below the changed one clear and re-render against the new context. Free-text augments on cleared steps are also cleared (with a confirmation if any are non-empty? — TBD in layout).

## Out of scope (deferred to 4b/4c or later)

- Variant cards UI, edit-in-place, save modal, library page (4b)
- Actual model call + streaming + status transitions for `generation_runs` beyond `pending` → `assembled` (4b)
- Chat-on-variant inline modal (4c)
- Library items as chat context in main `/chat` (4c)
- Project/mission Strategy pre-fill UI surface — query-param pre-fill API stub will exist; no project entry-point button (project workspaces don't exist yet)
- Recently-used picker section (V2)
- AI suggestion from one-line goal in picker (V2)
- "Switch content type" inline dropdown (V2 polish; V1 = link back to picker)
- Free-text augment at every step depth — V1 ships free-text augment **at the leaf only**; per-step depths are V2 (architecture allows it; layout phase confirms whether to ship now)
- End-user content-type authoring or fragment authoring (post-V2)

**Pulled INTO 4a from later phases (per user direction):**
- Favourites toggle on cards (was deferred; user opted in — adds a `brand_content_type_favourites` table, brand-scoped)
- Locked-card lock UI + "+ Add X" deeplink (was deferred; user opted in — driven by `content_types.prerequisites` jsonb)

## User journey

### Step 1: Picker (`/content`)

Top of page: filter controls + search.

- **Search:** by content-type name (substring match on `content_types.name`)
- **Filters:**
  - Category chips — `content_types.category` (Sales, Email, Social, Long form, Brainstorm…)
  - Channel chips — `content_types.platform_type` (linkedin, blog, newsletter, podcast…) — uses canonical channel taxonomy from `04-documentation/reference/channel-taxonomy.md`
  - "Favourites only" toggle
- **Cards** (grid):
  - Icon (per content type — `content_types.icon` field exists in seed)
  - Name + description
  - Category badge + channel badge (TypeBadge molecule, hue from category)
  - Favourite star (toggle)
  - Locked state if `content_types.prerequisites` not met → dimmed card with badge ("Needs an Offer") + "+ Add Offer" deeplink action

Click an unlocked card → navigate to `/content/create/[slug]`. Click a locked card → no navigation; the inline "+ Add X" deeplink is the only forward action.

### Step 2: Generation surface (`/content/create/[slug]`)

**Layout:** three-region, fixed-viewport-height working area (legacy pattern preserved per Ellie's direction):

- **Page chrome:** title (content-type name + icon), subtitle (description), "Switch content type" link (goes back to `/content`) — top-right.
- **Left rail (~360–400px):** vertical stack of three fixed-height blocks. Middle block (Topic Engine) flexes to fill available space; Strategy and Settings are content-sized. Each block scrolls independently if its content overflows.
- **Right pane:** empty state ("Fill the panels and press Generate") until Generate is pressed. Then renders a loader, then the assembled prompt as a read-only inspector view (4a stops here; 4b replaces this with variant cards).
- **Sticky footer:** Generate button (primary, disabled until valid).

(Exact dimensions, gaps, and responsive collapse rules → `layout-design`.)

**Block 1 — Strategy panel** (`SectionCard` titled "Content strategy", icon target):
Renders fields declared in `content_types.strategy_fields` jsonb. **Declarative widget registry** — one `StrategyField` molecule with a `field.type` switch:
- `audience_id` → `Combobox` against `dna_audience_segments WHERE is_active`
- `offer_id` → `Combobox` against `dna_offers WHERE is_active`
- `asset_id` → `Combobox` against `dna_knowledge_assets WHERE is_active`
- `platform_id` → `Combobox` against `dna_platforms WHERE is_active` (PL2 unblocked here — this brief locks "extend `StrategyFieldId` union with `platform_id`" rather than the `platform` value, see Decisions)
- `customer_journey_stage` → `Select` with fixed enum (awareness/consideration/decision/post-purchase or whatever DNA uses)
- `text_short` → `Input`
- `text_long` → `Textarea`

Pre-fill: if URL has `?audience_id=X&offer_id=Y` query params, the relevant fields are pre-filled. (No project/mission entry-point UI yet — the API exists for future use.)

**Block 2 — Topic Engine** (`SectionCard` titled "The Infinite Prompt Engine", icon infinity):
Hidden if `content_types.topic_context_config.uses_topic_engine = false`.
Progressive-disclosure cascade — each step is a `Select` (or `MultiSelect` at item-surfacing steps); steps below the active one only render once the step above has a selection. Changing an upper step **clears all lower steps** (no confirmation in V1; layout-design decides if a confirm is needed when free-text exists).
- Step 1 → `listCategories(brandId)` → category select
- Step 2..N → `listChildren(parentNode, params, brandId)` → next-level select
- Multi-select on item-surfacing steps (gated by `topicPaths.allow_multi_select` per node — engine returns this)
- Free-text augment **at the leaf only** (V1) — small "+ add note" button below the leaf selector reveals a textarea
- Empty data → category/option dimmed with inline "+ Add `${category}`" deeplink to the relevant DNA/source page (e.g. `/dna/audiences`, `/dna/offers`)
- Free-text category (step-1 option) → single textarea, skips steps 2-N entirely

The cascade calls `topic-engine.ts`'s public API (`listCategories`, `listChildren`, `checkHasData`, `resolveChain`, `resolveFreeText`) — no new query layer. UI talks to a `useTopicCascade` hook that wraps server actions.

**Block 3 — Settings** (treatment TBD in layout-design — likely an inline lighter strip above Generate rather than a full `SectionCard`). Four controls:
- **AI model** — `Select` against the `ai_models` table (see Data model below)
- **"I/we" override** — `Select` with three options: `Default (from ToV)`, `Use "I/me/my"`, `Use "we/us/our"`. Default reads from `dna_tone_of_voice.default_person`.
- **Tone variation** — `Select` against `dna_tov_applications` for the relevant `format_type`. First option is `Default (auto)` — when chosen, the assembler runs the existing ToV cascade (no override). Other options pin a specific application. No free-text option (Ellie locked: not even V2).
- **Variant count** — `Stepper` — default from `content_types.default_variant_count`

**Sticky footer — Generate button:**
- Disabled until: all required Strategy fields filled AND (topic engine disabled OR topic chain resolved to leaf OR free-text supplied)
- On click: server action → insert `generation_runs` row (status `pending`) → call `assemble()` with the gathered `GenerationInputs` → write assembled prompt + `fragment_versions` to the run → update status to `assembled` → return the prompt to the client.
- On error: status `errored`, error text shown in right pane.
- The 4a UI then renders the assembled prompt in a read-only `<pre>` inspector. **This is a debug surface, not a polished one** — the right pane gets replaced wholesale in 4b.

## Data model

### Existing tables (Phase 1 — no changes needed for 4a)
- `content_types`, `prompt_stages`, `prompt_fragments`, `topic_paths` — read-only consumers
- `generation_runs` — 4a writes rows with status `pending` → `assembled` (or `errored`). Variants stay empty `[]`.

### New tables (4a-specific)

#### `brand_content_type_favourites`
Brand-scoped (per Ellie's direction — favourites belong to the brand, not the user). Thin join table; future per-favourite metadata (pinned_order, etc.) can be added without a column bloom.

| Field | Type | Required | Notes |
|---|---|---|---|
| `brand_id` | uuid FK → `brands.id` | yes | composite PK |
| `content_type_id` | uuid FK → `content_types.id` | yes | composite PK |
| `created_at` | timestamp | yes | default `now()` |

Index on `brand_id` for the picker query.

#### `ai_models`
Per Q6, registry table for available models so Ellie can add/archive without code changes. Decoupled from `lib/llm/client.ts` `MODELS` const, but the `provider_model_id` maps onto whichever provider the SDK call uses.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | uuid PK | yes | |
| `slug` | text | yes | unique, e.g. `claude-sonnet-4-6`, `gemini-3.1-pro` |
| `name` | text | yes | display name e.g. "Claude Sonnet 4.6" |
| `provider` | enum (`anthropic`/`google`/`xai`/`openai`) | yes | |
| `provider_model_id` | text | yes | exact id passed to provider SDK |
| `tier` | enum (`primary`/`fast`/`powerful`/`fallback`/`alternative`) | no | maps to `lib/llm/client.ts` MODELS keys (informational, not enforced) |
| `cost_input_per_mtok` | numeric(10,4) | no | USD per 1M input tokens — for Ellie's reference |
| `cost_output_per_mtok` | numeric(10,4) | no | USD per 1M output tokens |
| `context_window` | integer | no | tokens |
| `is_active` | boolean | yes | default `true` — picker filters on this |
| `is_archived` | boolean | yes | default `false` — kept for historical run references; archived = excluded from new picker but resolvable for old runs |
| `notes` | text | no | freeform |
| `created_at` | timestamp | yes | |
| `updated_at` | timestamp | yes | |

Seed: rows for every model currently in `lib/llm/client.ts MODELS` (claude-sonnet-4-6, claude-haiku-4-5, claude-opus-4-6, claude-opus-4-7, gemini-2.5-flash, gemini-3.1-pro, grok-3-mini).

`generation_runs.model_used` (existing column) stores the `ai_models.slug` (not FK — preserve historical references through archival).

### Schema changes to existing tables

- `02-app/lib/llm/content/types.ts` — extend `StrategyFieldId` union to include `platform_id` (closes OUT-02-PL2). Drop the cast in `placeholders.ts`. Update seed `content_types.strategy_fields` for newsletter-edition + brainstorm-blog-posts to use `platform_id` instead of `platform`. (Brief Phase 4a is the right time to fold PL2 in — strategy-field rendering is the primary consumer.)

## Update behaviour

- `brand_content_type_favourites` — freely editable (add/delete via star toggle)
- `ai_models` — ellie-only via direct DB or admin; UI-driven editing is post-V2. `is_archived = true` over `DELETE`.
- `generation_runs` (4a writes) — once written, only `status` and `error_message` mutate. Other fields immutable. (4b will mutate `variants` during streaming.)

## Relationships

### Knowledge graph (FalkorDB)
None for 4a. `library_items` will land in the graph in 4b/4c when saved variants get auto-tagged.

### Postgres
- `brand_content_type_favourites` → `brands`, `content_types`
- `ai_models` standalone; `generation_runs.model_used` references its `slug` by value (intentional decoupling for archival)
- `generation_runs` already FKs to `content_types`

## UI/UX notes

Resolved in `layout-design` — full spec at `01-design/wireframes/OUT-02-P4a-layout.md` (approved 2026-04-30). Summary:

- **Two new patterns established:** `launch-picker-grid` (filterable cards launching a workspace) and `creator-workspace-three-region` (left rail input stack + right pane output + sticky-footer action). Both registered as templates.
- **Picker (`/content`):** PageChrome with search-action + ContentPane housing PickerFilterBar (Category multi-select + Channel multi-select + favourites toggle) above a 3/2/1-col responsive grid of `ContentTypeCard` tiles. Filter state lives in URL query params; rendering is server-fetched + client-filtered.
- **Generation surface (`/content/create/[slug]`):** ContentPane (`padding={false}`) hosts a 380px left rail (Strategy SectionCard + Topic Engine SectionCard + Settings strip + sticky Generate) beside a flex-1 right pane (empty state → loader → `AssembledPromptInspector`). Right pane is debug-grade — gets replaced wholesale in 4b.
- **Topic Engine UI:** progressive-disclosure cascade. Step N+1 hidden until step N selected. Backtracking silently clears below; if a non-empty leaf-augment textarea exists below, a `Modal size="sm"` confirm intervenes.
- **Settings strip:** inline lighter strip (`bg-muted/40`) at V1; pre-approved to escalate to a standard `SectionCard` if visually unbalanced during build.
- **Mobile:** `ScreenSizeGate` at < 1024px on the generation surface; picker is responsive down to ~480px.

**Molecule composition (input to feature-build plan gate):**

10 new molecules — sketches in the layout spec, formal specs land via `design-system` Mode A as a build-plan input:
- `ContentTypeCard`, `PickerFilterBar`, `MultiFilterPillGroup` (promised by FilterPillGroup spec), `StrategyField` (declarative widget registry), `TopicCascadeStep`, `TopicCascade`, `MissingPrereqDeeplink`, `LockBadge`, `AssembledPromptInspector`, `NumberStepper`.

Existing molecules reused: `PageChrome`, `ContentPane`, `SectionCard`, `TypeBadge`, `EmptyState`, `Modal`, `ActionButton`, `IconButton`, `SelectField`, `FilterPill`.

`SearchableSelect` deferred — `SelectField` covers V1 entity pickers; built when needed.

## Edge cases

- **No content types match filters:** empty state ("No content types match these filters. Try removing a filter.")
- **All cards locked:** picker still renders; explicit empty-prereqs banner ("Most content types need DNA pieces — start with adding an Offer").
- **Topic cascade leaf has unresolved data (e.g. empty audience VOC array):** category dimmed, "+ Add VOCs to this segment" deeplink. Caught by `checkHasData()`.
- **Strategy field references archived DNA item** (e.g. saved query param points to archived offer): Combobox shows the value but flagged as archived; user can clear or proceed (and the assembler will handle archived data per its own rules).
- **`assemble()` fails** (unknown placeholder, missing fragment): right pane shows error banner with the assembler error text. Run is `errored`. User can edit inputs and retry — no automatic re-run.
- **User changes content type mid-flow** via "Switch content type" → all input state cleared (full client-side reset). 4b may persist drafts; 4a does not.
- **Multi-select limit:** architecture says multi-select within same category only — engine enforces this; UI just renders. If user somehow selects across categories (shouldn't be possible), we trust the engine to throw.
- **Free-text-only category:** skips steps 2-N entirely; leaf is the textarea itself.

## Decisions locked

| Decision | Locked answer |
|---|---|
| Picker route | `/content` |
| Generation surface route | `/content/create/[slug]` (existing sidebar `Create` link goes here; `/content/create` index redirects to `/content`) |
| Sidebar label | Stays "Create" (already in nav-config) |
| Layout of generation surface | Three-region fixed-viewport: left-rail stack (Strategy / Topic Engine / Settings), large right pane, sticky footer Generate. Per legacy pattern, retained per Ellie's direction. |
| Generate button behaviour in 4a | Inserts `generation_runs` row + calls `assemble()` + returns assembled prompt. **No model call.** |
| Right pane in 4a | Renders the assembled prompt in a read-only inspector. Replaced by variant cards in 4b. |
| Strategy field rendering | Declarative widget registry (one `StrategyField` molecule, `field.type` switch) |
| Topic Engine UI pattern | Progressive-disclosure: step N+1 hidden until step N has a selection; changing step N clears all steps below |
| Free-text augment depth (V1) | Leaf only. Per-step augment is V2. |
| Locked cards in V1 | Yes — built in 4a. Driven by `content_types.prerequisites` jsonb. "+ Add X" deeplinks resolve to the relevant DNA page. |
| Favourites in V1 | Yes — `brand_content_type_favourites` table (brand-scoped) built in 4a. Star toggle on cards + filter chip in PickerFilterBar. |
| Recently-used in V1 | No — V2. |
| AI models source | New `ai_models` table seeded from `lib/llm/client.ts` MODELS. Picker reads `is_active = true AND is_archived = false`. |
| `generation_runs.model_used` | Stores `ai_models.slug` by value — not FK. Lets archived models survive in old runs. |
| ToV "tone variation" control | `Select` against `dna_tov_applications` for the content type's `format_type`. First option `Default (auto)` runs the existing ToV cascade. No free-text fallback — not in V1, not in V2. |
| Project/mission pre-fill | Query-param API only — no entry-point UI in 4a |
| Switch content type | Link back to picker — V1. Inline dropdown is V2 polish. |
| OUT-02-PL2 resolution | Extend `StrategyFieldId` union with `platform_id`; update seed `strategy_fields` for affected content types; drop the cast in `placeholders.ts`. Done as part of 4a. |
| Topic cascade clearing on backtrack | Lower select steps clear silently. Confirmation prompt **shown** when non-empty free-text augment exists below the changed step. |
| Picker filter chips | All-of (intersect filters). Any-of risks no-filter outcomes. |
| Picker rendering | Server-rendered card array (DB query happens server-side); filtering is client-side over the loaded array. |
| Settings panel treatment | Lighter inline strip above Generate (not a full `SectionCard`). Exact treatment → layout-design. |
| `ai_models` migration | Bundled with the 4a build, not split into a separate pre-migration. |
| Empty-state copy + microcopy | Drafted in layout-design; Ellie reviews and edits once all sites are identified. |

## Open questions / TBDs

All open questions raised at brief-draft time were resolved before approval (see Decisions log). Remaining items deferred to `layout-design` are scoped layout decisions, not blockers:

- Exact treatment of the inline Settings strip (positioning, density, label vs icon-only controls)
- Microcopy for empty states, error states, and loading states across the picker and generation surface
- Whether the "+ add note" leaf-augment button is always visible or appears only on hover/focus
- Confirmation modal copy + interaction shape for the topic-cascade-clear confirm

These do not block brief approval; they belong in the layout phase by design.

## Implementation phases (within 4a)

This is **M-sized**, not XL — the runtime is already done.

**Step 1 — Schema additions**
- Migration: `brand_content_type_favourites` + `ai_models` tables
- Seed `ai_models` from existing MODELS const
- `StrategyFieldId` union extension + seed correction for newsletter/brainstorm + drop the cast (PL2 resolution)
- Schema-to-db skill with hard gate

**Step 2 — Topic engine glue + server actions**
- `useTopicCascade` hook — wraps `listCategories`/`listChildren`/`checkHasData`/`resolveChain`/`resolveFreeText` server actions
- Strategy field option-loaders (one server action per field type, returning labelled rows from DNA tables)
- `POST /api/content/runs/assemble` route (or server action) — inserts `generation_runs` row + calls `assemble()` + returns assembled prompt

**Step 3 — Picker UI**
- `/content` page (Server Component for initial card grid)
- `ContentTypeCard`, `PickerFilterBar`, `LockBadge`, `MissingPrereqDeeplink` molecules
- Favourite toggle server action

**Step 4 — Generation surface UI**
- `/content/create/[slug]` page
- `StrategyField`, `TopicCascadeStep`, `TopicCascade`, Settings panel molecules
- Three-region layout with sticky Generate
- Right-pane assembled-prompt inspector (debug-surface — purely so 4a is shippable)

**Step 5 — Validation + polish**
- Generate-disabled logic
- Loading states, error states, empty states
- Design-system Drift check (Mode B) post-build

## Exit criteria

4a is done when:

- `/content` lists all `is_active` content types with category/channel filters, search, favourites toggle, locked-card affordance with "+ Add X" deeplinks
- Clicking an unlocked card lands on `/content/create/[slug]`
- Strategy panel renders all field types declared in seed `content_types` correctly
- Topic Engine cascades correctly through all 5 dataQuery kinds (smoke-tested in Phase 2; UI consumes the same engine output)
- Settings panel reads from `ai_models`, `dna_tone_of_voice`, `dna_tov_applications`, and `content_types.default_variant_count`
- Generate button is correctly disabled until inputs are valid
- Pressing Generate inserts a `generation_runs` row, calls `assemble()`, writes the assembled prompt and `fragment_versions` to the run, and renders the prompt in the right pane
- Smoke tests passing: end-to-end picker → surface → assemble for all 3 V1 content types
- `npm run check:design-system` passes (no appearance classes in organism layer; all atom imports through molecule layer)
- PL2 closed (StrategyFieldId union extended, seed corrected, cast removed)

## Decisions log

- 2026-04-30: Brief approved. All TBDs except scoped layout-phase items resolved before approval (see Decisions table). Backlog updated; proceeding to `layout-design`.
- 2026-04-30: Layout approved. Spec at `01-design/wireframes/OUT-02-P4a-layout.md`. Two new templates registered (`launch-picker-grid`, `creator-workspace-three-region`). 10 new molecules to spec via `design-system` Mode A at build-plan time. Settings strip stays inline; promote to SectionCard during build if unbalanced. `SearchableSelect` deferred. Next: `feature-build`.
- 2026-04-30 → 2026-05-01: Build complete. Three plan-time deviations approved at build start: strategy field IDs use seed singular form (`audience_segment` / `offer` / `knowledge_asset` / `platform`, not `_id`-suffixed); PL2 fix is "extend union with `platform` and drop the dual-read", not the speculative `platform_id` rename; `StrategyFieldId` union also gained `sales_page_angle` + `cta_url` for full runtime alignment. **15 molecules** added (vs 10 in the layout spec): added `SearchInput` (search-with-leading-icon, lifted from inline pattern), `GenerationSettingsStrip` (extracted to remove a direct atom import), and `ContentTypeSwitcher` (in-build pivot from text-link to dropdown per Ellie's feedback in soft-gate review). Migration 0029 applied; `ai_models` seeded (7 models). Soft-gate testing surfaced four bugs all fixed before close: (a) search input cleared on every keystroke when URL-state-bound during transitions — moved to local state; (b) audience cascade asked for segment again when strategy already had it — added strategy-aware auto-skip in `TopicCascade`; (c) multi-select checkboxes silently no-op'd because `<label htmlFor>` doesn't dispatch to base-ui's custom-`<div>` Checkbox AND `resolveChain` was being called with `topicPath.id` (uuid) instead of `topicPath.path` (the engine's lookup key); (d) "Switch content type" was a text link, replaced with `ContentTypeSwitcher` dropdown. Final polish: `cursor-pointer` added to Button atom (`02-app/components/ui/button.tsx`) — app-wide fix, every Button/IconButton/ActionButton consumer benefits. **Status: complete.** Final molecule count: 15 new + `cursor-pointer` to base Button.
