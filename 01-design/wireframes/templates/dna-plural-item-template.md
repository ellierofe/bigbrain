# Template: DNA Plural Item
Pattern name: `dna-plural-item`
Established from: DNA-03 (Audience Segments)
Last updated: 2026-03-31

---

## What this template covers

Any plural DNA type with: a list/card view, a full-page detail view, inline editing with autosave, a creation modal, and an archive flow. Applies to: audience segments, offers, knowledge assets, content pillars, lead magnets, platforms, brand intros, competitors.

---

## Fixed structure (do not redesign per instance)

### Routing
- `/dna/[type-slug]` — redirects to first active item or empty state
- `/dna/[type-slug]/[id]` — detail view, default tab
- `/dna/[type-slug]/[id]?tab=[tab-slug]` — deep-linked tab
- `/dna/[type-slug]/cards` — card grid view

### Default landing
If items exist → redirect to first item's detail view. If empty → show empty state with create CTA.

### Header area
```
[Page title]                    [⊞ cards icon] [+ New item] [⊗ Archive]
────────────────────────────────────────────────────────────────────────
[Item A pill] [Item B pill] [Item C pill]    ← switcher pills
```
- Actions in-line with title (no separate right panel)
- Switcher only shown when 2+ active items
- Archive disabled with tooltip when only 1 active item
- "Mark as active" replaces Archive when viewing a draft item

### Detail view — two-column layout
```
┌──────────────────────────────────────────┐
│  Header area (switcher + actions)         │
├─────────────────┬────────────────────────┤
│  LEFT PANEL     │  CONTENT PANE          │
│  ~220px sticky  │  flex-1                │
│                 │  [Tab][Tab][Tab]        │
│  Avatar/image   │  ┌──────────┬────────┐ │
│  Primary name   │  │ Mini-nav │ Fields │ │
│  Secondary name │  │ Section  │ (anch- │ │
│  (if applicable)│  │ Section  │  ored) │ │
│                 │  └──────────┴────────┘ │
└─────────────────┴────────────────────────┘
```

### Left sticky panel
- Avatar/thumbnail: 80px, grey placeholder with item name initial
- Primary name field: inline editable, bold, autosave on blur
- Secondary label/name (if applicable to type): inline editable
- Save indicator: "Saved ✓" fades 2s per field, "Save failed" persists until next save
- No overview/summary in left panel — belongs in content pane

### Content pane
- Tabs (3 typically): Main content tab | Sub-items/table tab | Related Content tab
- Related Content tab is always the last tab, always a stub until REG-01 is built
- Within main tab: mini-nav (sticky, ~160px) + scrollable anchor-linked sections
- All fields: inline editable, floating labels, icon prefix, autosave on blur

### Autosave behaviour
- Save on field blur
- 500ms debounce
- "Saved ✓" indicator near field, fades 2s
- "Save failed" in red, persists until next save
- No toast on autosave success — too noisy

### Sub-items table (tab 2)
- Filter pills by sub-item type with count badges
- Count badge turns amber below type-specific minimum
- Table: checkbox, type badge, statement/name, secondary field (if applicable)
- Inline cell editing: click to edit, save on blur, Escape to cancel
- Add via "Add ▾" dropdown — inserts new row at top, immediately in edit mode
- Multi-select delete — optimistic, restore + toast on failure
- Toolbar: Add button + Delete selected (appears on selection)

### Card grid view
- 3-col wide, 2-col medium (768px+)
- Card: avatar/thumbnail, primary name (bold, truncated), summary (3 lines, truncated)
- Empty state: `EmptyState` component
- Active items only by default; "Show archived" toggle
- Draft items shown with "Draft" badge, muted

### Creation modal
- `Modal` component, size `lg`
- First page: path selection (questionnaire | document — document muted until SRC-01)
- Multi-step with progress indicator ("Step N of N")
- Footer: Back / Next on intermediate steps; Back + Generate (primary) + Save as draft (text link) on last step
- Generate button: disabled in this build — toast "LLM integration coming soon"
- Save as draft: saves `status = 'draft'`, navigates to new item's detail view
- Generating state stub: spinner + "Generating... don't close this tab" + Cancel — wire up at INF-06

### Draft behaviour
- `status = 'draft'`: shown in card grid with "Draft" badge
- Not selectable as a target/reference in other DNA types until `status = 'active'`
- Manual promotion: "Mark as active" button in header
- No auto-promotion

### Archive flow
- Pre-check: query dependent tables for references to this item's ID
- No dependents: simple confirmation modal
- Dependents exist: warning modal listing affected items — "Archive anyway" or Cancel
- On archive: `is_active = false`, redirect to next active item or empty state
- Cannot archive last active item: button disabled with tooltip

### Avatar/thumbnail
- 80px in left panel, 48px in cards
- Grey circle with name initial as default
- Upload: deferred to INF-04

### Loading states
- shadcn `Skeleton` for page load
- No spinner for autosave — silent unless error

### Toast system
- shadcn `Sonner` installed globally in root layout
- Used for: errors, coming-soon stubs, generation status
- Not used for autosave success

### Viewport
- 768px+ (tablet and desktop)
- No mobile support

---

## Variable parts (differ per instance)

| Part | Specify per instance |
|---|---|
| Route slug | `audience-segments`, `offers`, `knowledge-assets`, etc. |
| Page title + subtitle | Per type |
| Left panel fields | Primary name field label + any secondary label |
| Tab names | Main tab name + sub-items tab name |
| Content pane section names | The anchor-scrolled sections within the main tab |
| Fields per section | Full field list, types, icons, labels, placeholders |
| Sub-items table structure | Type options, column names, minimum counts per type |
| Empty state copy | Per type |
| Archive dependency targets | Which tables/columns reference this type |
| Creation modal intake fields | Steps 1–3 field content |
| Status values | May vary: `draft/active/archived` vs `draft/active/retired/paused` |
| `is_active` vs `status` column | Some types use `is_active boolean`, others use `status varchar` |
