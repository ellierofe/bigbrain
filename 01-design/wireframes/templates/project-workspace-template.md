# Template: Project Workspace
Pattern name: `project-workspace`
Established from: CLIENT-01 (Client Projects)
Last updated: 2026-04-23

---

## What this template covers

Any project-type entity with: a filterable list view, a detail workspace that acts as a hub for linked items, a simple create modal, and an archive flow. The workspace is a **lens** — a read-heavy view of connected knowledge with light editing, not a form-heavy workbench. Applies to: client projects, missions, and any future project-type entities.

---

## Fixed structure (do not redesign per instance)

### Routing
- `/projects/[type-slug]` — list view (table)
- `/projects/[type-slug]/[id]` — detail workspace

### List view
- **Layout:** Table (not cards). Projects are scannable items.
- **Columns:** Name (bold, link), [type-specific column], Status (badge), Updated (relative time)
- **Default sort:** Updated desc
- **Default filter:** Active (not "All")
- **Filter pills:** All + one pill per status value, each with count
- **Row click:** Navigates to workspace
- **Empty state:** `EmptyState` component with type-specific copy + create CTA

### Detail workspace
- **Full page, single scrollable view.** Not tabs.
- **PageChrome** with breadcrumb: "[Type plural]" (link) / "[Item name]" (current)
- **Header area:** Inline-editable name, status dropdown (saves immediately), archive button
- **Content:** Series of `SectionCard` blocks, each showing a category of linked items
- **Autosave:** Name and text fields save on blur, 500ms debounce, "Saved"/"Failed" indicator

### Section cards in workspace
Each linked-item section follows a shared pattern:
- `SectionCard` with title + optional "+ Link" action in header
- Compact table inside (no header row — just rows with name, badge, date)
- Empty state: type-specific prompt text
- Row hover: `×` unlink action with confirmation
- Row click (on name): navigates to the item's own detail page
- "+ Link" opens `ItemLinker` popover (search/picker)

### Create flow
- **Modal** — single step, lightweight
- Fields: type-specific (but always includes name + status defaults)
- On success: navigate to new workspace
- On cancel: close modal, stay on list

### Archive flow
- Trigger: "Archive" button in workspace header
- Confirmation modal with type-specific copy
- On confirm: status → `archived`, navigate to list
- Restoring: change status back via dropdown in workspace
- No hard delete in v1

### Home page integration
- Active items appear in the "Current work" section on the dashboard home
- Sorted by updated time, interleaved with other project types
- Row click navigates to workspace

### Loading states
- List: skeleton table (5 rows)
- Workspace: skeleton brief + skeleton section tables
- Autosave: silent, indicator only
- Status change: optimistic update

---

## Variable parts (differ per instance)

| Part | Specify per instance |
|---|---|
| Route slug | `clients`, `missions`, etc. |
| Page title | "Client Projects", "Missions", etc. |
| List columns | Type-specific secondary column(s) |
| Status values | May vary: `active/paused/complete/archived` vs `exploring/synthesising/producing/complete/paused` |
| Status badge colours | Per status value |
| Workspace sections | Which linked-item types to show, in what order |
| Section empty state copy | Per section per type |
| Create modal fields | Type-specific fields |
| Breadcrumb label | Type plural name |
| Type-specific features | e.g. Ideas & Questions section (CLIENT-01), Thesis field (MISSION-01) |
