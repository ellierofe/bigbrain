# DNA-09 — Applications tab layout

Feature: DNA-09 Tone of Voice system (Applications sub-feature)
Pattern: new — `tab-master-detail` (first instance)
Page: `/dna/tone-of-voice`
Approved: 2026-04-24
Status: approved, not yet built

---

## Context

Adds a 5th tab ("Applications") to the existing Tone of Voice page. Backed by `dna_tov_applications` (table exists since M1). Each application is a per-format delta from the base voice — e.g. "LinkedIn posts" bumps formality down, adds `doNotUse` items, and attaches structural guidance.

The parent ToV page uses the outer two-column layout (w-64 aside + right tabbed content). This tab lives inside that right column.

**Out of scope** (deferred per backlog note on DNA-09): `tonalTags` editing UI, sample `embedding` generation. Revisit when OUT-02 retrieval is wired.

---

## Pattern: `tab-master-detail`

First instance of a new pattern. Applies to any plural collection living inside a tab of another entity's detail page, where the items have enough editable fields that a table-with-expand pattern would be cramped.

Distinct from `dna-plural-item` (that pattern is for top-level DNA types with their own routes and switcher pills at page level).

---

## Views needed

One view — the Applications tab itself. No modals or full-page views apart from the small creation modal.

---

## Navigation and routing

- Accessed via the existing ToV page tab strip — "Applications" becomes the 5th tab (after Linguistics, Dimensions, Vocabulary, Samples)
- No URL routing changes. Selected application is tab-local state (`useState`), not URL-persisted. Consistent with the other ToV tabs.
- If usage shows that deep-linking to a specific application matters, add `?application=[id]` later — cheap.

---

## Layout — fixed chrome with scrolling panes

Carrying through the platforms-page convention: critical chrome stays pinned, only content areas scroll.

```
TabsContent (inherits overflow-y-auto min-h-0 from TabbedPane — overridden here)
└── Applications tab root: h-full overflow-hidden
    └── flex h-full min-h-0
        ├── MasterPane  w-52 shrink-0 border-r border-border/40
        │   ├── Fixed top  px-4 py-3 border-b border-border/40
        │   │   • "Applications (N)" label (label/meta style)
        │   │   • "Show archived" checkbox (right)
        │   ├── List  flex-1 overflow-y-auto min-h-0
        │   │   • Application rows
        │   └── Fixed bottom  px-4 py-3 border-t border-border/40
        │       • "+ New application" full-width outline button
        │
        └── DetailPane  flex-1 min-w-0 flex flex-col min-h-0
            ├── Fixed top  px-6 py-4 border-b border-border/40
            │   • Row 1: Label InlineField (flex-1) + archive icon button
            │   • Row 2: formatType SelectField (w-40) + subtype InlineField (flex-1)
            ├── Scrolling body  flex-1 overflow-y-auto min-h-0 px-6 py-5 flex flex-col gap-6
            │   • Dimension deltas block
            │   • SectionDivider
            │   • Notes (textarea)
            │   • Structural guidance (textarea)
            │   • SectionDivider
            │   • Do not use list
            │   • Deferred-scope footnote
            └── (no fixed bottom)
```

### Build-time note: TabsContent scroll override

`TabbedPane` applies `overflow-y-auto min-h-0` to every `TabsContent`. For this tab, the inner master/detail panes own their own scroll. The tab's content root uses `h-full overflow-hidden` and its children manage overflow — the outer `overflow-y-auto` becomes a no-op. Do not modify TabbedPane; handle locally at the call site with a short comment explaining why.

---

## Master pane (left sub-list)

### Fixed top chrome

- "Applications (N)" — label/meta style: `text-xs font-medium uppercase tracking-wide text-muted-foreground`. Live count updates as applications are added/archived.
- "Show archived" — small checkbox, `text-xs`, right-aligned. Hidden when no archived items exist.

### List

- Each row: `px-4 py-3`, cursor pointer, `hover:bg-muted/20 transition-colors`
- Row content:
  - `label` — bold, `text-sm`, truncated
  - `formatType` chip below label — reuse the pill style from Samples tab (`inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground`)
  - `subtype` — `text-xs text-muted-foreground`, shown inline after the chip with a dot separator if present
- Active row: `border-l-2 border-primary bg-muted/40` (matches InPageNav convention)
- Inactive row: `border-l-2 border-transparent` (for alignment)
- Archived application in list (when shown): muted text, italicised label, "Archived" tag in place of formatType chip
- Sort: `isCurrent` first, then `updatedAt` desc — recently-edited applications float to top

### Fixed bottom chrome

- `+ New application` — full-width outline button. Opens create modal.

### Empty state — no applications

When the brand has zero applications, the master pane shows only the fixed bottom `+ New application` button centered vertically in the empty list area, with copy above it:

> "No applications yet. Create one to define how the voice shifts for a specific format."

The detail pane shows a neutral placeholder: "Select an application from the list." (Not reachable in practice — auto-select first application on mount — but fallback for safety.)

---

## Detail pane

### Fixed top chrome (pinned while body scrolls)

- **Row 1** (flex gap-3, align centre):
  - Label InlineField, `variant=input`, `flex-1`, icon: `Tag` or similar, placeholder "e.g. LinkedIn posts"
  - Archive icon button (right): `Archive` lucide icon if `isCurrent`, `ArchiveRestore` if archived. Tooltip: "Archive" / "Restore". Size: `h-8 w-8` ghost button.

- **Row 2** (flex gap-3):
  - formatType SelectField (new molecule — see below), `w-40`, icon: `Layers`, options from `TOV_FORMAT_TYPES` constant
  - subtype InlineField, `variant=input`, `flex-1`, icon: `Hash`, placeholder "e.g. linkedin_post"

### Scrolling body

**Block 1 — Dimension deltas**

- Block heading: small label "Voice shift from base" (label/meta style)
- Block caption (one line, muted): "These adjust the base voice for this format — e.g. +15 formality for client emails."
- Four rows, one per dimension in fixed order: humour, reverence, formality, enthusiasm
- Each row:
  ```
  [Dimension label]    [—————●—————]   +15
                       -50        +50
  Base 30 → With delta: 45
  ```
  - Dimension label: `w-28` fixed, `text-sm font-semibold`
  - Slider: `flex-1`, range `-50` to `+50`, step `5`, zero-centred. Track shows a subtle tick at 0 (visual emphasis).
  - Current delta value: `w-12 text-right font-mono tabular-nums text-sm`, formatted with sign (e.g. `+15`, `0`, `-10`)
  - Readout below: `text-[11px] text-muted-foreground tabular-nums` — "Base {base} → With delta: {effective}". Effective = `clamp(base + delta, 0, 100)`. Updates live as slider moves.
- Delta notes field below the four rows: InlineField variant=textarea, rows=2, label "Delta notes", icon `StickyNote`, placeholder "e.g. Client emails are slightly more formal than general brand content". Persisted as `dimensionDeltas.notes` alongside the numeric scores.
- Save behaviour for sliders: on mouseUp / touchEnd (not onChange) — same pattern as the base Dimensions tab.

**SectionDivider**

**Block 2 — Prose fields**

- Notes — InlineField variant=textarea, rows=4, label "Application notes", icon `Pen`, description "What changes and why. Cadence, CTA style, sentence length, emotional register shifts."
- Structural guidance — InlineField variant=textarea, rows=4, label "Structural guidance", icon `FileText`, description "Format-specific structural rules."

**SectionDivider**

**Block 3 — Do not use list**

- Block heading: "Do not use" (label/meta style)
- Caption: "Specific things to avoid in this format that are otherwise acceptable."
- Table pattern (single column): rounded border container with header row "Item" + rows below
- Each row: text input (bg-transparent, focus:bg-muted/30) + X button on the right. Save on blur. New row starts empty and focused.
- Add button below: `+ Add` outline button, small.

**Deferred-scope footnote** (bottom of scrolling body, last)

Muted note, `text-[11px] text-muted-foreground/70`:
> "Tonal tags and embeddings are set at generation time (coming with OUT-02)."

---

## Create flow

- `+ New application` in MasterPane footer opens a modal
- Modal (shadcn Dialog via existing `Modal` molecule), size `md`
- Title: "New application"
- Fields:
  - Label (required, input, placeholder "e.g. LinkedIn posts")
  - Format type (required, select, options from `TOV_FORMAT_TYPES`)
  - Subtype (optional, input, placeholder "e.g. linkedin_post")
- Actions: Cancel (ghost) + Create (primary, disabled until label and formatType present)
- On create: insert with `dimensionDeltas = null`, `notes = null`, `doNotUse = null`, `isCurrent = true`. Select the new application in the master pane. Focus moves to the detail pane's label field (for users who want to immediately continue editing).
- **Intentionally minimal.** Everything after creation happens via autosave in the detail pane.

---

## Edit flow

Inline autosave on every field. No separate edit mode. Matches the rest of the page.

- Save on blur, 500ms debounce (InlineField contract)
- Sliders save on mouseUp / touchEnd
- "Saved ✓" inline with label, fades 2s
- `tonalTags` and `embedding` are NOT editable — footnote explains

---

## Archive and delete

- Archive via icon button in DetailPane header — flips `isCurrent = false`
- Archived applications hidden by default in the master pane; "Show archived" toggle reveals them
- On archive: toast "Archived {label}" with Undo action, 5s window (matches ideas list)
- On restore: icon button flips; application returns to list immediately
- No hard delete in v1. Archive is the release valve.

---

## Empty / loading / error states

- **No applications:** handled in master pane (see above)
- **Applications exist, none selected:** fallback placeholder in detail pane ("Select an application from the list.") — not reachable in practice; auto-select first on mount
- **"Show archived" toggle disabled** when no archived applications exist
- **Loading:** data fetched server-side in `page.tsx` alongside existing ToV queries. No tab-level loading state.
- **Errors:** toast on server action failure (existing page pattern)
- **Optimistic:** create and archive should feel instant

---

## Mobile

Desktop-only (768px+), per page convention. At ~900px viewport the nested master + detail starts competing with the outer aside — same trade-off as the rest of the page.

---

## New molecules required

### SelectField

An InlineField variant with a select control. Needed here for `formatType`. Will recur — any DNA field with a closed set of options.

**Spec to add to design-system.md before build:**

- **File:** `components/select-field.tsx`
- **Purpose:** Auto-saving inline select for closed-option fields. Visual parity with InlineField.
- **Props:** `label`, `icon (LucideIcon)`, `value`, `options: { value: string; label: string }[]`, `onSave: (value: string) => Promise<{ ok: boolean; error?: string }>`, `placeholder?`, `className?`
- **Visual:** Matches InlineField exactly — always-visible `border-border/60`, floating label `-top-2.5 left-2.5`, icon prefix, `text-[10px] font-semibold capitalize tracking-wide text-muted-foreground` label, `px-3 py-2` with `pt-4` when label present.
- **Control:** Uses shadcn `Select` as the atom. Chevron-down indicator on the right replaces any text-input caret.
- **Focus state:** Same as InlineField — `border-field-active/50 bg-field-active/[0.03]`, label/icon transition to `text-field-active`.
- **Save feedback:** Inline with label — "Saved" / "Failed", same treatment as InlineField.
- **Save timing:** Immediate on change (selects don't blur-debounce well).
- **Transition:** `transition-colors duration-100`.

### TOV_FORMAT_TYPES constant

Not a molecule — a typed constant. Proposed location: `lib/types/tone-of-voice.ts`.

```ts
export const TOV_FORMAT_TYPES = ['social', 'email', 'sales', 'blog', 'spoken', 'other'] as const
export type TovFormatType = typeof TOV_FORMAT_TYPES[number]

export const TOV_FORMAT_LABELS: Record<TovFormatType, string> = {
  social: 'Social',
  email: 'Email',
  sales: 'Sales',
  blog: 'Blog',
  spoken: 'Spoken',
  other: 'Other',
}
```

Use on both sample-add UI (when built) and Applications detail pane. Prevents drift between the two tables' `formatType` values, which would break retrieval joins.

---

## Data and server actions

Existing: `lib/db/queries/tone-of-voice.ts` has `listApplications`.

Additions needed:

- `createApplication(data)` — server action
- `updateApplicationField(id, field, value)` — matches `saveTovField` pattern
- `updateApplicationDeltas(id, deltas)` — writes full `dimensionDeltas` object
- `updateApplicationDoNotUse(id, array)` — writes full `doNotUse` array
- `archiveApplication(id)` / `unarchiveApplication(id)`

Standard CRUD extensions of existing queries — no brief needed.

---

## Open questions — resolved

1. **Format type values:** hardcoded TS constant `TOV_FORMAT_TYPES` at `lib/types/tone-of-voice.ts`. Revisit if set grows beyond ~12 or labels need rich descriptions.
2. **Subtype:** free-text for v1. Revisit after OUT-02 use reveals whether autocomplete/curation matters.
3. **Archive undo window:** 5s, matches ideas list.
4. **Base + delta readout:** included — `Base N → With delta: M` below each slider, live.

---

## Acceptance — reviewer

Approved by Ellie on 2026-04-24. Note from approval: "I can't envisage exactly what this is so I'll need to see it and we can revise if necessary." — first build pass is exploratory; expect a revision round after the UI is visible.
