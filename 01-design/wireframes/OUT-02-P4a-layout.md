# OUT-02-P4a Layout — Content Creator UI Shell

Feature ID: OUT-02-P4a
Status: approved
Last updated: 2026-04-30
Brief: `01-design/briefs/OUT-02-P4a-content-creator-ui-shell.md` (approved 2026-04-30)
Pattern: **new** — establishes two reusable patterns (`launch-picker-grid` and `creator-workspace-three-region`) for templates registry on approval.

## Template-check result

Ran against `01-design/wireframes/templates/`:
- `dna-plural-item-template` — no fit (CRUD list+detail, not a launch picker)
- `project-workspace-template` — no fit (workspace shell)
- `tab-master-detail-template` — no fit (tabs, not three-region)
- `tab-table-expand-template` — no fit

Two new patterns established here:
1. **`launch-picker-grid`** — filterable card grid where each card is a launchpad to a workspace (picker for content types, future: skill picker, mission picker, etc.)
2. **`creator-workspace-three-region`** — fixed-viewport workspace with left-rail input stack + right-pane output + sticky footer action (content creator, future: any param-driven generation surface)

Both will be templatised in Step F if approved.

---

## Views needed

| View | Purpose | Trigger |
|---|---|---|
| **Picker** | Browse + filter content types, launch one | Sidebar "Create" → `/content` |
| **Generation surface** | Fill Strategy + Topic Engine + Settings, press Generate, inspect assembled prompt | Click an unlocked card from picker → `/content/create/[slug]` |
| **Topic-clear confirm modal** | Confirm cascade-clear when free-text augment exists below the changed step | Backtrack a topic-engine step that has a non-empty free-text below it |

No detail view, no edit modal, no archive flow in 4a — these aren't CRUD surfaces.

---

## Navigation and routing

**Sidebar entry:** existing `Create` link in `nav-config.ts` currently goes to `/content/create`. Repoint it to `/content` (picker first). The `/content/create` index becomes a redirect to `/content` for back-compat.

**App Router paths:**
- `/content` → picker (server-rendered card grid + client-side filter shell)
- `/content/create/[slug]` → generation surface
- `/content/create` → server redirect to `/content`

No deep-linkable runs in 4a (the run id is held in client state only — once the user generates, the assembled prompt renders in the right pane but is not preserved on refresh). 4b adds `/content/create/[slug]?run=[runId]` for resume / regenerate flows.

**Back navigation:**
- Picker → no back, this is a top-level page
- Generation surface → "Switch content type" link in page chrome → `/content`. Browser back also works.

---

## Picker view (`/content`)

### Layout

```
┌───────────────────────────────────────────────────────────────────┐
│  PageChrome: title "Create content" subtitle "Pick a content      │
│              type to start. Filters narrow what's shown."         │
│  PageChrome action: ⌕ search input (right-aligned, 240px)         │
├───────────────────────────────────────────────────────────────────┤
│  ContentPane (full-bleed within dashboard):                       │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │ PickerFilterBar:                                            │  │
│  │   Category: [Social] [Email] [Long form] [Brainstorm] …     │  │
│  │   Channel:  [Instagram] [LinkedIn] [Newsletter] [Blog] …    │  │
│  │   ★ Favourites only  •  Clear all                           │  │
│  ├─────────────────────────────────────────────────────────────┤  │
│  │  3-col grid (2-col on medium, 1-col on small):              │  │
│  │  ┌───────────┐ ┌───────────┐ ┌───────────┐                  │  │
│  │  │ ★ icon    │ │ ★ icon    │ │   icon 🔒 │  ← locked        │  │
│  │  │ Title     │ │ Title     │ │ Title     │                  │  │
│  │  │ desc…     │ │ desc…     │ │ desc…     │                  │  │
│  │  │ [cat][ch] │ │ [cat][ch] │ │ [cat][ch] │                  │  │
│  │  │           │ │           │ │ Needs an  │                  │  │
│  │  │           │ │           │ │ Offer     │                  │  │
│  │  │           │ │           │ │ + Add →   │                  │  │
│  │  └───────────┘ └───────────┘ └───────────┘                  │  │
│  └─────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

### Card composition (`ContentTypeCard` molecule)

Each card:
- **Header row:** favourite star (left, toggle), Lucide icon (centre, 32px from `content_types.icon` string), spacer, lock icon (right, only if locked)
- **Title:** `content_types.name` — `font-medium text-base`
- **Description:** `content_types.description` — `text-sm text-muted-foreground`, max 2 lines (line-clamp)
- **Footer row:** `TypeBadge` for category (hue from category), `TypeBadge` for channel (hue from `CATEGORY_HUES` of channel.category)
- **Locked variant:** dimmed (`opacity-60`), no hover-elevation, footer replaced by:
  - Lock-message line: `Needs ${prereqLabel}` (e.g. "Needs an Offer", "Needs a Newsletter channel")
  - "+ Add" affordance — clickable to the relevant DNA page (uses `MissingPrereqDeeplink` molecule)

Whole card is clickable when unlocked → navigates to `/content/create/[slug]`. Lock affordance prevents the card-click navigation when locked.

### Filter behaviour

- **All-of intersection** — selecting Category=Social AND Channel=Instagram shows only content types matching both
- **Multi-select within a filter group** — selecting Social + Email shows content types matching either category (within-group is union; across-group is intersection)
- **Search** — substring match on `name` (case-insensitive), runs over the same array as filters; combines additively
- **Favourites toggle** — restricts to content types in `brand_content_type_favourites` for the current brand
- **"Clear all"** — wipes all filters + search

State strategy: filters live in URL query params (`?cat=social,email&ch=instagram&fav=1&q=hook`) so reload preserves and back-button works. Picker page is a Server Component that reads search params, fetches the array of `content_types`, renders `<PickerClient initialItems={...} />` which hosts FilterBar + grid as a client component.

### Empty states

- **No content types match filters:** centered `EmptyState` molecule. Title "No content types match these filters." Description "Try removing a filter or clearing search." Action button "Clear filters" wired to `?` (no params).
- **All cards locked:** banner above the grid (still shows the locked cards underneath) — "Most content types need DNA pieces to unlock. Start by adding an Offer or Channel."
- **Favourites-only with no favourites:** `EmptyState` — "No favourites yet. Star a content type from the picker to find it here later." Action: "Show all content types" (clears the favourites toggle).

### Loading state

Server-rendered initial load = no skeleton (data is in HTML). Client-side filter changes are synchronous (filtering pre-loaded array) — no skeleton needed.

If `useTransition` is used for URL-state updates, render a faint top progress bar (existing pattern? — TBD; if not, skip and ship snappy).

### Error state

Server query failure → standard error.tsx page (existing dashboard pattern).

---

## Generation surface (`/content/create/[slug]`)

### Layout

```
┌───────────────────────────────────────────────────────────────────────┐
│  PageChrome:                                                          │
│    title (icon + name)              [Switch content type ↗]           │
│    subtitle (description)                                             │
├───────────────────────────────────────────────────────────────────────┤
│  ContentPane padding={false} — fixed-viewport working area:           │
│  ┌─────────────────────────┬───────────────────────────────────────┐  │
│  │ LEFT RAIL (380px)       │ RIGHT PANE (flex-1)                   │  │
│  │ ┌─────────────────────┐ │                                       │  │
│  │ │ Strategy (Section-  │ │  Empty state until Generate pressed:  │  │
│  │ │ Card, content-      │ │                                       │  │
│  │ │ sized, scrolls if   │ │    [icon centred]                     │  │
│  │ │ overflows)          │ │    "Fill the panels, then press       │  │
│  │ │                     │ │     Generate to see the assembled     │  │
│  │ │ Strategy fields…    │ │     prompt."                          │  │
│  │ └─────────────────────┘ │                                       │  │
│  │ ┌─────────────────────┐ │  After Generate → loader → assembled  │  │
│  │ │ Topic Engine        │ │  prompt rendered in <pre> with        │  │
│  │ │ (SectionCard,       │ │  monospace + small toolbar:           │  │
│  │ │ flex-1 — fills      │ │    [Copy] [Run id: 0193…ab]           │  │
│  │ │ remaining vertical, │ │                                       │  │
│  │ │ scrolls internally) │ │  On error → red error banner with     │  │
│  │ │                     │ │  message + "Try again" hint.          │  │
│  │ │ Cascade steps…      │ │                                       │  │
│  │ └─────────────────────┘ │                                       │  │
│  │ ┌─────────────────────┐ │                                       │  │
│  │ │ Settings strip      │ │                                       │  │
│  │ │ (inline, no card,   │ │                                       │  │
│  │ │ horizontal compact) │ │                                       │  │
│  │ │ Model • I/we • ToV  │ │                                       │  │
│  │ │ • Variants          │ │                                       │  │
│  │ └─────────────────────┘ │                                       │  │
│  │ ┌─────────────────────┐ │                                       │  │
│  │ │ [  Generate  ]      │ │                                       │  │
│  │ │ (sticky bottom of   │ │                                       │  │
│  │ │ left rail, full-    │ │                                       │  │
│  │ │ width primary)      │ │                                       │  │
│  │ └─────────────────────┘ │                                       │  │
│  └─────────────────────────┴───────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

**Sizing rules:**
- Outer ContentPane is `flex flex-col h-full overflow-hidden` (no internal scroll on the pane — children handle scroll)
- Left rail: `w-[380px] shrink-0 flex flex-col gap-3 p-4 border-r overflow-hidden`
- Strategy block: `shrink-0` content-sized (max-height clamp at ~280px with internal scroll if many fields)
- Topic Engine block: `flex-1 min-h-0 overflow-auto` — takes the remaining vertical
- Settings strip: `shrink-0` — single horizontal row of compact controls
- Generate button: `shrink-0 mt-auto` after the strip, OR fixed at the bottom of the left rail with a top border (decided in build — the simpler `mt-auto` after the four blocks works)
- Right pane: `flex-1 min-h-0 overflow-auto p-6`

The 380px left-rail width derives from: Strategy needs ≥ 320px for two-column field rows (audience + journey-stage on IG caption); Topic Engine cascade selects need ≥ 300px to feel un-cramped. 380 gives 16px gap on either side of 348px max-width Selects/Comboboxes.

### Block 1 — Strategy panel

`SectionCard` (title "Content strategy", icon target).

Renders fields declared in `content_types.strategy_fields` jsonb via the `StrategyField` molecule (declarative widget registry).

- **Field layout:** stacked vertical, one field per row. (Two-column grid would be tight at 380px rail width with the SectionCard padding; vertical is more legible.)
- **Field labels:** label above input (matches `SelectField` / existing pattern)
- **Required asterisk:** `*` after label, semantic muted-red `text-destructive`
- **Pre-fill from query params:** `useSearchParams()` reads `?audience_id=X&offer_id=Y&...` and pre-fills before user interaction. No visual indication of pre-fill (it just looks normal-filled).

### Block 2 — Topic Engine

`SectionCard` (title "The Infinite Prompt Engine", icon infinity).

**Hidden** if `content_types.topic_context_config.uses_topic_engine !== true` — the SectionCard does not render at all and Topic Engine block is not in the DOM. Strategy + Settings + Generate compose into a shorter rail in this case.

**When visible:**

```
┌────────────────────────────────────────────┐
│ ∞ The Infinite Prompt Engine               │
├────────────────────────────────────────────┤
│ What do you want to talk about? *          │
│ ┌────────────────────────────────────────┐ │
│ │ My audience                          ▾ │ │  ← step 1 (always visible)
│ └────────────────────────────────────────┘ │
│                                            │
│ Choose the sub-category *                  │
│ ┌────────────────────────────────────────┐ │
│ │ Pain points                          ▾ │ │  ← step 2 (revealed after step 1)
│ └────────────────────────────────────────┘ │
│                                            │
│ Pick the segment *                         │
│ ┌────────────────────────────────────────┐ │
│ │ Microagency Mike                     ▾ │ │  ← step 3 (entity)
│ └────────────────────────────────────────┘ │
│                                            │
│ Finally, add your topic *                  │
│ ☑ Our current processes don't allow…       │  ← step 4 (multi-select items)
│ ☑ I can't focus on high-level…             │
│ ☐ Lack of streamlined system…              │
│                                            │
│ + Add a note for this selection            │  ← leaf-augment toggle
│ (revealed: <textarea> 3-line)              │
└────────────────────────────────────────────┘
```

**Per-step behaviour:**
- **Step 1 (categories):** Single-select. Categories with no data are dimmed; click → does nothing for the select (cursor disabled), but a small "+ Add ${category}" affordance below the dropdown becomes visible (uses `MissingPrereqDeeplink`).
- **Step 2..N-1 (sub-categories / aspects / entities):** Single-select. `listChildren()` returns the options. Same dimmed+deeplink pattern when a sub-cascade has no data.
- **Step N (item-surfacing leaf):** if `topicPaths.allow_multi_select` → checkbox list; else single-select dropdown. Multi-select uses `MultiSelect` atom-wrapper (new molecule needed — see Molecule composition).
- **Free-text category:** at step 1, "Free text" is always present. Selecting it skips steps 2-N entirely; renders a single textarea ("What do you want to write about?").
- **Leaf-augment "+ Add note":** small button below the leaf selector. Click reveals a 3-line textarea with placeholder "Optional context for this generation…". Toggle button becomes "− Remove note" when expanded.

**Cascade-clear on backtrack:**
- Changing step N → silently clears all step >N selections + free-text augment, refetches options at step N+1
- Exception: if the leaf-augment textarea has non-empty content, show **topic-clear confirm modal** before clearing
- Modal copy: "Change this selection?" / "You've added a note for the current selection. Changing this step will clear it." / [Keep selection] [Change & clear note]

### Block 3 — Settings strip

**Not** a SectionCard. Inline lighter strip. Single row of four compact controls separated by vertical divider lines:

```
┌────────────────────────────────────────────┐
│ Model: [Claude Sonnet 4.6 ▾]  │ I/we:      │
│ [Default ▾]  │ Tone: [Default ▾]  │        │
│ Variants: [— 5 +]                          │
└────────────────────────────────────────────┘
```

(Wraps to a second line at 380px rail width — preferred to horizontal scroll.)

- Background: `bg-muted/40 rounded-md px-3 py-2`
- Labels: `text-xs uppercase tracking-wide text-muted-foreground`
- Controls: `SelectField` (compact variant — see open question below) for Model, I/we, Tone; `Stepper` for Variants
- No SectionCard chrome — it's a row of inline controls, not a content block

**Compact `SelectField`:** the current `SelectField` molecule may render too tall for this strip. Layout decision: use `SelectField` as-is for V1 (label-above pattern) — wraps cleanly on the strip. If visual feedback says it's too heavy, add a `compact` prop to `SelectField` in a follow-up.

### Generate button

- **Position:** below the Settings strip, full-width, primary variant of `ActionButton`
- **Disabled** until validation passes. Validation rules:
  - All required Strategy fields filled (per `strategy_fields[].required`)
  - If topic engine enabled: cascade resolved to leaf OR free-text supplied
  - If topic engine disabled: always-valid w.r.t. cascade
- **Disabled hover state:** tooltip "Fill all required fields to generate" (existing pattern from save-on-blur tooltips)
- **Loading state:** spinner + "Assembling prompt…" text. Also disables.
- **On success:** right pane updates to render the assembled prompt; button returns to default state.
- **On error:** right pane shows error banner; button returns to default state. User can edit and retry.

### Right pane states

| State | Trigger | Visual |
|---|---|---|
| Empty | Initial load, before Generate | Centered `EmptyState` molecule — icon (sparkles), title "Ready when you are.", description "Fill the panels on the left, then press Generate." |
| Loading | Generate clicked, awaiting `/api/content/runs/assemble` response | Centered spinner + "Assembling prompt…" text |
| Success | Response with assembled prompt | Toolbar (top-right): Copy button + run-id pill (`text-xs text-muted-foreground`). Below: `<pre>` with the prompt text, monospace, `whitespace-pre-wrap break-words`, max-width readable. |
| Error | Response 4xx/5xx or `assemble()` throws | Red banner: title "Couldn't assemble the prompt.", body the error message, action "Edit inputs and try again" (no functionality — it's just a hint; user edits left rail). |

**This is a debug surface** — explicitly noted in the brief. The toolbar gets replaced by variant cards in 4b, so don't over-polish the prompt rendering.

---

## Topic-clear confirm modal

`Modal` (size sm), header "Change this step?", body single paragraph, footer two buttons.

```
┌──────────────────────────────────────────────┐
│ Change this step?                       [✕]  │
├──────────────────────────────────────────────┤
│ You've added a note for the current          │
│ selection. Changing this step will clear     │
│ both your selection below it and the note    │
│ you wrote.                                   │
├──────────────────────────────────────────────┤
│                  [Keep current] [Change & clear] │
└──────────────────────────────────────────────┘
```

Standard `Modal` (`size="sm"`, `footer` slot). On confirm → cascade-clear proceeds. On cancel → revert the upper-step change to its previous value.

---

## Empty states (consolidated)

| Surface | State | Copy + action |
|---|---|---|
| Picker grid | No content types match filters | "No content types match these filters." / [Clear filters] |
| Picker grid | Favourites toggle on, no favourites | "No favourites yet. Star a content type to find it here later." / [Show all] |
| Picker grid | All locked | Banner above grid: "Most content types need DNA pieces. Start with an Offer or Channel." |
| Topic Engine step | Category has no data | Inline below the step's Select: "+ Add a ${category}" → deeplink |
| Topic Engine cascade | Resolves but data is empty (e.g. segment has no VOCs) | Selectable; on selection, inline warning under the leaf: "This ${entity} has no ${aspect} yet. + Add some →" |
| Right pane | Pre-Generate | "Ready when you are." (described above) |

All copy goes to Ellie for review at build time — collected as a punchlist during step 5 of the build.

---

## Loading and error states

**Picker:**
- Server-rendered first paint = no skeleton
- Filter changes = synchronous client filtering, no loading state
- Favourite-toggle = optimistic update (star fills immediately, server reconciles)

**Generation surface:**
- Page load: no skeleton — server-renders the empty shell with content_types row already fetched
- Strategy/Topic Engine field option fetches: per-field skeleton on the Combobox/Select while loading. Existing `Skeleton` atom.
- Generate click: button → loading state; right pane → loading state; on response, both flip to result/error simultaneously.

**Errors:**
- Server query fails on picker: dashboard error.tsx pattern
- Field option-loader fails on generation surface: inline error in the field dropdown ("Couldn't load options. Retry") with retry button
- Assemble fails: red banner in right pane (described above)

---

## Mobile considerations

Desktop-first. The generation surface explicitly assumes ≥ 1024px viewport — at < 1024px it becomes unusable (left rail collides with right pane). Use `ScreenSizeGate` to show a "BigBrain content creator works best on a wider screen — try a desktop or tablet in landscape" message at narrow widths.

The picker is responsive: 3-col → 2-col → 1-col grid down to ~480px. Filter bar wraps fluidly.

---

## Molecule composition

### Existing molecules used
- `PageChrome` (registry: `components/page-chrome.tsx`, spec: design-system.md § PageChrome) — picker title + search action; generation surface title + switch link
- `ContentPane` (registry: `components/content-pane.tsx`, spec: § ContentPane) — generation surface working area with `padding={false}`
- `SectionCard` (registry: `components/section-card.tsx`, spec: § SectionCard) — Strategy + Topic Engine blocks
- `TypeBadge` (registry: `components/type-badge.tsx`, spec: § TypeBadge) — category + channel badges on cards
- `EmptyState` (registry: `components/empty-state.tsx`, spec: § EmptyState) — picker + right-pane empty states
- `Modal` (registry: `components/modal.tsx`, spec: § Modal) — topic-clear confirm modal
- `ActionButton` (registry: `components/action-button.tsx`, spec: § ActionButton) — Generate button
- `IconButton` (registry: `components/icon-button.tsx`, spec: § IconButton) — favourite-star toggle, copy-to-clipboard on prompt inspector
- `SelectField` (registry: `components/select-field.tsx`, spec: § SelectField) — Strategy single-value selects + Settings controls
- `Stepper` — *not yet found in registry — see "Atoms used directly" below*
- `FilterPillGroup` (registry: `components/filter-pill-group.tsx`, spec: § FilterPillGroup) — single-select filter chip groups (used for "Sort by"-style controls if added later); **NOT used for category/channel filters in 4a since those need multi-select** (see new molecules)
- `FilterPill` (registry: `components/filter-pill.tsx`, spec: § FilterPill) — used by the new `MultiFilterPillGroup` internally

### Existing molecules used but unspecced *(known gap — DS-03)*
None for this feature. All molecules consumed by 4a are specced in `design-system.md`.

### New molecules required

- **`ContentTypeCard`** — picker tile for one content type. Spec sketch:
  - Props: `{ contentType: ContentType; isFavourite: boolean; isLocked: boolean; missingPrereq?: string; missingPrereqHref?: string; onToggleFavourite: (id: string) => void }`
  - Visual: rounded-lg border bg-card p-4, hover shadow-sm + border-foreground/20 (unlocked); `opacity-60` + no hover (locked). Lucide icon top-centre 32px. Favourite star top-left (`IconButton`, filled-yellow when `isFavourite`). Lock icon top-right (only locked). Title `font-medium`. Description `text-sm text-muted-foreground line-clamp-2`. Footer row: 2× `TypeBadge` (category, channel). When locked: footer replaced by `MissingPrereqDeeplink`.
  - Replaces: net-new (DNA-03 cards page hand-rolls similar markup; OUT-02-P4a is the first to make a reusable card molecule)

- **`PickerFilterBar`** — top filter row of the picker. Spec sketch:
  - Props: `{ categories: FilterOption[]; channels: FilterOption[]; activeCategories: string[]; activeChannels: string[]; favouritesOnly: boolean; onCategoriesChange: (vals: string[]) => void; onChannelsChange: (vals: string[]) => void; onFavouritesChange: (val: boolean) => void; onClearAll: () => void }`
  - Visual: vertical stack of `MultiFilterPillGroup`s (Category / Channel) + a `FilterPill` (single, toggle-style) for "★ Favourites only" + a small `Clear all` text button on the right. `border-b pb-4 mb-6`.
  - Replaces: net-new

- **`MultiFilterPillGroup`** — multi-select state container for `FilterPill`. Promised by `FilterPillGroup` spec ("multi-select is a future `MultiFilterPillGroup`"). Spec sketch:
  - Props: `{ label?: string; values: string[]; onChange: (values: string[]) => void; options: FilterPillOption[] }`
  - Visual: same row layout as `FilterPillGroup` (label + pills row). Each pill's `active` is computed from `values.includes(option.value)`. Click toggles inclusion in `values`.
  - Replaces: future-promised molecule that's now needed

- **`StrategyField`** — declarative widget registry for one strategy field. Spec sketch:
  - Props: `{ field: StrategyFieldDef; value: unknown; onChange: (value: unknown) => void; brandId: string }` where `StrategyFieldDef = { id: StrategyFieldId; type: 'audience_id' | 'offer_id' | 'asset_id' | 'platform_id' | 'customer_journey_stage' | 'text_short' | 'text_long'; label: string; required: boolean; placeholder?: string }`
  - Visual: switches on `field.type`. Uses `SelectField` for `*_id` types (with async option-loader by type) and `customer_journey_stage` (fixed enum). Uses `Input` atom (wrapped) for `text_short`. Uses `Textarea` atom (wrapped) for `text_long`.
  - Replaces: net-new — absorbs what would otherwise be a switch in the page component

- **`TopicCascadeStep`** — single step in the topic engine cascade. Spec sketch:
  - Props: `{ stepIndex: number; label: string; required: boolean; allowMultiSelect: boolean; options: TopicNode[]; selectedKeys: string[]; onChange: (keys: string[]) => void; missingPrereqLabel?: string; missingPrereqHref?: string }`
  - Visual: stacked label + control. Single-select → `SelectField`. Multi-select → vertical checkbox list with `Checkbox` atoms wrapped in row layouts. When `missingPrereqLabel` set: dim the control (`opacity-60`), show inline `+ Add ${label}` link below.
  - Replaces: net-new

- **`TopicCascade`** — orchestrates 1..N `TopicCascadeStep`s. Spec sketch:
  - Props: `{ contentTypeId: string; brandId: string; value: TopicCascadeState; onChange: (state: TopicCascadeState) => void }` where `TopicCascadeState = { selections: Record<number, string[]>; freeTextAugment?: string; freeTextOnly?: string }`
  - Visual: vertical stack of revealed steps (step N+1 only renders once step N has a selection). Below the leaf, the "+ Add a note" toggle + textarea.
  - Behaviour: owns the state machine — calls `listCategories` / `listChildren` server actions, gates step reveal, fires the topic-clear confirm modal when free-text below exists on backtrack.
  - Replaces: net-new

- **`MissingPrereqDeeplink`** — "+ Add ${label}" link styled for inline use under cards / cascade steps. Spec sketch:
  - Props: `{ label: string; href: string }`
  - Visual: small text link, `text-xs font-medium text-primary hover:underline inline-flex items-center gap-1`. Leading `+` glyph, trailing `→` arrow.
  - Replaces: net-new (current dna-pages have ad-hoc `<Link>` patterns for similar)

- **`LockBadge`** — tiny "Needs an X" pill shown on locked content-type cards. Spec sketch:
  - Props: `{ label: string }` (e.g. "Needs an Offer")
  - Visual: `inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground`. Lock icon 12px leading.
  - Replaces: net-new

- **`AssembledPromptInspector`** — right-pane prompt viewer. Spec sketch:
  - Props: `{ runId: string; assembledPrompt: string }`
  - Visual: top toolbar (`Copy` IconButton + run-id pill `text-xs text-muted-foreground font-mono`). Below: `<pre className="whitespace-pre-wrap break-words text-sm font-mono leading-relaxed">`. Container scrolls within the right pane.
  - Replaces: net-new — and explicitly **debug-grade**, gets replaced by variant cards in 4b. Building it as a molecule (not inline) makes the 4b swap cleaner.

### Atoms used directly *(should be empty — flag any here)*

- `Stepper` for variant count. **There is no `Stepper` molecule registered.** Two options:
  - **Option A:** Use the `Input type="number"` atom directly with `min`/`max` from `content_types.default_variant_count` bounds. Justifies as "one-off use; no other place needs a number stepper" — but this is borderline (likely to recur in 4b for batch counts, and elsewhere).
  - **Option B (recommended):** Build a small `NumberStepper` molecule now (`{ value, onChange, min, max, step }` → renders − value + buttons). Spec it in design-system.md. Used here, ready for 4b.
  - **Layout-design recommendation: Option B.** Adds one tiny molecule but avoids a direct atom use and pre-builds for 4b reuse.

- `Input` (text) and `Textarea` for `text_short` / `text_long` Strategy fields. Wrapped inside `StrategyField` molecule, so atom imports happen inside the molecule — that's the design-system rule satisfied (organisms compose molecules; the molecule wraps the atom).

- `Checkbox` for multi-select Topic Engine items. Wrapped inside `TopicCascadeStep` — same story.

- `Combobox`-style searchable select for `audience_id` / `offer_id` / `asset_id` / `platform_id`. **No `Combobox` atom or molecule exists** — `SelectField` is dropdown-only. For lists that may grow long (knowledge assets in particular), an unsearchable Select gets unwieldy.
  - **Layout-design decision:** use `SelectField` (existing) for V1. None of the 4a content types have > 20 entities to choose from. If/when an entity list grows past a usable limit, build a `SearchableSelect` molecule then.

---

## Decisions locked in this layout phase

| Decision | Locked answer |
|---|---|
| Picker route | `/content` |
| Generation surface route | `/content/create/[slug]` |
| Sidebar `Create` link | Repointed from `/content/create` to `/content` |
| Picker filter chips | All-of intersection across groups; multi-select within each group |
| Picker filter behaviour molecule | New `MultiFilterPillGroup` (promised by FilterPillGroup spec; now built) |
| Filter state location | URL query params (`?cat=…&ch=…&fav=1&q=…`) |
| Picker rendering | Server Component for initial fetch; client-side filtering over loaded array |
| Card molecule | New `ContentTypeCard` |
| Locked-card affordance | Dimmed card + `LockBadge` + `MissingPrereqDeeplink` (no card-click navigation) |
| Generation surface layout | Three-region: 380px left rail (Strategy + Topic Engine + Settings strip + Generate) + flex-1 right pane |
| Strategy panel | `SectionCard` titled "Content strategy", vertical-stacked fields via `StrategyField` molecule |
| Topic Engine panel | `SectionCard` titled "The Infinite Prompt Engine", progressive-disclosure cascade via new `TopicCascade` + `TopicCascadeStep` |
| Settings strip | Inline lighter strip (no SectionCard), background `bg-muted/40`, single row of compact controls |
| Generate button | Full-width primary `ActionButton`, sticky at bottom of left rail (via `mt-auto`) |
| Right-pane V1 content | New `AssembledPromptInspector` molecule (debug-grade, gets replaced in 4b) |
| Topic-clear confirm | `Modal size="sm"` only when free-text augment exists below the changed step |
| Variant count control | New `NumberStepper` molecule (built in 4a, reused in 4b) |
| Searchable selects | Not yet — `SelectField` is fine for V1; `SearchableSelect` becomes a future molecule when entity lists grow |
| ScreenSizeGate threshold | 1024px on the generation surface only; picker is responsive |

---

## Backlog items to add

- **DS-NN: `MultiFilterPillGroup` molecule** — spec + register. Foreshadowed in `FilterPillGroup` spec; OUT-02-P4a is the first consumer.
- **DS-NN: `NumberStepper` molecule** — spec + register. Used by Settings panel variant count; reused in 4b.
- **DS-NN: `SearchableSelect` molecule (planned)** — placeholder backlog entry. Not built in 4a; flagged when entity-pickers (offers/assets/platforms) start to feel cramped in `SelectField`. Tracks the future need.

(Specific DS-NN ids assigned during build when `design-system` Mode A runs to spec the new molecules.)

---

## Self-improvement notes (Step G)

- **Brief gap surfaced:** the brief did not state what the right-pane content actually looks like in 4a — only that it's "the assembled prompt as a read-only inspector view." Layout phase had to specify monospace, `<pre>`, copy button, run-id pill. Future briefs that defer to "debug surface" should still note the readout's information density and any inline actions needed. Propose adding an "Output / readout state" sub-question to the `feature-brief` questionnaire when output is part of the feature.
- **Layout spec gap:** the spec template doesn't explicitly call for keyboard interaction notes. For a creator workspace, "Cmd+Enter to generate" is a common expectation — flagging here as a future spec-template addition. Not blocking 4a.
- **Self-improvement defer:** propose to the user after layout approval, not now.

---

## Approval

Approved 2026-04-30. Notes from the approval round:

- Settings strip stays inline as drafted; if it looks unbalanced against the two SectionCards above it during build, promote to a standard `SectionCard` (titled "AI / language settings", icon sparkle) — Ellie pre-approved that escalation path.
- `SearchableSelect` deferred — `SelectField` is fine until an entity-picker visibly cramps.
- All 10 new molecules to be specced via `design-system` Mode A as a build-plan input.
