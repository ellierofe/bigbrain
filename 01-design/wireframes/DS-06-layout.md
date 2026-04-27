# DS-06 — Save contract + migration: layout spec

Feature ID: DS-06
Status: approved (2026-04-27)
Brief: `01-design/briefs/DS-06-save-contract.md`

## Scope

Foundation work, not a feature. The layout artefacts are:
1. A new "Save contract" section in `01-design/design-system.md`
2. One new molecule (`ListRowField`) with full spec
3. The visual treatment of `ListRowField` rows in `value-proposition-view.tsx` and `brand-meaning-view.tsx`

No new views, routes, modals, or empty states.

## "Save contract" section in `design-system.md`

**Placement:** new top-level `## Save contract` section between `## Spacing` (~line 182) and `## Component hierarchy` (~line 183). Cross-cutting behavioural rule consumed by all form molecules; belongs alongside spacing/typography/colour rather than inside any one molecule's spec.

**Content:** the canonical 7-row table from the brief, plus the universal rule, plus a short paragraph on lib usage:

> The save lifecycle is owned by `02-app/lib/save-feedback.ts`. Components consume `useDebouncedSave` (timer + state machine) and `debouncedSaveToast` (single shared 800ms toast window). New form molecules MUST consume from this lib — do not re-implement the timer or state transitions inline.

Each existing form molecule's spec gets a new "Save contract" sub-line citing the row that applies (e.g. InlineField → "Text fields" row; SliderField → "Sliders" row). One-liner per molecule, no duplication of the table.

## `ListRowField` molecule — full spec

**File:** `02-app/components/list-row-field.tsx`
**Purpose:** Inline-list-row text editor. Used inside repeating list/card structures where each row is "text input + delete button" and the list provides its own visual chrome. Carries the same save contract as InlineField but without the field envelope — the host list container is the visual frame.

**Anatomy:**
- Outer wrapper: `relative flex items-center gap-2` (input variant) or `relative flex flex-col gap-1` (textarea variant). `min-w-0` so it can flex inside the row.
- Inner control: native `<input type="text">` or `<textarea>` (per `variant`), `flex-1 min-w-0`.
- **Idle:** `bg-transparent rounded-md border border-transparent px-0 py-1 text-sm text-foreground placeholder:text-muted-foreground/50` (input). Textarea adds `resize-none` and `rows={rows ?? 2}`.
- **Hover:** `hover:bg-muted/20 hover:px-2 transition-all duration-100`. Padding shift signals editability without a permanent border.
- **Focus:** `focus:outline-none focus:bg-muted/30 focus:px-2 focus:border-border` (border becomes visible on focus only). Padding shift matches hover.
- **Disabled:** `opacity-50 cursor-not-allowed`. Hover/focus chrome suppressed.
- **Saved/Failed indicator:**
  - Input variant: positioned **right of the input**, inline: `<span className="text-[10px] text-success shrink-0">Saved</span>` (or `text-destructive` for "Failed"). Slot stays present (`aria-live="polite"`) even when idle to avoid layout shift — `min-w-[3rem] text-right`.
  - Textarea variant: positioned **below the textarea**, right-aligned: `<div className="flex justify-end text-[10px] text-success">Saved</div>` (or destructive). `min-h-[14px]` to reserve the slot.
  - Auto-clears after 2s on success (matches InlineField). Persists until next save trigger on error.

**Decision (in scope):** ListRowField has **no `icon` prop**. The leading icon (e.g. `ListChecks` for differentiator rows, `Heart` for value rows) stays in the consumer's row composition. ListRowField is the editable cell only.

**Behavioural states:**
- **Idle / hover / focus:** as above.
- **Saving / Saved / Error:** identical state machine to InlineField, sourced from `useDebouncedSave`. Saving is silent, "Saved" auto-clears after 2s, "Failed" persists.
- **Disabled:** wrapper opacity, control disabled, save callback not invoked.

**Edge cases:**
- **Empty value:** passes through to `onSave('')` — consumer decides validity.
- **Unmount while save pending:** `useDebouncedSave` cleanup cancels the timer.
- **Rapid edits across many rows in the same list:** each row owns its own state. `debouncedSaveToast` (shared singleton) coalesces toasts to one per 800ms window across the whole list.
- **Long text in input variant:** truncation is the consumer's concern (it owns the row width). ListRowField sets `min-w-0` so flex containers can clamp it.
- **Textarea growing beyond `rows`:** native scrollbar (no auto-grow). Auto-grow is out of scope; `chat-input.tsx` is the special case.

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
- Add a label, envelope, or icon inside the molecule. Those belong in the consumer's row composition.
- Save on every keystroke — onBlur + debounce is the contract.
- Hardcode "Saved"/"Failed" colours — `text-success` / `text-destructive` tokens only.
- Reach for a `compact` flag on InlineField instead — ListRowField is intentionally a separate molecule because the visual role differs (list row vs. field).

**Save contract:** "Inline list rows" row of the contract table — onBlur + 500ms debounce, brief inline indicator + debounced toast, error inline + toast.

## Migrations — example row chrome

**`value-proposition-view.tsx` Differentiators (now):**
```tsx
<div key={i} className="flex items-center gap-2">
  <ListChecks className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
  <input type="text" value={d} onChange={...} className="..." />
  <IconButton icon={Trash2} ... />
</div>
```

**Differentiators (after):**
```tsx
<div key={i} className="flex items-center gap-2">
  <ListChecks className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
  <ListRowField
    variant="input"
    value={d}
    onSave={(v) => updateDifferentiator(i, v)}
    placeholder={`Differentiator ${i + 1}`}
    aria-label={`Differentiator ${i + 1}`}
  />
  <IconButton icon={Trash2} ... />
</div>
```

The row chrome (icon, delete button, gap, alignment) is unchanged. The hand-styled `<input>` is replaced; `onChange→state` becomes `onSave→server-action`. `updateDifferentiator` becomes async and returns `{ ok, error? }` — small action-shape change but contained.

**Brand Meaning value rows:** same shape. The textarea variant fields (value descriptions) get the "Saved" indicator below the textarea, right-aligned.

## Loading and error states

Not applicable to the molecule itself — it inherits from `useDebouncedSave`. Existing page loaders unchanged.

## Mobile

No new viewport assumptions. `ListRowField` is `flex-1 min-w-0` so it survives narrow containers; the consumer's row layout already determines wrapping.

## Molecule composition

### Existing molecules used (unchanged externally)
- `InlineField` (registry: `inline-field.tsx`, spec: `design-system.md § InlineField`) — keeps API and visuals; internal save lifecycle switches to consume `useDebouncedSave` from the new lib. **No external behaviour change.** Spec gains one "Save contract" line referencing the contract table.
- `SelectField`, `InlineCellSelect`, `CheckboxField`, `SliderField` — keep APIs; their `debouncedSaveToast` import path moves from `@/components/inline-field` to `@/lib/save-feedback`. Each spec gains one "Save contract" line.
- `IconButton`, `SectionCard`, `ActionButton` — used in migration sites; consumed unchanged.

### Existing molecules used but unspecced *(known DS-03 gap — not blocking)*
- None used in this scope.

### New molecules required
- **`ListRowField`** — inline-list-row text editor (input + textarea variants). Spec sketched above; full spec lands in `design-system.md` at build time.
  - Props: `value`, `onSave`, `variant`, `placeholder?`, `aria-label`, `rows?`, `disabled?`, `debounceMs?`, `className?`
  - Visual: no envelope; transparent border; hover/focus padding shift + bg tint; right-aligned (input) or below-aligned (textarea) "Saved"/"Failed" indicator
  - Replaces: ~5 hand-rolled list-row inputs/textareas in `value-proposition-view.tsx` and `brand-meaning-view.tsx`. Likely consumers: `string-list-editor.tsx` and `ideas-list.tsx` editing flows (audited at build time; not blocking).

### Atoms used directly
- None new. Existing direct atom imports across the codebase are unchanged by this work (DS-07 territory).

### New lib (not a molecule, but called out for the build plan)
- **`02-app/lib/save-feedback.ts`** — exports `SaveState` type, `debouncedSaveToast()` function, `useDebouncedSave<T>()` hook. Sourced from existing code in `inline-field.tsx`. No design-system spec needed (it's a lib, not a UI molecule); reference to it lives in the new "Save contract" section.

## Open questions resolved at layout time

- **Brief TBD #1 — SliderField and `useDebouncedSave`:** SliderField's mouseUp trigger fires once and the value already represents the user's intent. The hook's `debounceMs` model isn't a great fit. **Decision:** SliderField does NOT consume `useDebouncedSave`. Keeps its current shape: on commit, fire `onSave` immediately, then call `debouncedSaveToast()` (imported from the new lib path). The hook is for keystroke-driven controls (InlineField, ListRowField).
- **Brief TBD #2 — ListRowField "Saved" indicator placement:** resolved above. Right-of-input (input variant), below-right (textarea variant), with reserved slot to prevent layout shift.
- **Brief TBD #3 — `string-list-editor.tsx` migration:** deferred to build-time audit. Read it and decide; if its existing input chrome already matches contract row 4 it stays, else it adopts ListRowField. Not blocking.
- **Brief TBD #4 — `lib/save-feedback.ts` filename:** confirmed no collision in `02-app/lib/`.

## Decisions baked in beyond the brief

1. **`ListRowField` has NO `icon` prop.** The leading icon stays in the consumer's row composition — preserves existing layout flexibility, keeps the molecule scope tight.
2. **`SliderField` doesn't consume `useDebouncedSave`.** It calls `debouncedSaveToast()` directly. The hook is for keystroke-driven controls only.

Approved 2026-04-27.
