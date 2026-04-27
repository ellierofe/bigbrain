# DS-04 Layout — Form controls standardisation

Status: draft
Last updated: 2026-04-26
Brief: `01-design/briefs/DS-04-form-controls-standardisation.md`

## Template match
No applicable template. DS-04 is molecule design (4 new form-control molecules + 1 thin shadcn-style atom + 1 documented convention). Not a page-level pattern. Logged in the brief.

## Why a layout spec at all

DS-04 has no views, no routes. The "layout" work is **the visual + behavioural specs of the four new molecules** — each becomes a `### MoleculeName` section in `design-system.md` after build. This spec is the source of truth for those.

Sections that don't apply (List view, Detail view, Create flow, Edit flow, etc.) are omitted.

---

## Molecule composition *(mandatory — drives feature-build plan gate)*

### Existing molecules used
- **InlineField** (registry: `02-app/components/inline-field.tsx`, spec: `design-system.md § InlineField`) — the canonical visual reference. All four new field-context molecules match its envelope: always-visible border, floating label patch, icon prefix, focus-state colour shift, `text-success` "Saved" / `text-destructive` "Failed" feedback.
  - Touched only via a one-line spec doc update to add a `disabled` state line (currently undocumented; matches the four new molecules for consistency).

### Existing molecules used but unspecced *(known gap — DS-03)*
None directly. (Many molecules will *consume* the new form-control molecules in their migration, but DS-04 doesn't depend on their specs existing.)

### Existing molecules to extend
None.

### New molecules required

1. **SelectField** *(net new)*
   - **Props**: `label`, `value`, `options: { value: string; label: string }[]`, `onSave: (value: string) => Promise<{ ok, error? }>`, `placeholder?`, `icon?: LucideIcon`, `description?: string`, `labelBg?: string` (default `bg-card`), `disabled?: boolean`, `className?: string`.
   - **Visual contract**: matches InlineField envelope (see "Visual specs" below).
   - **Built on**: base-ui `Select` (already wrapped at `02-app/components/ui/select.tsx`).
   - **Save behaviour**: immediate on selection.
   - **Replaces**: 11 sites — JOURNEY_STAGES select in platform-detail-view, PLATFORM_TYPES in create-platform-modal, kind/audience selects in DNA modals, type filter in source-doc-picker, category select in process-input-client, category select in category-section, faqType + category dropdowns in entity-outcomes-panel (when used in field context, not cell context — which goes to InlineCellSelect instead).

2. **InlineCellSelect** *(net new)*
   - **Props**: `value`, `options: { value: string; label: string }[]`, `onSave: (value: string) => Promise<{ ok, error? }>`, `placeholder?`, `disabled?: boolean`, `className?: string`. (No `label`, no `icon`, no `description`, no `labelBg` — cell context.)
   - **Visual contract**: compact, no floating label, designed to fit inside a table cell.
   - **Built on**: base-ui `Select` (consistency with SelectField).
   - **Save behaviour**: immediate on selection.
   - **Replaces**: 3 sites — voc-table category cell, entity-outcomes-panel faqType/category cells, category-section per-row category select.

3. **CheckboxField** *(net new)*
   - **Props**: `checked: boolean`, `onCheckedChange: (checked: boolean) => void`, `label: string | ReactNode`, `description?: string`, `disabled?: boolean`, `className?: string`.
   - **Visual contract**: checkbox left, label right (flex-1, click extends to label), optional description as small muted text below the label.
   - **Built on**: base-ui `Checkbox` (already wrapped at `02-app/components/ui/checkbox.tsx`).
   - **Save behaviour**: parent owns save. The molecule is purely controlled. (Distinct from SelectField/SliderField which take `onSave` because save state is part of their visual contract — the "Saved" badge. CheckboxField has no save badge; it's typically toggled in lists where the parent batches state.)
   - **Replaces**: 4 sites — voc-mapping checklists, create-asset-modal VOC mapping, create-offer-modal VOC mapping, source-doc-picker multi-select.

4. **SliderField** *(net new)*
   - **Props**: `label`, `value: number`, `min: number`, `max: number`, `step?: number` (default 1), `onSave: (value: number) => Promise<{ ok, error? }>`, `lowLabel?: string`, `highLabel?: string`, `valueFormatter?: (value: number) => string` (default: `String(value)`), `description?: string`, `icon?: LucideIcon`, `zeroCentred?: boolean` (variant), `disabled?: boolean`, `className?: string`.
   - **Visual contract**: matches InlineField envelope (see "Visual specs"). Track + thumb + numeric readout.
   - **Variant**: `zeroCentred={true}` — adds tick at 0, formats values with explicit sign (`+10`, `-25`). Used for DNA-09 Applications dimension deltas (range -50 to +50).
   - **Built on**: base-ui `@base-ui/react/slider` (already in node_modules, no new dependency). Requires a thin shadcn-style atom at `02-app/components/ui/slider.tsx` (new — see below).
   - **Save behaviour**: `mouseUp` / `touchEnd` (not `onChange` — too chatty). Local state during drag, single async save call on release.
   - **Replaces**: 2 sites currently — ToV base dimension scores (4 sliders in `tone-of-voice-view.tsx`). DNA-09 Applications will add 4 more (delta sliders) using `zeroCentred`.

### Atoms used directly *(should be empty in molecules — but a new atom is being added)*

- **`02-app/components/ui/slider.tsx` *(new shadcn-style atom)*** — thin wrapper around `@base-ui/react/slider`. Same shape as the existing `select.tsx` and `checkbox.tsx` atoms. Lives in `components/ui/` because that's the established home for shadcn-style atoms. Not added to the registry (registry is for molecules; `components/ui/*` is excluded). The drift-check script already excludes `components/ui/`.
  - **Anatomy**: `Slider.Root`, `Slider.Control`, `Slider.Track`, `Slider.Indicator`, `Slider.Thumb`. Mirrors the `Select` atom structure (`SelectPrimitive.Root` etc.).
  - **Imports**: `Slider as SliderPrimitive` from `@base-ui/react/slider`.
  - **Styling**: token-driven only (no hardcoded hues). Track in `bg-muted`, indicator in `bg-primary`, thumb in `bg-card border border-primary` with focus ring in `ring-ring`.

### Documented convention (no molecule)

**Cell-context input/textarea pattern** — added to `design-system.md` under a new `## Conventions` section.

The pattern: cells in editable tables/lists use a native `<input>` or `<textarea>` element styled to be invisible until focused, with the table cell's padding providing the layout. Specifically:

```tsx
<input
  className="w-full bg-transparent border-0 px-0 py-0 text-sm focus:outline-none focus:ring-0"
  // or for textarea: same + rows + leading-tight
/>
```

Reasoning documented in the convention: cell editors are too tightly coupled to their host table's layout (each table has different padding, cell-row heights, edit-mode triggers) for a wrapper component to add value. The cell becomes the visual envelope; the input is just transparent text.

---

## Visual specs

### SelectField — full spec

**File:** `02-app/components/select-field.tsx` *(new)*
**Purpose:** Field-context select with InlineField visual parity. Used in forms and detail views where a dropdown is one of several labelled fields.

**Anatomy:**
- Outer wrapper: `relative` (for absolute-positioned label patch) + `transition-colors duration-100` + matched border classes from InlineField.
- Border: `border border-border/60` at rest. `border-field-active/50 bg-field-active/[0.03]` on focus (via `:focus-within`). `border-border` on hover (`hover:border-border` — subtle strengthen).
- Label patch: same as InlineField — `absolute -top-2.5 left-2.5 px-1` + the parent surface bg (default `bg-card`, override via `labelBg` prop). `text-[10px] font-semibold capitalize tracking-wide text-muted-foreground` (transitions to `text-field-active` on focus).
- Icon: same pattern as InlineField — `h-3 w-3` left of label, `text-muted-foreground` (transitions to `text-field-active` on focus).
- Inner trigger: base-ui `Select.Trigger` styled to match InlineField inner — `flex items-center justify-between w-full rounded-md px-3 py-2 text-sm bg-transparent`.
- Trigger label/value: `text-foreground` for selected, `text-muted-foreground` for placeholder.
- Chevron: lucide `ChevronDown` `h-4 w-4 text-muted-foreground` to the right of the value.
- Dropdown popup: base-ui `Select.Popup` — `bg-card border border-border rounded-lg shadow-[var(--shadow-raised)] py-1 min-w-[var(--anchor-width)]`. Each option: `flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted cursor-pointer`. Selected option: `bg-muted` + `Check` icon at right.
- Save feedback: inline with label, same as InlineField — `<span className="text-[10px] text-success ml-1">Saved</span>` or `<span className="text-[10px] text-destructive ml-1">Failed</span>`. State machine: idle → saving → saved (auto-clears after 1.2s) | error.
- Description: optional `description` prop renders as info icon (lucide `Info` `h-3 w-3`) with tooltip, inline with label — same pattern as InlineField.

**Behavioural states:**
- **Idle**: `border-border/60`, label/icon `text-muted-foreground`.
- **Hover**: `border-border` (subtle strengthen). No padding shift.
- **Focus** (`:focus-within`): `border-field-active/50 bg-field-active/[0.03]`. Label transitions to `text-field-active`. Icon transitions to `text-field-active`.
- **Open** (popup visible): same as focus.
- **Disabled**: `opacity-50 cursor-not-allowed`. Trigger doesn't open. `onSave` not invoked.
- **Saving**: optional inline spinner (lucide `Loader2 animate-spin h-3 w-3`) replaces "Saved"/"Failed" indicator slot.
- **Saved**: `text-success` "Saved" inline with label, auto-clears after 1.2s.
- **Error**: `text-destructive` "Failed" or error message inline with label, persists until next change.
- **Empty options**: trigger disabled, placeholder reads "No options available".

**Edge cases:**
- **Long option labels**: option list items use `truncate` if a width is constrained. Default popup is `min-w-[var(--anchor-width)]` so the popup is at least the trigger's width.
- **Saving while disabled change**: ignore the change.

**Props:**
```ts
interface SelectFieldProps {
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
- Save on focus or on hover — only on selection change.
- Add a `multi` mode — that's a separate `MultiSelectField` molecule (out of scope; brief notes deferred until a feature needs it).

---

### InlineCellSelect — full spec

**File:** `02-app/components/inline-cell-select.tsx` *(new)*
**Purpose:** Compact select for inside a table cell or other tight context. No envelope, no floating label, no icon — the cell itself is the envelope.

**Anatomy:**
- Outer trigger: base-ui `Select.Trigger` — `flex items-center gap-1 px-2 py-1 text-sm rounded-md bg-transparent hover:bg-muted/50 transition-colors`.
- Selected text: `text-foreground` (or `text-muted-foreground` for placeholder).
- Chevron: lucide `ChevronDown` `h-3 w-3 text-muted-foreground` (smaller than SelectField).
- Dropdown popup: same as SelectField — `bg-card border border-border rounded-lg shadow-[var(--shadow-raised)] py-1 min-w-[var(--anchor-width)]`.
- No save feedback inline (cell context — feedback would crowd the table). On error, the trigger shows a brief border tint via `data-state="error"` + `border-destructive/60` for ~1.5s, plus a toast at the page level (consumer handles toast; molecule signals via the rejected promise).

**Behavioural states:**
- **Idle**: `bg-transparent`.
- **Hover**: `bg-muted/50`.
- **Open**: `bg-muted`.
- **Disabled**: `opacity-50 cursor-not-allowed`.
- **Error flash**: `border-destructive/60` for 1.5s after a failed save.

**Props:**
```ts
interface InlineCellSelectProps {
  value: string
  options: { value: string; label: string }[]
  onSave: (value: string) => Promise<{ ok: boolean; error?: string }>
  placeholder?: string
  disabled?: boolean
  className?: string
}
```

**Do not:**
- Add a label, icon, or floating-label patch — those belong in SelectField.
- Add an inline "Saved" indicator — table cells don't have room for it; saves are silent on success, errors flash + toast.

---

### CheckboxField — full spec

**File:** `02-app/components/checkbox-field.tsx` *(new)*
**Purpose:** Labelled checkbox with consistent layout. Used in checklists (VOC mapping, doc multi-select) and labelled standalone toggles.

**Anatomy:**
- Outer label element: `<label className="flex items-start gap-2 px-2 py-1.5 rounded cursor-pointer hover:bg-muted/30 transition-colors">` — entire row is clickable.
- Checkbox: base-ui `Checkbox.Root` styled `mt-0.5 h-4 w-4 rounded border border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary`. Tick mark uses lucide `Check` `h-3 w-3 text-primary-foreground` inside `Checkbox.Indicator`.
- Label text: `flex-1 text-sm text-foreground` (or `text-muted-foreground` for disabled).
- Description (optional): `text-xs text-muted-foreground mt-0.5` below the label, indented to align with label start (not under the checkbox).

**Behavioural states:**
- **Unchecked**: `border-border` on the checkbox.
- **Checked**: `bg-primary border-primary` on the checkbox + `Check` indicator visible.
- **Hover**: row background `bg-muted/30`.
- **Focus** (keyboard): focus ring on checkbox via `focus-visible:ring-2 focus-visible:ring-ring`.
- **Disabled**: `opacity-50 cursor-not-allowed`. Click does nothing. Label text in `text-muted-foreground`.

**Props:**
```ts
interface CheckboxFieldProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string | ReactNode
  description?: string
  disabled?: boolean
  className?: string
}
```

**Do not:**
- Take an `onSave` prop — the parent owns the save. (Different from SelectField/SliderField because checkbox toggles are typically batched: a list of 12 checkboxes shouldn't fire 12 separate save calls. Parent decides the save strategy.)
- Add a "Saved"/"Failed" indicator — same reason as above; the parent surface owns feedback.
- Add a `size` prop in DS-04 — current need is uniform. Add later if a feature needs `xs`.

---

### SliderField — full spec

**File:** `02-app/components/slider-field.tsx` *(new)*
**Purpose:** Field-context slider with InlineField visual parity. Track + thumb + readout. Variant for zero-centred ranges (DNA-09 Applications deltas).

**Anatomy:**
- Outer wrapper: matches SelectField outer — same border, same label patch, same hover/focus states.
- Inner content: vertical stack inside the envelope:
  - Top row: numeric readout (right-aligned, `text-sm font-mono text-foreground`) — formatted via `valueFormatter` if provided, else `String(value)`. For zero-centred variant, default formatter prepends `+` for positive values, `-` for negative.
  - Slider track row: base-ui `Slider.Track` (`relative h-1.5 rounded-full bg-muted`), `Slider.Indicator` (`absolute h-full rounded-full bg-primary`), `Slider.Thumb` (`block h-4 w-4 rounded-full bg-card border-2 border-primary shadow-sm focus-visible:ring-2 focus-visible:ring-ring`).
  - Bottom row (optional, if `lowLabel`/`highLabel` provided): two `text-xs text-muted-foreground` labels at left + right ends of the track row.
- Zero-centred variant: an additional thin tick mark at the 0 position — `absolute left-1/2 -translate-x-px h-3 -top-0.5 w-px bg-border`.
- Save feedback: same as SelectField — inline with label.

**Behavioural states:**
- **Idle**: track `bg-muted`, indicator `bg-primary`, thumb visible.
- **Hover** (over the slider area): `border-border` on outer wrapper.
- **Focus** (keyboard, via thumb): outer wrapper transitions to `border-field-active/50 bg-field-active/[0.03]`. Label/icon to `text-field-active`. Thumb gets focus ring.
- **Dragging**: thumb position updates onChange (local state). No save fired.
- **Released** (`mouseUp` / `touchEnd`): single `onSave(value)` call. Saving → Saved → cleared, like SelectField.
- **Disabled**: `opacity-50 cursor-not-allowed`, drag blocked, keyboard increments blocked.
- **min === max**: render as disabled, single value displayed.

**Edge cases:**
- **Keyboard nav**: arrow keys increment by `step`. PageUp/PageDown increment by `step * 10`. Home/End jump to min/max. (Base-ui handles this natively.)
- **Touch**: drag works the same; save fires on `touchEnd`.

**Props:**
```ts
interface SliderFieldProps {
  label: string
  value: number
  min: number
  max: number
  step?: number              // default 1
  onSave: (value: number) => Promise<{ ok: boolean; error?: string }>
  lowLabel?: string
  highLabel?: string
  valueFormatter?: (value: number) => string  // default: zero-centred ? '+/-X' : 'X'
  description?: string
  icon?: LucideIcon
  zeroCentred?: boolean
  disabled?: boolean
  className?: string
}
```

**Do not:**
- Save on `onChange` — only on `mouseUp` / `touchEnd`.
- Add a multi-thumb range mode — separate molecule if needed.
- Add tick marks beyond the zero-centred variant — that's a different molecule shape.

---

## Where each piece lands in design-system.md

After build:

1. **`## Molecule specifications`** — four new entries, all with the full DS-02 format:
   - `### SelectField`
   - `### InlineCellSelect`
   - `### CheckboxField`
   - `### SliderField`
2. **`### InlineField` spec** — one-line addition under "Behavioural states": disabled state pattern (matches the four new molecules).
3. **New `## Conventions` section** (if not already present) — documents the cell-context input/textarea Tailwind pattern. Fits between `## Organism conventions` and `## Known issues`.
4. **`## Changelog`** — new row: `2026-04-26 | DS-04: SelectField, InlineCellSelect, CheckboxField, SliderField. Cell-input convention. ~30 native control sites migrated.`

---

## Open questions to resolve at build time

1. **`Slider` atom positioning inside `components/ui/`** — confirm shadcn naming conventions match. If the existing `select.tsx` uses a particular file structure (default export of a compound component vs named exports), match it.
2. **base-ui Slider data-state values** — verify the prop names for value/onChange/disabled match what we're documenting. If they differ, adjust the molecule's prop translation layer.
3. **Migration: which native `<input>`/`<textarea>` sites become InlineField vs cell convention?** — per-site decision at migration time. Brief lists them all under "Text inputs"/"Textareas"; some are clearly InlineField (form fields with labels), others are cell editors (no label, dense). Decision per file based on visual context.
4. **`SourceDocPicker` checkbox migration** — the picker uses checkboxes per row in a list. Migrate to CheckboxField? Each row in this picker has more chrome than a typical checklist row. Confirm the visual fit at migration time; fall back to native if CheckboxField forces too much padding.
