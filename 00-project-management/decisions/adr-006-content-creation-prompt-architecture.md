# ADR-006: Content creation prompt architecture — eight-layer model + two-record stages

> Status: APPROVED
> Date: 2026-04-26
> Decides: How content creation prompts are structured, stored, and assembled in BigBrain (the substrate for OUT-02 and OUT-02a)

---

## Context

The legacy content creation system (Wized + Xano "Moogul") had ~140 content types, each stored as a single row with eight prompt slots: `primer`, `background`, `briefing_notes_two`, `copywriting`, `second_primer`, `page_structure`, `instructions`, `structure_recap`. Plus a separate centralised fragment library of 38 reusable bits (hooks, headlines, persuasive principles, etc.).

When designing OUT-02 (single-step content creator) for BigBrain, we decomposed three legacy content types in detail (Instagram caption, Sales page AIDA, Brainstorm Podcast Episodes) to understand what the slots were actually doing. Three findings:

1. **The legacy slots conflated distinct concepts.** `primer` mixed Persona + Worldview + multi-step flow declaration. `background` was sometimes brand orientation and sometimes a heavy topic-specific bundle (offer + VOC pulls). `structure_recap` wasn't a recap at all — it was the entire copy-stage prompt for two-step content. `copywriting` and `briefing_notes_two` both carried craft fragments but at different tier levels.

2. **Two-step content types had more cells filled in the same row** (e.g. `page_structure` was the blueprint stage, `structure_recap` was the copy stage). This worked in Xano but doesn't generalise — it can't extend to a third stage (e.g. a synthesis pass), and storing two distinct prompt configs as named columns on one row encourages drift between them.

3. **The brand context vs topic context distinction was muddled.** Sales AIDA looked like it had heavy "brand context" because `background` was huge — but the contents were the offer + audience VOCs (i.e. *topic* context for that specific generation), not orientation about who the business is.

The question: how do we structure the prompt schema for BigBrain so that (a) per-content-type intent stays sacred (no LLM-cocktail slop), (b) the schema cleanly extends from single-step to two-step to synthesis-pass, (c) shared craft fragments are reused honestly without losing structural distinctiveness, and (d) Brand context and Topic context are separable concerns?

---

## Decision

Three architectural decisions, taken together:

### Decision 1: Eight-layer prompt model

Every prompt in the content creation system is composed from eight conceptual layers, in order:

1. **Persona** — who the AI is for this task. Reference to a fragment.
2. **Worldview** — embedded principles about *what the content is for*. Reference to a fragment, optional.
3. **Task framing** — what we're producing right now and how many variants. Hand-authored text per stage.
4. **Brand context** — always-on orientation: business overview + ToV core + identity essentials. Same shape every prompt. Resolved by a fixed bundle.
5. **Topic context** — per-content-type config: which DNA strands does *this* type weave in? Where the Topic Engine output slots in. Per-content-type configurable.
6. **Structural skeleton** — the architecture of the output. Hand-authored per stage. The per-content-type bit. Can embed inline fragment refs (e.g. `${hooks_social}` inside the Hook section).
7. **Craft directives** — shared fragments for voice, formatting, technique. Three usage modes: list, inline, tiered.
8. **Output contract** — JSON shape, length constraints, no-fluff reminders. Reference to a fragment + content-type extras.

The assembler walks the layers in order, resolving placeholders, and emits the final prompt.

### Decision 2: Two-record model for multi-stage prompts

Content types and stages are separate tables, FK-linked:

```
content_types
├─ identity + catalogue metadata
├─ prerequisites, strategy_fields
├─ topic_context_config (Layer 5)
└─ has 1+ prompt_stages

prompt_stages
├─ FK → content_types
├─ stage_order, stage_kind ('single' | 'blueprint' | 'copy' | 'synthesis')
├─ persona_fragment_id (Layer 1)
├─ worldview_fragment_id (Layer 2)
├─ task_framing (Layer 3 — text per stage)
├─ structural_skeleton (Layer 6 — text per stage)
├─ craft_fragment_config (Layer 7 — jsonb supporting list/tiered)
├─ output_contract_fragment_id (Layer 8)
└─ output_contract_extras
```

Single-step content types have 1 `prompt_stages` row (`stage_kind = 'single'`). Two-step content types have 2 (`'blueprint'` + `'copy'`). V2 synthesis pass adds a 3rd. No special-casing.

**Layers 4 (Brand context) and 5 (Topic context) are NOT on `prompt_stages`.** Layer 4 is invariant (same bundle every time). Layer 5 lives on `content_types.topic_context_config` because it's per-type, not per-stage.

**Stage inheritance:** none formal. When two stages share a Layer (typically Persona and Worldview), the second stage's row just copies the FK. Less clever, allows divergence later without migration.

### Decision 3: Brand context invariant; Topic context per-type configurable

- **Layer 4 (Brand context)** is a fixed bundle resolver. Pulls business overview + ToV core + identity essentials. Same every prompt. No per-type config.
- **Layer 5 (Topic context)** is per-content-type configured via `topic_context_config` jsonb on `content_types`. Declares which DNA strands to weave in (offer + VOCs for a sales page; platform metadata for a brainstorm-podcast; just the Topic Engine sentence for an IG caption) and where the Topic Engine output slots in.

This separation makes it explicit what's "who we are" (always-on) versus "what is *this* content about" (configurable per type, per generation).

---

## Why this shape

### Why the eight layers and not the legacy 8 slots

The legacy slots were named after where in the prompt they appeared (`primer` = first, `second_primer` = mid, `instructions` = end), not what role they played. The eight layers are named after their conceptual role. Specific gains:

- **Persona vs Worldview vs Task framing** were collapsed in `primer` + `second_primer`. Splitting them is honest: a heavy persona can pair with no worldview (IG caption); a heavy worldview can pair with a flow-declaring persona (Sales AIDA).
- **Brand context vs Topic context** was conflated in `background`. Sales AIDA's huge `background` was mostly topic context (offer + VOCs); IG caption's small `background` was just brand context. Once split, brand context becomes invariant infrastructure and topic context becomes the per-type config.
- **Craft directives' usage modes (list / inline / tiered)** were spread across `copywriting`, `briefing_notes_two`, and inline references in `page_structure`. One layer, three usage modes captures all three.
- **Output contract** isolates `${json_five}`, character limits, `${no_fluff}`, and stage triggers — all of which were buried in `instructions` mixed with reminders.

### Why two records, not one row with doubled columns

Considered three options for two-step:
- **(A) One record, all layers doubled** (e.g. `primer_blueprint`, `primer_copy`, etc.). Pros: single row per type. Cons: lots of duplicate columns; many layers are identical between blueprint and copy stages of the same content type, inviting drift.
- **(B) Two linked records, FK to `content_types`.** Pros: single-step is just `prompt_stages.length === 1`; no special casing. Naturally extends to synthesis-pass and beyond. Cons: a join.
- **(C) Hybrid — base values + stage overrides.** Pros: compact for single-step. Cons: complex assembler logic; harder to read at a glance.

Picked (B). Looking at Sales AIDA, 4 of 8 layers differ between blueprint and copy stages — so options (A) and (C) both leak into "actually, lots of fields are the same." (B) models the concept honestly: a content type has *stages*; each stage is its own prompt configuration.

### Why no formal stage inheritance

Considered an explicit `inherits_persona_from_stage: <stage_id>` mechanism so stages could share Layer values without copying. Rejected: it's clever where simple suffices. When stage 2's persona equals stage 1's, the authoring convention is just "copy the FK in." Allows stages to diverge later without a migration. Less to go wrong; less to reason about.

### Why brand context is invariant

Brand context is the "this is who we are" baseline that every piece of content needs. Pulling business overview, ToV core, and identity essentials happens for every generation regardless of content type. Making it per-type configurable invites accidents (a content type forgetting to include ToV) and adds zero expressiveness.

### Why topic context is per-type configurable

Different content types weave different DNA strands. A sales page is offer-driven (topic = the offer + its VOCs). An IG caption is Topic-Engine-driven (topic = whatever the user picked). A brainstorm-podcast is platform-driven (topic = platform metadata + optional Topic Engine sentence). The shape varies enough to warrant per-type config.

---

## What this means in practice

### For schema design (Phase 1 of OUT-02)

New tables under `02-app/lib/db/schema/content/`:
- `content_types` — catalogue + per-type metadata + Layer 5 config
- `prompt_stages` — one row per stage (single-step = 1; two-step = 2; synthesis = 3)
- `prompt_fragments` — unified library, six kinds: `persona`, `worldview`, `craft`, `context`, `proofing`, `output_contract` (extending the legacy three: craft, context, proofing). Versioned.
- `topic_paths` — declares the Topic Engine cascade (separate concern; see content-creation-architecture.md Part 3).
- `generation_runs` — system-of-record for in-flight + recently-generated work. Stores assembled prompt + fragment versions for reproducibility.
- `library_items` — saved variants only.

### For the prompt assembler (Phase 1 of OUT-02)

`lib/llm/content/assemble.ts` walks the eight layers in order:

```ts
async function assemble(stage, generation_inputs) {
  return [
    await resolveFragment(stage.persona_fragment_id),
    stage.worldview_fragment_id ? await resolveFragment(stage.worldview_fragment_id) : '',
    stage.task_framing,
    await resolveBrandContextBundle(),
    await resolveTopicContext(content_type.topic_context_config, generation_inputs),
    resolveSkeleton(stage.structural_skeleton, generation_inputs),
    await resolveCraft(stage.craft_fragment_config, generation_inputs),
    await resolveOutputContract(stage.output_contract_fragment_id, stage.output_contract_extras),
  ].filter(Boolean).join('\n\n')
}
```

### For authoring new content types

Adding a new content type is a data exercise:
1. Insert one `content_types` row (catalogue metadata + `topic_context_config`).
2. Insert one `prompt_stages` row for single-step (or 2 for two-step).
3. Reference existing `prompt_fragments` for Persona / Worldview / Craft / Output contract — author new fragments only when the existing library doesn't cover the need.

The structural skeleton (Layer 6) is the only mostly-text column the author writes from scratch. Everything else is FK references or jsonb config.

### For scaling to V2 (OUT-02a)

Adding two-step requires no schema changes — just `is_multi_step = true` on `content_types` and a second `prompt_stages` row (`stage_kind = 'blueprint'`) plus a third (`stage_kind = 'copy'`). The synthesis pass for sales pages adds a 4th row. The assembler runs per stage, gated on user approval at stage transitions.

### For fragment versioning

Every `prompt_fragments` row has a `version` integer. `generation_runs` stores `fragment_versions` jsonb (`{fragment_slug: version}`) so old generations are reproducible even after fragments are tuned.

---

## What was ruled out and why

- **Carrying the legacy 8 slots verbatim into BigBrain.** Rejected — preserves the conceptual conflations and locks future flexibility.
- **All-fragments approach (no hand-authored skeleton per content type).** Rejected — risks generic LLM-cocktail output. The structural skeleton is the per-type intent and must remain hand-authored.
- **One row per content type with doubled columns for two-step** (Option A above). Rejected — drift risk; doesn't extend to synthesis pass.
- **Hybrid base+overrides** (Option C above). Rejected — complexity not justified given how many layers actually differ between stages.
- **Formal stage inheritance mechanism.** Rejected — complexity not justified; copying FKs is fine.
- **Making brand context per-content-type configurable.** Rejected — invariant is cleaner; configurability adds zero expressiveness here.
- **Storing the Topic Engine cascade in a single jsonb config (rather than `topic_paths` rows).** Deferred — Phase 1 implementation review picks tree-table vs single-jsonb based on query patterns.

---

## Open questions deferred to Phase 1 implementation

- Exact shape of `topic_context_config` jsonb (provisional shape sketched in `01-design/content-creation-architecture.md` Part 5).
- `topic_paths` storage model (tree table vs jsonb config).
- Variant streaming pattern (parallel vs sequential).
- TTL on unsaved `generation_runs` drafts (suggested 30 days).

---

## Related

- Architecture doc: `01-design/content-creation-architecture.md`
- Brief: `01-design/briefs/OUT-02-content-creator-single-step.md`
- Backlog: OUT-02 (in-progress), OUT-02a (planned)
- Supersedes scope-wise: GEN-PROMPTS-01 (closed 2026-04-26)
