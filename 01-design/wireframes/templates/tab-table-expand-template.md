# Template: Tab Table-Expand
Pattern name: `tab-table-expand`
Established from: DNA-09 Samples tab (2026-04-20, retroactively registered 2026-04-24)
Last updated: 2026-04-24

---

## What this template covers

A plural collection that lives inside a tab of another entity's detail page, browsable as a table with one clickable row that expands into inline edit fields. Simpler and denser than `tab-master-detail` — best when items are mostly read-only, have short string fields, or are browsed more than actively edited.

Typical signals this pattern applies:
- Items belong to a parent (not free-standing)
- Parent already has its own page and tabbed content
- Items have ~3-6 fields, mostly short strings, maybe one longer text block
- Collection is browsable rather than heavily edited (you scan more than you author)
- Item count can grow large (20+) and still be usable — rows are compact
- Users care about scanning multiple items at once, not comparing two in depth

Distinct from:
- `tab-master-detail` — use when items have 5+ editable fields including structured JSON, sliders, or arrays, and users actively flip between items to compare
- `dna-plural-item` — use for top-level DNA types with their own routes
- `project-workspace` — use for workspace/lens views of linked items from many sources

---

## Fixed structure (do not redesign per instance)

### Where it lives

Inside a `TabsContent` within the parent page's `TabbedPane`. Because the whole tab scrolls as one column, this pattern can use TabbedPane's default `overflow-y-auto` — no scroll override needed (unlike `tab-master-detail`).

### Outer tab frame

```
Tab content:  flex flex-col gap-4 pb-8
├── (optional) short caption — "What this tab shows, one line."
└── Table container  rounded-lg border overflow-hidden
    ├── Header row      grid grid-cols-[...] bg-muted/50 border-b px-3 py-2
    └── Data rows       click to expand inline
```

### Table structure

**Header row:**
- `grid grid-cols-[...] gap-0 bg-muted/50 border-b px-3 py-2`
- Column headers in label/meta style (`text-xs font-medium uppercase tracking-wide text-muted-foreground`)
- Trailing column reserved for actions (e.g. delete) — typically `2rem` wide
- Column widths are explicit (grid-cols template), not auto — keeps rows aligned across page states

**Summary row (collapsed):**
- Matches header grid template for column alignment
- `px-3 py-2 items-center hover:bg-muted/20 transition-colors cursor-pointer`
- `onClick` toggles expand/collapse
- Primary identifier column: either a chip (e.g. type pill) or compact text
- Preview column: truncated string representation (first N chars, ellipsis)
- Secondary meta column: subtype / date / source
- Action column (e.g. delete): `stopPropagation` on click so it doesn't toggle expand
- Uses `border-b last:border-b-0` between rows

**Expanded detail (inline, below summary row):**
- `px-3 pb-4 pt-1 bg-muted/10 border-t border-border/40` — subtle muted background distinguishes it from the collapsed table
- Width-limited inside: `max-w-2xl` on the inner flex column — full-width editing on wide monitors looks loose
- `flex flex-col gap-3` for fields
- Side-by-side fields use `flex gap-4` rows (e.g. type + subtype on one line)
- All fields use `InlineField` with autosave — same contract as the rest of the page
- Full-text fields (body, notes) use `variant="textarea"` with appropriate `rows`

### Empty state

Inside the table container, in place of rows:

```
<div className="px-3 py-6 text-center text-sm text-muted-foreground/60">
  No [items] yet.
</div>
```

Optional: add a CTA button below the table or in the tab's top-right corner.

### Edit flow

Inline autosave via InlineField. No separate edit mode. Matches the rest of the page:
- Save on blur, 500ms debounce
- "Saved ✓" inline with label, fades 2s
- Toast only for errors, not for saves

### Delete flow

- Icon button (Trash2) in the action column of each summary row
- Click removes row optimistically + shows success toast
- On failure: restore row + error toast
- **No archive for this pattern** — items are simple enough that hard delete is acceptable. If soft-delete is needed for a particular instance, upgrade to `tab-master-detail` instead.

### Create flow

Two options, pick per instance:
- **Seed + add button above the table** — "+ Add [item]" outline button, opens small modal
- **Seed-only** — items are created by a pipeline or script, not manually (e.g. the initial ToV Samples seed). Flag this in the instance's layout spec.

When the add modal is used, keep it to 2-4 fields. The inline expand handles anything more detailed.

### Loading / error states

- Data loaded server-side in parent page's loader alongside other page data
- No tab-level loading state needed
- Server action errors: toast
- Optimistic delete: remove row immediately, restore on failure

### Viewport

Desktop-only (768px+), inherits from parent page.

---

## Variable parts (differ per instance)

| Part | Specify per instance |
|---|---|
| Parent page / route | Which page, which tab |
| Item noun | "sample", "entry", "row", etc. |
| Grid column template | e.g. `grid-cols-[6rem_1fr_10rem_2rem]` — column widths set by content |
| Column headers | What each column shows |
| Summary row content | Which fields / chips appear in each column |
| Preview column strategy | First N chars truncated? Concatenated fields? |
| Expanded field list | Full field list that appears when row is clicked |
| Side-by-side rows | Which fields pair up in `flex gap-4` rows vs stack |
| Delete behaviour | Hard delete vs flag-as-archived (usually hard) |
| Create flow | Add button + modal, or seed-only |
| Empty state copy | Per item type |

---

## When to use this template vs alternatives

**Use this pattern when:**
- Items are mostly read-only or lightly edited
- Fields are short strings plus maybe one longer text
- Item count can grow (20+) and scanning matters
- Table density is useful — seeing multiple items at once

**Upgrade to `tab-master-detail` when:**
- Items gain sliders, structured JSON, or array fields
- Users start flipping between items to compare / edit actively
- The expand block grows beyond ~5 fields

**Use a simpler inline editor** (not a template — just fields in a tab) when:
- Only 1-5 items ever exist
- Items don't share a schema (singular configurable settings)

---

## Related patterns on the same page

The DNA-09 Vocabulary tab uses a simpler variant of this pattern — a table with **inline-editable cells** (no expand, every cell is always editable). That's appropriate when every field is short enough to fit in a table cell and there's no long-text or side-by-side grouping needed. If a third instance of "inline-editable table cells" appears, register it as `tab-inline-table` — for now it's a one-off variant of this pattern.
