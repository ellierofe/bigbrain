# DS-06: Save contract definition + migration
Feature ID: DS-06
Status: complete
Last updated: 2026-04-27

## Summary

Define a canonical save contract in the design system — which trigger and which feedback mechanism applies to each surface type (field, slider, table cell, list row, modal, bulk action) — and migrate the worst behavioural-drift hotspots to conform. Extract the duplicate `debouncedSaveToast` logic and the underlying save state machine from `inline-field.tsx` into a shared `lib/save-feedback.ts`, so InlineField, the DS-04 molecules, and the new list-row molecule share one lifecycle. Introduces one new molecule (`ListRowField`) for the inline-list-row pattern that today is hand-rolled in three DNA pages with three subtly different save behaviours.

This is the behavioural counterpart to DS-02 (token unification) and DS-05 (button molecules) — same drift category (organisms inventing their own version of a shared concern), different layer (behaviour, not appearance).

## Why this matters

- **P1 — visibility.** Today, on `value-proposition-view.tsx`, differentiators save on `onChange` with no feedback at all: the user types, focus leaves, and there is *zero* signal that the edit persisted. Users cannot tell if a save happened until the page reloads. This is the worst possible state for a system whose first design rule is "visibility over trust."
- **Behavioural consistency.** Tone of Voice currently has 4 save patterns on a single page (audit § 2). Switching between sections feels like switching apps.
- **Eliminates duplication.** The save state machine (timer + `savedValueRef` + `'idle' | 'saving' | 'saved' | 'error'` transitions) currently lives in `inline-field.tsx:60-86` and is partially duplicated in `ideas-list.tsx:10-17`. DS-04 molecules import `debouncedSaveToast` from `inline-field.tsx` — a temporary cross-import flagged for this ticket. Extracting the lifecycle into a hook lets every save-bearing molecule consume one source of truth.
- **Closes UX-07** (autosave feedback consistency) which is a strict subset of this work.

## Use cases

Not user-facing as a feature. The user-visible effect:
- Every editable field across the app uses the same save trigger and the same feedback signal for its surface type.
- Every silent-save site that today leaves the user guessing now confirms saves the same way (inline "Saved" badge or, for the list-row case, a brief inline indicator).
- All save errors surface loudly (inline "Failed" + toast) regardless of which control the user touched.

## User journey

Pure UI/refactor work; no journey changes. The journey for any save action becomes:

1. User edits a value in any control.
2. Save fires per the contract for that surface type (onBlur+debounce / onMouseUp / immediate / explicit submit).
3. Feedback appears per the contract (inline badge / toast / spinner) — same visual treatment as every other control of that type.
4. On error: inline "Failed" badge + error toast, regardless of control type.

## Canonical save contract

This table is what gets documented in `01-design/design-system.md` (new section: "Save contract").

| Surface | Trigger | Feedback on success | Feedback on error |
|---|---|---|---|
| **Text fields** (InlineField input + textarea) | onBlur + 500ms debounce | Inline "Saved" badge in label patch + debounced "Changes saved" toast | Inline "Failed" badge + error toast |
| **Sliders** (SliderField) | onMouseUp / onTouchEnd | Visible value change + debounced "Changes saved" toast | Error toast |
| **Selects / checkboxes** (SelectField, CheckboxField, InlineCellSelect) | onChange (immediate) | Inline "Saved" badge + debounced toast | Inline "Failed" badge + error toast |
| **Inline list rows** (ListRowField — new) | onBlur + 500ms debounce | Brief inline "Saved" indicator (right of input, fades after 2s) + debounced toast | Inline "Failed" indicator + error toast |
| **Table cells** (VocTable, EntityOutcomesPanel cells) | onBlur + 500ms debounce | Silent on success (cell value is the confirmation; per-cell badges would be visual noise) + debounced "Changes saved" toast at the table level | Error toast (no inline indicator — cell-level badge is too crowded) |
| **Creation modals** (Create*Modal) | Form submit button | Spinner during async + success toast on close | Error toast; modal stays open |
| **Bulk operations** (ideas-list batch actions) | Explicit button | Toast + optimistic UI; "Undo" affordance where safe | Toast + revert |
| **Universal rule** | — | If you save silently, surface errors loudly. If you confirm success, confirm errors the same way. | — |

## Lib extraction — `02-app/lib/save-feedback.ts`

New file consolidating the save lifecycle:

- `type SaveState = 'idle' | 'saving' | 'saved' | 'error'`
- `function debouncedSaveToast(): void` — moved verbatim from `inline-field.tsx:15-21`. Single shared timer across the whole app.
- `function useDebouncedSave<T>(opts: { value: T; onSave: (v: T) => Promise<{ ok: boolean; error?: string }>; debounceMs?: number }): { state: SaveState; errorMsg: string | null; trigger: (v: T) => void }` — the timer + `savedValueRef` + state-transition logic currently inline in `inline-field.tsx:60-86`. Returns the current state and a `trigger` callback the consumer wires up to its `onBlur` or equivalent.

`InlineField`, `ListRowField`, and all DS-04 molecules consume the hook. The DS-04 cross-import from `inline-field.tsx` (flagged in DS-04 decisions log as temporary) is removed.

The duplicate copy in `ideas-list.tsx:10-17` is deleted in favour of the lib import.

## New molecule — `ListRowField`

The inline-list-row pattern: a row-style text input or textarea, no envelope, no floating label, with the save contract baked in. Today this pattern is hand-rolled in:

- `value-proposition-view.tsx:181-188` — Differentiators (input row, ~60 char chrome string)
- `value-proposition-view.tsx:223-230` — Alternatives "alternative" title (input)
- `value-proposition-view.tsx:240-247` — Alternatives "whyUs" body (textarea)
- `brand-meaning-view.tsx:240` — Brand Meaning values (input)
- `brand-meaning-view.tsx:257, 270` — Brand Meaning value descriptions (textarea)

Five known sites today, three more likely in `string-list-editor.tsx` and `ideas-list.tsx` editing flows (verify at layout-design time).

**Props:**
- `value: string | null`
- `onSave: (value: string) => Promise<{ ok: boolean; error?: string }>`
- `variant: 'input' | 'textarea'`
- `placeholder?: string`
- `rows?: number` (textarea only; defaults to 2)
- `icon?: LucideIcon` (rendered to the left of the input — used by Brand Meaning value rows where today there's a leading icon)
- `aria-label`: required (no visible label — accessibility name supplied by consumer)
- `disabled?: boolean`
- `className?: string`

**Visual treatment:**
- No always-visible border (envelope is for fields, not list rows)
- Hover: subtle bg shift (`hover:bg-muted/20`) to signal editability
- Focus: same `border-field-active` treatment as InlineField but without the floating label patch
- Inline "Saved"/"Failed" indicator: small `text-success` / `text-destructive` text element positioned to the right of the input (or below, for textarea variant), fades after 2s on success
- Token-driven throughout — no hardcoded colours

**Save behaviour:**
- Uses `useDebouncedSave` from `lib/save-feedback.ts`
- onBlur trigger, 500ms debounce — same contract as InlineField text fields

The molecule does NOT include the delete button or the row container — those stay in the consumer (each list has different chrome around the row). ListRowField is the editable cell only.

## Migration scope

### Hotspots to migrate (explicit)

1. **`value-proposition-view.tsx`** — Differentiators (~5 sites depending on item count) and Alternatives (~10 sites: 2 fields × N items). Replace raw `<input>` / `<textarea>` with `ListRowField`.
2. **`brand-meaning-view.tsx`** — Value cards (input + textarea per value). Replace with `ListRowField`. Per the user: editing is in-place; generation isn't built yet, so the modal-creation alternative isn't relevant.
3. **`tone-of-voice-view.tsx`** — Verification only. After DS-04 the sliders are `SliderField` (mouseUp + toast — matches contract row 2) and the vocabulary table cells use the cell-context input convention (matches contract row 5). Confirm both sites now match the documented contract; if any silent-save behaviour remains in the vocabulary table, add the table-level debounced toast.
4. **`ideas-list.tsx`** — Delete the duplicate `debouncedSaveToast` definition (lines 10-17) and import from `lib/save-feedback.ts`. Audit for any list-row editing flows that should adopt `ListRowField`.

### Out-of-scope migrations

- **Refactoring `InlineField`** — already canonical. It gets one change: switch its inline timer/state code over to `useDebouncedSave`. No API or visual changes.
- **DS-04 molecules** — they already match contract rows 2–3. Just swap their `debouncedSaveToast` import path.
- **Creation modals** — they already match contract row 6. No migration needed.
- **`chat-input.tsx`** — special-case autosizing textarea, not a save-bearing form control. Out of scope.
- **VocTable / EntityOutcomesPanel** if they already conform after DS-04 — verification only.

## Update behaviour

Not applicable — refactor + documentation work.

## Relationships

### Knowledge graph (FalkorDB)
None.

### Postgres
None.

## UI/UX notes

Layout spec at `01-design/wireframes/DS-06-layout.md` (approved 2026-04-27). Resolves the four brief TBDs:

- **"Saved" indicator placement** — right-of-input (input variant); below-right (textarea variant). Reserved slot prevents layout shift.
- **Icon prop on `ListRowField`** — none. Leading icons stay in the consumer's row composition. ListRowField is the editable cell only.
- **`SliderField` and `useDebouncedSave`** — SliderField does NOT consume the hook. It calls `debouncedSaveToast()` directly after committing. The hook is for keystroke-driven controls (InlineField, ListRowField) only.
- **`lib/save-feedback.ts` filename** — confirmed no collision.

"Save contract" lands as a new top-level section in `design-system.md` between Spacing and Component hierarchy. Existing form molecule specs (InlineField, SelectField, etc.) gain a one-line "Save contract" reference.

## Edge cases

- **`useDebouncedSave` unmount during pending save** — if the consumer unmounts while a debounced save is queued, cancel the timer to avoid a setState-after-unmount warning. Standard cleanup.
- **`ListRowField` empty value** — same behaviour as InlineField: pass through to `onSave(value)` and let the consumer decide whether empty is valid. The molecule doesn't enforce non-empty.
- **Rapid edits across multiple fields** — `debouncedSaveToast` already coalesces toasts to one per 800ms window across the whole app. Preserve this behaviour after extraction.
- **Save in flight when user re-edits** — the existing InlineField behaviour resets the debounce timer on every keystroke. Preserve.
- **Error state then user retypes** — error indicator clears as soon as a new save is queued. (Currently InlineField sets `errorMsg = null` inside `triggerSave` — preserve.)
- **Disabled state on `ListRowField`** — same treatment as DS-04 molecules (`opacity-50 cursor-not-allowed`, all interactions blocked, save callback not invoked).

## Out of scope

- New control types not currently in use (combo box, multi-select tag input, date picker).
- Save patterns for not-yet-built features (e.g. content creator generation flows, chat history persistence). These should adopt the contract when built; this ticket does not anticipate them.
- "Undo" affordance for bulk operations — the contract row 7 *recommends* undo but this ticket does not build it. Future work, possibly its own ticket if the pattern recurs.
- Per-cell save badges in tables — explicitly rejected in favour of the silent-cell + table-level-toast pattern (audit § 2 + your Q1b answer).
- Visual pulse on slider save — explicitly rejected; sliders rely on the visible value change + debounced toast (your Q1a answer).
- Refactoring `string-list-editor.tsx` if its existing chrome is fine — only migrate if it's a behaviour drift hotspot. Investigate at layout-design time and decide.

## Open questions / TBDs

1. **Does `SliderField` consume `useDebouncedSave` or just the lower-level primitives?** — depends on whether the hook's debounce-on-trigger model fits a mouseUp-fires-once event. Resolve at layout-design / plan time.
2. **`ListRowField` "Saved" indicator visual** — exact placement and animation. Resolve at layout-design.
3. **Does `string-list-editor.tsx` need migrating?** — depends on whether its existing input chrome already matches contract row 4 or whether it's silent-save drift. Investigate during layout-design.
4. **Final lib filename and exports** — `02-app/lib/save-feedback.ts` proposed; confirm at plan time it doesn't collide with anything.

## Decisions log

- 2026-04-27: Brief drafted. Source: foundation audit § 2 + handoff from DS-04/05/09 build session.
- 2026-04-27: Q1a — sliders show toast on save (no inline pulse; visible value change + debounced toast is sufficient).
- 2026-04-27: Q1b — table cells stay silent on success per cell; table-level debounced toast covers the success signal.
- 2026-04-27: Q4 — Brand Meaning value cards are edited in place (no generation modal yet). Use `ListRowField`.
- 2026-04-27: Q5 — extract `debouncedSaveToast`, `SaveState` type, AND `useDebouncedSave` hook to `lib/save-feedback.ts` (revised from "just the toast + type" once the second consumer — `ListRowField` — was confirmed; three consumers reuse the same lifecycle).
- 2026-04-27: Q6 — canonical contract documented as a new section in `01-design/design-system.md`; molecule specs cross-reference it.
- 2026-04-27: New molecule decision — `ListRowField` rather than (a) Tailwind convention only or (b) a `compact` prop on InlineField. Reasons: shares contract with InlineField but has a distinct visual role (list row, not field); keeps InlineField's spec gate-able; small surface area; three known consumers (Value Prop, Brand Meaning, possibly StringListEditor / ideas-list).
- 2026-04-27: Brief approved.
- 2026-04-27: Layout spec approved (`01-design/wireframes/DS-06-layout.md`). Two decisions baked in beyond the brief: (1) ListRowField has no `icon` prop — leading icons stay in the consumer; (2) SliderField does NOT consume `useDebouncedSave` — it calls `debouncedSaveToast()` directly after commit. The hook is for keystroke-driven controls only.
- 2026-04-27: Build complete. Shipped: `lib/save-feedback.ts` (SaveState, debouncedSaveToast, useDebouncedSave); `ListRowField` molecule (input + textarea variants); refactored InlineField to consume the hook (no API change); migrated 3 hand-rolled controls in `value-proposition-view.tsx` and 3 in `brand-meaning-view.tsx`. SelectField + SliderField + ideas-list import path swap; ideas-list duplicate `debouncedSaveToast` deleted. Added `## Save contract` section + ListRowField spec + 5 form-molecule "Save contract:" lines to `design-system.md`. Coherence check: no new warnings (carried 1 missing spec + 20 atom imports unchanged, all DS-03/DS-07 territory). TypeScript: zero new errors (pre-existing `Trash2` carryover unchanged). User verified all 12 manual test cases. UX-07 closed as superseded.
