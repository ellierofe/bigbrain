# Template: Launch Picker Grid
Pattern name: `launch-picker-grid`
Established from: OUT-02-P4a (Content creator picker at `/content`)
Last updated: 2026-04-30

---

## What this template covers

A filterable card grid where each card is a launchpad to a workspace. Distinct from a CRUD list (`dna-plural-item`) because cards don't open a detail view of themselves — they open a different surface that operates on a different shape. Used for: content-type picker (launches generation surface), and any future picker (skills, missions to invoke, archived templates, etc.).

Use this template when:
- The user is choosing an option to **launch**, not an item to **view/edit**
- Cards represent fixed catalogue rows that may have **prerequisites** (lockable)
- Filtering is **multi-faceted** (category × channel × favourites × search)
- A "favourites" affordance applies to the catalogue row, not to a user-owned item

---

## Fixed structure (do not redesign per instance)

### Routing
- `/[picker-route]` — server-rendered card grid + client-side filter shell
- Filters live in URL query params (`?cat=…&ch=…&fav=1&q=…`) so reload preserves and back-button works
- Clicking an unlocked card → navigates to the workspace route (varies per instance)

### Page chrome
```
PageChrome:
  title (e.g. "Create content")
  subtitle (1-line orientation)
  action: search input (right-aligned, ~240px)
```

### Filter bar (`PickerFilterBar` molecule, instance-specific)
- Above the card grid, separated by `border-b pb-4 mb-6`
- Vertical stack of `MultiFilterPillGroup`s (one per facet) + a single-toggle `FilterPill` for favourites + a "Clear all" text button
- All-of intersection across facets; multi-select within each facet (within-group is union; across-group is intersection)

### Card grid
- 3-col on wide / 2-col on medium (~768px+) / 1-col on small (~480px-)
- `gap-4`
- Each card is a `[InstanceCard]` molecule (per-instance — see "Variable parts")
- Locked cards: dimmed (`opacity-60`), no hover-elevation, footer replaced by `LockBadge` + `MissingPrereqDeeplink`
- Unlocked card click → workspace route. Locked card click → no-op (deeplink is the only forward action).

### Empty states
- **No items match filters:** centered `EmptyState` molecule + "Clear filters" action
- **Favourites toggle on, no favourites:** `EmptyState` + "Show all" action
- **All items locked:** banner above grid (cards still visible) explaining the prereq path

### Loading + error
- Server-rendered first paint = no skeleton (data is in HTML)
- Client-side filter changes are synchronous over the loaded array
- Server query failure → standard `error.tsx`

### Mobile
- Picker is responsive down to ~480px; below that, cards stack 1-col with the filter bar above
- No `ScreenSizeGate` — picker works on phones for browsing/triage even if the launched workspace doesn't

---

## Variable parts (per instance)

### Catalogue source
- Which table provides the rows? (e.g. `content_types`, `skills_registry`, `mission_templates`)
- Active filter (`is_active = true`) — almost always required
- Brand-scope filter? (depends on whether the catalogue is global or per-brand)

### Card molecule (`[Instance]Card`)
Each instance defines its own card. The card *should* expose:
- Icon (Lucide name from a column on the row)
- Title + description
- 1-2 `TypeBadge` chips (category, secondary facet)
- Favourite star (`IconButton`) — wired to a brand-scoped favourites table
- Lock state (when prereqs unmet) — `LockBadge` + `MissingPrereqDeeplink`

### Favourites table
Brand-scoped thin join table:
```
[picker]_favourites
  brand_id    uuid FK → brands.id   (composite PK)
  item_id     uuid FK → catalogue   (composite PK)
  created_at  timestamp default now()
```
Indexed on `brand_id` for the picker query.

### Filter facets
- Pick 1-3 facets that genuinely partition the catalogue
- Each facet → one column on the catalogue row
- Avoid > 6 options per facet (`MultiFilterPillGroup` design contract)

### Locking mechanism
- Each catalogue row carries a `prerequisites` jsonb column (or equivalent)
- Picker server query joins prereq tables to compute `isLocked` + `missingPrereqLabel` + `missingPrereqHref` per row
- The "+ Add ${X}" deeplink resolves to the relevant DNA/source page

### Workspace route
- Where does an unlocked card navigate to? (e.g. `/content/create/[slug]`, `/missions/run/[slug]`)
- Does the workspace need any query params on first load (e.g. project context pre-fill)?

### Empty-states copy
Per-instance microcopy for the three empty states. Keep tone consistent with the rest of the dashboard.

---

## Molecule contract

This template requires:
- `PageChrome`, `ContentPane`, `EmptyState`, `IconButton`, `TypeBadge`, `FilterPill` (existing)
- `MultiFilterPillGroup` (built first by OUT-02-P4a)
- `LockBadge`, `MissingPrereqDeeplink` (built first by OUT-02-P4a)
- One per-instance `[Instance]Card` molecule (instances build their own; the layout is consistent but the data shape varies)
- One per-instance `[Instance]FilterBar` molecule wrapping `MultiFilterPillGroup`s + favourites toggle (or a single shared `PickerFilterBar` if facets become standardised across instances)

---

## When NOT to use this template

- The cards are CRUD items the user owns (use `dna-plural-item` instead)
- There's no launch action — clicking a card opens a detail view of that card itself
- Cards don't have prerequisites or lock states
- The catalogue is small enough (< 8 rows) that a horizontal pill list or dropdown fits
