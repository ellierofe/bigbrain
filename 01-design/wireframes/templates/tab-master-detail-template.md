# Template: Tab Master-Detail
Pattern name: `tab-master-detail`
Established from: DNA-09 (Applications tab)
Last updated: 2026-04-24

---

## What this template covers

A plural collection that lives inside a tab of another entity's detail page. Each item has enough editable fields that a table-with-expand pattern would be cramped, but the collection isn't a top-level DNA type with its own route (that's `dna-plural-item`).

Typical signals this pattern applies:
- Items belong to a parent (not free-standing)
- Parent already has its own page and tabbed content
- Items have 5+ editable fields including at least one of: array fields, structured JSON (deltas, configs), multi-line prose
- The list will grow to ~5-20 items over time, not hundreds
- Users flip between items to compare or edit actively

Distinct from:
- `dna-plural-item` — top-level DNA types with their own routes and switcher pills at the parent page level
- `project-workspace` — a workspace/lens view of linked items from many sources

---

## Fixed structure (do not redesign per instance)

### Where it lives

Inside a `TabsContent` within the parent page's `TabbedPane`. The tab's content root uses `h-full overflow-hidden` to override TabbedPane's default `overflow-y-auto` — the inner master/detail panes own their scroll. Do not modify TabbedPane; handle locally at the call site with a short comment.

### Outer tab frame

```
Tab root:  h-full overflow-hidden
└── flex h-full min-h-0
    ├── MasterPane  w-52 shrink-0 border-r border-border/40
    └── DetailPane  flex-1 min-w-0 flex flex-col min-h-0
```

### MasterPane — three-zone fixed chrome

```
┌─────────────────────────────┐
│ Fixed top    "[Label] (N)"  │ — header chrome, pinned
│              [archived toggle] │
├─────────────────────────────┤
│                             │
│ List  flex-1 overflow-y-auto│ — ONLY this scrolls
│  • item row                 │
│  • item row                 │
│  • item row                 │
│  (...)                      │
│                             │
├─────────────────────────────┤
│ Fixed bottom                │ — footer chrome, pinned
│    [+ New item] outline btn │
└─────────────────────────────┘
```

**Top chrome (`px-4 py-3 border-b border-border/40`):**
- Title + count in label/meta style (`text-xs font-medium uppercase tracking-wide text-muted-foreground`), live count updates
- "Show archived" checkbox, `text-xs`, right-aligned. Hidden when no archived items exist.

**List:**
- Row padding: `px-4 py-3`
- Row content: primary label (bold `text-sm`, truncated) + optional sub-metadata (chip + secondary)
- Active row: `border-l-2 border-primary bg-muted/40` (matches InPageNav convention)
- Inactive: `border-l-2 border-transparent` for alignment
- Hover: `hover:bg-muted/20 transition-colors`
- Archived (when shown): muted text, italicised label
- Sort: `isCurrent` first, then `updatedAt` desc — recently-edited floats to top

**Bottom chrome (`px-4 py-3 border-t border-border/40`):**
- `+ New [item]` full-width outline button

### DetailPane — two-zone fixed chrome

```
┌──────────────────────────────────────────┐
│ Fixed top                                │ — header chrome, pinned
│  Row 1: [Primary identifier field]  [archive btn]
│  Row 2: [Key meta field]  [Secondary meta field]
├──────────────────────────────────────────┤
│                                          │
│ Body  flex-1 overflow-y-auto min-h-0     │ — ONLY this scrolls
│  • Block 1 (e.g. structured editor)      │
│  • SectionDivider                        │
│  • Block 2 (prose fields)                │
│  • SectionDivider                        │
│  • Block 3 (array fields)                │
│  • Deferred-scope footnote (if any)      │
│                                          │
└──────────────────────────────────────────┘
```

**Top chrome (`px-6 py-4 border-b border-border/40 flex flex-col gap-3`):**
- Row 1: primary identifier InlineField (`flex-1`) + archive icon button (right, `h-8 w-8` ghost)
- Row 2: key meta fields (typically 2 InlineField / SelectField side by side)

**The "what stays pinned" rule:**
Anything that identifies *which item you're editing* belongs in fixed chrome. Anything that is *content of the item* goes in the scrolling body. When in doubt: if scrolling away from it would make you lose your place, pin it.

**Body (`flex-1 overflow-y-auto min-h-0 px-6 py-5 flex flex-col gap-6`):**
- Sections separated by SectionDivider molecules
- Each section can have a small heading (label/meta style) + caption
- Deferred-scope footnote at bottom in `text-[11px] text-muted-foreground/70` if any schema fields are intentionally excluded from this build

### Empty states

- **No items at all:** MasterPane shows only the bottom `+ New [item]` button centered vertically in the empty list area, with empty-state copy above it. DetailPane shows a neutral placeholder.
- **Items exist, nothing selected:** auto-select first on mount; fallback placeholder in DetailPane ("Select an [item] from the list.") for safety.
- **"Show archived" toggle disabled** when no archived items exist.

### Create flow

- `+ New [item]` in MasterPane footer opens a small modal (shadcn Dialog via `Modal`, size `md`)
- Modal contents: **3-5 fields maximum** — just enough to create the record with sensible defaults. The detail pane is where real editing happens.
- On create: insert with defaults, select the new item, focus moves to DetailPane's primary identifier field (for users who want to immediately continue editing)
- Cancel closes with no change
- **Intentionally minimal** — avoids the "fill in everything upfront" anti-pattern

### Edit flow

Inline autosave on every field. No separate edit mode.

- Save on blur for text fields (500ms debounce via InlineField)
- Save on mouseUp / touchEnd for sliders (same pattern as base Dimensions tab)
- Save immediately for selects (via SelectField)
- "Saved ✓" inline with label, fades 2s
- Array fields (e.g. tag lists, do-not-use lists): save full array on each change

### Archive and delete

- Archive icon button in DetailPane top chrome — flips `isCurrent` (or equivalent status column)
- Archived items hidden by default in MasterPane; "Show archived" reveals
- On archive: toast "Archived {label}" with Undo action, 5s window
- On restore: icon button flips; item returns to list immediately
- **No hard delete in v1** of any instance. Archive is the release valve.

### Deferred scope handling

If the schema has fields intentionally excluded from the build (e.g. fields that become relevant at generation time, not authoring time), add a muted footnote at the bottom of the DetailPane body explaining when they'll be wired up. Don't hide them silently.

### Loading / error states

- Data loaded server-side in parent page's loader alongside other page data
- No tab-level loading state
- Server action errors: toast
- Optimistic: create and archive should feel instant

### Viewport

Desktop-only (768px+), inherits from parent page.

---

## Variable parts (differ per instance)

| Part | Specify per instance |
|---|---|
| Parent page / route | Which ToV page, which tab |
| Item noun | "application", "rule", "override", etc. |
| Primary identifier field | Usually `label` or `name` |
| Row sub-metadata | Which fields appear below the primary label in each list row |
| Key meta fields (Row 2 of header) | Usually 2 fields that identify context (type + subtype) |
| Body blocks | What goes in the scrolling area — structured editors, prose, arrays |
| Array field UI | Single column, multi-column, or other table pattern |
| Archive column | `isCurrent boolean` vs `status varchar` vs equivalent |
| Create modal fields | 3-5 fields needed for initial insert |
| Sort default | Usually `isCurrent desc, updatedAt desc` — may vary |
| Deferred-scope footnote | Which fields excluded and why |
| Empty state copy | Per item type |

---

## When to use this template vs alternatives

**Use this pattern when:**
- Items live inside a parent page's tab
- Items have 5+ editable fields with mixed types
- Users flip between items to compare/edit
- Item count stays manageable (< ~30)

**Use `dna-plural-item` instead when:**
- Items are top-level DNA types with their own route
- Items need switcher pills at the page chrome level
- Items belong in the main nav

**Use a table-with-expand (like the Samples tab) instead when:**
- Items are mostly read-only
- Most fields are short strings
- Collection is browsable rather than actively edited

**Use a full-page detail view instead when:**
- Items are rich enough to warrant their own URL
- Items are central enough that they merit dedicated screen real estate
