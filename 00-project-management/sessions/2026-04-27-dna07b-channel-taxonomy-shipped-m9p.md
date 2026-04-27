# Session log — 2026-04-27 — DNA-07b channel taxonomy shipped
Session ID: 2026-04-27-dna07b-channel-taxonomy-shipped-m9p

## What we worked on

- DNA-07b — channel / ToV / content-type taxonomy consolidation. End-to-end ship: brief → layout → schema-to-db → db-migrate → implementation → smoke test → close-out.
- DNA-07c — created as a planned follow-up backlog entry for dropping the deprecated `platform_type` column.
- OUT-02 brief + architecture doc — updated to point at the new channel taxonomy reference doc + the new `prerequisites` shape, so the next OUT-02 pickup has clear inputs.
- Tangential improvement (caught during smoke test): `SelectField` molecule now renders option labels instead of raw values in its trigger — system-wide UX upgrade with no breaking changes.

Continuation of `2026-04-27-out02-phase1-foundations-h4r` (which filed DNA-07b as a new backlog entry mid-session and paused OUT-02 Phase 1 on the `prerequisites` vocabulary gap). DNA-07b became this session's whole job.

## What was done

### Documentation & decision-making

- **Brief** at `01-design/briefs/DNA-07b-channel-taxonomy.md` — approved 2026-04-27. Captures the three-level model (`category` → `channel` → `format`), validation rules, change-of-category behaviour, deprecation timeline for `platform_type`, UI scope, prompt updates, graph implications, explicit out-of-scope list.
- **Reference** at `04-documentation/reference/channel-taxonomy.md` — new authoritative vocabulary doc. 8 categories (`owned_real_estate`, `owned_content`, `social`, `paid`, `earned`, `in_person`, `relationships`, `other`), ~50 channel keys scoped per category, 13 format buckets with ~40 canonical subtypes, ToV cascade fallback rules, lead-magnet `kind` vocabulary (~25 values), `content_types.prerequisites` shape, per-category field-relevance matrix, maintenance rules. Drawn from the `Social channels checklist.xlsx` audit + the existing `dna_platforms` field set.
- **Schema doc deltas:**
  - `01-design/schemas/dna-platforms.md` — `category` + `channel` columns added; `platformType` flagged deprecated; per-category field relevance table.
  - `01-design/schemas/dna-tone-of-voice.md` — `format_type` vocabulary on samples + applications aligned to new bucket vocabulary; `subtype` repositioned as canonical leaf.
  - `01-design/schemas/dna-lead-magnets.md` — `kind` enum expanded to ~25 values (full canonical set); note added explaining lead magnets are not channels.
- **Layout** at `01-design/wireframes/DNA-07b-layout.md` — delta from `dna-plural-item-template`. Cards page becomes category-grouped (canonical order, empty categories omitted). Detail view: stacked badges + `categoryHasField()` driven conditional rendering + "Change category / channel" inline modal. Create modal identity step reworked: 4×2 category card grid → reveal channel/name/handle inline once a category is chosen. Two existing molecules extended (`TypeBadge` 1..8, `ItemSwitcher` `getGroup`); two new DS-02 tag tokens (`#84D2D6` cool teal, `#D68497` dusty rose). One new molecule (`ChangeCategoryChannelModal`).

### Database

- **Migration `0022_channel_taxonomy.sql`** — generated via `drizzle-kit generate`, hand-edited to do nullable-then-backfill-then-NOT-NULL flow + ToV vocabulary updates in one atomic transaction. Applied via Neon MCP `run_sql_transaction`.
  - `dna_platforms`: `platform_type` made nullable; `category` + `channel` added (NOT NULL after backfill).
  - 2 Atomic Lounge rows backfilled to `category='owned_content', channel='blog'`.
  - 6 `dna_tov_samples` rows: `format_type` `social` → `social_short`.
  - 1 `dna_tov_applications` row: same.
  - `dna_tov_samples.format_type = 'spoken'` → `'spoken_audio'` defensive update (no rows matched but harmless).
  - `__drizzle_migrations` updated with hash `3aaaac06…448e0b56d`.
- `dna_lead_magnets` table doesn't exist yet (DNA-08 parked) — vocabulary alignment is doc-only until DNA-08 builds the table. Confirmed.

### Application code

- **TypeScript source-of-truth** at `02-app/lib/types/channels.ts` — `Category`, `Channel`, `CATEGORY_LABELS`, `CATEGORY_DESCRIPTIONS`, `CATEGORY_HUES`, `CHANNEL_LABELS`, `CHANNELS_BY_CATEGORY`, `categoryHasField()`, `categoryHasIdeasTab()`, `categoryHasFormatsTab()`, `postingFrequencyLabel()`, `engagementApproachLabel()`, `validateCategoryChannelPair()`. Mirrors the channel-taxonomy reference doc (doc-first convention).
- **Drizzle schema** `02-app/lib/db/schema/dna/platforms.ts` — `category` + `channel` columns added; `platformType` made nullable + marked `@deprecated`.
- **Types** `02-app/lib/types/platforms.ts` — `Platform`, `PlatformSummary`, `CreatePlatformInput` extended with `category` + `channel`; `PlatformType` retained as deprecated.
- **Queries** `02-app/lib/db/queries/platforms.ts` — `listPlatforms` / `listAllPlatforms` select `category` + `channel` instead of `platformType`.
- **Server actions** `02-app/app/actions/platforms.ts` — `createPlatform` validates `(category, channel)` pair via `validateCategoryChannelPair`; new `updatePlatformCategoryAndChannel` action for the change modal.
- **API route** `02-app/app/api/generate/platform/route.ts` — `evaluate` + `generate` endpoints validate + persist `category` + `channel`.
- **Generation prompt** `02-app/lib/llm/prompts/platform.ts` — input shape changed (`platformType` → `category` + `channel`); user-message text now says "Channel" throughout.
- **Generation pipeline** `02-app/lib/generation/platform.ts` — context-builder updated to map `category` + `channel` instead of `platformType`.
- **Design system tokens** `02-app/app/globals.css` — `--color-tag-7: #84D2D6`, `--color-tag-8: #D68497`, plus `--tag-7` / `--tag-8` raw values.
- **Molecule extensions:**
  - `02-app/components/type-badge.tsx` — `TagHue` widened `1..6` → `1..8`; `hueClass` map extended.
  - `02-app/components/item-switcher.tsx` — added optional `getGroup` + `getGroupLabel` props; renders `SelectGroup` blocks when `getGroup` passed.
- **New molecule** `02-app/components/change-category-channel-modal.tsx` — composes `Modal` + `SelectField` + `Button`. Two scoped selects (channel options re-populate when category changes), warning copy when category differs, atomic save via `updatePlatformCategoryAndChannel`.
- **Reworked modal** `02-app/components/create-platform-modal.tsx` — identity step shows 4×2 category card grid; channel select + name + handle revealed inline once a category is chosen. Auto-fills name from `CHANNEL_LABELS[channel]`. All vocabulary swapped to "channel".
- **Cards page** `02-app/app/(dashboard)/dna/platforms/cards/page.tsx` — category-grouped grid in canonical category order; empty categories omitted; `CATEGORY_HUES` per badge; optional secondary channel pill when channel name doesn't match card name.
- **Detail view** `02-app/app/(dashboard)/dna/platforms/[id]/platform-detail-view.tsx` — stacked category + channel badges (with `Change category / channel` link); conditional field hiding via `categoryHasField()`; conditional tab visibility via `categoryHasIdeasTab()` / `categoryHasFormatsTab()`; per-category labels (`postingFrequency` → "Cadence" for non-publishing categories, `engagementApproach` → "Follow-up approach" for `relationships`); `doNotDo` field moved from Constraints to Performance tab so it stays visible across all categories; ItemSwitcher uses `getGroup` for category-grouped dropdown; vocabulary swap throughout.
- **Cards button** `02-app/app/(dashboard)/dna/platforms/create-platform-button.tsx` — "New platform" → "New channel".
- **Empty-state page** `02-app/app/(dashboard)/dna/platforms/page.tsx` — "Platforms" → "Channels", empty-state copy updated.
- **Sidebar nav** `02-app/lib/nav-config.ts:94` — title "Platforms" → "Channels" (route `/dna/platforms` unchanged).
- **Archive modal** `02-app/components/archive-platform-modal.tsx` — copy swap "platform" → "channel".

### Tangential UX improvement (system-wide)

- **`SelectField` label rendering** `02-app/components/select-field.tsx` — was rendering raw `value` strings in the trigger (e.g. "engagement", "owned_content"); now uses `SelectValue`'s render-prop API to look up `options.find(o => o.value === v).label`. Pre-existing system-wide bug surfaced by the new ChangeCategoryChannelModal smoke test (where it was painfully visible). Fix benefits every existing consumer (e.g. customer journey stage on platforms detail view now shows "Engagement" instead of "engagement"). No breaking change — pure improvement.

### Registry + design system spec

- **Registry** `02-app/components/registry.ts` — added `ChangeCategoryChannelModal`; updated `CreatePlatformModal`, `TypeBadge`, `ItemSwitcher` descriptions and prop signatures.
- **Design system spec** `01-design/design-system.md` — Tag tokens table grew 6 → 8 rows; `TypeBadge` spec hue range updated; `ItemSwitcher` spec gains `getGroup` + `getGroupLabel` props; new `ChangeCategoryChannelModal` spec block; `CreatePlatformModal` spec rewritten for the new flow.

### OUT-02 cross-references

So the next OUT-02 pickup has all the inputs it needs:

- **OUT-02 brief** `01-design/briefs/OUT-02-content-creator-single-step.md` — header `Related:` line now points at `04-documentation/reference/channel-taxonomy.md`. `content_types` section in the data model summary expanded with the canonical vocabulary, the `prerequisites` shape (`{ channels, lead_magnets, dna }`), and the picker-lock query pattern.
- **Architecture doc** `01-design/content-creation-architecture.md` — Part 1 `prerequisites` line + Part 6 `content_types` schema rewritten to draw from the channel-taxonomy doc; Part 7 worked example (`sales-page-aida`) updated to use the new `prerequisites` jsonb shape and channel-key vocabulary; explicit note that `content_types.category` (picker display category) is *not* the same concept as `dna_platforms.category` (channel taxonomy category) — distinct concept, same word. Don't conflate.
- **Backlog OUT-02 entry** updated: status note flipped from "Phase 1 paused 2026-04-27 pending DNA-07b" to "Phase 1 unblocked 2026-04-27"; `Reference:` line added; `Note:` updated with explicit next-pickup directive (finish `content_types` schema using the new `prerequisites` shape).

### Backlog

- **DNA-07b** moved to `done — closed 2026-04-27` with full implementation summary (brief, layout, reference, migration, all UI surfaces, design-system changes).
- **DNA-07c** added as a new `planned` entry — drop the deprecated `platform_type` column once DNA-07b has baked. Intentionally not bundled into DNA-07b (additive vs destructive separation; rollback-safety).

## Decisions made

- **Three-level taxonomy:** `category` → `channel` → `format (format_type + subtype)`. Each level answers a different question. Closed enums with explicit `other` escape hatch.
- **8 categories** (drawn from `Social channels checklist.xlsx` audit): `owned_real_estate`, `owned_content`, `social`, `paid`, `earned`, `in_person`, `relationships`, `other`. Replaces the old `platform_type` 6-bucket taxonomy.
- **`dna_platforms` table name kept** — not renamed `dna_channels`. Column-driven semantics give us everything needed; the table-name/concept gap is an accepted cost. Re-evaluable once cold-outreach experience surfaces real-world friction.
- **Lead magnets are a separate dimension**, not channels. `dna_lead_magnets.kind` aligned in the same vocabulary pass; ToV does not depend on lead magnet kind. UI build still parked under DNA-08.
- **App-layer validation** for `(category, channel)` pairs. DB stays permissive (no enum constraint) for forward-compat. TypeScript `validateCategoryChannelPair` is the single check at write time.
- **Switching category after creation:** allowed (with warning, no data loss). Same for cross-category channel switches.
- **Channel uniqueness within a brand:** *not* enforced — multiple LinkedIn presences (personal + company) allowed. Names disambiguate.
- **`platform_type` column:** kept nullable for DNA-07b. Drop scheduled in DNA-07c follow-up — separation of additive from destructive change for rollback-safety.
- **Sidebar nav label:** renamed "Platforms" → "Channels". Route stays `/dna/platforms`.
- **DS-02 palette extended** with two new tag tokens: `#84D2D6` (cool teal — `relationships`) and `#D68497` (dusty rose — `other`). Backwards-compatible.
- **`SelectField` label rendering:** treated as a tangential improvement worth shipping in this session rather than splitting into a separate ticket. Pure improvement, no behavioural surprises.
- **DNA-07b implementation followed the prescribed gates:** feature-brief (already implicitly done — schema docs + taxonomy doc covered the brief surface area, then a brief was written explicitly to satisfy the gate) → layout-design (delta on existing template; no new patterns; the molecule composition section identified the two extensions and one new molecule before any code was written) → schema-to-db (Drizzle file + hand-edited SQL with backfill) → db-migrate → feature-build (this session). Smoke test caught two missed copy strings; both fixed before close-out.

## What's next

- **OUT-02 Phase 1 resume:** `content_types` schema doc + Drizzle build + migration. The `prerequisites` shape and channel-key vocabulary are now fully specified. Next pickup can use `02-app/lib/types/channels.ts` directly. Brief + architecture doc both reference `channel-taxonomy.md`.
- **DNA-07c:** drop `platform_type` column. Defer until DNA-07b has baked through real usage (likely after the cold-outreach channel is set up, since that's the first non-`owned_content` row).
- **Cold outreach proof-of-life:** the `relationships` category was specifically designed to handle non-publishing channels honestly. First real-world test is queued for Ellie's near-term cold outreach work.
- **Optional minor cleanups not blocking anything:**
  - `lib/platform-type-hues.ts` — legacy file, no longer referenced after this session. Safe to delete; leaving for now.
  - Backfill `_platformId` unused warning in `queries/platforms.ts` — pre-existing, untouched.
- **Not picked up this session:** the Boil-the-Lake / proactive / telemetry onboarding prompts surfaced by the gstack browse skill. Skipped because they were optional onboarding noise during a focused implementation session — pick up another time if interested.

## Files touched

### Documentation
- `01-design/briefs/DNA-07b-channel-taxonomy.md` (new)
- `01-design/briefs/OUT-02-content-creator-single-step.md` (updated header + content_types description)
- `01-design/content-creation-architecture.md` (updated `prerequisites` line + `content_types` section + worked example)
- `01-design/design-system.md` (Tag tokens table, TypeBadge spec, ItemSwitcher spec, CreatePlatformModal spec, new ChangeCategoryChannelModal spec)
- `01-design/schemas/dna-platforms.md`
- `01-design/schemas/dna-tone-of-voice.md`
- `01-design/schemas/dna-lead-magnets.md`
- `01-design/wireframes/DNA-07b-layout.md` (new)
- `04-documentation/reference/channel-taxonomy.md` (new)
- `00-project-management/backlog.md` (DNA-07b → done; DNA-07c → planned; OUT-02 unblocked)

### Database
- `02-app/lib/db/schema/dna/platforms.ts`
- `02-app/lib/db/migrations/0022_channel_taxonomy.sql` (new)
- `02-app/lib/db/migrations/meta/0022_snapshot.json` (new, generated)
- `02-app/lib/db/migrations/meta/_journal.json` (updated, generated)

### Application
- `02-app/app/globals.css`
- `02-app/lib/nav-config.ts`
- `02-app/lib/types/channels.ts` (new)
- `02-app/lib/types/platforms.ts`
- `02-app/lib/types/generation.ts`
- `02-app/lib/db/queries/platforms.ts`
- `02-app/lib/llm/prompts/platform.ts`
- `02-app/lib/generation/platform.ts`
- `02-app/app/actions/platforms.ts`
- `02-app/app/api/generate/platform/route.ts`
- `02-app/app/(dashboard)/dna/platforms/page.tsx`
- `02-app/app/(dashboard)/dna/platforms/cards/page.tsx`
- `02-app/app/(dashboard)/dna/platforms/create-platform-button.tsx`
- `02-app/app/(dashboard)/dna/platforms/[id]/platform-detail-view.tsx`
- `02-app/components/registry.ts`
- `02-app/components/type-badge.tsx`
- `02-app/components/item-switcher.tsx`
- `02-app/components/select-field.tsx` (tangential UX fix)
- `02-app/components/create-platform-modal.tsx`
- `02-app/components/archive-platform-modal.tsx`
- `02-app/components/change-category-channel-modal.tsx` (new)

## Checks

- ✅ `npx tsc --noEmit` — clean (only pre-existing unrelated `Trash2` import error in `knowledge-asset-detail-view`, unchanged)
- ✅ `npm run lint` — no new errors in any file touched this session (88 pre-existing errors are all in `lib/llm/tools`, `lib/retrieval`, `middleware.ts`, `scripts/`)
- ✅ `npm run check:design-system` — warnings only, none from DNA-07b. New `ChangeCategoryChannelModal` registry entry resolves to its spec anchor cleanly.
- ✅ Browser smoke test — all 5 surfaces verified: cards page (category-grouped, "Channels" title, dusty-blue badges), detail view (stacked badges, "Change category / channel" link, all tabs visible), Change modal (labels rendering correctly post SelectField fix), Create modal (4×2 category grid → click Social → progressive reveal of channel select → pick LinkedIn → name auto-fills), sidebar nav ("Channels" highlighted under DNA group).

DNA-07b done.
