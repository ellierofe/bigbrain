---
status: approved
table: topic_paths
type: system (catalogue, not DNA)
related_features: OUT-02
adr: ADR-006
last_updated: 2026-04-28
---

# Schema: topic_paths

System table. Declares the 1–4 step Topic Engine cascade — the "Infinite Prompt
Engine" the user drills through to specify what their content is *about*. One
row per node in the cascade tree. Tree-shaped via `parentId` (locked over
single-jsonb-config — better for incremental growth, simpler queries per step,
and matches the live-data-driven philosophy where each step queries the DB).

The full V1 catalogue (12 step-1 categories, the per-category sub-trees, and
the prompt-template literals) is specified in
[content-creation-architecture.md Part 3](../content-creation-architecture.md).
This schema is the storage layer; that doc is the seed spec.

## How rows are used at runtime

The Topic Engine query layer (`lib/content/topic-engine.ts`, future) walks the
tree:

1. Step 1 query: `WHERE stepLevel = 1 AND status = 'active'` → returns the 12
   categories (or however many have `hasDataCheck` passing for the current
   brand state).
2. User picks a row. Query for next step: `WHERE parentId = <picked.id> AND
   status = 'active'`. Each child row carries a `dataQuery` jsonb that the
   query layer interprets to surface live items from the relevant DNA / source
   table (e.g. "fetch `dna_audience_segments` rows", "fetch `voc_problems`
   array from the chosen segment").
3. Repeat until the user reaches a leaf (`nextStepId IS NULL`). The leaf's
   `promptTemplate` is resolved against the user's selections and injected as
   Layer 5 context by the assembler.

## Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | |
| `parentId` | uuid | nullable, FK → `topic_paths.id` ON DELETE CASCADE | Self-FK for tree structure. Null for step-1 categories. CASCADE — deleting a parent kills the whole sub-tree (sub-trees are meaningless without their root). |
| `path` | varchar(200) | not null | Materialised dotted path from root, e.g. `audience.segment.problems.item`. Used as a stable natural key for seeds, deeplinks, and the `topicChain.category` value persisted on `generation_runs.inputs`. |
| `stepLevel` | integer | not null | 1–4. Position in the cascade. Matches `step1`/`step2`/`step3`/`step4` keys in `TopicChain`. |
| `category` | varchar(50) | not null | Top-level category slug — the step-1 root this row descends from. Denormalised onto every node in the sub-tree for cheap "show me everything in the audience cascade" queries. Examples: `audience`, `offer`, `knowledge_asset`, `platform`, `value_proposition`, `brand_meaning`, `brand_proof`, `source_material`, `own_research`, `mission`, `idea`, `free_text`. |
| `label` | varchar(200) | not null | User-facing label rendered in the picker UI. E.g. `"An audience segment"`, `"Problems"`, `"Which segment?"`. |
| `surfaceKind` | varchar(20) | not null | What the row surfaces. One of: `category`, `sub_category`, `entity`, `aspect`, `item`. Drives the picker UI's render mode. See **surfaceKind values** below. |
| `dataQuery` | jsonb | not null, default `{}` | Declarative query config interpreted by the query layer. Examples: `{ "kind": "static" }` for fixed lists; `{ "kind": "table", "table": "dna_audience_segments", "filter": "status='active'" }` for live entity lists; `{ "kind": "jsonb_array", "table": "dna_audience_segments", "field": "problems", "parent_param": "segment_id" }` for nested arrays. See **dataQuery shape** below. |
| `hasDataCheck` | jsonb | nullable | Declarative gate evaluated at picker render. Same shape vocabulary as `dataQuery` but interpreted as "does this branch have any data?" for the dim-and-deeplink behaviour at empty branches. Null = always available (e.g. free-text). |
| `multiSelect` | boolean | not null, default `false` | Whether the user can select multiple values at this step. Per Part 3.3 of the architecture doc: only true at item-surfacing leaves. |
| `promptTemplate` | text | nullable | Leaf-only. The literal sentence injected as Layer 5 context, with `${...}` placeholders the assembler fills from selections. Null on non-leaf rows. Vocabulary aligns with `04-documentation/reference/prompt-vocabulary.md` Group A (Strategy/selection placeholders). |
| `nextStepId` | uuid | nullable, FK → `topic_paths.id` ON DELETE SET NULL | Optional explicit pointer to the next step row. Mostly redundant with the `parentId` reverse lookup, but useful for cascades where a step has multiple parents (rare in V1, present for forward compat). SET NULL on delete because losing the pointer doesn't invalidate the row — the parent/child tree is the source of truth. |
| `displayOrder` | integer | not null, default 0 | Sort order within siblings (rows with the same `parentId`). Lower = earlier. |
| `status` | varchar(50) | not null, default `'active'` | One of: `draft`, `active`, `archived`. Filters out parked / WIP cascade nodes from the picker. |
| `notes` | text | nullable | Internal notes — rationale, history, known edge cases. |
| `createdAt` | timestamp with tz | not null, defaultNow | |
| `updatedAt` | timestamp with tz | not null, defaultNow | |

## surfaceKind values

| Value | Used for | Example row |
|---|---|---|
| `category` | Step-1 root nodes (the 12 V1 categories). `parentId IS NULL`. | `path="audience"`, `label="An audience segment"` |
| `sub_category` | Step-2 nodes that split a meta-category before reaching entities. Currently used for `brand_proof` (testimonial / statistic / story). | `path="brand_proof.testimonial"` |
| `entity` | Nodes representing "which X?" — the user picks a specific record from a live table. | `path="audience.segment"`, picker fetches `dna_audience_segments` rows |
| `aspect` | Nodes representing "which facet of this entity?" — fixed enums per parent entity. | `path="audience.segment.problems"` |
| `item` | Leaf nodes representing actual content the user can multi-select. | `path="audience.segment.problems.item"`, picker fetches array elements |

## dataQuery shape

Declarative config for what the query layer fetches when this row is "opened"
in the picker. Interpreted by `lib/content/topic-engine.ts` (future). V1
vocabulary:

```json
// Static — no DB query, options are children of this row
{ "kind": "static" }

// Table — fetch rows from a DNA / source table, optional filter
{ "kind": "table", "table": "dna_audience_segments", "filter": "status='active'" }
{ "kind": "table", "table": "src_testimonials", "filter": "is_archived=false" }

// JSONB array — fetch a jsonb-array field on a parent record
{ "kind": "jsonb_array", "table": "dna_audience_segments", "field": "problems", "parent_param": "segment_id" }

// Joined — fetch via a join (entity_outcomes, mission joins)
{ "kind": "joined", "table": "dna_entity_outcomes", "filter": "kind='outcome'", "parent_param": "offer_id", "parent_field": "offer_id" }

// Single value — surface a single column from a parent row
{ "kind": "single", "table": "dna_offers", "field": "usp", "parent_param": "offer_id" }
```

The same vocabulary is used for `hasDataCheck`, but interpreted as
"`COUNT(*) > 0`" or "`field IS NOT NULL`" depending on the kind.

The exact resolver lives in code, not in the DB. The query-layer build is
Phase 2 of OUT-02 — at this stage we only need the storage shape locked.

## promptTemplate placeholders

Per `04-documentation/reference/prompt-vocabulary.md` Group A. Common
placeholders by category:

| Placeholder | Resolved from |
|---|---|
| `${segment_name}` | The chosen `dna_audience_segments.name` |
| `${offer_name}` | The chosen `dna_offers.name` |
| `${asset_name}` | The chosen `dna_knowledge_assets.name` |
| `${platform_name}` | The chosen `dna_platforms.name` |
| `${aspect_label}` | The chosen aspect row's `label` |
| `${selected_items_joined}` | The user's multi-selected items, naturally joined (`"X"`, `"X" and "Y"`, `"X", "Y", and "Z"`) |
| `${value}` | A single-value aspect's resolved string |
| `${user_text}` | Free-text input (free-text category only) |

Templates with conditional fragments use a single ternary syntax inside
`${...}` — kept simple in V1, expanded in V2 if needed.

## Indexes

- `path` unique — natural key for seeds and stable deeplinks. Prevents the
  catalogue from drifting (two rows accidentally sharing `audience.segment`).
- `(parentId, displayOrder)` — covers the runtime "fetch all children of node
  X in order" query.
- `(category, status, stepLevel)` — covers "fetch all step-1 active categories"
  and "fetch the whole audience sub-tree for impact analysis" queries.
- `(stepLevel, status)` — bare step-1 listing fallback.

## Relationships

- **Self:** `parentId` (CASCADE) and `nextStepId` (SET NULL).
- **No FK to other tables.** The `dataQuery` jsonb references DNA / source
  tables by name. This is intentional: hard FKs would couple the catalogue to
  every table in the schema, and the query layer interprets `dataQuery`
  declaratively at runtime. Bad table refs surface as "unknown table" errors
  from the query layer, not as schema-level failures — which is fine because
  the catalogue is curated, not user-edited.
- **Future references in:** `generation_runs.inputs.topic_chain` carries the
  `path` value (string), not a uuid. Seeds use `path` as the natural key for
  upserts.

## Notes

- This table is **not user-facing**. Authoring is via SQL/CLI seed scripts in
  V1. Same pattern as `prompt_fragments` / `prompt_stages`.
- The materialised `path` column is intentional duplication with the tree
  structure. Tree walking is correct but slow at runtime; `path` lets us
  do `WHERE path LIKE 'audience.%'` and other prefix queries cheaply, plus
  gives seed scripts a stable upsert key. The cost is keeping `path` in sync
  with `parentId` — handled at seed time, not by triggers.
- No `brandId`. Single-tenant V1; same forward-compat note as
  `prompt_fragments` / `content_types` / `prompt_stages`.
- `nextStepId` is included for forward compat (V2 may have shared sub-trees
  pointed to from multiple parents). V1 seeds always leave it null and rely on
  the `parentId` reverse lookup.
- The `dataQuery` and `hasDataCheck` vocabularies are deliberately
  conservative for V1. New `kind` values can be added as new categories
  warrant — no migration needed (jsonb).
- Seeds for the V1 catalogue (~50 rows for the 12 categories + sub-trees)
  ship in Phase 3 alongside the 5 V1 content types and 38 ported fragments.
