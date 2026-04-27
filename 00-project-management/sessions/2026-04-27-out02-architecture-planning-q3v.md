# Session log — 2026-04-27 — OUT-02 architecture planning
Session ID: 2026-04-27-out02-architecture-planning-q3v

## What we worked on

- OUT-02 (content creator, single-step) — scoping, architecture, brief
- OUT-02a (content creator, long-form / multi-step) — scope split established, rewritten in backlog
- GEN-PROMPTS-01 — re-evaluated, closed as superseded
- ADR-006 — content creation prompt architecture (eight-layer model + two-record stages)

Pure planning session — no application code or schema changes. Architecture doc, brief, ADR, and backlog updates only.

## What was done

### Architecture work

Created `01-design/content-creation-architecture.md` (approved 2026-04-26, finalised this session). Nine parts:

1. **Legacy system mapping** — picker, the 140-row `content_types` CSV, the 38-row centralised fragment library (kinds: copywriting / proofing / context), the Infinite Prompt Engine (1–4 step cascade via `topic-options.md` + the XLSX prompt-template lookup table), Strategy panel, Settings, single-step vs two-step generation flows, chat-on-artifact (both surfaces), library, picker UI.

2. **Eight-layer prompt model** — replaces the legacy 8-slot prompt structure. Layers: Persona / Worldview / Task framing / Brand context / Topic context / Structural skeleton / Craft directives / Output contract. Each layer's role, authoring mode, and source documented. Three legacy content types (IG caption, Sales AIDA, Brainstorm Podcast) decomposed across all 8 layers in a comparison table.

3. **Topic Engine cascade catalogue** — full BigBrain-specific cascade design. Per category (12 V1 categories): step structure, source tables, has-data gates, multi-select rules, prompt template literals. Categories: audience segment, offer, knowledge asset, content platform, value proposition, brand meaning, brand proof (meta), source material, own research (new), research mission (new), idea (new), free-text. Excluded: lead magnets + content pillars (parked DNA tables); client projects (workspace pre-fill duplicates); competitors (V2). Recurring "+ Add `${category}`" inline deeplink rule for empty data states.

4. **Keep / Change / Kill** — what survives, evolves, and gets deleted.

5. **V1 vs V2 scope split** — OUT-02 (single-step) vs OUT-02a (two-step + smarts).

6. **V1 data model sketch** — `content_types`, `prompt_stages` (FK), `prompt_fragments` (six kinds), `topic_paths`, `generation_runs`, `library_items`. Includes provisional `topic_context_config` jsonb shape and `craft_fragment_config` shape (list / tiered).

7. **Worked example** — Sales page AIDA fully spelled out: one `content_types` row + two `prompt_stages` rows (blueprint + copy).

8. **Open questions for the brief** — 10 items deferred to Phase 1 implementation.

9. **Decisions locked** — 22-row table covering all architecture calls.

### Brief

Created `01-design/briefs/OUT-02-content-creator-single-step.md`. Sections:
- Summary, 6 design principles, 7 use cases (UC-1 generate, UC-2 project-scoped, UC-3 regenerate, UC-4 save, UC-5 chat-inline, UC-6 saved-as-context, UC-7 two-step out-of-scope)
- User journey across picker → generation surface → variants → library
- Data model summary referring to architecture doc
- 5-phase implementation plan: Phase 1 schema + assembler + 5 seeds → Phase 2 picker + Strategy + Topic Engine UI → Phase 3 generation flow + variant UI → Phase 4 chat integration → Phase 5 port more types
- 24-row decisions-locked table
- 7 open questions for implementation review
- Out of scope (goes to OUT-02a)
- Exit criteria

### ADR-006

`00-project-management/decisions/adr-006-content-creation-prompt-architecture.md`. Captures three architectural decisions taken together:
1. Eight-layer prompt model (Persona, Worldview, Task framing, Brand context, Topic context, Structural skeleton, Craft directives, Output contract) replaces legacy 8 slots.
2. Two-record model for multi-stage prompts (`content_types` + `prompt_stages`, FK-linked). Single-step = 1 stage; two-step = 2; synthesis = 3.
3. Brand context (Layer 4) is invariant; Topic context (Layer 5) is per-content-type configurable via `topic_context_config`.

Rationale documented for each, including alternatives ruled out (one-row-with-doubled-columns, hybrid base+overrides, formal stage inheritance, all-fragments approach without hand-authored skeleton, configurable brand context).

### Backlog updates

- **OUT-02** moved `planned` → `in-progress`. Description rewritten around the eight-layer model, two-record stage schema, six-kind fragment library, Topic Engine catalogue, and `generation_runs` / `library_items` shape. Size raised L → XL. Added dependency on OUT-01 (chat infra reuse). Architecture doc + supersedes-GEN-PROMPTS-01 noted.
- **OUT-02a** description rewritten to reflect that it builds on OUT-02's schema (just enables `is_multi_step = true` + adds blueprint editor + stage handoff + V2 smarts). Size XL.
- **GEN-PROMPTS-01** marked `superseded` (closed 2026-04-26). Resolution noted: DNA generation prompts already shipped via DNA-03 / DNA-04 / DNA-05 / DNA-07 / DNA-09 builds (live at `02-app/lib/llm/prompts/`); content-output prompt work moves to OUT-02.

## Decisions made

- **Eight-layer prompt model** — see ADR-006.
- **Two-record stage model** — see ADR-006.
- **Brand context invariant + Topic context per-type configurable** — see ADR-006.
- **Topic Engine V1 categories: 12** (audience / offer / knowledge asset / platform / value prop / brand meaning / brand proof / source material / own research / mission / idea / free-text). Lead magnets + content pillars excluded (parked tables). Client projects excluded (workspace pre-fill is the right surface). Competitors deferred to V2. — captured in architecture doc Part 3.
- **Audience cascade: drop "obstacles", rename "shared_beliefs" → "Beliefs"** — captured in architecture doc Part 3.2.
- **Offer cascade: drop customer journey + VOC mapping** as content topics — captured in architecture doc Part 3.2.
- **Brand proof remains a meta-category** with step 2 = kind (testimonial / statistic / story) — preserves legacy mental model rather than flattening to three step-1 categories.
- **Source material: type as step 2, item as step 3**; tags + date as inline filter chips, not cascade steps.
- **`prompt_stages.task_framing` is hand-authored text per stage**, not a fragment ref. Promote to fragment ref later if reuse appears.
- **No formal stage inheritance** — copy FKs as needed when stages share Layer values.
- **`library_items.text` is a snapshot at save time** (divorced from `generation_runs.variants`). Editing/regenerating after save doesn't mutate library state.
- **Library = saved only.** Unsaved drafts live in `generation_runs` with TTL (suggested 30 days).
- **Phase 1 seeds 5 content types end-to-end**: IG caption / blog post / email newsletter edition / brainstorm-blog / sales page hook. Stress-tests the schema across all major categories before scaling up.
- **Empty-data UX in cascade: "+ Add `${category}`" inline deeplinks** at every step where data is missing, no dead ends.
- **GEN-PROMPTS-01 closed as superseded** (DNA prompt work already shipped via DNA builds; content-output prompt work belongs in OUT-02).

## What came up that wasn't planned

- The cascade design needed to be redone against BigBrain's actual schema rather than the Wized variables — Ellie flagged this late in the planning. Caught before the brief was finalised; resulted in the new Part 3 of the architecture doc (the cascade catalogue against live tables). Significant addition (~350 lines), but bounded.
- ADR-006 wasn't on the agenda but the architectural decisions clearly met the bar — written during the session-log skill's Step C.

## Backlog status changes

- **OUT-02:** `planned` → `in-progress`. Size L → XL. Description fully rewritten.
- **OUT-02a:** description rewritten. Status unchanged (`planned`).
- **GEN-PROMPTS-01:** `in-progress` → `superseded`. Closed 2026-04-26.

## What's next

Wrapping the planning session here so context space is fresh for the build. Next session should start with **Phase 1 of OUT-02**:

1. **Schema gates** via `schema-to-db` skill for the six new tables: `content_types`, `prompt_stages`, `prompt_fragments`, `topic_paths`, `generation_runs`, `library_items`. (Schema docs first in `01-design/schemas/`, then SQL review, then Drizzle.)
2. **Prompt assembler** — `lib/llm/content/assemble.ts` walking the eight layers.
3. **Bundle resolvers** — Layer 4 (Brand context) fixed bundle; Layer 5 (Topic context) interpreting `topic_context_config`.
4. **Topic Engine query layer** — `lib/content/topic-engine.ts` returning next-step options from live data per category.
5. **Seed data**:
   - 38 fragments from legacy `Centralised Prompt Data Live.csv` ported verbatim and re-categorised across the six kinds (persona / worldview / craft / context / proofing / output_contract). Audit during use, not upfront.
   - 5 V1 content types end-to-end: IG caption, blog post, email newsletter edition, brainstorm-blog, sales page hook.
   - `topic_paths` rows for the 12 V1 categories (per Part 3 of architecture doc).

Phase 1 likely an M-sized chunk on its own. Could be split off as a separate sub-feature ("OUT-02-foundations") if it makes the next session cleaner — that's a Phase 1 entry decision.

## Context for future sessions

### Where to start the next session

Read in order:
1. `00-project-management/decisions/adr-006-content-creation-prompt-architecture.md` (ADR-006) — the architectural shape.
2. `01-design/content-creation-architecture.md` — the full design doc, especially Part 3 (Topic Engine cascade catalogue) and Part 6 (data model).
3. `01-design/briefs/OUT-02-content-creator-single-step.md` — the brief, especially the Phase 1 section.
4. This session log.

That's enough context to start Phase 1 from scratch in a fresh conversation.

### Things to watch out for

- **"+ Add `${category}`" deeplinks need verified routes.** All 12 cascade categories should deeplink to a working page. Most exist (`/dna/audience-segments`, `/dna/offers`, etc.) but verify before Phase 2 picker work — particularly: Idea → `/inputs/ideas`, Mission → `/projects/missions`, Own research → ?, Source material → `/inputs/sources`.
- **`topic_paths` storage model is open** (tree table vs single jsonb config). Phase 1 implementation review picks one. Tree-table likely better for incremental category additions.
- **`topic_context_config` shape is provisional.** Refine through Phase 1 by implementing the 5 seed content types and seeing what configurations actually appear.
- **REG-01 partially absorbed into `library_items`.** Architecture doc Part 5 notes this; brief Phase 4 question 5 keeps the door open to merge or split. Decision deferred to implementation review.
- **Streaming pattern (parallel vs sequential variants) is a Phase 3 decision.** Sequential is simpler; parallel is faster but heavier. Don't pre-commit.
- **ToV cascade fallbacks** — when no samples exist for a `format_type`, fall back to the closest analogue. Seed cascade order per format type during DNA-09 finalisation, not during OUT-02 build. Check DNA-09 progress before Phase 1.
- **Inline chat-on-variant reuses OUT-01 chat infra.** OUT-01 uses a custom React hook (AI SDK v6 has no `useChat`). Phase 4 should extract the hook for reuse rather than duplicating.

### What's "sacred" vs "configurable"

When implementing, a hierarchy worth holding in mind:
- **Sacred (per-content-type, hand-authored):** Structural skeleton (Layer 6). The skeleton is what makes a sales page look like a sales page. Don't let it become a fragment.
- **Shared by reference (fragments):** Persona / Worldview / Craft / Output contract — pulled from the fragment library. Reuse where appropriate, author new fragments where it's not.
- **Always-on (invariant):** Brand context (Layer 4). Same bundle every time. Don't make this configurable.
- **Configurable (per-content-type):** Topic context (Layer 5) via `topic_context_config`. The shape varies enough to warrant config.

If a future session is tempted to "simplify" by making the structural skeleton a fragment ref, or by making brand context configurable — read ADR-006 first.

### What was deliberately *not* covered this session

- Picker IA and layout (Phase 2 work; goes through `feature-template-check` + `layout-design`).
- Generation surface layout (Phase 2/3 work).
- Specific per-fragment text content from legacy CSV (port-as-you-go in Phase 1 / Phase 5).
- Two-step blueprint editor design (OUT-02a; not OUT-02).
- AI suggestion from one-line goal in picker (V2).
- Cost guardrails / token estimation (V2).

## Self-improvement check

The session-log skill performed cleanly. The Topic Engine cascade catalogue addition mid-session prompted a sub-question that a future skill could potentially handle more directly: *when an architecture decision is mid-flight and the human realises it needs to be redone against the current schema*, the instinct is to add a section rather than restart. The current `feature-brief` and architecture-doc patterns handle this fine, so no skill change recommended.

One small observation, not a skill bug: the session-log skill correctly identified ADR-worthy decisions in Step C, but the bar between "ADR-worthy" and "captured in the architecture doc / brief" was finely judged this session (e.g. "audience cascade: drop obstacles" is a decision but doesn't warrant an ADR; "eight-layer prompt model" clearly does). The current SKILL.md guidance ("affects architecture, data model, or tech choices in a durable way; would be non-obvious to revisit") captured this correctly. No change needed.

No skill changes proposed.
