# Layout: DNA-07b Channel Taxonomy
Status: approved
Last updated: 2026-04-27
Supersedes (where conflicting): `01-design/wireframes/DNA-07-layout.md`. The DNA-07 layout's structural template adaptation still applies; DNA-07b changes vocabulary, adds category grouping, adds conditional field hiding, and extends two molecules.

## Template

`dna-plural-item` (template at `01-design/wireframes/templates/dna-plural-item-template.md`, established from DNA-03). DNA-07b is a *rework of an existing instance*, not a new instance — the structural shell is unchanged from DNA-07.

---

## What's identical to DNA-07

- Routing model (`/dna/platforms`, `/dna/platforms/[id]`, `/dna/platforms/cards`) — **route stays** per brief decision
- Two-column detail layout (left sticky panel + tabbed content pane)
- 5-tab structure (Strategy / Formats & Output / Ideas / Performance / Related Content)
- Autosave on blur, 500ms debounce
- Card grid responsive shape (3-col / 2-col / 1-col)
- Archive flow + dependency check
- Creation modal pattern (path → sources → identity → strategy → followups → generate)
- Draft/active model + `ItemSwitcher` in PageChrome subheader slot
- All existing DNA-07 molecules (`InlineField`, `SelectField`, `ExpandableCardList`, `StringListEditor`, `KeyValueEditor`, `TypeBadge`, `ItemSwitcher`, `Modal`, `ArchivePlatformModal`, `CreatePlatformModal`, etc.)

---

## Delta from DNA-07

### 1. Vocabulary swap (user-visible strings only)

User-facing labels change from "Platform" to "Channel". Routes, table name, component file/identifier names stay (`CreatePlatformModal`, `dna_platforms`, `/dna/platforms`) per brief decision (column-driven semantics, table name kept).

| Surface | Before | After |
|---|---|---|
| Sidebar nav (`nav-config.ts:94`) | `title: 'Platforms'` | `title: 'Channels'` |
| PageHeader title (cards page + detail page) | "Platforms" | "Channels" |
| Cards page subtitle | "Your channel strategies at a glance." | unchanged |
| Cards empty-state heading | "No platforms yet" | "No channels yet" |
| Cards empty-state description | "Add your first platform…" | "Add your first channel to define how your brand shows up." |
| `ItemSwitcher` `label` prop | `"Platform"` | `"Channel"` |
| Create modal step titles | "New platform" / "New platform — Identity" / etc. | "New channel" / "New channel — Identity" / etc. |
| Create modal toast | "Platform strategy created…" | "Channel strategy created…" |
| Archive modal copy | "Archive this platform?" + body | "Archive this channel?" + body |
| Generation prompts (`lib/llm/prompts/platform.ts`) | `## Platform to Generate` etc. | `## Channel to Generate` etc. |

---

### 2. Cards page — category-grouped grid

Replace the single 3-col grid with a sequence of category sections. Each section is the existing card grid scoped to one category.

```
PageHeader: Channels  [Detail view] [+ New channel]
"Your channel strategies at a glance."

────────────────────────────────────────────────────────────────────
OWNED CONTENT · 1
[card]

────────────────────────────────────────────────────────────────────
RELATIONSHIPS · 1
[card]

(empty categories not rendered)

[ Show inactive ]
```

**Section rules:**
- Categories rendered in canonical order: `owned_real_estate`, `owned_content`, `social`, `paid`, `earned`, `in_person`, `relationships`, `other`.
- Empty categories (no rows) are **omitted** entirely — avoid 8 mostly-empty sections at start.
- Section header: small uppercase muted label + count badge. `text-[10px] font-semibold uppercase tracking-wide text-muted-foreground`.
- Faint section divider: `border-t border-border/40` between sections.
- "Show inactive" toggle: stays at the bottom; affects all sections (current behaviour).

**Card body:**
- `TypeBadge` hue → per-**category** (was per-`platform_type`). Uses new `CATEGORY_HUES` (1..8).
- Badge label → human-readable category name (e.g. "Owned Content", "Social", "Relationships", "Other").
- Optional secondary neutral pill below the badge showing channel name (e.g. "LinkedIn", "Cold outreach"), shown only when card name (`name` field) doesn't obviously imply the channel. Style: `bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px]`.
- Card name (bold) + primary objective (2-line clamp): unchanged.
- Active/inactive indicator: unchanged.

---

### 3. Detail view — left panel + conditional fields

**Left panel changes:**
- Replace single Platform-type `TypeBadge` with **two stacked badges**:
  1. Category badge (size `sm`, hue from `CATEGORY_HUES`).
  2. Channel pill — small neutral pill below, read-only display of `channel` (`bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px]`).
- Below the pills: small text link "Change category / channel". Opens the change modal (see §6).
- Other left-panel fields (`name`, `handle`, `isActive` switch, `primaryObjective` textarea): unchanged.

**Conditional field hiding (driven by `categoryHasField()` lookup):**

| Field | Hidden when category is |
|---|---|
| `contentFormats` (Formats & Output → Content formats) | `relationships`, `in_person`, `earned`, `owned_real_estate` |
| `characterLimits` (Formats & Output → Constraints) | `relationships`, `in_person`, `earned`, `owned_real_estate`, `paid` |
| `hashtagStrategy` (Strategy → Engagement) | every category except `social` (was: hidden for `audio/video/owned_content`) |
| `subtopicIdeas` (Ideas tab — section) | `relationships`, `paid`, `owned_real_estate`, `other` |
| `structureAndFeatures.signatureFeatures` + `.brandedComponents` (Formats & Output → Structure & features) | `relationships`, `paid`, `earned` |
| `contentPillarThemes` (Ideas tab — section) | `relationships`, `paid`, `earned`, `in_person` |

Always shown for every category: `name`, `handle`, `isActive`, `primaryObjective`, `audience`, `contentStrategy`, `postingFrequency`, `growthFunction`, `engagementApproach`, `customerJourneyStage`, `analyticsGoals`, `performanceSummary`, `doNotDo`, `usp`, `notes`.

**Per-category cosmetic label tweaks** (same column, different label string at render time):
- `postingFrequency` label → "Cadence" when category ∈ `{relationships, in_person, earned, paid}`. Placeholder example also changes ("e.g. 5 outreach messages per week" / "e.g. one quarterly hosted event").
- `engagementApproach` label → "Follow-up approach" when category = `relationships`.

**Tab visibility:**
- "Ideas" tab is hidden entirely if both `subtopicIdeas` and `contentPillarThemes` are hidden for the row's category.
- "Formats & Output" tab is hidden if all three of its sections (`contentFormats`, `characterLimits`, `structureAndFeatures`) would be hidden.
- Strategy, Performance, Related Content tabs always shown.

---

### 4. Item switcher — grouped by category

`ItemSwitcher` extends to support optional grouping. Active items are grouped under category labels in the dropdown.

```
[ CHANNEL ▾ ]  Cold outreach
└─ dropdown:
     OWNED CONTENT
       Atomic Lounge
     RELATIONSHIPS
       Cold outreach
     SOCIAL
       LinkedIn (personal)
       LinkedIn (NicelyPut)
```

Implementation note: shadcn `Select` already supports `SelectGroup` + `SelectLabel`. Backwards-compatible — when `getGroup` not passed, renders flat list as today.

---

### 5. Create modal — category-first (single step)

Existing "Identity" step is replaced. **Net step count stays at 5** (path → sources → identity → strategy → followup/generate, plus generating/error states).

| Step | Status | Purpose |
|---|---|---|
| 1. Path | unchanged | "source docs" vs "questions" |
| 2. Sources | unchanged | (only when source docs path) |
| **3. Identity** | **REWORKED** | Category cards on top → reveal channel select + name + handle below once a category is picked. One step. |
| 4. Strategy context | unchanged | primary objective + audience |
| 5. Follow-up / generate | unchanged | LLM evaluation + generation |

**Step 3 visual — progressive reveal within one step:**

```
┌──────────────────────────────────────────────────────────────────┐
│ New channel — Identity                                            │
│                                                                    │
│ What kind of channel is this?                                      │
│                                                                    │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                       │
│ │ Owned  │ │ Owned  │ │ Social │ │  Paid  │                       │
│ │  real  │ │content │ │        │ │        │                       │
│ │ estate │ │        │ │LinkedIn│ │  Ads,  │                       │
│ │Website,│ │ Blog,  │ │  IG,   │ │sponsor-│                       │
│ │ sales, │ │podcast,│ │ X, …   │ │ ships  │                       │
│ │ news … │ │YouTube │ │        │ │        │                       │
│ └────────┘ └────────┘ └────────┘ └────────┘                       │
│ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                       │
│ │ Earned │ │In-pers.│ │Relat'-│ │ Other  │                       │
│ │  …     │ │  …     │ │ships  │ │        │                       │
│ └────────┘ └────────┘ └────────┘ └────────┘                       │
│                                                                    │
│ ─── (revealed once a category is selected) ───                    │
│                                                                    │
│ Channel *                                                          │
│ [SelectField — closed list scoped to selected category ▾]         │
│                                                                    │
│ Channel name *                                                     │
│ [LinkedIn (NicelyPut)              ]   ← defaulted from channel   │
│                                                                    │
│ Handle / URL (optional)                                            │
│ [https://linkedin.com/in/…          ]                             │
│                                                                    │
│ [Back]                                              [Next]         │
└──────────────────────────────────────────────────────────────────┘
```

**Behaviour:**
- Selecting a category card highlights it (primary border + bg) and reveals the bottom block (channel select + name + handle) inline. No auto-advance.
- Re-selecting a different category card resets the channel select and name (warning isn't needed in *create* — nothing to lose). Handle is preserved (it's URL-shaped, often re-used).
- Channel `SelectField` is populated with channels scoped to the selected category. `other` last and visually muted.
- `name` field auto-fills from the selected channel's display label whenever channel changes (e.g. selecting "LinkedIn" → name = "LinkedIn"). User can edit freely.
- Cards visually echo the path-selection step's button style (`flex flex-col items-center gap-2 rounded-lg border-2 p-6`). Selected state: `border-primary` (existing pattern from path step).

**Validation:**
- Cannot proceed past step 3 without `category`, `channel`, and `name`.
- Channel options scoped by selected category (closed list per the taxonomy doc). `other` rendered last and visually muted.

---

### 6. "Change category / channel" inline modal

New inline modal, but **no new molecule** — composes existing `Modal` + `SelectField`.

**Triggered:** "Change category / channel" link in detail view's left panel.

**Form:**
- Category `SelectField` (8 options).
- Channel `SelectField` (scoped to selected category — re-populates if category changes; resets value if current channel becomes invalid).
- Warning callout (only shown when category differs from current): "Changing category may hide some fields and show others. No data will be deleted."
- Save / Cancel buttons.

**Save behaviour:** writes both fields atomically via existing platform server action; revalidates page; closes modal. No data deletion regardless of which fields become hidden — per brief decision.

---

### 7. CATEGORY_HUES palette

| Category | Hue | Index | Value | Source |
|---|---|---|---|---|
| `owned_real_estate` | olive | 6 | `#748B7E` | existing |
| `owned_content` | dusty blue | 1 | `#A1BED6` | existing |
| `social` | dusty lilac | 2 | `#C4A5B7` | existing |
| `paid` | terracotta | 5 | `#CE998B` | existing |
| `earned` | custard | 3 | `#E5E0A3` | existing |
| `in_person` | dusty lavender | 4 | `#A5A8C4` | existing |
| `relationships` | **cool teal** | **7 (new)** | `#84D2D6` | new |
| `other` | **dusty rose** | **8 (new)** | `#D68497` | new |

**Required design-system changes:**
- New CSS tokens in `02-app/app/globals.css`: `--color-tag-7: #84D2D6` and `--color-tag-8: #D68497` (and matching dark-mode entries if applicable — confirm during implementation).
- `TypeBadge` component: hue prop type `1..6` → `1..8`. Switch/template adds `bg-tag-7` and `bg-tag-8` cases.
- `01-design/design-system.md` updates: Tag tokens table → 8 rows. TypeBadge spec block → hue range updated.
- `02-app/components/registry.ts`: TypeBadge `props` description widens accordingly.

This is a **DS-02 token addition**. Backwards-compatible — existing 1–6 callsites (PLATFORM_TYPE_HUES, VOC_MAPPING_HUES, etc.) unaffected.

---

### 8. Empty state

Same `EmptyState` component, copy adjusted. Heading: "No channels yet". Description: "Add your first channel to define how your brand shows up." (existing description was already roughly this — minor copy polish.)

---

## Molecule composition

### Existing molecules used unchanged

- `Modal` (registry: `components/modal.tsx`, spec: design-system.md § Modal) — create + change-category modal shells
- `PageHeader`, `EmptyState`, `PageChrome`, `ContentPane` (registry: respective files) — page chrome
- `InlineField` (registry: `components/inline-field.tsx`) — every editable field in detail view
- `SelectField` (registry: `components/select-field.tsx`) — create modal channel select, change modal both selects, `customerJourneyStage` field
- `ExpandableCardList`, `StringListEditor`, `KeyValueEditor` (registry entries) — JSONB editors (DNA-07 molecules; behaviour unchanged, may be hidden by `categoryHasField`)
- `TabbedPane`, `InPageNav` (registry: respective files) — tab + section nav
- `IconButton`, `ActionButton` (registry: respective files) — header actions
- `StatusBadge` (registry: `components/status-badge.tsx`) — header status badge
- `SourceDocPicker` (registry: `components/source-doc-picker.tsx`) — sources step
- `ArchivePlatformModal` (registry: `components/archive-platform-modal.tsx`) — copy swap only

### Existing molecules extended

- **`TypeBadge`** (registry: `components/type-badge.tsx`, spec: design-system.md § TypeBadge) — `hue` prop type widens from `1..6` to `1..8`. Body adds `bg-tag-7` and `bg-tag-8`. Spec table grows from 6 to 8 rows.
- **`ItemSwitcher`** (registry: `components/item-switcher.tsx`, spec: design-system.md § ItemSwitcher) — adds optional `getGroup?: (item: T) => string` prop. When passed, dropdown options are rendered inside `SelectGroup`/`SelectLabel` blocks grouped by category. Backwards-compatible (no group prop → flat list as today). Spec block updated.
- **`CreatePlatformModal`** (registry: `components/create-platform-modal.tsx`, spec: design-system.md § CreatePlatformModal) — adds Category step (step 3) + Channel step (step 4). Component name and path stay. Registry description + spec text updated.
- **`ArchivePlatformModal`** (registry: `components/archive-platform-modal.tsx`, spec: design-system.md § ArchiveModal) — copy swap only. No prop change.

### New molecules required

**None.** Justification:

1. The category card grid + revealed channel/name/handle block in step 3 of the create modal is one-off inline UI within an existing modal step. If a second feature needs the same progressive-reveal picker shape, promote then.
2. Category-grouped switcher is a backward-compatible extension to `ItemSwitcher`, not a new molecule.
3. The "Change category / channel" inline modal composes existing `Modal` + `SelectField` only.

### Atoms used directly *(should be empty)*

None.

---

## Non-molecule helpers (TypeScript constants — not registry entries)

Live in `02-app/lib/types/channels.ts` (new file, per brief). Single source of truth that mirrors `04-documentation/reference/channel-taxonomy.md`:

- `Category` type (closed enum) and `Channel` type (closed enum)
- `CATEGORY_LABELS`, `CATEGORY_DESCRIPTIONS`, `CATEGORY_HUES` (1..8)
- `CHANNEL_LABELS`, `CHANNELS_BY_CATEGORY` map
- `categoryHasField(category, field)` — single source of truth for conditional rendering
- `validateCategoryChannelPair(category, channel)` — used at write time

---

## Decisions log

- 2026-04-27: Layout delta approved. No new molecules. Two existing molecules extended (`TypeBadge` hue range 1..8, `ItemSwitcher` optional grouping). Two new tag tokens added to DS-02 (`--color-tag-7: #84D2D6`, `--color-tag-8: #D68497`). Cards page becomes category-grouped (sections in canonical order, empty categories omitted). Create modal "Identity" step reworked: category cards on top, channel/name/handle revealed inline below once a category is picked (single step, not split). Detail view adopts conditional field hiding via `categoryHasField()`. "Change category / channel" via separate small modal (deliberate moment with warning copy). Vocabulary swap: "Platforms" → "Channels" in user-visible strings only; routes/table/component-names kept.
