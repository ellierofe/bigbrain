# Content Creator — Single-Step Brief
Feature ID: OUT-02
Status: draft
Last updated: 2026-04-27
Related: `01-design/content-creation-architecture.md` (architecture doc, approved 2026-04-26), `04-documentation/reference/channel-taxonomy.md` (channel + format vocabulary, DNA-07b done 2026-04-27 — authoritative for `content_types.platform_type`, `format_type`, `subtype`, and `prerequisites.channels`), DNA-01–09 (DNA tables), DNA-09 (ToV system, in progress), SRC-01 (source knowledge), RET-01 (retrieval), OUT-01 (chat infra, reused), REG-01 (content registry — partially absorbed here)
Supersedes scope-wise: GEN-PROMPTS-01 (closed)

## Summary

Build the single-step content creator: a parameter-driven content generation surface that produces N variants of a chosen content type (Instagram captions, blog hooks, email subject lines, brainstorms, etc.) using the eight-layer prompt model and a cascading 1–4 step Topic Engine that drills into Brand DNA at the moment of generation.

The user picks a content type from a filterable catalogue, fills a content-type-specific Strategy panel (target audience, sometimes offer, etc.), drills the Infinite Prompt Engine to specify what the content is *about* (with multi-select within categories and free-text augments at any depth), tunes Settings (model, person override, tone variation, variant count), and generates. Returned variants can be edited inline, saved to the library (auto-tagged from selections), opened in an inline chat for tweaking, or regenerated. Saved items become first-class context in the main BigBrain chat.

This brief covers single-step content only. Two-step (blueprint → copy) is OUT-02a. The data model and prompt architecture are designed so that two-step is a pure extension — `prompt_stages` already supports multiple stages, only the editor and stage-handoff UI need to be added in V2.

## Design principles (specific to this feature)

1. **Structure earns its place over slop.** The eight-layer prompt model exists because LLMs default to mush. Each content type's structural skeleton is hand-authored and sacred. Shared craft (hooks, headlines, persuasive techniques) lives in fragments and is reused by reference. The system's job is to keep this distinction enforceable.
2. **Live data, always.** The Topic Engine queries the DB at every step. New offers, new audience segments, new platforms — they show up in the cascade automatically. No registration step, no rebuild.
3. **Capture intent, not just output.** Every generation persists its full structured inputs (Strategy answers, topic chain, settings, free-text augments) so "regenerate this with one tweak" is always available, and so the audit trail explains *why* this content exists.
4. **Library is for keepers, not for everything.** Saving is an explicit promotion. Drafts live in `generation_runs` until saved. The registry stays signal-rich.
5. **Chat is part of generation, not separate.** Once a variant exists, it's a chat-able artifact. Inline modal for tweaks; main chat for using saved content as context. The generation surface and the chat surface share infrastructure (OUT-01's AI SDK chat).
6. **Schema-first per content type.** Authoring a new content type means filling rows in `content_types` + `prompt_stages`, not editing application code. Personas, worldviews, craft directives, output contracts are all fragment refs. The skeleton is the only mostly-text column.

## Use cases

### UC-1: Pick a content type and generate (primary)
- **Who:** Ellie (V1; future users post-V2)
- **When:** Has a content idea or need; wants to produce something quickly
- **Trigger:** Top-level "Content" nav → picker page
- **Outcome:** N variants generated and visible. User either edits, saves, chats with a variant, regenerates, or discards.

### UC-2: Generate from a project/mission workspace
- **Who:** Ellie
- **When:** Working in a CLIENT project or MISSION workspace, wants content related to it
- **Trigger:** "Create content" button in workspace → picker opens with Strategy fields pre-filled (target audience from project, offer if relevant)
- **Outcome:** Generation Strategy panel arrives partly-completed. User confirms, drills topic, generates.

### UC-3: Regenerate with a tweak
- **Who:** Ellie
- **When:** Generated 5 IG captions, likes one of the angles but wants slight variation
- **Trigger:** "Regenerate" on a variant or the run as a whole, with optional inline tweak ("more casual tone")
- **Outcome:** New `generation_run` with `parent_run_id` set; same inputs by default, with explicit tweaks applied; new variants returned

### UC-4: Save a variant to the library
- **Who:** Ellie
- **When:** Found a variant worth keeping
- **Trigger:** "Save" on the variant
- **Outcome:** `library_items` row created with text snapshot + auto-inherited tags (audience, offer, topic chain) + optional user-added tags (publish date, platform, custom tags)

### UC-5: Chat with a variant inline
- **Who:** Ellie
- **When:** Wants to refine a single variant conversationally without losing the others
- **Trigger:** "Chat" on the variant → modal opens *in the generation page*
- **Outcome:** AI SDK chat session scoped to the variant. Context pane shows the generation's inputs (topic chain, Strategy answers) + the variant text. User tweaks via chat, can save the chat outcome as a new variant or replace the original.

### UC-6: Use a saved item as chat context
- **Who:** Ellie
- **When:** In `/chat`, wants to discuss/refine a previously-saved piece of content
- **Trigger:** Context picker in chat → "Saved content" → pick a library item
- **Outcome:** Library item becomes part of chat context. Conversation can reference it, ask questions about it, propose rewrites.

### UC-7 (out of scope): Two-step long-form
- Goes to OUT-02a. The architecture supports it (`prompt_stages` + `is_multi_step` + `parent_run_id`); only the blueprint editor and stage-handoff UI are missing.

## User journey

### Step 1: Picker
User navigates to "Content" (top-level nav, sibling of "Ask BigBrain"). Filterable card grid:
- **Search:** by name, free text
- **Filters:** category (Sales, Email, Social, Long form, Brainstorm…), platform (Instagram, LinkedIn, podcast, blog…), favourites
- **Cards show:** icon, name, description, time-saved estimate, locked/unlocked state
- **Locked cards:** dimmed; show what's missing (e.g. "Needs an Offer") with a one-click "Add offer" link to the relevant DNA page
- **Recently used (V1, if cheap):** a small section at the top of the picker showing the last 5 content types used; otherwise omit and add in V2
- **AI suggestion from goal (V2):** not in V1

User clicks a card.

### Step 2: Generation surface
Single page, three regions stacked or side-by-side (layout TBD via `layout-design`):

**(a) Strategy panel** — shown above or to the left. Per-content-type fields. Examples:
- IG caption: target audience selector + customer journey stage
- Sales page: target audience + offer + (optional) sales angle
- Brainstorm Podcast: platform selector
- Blog post: target audience + content pillar
The Strategy panel reads `content_types.strategy_fields` (jsonb declarative config). When invoked from a project workspace, fields pre-fill from project context.

**(b) Topic Engine (Infinite Prompt Engine)** — shown if `content_types.topic_bar_enabled = true`. The 1–4 step cascade. Full catalogue is in the architecture doc Part 3 (BigBrain-specific category structure mapped against live schemas). Summary:
- **Step 1 categories (V1):** audience segment / offer / knowledge asset / content platform / value proposition / brand meaning / brand proof / source material / own research / research mission / idea / free-text. Categories with no data are dimmed with an inline "+ Add `${category}`" deeplink to the relevant DNA/source page (so users don't hit dead ends).
- **Step 2:** entity selection (which segment / offer / etc.) or aspect selection (which kind of brand proof / which value-prop field). Schema-driven; gated per item by data presence.
- **Step 3:** aspect (after entity) or item (after aspect). Varies by category — see Part 3 of architecture doc for per-category breakdown.
- **Step 4:** specific item, where applicable. Varies by category.
- **Multi-select:** at item-surfacing steps, user can select multiple items within the same category (objection + objection ✓; objection + desire ✗).
- **Free-text augment:** at any step with a selection, "+ add note" button appends user-typed context to the prompt.
- **Skipped steps:** if Strategy already answered (e.g. audience pre-selected), the cascade starts after the answered step.
- **Out of V1 cascade:** lead magnets, content pillars (parked DNA tables); client projects (already pre-filled from workspace context); competitors (V2).

**(c) Settings panel** — shown collapsed by default; expand to override:
- Model (default per content type, override here)
- Person override (1st singular vs 1st plural — overrides ToV default)
- Tone variation (optional free-text, e.g. "more sassy this time")
- Variant count (default per content type, override here)

**(d) Generate button** — disabled until required Strategy fields are filled and the Topic Engine has a valid selection (or the content type doesn't require a topic, e.g. Sales page is offer-driven).

### Step 3: Generation
On submit:
1. A `generation_runs` row is created immediately, status = `generating`.
2. The eight-layer prompt assembler walks the layers (Persona → Worldview → Task framing → Brand context → Topic context → Structural skeleton → Craft directives → Output contract), resolves all placeholders (DNA pulls from live data, Topic Engine selections, Strategy answers, free-text augments).
3. The assembled prompt is stored on the run (for audit) along with `fragment_versions`.
4. The model is called via Vercel AI SDK. Streaming returned to the front end.
5. Variants render as cards on the page. (V1: sequential streaming for now — parallel streaming if cheap. Brief locks this in implementation review.)
6. While generating: status `generating`. On complete: status `complete`. On error: status `errored` with error text.

### Step 4: Variant interaction
Each variant card has actions:
- **Edit** — inline text edit (markdown editor or simple textarea, V1 keeps it simple)
- **Save** — opens save modal (auto-tags pre-filled, user adds publish date + extra tags + platform + status). Promotes variant to `library_items`.
- **Chat** — opens inline chat modal (UC-5). Modal preserves the page state — other variants remain accessible.
- **Discard** — marks variant as discarded (soft delete in `generation_runs.variants`).
- **Regenerate** (run-level + variant-level) — UC-3.

### Step 5: Library access
Saved items appear at:
- `/content/library` (or wherever IA decides) — list view with filters
- In `/chat` context picker as "Saved content" → can be selected as conversation context (UC-6)
- Auto-tagged: audience_id, offer_id, topic_chain, content_type. User-added tags layered on top.

## Data model (summary; full schema in architecture doc)

Five new tables:

- **`content_types`** — catalogue + per-type metadata (slug, name, category, format_type, prerequisites, strategy_fields, topic_context_config, default_variant_count, etc.). Carries Layer 5 config (`topic_context_config`). **Vocabulary source-of-truth: [`04-documentation/reference/channel-taxonomy.md`](../../04-documentation/reference/channel-taxonomy.md)** (DNA-07b, done 2026-04-27). `content_types.platform_type` aligns to the `channel` enum from the taxonomy doc (`linkedin`, `podcast`, `blog`, `newsletter`, `cold_outreach`, `hosted_event`, etc.); `content_types.format_type` aligns to the format-bucket enum (`social_short`, `social_visual`, `blog`, `newsletter`, `email`, `sales`, `spoken_audio`, `spoken_video`, `ad_copy`, `event`, `outreach`, `brainstorm`, `other`); `content_types.subtype` (where applicable) is the canonical leaf (e.g. `linkedin_post`, `blog_post_long`). `prerequisites` is a structured object: `{ channels: string[]; lead_magnets: string[]; dna: string[] }` — `channels` values query `dna_platforms WHERE channel = X AND is_active = true`; `lead_magnets` values query `dna_lead_magnets WHERE kind = X` (when DNA-08 ships; until then the array stays empty). Use `02-app/lib/types/channels.ts` as the TypeScript source of truth.
- **`prompt_stages`** — FK to `content_types`. One row per stage. V1 = always one row per content type. Carries Layers 1, 2, 3, 6, 7, 8 (Persona, Worldview, Task framing, Structural skeleton, Craft directive config, Output contract + extras). Layers 4 (Brand context) and 5 (Topic context) are NOT here — Layer 4 is invariant, Layer 5 is on `content_types`.
- **`prompt_fragments`** — unified library, six kinds: `persona`, `worldview`, `craft`, `context`, `proofing`, `output_contract`. Versioned.
- **`topic_paths`** — declares the 1–4 step cascade. Tree-shaped (parent_id) or single jsonb config — schema gate decides. Each leaf has a `prompt_template`.
- **`generation_runs`** — system-of-record for in-flight + recently-generated work. Stores inputs, assembled prompt, fragment versions used, model, variants. TTL on unsaved drafts (30 days).
- **`library_items`** (this is REG-01 partially absorbed) — saved variants only. Snapshot text + auto_tags + user_tags + publish metadata.

Migrations done via `schema-to-db` skill. Will likely be 5–6 migrations.

## Implementation notes / phases

This is XL — phased build to keep scope tractable.

**Phase 1 — Schema + assembler (foundations)**
- Schema gates for `content_types`, `prompt_stages`, `prompt_fragments`, `topic_paths`, `generation_runs`, `library_items`
- Eight-layer prompt assembler (`lib/llm/content/assemble.ts`)
- Bundle resolver for Layer 4 (Brand context) — pulls business overview + ToV core + identity essentials
- Bundle resolver for Layer 5 (Topic context) — interprets `topic_context_config`
- Topic Engine query layer (`lib/content/topic-engine.ts`) — given a category + selections so far, return next step's options from live data
- Seed: 38 fragments from legacy `Centralised Prompt Data Live.csv`, ported verbatim and re-categorised across the six kinds (persona/worldview/craft/context/proofing/output_contract). Audit during use, not upfront.
- Seed: 5 V1 content types end-to-end (one per major category: IG caption, blog post, email newsletter edition, brainstorm-blog, sales page hook). These prove the eight-layer model and unblock UI work.

**Phase 2 — Picker + Strategy + Topic Engine UI**
- Picker page (filters, search, locked/unlocked, recently used)
- Generation surface — Strategy panel reading `strategy_fields` declarative config
- Topic Engine UI — cascading selectors, multi-select on item steps, free-text augment buttons
- Settings panel
- "Generate" disabled-state logic

**Phase 3 — Generation flow + variant UI**
- Wire generate to assembler + Vercel AI SDK
- `generation_runs` lifecycle (create on submit, stream into row, mark complete/errored)
- Variant cards with edit / save / chat / discard / regenerate
- Save modal with auto-tag pre-fill + user-tag editor
- Library view at `/content/library`

**Phase 4 — Chat integration**
- Inline chat-on-variant modal (reuses OUT-01 AI SDK hook)
- Context pane showing run inputs + variant text
- Library items as selectable context in main `/chat` context picker

**Phase 5 — Port more content types**
- Port the rest of the V1 30–40 content types from legacy CSV
- Audit fragments during port — catch any that need tuning for current models
- Done iteratively; not a single milestone

## Out of scope (for OUT-02; goes to OUT-02a)

- Two-step (blueprint → copy) generation
- Blueprint editor (reorder, per-section regen, lock sections, swap DNA per section)
- Synthesis pass for long-form
- Retrieval-aware step 4 ranking (V2)
- AI suggestion from one-line goal in picker (V2)
- Project/mission-aware picker ranking (V2)
- Cost guardrail / token estimation (V2)
- End-user authoring of content types (post-V2)
- Voice/audio generation
- Image generation tied to content (uses DNA-10 brand identity, future)
- IDEA-03 (AI-surfaced ideas) integration with content suggestions

## Decisions locked

| Decision | Locked answer |
|---|---|
| Prompt schema model | Eight-layer (Persona, Worldview, Task framing, Brand context, Topic context, Structural skeleton, Craft directives, Output contract) |
| Multi-stage record model | `content_types` + `prompt_stages` (FK). V1 = 1 stage per type. |
| Stage inheritance | None formal — copy FKs as needed |
| `prompt_stages.task_framing` storage | Hand-authored text per stage. Promote to fragment ref later if reuse appears. |
| Brand context | Always-on, invariant bundle |
| Topic context | Per-content-type configurable via `topic_context_config` |
| Authoring surface (V1) | Ellie-only; seeded via SQL/CLI; no in-app authoring UI |
| Multi-select in topic engine | Yes, but only at item-surfacing steps, only within same category |
| Free-text augment | At any step depth |
| Topic Engine V1 categories | 12 (audience / offer / knowledge asset / platform / value prop / brand meaning / brand proof / source material / own research / mission / idea / free-text). See architecture doc Part 3. Excludes: lead magnets + content pillars (parked tables); client projects (workspace pre-fill); competitors (V2). |
| Empty-data UX in cascade | "+ Add `${category}`" inline deeplinks at every step where data is missing — no dead ends. |
| Library = saved only | Yes; unsaved drafts live in `generation_runs` |
| Library item snapshots | Yes — `library_items.text` is snapshot at save time |
| Auto-tagging on save | Yes — inherits topic chain + Strategy answers; user adds more |
| ToV sample selection | System-driven via `format_type` + cascade fallback |
| Chat-on-variant | V1 — inline modal in generation page |
| Saved content as main-chat context | V1 |
| Strategy pre-fill from project context | V1 |
| Generation drafts persist on submit | Yes — `generation_runs` row created at submit |
| Unsaved draft TTL | 30 days (cron purge) |
| Fragment versioning | V1 — runs reference specific fragment versions |
| Streaming approach | Default to OUT-01 pattern (Vercel AI SDK). Parallel vs sequential variant streaming decided in implementation. |
| 38 legacy fragments | Port verbatim, audit during use |
| V1 content type count | ~30–40 ported. 5 seeded in Phase 1 to prove the schema; rest in Phase 5. |

## Open questions for implementation review

These don't block brief approval but need answers before each phase:

1. **Picker IA:** top-level "Content" nav, or sub-nav under "Outputs"? Likely top-level (sibling of Ask BigBrain).
2. **`topic_paths` storage model:** tree table (parent_id, materialised path) vs single jsonb config. Tree probably better for query patterns.
3. **`topic_context_config` exact shape:** sketched provisionally in architecture doc. Refine during Phase 1 by implementing the 5 seed content types.
4. **Variant streaming:** parallel (5 simultaneous streams) vs sequential. Sequential simpler; parallel faster but heavier. Phase 3 decision.
5. **Library page (`/content/library`) vs reuse `library_items` view in REG-02:** REG-02 is currently planned. Decide whether OUT-02 ships its own library list or whether REG-02 merges into OUT-02.
6. **Edit-in-place format:** plain textarea (V1 simple) or rich editor (markdown / formatted). Phase 3 decision.
7. **Chat-on-variant: separate `conversations` table rows or threaded into existing chat?** Probably separate — these are scoped to a variant, not free conversations. Phase 4 decision.

## Exit criteria

V1 is done when:

- A user can navigate to the picker, pick any of the seeded V1 content types, fill Strategy + Topic Engine + Settings, and generate variants.
- The eight-layer prompt assembler produces prompts that match the legacy quality on the 5 Phase-1 seed types (manual A/B comparison against a legacy generation for the same content type).
- Variants can be edited, saved, chatted with inline, and regenerated.
- Saved variants appear in the library and as selectable context in main chat.
- Strategy fields pre-fill correctly when invoked from a CLIENT or MISSION workspace.
- 30+ content types have been ported and tested.
- The eight-layer schema is documented, and adding a new content type is purely a data exercise (rows in `content_types` + `prompt_stages`, optionally new `prompt_fragments`).
