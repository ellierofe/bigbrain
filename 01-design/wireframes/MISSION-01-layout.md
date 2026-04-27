# Layout Spec: MISSION-01 Research Missions
Status: approved
Last updated: 2026-04-23
Template: adaptation of `project-workspace` (established from CLIENT-01)

---

## Template check result
Match found: `project-workspace` template. Missions are a project-type entity with a filterable list view and a detail workspace hub for linked items. This is a delta from the established template.

---

## Delta from project-workspace template

### What's identical to the template
- Routing model: `/projects/missions` (list) and `/projects/missions/[id]` (workspace)
- List view: table layout, filter pills by phase, row click -> workspace, empty state pattern
- Workspace: full page, single scroll, PageChrome with breadcrumb, SectionCard sections for linked items
- Section card pattern: compact table, `+ Link` action, row hover unlink, row click navigates
- Create flow: modal, navigate to workspace on success
- Archive flow: phase -> `paused` (missions don't have `archived` — use `paused` or `complete`), confirmation modal
- Home page: active missions in "Current work" interleaved with client projects
- Loading/error states: skeleton tables, autosave indicators, optimistic phase changes
- Shared component: `ItemLinker` (same as CLIENT-01)

### What changes

**Route slug:** `missions`

**Page title:** "Missions"

**Nav:** Sidebar "Projects" group, "Missions" sub-item at `/projects/missions`

**List columns:**

| Column | Notes |
|---|---|
| Name | Bold, link to workspace |
| Thesis | Truncated to ~60 chars. Replaces CLIENT-01's "Client" column. |
| Phase | Badge (replaces "Status") |
| Updated | Relative time |

**Phase values and badge colours:**

| Phase | Badge colour |
|---|---|
| Exploring | `bg-blue-100 text-blue-800` |
| Synthesising | `bg-purple-100 text-purple-800` |
| Producing | `bg-amber-100 text-amber-800` |
| Complete | `bg-green-100 text-green-800` |
| Paused | `bg-muted text-muted-foreground` |

**Default filter:** Exploring (the active investigation phase, equivalent to CLIENT-01's "Active").

### Workspace layout

```
+------------------------------------------------------------------+
|  PageChrome                                                       |
|  <- Missions / European Reshoring Patterns          [Archive]     |
|                                       [Phase: Exploring v]        |
|  Client project: Robotics Strategy 2025 [edit]                    |
+------------------------------------------------------------------+
|  ContentPane                                                      |
|                                                                   |
|  +- THESIS ------------------------------------------------+     |
|  |                                                          |     |
|  |  [Editable textarea - autosave on blur]                  |     |
|  |  "What question are you investigating?"                  |     |
|  |                                                          |     |
|  +----------------------------------------------------------+     |
|                                                                   |
|  +- VERTICALS --------------------------------- [+ Add] ---+     |
|  |                                                          |     |
|  |  [Defence] [Robotics] [Near-shoring]           <- chips  |     |
|  |                                                          |     |
|  |  (or empty: "No verticals tagged. Add sectors to help    |     |
|  |   organise this investigation.")                         |     |
|  +----------------------------------------------------------+     |
|                                                                   |
|  +- LINKED CONTACTS ---------------------- [+ Link contact] +    |
|  |  Name              | Role           | Organisation       |    |
|  |  Dr Sarah Chen     | Programme lead | UKRI               |    |
|  |                                                           |    |
|  |  (or empty: "No contacts linked. Link people involved     |    |
|  |   in this investigation.")                                |    |
|  +-----------------------------------------------------------+    |
|                                                                   |
|  +- LINKED INPUTS ------------------------- [+ Link input] -+    |
|  |  Title              | Type          | Date                |    |
|  |  Call with UKRI team| Transcript    | 15 Apr 2026         |    |
|  |                                                           |    |
|  |  (or empty: "No inputs linked. Tag source documents to    |    |
|  |   scope them to this mission.")                           |    |
|  +-----------------------------------------------------------+    |
|                                                                   |
|  +- LINKED STATS --------------------------- [+ Link stat] -+    |
|  |  Claim (truncated)        | Source       | Year            |    |
|  |  UK robotics market grew..| UKRI report  | 2025            |    |
|  |                                                           |    |
|  |  (or empty: "No stats linked yet.")                       |    |
|  +-----------------------------------------------------------+    |
|                                                                   |
|  +- IDEAS & QUESTIONS ------------------------------------+       |
|  |  Idea capture coming soon.                             |       |
|  +--------------------------------------------------------+       |
|                                                                   |
|  +- LINKED CONTENT --------------------------------------+        |
|  |  Content linking coming with the content registry.     |        |
|  +---------------------------------------------------------+       |
|                                                                   |
+-------------------------------------------------------------------+
```

### Header area
- **Mission name:** Editable inline in the breadcrumb — click to edit, blur to save.
- **Phase selector:** Dropdown — `exploring`, `synthesising`, `producing`, `complete`, `paused`. Saves immediately. Fully flexible transitions (no restrictions on going backwards).
- **Client project link:** Small label below phase selector: "Client project: [name]" with edit icon. Click opens a combobox to search/select/clear the linked client project. If no client project linked, shows "Link to client project" as a subtle action. If CLIENT-01 is not yet built, this line is hidden entirely.
- **Archive button:** Ghost destructive variant. Confirmation: "Archive [name]? It will be hidden from your active missions but remains accessible from the Paused filter. Linked items won't be affected." On confirm: phase -> `paused`, navigate to list.

### Thesis section
- `SectionCard` with title "Thesis"
- Auto-growing textarea, autosave on blur, 500ms debounce
- Placeholder: "What question are you investigating?"
- Save indicator: "Saved" fades after 2s, "Failed" persists in red

### Verticals section
- `SectionCard` with title "Verticals" and `+ Add` action
- **Tag/chip display** (not a table — verticals are labels, not linked records with metadata)
- Each chip shows vertical name + `x` remove action
- `+ Add` opens a combobox: search existing verticals, or type a new name and hit enter to create
- New vertical creation: creates the `verticals` table row inline, no separate modal
- Vertical dedup: combobox highlights near-matches as user types (e.g. typing "Robot" shows "Robotics" if it exists)

### Linked sections (Contacts, Inputs, Stats)
All follow the template's SectionCard + compact table + ItemLinker pattern.

**Linked Contacts:**
- Columns: Name (link), Role, Organisation
- `+ Link contact` opens ItemLinker searching the `contacts` table

**Linked Inputs:**
- Columns: Title (link to source detail), Type badge, Date
- `+ Link input` opens ItemLinker searching `src_source_documents`
- Row click navigates to `/inputs/sources` (source detail)

**Linked Stats:**
- Columns: Claim (truncated ~80 chars), Source, Year
- `+ Link stat` opens ItemLinker searching `src_statistics`

### Stub sections
- **Ideas & Questions:** "Idea capture coming soon." (until IDEA-01 is built)
- **Linked Content:** "Content linking coming with the content registry." (until REG-01 is built)

---

## Create flow

**Trigger:** "+ New mission" button in list page header.

**Modal — single step:**

```
+----------------------------------------------+
|  New mission                            [x]  |
|                                              |
|  Mission name                                |
|  [________________________________________]  |
|                                              |
|  Thesis (optional)                           |
|  [________________________________________]  |
|  [________________________________________]  |
|                                              |
|  Verticals (optional)                        |
|  [Search or create verticals...        [v]]  |
|  [chip: Defence] [chip: Robotics]            |
|                                              |
|              [Cancel]  [Create mission]      |
+----------------------------------------------+
```

- **Name** required, **thesis** optional, **verticals** optional multi-select combobox with inline create.
- No client project link in create modal — link from workspace if needed.
- **Validation:** Name required. Validate on submit. Inline error below field.
- **On success:** Navigate to `/projects/missions/[id]`.
- **On cancel:** Close modal, stay on list.

---

## Empty states

| Context | Icon | Heading | Description | Action |
|---|---|---|---|---|
| List (no missions) | `Compass` | "No missions yet" | "Start an investigation to cluster research around a question." | "New mission" (primary) |
| Filter returns nothing | — | — | "No [phase] missions." | — |
| Thesis empty | — | — | Placeholder: "What question are you investigating?" | — |
| Verticals empty | — | — | "No verticals tagged. Add sectors to help organise this investigation." | — |
| Contacts empty | — | — | "No contacts linked. Link people involved in this investigation." | — |
| Inputs empty | — | — | "No inputs linked. Tag source documents to scope them to this mission." | — |
| Stats empty | — | — | "No stats linked yet." | — |

---

## Mobile considerations

Desktop-first. `ScreenSizeGate` (min 990px) already blocks small screens. No mobile-specific design in v1.

---

## Graph integration

When a mission is created in Postgres:
- Auto-create a `Mission` node in FalkorDB with `name`, `thesis`, `status` (phase) properties
- Set `graph_node_id` on the missions row
- Mirror to `graph_nodes` table
- When verticals are linked, create `BELONGS_TO` edges (Mission -> Vertical) in FalkorDB + mirror
