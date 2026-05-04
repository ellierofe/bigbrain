# BigBrain Design System

**Source of truth for all visual and component decisions.**
Last updated: 2026-04-13

> This document governs the design system. Before creating or modifying any shared UI component, read the relevant section here. The `design-system` skill enforces this.

---

## Design principles

1. **Token-only styling** — no hardcoded colour, spacing, or typography values anywhere below organism level. If it's not a token, it doesn't exist.
2. **No appearance classes below molecule level** — organisms compose molecules; they do not re-style them. Tailwind appearance utilities (`bg-*`, `text-*`, `border-*`, `shadow-*`, `p-*`, `m-*`) belong in molecules, not organisms.
3. **Atoms are shadcn/ui** — `components/ui/` is reserved for shadcn base components. Do not add custom components there.
4. **Molecules are the design decisions** — a molecule codifies a visual decision once. If you're making the same spacing or colour choice twice, it should be a molecule.
5. **Registry is always current** — every shared component has an entry in `components/registry.ts`. No exceptions.

---

## Visual benchmark

`04-documentation/reference/legacy_files/index.html` — Moogul legacy reference. Match the level of component discipline: clear zone separation, consistent field treatment, reliable spacing. Not a visual copy — a quality bar.

---

## Brand palette (primitive tokens)

Defined in `app/globals.css` as `:root` CSS variables. Never reference hex values directly in components — always use semantic tokens (below).

| Token | Value | Notes |
|---|---|---|
| `--color-forest-deep` | `#242B27` | Sidebar background |
| `--color-forest-mid` | `#2C3630` | Sidebar accent / elevated dark surface |
| `--color-sage` | `#A5C4B2` | Primary — muted sage green |
| `--color-sage-light` | `#EDF1EF` | Muted fill, secondary button bg |
| `--color-sage-border` | `#DCE2DF` | Borders, input outlines |
| `--color-ink` | `#1A1F1C` | Foreground — near-black with green tint |
| `--color-ink-mid` | `#5C6660` | Muted foreground — labels, captions |
| `--color-field-active` | `#4A8B9C` | Field focus state — warm teal, complementary to sage |
| `--color-paper` | `#F8FAF9` | Background — near-white with green tint |
| `--color-white` | `#FFFFFF` | Card / pane surfaces |

**Sage interactive states** (used in button hover/active — no separate tokens, handled inline):
- Default: `#A5C4B2`
- Hover: `#93B8A2`
- Active: `#82AB93`

---

## Semantic tokens

These are what components use. Primitive tokens power them; semantic tokens provide meaning.

### Colour

| Token | Value | Usage |
|---|---|---|
| `--background` | `#F8FAF9` | Page / dashboard background |
| `--foreground` | `#1A1F1C` | Body text |
| `--card` | `#FFFFFF` | Card / pane backgrounds |
| `--card-foreground` | `#1A1F1C` | Text on cards |
| `--primary` | `#A5C4B2` | Primary actions, active states, focus rings |
| `--primary-foreground` | `#1A1F1C` | Text on primary (dark on sage) |
| `--secondary` | `#EDF1EF` | Secondary button fill, chip backgrounds |
| `--secondary-foreground` | `#1A1F1C` | Text on secondary |
| `--muted` | `#EDF1EF` | Muted backgrounds (hover, subtle fills) |
| `--muted-foreground` | `#5C6660` | De-emphasised text, labels, placeholders |
| `--accent` | `#EDF1EF` | Accent fill (same as muted in this palette) |
| `--accent-foreground` | `#1A1F1C` | Text on accent |
| `--destructive` | `oklch(0.577 0.245 27.325)` | Errors, delete actions |
| `--border` | `#DCE2DF` | Default borders |
| `--input` | `#DCE2DF` | Input borders |
| `--ring` | `#A5C4B2` | Focus ring |
| `--field-active` | `#4A8B9C` | InlineField focus — label, icon, border. Warm teal, complementary to sage. |

### State (DS-02)

Used for status, save feedback, confidence, and warnings. Each state has three roles: standalone foreground colour (`--color-success`), pill background (`-bg`), and pill foreground for filled-pill text contrast (`-foreground`).

| Token | Value | Usage |
|---|---|---|
| `--color-success` | `#047857` | Standalone success text (`text-success`) — "Saved" badges, "done" labels |
| `--color-success-bg` | `#D1FAE5` | Filled success pill background |
| `--color-success-foreground` | `#064E3B` | Text on filled success pill |
| `--color-warning` | `#B45309` | Standalone warning text — long-text caution, low confidence, dedup hints |
| `--color-warning-bg` | `#FEF3C7` | Filled warning pill background — draft, paused |
| `--color-warning-foreground` | `#78350F` | Text on filled warning pill |
| `--color-error` | re-uses `--destructive` | Standalone error text — "Failed", validation |
| `--color-error-bg` | `#FEE2E2` | Filled error pill background — dropped |
| `--color-error-foreground` | `#7F1D1D` | Text on filled error pill |
| `--color-info` | `#1D4ED8` | Standalone info text |
| `--color-info-bg` | `#DBEAFE` | Filled info pill background — in_progress, complete, committed |
| `--color-info-foreground` | `#1E3A8A` | Text on filled info pill |

### Tag (DS-02)

Decorative category differentiation. Single-role backgrounds. Pill text always uses `--foreground` (existing dark text token). Indexed for future-proofing — hue names live in comments, not in token names.

| Token | Hue | Value |
|---|---|---|
| `--color-tag-1` | dusty blue | `#A1BED6` |
| `--color-tag-2` | dusty lilac | `#C4A5B7` |
| `--color-tag-3` | custard | `#E5E0A3` |
| `--color-tag-4` | dusty lavender | `#A5A8C4` |
| `--color-tag-5` | terracotta | `#CE998B` |
| `--color-tag-6` | olive | `#748B7E` |
| `--color-tag-7` | cool teal | `#84D2D6` |
| `--color-tag-8` | dusty rose | `#D68497` |

Per-feature hue mappings (which channel category → which index) live in consumer files (`02-app/lib/voc-mapping-hues.ts`, `02-app/lib/types/channels.ts` `CATEGORY_HUES`, etc.). The molecule (`TypeBadge`) is a rendering primitive and has no opinion on what hue means what.

### Sidebar tokens

| Token | Value |
|---|---|
| `--sidebar` | `#242B27` |
| `--sidebar-foreground` | `#F8FAF9` |
| `--sidebar-primary` | `#A5C4B2` |
| `--sidebar-primary-foreground` | `#1A1F1C` |
| `--sidebar-accent` | `#2C3630` |
| `--sidebar-accent-foreground` | `#F8FAF9` |
| `--sidebar-border` | `#2C3630` |
| `--sidebar-ring` | `#A5C4B2` |

### Elevation (shadow) tokens

| Token | Value | Usage |
|---|---|---|
| `--shadow-pane` | `0 1px 4px rgba(26,31,28,0.08), 0 4px 14px rgba(26,31,28,0.07)` | ContentPane |
| `--shadow-raised` | `0 4px 16px rgba(26,31,28,0.10)` | Dropdowns, toasts |
| `--shadow-overlay` | `0 8px 32px rgba(26,31,28,0.16)` | Modals, sheets |

### Radius tokens

| Token | Computed value |
|---|---|
| `--radius` | `0.625rem` (base — 10px) |
| `--radius-sm` | `~0.375rem` (6px) |
| `--radius-md` | `~0.5rem` (8px) |
| `--radius-lg` | `~0.875rem` (14px) |
| `--radius-xl` | `~1.125rem` (18px) |

---

## Typography

Two fonts. Inter for UI body copy; Outfit for headings and display text.

| Font | Variable | Usage |
|---|---|---|
| **Outfit** | `--font-display` / `font-heading` | All `h1`–`h6`, page titles, card titles, section headings |
| **Inter** | `--font-sans` | Body copy, labels, UI text, captions |
| **JetBrains Mono** | `--font-mono` | Code, token values, monospace contexts |

`h1`–`h6` automatically use `font-heading` (Outfit) via the global base layer. For display text outside heading elements, use `font-display`.

### Type scale

| Role | Font | Weight | Size | Tailwind |
|---|---|---|---|---|
| Page title | Outfit | 700 | 22px | `text-[22px] font-display font-bold tracking-tight` |
| Section heading | Outfit | 600 | 17px | `text-lg font-display font-semibold` |
| Card title | Outfit | 600 | 14px | `text-sm font-display font-semibold` |
| Body | Inter | 400 | 14px | `text-sm` |
| Body small | Inter | 400 | 13px | `text-[13px]` |
| Caption | Inter | 400 | 13px | `text-[13px] text-muted-foreground` |
| Label / meta | Inter | 500 | 11px | `text-xs font-medium uppercase tracking-wide text-muted-foreground` |
| Fine print | Inter | 400 | 11px | `text-[11px] text-muted-foreground` |

---

## Spacing

Tailwind's default spacing scale applies (4px base unit). Component-level spacing decisions are made in molecules, not organisms.

Key conventions:
- **Page content padding:** `p-6` (24px) inside ContentPane
- **Section gap (within a page):** `gap-4` or `gap-6`
- **Field gap (label → input):** `gap-0.5`
- **Icon + label gap:** `gap-1.5`
- **Card internal padding:** `p-6`

---

## Save contract

How edits persist. Every save-bearing molecule consumes this contract — do not invent a new save trigger or feedback signal per surface. Drift here is what DS-06 exists to prevent.

| Surface | Trigger | Feedback on success | Feedback on error |
|---|---|---|---|
| **Text fields** (InlineField input + textarea) | onBlur + 500ms debounce | Inline "Saved" badge in label patch + debounced "Changes saved" toast | Inline "Failed" badge + error toast |
| **Sliders** (SliderField) | onMouseUp / onTouchEnd (commit) | Visible value change + debounced "Changes saved" toast | Error toast |
| **Selects / checkboxes** (SelectField, CheckboxField, InlineCellSelect) | onChange (immediate) | Inline "Saved" badge + debounced toast (where the molecule has a label slot) | Inline "Failed" badge + error toast |
| **Inline list rows** (ListRowField) | onBlur + 500ms debounce | Brief inline "Saved" indicator (right of input or below textarea, fades after 2s) + debounced toast | Inline "Failed" indicator + error toast |
| **Table cells** (VocTable, EntityOutcomesPanel cells) | onBlur + 500ms debounce | Silent on success (cell value is the confirmation; per-cell badges would be visual noise) + debounced "Changes saved" toast at the table level | Error toast |
| **Creation modals** (Create*Modal) | Form submit button | Spinner during async + success toast on close | Error toast; modal stays open |
| **Bulk operations** (ideas-list batch actions) | Explicit button | Toast + optimistic UI; "Undo" affordance where safe | Toast + revert |

**Universal rule:** if you save silently, surface errors loudly. If you confirm success, confirm errors the same way.

### The lib

The save lifecycle is owned by `02-app/lib/save-feedback.ts`:

- `SaveState` — `'idle' | 'saving' | 'saved' | 'error'`
- `debouncedSaveToast()` — singleton 800ms-debounced "Changes saved" toast, shared across the whole app so rapid edits across many fields produce one notification
- `useDebouncedSave({ value, onSave, debounceMs? })` — timer + state machine + savedValueRef + unmount cleanup. Returns `{ state, errorMsg, trigger }`. The consumer keeps its own controlled `localValue`; calls `trigger(localValue)` from its `onBlur`. Short-circuits if value is unchanged.

New form molecules MUST consume from this lib — do not re-implement the timer, the toast debounce, or the state transitions inline. Keystroke-driven controls (text, list rows) use `useDebouncedSave`; commit-driven controls (sliders) call `debouncedSaveToast()` directly after their commit handler.

---

## Component hierarchy

```
Atoms          shadcn/ui components (components/ui/)
               Never add custom components here.

Molecules      Shared custom components (components/)
               Codify visual decisions. Listed in components/registry.ts.
               May use Tailwind appearance classes.

Organisms      Page-level compositions (app/(dashboard)/...)
               Compose molecules. No Tailwind appearance classes.
               No inline visual decisions.
```

---

## Molecule specifications

### PageHeader

**File:** `02-app/components/page-header.tsx`
**Purpose:** Consistent page title bar at the top of every dashboard page. Composes with `PageChrome` for full-page-header layout (PageHeader + sub-header chrome).

**Anatomy:**
- Outer wrapper: flex row, `mb-6` below by default (or `mb-0` when wrapped in `PageChrome` which controls margins itself).
- Title row: optional icon (`h-5 w-5 text-muted-foreground`) + title (`font-display font-bold text-[22px] tracking-tight`).
- Optional subtitle below title (`text-sm text-muted-foreground`).
- Optional `action` slot at the right — typically a flex row of icon buttons (cards-view, +New, Archive, etc.).
- No background of its own — sits in the page column above ContentPane.

**Behavioural states:**
- Stateless — purely presentational.

**Props:**
```ts
interface PageHeaderProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  action?: React.ReactNode
  className?: string
}
```

**Do not:**
- Add a background — title sits on the page background, not in a card.
- Render a sub-header (switcher, tabs) inside PageHeader's action slot — use `PageChrome.subheader` instead.

---

### ContentPane

**File:** `02-app/components/content-pane.tsx`
**Purpose:** The white working area within a dashboard page. Sits below `PageChrome`. Fills remaining vertical space; scrolls internally.

**Anatomy:**
- Outer wrapper: `bg-card rounded-lg shadow-[var(--shadow-pane)] flex-1 min-h-0 overflow-auto w-full`.
- Default padding: `p-6` (controlled via the `padding` prop — pass `padding={false}` for full-bleed layouts that need their own internal padding scheme).

**Behavioural states:**
- Stateless container.

**Props:**
```ts
interface ContentPaneProps {
  children: React.ReactNode
  className?: string
  padding?: boolean    // default true
}
```

**Do not:**
- Wrap PageHeader or page chrome inside ContentPane — chrome lives above.
- Apply additional shadows or borders — ContentPane owns the elevation styling.

---

### InlineField

**File:** `02-app/components/inline-field.tsx`
**Purpose:** Auto-saving inline text input for DNA detail views. Canonical reference molecule — `SelectField` / `SliderField` / `CheckboxField` (DS-04) all match its envelope.

**Anatomy:**
- Outer wrapper: `relative` + `mt-3` when label present.
- Field container: `rounded-md border px-3 pb-2 transition-colors duration-100`. `pt-5` when label present, `pt-2` otherwise.
- Border (idle): `border-border/60`. Hover: `hover:border-border`. Focus: `border-field-active/50 bg-field-active/[0.03]`.
- Label patch: `absolute -top-2 left-2.5 px-1` + parent surface bg (default `bg-card`, override via `labelBg`). Style: `text-[10px] font-semibold capitalize tracking-wide text-muted-foreground`. Transitions to `text-field-active` on focus.
- Icon: `h-3 w-3` left of label, `text-muted-foreground`. Transitions to `text-field-active` on focus. Every field must have an icon (current convention).
- Description (optional): info-icon tooltip beside label.
- Save feedback: `text-success` "Saved" / `text-destructive` "Failed" inline beside label (DS-02 token-driven).
- Inner input: native `<input>` or `<textarea>` (per `variant`), `bg-transparent text-sm focus:outline-none`. Textarea adds `resize-none`.

**Behavioural states:**
- **Idle / hover / focus**: as described above.
- **Saving / Saved / Error**: state machine — saving silent, then "Saved" auto-clears after 2s; "Failed" persists until next change.
- **Disabled**: `opacity-50 cursor-not-allowed` on wrapper; native input also `disabled`. `onSave` not invoked.

**Edge cases:**
- **No label** (empty string): label patch hidden, padding adjusts. Used for unlabelled inline fields (rare).
- **Save error**: inline error message shown inline with label; toast also fires for visibility.

**Props:**
```ts
interface InlineFieldBaseProps {
  value: string | null
  onSave: (value: string) => Promise<{ ok: boolean; error?: string }>
  label: string
  placeholder?: string
  icon?: LucideIcon
  description?: string
  labelBg?: string         // default 'bg-card'
  className?: string
  debounceMs?: number      // default 500
  disabled?: boolean
}
// Plus: variant: 'input' OR variant: 'textarea' (with rows?: number)
```

**Do not:**
- Change the envelope visually — DS-04 form-control molecules match it.
- Save on every keystroke — onBlur + 500ms debounce is the canonical contract.
- Hardcode the "Saved" / "Failed" colours — token-driven via DS-02.

**Save contract:** "Text fields" row of the [Save contract](#save-contract). Internally consumes `useDebouncedSave` from `lib/save-feedback.ts`.

---

### ListRowField

**File:** `02-app/components/list-row-field.tsx`
**Purpose:** Inline-list-row text editor for repeating list/card structures where each row is "text input + delete button" and the host list provides the visual chrome. Carries the same save contract as InlineField but without the field envelope.

**Anatomy:**
- Outer wrapper: `relative flex items-center gap-2 min-w-0 flex-1` (input variant) or `relative flex flex-col gap-1 min-w-0` (textarea variant). Disabled adds `opacity-50`.
- Inner control: native `<input type="text">` or `<textarea>`, `flex-1 min-w-0` (input) / `w-full min-w-0` (textarea).
  - Idle: `bg-transparent rounded-md border border-transparent px-0 py-1 text-sm text-foreground placeholder:text-muted-foreground/50`
  - Hover: `hover:bg-muted/20 hover:px-2 transition-all duration-100`
  - Focus: `focus:outline-none focus:bg-muted/30 focus:px-2 focus:border-border`
  - Disabled: input/textarea also `disabled`; hover/focus chrome suppressed via `disabled:hover:bg-transparent disabled:hover:px-0`
  - Textarea: adds `resize-none` and `rows={rows ?? 2}`
- Saved/Failed indicator:
  - **Input variant:** right of input, inline. `<span className="text-[10px] text-success shrink-0 min-w-[3rem] text-right" aria-live="polite">Saved</span>` (or `text-destructive` for "Failed"). Slot stays present even when idle to prevent layout shift.
  - **Textarea variant:** below textarea, right-aligned. `<div className="flex justify-end text-[10px] text-success min-h-[14px]" aria-live="polite">Saved</div>` (or destructive). Slot reserves `min-h-[14px]`.
  - Auto-clears after 2s on success. Persists until next trigger on error.

**Behavioural states:**
- Idle / hover / focus: as above.
- Saving / Saved / Error: state machine sourced from `useDebouncedSave` in `lib/save-feedback.ts`. Saving silent; "Saved" auto-clears after 2s; "Failed" persists until next trigger.
- Disabled: wrapper opacity, control disabled, save callback not invoked.

**Edge cases:**
- Empty value: passes through to `onSave('')` — consumer decides validity.
- Unmount while save pending: hook cleanup cancels timer.
- Long text (input): `min-w-0` lets flex containers clamp it; truncation is the consumer's concern.
- Textarea grows beyond `rows`: native scrollbar (no auto-grow). For auto-growing text, use `chat-input.tsx`.

**Props:**
```ts
interface ListRowFieldBaseProps {
  value: string | null
  onSave: (value: string) => Promise<{ ok: boolean; error?: string }>
  placeholder?: string
  'aria-label': string  // required — no visible label
  disabled?: boolean
  className?: string
  debounceMs?: number   // default 500
}
// Plus: variant: 'input' OR variant: 'textarea' (with rows?: number — default 2)
```

**Do not:**
- Add a label, envelope, or icon inside the molecule — those belong in the consumer's row composition.
- Save on every keystroke — onBlur + debounce is the contract.
- Hardcode the "Saved" / "Failed" colours — `text-success` / `text-destructive` tokens only.
- Reach for a `compact` flag on InlineField instead — ListRowField is intentionally a separate molecule because the visual role differs (list row vs. field).

**Save contract:** "Inline list rows" row of the [Save contract](#save-contract). Internally consumes `useDebouncedSave` from `lib/save-feedback.ts`.

---

### SectionCard

**File:** `02-app/components/section-card.tsx`
**Purpose:** Grouped content block within a ContentPane. Use for grouping related content — e.g. an Ideas panel, a Customer Journey block, a Source Materials table. Has a header (title + optional description + optional action) and a content body.

**Anatomy:**
- Outer wrapper: `bg-card border border-border rounded-lg p-6`.
- Header (when title or description present): row with title (`font-semibold`) on left + optional action slot on right. Description (`text-sm text-muted-foreground mt-1`) below the title.
- Body: `mb-4` gap between header and content (review for consistency).

**Behavioural states:**
- Stateless — presentational.

**Props:**
```ts
interface SectionCardProps {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
}
```

**Do not:**
- Add multiple shadows — it's flat by design (border-only).
- Use this for the main page content area — ContentPane covers that.

---

### SectionDivider

**File:** `02-app/components/section-divider.tsx`
**Purpose:** Visual separator for use inside nav menus and between in-page content sections. Distinct from shadcn `SidebarSeparator` (which is sidebar-specific).

**Anatomy:**
- Thin horizontal rule: `border-t border-border/30 my-1`.
- Optional label above: `text-[10px] font-medium uppercase tracking-widest text-muted-foreground/50`.
- Sidebar variant via `className`: `-mx-2.5` to bleed to sidebar edges.

**Props:**
```ts
interface SectionDividerProps {
  label?: string
  className?: string
}
```

**Do not:**
- Use this inside the sidebar — use shadcn `SidebarSeparator` (which handles sidebar-specific colour).
- Render thicker dividers — keep visual hierarchy gentle.

---

### TabbedPane

**File:** `02-app/components/tabbed-pane.tsx`
**Purpose:** Canonical tab-strip molecule. Pairs a tab strip with its content area. Replaces ad-hoc tab usage across features. Built on shadcn `Tabs`.

**Anatomy:**
- Tab strip: row of tab triggers. Inactive: `text-muted-foreground`. Active: `text-foreground font-medium` + underline indicator in `--primary`.
- Tab strip sits above `ContentPane` (not inside it) — part of page chrome.
- Content area: `TabsContent` per tab; consumer renders the body content.

**Behavioural states:**
- **Idle / active per tab**: as described.
- **Hover** on inactive tab: subtle text-foreground shift.

**Props:**
```ts
interface TabbedPaneProps {
  tabs: { id: string; label: string; content: React.ReactNode }[]
  defaultTab?: string
  className?: string
}
```

**Do not:**
- Include `ContentPane` inside `TabbedPane` — they're composed separately by organisms.
- Use the shadcn `pill` Tabs variant — line variant only (DS-01 decision).

---

### InPageNav

**File:** `02-app/components/in-page-nav.tsx`
**Purpose:** Sticky vertical section nav for long scrolling content within a tab. Renders as a sticky left column alongside content. Used in DNA detail views.

**Anatomy:**
- Outer wrapper: `w-36 shrink-0 self-start sticky top-0` — baked into the molecule. No wrapper div needed at the call site.
- Nav list: vertical list of items, `gap-0.5`.
- Active item: `border-l-2 border-primary text-foreground font-medium`.
- Inactive item: `text-muted-foreground hover:text-foreground` with `border-l-2 border-transparent` for alignment.
- Background: transparent (sits within the page, not a sidebar).

**Behavioural states:**
- **Idle / hover / active per item**: as described.

**Edge cases:**
- **Usage pattern**: parent must be a flex row. Content sibling should be `flex-1 min-w-0 flex flex-col gap-8 pb-16`. Sticky positioning works relative to the nearest scrolling ancestor (typically TabsContent with `overflow-y-auto`).

**Props:**
```ts
interface InPageNavProps {
  items: { id: string; label: string }[]
  activeId: string
  onSelect: (id: string) => void
  className?: string
}
```

**Do not:**
- Wrap in a sidebar styling — InPageNav is page-level, not sidebar-level.
- Use for fewer than 2 items — render a heading instead.

---

### PageChrome

**File:** `02-app/components/page-chrome.tsx`
**Purpose:** Wraps the full page header area — `PageHeader` + optional sub-header (tab strips, switchers, breadcrumbs, badges) — as a single layout unit. The `subheader` slot is the canonical place for `ItemSwitcher` (DS-09) and similar.

**Anatomy:**
- Outer wrapper: `mb-4 flex flex-col gap-4`.
- `PageHeader` rendered first (with `mb-0` because PageChrome owns the bottom margin).
- `subheader` ReactNode rendered below.
- No background — sits in the page column.

**Behavioural states:**
- Stateless container.

**Props:**
```ts
interface PageChromeProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  action?: React.ReactNode          // top-right of PageHeader (cards icon, +New, Archive, etc.)
  subheader?: React.ReactNode       // below PageHeader (ItemSwitcher, badges, version meta)
}
```

**Do not:**
- Bake specific switcher / tabs / breadcrumb logic into PageChrome — `subheader` stays a generic ReactNode slot for flexibility.
- Add a background or border — page chrome is flat against the dashboard background.

---

### StatusBadge

**File:** `components/status-badge.tsx`
**Purpose:** Status indicator pill. Interactive (with dropdown picker) when `onChange` is provided; static read-only pill when `onChange` is omitted. Used in detail-view headers (knowledge assets, audience segments, platforms, offers, missions, projects), in card-grid status indicators, and anywhere a status needs a token-driven coloured pill. Distinct from `TypeBadge` (which is purely decorative and only takes a tag hue).

**Two option variants** (a single `options` array must be all-state or all-hue — never mixed):

1. **State variant** — for health/lifecycle statuses where colour signals "is this OK?": `{ value, label, state: 'success' | 'warning' | 'error' | 'info' | 'neutral' }`.
2. **Tag-hue variant** — for categorical lifecycle states where colour signals "which kind?" (e.g. mission phases): `{ value, label, hue: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 }`. Uses `TypeBadge`'s desaturated tag palette.

**Spec:**
- **Pill (interactive trigger):** `inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-opacity` — opens dropdown on click. Composes `FloatingMenu` for the popover chrome (positioning, click-outside dismissal, Escape dismissal, raised shadow).
- **Pill (read-only — `onChange` omitted):** same chrome minus the chevron icon and the click handler. Renders as `<span>`. No hover state. No dropdown.
- **Dropdown items:** `flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted transition-colors` with a small dot indicator + label. The current option is filtered out of the dropdown.
- **State styling** (state variant):
  - `success` → `bg-success-bg text-success-foreground`
  - `warning` → `bg-warning-bg text-warning-foreground`
  - `error` → `bg-error-bg text-error-foreground`
  - `info` → `bg-info-bg text-info-foreground`
  - `neutral` → `bg-muted text-muted-foreground`
- **Hue styling** (tag-hue variant): `bg-tag-{N} text-foreground` where `N` is 1–8 (matches `TypeBadge`). Tag tokens are desaturated enough that `text-foreground` reads on all eight; no per-hue foreground tokens.
- **Behavioural states (interactive):** idle (full opacity), hover (`hover:opacity-80 cursor-pointer`), pending (`opacity-60` + button disabled while async `onChange` resolves).
- **Default options:** draft → warning, active → success, archived → neutral (state variant).
- **Custom options:** consumers pass `{ value, label, state }[]` OR `{ value, label, hue }[]` — the molecule infers the variant from the option shape.
- **Accessibility (interactive):** button has `aria-haspopup="listbox"` and `aria-expanded={open}`.
- **Props:** `status: string`, `onChange?: (status) => Promise<{ ok, error? }>` (omit to render as static pill), `options?: StatusOption[]`.
- **Do not:** hardcode colour classes inside the component; bake in any specific status string (`value`/`label` are arbitrary); add a state keyword outside the closed set; mix state-shaped and hue-shaped options in a single `options` array.

**When to use which variant:**
- **State variant** when status answers "is this in a healthy or attention-worthy state?" — DNA item statuses (Draft / Active / Archived), client project status (Active / Paused / Complete / Archived).
- **Tag-hue variant** when status answers "which lifecycle stage / category?" — mission phases (Exploring / Synthesising / Producing / Complete / Paused). Five distinct stages benefit from five distinct colours rather than 2× warning + 2× info.

---

### TypeBadge

**File:** `components/type-badge.tsx`
**Purpose:** Decorative non-interactive pill indicating *which kind* of thing this is. Distinct from `StatusBadge` (which indicates *what state*). Used inline in tables, card grids, detail-view headers, and workspace headers.

**Spec:**
- **Anatomy:** a single `<span>` element. No children other than the label string.
- **Layout:** `inline-flex items-center rounded-full font-medium`.
- **Background:** `bg-tag-{1-8}` — one of the eight DS-02 tag tokens (desaturated palette sympathetic to sage).
- **Text:** `text-foreground` — sufficient contrast on all eight tag backgrounds since they're all desaturated. No per-tag foreground tokens.
- **Sizes:** `xs` (default — `text-xs px-2 py-0.5`); `sm` (`text-sm px-2.5 py-1`).
- **No transitions, hover, or focus state** — non-interactive by design. If a feature needs a clickable category filter, that's a different molecule.
- **Hue mapping:** numeric (1–8). The molecule has no opinion on what hue means what — per-feature mappings live in consumer files (e.g. `02-app/lib/voc-mapping-hues.ts`, `02-app/lib/types/channels.ts`).
- **Props:** `hue: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8`, `label: string`, `size?: 'xs' | 'sm'`, `className?: string`.
- **Do not:** make it interactive; add an `onClick` prop; hardcode colour classes; add per-tag foreground tokens.

---

### SelectField

**File:** `02-app/components/select-field.tsx`
**Purpose:** Field-context select with InlineField visual parity. Used in forms and detail views where a dropdown sits as one of several labelled fields. Distinct from `InlineCellSelect` (which is dense/no-envelope, for table cells).

**Anatomy:**
- Outer wrapper: `relative` + `mt-3` when label present + matched border classes from InlineField (`rounded-md border` with `border-border/60` at rest, `border-field-active/50 bg-field-active/[0.03]` at focus, `hover:border-border` on hover).
- Label patch: `absolute -top-2 left-2.5` + `bg-card` (or `labelBg` override) + `text-[10px] font-semibold capitalize tracking-wide` + transitions to `text-field-active` on focus.
- Icon: `h-3 w-3 text-muted-foreground` left of label, transitions to `text-field-active` on focus.
- Description: optional info-icon tooltip beside label.
- Save feedback: `text-success` "Saved" / `text-destructive` "Failed" inline beside label (DS-02 tokens).
- Inner trigger: base-ui `Select.Trigger` with no border/bg of its own (the wrapper provides them). `pt-3 pb-1.5 h-auto` when label present so the value sits below the floating label.
- Dropdown popup: standard base-ui Select popup — `bg-card border border-border rounded-lg shadow-[var(--shadow-raised)]`. Each item `px-3 py-1.5 text-sm hover:bg-muted`.

**Behavioural states:**
- **Idle / hover / focus**: as InlineField (border + bg shifts on focus-within).
- **Open**: same as focus.
- **Disabled**: `opacity-50 cursor-not-allowed`. Trigger doesn't open. `onSave` not invoked.
- **Saving / Saved / Error**: state machine identical to InlineField — saving briefly, then "Saved" (auto-clears after 2s) or "Failed" (persists until next change).
- **Empty options**: trigger disabled, placeholder reads "No options available".

**Props:**
```ts
{
  label: string
  value: string
  options: { value: string; label: string }[]
  onSave: (value: string) => Promise<{ ok: boolean; error?: string }>
  placeholder?: string
  icon?: LucideIcon
  description?: string
  labelBg?: string         // default 'bg-card'
  disabled?: boolean
  className?: string
}
```

**Do not:**
- Hardcode colour classes inside the component.
- Save on focus/hover — only on selection change.
- Add a multi-select mode (separate molecule if needed in future).

**Save contract:** "Selects / checkboxes" row of the [Save contract](#save-contract). `onSave` fires immediately on change; the molecule calls `debouncedSaveToast()` from `lib/save-feedback.ts`.

---

### InlineCellSelect

**File:** `02-app/components/inline-cell-select.tsx`
**Purpose:** Compact cell-context select for table rows or other tight contexts. No envelope, no floating label, no icon — the cell itself is the visual envelope.

**Anatomy:**
- Trigger: base-ui `Select.Trigger` styled `h-auto px-2 py-1 text-sm rounded-md bg-transparent`.
- Hover: `bg-muted/50`. Open: `bg-muted` (via `data-[state=open]`).
- Chevron is rendered by the base-ui Select trigger automatically.
- Dropdown popup: same as SelectField (`bg-card border border-border rounded-lg shadow-[var(--shadow-raised)]`).
- No inline save badge — table cells don't have room. On error: brief border tint via `border-destructive/60` for 1.5s + toast.

**Behavioural states:**
- **Idle**: transparent.
- **Hover**: `bg-muted/50`.
- **Open**: `bg-muted`.
- **Disabled**: `opacity-50 cursor-not-allowed`.
- **Error flash**: `border-destructive/60` for 1.5s after a failed save, then clears.

**Props:**
```ts
{
  value: string
  options: { value: string; label: string }[]
  onSave: (value: string) => Promise<{ ok: boolean; error?: string }>
  placeholder?: string
  disabled?: boolean
  className?: string
}
```

**Do not:**
- Add a label, icon, or floating-label patch (those belong in SelectField).
- Render an inline "Saved" indicator — silent on success, toast + flash on error.

**Save contract:** "Table cells" row of the [Save contract](#save-contract) — silent on success, error flash + toast. Uses `debouncedSaveToast()` from `lib/save-feedback.ts` for the cross-field success aggregation.

---

### CheckboxField

**File:** `02-app/components/checkbox-field.tsx`
**Purpose:** Labelled checkbox with consistent layout. Used in checklists (VOC mapping, doc multi-select) and standalone labelled toggles.

**Anatomy:**
- Outer `<label>`: `flex items-start gap-2 px-2 py-1.5 rounded`. Hover: `bg-muted/30` (when not disabled). Cursor: pointer (or `not-allowed` when disabled).
- Checkbox: base-ui `Checkbox.Root` from `components/ui/checkbox.tsx`. `mt-0.5` to align with the first line of label text.
- Label content: `flex-1`. Accepts `string | ReactNode` so consumers can include badges, icons, etc. inline.
- Description (optional): `text-xs text-muted-foreground mt-0.5` below the label.

**Behavioural states:**
- **Unchecked / Checked**: handled by base-ui `Checkbox` atom (`data-checked` styling).
- **Hover**: row `bg-muted/30`.
- **Focus** (keyboard): focus ring on the checkbox via `focus-visible:ring-ring`.
- **Disabled**: row `opacity-50 cursor-not-allowed`. Click does nothing. Label text in `text-muted-foreground`.

**Props:**
```ts
{
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string | ReactNode
  description?: string
  disabled?: boolean
  className?: string
}
```

**Do not:**
- Add an `onSave` prop. The parent owns the save strategy — checkbox lists typically batch saves (12 toggles shouldn't fire 12 separate saves).
- Add a "Saved"/"Failed" indicator. The parent surface owns feedback if needed.
- Add interactive feedback beyond the basic toggle. For richer interactions (multi-select tags, indeterminate states), build a separate molecule.

**Save contract:** Parent-owned. The molecule itself is uncontrolled-of-saving — it just toggles. Parent should follow the "Selects / checkboxes" row of the [Save contract](#save-contract) for individual toggles, or the "Bulk operations" row when batching.

---

### SliderField

**File:** `02-app/components/slider-field.tsx`
**Purpose:** Field-context slider with InlineField visual parity. Track + thumb + numeric readout + low/high labels. Variant for zero-centred ranges (delta sliders, e.g. -50..+50).

**Anatomy:**
- Outer wrapper: same envelope as SelectField — border + label patch + focus state + Saved/Failed feedback.
- Top row inside the envelope: low label (left), numeric readout (centre, `font-mono tabular-nums`), high label (right).
- Slider track: base-ui `Slider.Track` (`h-1.5 rounded-full bg-muted`) + `Slider.Indicator` (`bg-primary`) + `Slider.Thumb` (`bg-card border-2 border-primary`).
- Zero-centred variant: an additional thin `bg-border` tick at the position corresponding to value 0.

**Save behaviour:**
- Local state via `onValueChange` (drag updates the visible value).
- Save fires via base-ui `onValueCommitted` (`pointerup` / drag release / keyboard Enter).
- On error: revert local state to last saved value + toast.

**Behavioural states:**
- **Idle / hover / focus**: as SelectField (the wrapper handles it; focus is on the thumb).
- **Dragging**: thumb tracks pointer. Save not yet fired.
- **Released**: single `onSave` call. Saving → Saved → cleared.
- **Disabled** (or `min === max`): `opacity-50 cursor-not-allowed`, drag blocked.

**Edge cases:**
- Keyboard nav: arrow keys increment by `step`; PageUp/PageDown by `largeStep` (base-ui default 10×); Home/End jump to min/max.
- Touch: drag works via `pointerup` (base-ui handles).

**Props:**
```ts
{
  label: string
  value: number
  min: number
  max: number
  step?: number              // default 1
  onSave: (value: number) => Promise<{ ok: boolean; error?: string }>
  lowLabel?: string
  highLabel?: string
  valueFormatter?: (value: number) => string  // default: signed when zeroCentred, plain otherwise
  description?: string
  icon?: LucideIcon
  zeroCentred?: boolean
  labelBg?: string
  disabled?: boolean
  className?: string
}
```

**Do not:**
- Save on `onChange` — only on commit (drag-release / keyboard-commit).
- Add a multi-thumb range mode (separate molecule).
- Add tick marks beyond the zero-centred variant (separate molecule shape).

**Save contract:** "Sliders" row of the [Save contract](#save-contract). Fires `onSave` on commit, then `debouncedSaveToast()` from `lib/save-feedback.ts`. Does not consume `useDebouncedSave` — commit-driven, not keystroke-driven.

---

### ItemSwitcher

**File:** `02-app/components/item-switcher.tsx`
**Purpose:** Compact dropdown for navigating between sibling items in a detail view (e.g. switch between audience segments while viewing one). Sits in PageChrome's `subheader` slot. Distinct from `SelectField` (which edits a value), `InlineCellSelect` (table cells), and `StatusBadge` (state changes). ItemSwitcher's purpose is *navigation* — selecting fires a route change.

**Anatomy:**
- Built on base-ui Select via the existing `components/ui/select.tsx` atom.
- Trigger (`Select.Trigger`):
  - `h-auto py-1 px-3 rounded-md bg-transparent border border-border/60 text-sm`.
  - Hover: `bg-muted/30 border-border`.
  - Open (`data-[state=open]`): `bg-muted border-border`.
  - Focus: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1`.
  - Inside the trigger, vertical-stacked content: a small uppercase label (`text-[10px] font-semibold uppercase tracking-wide text-muted-foreground leading-none`) above the current item name (`text-sm font-medium text-foreground truncate`).
  - `max-w-[var(--max-width)]` (default 220px) — current item name truncates with ellipsis when too long.
- Dropdown popup (`Select.Content`): standard base-ui Select popup. Each option `flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted`. Long names visible in full (no truncation in options).

**Behavioural states:**
- **Idle**: `border-border/60`.
- **Hover**: `bg-muted/30 border-border`.
- **Open**: `bg-muted border-border`.
- **Focus** (keyboard): focus ring on trigger.
- **Hidden**: when `items.length < 2`, the molecule returns `null`.

**Navigation:**
- On selection: calls `router.push(getHref(item))` via `useRouter` from `next/navigation`.
- No save lifecycle; no Saved/Failed indicator.
- `getHref` is the API for navigation paths — Link-based, gets prefetch implicitly via Next.js when used by adjacent Link components in the page.

**Edge cases:**
- **Current item not in `items`**: trigger renders the `label` prop value as the visible name (defensive fallback).
- **Long item name**: trigger truncates with CSS ellipsis; dropdown options show the full name.
- **0 or 1 items**: returns `null`.

**Accessibility:**
- `aria-label="Switch ${label.toLowerCase()}"` on the trigger (e.g. "Switch segment").
- Keyboard nav: standard base-ui Select — Up/Down to navigate options, Enter to select, Esc to close.
- Selected option marked via base-ui automatically.

**Generic over `T`:** consumers pass their domain types directly without mapping to a fixed shape — saves `{id, label, href}` boilerplate at call sites.

**Optional flag indicator** *(via `getFlag`)*: a small warning-coloured pill rendered alongside the item name in both the trigger and the dropdown options. Used to surface meta about an item without committing to a full status badge — e.g. knowledge-assets uses it to mark drafts. Style: `bg-warning-bg text-warning-foreground rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide`. The flag string is rendered as-is (typically a single word like "Draft").

**Optional grouping** *(via `getGroup` + optional `getGroupLabel`)*: when passed, dropdown options are rendered inside `SelectGroup` blocks with a small uppercase label per group. Group order follows the order groups first appear in `items`. Used by DNA-07b (channels) to group sibling channels by category. Backwards-compatible — `getGroup` absent ⇒ flat list as before.

**Props:**
```ts
interface ItemSwitcherProps<T> {
  items: T[]                      // pre-filtered active items
  currentId: string
  getHref: (item: T) => string
  getLabel: (item: T) => string
  getId?: (item: T) => string     // default: (item) => (item as { id: string }).id
  getFlag?: (item: T) => string | null | undefined   // warning pill — return null for none
  getGroup?: (item: T) => string                     // optional grouping key
  getGroupLabel?: (groupKey: string) => string       // optional human label for a group key
  label: string                   // small uppercase descriptor (e.g. "Segment")
  maxWidth?: number               // default 220
  className?: string
}
```

**Do not:**
- Hardcode colour classes inside the component.
- Add an `onSelect` callback — `getHref` is the API.
- Add a "+ Create new" option in the dropdown — that's the action-slot button's job.
- Add value-editing behaviour. ItemSwitcher is for navigation only.
- Add a label patch like InlineField/SelectField — this is a compact pill, not a field.
- Use `getFlag` for state colours beyond warning. The flag is intentionally opinionated — single warning colour, single role. Use `StatusBadge` for richer state indicators.

---

### IconButton

**File:** `02-app/components/icon-button.tsx`
**Purpose:** Icon-only button. Default-on tooltip explaining the action. Optional Link rendering. Wraps `Button` atom + (optional) `Tooltip` scaffold. Distinct from `ActionButton` (which has a visible label).

**Anatomy:**
- Wraps `Button` from `@/components/ui/button` with default `variant="outline"`, default `size="sm"`. Icon rendered at the size dictated by Button + size combination (h-3.5 w-3.5 typically).
- When `tooltip !== false`: wrapped in `<Tooltip><TooltipTrigger render={<span />}>{button}</TooltipTrigger><TooltipContent>{tooltipText}</TooltipContent></Tooltip>`. The `<span />` wrapper allows tooltips on disabled buttons (browsers don't fire pointer events on disabled `<button>`s directly).
- When `href` is set: rendered as `<Button nativeButton={false} render={<Link href={href} aria-label={label} />}>` — base-ui's render-prop pattern.

**Behavioural states:**
- **Idle / hover / focus / active**: standard `Button` states.
- **Disabled**: standard. Tooltip still fires when hovered.

**Tooltip behaviour:**
- `tooltip={true}` (default): tooltip text = `label`.
- `tooltip={false}`: no tooltip wrapper.
- `tooltip="Custom text"`: tooltip text = the string.

The default-on tooltip is intentional — most icon buttons benefit from explanation. Consumers opt out where the icon is universally understood.

**Edge cases:**
- **`href` + `onClick`**: both fire — onClick first (synchronous), then Link navigation. Useful for analytics or local cleanup before navigation.
- **`tooltip` and `disabled` together**: tooltip still appears on hover (the `<span />` wrapper makes this work).
- **`data-testid`**: forwarded to the button (or to the Link if `href` is set).

**Accessibility:**
- `label` becomes `aria-label` on the rendered button — required, never empty.

**Props:**
```ts
interface IconButtonProps {
  icon: LucideIcon
  label: string                       // required — aria-label and default tooltip text
  onClick?: () => void
  href?: string                       // when set, renders as Link
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'   // default 'outline'
  size?: 'sm' | 'icon'                // default 'sm'
  disabled?: boolean
  tooltip?: boolean | string          // default true
  'data-testid'?: string
  className?: string
}
```

**Do not:**
- Allow `children` — the icon is the prop. Use `ActionButton` if you need a label.
- Pass `aria-label` separately — derived from `label`.
- Hardcode icon sizes — Button atom's auto-sizing handles this.

---

### ActionButton

**File:** `02-app/components/action-button.tsx`
**Purpose:** Icon (optional, leading or trailing) + visible label primary action. Used for top-of-page CTAs (`+ New X`, `Generate`), confirmation buttons, list-action buttons. Wraps `Button` atom + (optional) `Tooltip`. Optional Link rendering. Optional loading state for async actions.

**Anatomy:**
- Wraps `Button` from `@/components/ui/button` with default `variant="default"` (sage primary), default `size="sm"`.
- Children rendered as the visible label, with the leading `icon` (when provided) preceding via Button's gap utility.
- Optional `trailingIcon` renders to the right of children. Hidden while loading (the leading-position spinner is the sole visual signal during async work).
- When `loading=true`: leading icon (or, if no icon, prepended) is replaced by `<Loader2 className="animate-spin">`. Label stays visible. Button is disabled. `aria-busy="true"` set. Trailing icon hidden.
- When `tooltip` (string) provided: button wrapped in `<Tooltip>...</Tooltip>` with `<span />` trigger wrapper.
- When `href` is set: rendered as `<Button nativeButton={false} render={<Link href={href} />}>`.

**Behavioural states:**
- **Idle / hover / focus / active**: standard `Button`.
- **Disabled**: standard `Button` disabled.
- **Loading**: button disabled, leading icon replaced by spinner, label persists. Click handler doesn't fire.
- **With tooltip**: tooltip on hover (works on disabled).

**Edge cases:**
- **`loading` and `disabled` together**: both honoured.
- **No icon, with loading**: spinner is prepended to the label via Button's gap utility.
- **`href` + `onClick`**: both fire — onClick first, then navigation.

**Accessibility:**
- Children are the visible (and accessible) label. No `aria-label` needed.
- Loading announces via `aria-busy="true"`.

**Props:**
```ts
interface ActionButtonProps {
  icon?: LucideIcon
  trailingIcon?: LucideIcon           // optional — hidden while loading
  children: React.ReactNode           // visible label
  onClick?: () => void
  href?: string
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'   // default 'default'
  size?: 'sm' | 'default'             // default 'sm'
  disabled?: boolean
  loading?: boolean
  tooltip?: string                    // optional — most ActionButtons don't need one
  type?: 'button' | 'submit'          // default 'button'
  'data-testid'?: string
  className?: string
}
```

**Do not:**
- Use ActionButton for icon-only — that's `IconButton`.
- Add `tooltip` as default-true — labels are visible; tooltips only for clarification (e.g. "why is this disabled?").
- Set both `loading` and expect the click to register during loading — clicks are blocked while loading.

---

### Modal

**File:** `02-app/components/modal.tsx`
**Purpose:** Foundational modal molecule. Wraps shadcn Dialog. Every Create / Archive / capture modal in the app composes this. Use for all modal interactions. Distinct from `ChatDrawer` (slide-out side panel, not centred overlay).

**Anatomy:**
- Wraps shadcn `Dialog` (`@/components/ui/dialog`) — `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription`.
- Centred overlay with backdrop. Backdrop, focus trap, Escape-to-close, click-outside-to-close: all handled by shadcn Dialog.
- Header: `DialogTitle` (required) + optional `DialogDescription`.
- Body: `children` rendered below the header.
- Footer: optional `footer` prop. When provided, rendered after `children` inside `<div className="mt-6 flex justify-end gap-2">`. When omitted, no footer chrome is added — consumers can still render footer-like content inside `children` if they need full control.

**Size variants** (`size` prop): `sm` (`sm:max-w-sm`), `md` default (`sm:max-w-md`), `lg`, `xl`, `2xl`. Each maps to the equivalent shadcn `sm:max-w-*` class. Default `md`.

**Behavioural states:**
- **Closed**: nothing rendered.
- **Opening / open**: shadcn Dialog handles fade + scale animation, focus trap engages, body scroll locked.
- **Dismissing**: Escape, backdrop click, or `onOpenChange(false)` from inside.

**Edge cases:**
- **Async work in flight** (e.g. Generate button is generating) — consumer is responsible for disabling Cancel / preventing dismissal during the async window. Modal does not block this.
- **Long content**: `DialogContent` is scrollable internally — content wider than the size cap is fine.

**Accessibility:**
- Title is required (DialogTitle). Description optional but recommended for non-trivial modals.
- Focus is trapped inside the modal while open, returns to trigger on close (shadcn default).

**Props:**
```ts
interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: "sm" | "md" | "lg" | "xl" | "2xl"  // default "md"
}
```

**Footer convention** (canonical — used by all standard footers):
```tsx
<Modal
  title="..."
  footer={
    <>
      <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
      <Button size="sm" onClick={handleSubmit}>Confirm</Button>
    </>
  }
>
  {/* body */}
</Modal>
```

The footer slot bakes in the canonical chrome (`mt-6 flex justify-end gap-2`) so consumers don't reinvent it. Multi-step modals that need different footers per phase pass different `footer` content per render — see `ArchiveItemModal` for a worked example (footer omitted during 'checking' / 'archiving' phases, present during 'confirm').

**Do not:**
- Add custom backdrop / animation / focus-trap logic — use shadcn Dialog as-is.
- Render a manual `flex justify-end gap-2` footer inside `children` for new modals — pass via `footer` prop instead.
- Hardcode colour classes — use `bg-card`, `border-border`, etc. via the underlying shadcn atom.
- Make modals non-dismissible by default. If a consumer truly needs to block dismissal during async work, gate Cancel/onOpenChange manually.

**Note:** registry description says size options are `sm|md|lg|xl`, but the code accepts `2xl` as well. Spec is authoritative — `2xl` is supported.

---

### EmptyState

**File:** `02-app/components/empty-state.tsx`
**Purpose:** Consistent empty-state block — icon, heading, optional description, optional CTA. Use when a list, section, or pane has no data yet.

**Anatomy:**
- Outer wrapper: `flex flex-col items-center justify-center gap-3 py-16 text-center`.
- Optional icon block: `h-12 w-12 rounded-full bg-muted` containing the icon at `h-6 w-6 text-muted-foreground`.
- Heading: `font-medium`.
- Description (optional): `mt-1 text-sm text-muted-foreground`.
- Action (optional): `mt-2` wrapper around the consumer's CTA element.

**Behavioural states:**
- Stateless — purely presentational.

**Edge cases:**
- **No icon, no description, no action**: heading-only. Layout still fills its parent vertically via `py-16`.
- **In a tight container**: `py-16` may be too tall. Consumers can wrap with their own padding or override via `className` if added later — currently no className prop (potential future addition).

**Props:**
```ts
interface EmptyStateProps {
  icon?: LucideIcon
  heading: string
  description?: string
  action?: React.ReactNode
}
```

**Do not:**
- Hardcode colour classes — already token-driven.
- Reduce the `py-16` padding for compact contexts; if needed, add a `compact` variant rather than overriding inline.

---

### FormLayout

**File:** `02-app/components/form-layout.tsx`
**Purpose:** Standalone form wrapper for non-modal forms — title, description, fields slot, footer with submit/cancel. **Currently unused** — the pattern moved to inline composition inside `Modal`. Kept as a reference shape for any future page-level form.

**Anatomy:**
- Outer `<form>`: `flex flex-col gap-6`.
- Optional header: `<h2 className="text-lg font-semibold">` title + `<p className="mt-1 text-sm text-muted-foreground">` description.
- Body: `flex flex-col gap-4` containing the consumer's field elements.
- Footer: `flex justify-end gap-2 border-t pt-4` containing the consumer's actions.

**Behavioural states:**
- Stateless wrapper — `onSubmit` passed through to native `<form>`.

**Props:**
```ts
interface FormLayoutProps {
  title?: string
  description?: string
  children: React.ReactNode
  actions: React.ReactNode
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void
}
```

**Do not:**
- Use this inside a Modal — Modal's body composes its own form structure.
- Add submit-state UI (saving, success). That's the consumer's responsibility.

**Note:** No current consumers (audit 2026-04-27). Candidate for removal if no consumer emerges in the next phase.

---

### NavSidebar

**File:** `02-app/components/nav-sidebar.tsx`
**Purpose:** App-wide left navigation. Logo mark header + search bar (cosmetic) + grouped nav links. Always visible on dashboard pages.

**Anatomy:**
- Sidebar surface: full-height column on the left, `bg-sidebar` (forest deep), `text-sidebar-foreground`, `border-r border-sidebar-border`.
- Logo header at top.
- Search bar (currently cosmetic — does not actually search).
- Vertical list of nav sections — Home (flat), DNA (accordion), Knowledge, Inputs, Content, Projects.
- Section headers: `text-sidebar-foreground/60` uppercase tracking.
- Flat links: `bg-sidebar-primary text-sidebar-primary-foreground` when active (sage fill); `hover:bg-sidebar-accent`.
- Group items (inside accordion): `text-sidebar-primary` when active; `text-sidebar-foreground/80` otherwise; `hover:text-sidebar-foreground`.
- Pending-input badge (small count indicator) on the Queue link when `pendingInputsCount > 0`.

**Behavioural states:**
- Active link: highlighted via sage fill or text colour (per type).
- Hover: subtler background or text shift.
- Accordion: open/closed sections expand/collapse.

**Edge cases:**
- **0 pending inputs**: no badge.
- **Long brand/section names**: truncated within sidebar width; tooltips not currently provided.

**Props:**
```ts
interface NavSidebarProps {
  pendingInputsCount?: number
}
```

**Configuration:** nav structure (sections + items) lives in `02-app/lib/nav-config.ts`. The molecule renders the config; it doesn't hardcode the link list.

**Do not:**
- Add new top-level nav items inline — use `lib/nav-config.ts`.
- Apply non-sidebar tokens (`bg-card`, `--background`) — sidebar tokens only.
- Add a collapse/expand affordance without a corresponding spec update — the sidebar is currently always full-width.

---

### TopToolbar

**File:** `02-app/components/top-toolbar.tsx`
**Purpose:** Persistent toolbar in the top-right of every dashboard page. Houses the ideas-capture lightbulb button. Sized to allow future additions (notifications, account, etc.).

**Anatomy:**
- Fixed-position container: top-right of the dashboard layout, above the page chrome.
- Currently contains a single icon button: lightbulb that opens `IdeaCaptureModal`.
- Icon button styling: token-driven, `text-muted-foreground hover:text-primary hover:bg-primary/10`.

**Behavioural states:**
- Idle: muted icon.
- Hover: primary tint.
- Click: opens IdeaCaptureModal.

**Edge cases:**
- **Future additions**: when the toolbar grows beyond one button, group items in `flex items-center gap-1` and review the visual hierarchy.

**Props:** none.

**Note:** uses Button atom directly — currently OK because the toolbar IS the molecule; the Button atoms are its parts. Flagged in DS-08 atom-import audit; may convert to an `IconButton` molecule under DS-05 if extracted.

**Do not:**
- Add behaviour beyond the lightbulb without updating this spec.
- Move the toolbar's position (top-right) — DS-01 layout decision.

---

### PageSkeleton

**File:** `02-app/components/page-skeleton.tsx`
**Purpose:** Generic full-page loading skeleton. Default Suspense fallback for all dashboard routes via `(dashboard)/loading.tsx`. Individual pages can provide their own `loading.tsx` for more specific skeletons.

**Anatomy:**
- Outer wrapper: `flex flex-col gap-6 p-8 h-full`.
- Page header section: title bar (`Skeleton h-7 w-48`) + subtitle bar (`Skeleton h-4 w-80`).
- Content blocks: full-width `Skeleton h-32 w-full rounded-lg`, then a 2-column grid of `Skeleton h-48`, then another `Skeleton h-40`.
- Uses shadcn `Skeleton` atom (token-driven).

**Behavioural states:**
- Stateless — purely presentational shimmer via the Skeleton atom's animation.

**Props:** none.

**Do not:**
- Make this skeleton specific to any one page — it's the generic fallback. For page-specific skeletons, create a page-level `loading.tsx`.
- Add appearance classes — the Skeleton atom owns its shimmer styling.

---

### ScreenSizeGate

**File:** `02-app/components/screen-size-gate.tsx`
**Purpose:** Renders children only on screens ≥990px wide. Below that threshold, shows a full-page "use a larger screen" message. Wraps the entire dashboard layout.

**Anatomy:**
- When ≥990px: renders `children` unmodified.
- When <990px: renders `flex h-full min-h-screen items-center justify-center bg-background px-6` containing centred text:
  - `text-2xl font-bold text-foreground` "BigBrain" mark.
  - `text-sm text-muted-foreground leading-relaxed` "BigBrain works best on a larger screen. / Please view on a desktop or laptop." (canonical message text — change here, not in consumer).

**Behavioural states:**
- **Server render**: always renders children (no `window`).
- **Client mount**: measures `window.innerWidth`; if too small, swaps to the message.
- **Resize**: subscribes to `window.resize`; switches in/out as the user resizes.

**Edge cases:**
- **Hydration**: server renders children to avoid mismatch; client may then swap to the message after first paint. Acceptable trade-off; alternative (server-side viewport detection) isn't reliable in Next.js.

**Props:**
```ts
interface ScreenSizeGateProps {
  children: React.ReactNode
}
```

**Do not:**
- Lower the 990px threshold without checking the dashboard layout — many DNA detail views assume a 64-col layout that breaks below this.
- Change the message text without updating this spec — single source of truth.

---

### ExpandableCardList

**File:** `02-app/components/expandable-card-list.tsx`
**Purpose:** Generic list of expandable cards for editing JSONB array items in detail views. Each item is a collapsible card showing primary + secondary text when collapsed and full editable form fields when expanded. Add / delete (with inline confirm) / debounced save. Generic over `T`.

**Anatomy:**
- Outer wrapper: vertical stack of cards.
- Each card: `rounded-lg border border-border bg-card`. Collapsed shows `primary` (text-sm font-medium) + optional `secondary` (text-xs text-muted-foreground). Expanded shows the consumer's `renderExpanded` content + a delete button.
- ChevronDown icon rotates on expand. Plus button at the bottom adds a new item.
- Delete: clicking `Trash2` shows inline "Are you sure?" confirm; clicking confirm removes the item and triggers a save.

**Behavioural states:**
- **Collapsed**: shows primary + secondary text only.
- **Expanded** (one at a time — clicking another card collapses the current): shows the full edit form.
- **Saving** (debounced 500ms after last change): visible if a save indicator is rendered upstream (the molecule itself has internal `saving` state but doesn't render a badge).
- **Delete-confirming**: inline "Confirm delete" prompt replacing the trash icon.

**Edge cases:**
- **Empty list**: shows `emptyMessage` text in muted style.
- **Concurrent expand**: only one card expanded at a time.
- **Generic over `T`**: consumer provides `createEmpty` factory + `renderCollapsed` (returns `{ primary, secondary? }`) + `renderExpanded`.

**Props:**
```ts
interface ExpandableCardListProps<T> {
  items: T[]
  onSave: (items: T[]) => Promise<{ ok: boolean }>
  renderCollapsed: (item: T) => { primary: string; secondary?: string }
  renderExpanded: (item: T, onChange: (item: T) => void, index: number) => React.ReactNode
  createEmpty: () => T
  addLabel: string
  emptyMessage: string
}
```

**Do not:**
- Render save feedback inline — it's the consumer's responsibility (typical: parent shows section-level Saved/Failed via InlineField pattern).
- Add a `multi-expand` mode without a spec update.
- Hardcode field shapes — the molecule is generic; type-specific editing belongs in `renderExpanded`.

---

### StringListEditor

**File:** `02-app/components/string-list-editor.tsx`
**Purpose:** Add / remove / inline-edit a list of string values. Each row is hover-deletable; click a row to edit; Enter on the input to add. Used for JSONB string-array fields.

**Anatomy:**
- Optional label header (`text-xs font-medium uppercase tracking-wide text-muted-foreground`).
- Items list: each row `flex items-start gap-2 rounded-md px-2.5 py-1.5 text-sm hover:bg-muted/50`. Display mode shows the string; click switches to inline `Input` for editing. X button (hover-revealed, `opacity-0 group-hover:opacity-100`).
- Add row: `Input` + `Button (ghost, size=sm, Plus icon)`. Empty value disables Add. Enter on the input adds.
- Inline edit: Enter commits, Escape cancels, blur commits. Empty edit deletes.

**Behavioural states:**
- **Idle**: row shown as text.
- **Hover**: row `bg-muted/50`, X button visible.
- **Editing**: row swapped to `Input` autofocused.
- **Saving**: input + add button disabled briefly while the consumer's `onSave` resolves.

**Edge cases:**
- **Empty trim on edit commit**: deletes the item.
- **Duplicate values**: not deduplicated by the molecule (consumer enforces if needed).
- **Whitespace-only add**: ignored (`disabled={!newValue.trim()}`).

**Props:**
```ts
interface StringListEditorProps {
  values: string[]
  onSave: (values: string[]) => Promise<{ ok: boolean }>
  placeholder?: string
  label?: string
}
```

**Do not:**
- Add reorder/drag — separate molecule (`OrderedCardList` covers ordered lists).
- Persist on every keystroke — `onSave` fires on commit only.

**Note:** uses `Input` and `Button` atoms directly. Acceptable inside the molecule (atoms in molecules is correct); flagged in DS-08 audit as a candidate for InlineField use if the row visual is reconsidered.

---

### KeyValueEditor

**File:** `02-app/components/key-value-editor.tsx`
**Purpose:** Edit a flat JSONB object as key-value pairs. Each pair is an editable row (key + value). Special "notes" key (configurable) renders as a textarea below the pairs. Add / remove rows; debounced save.

**Anatomy:**
- Vertical list of key-value rows. Each row: `Input` for key + `Input` for value + `X` remove button.
- Optional "notes" textarea below the pairs (when the data has a `notes` key, configurable via `notesKey` prop).
- Plus button at the bottom to add a new empty pair.
- Numeric coercion: if a value parses as a number, it's stored as a number; otherwise as a string.

**Behavioural states:**
- **Editing** (typing in any field): triggers a 500ms debounced save.
- **Saving**: internal `saving` flag (visible via parent if surfaced).

**Edge cases:**
- **Empty key on key-rename**: removes the pair from the data object.
- **Numeric vs string value**: coerced via `Number(value)` — `'3'` becomes `3`, `'three'` stays `'three'`.
- **Notes key separation**: `notesKey` (default `'notes'`) is excluded from the key-value list and rendered as a dedicated textarea.

**Props:**
```ts
interface KeyValueEditorProps {
  data: Record<string, string | number>
  onSave: (data: Record<string, string | number>) => Promise<{ ok: boolean }>
  notesKey?: string   // default 'notes'
}
```

**Do not:**
- Use this for nested JSONB objects — flat key-value only.
- Allow duplicate keys — consumers should deduplicate upstream if needed; the molecule doesn't enforce uniqueness on rename.

---

### OrderedCardList

**File:** `02-app/components/ordered-card-list.tsx`
**Purpose:** Ordered list of inline-editable cards with add, delete, and up/down reorder. Used for structured JSONB arrays where order matters (key components, flow steps, FAQ ordering). Each card renders configurable fields based on a `fields` array.

**Anatomy:**
- Vertical stack of cards, each `rounded-lg border border-border bg-card p-3`. Drag handle (`GripVertical`) on the left.
- Per-field controls: `text` field uses `<input>` styled as cell-context (no envelope); `textarea` uses `<textarea>` similarly. Field labels are uppercase muted small text above each input.
- Per-card controls (right): up/down chevrons (move within list), Trash2 (delete with inline confirm).
- Add button at the bottom (`Plus`).
- Save indicator: `text-success` "Saved" / `text-destructive` "Save failed" below the list (DS-02 token-driven).

**Behavioural states:**
- **Idle**: cards displayed.
- **Editing**: typing into a field; debounced save fires after change.
- **Saving / Saved / Error**: state machine with bottom-of-list indicator.
- **Delete-confirming**: inline confirm.

**Edge cases:**
- **Empty list**: shows `emptyMessage`.
- **First card up / last card down**: chevron disabled.
- **Save error**: persists "Save failed" until next successful save.
- **Prop sync**: when `items` prop changes (server revalidation), local state syncs only if the prop string differs from the last prop seen — preserves in-flight local edits.

**Props:**
```ts
interface CardField {
  key: string
  label: string
  type: 'text' | 'textarea'
  placeholder?: string
  rows?: number
}

interface OrderedCardListProps {
  items: CardItem[]
  fields: CardField[]
  onUpdate: (items: CardItem[]) => Promise<{ ok: boolean; error?: string }>
  emptyMessage: string
  addLabel: string
  newItemDefaults?: (sortOrder: number) => CardItem
}
```

**Do not:**
- Replace with a drag-and-drop library — current up/down chevrons are deliberate (simpler, accessible).
- Use for unordered data — `StringListEditor` or `KeyValueEditor` covers those cases.

**Note:** uses native `<input>` and `<textarea>` per the cell-context input convention. Save feedback uses DS-02 tokens (`text-success`).

---

### ItemLinker

**File:** `02-app/components/item-linker.tsx`
**Purpose:** Inline search + pick affordance for linking an existing item to a parent entity. Search input + scrollable result list + click to link. Used in client-projects and missions to link existing missions / projects / inputs without leaving the workspace.

**Anatomy:**
- Outer wrapper: `rounded-lg border border-border bg-card p-3 shadow-sm`.
- Top row: search input (with magnifying-glass icon, `pl-8`) + close button (X, ghost icon button).
- Results list: `max-h-48 overflow-y-auto`. Each result is a button row: `label` (font-medium) + optional `sublabel` (text-[11px] muted). Hover `bg-muted/50`. Linking state: spinner replaces empty space.
- Empty / loading states with appropriate messages.

**Behavioural states:**
- **Loading**: centered `Loader2` spinner.
- **Empty (no results)**: muted "No X found" / "No X available to link" message.
- **Linking** (specific item): button disabled with spinner.
- **Linked**: item removed from results list (no double-link).

**Edge cases:**
- **Initial load**: fires `onSearch('')` on mount to show available items.
- **Search failure**: silently empties results (consumer handles error UX).
- **Link failure**: silently leaves the item in the list (consumer surfaces the error).

**Props:**
```ts
interface ItemLinkerProps {
  entityLabel: string                                        // e.g. "missions"
  onSearch: (query: string) => Promise<SearchResult[]>
  onLink: (itemId: string) => Promise<void>
  onClose: () => void
}

interface SearchResult { id: string; label: string; sublabel?: string }
```

**Do not:**
- Render search results outside the molecule's container — the floating-card chrome is part of the spec.
- Add multi-select — single-link only.

**Note:** uses `Input` and `Button` atoms directly. Internal use of atoms inside a molecule is correct.

---

### ToolCallIndicator

**File:** `02-app/components/tool-call-indicator.tsx`
**Purpose:** Collapsible pill showing an LLM tool call — name, key parameter, optional expanded result. Rendered inline with assistant chat messages. Distinct icon per tool type.

**Anatomy:**
- Outer wrapper: `mb-1`.
- Trigger row: `<button>` containing the tool icon (per `TOOL_CONFIG` map: `Search`, `Dna`, `FileText`, `Network`, etc.), the human-readable label, the description from args, and a chevron. Compact size: `text-[11px]`. Default: `text-xs`.
- Loading state (`state === 'call' || 'partial-call'`): subtle pulse / spinner indication.
- Expanded state: shows truncated result block below the trigger.

**Behavioural states:**
- **Idle**: pill collapsed.
- **Loading**: indicator shows the tool is mid-call.
- **Completed**: pill is clickable to expand.
- **Expanded**: result rendered below; click again to collapse.

**Edge cases:**
- **Unknown tool name**: falls back to `Search` icon + the raw `toolName` as label.
- **Args undefined**: description omitted.
- **Result undefined**: expanded state shows nothing useful — consumer should not render an expandable indicator without a result.

**Props:**
```ts
interface ToolCallIndicatorProps {
  toolName: string
  args?: Record<string, unknown>
  result?: unknown
  state?: string             // 'call' | 'partial-call' | other
  compact?: boolean
}
```

**Tool config:** lives in the file as a map from tool name to `{ icon, label }`. New tools added there.

**Do not:**
- Auto-expand by default — users opt in to seeing tool details.
- Render large raw JSON results — truncate.

---

### ChatMessage

**File:** `02-app/components/chat-message.tsx`
**Purpose:** Renders a single chat message. User vs assistant role discrimination. User messages: right-aligned muted bubble. Assistant messages: left-aligned flat with markdown rendering and tool call indicators above text.

**Anatomy:**
- **User message**: `flex justify-end`, inner `max-w-[80%]` `rounded-2xl bg-muted px-4 py-3 text-sm text-foreground`. Whitespace preserved (`whitespace-pre-wrap`). File attachments (images) shown below the bubble in a flex-wrap row.
- **Assistant message**: left-aligned, no bubble. Tool call indicators (if any) render above the text via `ToolCallIndicator`. Text content rendered via `MarkdownRenderer`.
- Compact variant: smaller text size for use in `ChatDrawer`.

**Behavioural states:**
- **Streaming** (assistant): partial content rendered as it arrives.
- **Tool call in progress**: `ToolCallIndicator` shows loading state above the assistant text.

**Edge cases:**
- **File parts (user)**: only image files render inline; other file types show a generic indicator (currently images only — extend if needed).
- **Empty parts**: rare but renders an empty bubble.

**Props:**
```ts
interface ChatMessageProps {
  message: UIMessage   // from 'ai' SDK
  compact?: boolean
}
```

**Composes:** `MarkdownRenderer` for assistant text rendering. `ToolCallIndicator` for tool calls.

**Do not:**
- Render user markdown — user input is plain text.
- Add avatar / timestamp inline — those belong at the conversation level if added.

---

### ChatInput

**File:** `02-app/components/chat-input.tsx`
**Purpose:** Auto-growing textarea with attach button, send/stop button. Enter sends, Shift+Enter inserts newline. Image preview with remove. Disabled during streaming. Used in full chat page and ChatDrawer.

**Anatomy:**
- Outer wrapper: container with file preview row (when files attached) above the input row.
- Input row: `Paperclip` button (file picker trigger) + auto-growing `<textarea>` + `ArrowUp` (send) / `Square` (stop) button.
- File preview: thumbnails for images with X button to remove.
- Auto-resize: textarea grows up to a max height, then scrolls.
- Compact variant: smaller padding/text size.

**Behavioural states:**
- **Idle**: send button disabled when text is empty.
- **Typing**: send button enabled.
- **Streaming**: send button replaced by stop button (`Square` icon).
- **Disabled** (parent flag): all controls disabled.

**Edge cases:**
- **`pendingValue` prop**: when set, populates the textarea (used by prompt starters). `onPendingValueConsumed` fires after the value is read.
- **Empty submission**: ignored.
- **Shift+Enter**: inserts newline.
- **Enter alone**: submits if text non-empty + not streaming + not disabled.

**Props:**
```ts
interface ChatInputProps {
  onSend: (text: string, files?: File[]) => void
  onStop?: () => void
  isStreaming?: boolean
  disabled?: boolean
  compact?: boolean
  placeholder?: string                              // default 'Ask BigBrain anything...'
  pendingValue?: string
  onPendingValueConsumed?: () => void
}
```

**Do not:**
- Hardcode the streaming/stop logic — `onStop` is called by the parent if provided.
- Allow non-image file uploads without explicit spec update — current behaviour is image-focused.

**Note:** `chat-input.tsx` is explicitly out of scope for DS-04 form-control standardisation (DS-04 § Out of scope) — its requirements are unique enough that wrapping it in `InlineField` would be wrong.

---

### PromptStarter

**File:** `02-app/components/prompt-starter.tsx`
**Purpose:** Clickable suggestion chip shown in chat empty state. Clicking populates the chat input via `onClick(text)`.

**Anatomy:**
- `<button>` with `rounded-lg border border-border px-4 py-3 text-left text-sm text-muted-foreground`.
- Hover: `hover:bg-muted hover:text-foreground`.

**Behavioural states:**
- Idle / hover only — no other states.

**Props:**
```ts
interface PromptStarterProps {
  text: string
  onClick: (text: string) => void
}
```

**Do not:**
- Send the prompt directly on click — it should only populate the input. The user reviews / edits before sending.
- Add an icon — current minimal style is intentional.

---

### ConversationList

**File:** `02-app/components/conversation-list.tsx`
**Purpose:** Chat history left panel. Vertical list of conversations, grouped by relative date (Today, Yesterday, Previous 7 days, This month, Older). Active state, hover-archive. Collapsible to a 48px icon strip.

**Anatomy:**
- **Expanded**: `flex flex-col w-64 shrink-0 border-r border-border`. Header with "+ New chat" and collapse toggle. Below: scrollable list grouped by date with section headers (`text-[11px] uppercase tracking-wide text-muted-foreground`). Each item: `rounded-md px-3 py-2 text-sm`, hover `bg-muted/50`, active `bg-muted`.
- **Collapsed**: `w-12` strip with vertical icons — new-chat plus, expand toggle.
- Hover-archive: `Trash2` button revealed on hover, optimistically removes from list.

**Behavioural states:**
- **Idle / hover / active**: per item.
- **Collapsed / expanded**: panel-level state.
- **Archiving** (specific item): optimistic removal; item deleted from server in background.

**Edge cases:**
- **No conversations**: panel still renders header; empty list area.
- **Archive failure**: silently leaves the item removed locally (server state may diverge — minor; flag for DS-06).

**Props:**
```ts
interface ConversationListProps {
  conversations: ConversationSummary[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
}
```

**Do not:**
- Add sort options inline — date grouping is the canonical sort.
- Add multi-select — single-select only.

---

### ChatDrawer

**File:** `02-app/components/chat-drawer.tsx`
**Purpose:** Slide-out drawer from the right for contextual chat from any page. 440px wide, backdrop overlay, compact message rendering. Header with new-chat button, title, open-in-full-view, close. Distinct from full chat page (`/chat`) — same `ChatArea` inside, different chrome.

**Anatomy:**
- Backdrop: `fixed inset-0 z-40 bg-foreground/20`.
- Drawer panel: `fixed right-0 top-0 bottom-0 z-50 w-[440px] bg-card shadow-overlay`. Slides in from right via `motion`/`framer-motion`.
- Header: row with `Plus` (new chat), title, `ExternalLink` (open in full chat page), `X` (close). All icon buttons.
- Body: `ChatArea` component (shared with full chat page) in compact mode.

**Behavioural states:**
- **Closed**: nothing rendered.
- **Open**: backdrop + panel visible, animated in.
- **Closing**: animated out via `AnimatePresence`.
- **Escape key**: closes the drawer.

**Edge cases:**
- **Open in full view**: navigates to `/chat/{conversationId}` if a conversation is active, else `/chat`.
- **New chat from drawer**: resets local conversationId to null.

**Props:**
```ts
interface ChatDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}
```

**Composes:** `ChatArea` from `app/(dashboard)/chat/chat-area`. (Cross-imports an organism — flagged in DS-08 audit; chat-area is reused in both contexts and will likely move to `components/` in a future cleanup.)

**Do not:**
- Render the backdrop without `pointer-events` correct — it must trap clicks.
- Use this for non-chat content. It's chat-specific by design.

---

### MarkdownRenderer

**File:** `02-app/components/markdown-renderer.tsx`
**Purpose:** Wraps `react-markdown` + `remark-gfm` with token-only heading, list, code, link, table, and blockquote styles. Used by chat messages and any other markdown-rendering surface.

**Anatomy:**
- Outer wrapper: `text-sm leading-relaxed text-foreground` (or `text-[13px]` if `compact`).
- Per-element components map to token-only classes:
  - h1 / h2 / h3: `font-heading`, semantic sizes (`text-lg`, `text-base`, `text-sm`), spacing (`mt-4 mb-2 first:mt-0`).
  - p: `mb-3 last:mb-0`.
  - ul / ol: `mb-3 pl-5 list-{disc,decimal} space-y-1 last:mb-0`.
  - strong: `font-semibold`. em: `italic`.
  - a: `text-primary underline underline-offset-2 hover:text-primary/80`. Always `target="_blank" rel="noopener noreferrer"`.
  - blockquote: `border-l-2 border-primary/40 pl-4 text-muted-foreground italic`.
  - code (inline): `rounded bg-muted px-1.5 py-0.5 font-mono text-xs`.
  - code (block): `block rounded-md bg-muted px-4 py-3 font-mono text-xs overflow-x-auto`.
  - table: wrapped in `overflow-x-auto`, `border-collapse text-xs`, header `border-b border-border`, cells `border-b border-border/50`.
  - hr: `my-4 border-border`.

**Behavioural states:**
- Stateless render — all styling determined by the markdown content.

**Props:**
```ts
interface MarkdownRendererProps {
  content: string
  compact?: boolean   // smaller text — default false
}
```

**Do not:**
- Add custom remark plugins beyond `remark-gfm` without updating the spec.
- Open links in the same tab — always `target="_blank"`.
- Use this for non-trusted markdown without sanitising upstream — the renderer doesn't escape arbitrary HTML; rely on `react-markdown`'s defaults.

---

### IdeaCaptureModal *(light)*

**File:** `02-app/components/idea-capture-modal.tsx`
**Purpose:** Quick-capture modal for ideas / questions. Opened from `TopToolbar` lightbulb or from `IdeasPanel`. Type toggle (idea / question) + textarea + Capture button. Auto-records the originating page URL. ⌘+Enter to submit.

**Composes:** `Modal` (size=md). Uses native `<textarea>` per the cell-context input convention. Type toggle via shadcn `ToggleGroup` (or similar — verify on read).

**Spec:**
- Modal title: "Capture an idea" (or similar — type-aware).
- Type toggle: `idea` | `question`. Defaults to `idea`. Visual: pill toggle.
- Textarea: autofocus on open, ⌘+Enter submits.
- Optional `autoTag` prop tags the captured idea to a given entity immediately on save (used from `IdeasPanel`).
- `onCaptured` callback fires after successful save.
- On submit: server action saves idea, modal closes, toast confirms.

**Props:** `open`, `onOpenChange`, `autoTag?: { entityType, entityId, entityLabel? }`, `onCaptured?: () => void`.

**Do not:**
- Add validation beyond non-empty text. Quick-capture is intentionally low-friction.
- Block submit on slow saves — fire-and-forget UX.

---

### IdeasList *(light)*

**File:** `02-app/components/ideas-list.tsx`
**Purpose:** Vertical list of idea/question items with two-dimensional filter pills (status × type), inline text editing, status/type toggling per row, optimistic delete with undo toast, polymorphic entity tagging. Used standalone in `/inputs/ideas` and embedded inside `IdeasPanel`.

**Composes:** native `<input>` for inline edit (cell-context convention). Inline filter pills + tag pills are still inline-styled (DS-07 territory — flagged in audit).

**Spec:**
- Top: filter pill row (status: all / captured / shelved / done) and type pill row (all / idea / question). AND-logic.
- Each row: leading status indicator + text + trailing type/status toggle controls + delete button (hover-revealed). Done items: `text-success`. Shelved: opacity-60.
- Inline edit: click text to edit; blur or Enter saves.
- Status / type changes: optimistic + revert on error.
- Delete: optimistic remove + undo toast.
- Filter persistence: not persisted across sessions (client state only).
- Truncation: 2 lines, "Show more" reveals full text.
- `contextFilter` prop scopes the list to a specific entity (mission / project / asset) — adds a one-click "Link" affordance.

**Props:** `ideas`, `tagsMap?`, `taggableEntities?`, `showFilters?` (default true), `onCaptureClick?`, `contextFilter?`, `onTagsChange?`.

**Do not:**
- Render filter pills as a different molecule yet — DS-07 will absorb them into a `FilterPill` molecule. Until then, inline.
- Persist filter state across sessions without explicit user opt-in.

**Note:** filter pills and per-row status pills are inline-styled — they should become `FilterPill` and a tag/status pattern under DS-07.

---

### IdeasPanel *(light)*

**File:** `02-app/components/ideas-panel.tsx`
**Purpose:** Embeddable Ideas & Questions section for entity workspaces (missions, client projects, taggable entities). Wraps `IdeasList` inside a `SectionCard` with two tabs: "This [entity]" (scoped) and "All ideas" (wider pool with one-click Link affordance).

**Composes:** `SectionCard`, `TabbedPane`, `IdeasList` (scoped + all variants), `IdeaCaptureModal` (with `autoTag` set to the parent entity).

**Spec:**
- Outer: SectionCard titled "Ideas & Questions" (configurable via `title` prop).
- Capture button (top-right action slot of SectionCard): opens IdeaCaptureModal with `autoTag` set.
- Tabs: "This [entity]" tab shows `IdeasList` filtered to entity-tagged ideas; "All ideas" tab shows the full pool with a Link affordance.

**Props:** `entityType`, `entityId`, `entityLabel`, `allIdeas`, `tagsMap`, `taggableEntities`, `title?`.

**Do not:**
- Render IdeasList without IdeasPanel chrome inside an entity workspace — the tabs / capture button are part of the contract.

---

### VocTable *(light)*

**File:** `02-app/components/voc-table.tsx`
**Purpose:** Inline-editable table of VOC statements (problems, desires, objections, beliefs) for an audience segment. Filter pills with count badges (warning-coloured below minimum). Add dropdown, multi-select delete with optimistic removal. Inline cell editing on click.

**Composes:** shadcn `Table`, `Checkbox`, `DropdownMenu`. `TypeBadge` for category column (DS-02). `InlineCellSelect` for category cell editing (DS-04). `Button` atom directly. Native `<textarea>` for inline editing per cell-context convention.

**Spec:**
- Filter pills: category buttons with count badges; below minimum count, count is in `text-warning`.
- Add: dropdown to choose which type of VOC to add.
- Row: checkbox + type badge + statement text (click to edit) + category cell (click to change via InlineCellSelect) + delete.
- Delete: multi-select via checkbox + bulk delete button.
- Saves: per-row optimistic via parent server action.

**Props:** `segmentId`, `problems`, `desires`, `objections`, `sharedBeliefs`.

**Do not:**
- Move the filter pills into the SectionCard header — they belong inside the table chrome.
- Persist filter state across sessions.

---

### VocMapping *(light)*

**File:** `02-app/components/voc-mapping.tsx`
**Purpose:** Checklist mapping a knowledge asset or offer to specific VOC statements from an audience segment. Four grouped checklists (problems / desires / objections / shared beliefs). Check / uncheck saves immediately (parent batches). Shared between knowledge assets and offers.

**Composes:** `CheckboxField` (DS-04). `TypeBadge` (DS-02) for category indicators inside checkbox labels. Uses shared `VOC_MAPPING_KIND_HUES` map (DS-02).

**Spec:**
- Renders 4 sections (one per VOC type) with section header showing count.
- Each row: CheckboxField with the statement text + a TypeBadge for category (when present).
- Out-of-range items (statement removed from segment): rendered disabled with "(statement removed)" label.
- Empty state: muted "Select a primary audience..." message.

**Props:** `segment`, `mapping`, `onToggle`.

**Do not:**
- Rebuild the checkbox row inline — use CheckboxField.

---

### EntityOutcomesPanel *(light)*

**File:** `02-app/components/entity-outcomes-panel.tsx`
**Purpose:** Grouped CRUD panel for entity outcomes (outcomes / benefits / advantages / features / bonuses / FAQs). Add dropdown per kind, inline edit, delete with confirm. Shared between knowledge assets and offers.

**Composes:** `Button`, `SectionDivider`, `InlineCellSelect` (DS-04). Native cell-context `<input>` and `<textarea>`.

**Spec:**
- Per-kind sections separated by `SectionDivider`.
- Per-row: inline-editable question / body / value-statement / objection-addressed / category / faqType (kind-dependent fields).
- Add dropdown: `Plus` button with menu of kinds to add.
- Delete: trash icon + inline confirm.
- Save: debounced 500ms via `handleUpdate` action.

**Props:** `outcomes`, `parentType` (`knowledgeAsset` | `offer`), `parentId`, `brandId`.

**Do not:**
- Treat all kinds identically — FAQs have a faqType cell that other kinds don't.

---

### CustomerJourneyPanel *(light)*

**File:** `02-app/components/customer-journey-panel.tsx`
**Purpose:** 5-stage customer journey editor (awareness → consideration → conversion → retention → advocacy). Each stage has thinking / feeling / doing / pushToNext fields as `InlineField` textareas. Generate button calls LLM. Regenerate button with confirmation dialog. Used in offer detail view.

**Composes:** `InlineField` (textarea variant), `Button`. Generate flow uses a confirmation `Modal`.

**Spec:**
- Stage list: 5 stages, each in a labelled section.
- Per-stage: 4 InlineField textareas (thinking / feeling / doing / push to next).
- Top action: Generate (when all empty) / Regenerate (when populated).
- Regenerate: opens confirmation Modal — destructive action.

**Props:** `offerId`, `journey` (CustomerJourneyStage[] | null), `onSaveField`.

**Do not:**
- Allow regenerate without confirmation — destructive of human-edited content.

---

### SourceMaterialsTable *(light)*

**File:** `02-app/components/source-materials-table.tsx`
**Purpose:** Reusable table of linked source documents. Shows title, type badge, date, file size. Link / unlink actions. Row click expands to show extracted text preview. Uses `SourceDocPicker` for linking new docs.

**Composes:** shadcn `Table`. `SourceDocPicker` for the link flow. Native `<button>` for row expand toggle.

**Spec:**
- Columns: Title, Type, Date, Size, Actions.
- Row click: expands inline to show extracted-text preview (truncated to ~500 chars).
- Link button: opens `SourceDocPicker` with current `sourceDocumentIds` excluded.
- Unlink: per-row, optimistic removal.

**Props:** `sourceDocumentIds`, `brandId`, `onLink`, `onUnlink`.

**Do not:**
- Allow inline editing of source doc fields here — this is a linking table; full editing happens in `/inputs/sources`.

---

### CreateSegmentModal *(light)*

**File:** `02-app/components/create-segment-modal.tsx`
**Purpose:** 3-step creation modal for audience segments. Step 1: path selection + identity. Step 2: core VOC. Step 3: demographics. Generate button currently shows coming-soon toast. Save-as-draft submits to DB and navigates to new segment.

**Composes:** `Modal` (size=lg or xl — verify), `InlineField`, `SelectField`, `Button`.

**Spec:**
- Multi-phase modal — phase indicator (1/3 etc.).
- Phase footers: "Back" + "Next →" / "Generate" / "Save as draft".
- Save as draft: writes `status='draft'` + navigates to `/dna/audience-segments/[id]`.
- Generate: stubbed (toast). Wired up later.

**Props:** `open`, `onOpenChange`.

**Do not:**
- Skip the phase model — even when only some phases have content. Phases are part of the spec.

---

### CreatePlatformModal *(light)*

**File:** `02-app/components/create-platform-modal.tsx`
**Purpose:** Multi-step creation modal for channels. Path step (sources vs questions) → optional sources step → identity step (category cards on top, channel + name + handle revealed inline once a category is picked) → strategy context step → evaluation + follow-ups. Follows GEN-01 evaluate/generate pattern.

**Composes:** `Modal`, `Input`, `Textarea`, `SelectField` (DS-04 — used for channel select), `SourceDocPicker`, `Button`. Reads vocabulary from `lib/types/channels.ts` (`CATEGORIES`, `CATEGORY_LABELS`, `CATEGORY_DESCRIPTIONS`, `channelsForCategory`, `CHANNEL_LABELS`).

**Spec:**
- Multi-phase as described above.
- Identity step: 4×2 grid of category cards. Selecting a category resets channel + name (handle preserved). Selecting a channel auto-fills name from `CHANNEL_LABELS[channel]` (user can edit).
- Generate flow: evaluate API → generation → follow-up Q&A → finalise.
- Save-as-draft option in early phases.

**Props:** `open`, `onOpenChange`, `brandId?`.

**Do not:**
- Skip the evaluation phase — it gates generation.
- Auto-advance after selecting a category — the user needs to see the revealed channel/name/handle block before moving on.

---

### ChangeCategoryChannelModal *(light)*

**File:** `02-app/components/change-category-channel-modal.tsx`
**Purpose:** Inline modal for changing a channel row's `category` and `channel` post-creation. Used by the platform detail view via the "Change category / channel" link in the left panel.

**Composes:** `Modal`, `SelectField` (DS-04), `Button`. Reads vocabulary from `lib/types/channels.ts`.

**Spec:**
- Two `SelectField`s: category (8 options), channel (scoped to selected category — re-populates if category changes; resets value to first option of new category if current channel becomes invalid).
- Warning callout shown only when `category !== currentCategory`: `bg-warning-bg text-warning-foreground` pill with copy "Changing category may hide some fields and show others. No data will be deleted."
- Save calls `updatePlatformCategoryAndChannel` server action atomically. No data deletion regardless of which fields become hidden — per DNA-07b decision (allowed-with-warning).

**Props:** `open`, `onOpenChange`, `platformId`, `currentCategory`, `currentChannel`.

**Do not:**
- Render outside the channel detail view — this modal is scoped to that surface.
- Add any "delete data tied to old category" affordance — the policy is permissive.

---

### CreateAssetModal *(light)*

**File:** `02-app/components/create-asset-modal.tsx`
**Purpose:** 5-phase creation modal for knowledge assets. Phase 1: context path (sources or chat). Phase 2: source-doc selection. Phase 3: metadata (name, kind, audience). Phase 4: VOC mapping. Phase 5: interlocutor generation with follow-up questions.

**Composes:** `Modal`, `InlineField`, `SelectField` (DS-04 — kind, audience), `CheckboxField` (DS-04 — VOC mapping checklists), `SourceDocPicker`, `TypeBadge`, `Button`.

**Spec:**
- 5-phase wizard, phase indicator visible.
- Phase 1: choose source-driven or chat-driven creation path.
- Phase 4: VOC mapping checklists for problems/desires/objections/beliefs (uses `CheckboxField`).
- Phase 5: streaming generation with follow-up question Q&A.

**Props:** `open`, `onOpenChange`, `brandId`, `segments`.

**Do not:**
- Skip phases — even if user could "fast-forward". Phases are deliberate.

---

### CreateMissionModal *(light)*

**File:** `02-app/components/create-mission-modal.tsx`
**Purpose:** Single-step creation modal for research missions. Name (required), thesis (optional), verticals multi-select with inline create. Navigates to mission workspace on success.

**Composes:** `Modal` (size=md), `InlineField`, `Button`. Verticals multi-select uses inline `<input>` + ad-hoc tag chips (no molecule yet — flagged for future).

**Spec:**
- Fields: Name, Thesis (optional), Verticals (multi-tag with inline create).
- On submit: creates mission + navigates to `/projects/missions/[id]`.

**Props:** `open`, `onOpenChange`.

**Do not:**
- Add a phase model — single-step is intentional for missions.

**Note:** verticals multi-tag input is a candidate for a `MultiTagInput` molecule (future ticket).

---

### CreateProjectModal *(light)*

**File:** `02-app/components/create-project-modal.tsx`
**Purpose:** Single-step creation modal for client projects. Organisation picker with inline create, project name (required), brief (optional). Navigates to workspace on success.

**Composes:** `Modal` (size=md), `InlineField`, `SelectField` (org picker), `Button`.

**Spec:**
- Fields: Organisation (existing or inline create new), Project name (required), Brief (optional).
- On submit: creates project + navigates to `/projects/clients/[id]`.

**Props:** `open`, `onOpenChange`.

**Do not:**
- Add a phase model — single-step is intentional.

---

### CreateOfferModal *(light)*

**File:** `02-app/components/create-offer-modal.tsx`
**Purpose:** 3-phase creation modal for offers. Phase 1: quick form (name, type, audience). Phase 2: VOC mapping (checklists). Phase 3: interlocutor generation with follow-up questions. Follows GEN-01 evaluate/generate pattern.

**Composes:** `Modal`, `InlineField`, `SelectField` (DS-04 — type, audience), `CheckboxField` (DS-04), `TypeBadge`, `Button`.

**Spec:**
- Phase 1: name / type / audience selection.
- Phase 2: VOC checklists (uses `CheckboxField`).
- Phase 3: streaming generation with follow-ups.

**Props:** `open`, `onOpenChange`, `brandId`, `segments`.

**Do not:**
- Skip the VOC phase even if no VOC items match — empty state is acceptable.

---

### CreateApplicationModal *(light)*

**File:** `02-app/components/create-application-modal.tsx`
**Purpose:** Modal for creating a Tone of Voice "Application" (a per-format ToV variant — e.g. social, blog, email). Used inside the Tone of Voice page's Applications tab.

**Composes:** `Modal` (size=md), `InlineField`, `SelectField` (DS-04 — formatType), `Button`.

**Spec:**
- Fields: format type (select), name (optional override), generation parameters.
- Single-step.
- On submit: creates application record + closes modal + parent refreshes the Applications list.

**Props:** `open`, `onOpenChange`, `tovId`, `onCreated?`.

**Do not:**
- Use this for editing an application — edits happen inline in the Applications tab.

---

### Archive modal (shared pattern)

**Files:** `archive-segment-modal.tsx`, `archive-platform-modal.tsx`, `archive-asset-modal.tsx`, `archive-offer-modal.tsx`
**Purpose:** Confirmation modal for archiving a DNA item. Shared structural pattern across all four; type-specific labels and dependent-checking logic.

**Composes:** `Modal` (size=sm), `Button`. Some variants render an `EmptyState`-like message when dependents are missing.

**Anatomy / behaviour:**
- Modal title: "Archive [type]?" (or "Retire offer?" for offers — minor copy variation).
- Body: confirmation text. If the item has dependent items (e.g. archiving a segment that's referenced by an offer), warning shown listing dependents.
- Footer: Cancel + destructive primary action ("Archive" / "Retire").
- On confirm: status set to archived/retired. If the archived item is currently displayed, redirect to next active item or empty state.

**Behavioural states:**
- **Idle**: confirmation visible.
- **Checking dependents** (on open): brief loading state if check is async.
- **Confirming**: button disabled while server action runs.
- **Success**: modal closes, parent redirects.
- **Error**: toast surfaces failure; modal stays open.

**Per-type variations:**

| File | Status target | Redirect on success | Dependent check |
|---|---|---|---|
| `archive-segment-modal.tsx` | `archived` | Next active segment, or `/dna/audience-segments` empty | Checks if segment is the primary audience for any active offer/asset |
| `archive-platform-modal.tsx` | `isActive: false` | Next active platform, or `/dna/platforms` empty | None currently |
| `archive-asset-modal.tsx` | `archived` | Next active asset, or `/dna/knowledge-assets` empty | Checks if asset is referenced by any active offer |
| `archive-offer-modal.tsx` | `retired` | Next active offer, or `/dna/offers` empty | Checks if offer references any knowledge assets |

**Props (shared shape):**
```ts
interface ArchiveModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  [id]: string         // segmentId / platformId / assetId / offerId
  [name]: string       // segmentName / platformName / assetName / offerName
}
```

**Do not:**
- Treat archive as deletion — items are recoverable from archived state.
- Skip the dependent check when one applies — users need to see what they're breaking.
- Add a bulk-archive variant — single-item archive only.

**Note:** these four files would benefit from refactoring into a single `ArchiveItemModal` molecule with type config, but that's out of DS-03 scope (DS-03 is documentation, not refactor). Flagged for a future ticket.

---

### SourceDocPicker *(light)*

**File:** `02-app/components/source-doc-picker.tsx`
**Purpose:** Modal-based picker for searching and selecting existing source documents. Multi-select with checkboxes per row. Type filter + free-text search. Used by `SourceMaterialsTable` and creation modals.

**Composes:** `Modal` (size=lg), native `<input>` for search, native `<select>` for type filter (DS-04 deferred — toolbar-row context), native `<input type="checkbox">` for row selection (DS-04 deferred — row chrome doesn't fit `CheckboxField` cleanly), `Button`.

**Spec:**
- Modal body: search input (left) + type filter (right) at top; scrollable list of doc rows below.
- Each row: checkbox + type icon + title + type/date metadata.
- Footer: Cancel + "Select N documents" (count-aware).
- `excludeIds` prop hides already-selected docs.

**Props:** `open`, `onOpenChange`, `brandId`, `selected`, `onSelect`, `excludeIds?`.

**Do not:**
- Migrate the type filter to `SelectField` without updating this spec — it's deliberately the toolbar-row pattern.
- Migrate the row checkboxes to `CheckboxField` without re-evaluating row chrome alignment.

**Note:** type filter and row checkboxes are explicitly deferred from DS-04 migration — see DS-04 brief decisions log. Future ticket may revisit.

---

### ConfidenceBadge *(light)*

**File:** `02-app/components/confidence-badge.tsx`
**Purpose:** Coloured confidence-level badge — HIGH (success) / MED (warning) / LOW (muted). Used in extraction results to indicate LLM confidence per extracted item. Token-driven (DS-02).

**Anatomy:**
- `<span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ...">`.
- Variant classes:
  - `high` → `bg-success-bg text-success-foreground`
  - `medium` → `bg-warning-bg text-warning-foreground`
  - `low` → `bg-muted text-muted-foreground`

**Props:**
```ts
interface ConfidenceBadgeProps {
  confidence: 'high' | 'medium' | 'low'
}
```

**Do not:**
- Hardcode hue colours — already token-driven (DS-02).
- Add an `unknown` variant — `low` covers it.

**Note:** moved from `02-app/app/(dashboard)/inputs/process/confidence-badge.tsx` to `02-app/components/confidence-badge.tsx` in DS-03 (registered molecules belong in `components/`).

---

### ApplicationsTab *(light)*

**File:** `02-app/components/applications-tab.tsx`
**Purpose:** Tab content for the Tone of Voice page's "Applications" tab. Shows the list of per-format ToV applications (e.g. social, blog, email) — each with its dimension deltas as `SliderField` (zero-centred variant from DS-04). Add new application via `CreateApplicationModal`.

**Composes:** `SectionCard` per application, `SliderField` (zero-centred — DS-04), `InlineField`, `Button`, `CreateApplicationModal`.

**Spec:**
- Top-of-tab: "Applications" heading + "+ New application" button (opens CreateApplicationModal).
- Per application: SectionCard with name + format type pill + 4 zero-centred SliderFields (one per ToV dimension) showing deltas from the base ToV in the range -50..+50.
- Each slider is independent — saves on commit.
- Empty state: "No applications yet" + create CTA.

**Props:** `tov` (DnaToneOfVoice), `applications` (DnaTovApplication[]).

**Do not:**
- Show the absolute dimension scores here — applications are deltas, not full re-specs.

---

### FloatingMenu

**File:** `02-app/components/floating-menu.tsx`
**Purpose:** Token-driven popover container. Owns positioning, raised shadow, click-outside dismissal, and Escape-key dismissal. Used internally by `StatusBadge` and `ActionMenu`; also available for direct use anywhere a popover trigger / panel pattern is right. Distinct from shadcn `Popover` — thinner, no portal, no collision detection, no animations. The intentional minimum so popover behaviour is consistent across the app without rebuilding the same `useEffect` + absolute-positioned div in every consumer.

**Anatomy:**
- Wrapper: `<div className={containerClassName}>` — defaults to `relative inline-flex`. Consumer can pass a block-level wrapper class via `containerClassName` if the trigger needs full width.
- Trigger: rendered as-is via the `trigger` prop. Consumer owns the trigger element, its onClick toggling, and its accessibility attributes.
- Panel (when `open`): `absolute z-50 rounded-md border border-border bg-card shadow-[var(--shadow-raised)] py-1` plus alignment classes from `align` (`start` → `left-0`; `end` → `right-0`) and side classes from `side` (`bottom` default → `top-full mt-1`; `top` → `bottom-full mb-1`).

**Behavioural states:**
- **Closed:** trigger only; panel not rendered.
- **Open:** panel rendered; click-outside listener active; Escape listener active.
- **Closing:** instant. No transitions in v1.

**Behaviour:**
- `useEffect` attaches `mousedown` + `keydown` listeners only when `open === true`. Cleanup removes them.
- Click outside the wrapper container fires `onOpenChange(false)`.
- Escape fires `onOpenChange(false)` — focus stays where it was (no automatic return).
- **No automatic initial focus.** Trigger keeps focus on open. Keyboard users `Tab` into the panel naturally because it's a sibling element after the trigger in DOM order.

**Edge cases:**
- **Nested menus:** each FloatingMenu owns its own `containerRef`. Click outside the inner menu but inside the outer is outside the inner's container → inner closes, outer stays open. This is correct behaviour.
- **Trigger is a button + panel item is also a button:** no conflict — trigger handles its own toggling via the consumer's onClick.

**Props:**
```ts
interface FloatingMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: React.ReactNode
  children: React.ReactNode
  align?: 'start' | 'end'        // default 'start'
  side?: 'bottom' | 'top'        // default 'bottom'
  minWidth?: string              // applied as inline style
  className?: string             // applied to the panel only
  containerClassName?: string    // applied to the wrapper
}
```

**Do not:**
- Add a portal. If positioning context becomes a problem, migrate to shadcn `Popover` rather than reinventing.
- Add open/close transitions in v1 — match existing instant feel.
- Inject `aria-haspopup` / `aria-expanded` on the trigger — that belongs on the consumer's trigger element.
- Use `<button>` as the wrapper — must stay a `<div>` so the trigger element retains its own role.

---

### ActionMenu

**File:** `02-app/components/action-menu.tsx`
**Purpose:** Generic context-action dropdown menu. Wraps `FloatingMenu` with item chrome (action / link / disabled / divider). Owns its own open state — sealed unit, drop-in replacement for ad-hoc DropdownMenu compositions. Use for overflow menus, quick-action triggers, "more options" dropdowns. Distinct from `StatusBadge` (which is for status selection specifically) and `ItemSwitcher` (which is a pill-strip with dropdown for cross-item navigation).

**Anatomy:**
- Owns `useState<boolean>` for open/close.
- Wraps `FloatingMenu` (`align` default `'end'`, `minWidth` default `'12rem'`).
- Renders one element per item via the discriminated `ActionMenuItem` union:
  - `'action'` → `<button onClick={...}>` with hover bg, optional left icon, optional `destructive` variant.
  - `'link'` → Next.js `<Link>` with same chrome; click fires `onOpenChange(false)` synchronously before navigation.
  - `'disabled'` → same chrome rendered as `<div>`, `opacity-50 cursor-not-allowed`. Optional `hint` rendered right-aligned.
  - `'divider'` → `<div className="h-px bg-border my-1" />`.

**Item chrome (uniform):** `flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors`. Icon: `h-3.5 w-3.5`. Action / link items: `hover:bg-muted`. Destructive action items: `text-destructive hover:bg-destructive/10` (icon also `text-destructive`).

**Props:**
```ts
type ActionMenuItem =
  | { type: 'action';   label: string; icon?: LucideIcon; onClick: () => void; destructive?: boolean }
  | { type: 'link';     label: string; icon?: LucideIcon; href: string }
  | { type: 'disabled'; label: string; icon?: LucideIcon; hint?: string }
  | { type: 'divider' }

interface ActionMenuProps {
  trigger: React.ReactNode
  items: ActionMenuItem[]
  align?: 'start' | 'end'        // default 'end'
  side?: 'bottom' | 'top'        // default 'bottom'
  minWidth?: string              // default '12rem'
}
```

**Do not:**
- Expose FloatingMenu's internals (className overrides on the panel, etc.) — items have fixed chrome.
- Add a "checked" / radio item variant. Use `StatusBadge` for status-style selection.
- Add roving keyboard focus — same v1 reasoning as FloatingMenu.

---

### ListItem

**File:** `02-app/components/list-item.tsx`
**Purpose:** Opinionated list-row shell. Owns padding, hover, and divider tokens via density variants. Composes three slots — `leading`, `children`, `trailing` — letting consumers control row contents without owning chrome. Closes ~12 hand-rolled list-row patterns across the app. Renders as `<div>`, `<Link>`, or `<button>` per the `as` prop.

**Anatomy:**
- Outer element per `as`:
  - `as="div"` (default): `<div>`. If `onClick` provided: adds `role="button"`, `tabIndex={0}`, Enter/Space keyboard handler.
  - `as="link"`: Next.js `<Link href>`.
  - `as="button"`: `<button type="button">`.
- Layout: `flex items-center gap-3`.
- Padding: `density="default"` (default) → `py-3 px-3`; `density="compact"` → `py-1.5 px-2`.
- Divider: `divider={true}` (default) → `border-b border-border`. `divider={false}` for sites where the parent owns separator strategy.
- Slots:
  - `leading?` rendered first.
  - `children` wrapped in `<div className="flex-1 min-w-0">` — consumers can apply `truncate` inside.
  - `trailing?` wrapped in `<div className="flex items-center gap-3 shrink-0">`.

**Behavioural states:**
- **Idle (non-interactive):** no hover; no cursor change.
- **Hover (interactive):** `hover:bg-muted/50 cursor-pointer transition-colors`.
- **Focus-visible (interactive):** `focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.

**Edge cases:**
- **No leading and no trailing:** children fills the row; vertical alignment still correct via `flex items-center`.
- **Long children content:** consumer wraps the relevant child in `truncate` inside the `flex-1 min-w-0` slot.
- **Last row in a list:** `divider={true}` still renders the bottom border. Parent containers that don't want this set `divider={false}` per row, OR use `divide-y divide-border` on a wrapper and `divider={false}` on every row.

**Props:**
```ts
type ListItemDensity = 'default' | 'compact'

interface ListItemBaseProps {
  leading?: React.ReactNode
  children: React.ReactNode
  trailing?: React.ReactNode
  density?: ListItemDensity      // default 'default'
  divider?: boolean              // default true
  className?: string
}

type ListItemProps =
  | (ListItemBaseProps & { as?: 'div';   onClick?: () => void })
  | (ListItemBaseProps & { as: 'link';   href: string })
  | (ListItemBaseProps & { as: 'button'; onClick: () => void })
```

**Do not:**
- Accept `bg`, `padding`, or `hover` props — these are tokens, not customisation surface. If a consumer thinks they need them, that's drift; push back to add a real density variant or new molecule.
- Bake icons into `leading` — different lists want different leading content (icon, status dot, avatar, checkbox).
- Add a `selected` variant in v1 — no current consumer needs it. Build when needed.

---

### FilterPill

**File:** `02-app/components/filter-pill.tsx`
**Purpose:** Visual pill atom for filter rows. Single button with optional leading icon and count. Used by `FilterPillGroup` (state container) but also exportable for ad-hoc filter rows.

**Anatomy:**
- `<button type="button">`, `inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors`.
- Active: `bg-primary text-primary-foreground`.
- Inactive: `bg-secondary text-secondary-foreground hover:bg-secondary/80`.
- Optional icon (left): `<Icon className="h-3 w-3" />`.
- Optional count (right): `<span className="text-[11px]">{count}</span>` with `opacity-70` (active) / `opacity-50` (inactive).

**Behavioural states:**
- Active (state).
- Inactive idle / hover.
- (No disabled variant in v1 — no current consumer needs it.)

**Props:**
```ts
interface FilterPillProps {
  label: string
  active: boolean
  onClick: () => void
  icon?: LucideIcon
  count?: number
}
```

**Do not:**
- Hardcode colours — `bg-primary` / `bg-secondary` tokens only.
- Accept a `variant` prop — there's one shape. Different visual = different molecule.
- Build multi-select state into the pill itself — that's `FilterPillGroup`'s job (or future `MultiFilterPillGroup`).

---

### FilterPillGroup

**File:** `02-app/components/filter-pill-group.tsx`
**Purpose:** Single-select state container for `FilterPill`. Renders an optional left label + the pills row. Closes the duplicated status-group / type-group markup in `ideas-list.tsx`.

**Anatomy:**
- Row container: `flex items-center gap-1.5`.
- Optional left label: `<span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground w-12 shrink-0">{label}</span>`.
- Pills container: `<div className="flex gap-1">{pills}</div>`.
- Each option rendered via `FilterPill`; `active` = `option.value === value`.

**Behaviour:**
- Single-select. `value` is the currently selected option's `value`.
- `onChange(value)` fires on any pill click. Clicking the active pill re-fires `onChange` with the same value.
- No deselect affordance — there's always one selected. Consumers wanting an "All" affordance provide an `'all'` option.

**Edge cases:**
- **`value` doesn't match any option:** all pills render inactive; first click sets `value`. Defensive — consumers should always have a default that matches an option.
- **Empty `options`:** renders an empty pills row (consumer's bug; don't add placeholder).
- **Single option:** renders one pill; clicking re-fires `onChange` (harmless).

**Props:**
```ts
interface FilterPillOption {
  value: string
  label: string
  count?: number
  icon?: LucideIcon
}

interface FilterPillGroupProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: FilterPillOption[]
}
```

**Do not:**
- Multi-select. Future `MultiFilterPillGroup` is a separate molecule when needed.
- Wrap pills onto multiple rows. ≤6 options on one row is the design contract; more = different molecule (filter dropdown, faceted search).

---

### ArchiveItemModal

**File:** `02-app/components/archive-item-modal.tsx`
**Purpose:** Configurable archive confirmation modal. Wraps `Modal` (with `footer` slot). Replaces three near-identical files (`archive-platform-modal`, `archive-offer-modal`, `archive-segment-modal`). General enough to absorb future archive flows (clients, missions, ideas) without API changes.

**Anatomy:**
- Wraps `Modal` (`size="md"`, `title={`Archive "${itemName}"`}`).
- Internal `phase` state: `'checking' | 'confirm' | 'archiving'`.
- `useEffect` watches `open` (per ADR-001 controlled-modal pattern): on `true` → resets phase to `'checking'` → fires `dependencyCheck()`. On result: branch to `'confirm'` (storing dependents) or close + toast on error.
- Confirm button → phase `'archiving'`, fires `onConfirm()`. On success → close + `onArchived?(nextId)`. On error → close + toast.
- Body switches on phase. Footer rendered via Modal's `footer` slot — present in `'confirm'`, omitted in `'checking'` / `'archiving'`.

**Default copy** (token-substituted with `{itemType}`):
- `withDependents`: `"This {itemType} is used by:"`
- `warningWithDependents`: `"These references will remain but show the {itemType} as archived."`
- `withoutDependents`: `"This {itemType} will no longer appear in selection. It will remain visible where already referenced."`

Consumers override via the optional `dependentsCopy` prop — pass any of the three strings to override; unspecified strings fall back to the default template.

**Action shape:**
```ts
dependencyCheck: () => Promise<
  | { ok: true; data: { dependents: { name: string; type: string }[] } }
  | { ok: false; error: string }
>
onConfirm: () => Promise<
  | { ok: true; data: { nextId?: string | null } }
  | { ok: false; error: string }
>
```

This matches the existing platform / segment archive server actions exactly. Offer's existing action returns `redirectTo` instead of `nextId` — consumer adapts in a tiny wrapper at the call site (no action-side change needed).

**Edge cases:**
- **`dependencyCheck` slow:** "Checking…" body holds; footer omitted (no spinning state needed because there's nothing to confirm yet). Modal-level dismissal still works (Escape, backdrop) — in-flight check resolves into a closed modal harmlessly.
- **`onConfirm` slow:** "Archiving…" body holds; footer omitted (avoids Cancel after the user committed).
- **`open` toggles to `false` mid-async:** the cancellation flag in `useEffect` cleanup prevents post-close `setState` calls.

**Props:**
```ts
interface ArchiveCopy {
  withDependents?: string
  warningWithDependents?: string
  withoutDependents?: string
}

interface ArchiveItemModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemName: string
  itemType: string  // singular lowercase, e.g. "channel", "offer", "segment"
  dependencyCheck: () => Promise<...>
  onConfirm: () => Promise<...>
  onArchived?: (nextId: string | null) => void
  dependentsCopy?: ArchiveCopy
}
```

**Do not:**
- Bake routing logic (`router.push`) into the molecule. Leave navigation to `onArchived` so different entity types can land on different pages.
- Hardcode `itemType` in copy beyond the `{itemType}` token. Custom phrasing belongs in `dependentsCopy`.
- Add a "soft delete" / "hard delete" toggle. Soft archive only.

---

### MultiFilterPillGroup

**File:** `02-app/components/multi-filter-pill-group.tsx`
**Purpose:** Multi-select state container for `FilterPill`. Promised by `FilterPillGroup` spec ("multi-select is a future `MultiFilterPillGroup`"). Click any pill toggles inclusion in `values`.

**Anatomy:**
- Row container: `flex items-center gap-1.5`.
- Optional left label: `<span className="w-16 shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</span>`.
- Pills wrap container: `<div className="flex flex-wrap gap-1">{pills}</div>`.
- Each option rendered via `FilterPill`; `active` = `values.includes(option.value)`.

**Behaviour:**
- Multi-select. `values` is the array of currently selected option values.
- `onChange(values)` fires on any pill click — adds the value if not present, removes it if present.
- No deselect-all affordance on the group itself — the parent (e.g. `PickerFilterBar`) provides "Clear all".

**Props:**
```ts
interface MultiFilterPillOption {
  value: string
  label: string
  count?: number
  icon?: LucideIcon
}

interface MultiFilterPillGroupProps {
  label?: string
  values: string[]
  onChange: (values: string[]) => void
  options: MultiFilterPillOption[]
}
```

**Do not:**
- Single-select. That's `FilterPillGroup`.
- Wrap pills onto multiple rows when only a few options. The `flex-wrap` is a safety net for high-density catalogues, not a layout default.

---

### ContentTypeCard

**File:** `02-app/components/content-type-card.tsx`
**Purpose:** Picker tile for one content type in the launch-picker-grid pattern. Compose-only — organisms render a grid of `ContentTypeCard`s; the card encapsulates icon + title + description + favourite-star + locked-state affordance + category/channel badges.

**Anatomy:**
- Outer: `<Link>` (unlocked) or `<div>` (locked). Class set: `group relative flex h-full flex-col rounded-lg border bg-card p-4 transition-colors`. Locked: append `opacity-60`. Unlocked: append `hover:border-foreground/20 hover:bg-muted/30`.
- Top row: favourite-star button (left, `<button>` wrapping `<Star>`, fill applied when `isFavourite`), Lucide icon (centred, 32px, resolved via `getIconByName`), spacer.
- Title: `<h3 className="font-medium text-base">`.
- Description: `<p className="mt-1 line-clamp-2 text-sm text-muted-foreground">` (omitted when `null`).
- Footer: when locked → `<LockBadge>` + `<MissingPrereqDeeplink>` stacked vertically. When unlocked → 1-2 `<TypeBadge>` chips for `pickerGroup` + `channel`.

**Behavioural states:**
- Unlocked, idle / hover.
- Unlocked, favourited (star filled with amber accent — known DS-02 gap; uses `text-amber-500` as a temporary token until semantic state tokens land).
- Locked (no hover effect, deeplink is the only interactive affordance).

**Props:**
```ts
interface ContentTypeCardData {
  id: string
  slug: string
  name: string
  description: string | null
  icon: string | null
  pickerGroup: string
  channel: string
  channelHue: TagHue | 'neutral'
  isFavourite: boolean
  isLocked: boolean
  missingPrereq: { label: string; href: string } | null
}

interface ContentTypeCardProps {
  data: ContentTypeCardData
  onToggleFavourite: (id: string) => void
}
```

**Do not:**
- Render a status badge — content types don't have a workflow state.
- Make the whole card clickable when locked. Locked = card is a `<div>`, only the deeplink is interactive.
- Inline the icon resolution. Always go through `getIconByName` so unknown icons fall back to a default rather than crashing.

---

### PickerFilterBar

**File:** `02-app/components/picker-filter-bar.tsx`
**Purpose:** Top filter row for the `launch-picker-grid` pattern. Two `MultiFilterPillGroup`s + favourites toggle + "Clear all" affordance.

**Anatomy:**
- Outer: `mb-6 flex flex-col gap-3 border-b pb-4`.
- Two `MultiFilterPillGroup` rows (categories then channels). Empty option arrays cause the row to be omitted.
- Bottom row: `flex items-center justify-between` containing `<FilterPill>` for "Favourites only" + `<button>Clear all</button>` (visible only when at least one filter is active).

**Behaviour:**
- All-of intersection across groups; multi-select within each group (handled by the children).
- Clear all wipes categories + channels + favourites toggle in one call to the parent's `onClearAll`.

**Props:**
```ts
interface PickerFilterBarProps {
  categories: MultiFilterPillOption[]
  channels: MultiFilterPillOption[]
  activeCategories: string[]
  activeChannels: string[]
  favouritesOnly: boolean
  onCategoriesChange: (vals: string[]) => void
  onChannelsChange: (vals: string[]) => void
  onFavouritesChange: (val: boolean) => void
  onClearAll: () => void
}
```

**Do not:**
- Merge into a single multi-facet pill row. Each facet stays separate so the user can read filters at a glance.
- Add a search input here — search lives in `PageChrome`'s action slot. Filter bar is for chip filters only.

---

### LockBadge

**File:** `02-app/components/lock-badge.tsx`
**Purpose:** Tiny "Needs an X" pill shown on locked content-type cards (and any future locked launch-pad surfaces). Inline-flex, low visual weight.

**Anatomy:**
- `<span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">`.
- Lock icon 12px (Lucide `Lock`).
- Body text from the `label` prop.

**Props:**
```ts
interface LockBadgeProps {
  label: string  // e.g. "Needs an Offer"
}
```

**Do not:**
- Take a `state` or `hue` prop. Always neutral muted — locked is a single visual concept.
- Make it interactive. Hover/click affordances belong on `MissingPrereqDeeplink` next to it.

---

### MissingPrereqDeeplink

**File:** `02-app/components/missing-prereq-deeplink.tsx`
**Purpose:** Inline "+ Add ${label} →" link for empty-state affordances under cards or cascade steps. Routes to the relevant DNA/source page.

**Anatomy:**
- `<Link>` styled `inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline`.
- Body: `+ Add {label}` + `<ArrowRight>` icon (12px trailing).

**Props:**
```ts
interface MissingPrereqDeeplinkProps {
  /** Object label without the leading verb. e.g. "an Offer", "a Newsletter channel". */
  label: string
  href: string
}
```

**Do not:**
- Hardcode the route. Always pass via `href` so the calling context owns the destination.
- Add an icon prop. The plus-prefix and arrow-suffix are the contract.

---

### StrategyField

**File:** `02-app/components/strategy-field.tsx`
**Purpose:** Declarative widget for one strategy field in the content-creator generation surface. Switches on `field.id` to render either a `Select` (for entity ids and fixed enums) or an `Input` (for free-text fields like CTA URLs and sales angles).

**Anatomy:**
- `<div className="flex flex-col gap-1.5">`.
- Label: `<label className="text-xs font-medium text-muted-foreground">{FIELD_LABELS[field.id]}</label>` with required asterisk in `text-destructive`.
- Body: switch on `field.id`:
  - `audience_segment` / `offer` / `knowledge_asset` / `platform` / `customer_journey_stage` / `tone_variation` → `Select` atom from `@/components/ui/select` with `options`.
  - `sales_page_angle` / `cta_url` → `Input` atom.

**Behaviour:**
- Controlled. Calls `onChange(value | null)` — empty string normalises to `null`.
- Empty `options` for a Select renders a "No options available" placeholder row inside the dropdown.

**Props:**
```ts
interface StrategyFieldOption { value: string; label: string }
interface StrategyFieldProps {
  field: { id: StrategyFieldId; required: boolean }
  value: string | null
  onChange: (value: string | null) => void
  options?: StrategyFieldOption[]
  placeholder?: string
}
```

**Do not:**
- Hardcode an option-loader inside the molecule. The organism passes `options` after fetching from a server action — keeps the molecule pure.
- Add ad-hoc field types. The `StrategyFieldId` union in `lib/llm/content/types.ts` is the source of truth; new ids belong there with their renderer mapped here.

---

### TopicCascadeStep

**File:** `02-app/components/topic-cascade-step.tsx`
**Purpose:** Single step in the topic engine cascade. Renders a single-select `Select` or a multi-select checkbox list, with locked-option dimming and inline `MissingPrereqDeeplink`.

**Anatomy:**
- Outer: `flex flex-col gap-1.5`.
- Label row identical to `StrategyField`.
- Single-select body: `Select` atom with options. Disabled options dim and disable the row.
- Multi-select body: `<div className="flex flex-col gap-1.5 rounded-md border p-2">` containing `Checkbox` + `<label>` rows.
- Loading state: animated `bg-muted` placeholder rectangle in place of the control.

**Props:**
```ts
interface TopicCascadeStepOption {
  key: string
  label: string
  isLocked?: boolean
  missingPrereqLabel?: string
  missingPrereqHref?: string
}
interface TopicCascadeStepProps {
  label: string
  required: boolean
  allowMultiSelect: boolean
  options: TopicCascadeStepOption[]
  selectedKeys: string[]
  onChange: (keys: string[]) => void
  loading?: boolean
}
```

**Do not:**
- Mix single + multi in one step. The orchestrator (`TopicCascade`) decides per-step.
- Owner-fetch options. `TopicCascade` owns option fetching — `TopicCascadeStep` only renders.

---

### TopicCascade

**File:** `02-app/components/topic-cascade.tsx`
**Purpose:** Orchestrates the 1..4 step Topic Engine cascade for the content-creator generation surface. Owns option fetching via server actions, step reveal, multi-select gating at the leaf, free-text branch (when category 1 is "Free text"), leaf-augment toggle ("+ Add a note"), and the topic-clear confirm modal.

**Anatomy:**
- Outer: `flex flex-col gap-4`.
- A vertical stack of `TopicCascadeStep`s, one per revealed step.
- After the leaf resolves: a "+ Add a note" button OR (when expanded) a `Textarea` for the leaf-augment.
- When category 1 is free-text: a `Textarea` replaces steps 2..N.
- A `Modal` (size sm) for the topic-clear confirm.

**Behaviour:**
- On mount: fetches step-1 categories via `listTopicCategoriesAction`.
- On step selection: clears all selections at and below the changed step, refetches the next step's options via `listTopicChildrenAction`. When the new selection is a leaf, calls `resolveTopicChainAction` and stores the resulting `TopicChain` in `value.resolved`.
- On backtrack with non-empty leaf-augment: shows the topic-clear confirm modal before clearing.
- Multi-select leaf: collects all checked nodes into `value.selections` and resolves once.
- Free-text branch: short-circuits the cascade; calls `resolveTopicFreeTextAction` on textarea change (debounced via `useTransition`).

**Props:**
```ts
type TopicCascadeState = {
  selections: TopicNode[]
  freeTextAugment: string
  freeTextOnly?: string
  resolved: TopicChain | null
}
interface TopicCascadeProps {
  value: TopicCascadeState
  onChange: (state: TopicCascadeState) => void
}
```

**Do not:**
- Persist cascade state internally. The organism owns the `TopicCascadeState` so it can serialise into `GenerationInputs` at submit and pre-fill from URL params.
- Resolve the leaf chain on every keystroke. Resolution happens once when a leaf is reached — leaf-augment text is appended to assembler inputs, not the resolved chain.

---

### NumberStepper

**File:** `02-app/components/number-stepper.tsx`
**Purpose:** Three-segment − / value / + stepper for bounded numeric inputs (variant count, future batch sizes).

**Anatomy:**
- Outer: `inline-flex items-center gap-1`.
- Decrement: `IconButton` icon Minus, size sm, variant outline, no tooltip. Disabled when `value - step < min`.
- Value display: `<span className="inline-flex h-8 min-w-[2.5rem] items-center justify-center rounded-md border bg-background px-2 text-sm tabular-nums">`.
- Increment: `IconButton` icon Plus, size sm, variant outline. Disabled when `value + step > max`.

**Props:**
```ts
interface NumberStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number  // default 1
  label?: string
}
```

**Do not:**
- Allow direct numeric input in the value display (read-only by design — keeps the ±1 increment honest, prevents validation churn).
- Take a "size" prop. One shape; different visual = different molecule.

---

### ContentTypeSwitcher

**File:** `02-app/components/content-type-switcher.tsx`
**Purpose:** Compact dropdown switcher for the `creator-workspace-three-region` pattern. Replaces the previous external "Switch ↗" link with an inline dropdown so the user stays in the workspace flow.

**Anatomy:**
- `Select` atom with compact trigger: `h-8 min-w-[180px] text-xs`.
- `SelectValue` renders the current content type's label.
- `SelectContent` lists all unlocked active content types.

**Behaviour:**
- Controlled by `currentSlug` (the content_type.slug at the route).
- `onChange(slug)` fires on selection; consumer is responsible for navigation (typically `router.push('/content/create/[slug]')`).
- Locked content types are filtered out by the page server component before passing options.

**Props:**
```ts
interface ContentTypeSwitcherOption {
  value: string  // slug
  label: string  // display name
}
interface ContentTypeSwitcherProps {
  currentSlug: string
  options: ContentTypeSwitcherOption[]
  onChange: (slug: string) => void
}
```

**Do not:**
- Bake navigation into the molecule. The consumer owns the route — keeps the molecule reusable for non-Next.js contexts.
- Promote to a generic `ItemSwitcher` (DS-09). That molecule is for plural DNA item switchers with different ergonomics; this one is purpose-built for the launch-surface pattern.

---

### GenerationSettingsStrip

**File:** `02-app/components/generation-settings-strip.tsx`
**Purpose:** Lighter inline Settings strip for the `creator-workspace-three-region` pattern. Compact controls (Model + I/we override + Tone variation + Variant count) sit in a single row above the primary action button — kept lighter than a SectionCard to reduce visual weight at the bottom of the rail.

**Anatomy:**
- Outer: `flex flex-wrap items-center gap-3 rounded-md bg-muted/40 px-3 py-2`.
- Each control wrapped in a label-above container: `flex flex-col gap-0.5` + `text-[10px] uppercase tracking-wide text-muted-foreground` label.
- Model + I/we + Tone use compact `Select` triggers (`h-8 text-xs`, fixed width).
- Variants uses `NumberStepper`.
- Tone control omitted when `toneOptions` is empty.

**Behaviour:**
- Controlled. Single `onChange` returns the full `GenerationSettingsStripValue`.
- Empty-string `modelSlug` and `toneVariation` represent "Default" / "Default (auto)".
- Person override is a fixed three-option enum.

**Props:**
```ts
type PersonOverride = 'default' | 'singular' | 'plural'
interface GenerationSettingsStripValue {
  modelSlug: string  // '' = default
  person: PersonOverride
  toneVariation: string  // '' = default (auto)
  variantCount: number
}
interface GenerationSettingsStripProps {
  value: GenerationSettingsStripValue
  onChange: (value: GenerationSettingsStripValue) => void
  aiModels: { slug: string; name: string }[]
  toneOptions: { value: string; label: string }[]
  variantMin?: number
  variantMax?: number
}
```

**Do not:**
- Promote to a SectionCard. The strip's lightness is the contract — if a SectionCard ever feels right, that's a different molecule.
- Add ad-hoc controls. Variant of the strip = different molecule.

**Build-phase note:** Pre-approved escalation path — if the inline strip looks visually unbalanced against the SectionCards above it during build, promote to a standard `SectionCard` (titled "AI / language settings"). Promotion is a contained visual fix; not a redesign.

---

### SearchInput

**File:** `02-app/components/search-input.tsx`
**Purpose:** Generic search input with leading magnifier icon. Use anywhere a free-text search field needs the icon affordance — pickers, list filters, modals.

**Anatomy:**
- Outer: `relative ${widthClass}` (default `w-60`).
- Leading `<Search>` icon (Lucide, 16px) absolutely positioned: `pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground`.
- `<Input type="search">` atom with `pl-9` to clear the icon.

**Props:**
```ts
interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  widthClass?: string
}
```

**Do not:**
- Take an unstyled-search variant. The icon is the contract — without it, use a plain `<Input>`.
- Hardcode width. Pass via `widthClass` so the consumer controls layout.

---

### AssembledPromptInspector

**File:** `02-app/components/assembled-prompt-inspector.tsx`
**Purpose:** Right-pane debug viewer for the assembled eight-layer prompt — **OUT-02-P4a only**. Replaced wholesale by variant cards in 4b. Don't over-polish.

**Anatomy:**
- Outer: `flex h-full flex-col`.
- Toolbar: `shrink-0 flex items-center justify-between border-b px-4 py-2` with run-id pill (`font-mono text-xs text-muted-foreground`) + Copy `IconButton`.
- Body: `<pre className="flex-1 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs leading-relaxed text-foreground">`.

**Behaviour:**
- Copy button writes the full `assembledPrompt` to clipboard. Icon flips to `Check` for 1.5s on success. Silent fallback on clipboard API rejection (debug surface).

**Props:**
```ts
interface AssembledPromptInspectorProps {
  runId: string
  assembledPrompt: string
}
```

**Do not:**
- Add syntax highlighting, line numbers, or layer-folding. This molecule exists *because* 4b will replace it; investing in polish is wasted work.

---

### ConversationListRowIcon

**File:** `02-app/components/conversation-list-row-icon.tsx` *(planned — OUT-01a)*
**Purpose:** Fixed-width icon slot rendered in front of every conversation list row title. Encapsulates the freeform / skill-active / skill-completed / registry-miss icon decision and adornment overlay so the row template stays branch-free. Established in OUT-01a.

**Anatomy:**
- Outer wrapper: `relative inline-flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground`.
- Glyph: 16px Lucide icon — `MessageCircle` for `freeform`, `Brain` for the three skill states.
- Adornment overlay (skill-completed and registry-miss only): absolute, bottom-right, 10px, `-mr-1 -mb-1`. `Check` in `--color-success` for completed; `AlertTriangle` in `--color-warning` for registry-miss.
- The slot consumer in `ConversationList` provides the trailing `gap-2` to the title — this molecule renders only the 16px glyph + adornment, not the gap.

**Behavioural states:**
- Stateless — purely presentational. Active/inactive row colour rules belong to the row, not the icon (icon stays muted regardless).

**Edge cases:**
- **`registry-miss` AND `skill-completed` simultaneously**: not possible by construction (registry miss is a runtime check that overrides the completion state's render path), so only one adornment ever renders.

**Props:**
```ts
interface ConversationListRowIconProps {
  state: 'freeform' | 'skill-active' | 'skill-completed' | 'registry-miss'
}
```

**Do not:**
- Add a click handler. The whole row is the click target; the icon is decorative metadata.
- Vary glyph colour to convey state (e.g. tinting `Brain` primary). The adornment is the state signal — a tinted glyph would compete with the row's active-state colour rule.
- Extend the slot width past 16px. The conversation list's `gap-2` between icon and title is what aligns titles across the list; widening the icon shifts the alignment.

---

### InlineWarningBanner

**File:** `02-app/components/inline-warning-banner.tsx` *(consumed by OUT-01a, OUT-01b)*
**Purpose:** Thin coloured banner that sits above content in a page region — not a toast, not a centred empty state. Two tones: `'warning'` (default — OUT-01a's registry-miss banner above the chat stream, OUT-01b's "state update failed" row at the top of the context pane) and `'success'` (OUT-01b's skill-completion banner above the skill summary card). Tone parameterisation was added in OUT-01b's build (2026-05-01) after the second consumer needed the same shape with success tokens; sibling success/error molecules were ruled out as premature.

**Anatomy:**
- Outer wrapper: `flex items-start gap-2 rounded-md border px-3 py-2`. Surface tokens vary by tone (see Tone tokens below).
- Leading icon: 16px on the left, `mt-0.5` to align with first line of text. `AlertTriangle` for warning tone; `CheckCircle2` for success tone.
- Text block: `flex-1 min-w-0`. Title is `text-sm`. Subtitle (optional) sits on a second line as `text-xs text-muted-foreground`.
- Dismiss (when `onDismiss` provided): `IconButton` ghost variant with `X`, anchored right. Omitted entirely when `onDismiss` is undefined — there is no "dismissible: false" prop; the existence of the handler IS the contract.

**Tone tokens:**
- `warning` (default): border `--color-warning`, background `--color-warning-bg`, foreground `--color-warning-foreground`, icon colour `--color-warning`, glyph `AlertTriangle`.
- `success`: border `--color-success`, background `--color-success-bg`, foreground `--color-success-foreground`, icon colour `--color-success`, glyph `CheckCircle2`.

**Behavioural states:**
- Idle (rendered).
- Dismissed (consumer's responsibility — this molecule does not own dismiss state; the parent removes it from the tree).

**Edge cases:**
- **Long title or subtitle**: wraps. The banner is single-row by typography, not by truncation.
- **No subtitle**: tighter single line; vertical padding remains `py-2`.

**Props:**
```ts
interface InlineWarningBannerProps {
  title: string
  subtitle?: string
  tone?: 'warning' | 'success'  // default 'warning'
  onDismiss?: () => void
}
```

**Do not:**
- Add `error` or `info` tones speculatively. Extend tone only when a real consumer needs them — the rule preventing premature variants still applies; this molecule has two tones because it has two consumers requiring them.
- Render this as a centred empty state — that's `EmptyState`'s job. This molecule is a thin top-of-region bar.
- Use this for transient feedback — that's the toast pattern's job. This molecule is for persistent state visibility.

---

### SkillContinueBar

**File:** `02-app/components/skill-continue-bar.tsx` *(planned — OUT-01a)*
**Purpose:** Surface the staged-skill advance affordance below the latest assistant message in the chat: a Continue button (with trailing arrow) plus a missing-items hint when the current stage's checklist isn't filled. Wraps `ActionButton`. The runtime decides when the molecule is rendered (i.e. when `readyToAdvance: true` and the skill is staged); the molecule itself is purely presentational and stateless.

**Anatomy:**
- Outer wrapper: `flex flex-col items-start gap-1`.
- Top row: `ActionButton` with `trailingIcon={ArrowRight}`, label "Continue to next stage" (idle / blocked) or "Advancing…" (while loading). Disabled when `missingItems.length > 0`. Loading state takes precedence over blocked state visually.
- Hint row (only when `missingItems.length > 0` AND not loading): `<span className="inline-flex items-center gap-1 text-xs text-muted-foreground">` containing `<AlertTriangle className="h-3 w-3" />` and the text `Still gathering: <missingItems.join(', ')>`.

**Behavioural states:**
- **Idle**: button enabled, no hint.
- **Blocked**: button disabled, hint visible listing missing checklist labels.
- **Loading**: button disabled with spinner + "Advancing…" label, trailing arrow hidden, hint hidden.
- **Advanced**: parent removes the molecule from the tree; this molecule has no internal post-advance state.

**Edge cases:**
- **Both `loading` and `missingItems` set**: loading wins (button shows spinner, hint hidden). The runtime should not normally trigger advance while items are missing, but the molecule defends against the conflict.
- **Empty `missingItems` array**: equivalent to idle.

**Props:**
```ts
interface SkillContinueBarProps {
  missingItems: string[]    // empty array = enabled; non-empty = disabled with hint
  loading: boolean
  onAdvance: () => void
}
```

**Do not:**
- Take a `variant` prop. The contract is a single advance affordance; variations belong in different molecules.
- Render the hint as a tooltip on the disabled button — the missing items are persistent state the user needs to see, not a hover-only explanation.
- Show the trailing arrow during loading. The spinner is the sole busy signal.

---

### ContextPane

**File:** `02-app/components/context-pane.tsx` *(OUT-01b)*
**Purpose:** Right-side adaptive context pane for the chat page. Mounts as a sibling column to the message area and to the conversation history list. **The rail is always visible** (pinned to the right edge of the chat surface); `paneOpen` controls only whether the content panel is rendered next to it. Defaults to closed (rail-only) so the chat content has more room; clicking a rail icon opens the panel and selects that tab. Owns the rail-plus-(optional-)panel structure, header strip with close affordance on the open panel, the resize handle on the panel's left edge, and width clamp logic so the message area always retains ≥ 480px. Tabs are pluggable via the `ContextTab` contract from `lib/chat-context-pane`.

**Anatomy:**
- Outer wrapper: `relative flex h-full shrink-0 flex-row border-l border-border bg-card`. Width is `paneWidth + 56` when open, `56` when closed (rail-only). Set via inline `style`.
- **Rail (always visible, 56px wide):** rightmost column; composes `ContextPaneRail`. Rail icon clicks call back into the parent via `handleRailIconClick` which: opens the panel + selects that tab when closed; switches tabs when open and a different icon is clicked; closes the panel when open and the currently-selected icon is clicked again (toggle).
- **Content panel (rendered only when `paneOpen`):**
  - Resize handle: `<button>` absolutely positioned on the left edge of the open pane, 8px-wide hit area centred on the boundary, `cursor-col-resize`. Hover renders a 1px sage-line indicator inside the handle. Drag updates width live; on release, parent persists.
  - Main column: `flex min-w-0 flex-1 flex-col`. Header strip + scrollable body.
  - Header strip: `flex items-center justify-between border-b border-border px-4 py-3`. Selected tab `label` (`text-sm font-medium`) on the left; `IconButton` close (X, ghost) on the right — closes only the panel; rail remains visible.
  - Body: `flex-1 overflow-y-auto px-4 pb-4 pt-3`. Renders `selectedTab.render(ctx)`.

**Width contract:**
- Bounds: panel content 280–560px (constants `MIN_WIDTH`, `MAX_WIDTH`); rail is always 56px.
- Viewport clamp: at render the pane measures its parent flex container and clamps `paneWidth` to `min(MAX_WIDTH, max(MIN_WIDTH, parentWidth - MIN_MESSAGE_AREA - RAIL_WIDTH))`. Forces the panel to shrink before the message area is squeezed below 480px.
- Resize: drag on the panel's left edge. Live preview tracks the cursor; on mouse-up, calls `onPaneWidthChange(width)` if the value changed. While dragging, document body cursor is set to `col-resize` and text selection is suppressed (avoids cross-element flicker).
- Persistence is the parent's job — the molecule does not call any server actions itself.

**Default state:** Brand-level `chat_pane_open` defaults to `false` (rail-only). Width default is 360px. The user opens the panel by clicking a rail icon.

**Rail-icon click behaviour:**
| State | Click | Result |
|---|---|---|
| Panel closed | any icon | Open panel, select that tab |
| Panel open, click selected icon | (toggle) | Close panel (rail stays visible) |
| Panel open, click different icon | switch | Switch selected tab; panel stays open |

**Selected-tab logic:**
- If `selectedTabId` is provided AND that tab is in the visible (non-hidden) list, use it.
- Otherwise: pick the first visible tab whose `status === 'active'`. Fall back to the first visible tab. If no visible tabs, the rail renders empty and the panel (when open) renders nothing.

**Props:**
```ts
interface ContextPaneProps {
  ctx: ConversationCtx
  tabs: ContextTab[]
  paneOpen: boolean             // controls panel only; rail is always visible
  paneWidth: number             // panel width (excluding rail)
  selectedTabId: string | null
  onPaneOpenChange: (open: boolean) => void
  onPaneWidthChange: (width: number) => void
  onSelectedTabChange: (tabId: string) => void
}
```

**Do not:**
- Render an external "open pane" toggle in the parent. Re-open is via the rail icon — the rail is the single entry point. Removing the parent-side toggle keeps the affordance discoverable in one place.
- Mount this in compact-mode chat surfaces (the slide-out drawer). The drawer is intentionally pane-less for v1 — the parent guards on `compact === true` and skips rendering this molecule.
- Read or write `brand.chat_pane_open` / `brand.chat_pane_width` directly. The molecule is presentational; persistence happens in server actions called by the parent.
- Hide the rail when `paneOpen` is false. The rail must remain visible so the user can re-open the panel.

---

### ContextPaneRail

**File:** `02-app/components/context-pane-rail.tsx` *(OUT-01b)*
**Purpose:** Vertical icon strip pinned to the right edge of `ContextPane`. Renders one `RailIcon` per non-hidden tab. Stateless — selected tab is parent-controlled.

**Anatomy:**
- Outer wrapper: `flex w-14 shrink-0 flex-col items-center gap-2 border-l border-border bg-muted px-2 py-3` with `role="tablist" aria-orientation="vertical"`.
- 56px wide overall (40px icon hit area + 16px container padding).
- Each tab item is a `RailIcon` with the tab's `selected`, `status`, `dot`, and `adornment` mapped from props.

**Behavioural states:**
- Stateless. The component owns no state.

**Edge cases:**
- **Empty tabs array**: renders just the rail container with no children. The pane's content panel will also render no body.

**Props:**
```ts
interface ContextPaneRailProps {
  tabs: {
    id: string
    label: string
    icon: LucideIcon
    status: 'active' | 'empty'
    dot?: 'success' | null
    adornment?: 'check' | null
  }[]
  selectedTabId: string
  onSelect: (tabId: string) => void
}
```

**Do not:**
- Filter `'hidden'` tabs inside this molecule — the parent filters them out before passing in `tabs`. This keeps the rail's contract minimal.
- Reorder tabs based on status. Ordering is the parent's responsibility (`priority` on `ContextTab`).
- Add inline tooltip styling — the tooltip lives inside `RailIcon`.

---

### RailIcon

**File:** `02-app/components/rail-icon.tsx` *(OUT-01b)*
**Purpose:** Single rail icon button — one per tab in `ContextPaneRail`. Deliberately larger than `IconButton` (40px hit area vs IconButton's 32px sm) because the rail is a primary nav surface, not a secondary action. Distinct chrome contract: no border, surface-aware selected state, optional dot and adornment.

**Anatomy:**
- Outer button: `relative flex h-10 w-10 items-center justify-center rounded-md transition-colors`. 40px square hit area.
- Inner glyph: 20px (`h-5 w-5`).
- States:
  - **Selected**: `bg-card` (visually joins the content panel) + `text-foreground`. No hover state distinct from selected.
  - **Active, unselected**: `text-foreground`. Hover: `bg-card/50`.
  - **Empty, unselected**: `text-muted-foreground`. Hover: `bg-card/50` + `text-foreground`.
- Optional dot (only when `status === 'active'` AND `dot === 'success'` AND not selected): `absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[var(--color-success)]`.
- Optional adornment 'check': 12px `Check` glyph absolutely positioned bottom-right (`absolute right-0.5 bottom-0.5 h-3 w-3 text-[var(--color-success)]`).
- Tooltip on hover via shadcn `Tooltip` showing `label`.
- `aria-label={label}`, `aria-pressed={selected}`.

**Behavioural states:**
- Selected / active-unselected / empty-unselected — see Anatomy.

**Edge cases:**
- **Both `dot` and `adornment` set**: both render. Dot top-right; adornment bottom-right; they don't overlap.
- **`dot` provided but `status === 'empty'`**: dot is suppressed. Status drives visibility.

**Props:**
```ts
interface RailIconProps {
  icon: LucideIcon
  label: string
  selected: boolean
  status: 'active' | 'empty'
  dot?: 'success' | null
  adornment?: 'check' | null
  onClick: () => void
}
```

**Do not:**
- Compose `IconButton`. The chrome contract differs (border, padding, default size); duplicating IconButton with overrides leaks IconButton's contract into the rail. Build directly on the `<button>` atom.
- Use this molecule outside the rail. If something looks like a rail icon elsewhere, that's a sign a different primary-nav molecule is needed there too — don't import this one.
- Add additional dot or adornment colours speculatively. New tones land when a new tab needs them.

---

### StageCard

**File:** `02-app/components/stage-card.tsx` *(OUT-01b)*
**Purpose:** Collapsible card for one skill stage in OUT-01b's context pane. Header always visible; click toggles expansion. Multiple cards can be expanded simultaneously — expansion state is owned by the parent (no internal state). Current stage carries a 3px coloured left border in `--primary` so it reads as a distinct landmark in the stage list; completed and pending stages use a 16px status icon in the leading position.

**Anatomy:**
- Outer card: `rounded-lg bg-card`. Border varies by status:
  - Current: `border border-l-[3px] border-border border-l-[var(--primary)]`.
  - Completed / pending: `border border-border`.
- Header `<button>`: `flex w-full items-center gap-3 px-4 py-3 text-left`, `aria-expanded={expanded}`. Toggles expansion on click.
  - Leading status icon (omitted for current): `Check` in `--color-success` for completed; empty `Circle` in `text-muted-foreground` for pending.
  - Centre: `flex-1 text-sm font-medium text-foreground` label, with optional `(current)` suffix in `text-muted-foreground` for current stages.
  - Trailing: `ChevronDown` (collapsed) or `ChevronUp` (expanded), 16px, `text-muted-foreground`.
- Expanded body: `border-t border-border px-4 py-3`. Renders `gatheredValues` as a `<dl>` of label/value pairs (uppercase meta label + typed value renderer). Empty list shows "Nothing captured yet." in muted text.

**Gathered value renderer (internal):**
- `string` → `MarkdownRenderer` (compact mode) inside a max-200px scroll container.
- `boolean` → "Yes" / "No".
- `number` → as-is.
- `string[]` or `number[]` → bulleted list.
- Object (one level) → nested key/value rows.
- Anything else → `<pre>` JSON block.
- `null`, `undefined`, or `''` → muted em-dash placeholder.

**Behavioural states:**
- Collapsed (default) / expanded. Expansion is parent-controlled.

**Edge cases:**
- **Current stage with completed marker in same skill**: not possible by data model — `currentStage` and `stagesCompleted` are distinct.
- **Stage with no gathered values**: expanded body shows "Nothing captured yet."
- **Long gathered string** (paragraphs): scrolls inside a 200px-tall container within the card body.

**Props:**
```ts
interface StageCardProps {
  id: string
  label: string
  status: 'completed' | 'current' | 'pending'
  expanded: boolean
  onToggle: () => void
  gatheredValues: { label: string; value: unknown }[]
}
```

**Do not:**
- Own internal expansion state. Parents manage the open/closed map so multi-expand and persistence behave coherently.
- Edit gathered values inline — the card is read-only by spec. Editing belongs in the chat conversation (the LLM updates state) or, eventually, in OUT-01c's DB-write surface.
- Render the (current) suffix when status is not 'current'.

---

### SkillChecklist

**File:** `02-app/components/skill-checklist.tsx` *(OUT-01b)*
**Purpose:** Read-only vertical checklist for the skill-state context tab. v1 has no item interaction — manual fill is out of scope per OUT-01b's brief; the LLM is the only thing that can flip an item to filled.

**Anatomy:**
- Outer: `<ul className="flex flex-col gap-1">`.
- Each row: `flex items-center gap-2 py-1.5 text-sm`. Foreground text (`text-foreground`) when filled, muted (`text-muted-foreground`) when not.
  - Filled: 16px `Check` glyph in `--color-success`.
  - Unfilled: 16px empty `Circle` in `text-muted-foreground`.

**Behavioural states:**
- Read-only. No hover, no click, no focus.

**Edge cases:**
- **Empty items array**: renders nothing (`null`). The skill-state tab handles the heading separately.

**Props:**
```ts
interface SkillChecklistItem {
  id: string
  label: string
  filled: boolean
}
interface SkillChecklistProps {
  items: SkillChecklistItem[]
}
```

**Do not:**
- Add an `onToggle` prop. v1 explicitly excludes manual fill.
- Use this for VOC checklists or other interactive checklists — those use `VocMapping` or feature-specific molecules.

---

### SkillPickerRow

**File:** `02-app/components/skill-picker-row.tsx` *(OUT-01b)*
**Purpose:** Single row in the skill picker shown by the skill-state context tab when a freeform conversation is empty. Card-like row with a leading icon, name, and description. Focused contract for v1 — may generalise into a `PickerRow` molecule when a second consumer (e.g. content-type picker for OUT-02 chat-mode) appears.

**Anatomy:**
- Outer button: `flex w-full items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/50`.
- Leading icon: 24px (`h-6 w-6 shrink-0`) in `text-muted-foreground`.
- Body: `flex min-w-0 flex-1 flex-col gap-0.5`. Name is `text-sm font-medium text-foreground`. Description below as `text-xs text-muted-foreground line-clamp-2`.
- `aria-label={`Start ${name}`}` for screen readers.
- `data-skill-id` attribute on the button for testability.

**Behavioural states:**
- Idle / hover. No selected state — the parent removes the picker from the tree once a skill is attached.

**Edge cases:**
- **Long description**: clamps to 2 lines.
- **Long name**: wraps (no truncation).

**Props:**
```ts
interface SkillPickerRowProps {
  skillId: string
  name: string
  description: string
  icon: LucideIcon
  onClick: () => void
}
```

**Do not:**
- Add a `selected` or `disabled` prop speculatively. v1 is single-action; the parent handles disabled-during-attach via guarding the click.
- Generalise this prematurely into `PickerRow`. If a second consumer needs the same shape, evaluate then; otherwise the focused name keeps reuse intentional.

---

### PaneHighlightPulse

**File:** `02-app/components/pane-highlight-pulse.tsx` *(OUT-01b)*
**Purpose:** Wrapper that triggers a single 300ms low-intensity primary background flash on its child whenever its `pulseKey` prop changes. Centralises the "this just updated" animation contract for OUT-01b's context pane (and any future consumer that needs the same affordance). One source of truth for the pulse keyframe lives in `globals.css`.

**Anatomy:**
- Outer wrapper: `<div>` with the (optional) caller-provided `className` plus `pane-highlight-pulse-active` class while the pulse is firing.
- CSS keyframe (defined in `globals.css` `@layer components`):
  ```css
  @keyframes pane-highlight-pulse {
    0%, 100% { background-color: transparent; }
    50% { background-color: color-mix(in oklab, var(--primary) 12%, transparent); }
  }
  .pane-highlight-pulse-active {
    animation: pane-highlight-pulse 300ms ease-in-out;
    border-radius: inherit;
  }
  ```
- The class is applied for exactly 300ms via `setTimeout`, then removed.

**Behavioural states:**
- Idle (no class) / pulsing (class applied for 300ms).

**Edge cases:**
- **Initial mount**: no pulse fires on first render. `pulseKey` is captured on mount and only triggers when it changes after.
- **`pulseKey` changes faster than the 300ms animation**: the timeout is reset and a fresh pulse begins. The user sees the most recent change.
- **Same `pulseKey` value provided again**: no pulse — only changes trigger.
- **Component unmounts mid-pulse**: cleanup clears the timeout to prevent state updates on unmounted component.

**Props:**
```ts
interface PaneHighlightPulseProps {
  pulseKey: string | number  // when changed, a single 300ms pulse fires
  children: ReactNode
  className?: string
}
```

**Do not:**
- Use this for streaming text or per-token updates — the pulse is meant for discrete state changes (turn-complete, save-success), not continuous streams.
- Customise duration or colour per call. If a need arises for a different animation, build a sibling molecule rather than parameterise this one — the contract is intentionally narrow.
- Wrap interactive elements where the background flash would obscure focus rings or other state.

---

## Conventions

### Cell-context input/textarea pattern *(DS-04)*

Some text inputs sit inside table cells or other dense layouts where the cell itself provides the visual envelope. These do **not** become a molecule — the surrounding context is too varied (each table has different padding, edit-mode triggers, row heights). Instead, apply this Tailwind class set:

```tsx
// Single-line:
<input
  className="w-full bg-transparent border-0 px-0 py-0 text-sm focus:outline-none focus:ring-0"
/>

// Multi-line:
<textarea
  className="w-full bg-transparent border-0 px-0 py-0 text-sm leading-tight focus:outline-none focus:ring-0 resize-none"
/>
```

Rationale: a wrapper would be either too prescriptive (forcing one padding/border style) or too thin (`<input className="..." />` already is the molecule). Keep cell editors as plain `<input>` / `<textarea>` with this canonical class set; the host table provides the layout.

For form-context (labelled, with envelope), use `InlineField`. For cell-context (dense, in-table), use this convention.

---

## Organism conventions

Organisms are in `app/(dashboard)/`. They:
- Import and compose molecules
- Pass data down as props
- Do not apply Tailwind appearance classes (`bg-*`, `text-*`, `border-*`, `shadow-*`)
- May apply layout classes (`flex`, `grid`, `gap-*`, `h-full`, `min-h-0`) where needed for composition

---

## Known issues to fix in DS-01

Ordered by impact:

All 8 original issues resolved or accepted:

1. ~~ContentPane shadow~~ — done (shadow-pane opacity increased)
2. ~~InlineField idle border~~ — done (always-visible border-border/60)
3. ~~Sidebar dividers~~ — done (SectionDivider molecule)
4. ~~PageHeader containment~~ — accepted as-is (icon slot added, no border needed)
5. ~~Audience segments layout~~ — done (UX-06)
6. ~~Button padding~~ — done (default px-4, lg px-5)
7. ~~ContentPane width~~ — done (flex-1 fill)
8. ~~Sidebar collapsed state~~ — done (icon sizing correct)

---

## Adding a new component

Before creating any new shared component:

1. Check `components/registry.ts` — does something close exist?
2. Check this document — is there a spec for it already?
3. If new: write a spec in this document first (under Molecule specifications), get confirmation, then build
4. After building: add entry to `components/registry.ts`
5. Run the `design-system` skill's drift check to confirm no appearance classes leaked into organism layer

---

## Changelog

| Date | Change |
|---|---|
| 2026-04-12 | Initial spec created (DS-01). Tokens, molecule specs, conventions. |
| 2026-04-13 | Full palette change: terracotta/bone → forest green/sage/paper. Added Outfit as display font alongside Inter. Updated all primitive and semantic tokens, shadow tokens, radius base. Source: Gemini Build sample design. |
| 2026-04-25 | DS-02: state tokens (success/warning/error/info × fg/bg/foreground = 12 tokens) + tag tokens (1–6 desaturated backgrounds, 6 tokens). StatusBadge spec backfilled — option API changed from `className` to `state` keyword. TypeBadge molecule new. All `dark:` overrides on hardcoded hues dropped during migration. 60+ hardcoded named-Tailwind-colour instances replaced. |
| 2026-04-27 | DS-04: SelectField, InlineCellSelect, CheckboxField, SliderField molecules. New `components/ui/slider.tsx` shadcn-style atom (base-ui Slider). InlineField gains `disabled` prop for parity. New `## Conventions` section with cell-context input/textarea pattern. ~30 native control sites migrated; toolbar-row sites and the SourceDocPicker rows deferred (documented in code). `debouncedSaveToast` exported from inline-field.tsx so DS-04 molecules share it (DS-06 will extract to `lib/save-feedback.ts`). |
| 2026-04-27 | DS-09: ItemSwitcher molecule replaces 4 pill-strip switcher molecules (AudienceSegmentSwitcher, PlatformSwitcher, KnowledgeAssetSwitcher, OfferSwitcher). Long item names now handled via dropdown rather than 24-char truncation. Generic over `T`, Link-based navigation, consumer pre-filters items. Removes 4 specs from DS-03 backfill scope. |
| 2026-04-27 | DS-03: Spec backfill complete. 38 new specs written (19 full + 18 light + 1 shared archive); 8 existing DS-01 specs rewritten in DS-02 format for consistency. Two file moves: `OfferDetailView` → `02-app/app/(dashboard)/dna/offers/[id]/` (organism layer, removed from registry); `ConfidenceBadge` → `02-app/components/` (proper molecule home). After DS-03, every registry entry has a real spec anchor — `npm run check:design-system` reports 0 missing-spec warnings. Anchor function in check script now handles `*(light)*` and `(shared pattern)` suffixes. |
| 2026-04-27 | DS-05: IconButton + ActionButton molecules. Both wrap Button atom with optional Link rendering (`href` prop), optional tooltip, and (ActionButton only) loading state. Migrated ~21 organism files; 3 Tooltip-wrapping-Button patterns folded into IconButton. Atom-import warnings dropped 41 → 20. Remaining 20 are documented carrythrough (Badge × 4 + DropdownMenu × 3 + DropdownMenuTrigger render Buttons × 3 + DS-04-deferred form-control sites). |
| 2026-04-30 | OUT-02-P4a: 10 new molecules — `MultiFilterPillGroup` (multi-select promised by FilterPillGroup spec), `ContentTypeCard` + `PickerFilterBar` + `LockBadge` + `MissingPrereqDeeplink` (launch-picker-grid pattern), `StrategyField` + `TopicCascadeStep` + `TopicCascade` (creator-workspace-three-region inputs), `NumberStepper` (variant count + future bounded numerics), `AssembledPromptInspector` (debug-grade right-pane viewer, replaced in 4b). Establishes `launch-picker-grid` and `creator-workspace-three-region` template patterns. Two new tables (`brand_content_type_favourites`, `ai_models`); OUT-02-PL2 closed (StrategyFieldId union extended with `platform`, dual-read removed from placeholders). |
