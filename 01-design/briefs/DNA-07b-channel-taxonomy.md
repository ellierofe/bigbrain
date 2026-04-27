# Channel Taxonomy Consolidation Brief
Feature ID: DNA-07b
Status: approved
Last updated: 2026-04-27
Related: DNA-07 (Platforms — done), DNA-09 (ToV — done), DNA-08 (Lead magnets — parked, vocab aligned here), OUT-02 (Content creator — Phase 1 paused on this), `04-documentation/reference/channel-taxonomy.md` (authoritative vocabulary), `01-design/schemas/dna-platforms.md`, `01-design/schemas/dna-tone-of-voice.md`, `01-design/schemas/dna-lead-magnets.md`

## Summary

Replace the four overlapping format taxonomies (`dna_platforms.platform_type`, `dna_tov_samples.format_type`, `dna_tov_applications.format_type`, incoming `content_types.platform_type`/`format_type`) with a canonical three-level model: **`category` → `channel` → `format (format_type + subtype)`**. The model spans every kind of channel (publishing platforms, paid, earned, in-person, relational), unblocks OUT-02 Phase 1's prerequisite checks, and aligns lead-magnet vocabulary in the same pass.

## Use cases

This is a data-model consolidation, so use cases are framed in terms of the *system* surfaces that consume the new taxonomy.

- **OUT-02 picker locks (primary, blocking).** `content_types.prerequisites.channels: ["podcast"]` evaluates to "do any `dna_platforms` rows exist with `channel = 'podcast'` AND `is_active = true`?" Without `channel`, this query can't be expressed truthfully.
- **OUT-02 picker locks for lead magnets.** `content_types.prerequisites.lead_magnets: ["webinar"]` evaluates against `dna_lead_magnets.kind`. Same pattern, separate dimension.
- **OUT-02 Topic Engine — "Channel" category.** Step 2 of the cascade lists `dna_platforms` rows; step 3 surfaces aspects per channel. The Topic Engine sentence template references `${channel_name}` not `${platform_name}`.
- **ToV cascade at generation time.** Sample/application matching uses `format_type` (cascade bucket) → `subtype` (canonical leaf), with documented cross-bucket fallbacks.
- **DNA-07 cards UI.** Cards page groups channels by `category` instead of `platform_type`. Hue/icon defaults are per-category.
- **DNA-07 detail view.** Per-category field relevance: hides fields that don't apply to a row's category (e.g. no `contentFormats` on a `relationships` row).
- **DNA-07 creation modal.** User picks `category` first, then `channel` (scoped to that category), then continues to existing flow.
- **Cold outreach (near-term real-world test).** Ellie is about to add a `cold_outreach` channel under the `relationships` category. This is the proof-of-life test that the model handles non-publishing channels honestly.

## User journey

User-facing flows that change visibly:

### Adding a channel (was "Adding a platform")
1. User clicks "Add channel" on `/dna/platforms`
2. Modal: pick **category** (8 options grouped visually, with descriptions)
3. Modal: pick **channel** (closed list scoped to selected category, with `other` as escape)
4. Modal: name (defaulted from channel choice, editable), handle/URL (optional), primary objective (optional), audience (optional), source documents (existing path)
5. Existing two-path generation flow continues unchanged — generation prompt uses `category` + `channel` instead of `platformType`

### Browsing channels (was "Browsing platforms")
1. User opens `/dna/platforms`
2. Cards are grouped by `category` (was grouped by medium-ish `platform_type`)
3. Each card shows category hue/badge + channel name + primary objective preview
4. Click → existing detail view with per-category field hiding applied

### Editing a channel
1. User opens detail view
2. Fields that don't apply to the row's category are hidden (e.g. `contentFormats` not shown on a `cold_outreach` row)
3. Switching `category` after creation: **allowed**, but: surfaces a warning ("hidden fields will become visible / current data may not apply"), requires explicit confirm. Data is not destroyed.
4. Switching `channel` within the same category: free. Switching `channel` across categories: equivalent to switching category — same warning.

## Data model / fields

### `dna_platforms` — column changes

| Field | Change | Type | Constraints |
|---|---|---|---|
| `category` | **NEW** | `varchar(50)` | `NOT NULL` |
| `channel` | **NEW** | `varchar(50)` | `NOT NULL` |
| `platformType` | **DEPRECATED** | `varchar(50)` | Becomes `NULL`able; do not read in new code |

Vocabulary is fully specified in [`04-documentation/reference/channel-taxonomy.md`](../../04-documentation/reference/channel-taxonomy.md).

### `dna_tov_samples` — vocabulary alignment only (no column changes)

`format_type` values migrate from `social | email | sales | blog | spoken | other` to the new vocabulary (`social_short | social_visual | blog | newsletter | email | sales | spoken_audio | spoken_video | ad_copy | event | outreach | brainstorm | other`). `subtype` continues as canonical leaf — preferred match in cascade when present. Existing 14 sample rows backfilled.

### `dna_tov_applications` — vocabulary alignment only (no column changes)

Same as samples. Existing 1 application row backfilled.

### `dna_lead_magnets` — vocabulary alignment only (no column changes)

`kind` enum expands from 9 values to ~25 values (full canonical set in taxonomy doc). No live data — table is empty.

### Validation rules

- **`category` and `channel` consistency:** validated **at the application layer**, not the database layer. Reasoning: enum constraints in Postgres are painful to evolve, and the canonical mapping is documented in the taxonomy doc + a single TypeScript source-of-truth. App-layer validation rejects invalid `(category, channel)` pairs at write time. The DB stays permissive for forward-compat.
- **Source of truth for the `(category, channel)` mapping:** a TypeScript constant in `02-app/lib/types/channels.ts` (new file). The taxonomy reference doc and this constant must stay in sync — convention is doc-first, code mirrors.
- **`other`:** allowed in both `category` and `channel`. Discouraged via UI copy.
- **Channel uniqueness within a brand:** **not enforced.** A user might run two LinkedIn presences (personal + company). They get two rows. Names disambiguate.

## Update behaviour

- **`category` and `channel`:** freely editable (with the cross-category warning described above).
- **`platformType`:** never re-written by app code post-migration. Drop in DNA-07c (separate, follow-up backlog item).
- **`dna_tov_samples.formatType` / `dna_tov_applications.formatType`:** freely editable per existing DNA-09 update flow. Migration backfills existing rows; future writes use the new vocabulary.
- **`dna_lead_magnets.kind`:** freely editable per existing DNA-08 (parked) plan.

## Relationships

### Knowledge graph (FalkorDB)

No graph changes. Per ADR-002, `dna_platforms` is Postgres-native — no graph node, no relationships. The `ContentItem.platform` graph property (per ADR-002 section 4) is a free-text label, not a FK; consider aligning it to `channel` values when REG-01 wires it up, but that's REG-01's call, not in DNA-07b scope.

### Postgres

- `dna_platforms.category`, `dna_platforms.channel` — new columns. No new FKs.
- `content_types.prerequisites` (incoming via OUT-02) — jsonb shape becomes `{ channels: string[], lead_magnets: string[], dna: string[] }`. Picker queries reference `dna_platforms.channel` and `dna_lead_magnets.kind`.
- `dna_tov_samples.format_type`, `dna_tov_applications.format_type` — values change, columns unchanged.
- `dna_lead_magnets.kind` — values change, column unchanged.

## UI/UX notes

**Template match:** `dna-plural-item` (DNA-07 is already an instance — DNA-07b is a delta-rework, not a new instance).

**Layout spec:** `01-design/wireframes/DNA-07b-layout.md` (approved 2026-04-27).

Surfaces affected:

- `/dna/platforms/cards` — replace single grid with category-grouped grid (canonical order, empty categories omitted, count badge per section).
- `/dna/platforms/[id]` detail view — left panel gets stacked category badge + channel pill + "Change category / channel" link; per-category field hiding via `categoryHasField()`; tabs hide when all sections within them are hidden.
- `/dna/platforms/[id]` `ItemSwitcher` — extended with optional `getGroup` prop to render category-grouped dropdown (backwards-compatible).
- `CreatePlatformModal` — "Identity" step reworked (still one step): category cards on top, channel select + name + handle revealed inline once a category is picked. Net step count unchanged.
- New "Change category / channel" inline modal (composes `Modal` + `SelectField` — no new molecule).
- Sidebar nav (`nav-config.ts:94`): label "Platforms" → "Channels".
- Vocabulary swap (user-visible strings only) across PageHeader titles, modal step titles, toasts, generation prompts. Routes, component names, table name kept.

**Design-system changes:**
- DS-02 tag tokens extended from 6 to 8: new `--color-tag-7: #84D2D6` (cool teal — `relationships`) and `--color-tag-8: #D68497` (dusty rose — `other`).
- `TypeBadge` hue prop widens to `1..8`. Spec block + token table in `01-design/design-system.md` updated.
- `ItemSwitcher` gains optional `getGroup` prop. Spec block updated.

**No new molecules required.** The category card grid in the create modal is one-off inline UI; the "Change category / channel" modal composes existing molecules; category-grouped switcher is an extension, not a new molecule.

## Edge cases

- **Empty state on `/dna/platforms`:** unchanged — existing empty state copy works (just s/platform/channel).
- **Row with `category` but no `channel`:** prevented by DB `NOT NULL`.
- **Mismatched `(category, channel)`:** rejected at app layer (write-time validation). Not a runtime risk for normal flows.
- **Backfill failure for a row with unrecognised `platform_type`:** the 2 live rows are both `owned_content` → `category='owned_content', channel='blog'` (Atomic Lounge is a blog). Migration is deterministic.
- **ToV sample with unrecognised `format_type` post-migration:** the 14 live samples are `social` (→ `social_short`, subtype already `linkedin_post`) and `blog` (→ `blog`, subtype already `entertainment_blog`). Migration is deterministic.
- **`other` proliferation:** UI copy discourages it. Soft signal — review periodically.
- **Future channel additions (e.g. Bluesky, new social network):** add a row to the taxonomy doc, add to the TypeScript source of truth, ship. No schema migration.
- **Generation prompts referencing `platformType`:** updated to use `category` + `channel`. Existing 2 platform rows have content that was generated against the old prompt — no need to regenerate.

## Out of scope

- **Renaming `dna_platforms` → `dna_channels` (table + route + nav).** Deferred. Column-driven semantics are sufficient. Re-evaluate post-cold-outreach experience.
- **Dropping the `platformType` column.** Stays as nullable until a follow-up DNA-07c (or rolled into a future cleanup pass).
- **`dna_lead_magnets` UI build.** DNA-08 stays parked. Only the `kind` enum vocabulary moves here.
- **`content_types` schema build.** Continues under OUT-02 once this lands.
- **Tonal tag editing UI on samples/applications.** Still deferred per DNA-09 closure note.
- **Sequence templates / partner CRM data / event venue fields on `dna_platforms`.** Real needs that `relationships` and `in_person` channels will surface — not pre-built. Add nullable columns later when concrete.
- **Filtering channels in the cards grid by category.** Useful, but not a v1 requirement; cards grouped visually is enough until row count grows.

## Open questions / TBDs

None blocking. All resolved 2026-04-27 — see decisions log.

## Decisions log

- 2026-04-27 — Three-level model approved: `category` → `channel` → `format (format_type + subtype)`. (Conversation, this session.)
- 2026-04-27 — Eight categories adopted: `owned_real_estate`, `owned_content`, `social`, `paid`, `earned`, `in_person`, `relationships`, `other`. Drawn from the `Social channels checklist.xlsx` audit. (Conversation, this session.)
- 2026-04-27 — Closed enums at all levels with explicit `other` escape hatch. Maintain order over flexibility. (Conversation, this session.)
- 2026-04-27 — `dna_platforms` table name kept (not renamed `dna_channels`). Column-driven semantics. Cold outreach is the real-world test for the model. (Conversation, this session.)
- 2026-04-27 — Lead magnets are a separate dimension (not channels). `dna_lead_magnets.kind` aligned in the same pass. ToV does not depend on lead magnet kind. (Conversation, this session.)
- 2026-04-27 — Validation of `(category, channel)` is app-layer, not DB-layer. (This brief.)
- 2026-04-27 — `platformType` deprecated, kept nullable; drop deferred to a separate follow-up. (This brief.)
- 2026-04-27 — No graph (FalkorDB) changes. Per ADR-002, `dna_platforms` is Postgres-native. (This brief.)
- 2026-04-27 — Sidebar nav label renamed "Platforms" → "Channels". Route stays `/dna/platforms`.
- 2026-04-27 — `CATEGORY_HUES` palette extended with two new hues: `#84D2D6` (cool teal) and `#D68497` (dusty rose). Combined with the existing 6, that's 8 hues — one per category. Mapping confirmed in `layout-design`.
- 2026-04-27 — Switching `category` after creation is allowed (with warning, no data loss). Same for cross-category `channel` switches.
- 2026-04-27 — Channel uniqueness *not* enforced within a brand. Multiple rows on the same channel allowed (e.g. personal + company LinkedIn). Names disambiguate.
- 2026-04-27 — ToV vocabulary backfill folded into the same migration as `dna_platforms` column changes. One atomic migration.
- 2026-04-27 — Brief approved 2026-04-27.
