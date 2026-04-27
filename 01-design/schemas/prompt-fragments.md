---
status: draft
table: prompt_fragments
type: system (not DNA)
related_features: OUT-02, OUT-02a
adr: ADR-006
last_updated: 2026-04-27
---

# Schema: prompt_fragments

System table. The unified fragment library used by the eight-layer prompt
assembler (ADR-006). Replaces the earlier `prompt_components` design — see
`01-design/schemas/_archived-prompt-components.md` for what was superseded.

A fragment is a reusable, versioned chunk of prompt text referenced by FK from
either `prompt_stages` (Layers 1, 2, 7, 8) or embedded inline in a stage's
structural skeleton (Layer 6) via `${slug}` template literals. The assembler
resolves placeholders against live data at generation time.

Fragments are versioned: editing a fragment bumps `version`, and
`generation_runs.fragment_versions` records which version was used so old
generations remain reproducible.

## Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | |
| `slug` | varchar(100) | not null | Machine-readable identifier used in prompt assembly. E.g. `persona_social_copywriter`, `hooks_social`, `output_contract_json_five`. Unique on `(slug, version)`. |
| `kind` | varchar(50) | not null | One of: `persona`, `worldview`, `craft`, `context`, `proofing`, `output_contract`. See Kind reference below. |
| `name` | varchar(200) | not null | Human-readable name |
| `purpose` | text | nullable | What this fragment does — why it exists |
| `usage` | text | nullable | When/where this fragment is used (which stages, which content types) |
| `content` | text | not null | The actual prompt text. May include `${variable}` placeholders for dynamic values resolved at runtime. |
| `placeholders` | jsonb | not null, default `[]` | Declared expected placeholder names — array of strings, e.g. `["brand_name", "voc_problems"]`. The assembler validates against this. |
| `version` | integer | not null, default 1 | Bumps on each edit. `prompt_stages` FKs reference (slug, version) — see Versioning below. |
| `status` | varchar(50) | not null, default `'active'` | One of: `draft`, `active`, `archived`. Inactive fragments are not assembled even if referenced. |
| `notes` | text | nullable | Internal notes — rationale, history, known edge cases |
| `createdAt` | timestamp with tz | not null, defaultNow | |
| `updatedAt` | timestamp with tz | not null, defaultNow | |

## Kind reference

The six kinds map to the eight prompt layers from ADR-006. Layers 3 (Task framing)
and 6 (Structural skeleton) are NOT fragments — they are hand-authored text on
`prompt_stages` rows. Layers 4 (Brand context) and 5 (Topic context) are
resolved by bundle resolvers, not fragments.

| Kind | Eight-layer role | Examples |
|---|---|---|
| `persona` | Layer 1 — who the AI is | `persona_social_copywriter`, `persona_direct_response`, `persona_strategist_owned_content` |
| `worldview` | Layer 2 — embedded principles about what the content is for | `worldview_owned_content`, `worldview_sales_principles` |
| `craft` | Layer 7 — voice / formatting / technique. The bulk of the legacy `copywriting` library | `hooks_social`, `headlines`, `cadence`, `empathy`, `triple_stack_bullets`, `pacing` |
| `context` | Embedded inline in skeletons (Layer 6); or used by bundle resolvers (Layer 4/5) | `business_context_short`, `tov_frame`, `topic_intro` |
| `proofing` | Layer 7 (proof-style craft) and Layer 8 reminders | `banned_words`, `apostrophe`, `labels`, `no_fluff` |
| `output_contract` | Layer 8 — JSON shape, length constraints, finalisation triggers | `output_contract_json_five`, `output_contract_blueprint_json`, `output_contract_freeform_sections` |

The split between `craft` and `proofing` is by orientation: `craft` is
"do this technique"; `proofing` is "don't do these things / strip these out".

## Versioning

Each row has a `version` integer. `prompt_stages` and `generation_runs` reference
fragments by slug; the version pinned at the time of generation is recorded on
`generation_runs.fragment_versions` (jsonb map: `{slug: version}`).

When tuning a fragment:
1. The current row stays; its `status` may move to `archived`
2. A new row is inserted with the same `slug`, incremented `version`, `status='active'`
3. Future generations resolve to the active version
4. Past generations remain reproducible by querying the specific version they recorded

This is append-only versioning, not overwrite. The unique constraint is
`(slug, version)`, not just `slug`. Active vs archived is the discoverability flag.

(V1: `prompt_stages` FK references the latest active version implicitly via slug
lookup. V2 may pin an explicit version per stage if needed.)

## How fragments are used

Per ADR-006, the eight-layer assembler walks layers in order and references
fragments at:
- Layer 1 (Persona) — `prompt_stages.persona_fragment_id` resolves a `persona` fragment
- Layer 2 (Worldview) — `prompt_stages.worldview_fragment_id` resolves a `worldview` fragment (nullable)
- Layer 6 (Structural skeleton) — embedded inline `${slug}` references resolve any kind, typically `craft`
- Layer 7 (Craft directives) — `prompt_stages.craft_fragment_config` jsonb lists fragment slugs (modes: list / inline / tiered)
- Layer 8 (Output contract) — `prompt_stages.output_contract_fragment_id` resolves an `output_contract` fragment

## Relationships

- Referenced by `prompt_stages` (multiple FK columns and a jsonb config). See `01-design/schemas/prompt-stages.md`.
- Referenced by `generation_runs.fragment_versions` (jsonb map of slug → version used).

## Notes

- This table is **not user-facing** in the DNA dashboard — it's system configuration.
  Authoring is via SQL/CLI in V1; admin UI is post-V2.
- `placeholders` is declared rather than parsed so the assembler can validate
  ahead of generation. The assembler also fails closed: an unresolved placeholder
  raises rather than emits literal `${...}` to the model.
- The 38 legacy fragments from `Centralised Prompt Data Live.csv` are seeded
  per Phase 1 of OUT-02. Re-categorisation across the six kinds happens at seed
  time (the legacy three kinds — copywriting/proofing/context — map mostly to
  craft/proofing/context, with personas/worldviews/output_contracts authored fresh
  to back the eight-layer model).
- Single-tenant for V1: no `brandId`. If multi-tenant ever ships, add `brandId`
  nullable (null = global, set = brand-specific override) and extend the unique
  constraint to `(brandId, slug, version)`.
