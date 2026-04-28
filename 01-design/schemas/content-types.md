---
status: approved
table: content_types
type: system (catalogue, not DNA)
related_features: OUT-02, OUT-02a
adr: ADR-006
last_updated: 2026-04-27
---

# Schema: content_types

System catalogue table. One row per content type the user can pick from the
content creator (e.g. "LinkedIn post", "Sales page (AIDA)", "Newsletter brainstorm").
Carries catalogue metadata + per-type configuration. Per-stage prompt content
lives in `prompt_stages` (FK), not here.

Replaces the legacy CSV-driven content type registry. The eight-layer prompt
model (ADR-006) decomposes the legacy monolithic row into:
- `content_types` — catalogue + per-type config (this table)
- `prompt_stages` — per-stage prompt content (FK to here)
- `prompt_fragments` — reusable fragment library (FKed by stages)

> **Vocabulary source-of-truth:** `04-documentation/reference/channel-taxonomy.md`
> (DNA-07b, done 2026-04-27). `platform_type`, `format_type`, `subtype`, and
> `prerequisites.channels` all draw from there. TypeScript constants live in
> `02-app/lib/types/channels.ts`.

## Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | |
| `slug` | varchar(100) | not null, unique | Machine-readable identifier. E.g. `linkedin-post`, `sales-page-aida`, `newsletter-brainstorm`. |
| `name` | varchar(200) | not null | Human-readable name shown in the picker. |
| `description` | text | nullable | Short blurb shown in the picker card / detail view. |
| `icon` | varchar(50) | nullable | Lucide icon name or token reference. Optional. |
| `pickerGroup` | varchar(50) | not null | Picker display grouping — how content types are grouped in the picker UI. One of: `sales`, `email`, `social`, `long_form`, `brainstorm`, `outreach`, `other`. Renamed from `category` (architecture doc) to remove collision with `dna_platforms.category` (channel taxonomy). |
| `platformType` | varchar(50) | not null | The **channel** this content type targets. Values from `Channel` enum in channel-taxonomy.md (e.g. `linkedin`, `instagram`, `podcast`, `blog`, `newsletter`, `cold_outreach`, `sales_page`, `hosted_event`). Used at picker time for channel filtering. Column kept as `platform_type` (not renamed `channel`) for parity with the architecture doc and to avoid an unnecessary schema-rename round-trip. |
| `formatType` | varchar(50) | not null | Drives ToV cascade. Values from format-bucket enum in channel-taxonomy.md: `social_short`, `social_visual`, `blog`, `newsletter`, `email`, `sales`, `spoken_audio`, `spoken_video`, `ad_copy`, `event`, `outreach`, `brainstorm`, `other`. |
| `subtype` | varchar(50) | nullable | Canonical leaf for ToV cascade. E.g. `linkedin_post`, `blog_post_long`, `cold_dm`, `podcast_script`. Optional; preferred match when present, falls back to `formatType` otherwise. |
| `isMultiStep` | boolean | not null, default `false` | True for OUT-02a content types (sales pages, web pages, proposals). V1 always false. |
| `prerequisites` | jsonb | not null, default `{"channels":[],"lead_magnets":[],"dna":[]}` | What must exist before the picker unlocks. See **Prerequisites** section below for shape + resolution rules. |
| `defaultVariantCount` | integer | not null, default 5 | How many variants to generate by default. Per-row defaults at seed time: 5 for short-form, 1 for long-form/multi-step, 10 for "ideas" / brainstorm types. User override at runtime via Settings panel. |
| `defaultMinChars` | integer | nullable | Soft per-variant min. Used as Layer 8 hint and as a UI guidance string ("aim for 800–1200 chars"). |
| `defaultMaxChars` | integer | nullable | Soft per-variant max. Same usage as `defaultMinChars`. |
| `topicBarEnabled` | boolean | not null, default `true` | Whether the Infinite Prompt Engine (topic bar) shows for this type. Set false for offer-driven types (sales pages, offer-specific emails) where Strategy panel does the heavy lifting. |
| `strategyFields` | jsonb | not null, default `[]` | Declarative config of which Strategy fields show + which are required. See **strategyFields shape** below. |
| `topicContextConfig` | jsonb | not null, default `{}` | Layer 5 config (Topic context). See **topicContextConfig shape** below. Provisional shape — refined through use (Part 7 Open Questions in architecture doc). |
| `seo` | boolean | not null, default `false` | Carry-over from legacy. True if this type benefits from SEO context injection at generation time. |
| `customerJourneyStage` | varchar(50) | nullable | Carry-over from legacy. One of: `awareness`, `engagement`, `consideration`, `conversion`, `retention`, `advocacy`. Used for picker grouping/filtering and analytics. |
| `timeSavedMinutes` | integer | nullable | Carry-over from legacy. Estimated minutes saved per generation — used for retrospective value reporting. |
| `status` | varchar(50) | not null, default `'active'` | One of: `draft`, `active`, `archived`. Inactive content types are hidden from the picker. |
| `notes` | text | nullable | Internal notes — rationale, history, known edge cases. |
| `createdAt` | timestamp with tz | not null, defaultNow | |
| `updatedAt` | timestamp with tz | not null, defaultNow | |

## Prerequisites

`prerequisites` is a jsonb object that gates picker visibility / unlocking. Shape:

```json
{
  "channels": ["podcast"],
  "lead_magnets": ["webinar"],
  "dna": ["tov", "audience", "brand"]
}
```

Resolution rules at picker time:

| Field | Resolves to | Pass condition |
|---|---|---|
| `channels[]` | `dna_platforms WHERE channel = X AND is_active = true` | ≥1 row required for each value |
| `lead_magnets[]` | `dna_lead_magnets WHERE kind = X AND status = 'active'` | ≥1 row required for each value |
| `dna[]` | Singular DNA tables (`tov`, `audience`, `value_proposition`, `brand_meaning`, `business_overview`, `brand_intro`) → row exists with non-default content. Plural DNA tables (`offers`, `audience_segments`, `knowledge_assets`) → ≥1 active row. | Per-key check passes |

Allowed `dna[]` values (V1):
- `brand` — `dna_business_overview` (singular; non-default content)
- `tov` — `dna_tone_of_voice` (singular; non-default content)
- `audience` — either singular `dna_audience` or ≥1 `dna_audience_segments` row, depending on what's configured. Resolver picks the richer source.
- `value_proposition` — singular; non-default content
- `offers` — ≥1 active `dna_offers` row
- `expertise` — ≥1 active `dna_knowledge_assets` row (the legacy CSV's `expertise` slug maps here)
- `central_bio` — `dna_brand_intro WHERE kind = 'central'` row exists with non-default content
- `brand_meaning` — singular; non-default content

`channels[]` values are channel keys from the channel taxonomy (e.g. `linkedin`,
`podcast`, `blog`, `sales_page`). The picker locks if zero matching active rows
exist in `dna_platforms`.

`lead_magnets[]` values are lead-magnet kinds from
`04-documentation/reference/channel-taxonomy.md` (e.g. `webinar`, `quiz`,
`workbook`). **V1 note:** the `dna_lead_magnets` table doesn't exist yet
(DNA-08 parked) — V1 seeds set `lead_magnets: []` for all types. Forward-compatible
vocabulary; the resolver short-circuits to "pass" while the table is absent.

Empty arrays = no prerequisite. A type with all three arrays empty is always
unlocked.

## strategyFields shape

`strategyFields` is a jsonb array declaring which Strategy panel fields show
for this content type, and which are required before the user can hit Generate.

```json
[
  { "id": "offer", "required": true },
  { "id": "audience_segment", "required": false },
  { "id": "sales_page_angle", "required": false }
]
```

Field `id` values are picker-scoped (not column names). Resolver maps them to
DNA records or freeform inputs. Examples:
- `offer` → user picks one row from `dna_offers`
- `audience_segment` → user picks one row from `dna_audience_segments`
- `knowledge_asset` → user picks one row from `dna_knowledge_assets`
- `sales_page_angle` → freetext
- `cta_url` → freetext
- `tone_variation` → enum (mapped from `dna_tov.tonalTags`)

Empty array = no Strategy panel for this type (rare; topic bar carries the
weight).

## topicContextConfig shape

Layer 5 (Topic context) configuration. jsonb object. Provisional shape per
ADR-006 / architecture doc Part 7 Open Question 9 — refined through use.

```json
{
  "uses_topic_engine": true,
  "dna_pulls": ["offer_full", "audience_voc"],
  "platform_metadata": "when_platform_selected",
  "fallback": "free_text_only"
}
```

| Key | Purpose |
|---|---|
| `uses_topic_engine` | bool — whether the topic bar's selected path injects into Layer 5 |
| `dna_pulls[]` | array of slug strings naming which DNA bundle resolvers to call. E.g. `offer_full`, `audience_voc`, `tov_frame`, `topic_intro` |
| `platform_metadata` | one of: `always`, `when_platform_selected`, `never` — when to inject channel/format hints from `dna_platforms` |
| `fallback` | one of: `free_text_only`, `dna_only`, `none` — what Layer 5 falls back to when neither topic engine nor strategy supply context |

V1 seeds set this per-row by hand. V2 may move to a normalised columns model
once usage settles.

## Indexes

- `(slug)` unique — natural key for lookups (`getContentTypeBySlug`)
- `(pickerGroup, status)` — picker groups by `pickerGroup`, hides archived
- `(platformType, status)` — channel filter on the picker
- `(status)` — admin "show all archived" view

## Relationships

- Referenced by `prompt_stages.contentTypeId` — FK with `onDelete: cascade`
  (deleting a content type cascades to its stages).
- References the channel taxonomy via `platformType` (string match against
  `dna_platforms.channel`) — string-based, no FK constraint, validated at the
  app layer via `validateCategoryChannelPair` in `02-app/lib/types/channels.ts`.
- `prerequisites.channels[]` queried against `dna_platforms.channel` at picker time.
- `prerequisites.lead_magnets[]` queried against `dna_lead_magnets.kind` at
  picker time (V1 short-circuit; table parked under DNA-08).
- `prerequisites.dna[]` queried against the relevant DNA table at picker time
  (resolver in `lib/llm/content/prerequisites.ts` — to be built).

## Notes

- This table is **not user-facing** in the DNA dashboard — it's system
  configuration. Authoring is via SQL/CLI in V1 (seed scripts); admin UI is
  post-V2.
- No `brandId` (single-tenant V1). If multi-tenant ever ships, add `brandId`
  nullable (null = global, set = brand-specific override) and extend the unique
  constraint on `slug`.
- `pickerGroup` is **not** a `pgEnum` — kept as `varchar` so new picker groups
  can be added without migration. Closed enum at the app layer via TypeScript
  `PickerGroup` union in `02-app/lib/types/content-types.ts`.
- `platformType` and `formatType` likewise kept as `varchar` — channel taxonomy
  evolves; DB stays permissive (mirrors the DNA-07b decision for `dna_platforms`).
- `subtype` is the most specific cascade target. ToV resolver order: `subtype`
  match → `formatType` match → fallback per channel-taxonomy.md rules.
- `topicBarEnabled = false` + empty `strategyFields` is a valid (if rare)
  configuration — the type generates from raw context only (e.g. a daily
  reflection prompt). No V1 seed uses this shape.
- The legacy CSV's `numshots` column maps to `defaultVariantCount`.
- The legacy CSV's `prerequisites` column (15 distinct slug values) maps to the
  new shape per the migration table in
  `00-project-management/sessions/2026-04-27-out02-phase1-foundations-h4r.md`.
  Documented in full at `04-documentation/reference/prerequisite-vocabulary.md`
  (to be created when V1 seeds land — Phase 1 task list).
- 95 legacy content types audited. Phase 1 seeds the 5 V1 types (TBD which 5);
  full back-port lands during Phase 3.
