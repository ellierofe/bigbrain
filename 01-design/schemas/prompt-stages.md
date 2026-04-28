---
status: approved
table: prompt_stages
type: system (catalogue, not DNA)
related_features: OUT-02, OUT-02a
adr: ADR-006
last_updated: 2026-04-28
---

# Schema: prompt_stages

System table. One row per stage of a content type's generation flow. Single-step
content types have 1 stage. Two-step (long-form) have 2 (`blueprint` + `copy`).
V2 synthesis adds a 3rd. FK to `content_types` (parent), FKs to `prompt_fragments`
for Layers 1, 2, 8.

Carries the per-stage prompt content for the eight-layer assembler:

| Layer | Where it lives |
|---|---|
| 1 — Persona | `persona_fragment_id` FK |
| 2 — Worldview | `worldview_fragment_id` FK (nullable) |
| 3 — Task framing | `task_framing` text (hand-authored per stage) |
| 4 — Brand context | NOT on this table — invariant; assembler injects |
| 5 — Topic context | NOT on this table — `content_types.topic_context_config` drives it |
| 6 — Structural skeleton | `structural_skeleton` text (with `${slug}` placeholders) |
| 7 — Craft directives | `craft_fragment_config` jsonb |
| 8 — Output contract | `output_contract_fragment_id` FK + `output_contract_extras` text |

**Stage inheritance: none formal.** When authoring a two-step content type, just
copy FK values for layers that don't differ between stages (typically Persona
and Worldview). Less clever, less to go wrong, allows stages to diverge later
without migration. (Per ADR-006.)

## Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | |
| `contentTypeId` | uuid | not null, FK → `content_types.id` ON DELETE CASCADE | Parent content type. Cascade because stages are meaningless without their parent. |
| `stageOrder` | integer | not null | Execution order. 1, 2, 3… Single-step types always have stageOrder=1. |
| `stageKind` | enum | not null | One of: `single`, `blueprint`, `copy`, `synthesis`. pgEnum named `stage_kind`. |
| `personaFragmentId` | uuid | not null, FK → `prompt_fragments.id` ON DELETE RESTRICT | Layer 1. RESTRICT — never cascade-delete a fragment that's in use. |
| `worldviewFragmentId` | uuid | nullable, FK → `prompt_fragments.id` ON DELETE RESTRICT | Layer 2. Nullable — not all stages declare a worldview. |
| `taskFraming` | text | not null | Layer 3. Hand-authored per stage. Short instruction like "STEP 1 of 2: Build the blueprint…". |
| `structuralSkeleton` | text | not null | Layer 6. The heart of per-type craft, with `${placeholder}` and `${fragment_slug}` substitutions. Resolved by the assembler at generation time. |
| `craftFragmentConfig` | jsonb | not null, default `{}` | Layer 7. See **craftFragmentConfig shape** below. Empty object = no craft fragments declared (rare; usually inline references in the skeleton do the work). |
| `outputContractFragmentId` | uuid | not null, FK → `prompt_fragments.id` ON DELETE RESTRICT | Layer 8. Every stage must produce structured output. |
| `outputContractExtras` | text | nullable | Per-stage tweaks to the contract. E.g. "Each section ≤ 280 chars" or "Include `provenance` field on every section". Concatenated to the resolved Layer 8 fragment at assembly time. |
| `defaultModel` | varchar(100) | nullable | Optional model slug override (e.g. `claude-sonnet-4-6`). When null, the runtime uses the user's configured default per the model hierarchy (Anthropic primary, Gemini fallback). |
| `minTokens` | integer | nullable | Per-stage soft min. Hint to the runtime + Layer 8. |
| `maxTokens` | integer | nullable | Per-stage soft max. |
| `notes` | text | nullable | Internal notes — rationale, history, known edge cases. |
| `createdAt` | timestamp with tz | not null, defaultNow | |
| `updatedAt` | timestamp with tz | not null, defaultNow | |

## stageKind enum

| Value | Used for |
|---|---|
| `single` | Single-step content types (V1 baseline — LinkedIn post, brainstorms, emails). The only stage. |
| `blueprint` | OUT-02a stage 1. Produces the structured outline (`{purpose, rationale, messaging, provenance}` per section). |
| `copy` | OUT-02a stage 2. Generates copy section-by-section against the user-approved blueprint. |
| `synthesis` | OUT-02a stage 3 (sales pages). Reconciles flow across the assembled copy against the blueprint. |

V1 only seeds `single` rows. `blueprint` / `copy` / `synthesis` ship with OUT-02a.

## craftFragmentConfig shape

Layer 7 directives. Three usage modes:

```json
// Simple list (most common — IG caption, brainstorm)
{ "mode": "list", "fragment_ids": ["frag_id_1", "frag_id_2", "frag_id_3"] }

// Tiered (sales AIDA copy stage — foundational + section-specific)
{
  "mode": "tiered",
  "tiers": [
    { "label": "foundational", "fragment_ids": ["persuasive_sales", "cadence", "paragraphs"] },
    { "label": "section_specific", "fragment_ids": ["headlines", "subheadings", "triple_stack_bullets"] }
  ]
}

// Empty (rare — inline `${fragment_slug}` references in the skeleton do all the work)
{}
```

`fragment_ids` are **slugs** (not uuids) — the assembler resolves them against
`prompt_fragments` at generation time. Slug-based references survive fragment
versioning naturally (latest active version wins).

## Indexes

- `(contentTypeId, stageOrder)` unique — one row per (content type, stage order)
  pair. Prevents accidental duplicate stages.
- `(contentTypeId)` — listing all stages of a content type at runtime. Covered
  by the unique index above (Postgres uses leftmost prefix), so explicit
  separate index not needed.
- `(personaFragmentId)`, `(worldviewFragmentId)`, `(outputContractFragmentId)` — FK
  indexes for "find all stages using fragment X" queries. Useful for the future
  fragment-edit impact analysis (which content types am I affecting if I tune
  this fragment?).

## Relationships

- **Parent:** `content_types` (FK on `contentTypeId`, ON DELETE CASCADE).
- **Children:** None at this layer. Future `generation_runs.stage_id` will FK
  to here when that table lands.
- **Sibling references:**
  - `personaFragmentId` → `prompt_fragments` (RESTRICT)
  - `worldviewFragmentId` → `prompt_fragments` (RESTRICT, nullable)
  - `outputContractFragmentId` → `prompt_fragments` (RESTRICT)
  - Inline `${slug}` references in `structuralSkeleton` and slugs in
    `craftFragmentConfig.fragment_ids` resolve against `prompt_fragments` at
    runtime — string-based, no FK constraint (versioning is slug-based, not
    id-based).

## Notes

- This table is **not user-facing** in the DNA dashboard — it's system
  configuration. Authoring is via SQL/CLI in V1 (seed scripts).
- No `brandId` (single-tenant V1). Same forward-compat note as `prompt_fragments`.
- FK delete behaviour:
  - `content_types → prompt_stages` is **CASCADE** (deleting a content type
    deletes its stages — they're not meaningful standalone).
  - `prompt_fragments → prompt_stages` is **RESTRICT** (cannot delete a
    fragment that any stage references — forces explicit migration of stages
    first). This is intentional safety: fragments are append-only-versioned;
    archiving (status='archived') is the soft-delete path.
- The `(contentTypeId, stageOrder)` unique constraint catches the common
  authoring mistake of accidentally duplicating a stage. Less common at the V1
  scale (5 seed types) but cheap insurance.
- `defaultModel` is per-stage rather than per-content-type because long-form
  generation often wants different models per stage (e.g. Sonnet for blueprint,
  Opus for copy). V1 seeds set this null.
- The 8-layer assembler `lib/llm/content/assemble.ts` is the consumer of this
  table. Pressure-test of the jsonb shapes (`craftFragmentConfig`,
  `topicContextConfig` on `content_types`) is scheduled before Batch 2 lands —
  per the OUT-02 Phase 1 plan.
