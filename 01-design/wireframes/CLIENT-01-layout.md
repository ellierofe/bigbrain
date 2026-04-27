# Layout Spec: CLIENT-01 Client Projects
Status: approved
Last updated: 2026-04-23
Template: establishes `project-workspace` pattern (new pattern — no existing match)

---

## Template check result
No applicable template found. CLIENT-01 is a project workspace pattern — a read-heavy hub with light editing and linked-item views. Structurally distinct from the DNA plural-item template (which is a form-editing pattern with autosave, version history, and archive flows). This spec establishes the `project-workspace` pattern for reuse by MISSION-01.

---

## Design model

**The workspace is a lens, not a workbench.** Work happens in the tools that already exist (chat, processing, sources). The project workspace is how you scope and view what's connected to a client engagement. The primary actions are:

1. **View** what's linked to this project (missions, inputs, ideas, stats, content)
2. **Link/unlink** items to scope them to the project
3. **Edit** project metadata (name, brief, status)
4. **Capture ideas/questions** that form around the project (via IDEA-01 mechanism, tagged to this project)
5. **Chat in context** — open chat scoped to this project's knowledge (via chat topic selector, future)

---

## Views

| View | Purpose | When it appears |
|---|---|---|
| Project list | Browse all projects, filterable by status | `/projects/clients` |
| Project workspace | Hub for a single project — brief, linked items, ideas | `/projects/clients/[id]` |
| Create project modal | Create a new project with inline org creation | Triggered from list header or dashboard home |

---

## Navigation and routing

**Sidebar:** Already configured — "Projects" group with "Client Projects" at `/projects/clients`. Currently disabled. This build enables it.

**Routes:**
- `/projects/clients` — project list. Shows all projects. No auto-redirect to first item (the list IS the primary view).
- `/projects/clients/[id]` — project workspace.

**Entry points:**
1. Sidebar nav: Projects → Client Projects
2. Dashboard home: "Current work" section → click a project row
3. Dashboard home: "New project" button in Current work empty state
4. Deep link to specific project

**Back navigation:** Breadcrumb in PageChrome — "Client Projects" (link) / "Project Name" (current).

---

## List view

**Layout: Table.** Projects are scannable items with status, not visual entities.

```
┌──────────────────────────────────────────────────────────────────┐
│  PageChrome                                                      │
│  Client Projects                              [+ New project]    │
├──────────────────────────────────────────────────────────────────┤
│  ContentPane                                                     │
│                                                                  │
│  [All] [Active] [Paused] [Complete] [Archived]    ← filter pills│
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Name              │ Client         │ Status  │ Updated    │  │
│  ├───────────────────┼────────────────┼─────────┼────────────┤  │
│  │ Robotics Strategy │ UKRI           │ Active  │ 2d ago     │  │
│  │ Defence Review    │ MoD            │ Active  │ 5d ago     │  │
│  │ AI Policy Paper   │ Ada Lovelace   │ Complete│ 2w ago     │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

- **Columns:** Name (bold, link to detail), Client (org name), Status (badge), Updated (relative time)
- **Default sort:** Updated desc (most recently touched first)
- **Default filter:** Active (not "All" — archived/complete projects shouldn't clutter the default view)
- **Filter pills:** All, Active, Paused, Complete, Archived. Each shows count.
- **Row click:** Navigates to `/projects/clients/[id]`
- **Row hover:** `bg-muted/50`
- **Status badge colours:**
  - Active: `bg-green-100 text-green-800`
  - Paused: `bg-amber-100 text-amber-800`
  - Complete: `bg-blue-100 text-blue-800`
  - Archived: `bg-muted text-muted-foreground`
- **No pagination** — single-user app, unlikely to have hundreds of projects

### Empty states
- **No projects at all:** Icon `FolderKanban`, heading "No client projects yet", description "Create a project to start scoping client work.", action: "New project" button (primary)
- **Filter returns nothing:** "No [status] projects." — informational, no action button

---

## Detail view — project workspace

**Full page, single scrollable view.** Not tabs — the workspace isn't deep enough per section to warrant them.

```
┌──────────────────────────────────────────────────────────────────┐
│  PageChrome                                                      │
│  ← Client Projects / Robotics Strategy 2025        [Archive]    │
│                                          [Status: Active ▾]     │
├──────────────────────────────────────────────────────────────────┤
│  ContentPane                                                     │
│                                                                  │
│  ┌─ BRIEF ──────────────────────────────────────────────────┐   │
│  │                                                           │   │
│  │  Client: UKRI                                [edit icon]  │   │
│  │                                                           │   │
│  │  [Editable textarea — project scope/brief, autosave]      │   │
│  │  [                                                    ]   │   │
│  │  [                                                    ]   │   │
│  │                                                           │   │
│  └───────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─ IDEAS & QUESTIONS ──────────── [+ Capture] [Ideas|Qs|All]┐  │
│  │                                                           │  │
│  │  ? How can we prove market timing?           captured 2d  │  │
│  │  💡 Reshoring + tariffs → market timing window captured 2d │  │
│  │                                                           │  │
│  │  (or empty: "No ideas or questions yet. Use the capture   │  │
│  │   button to jot down thoughts as they form.")             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ LINKED MISSIONS ──────────────────────── [+ Link mission]┐  │
│  │  Mission name          │ Phase        │ Updated            │  │
│  │  European Reshoring    │ Exploring    │ 3d ago             │  │
│  │                                                           │  │
│  │  (or empty: "No missions linked. Link a mission to scope  │  │
│  │   research to this project.")                             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ LINKED INPUTS ───────────────────────── [+ Link input]───┐  │
│  │  Input title           │ Type         │ Date               │  │
│  │  Call with UKRI team   │ Transcript   │ 15 Apr 2026        │  │
│  │                                                           │  │
│  │  (or empty: "No inputs linked. Tag inputs from Sources    │  │
│  │   to scope them to this project.")                        │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ LINKED STATS ────────────────────────── [+ Link stat]────┐  │
│  │  (or empty: "No stats linked.")                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌─ LINKED CONTENT ──────────────────────────────────────────┐  │
│  │  (stub: "Content linking coming with the content          │  │
│  │   registry.")                                             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Header area
- **Project name:** Editable inline in the breadcrumb — click to edit, blur to save. Styled as heading text, not a form field.
- **Status selector:** Dropdown in header area — `active`, `paused`, `complete`, `archived`. Saves immediately on change, no confirmation.
- **Archive button:** Ghost destructive variant. Opens confirmation: "Archive [name]? It will be hidden from your active projects but remains accessible from the Archived filter." On confirm: sets status to `archived`, navigates back to `/projects/clients`.

### Brief section
- **Client org:** Displayed as a label. Small edit icon opens an inline picker to change the organisation (rare action, shouldn't take prominent space).
- **Brief textarea:** Always-editable, autosave on blur, 500ms debounce. Not InlineField (that's for single-line values) — a dedicated auto-growing textarea. Save indicator: "Saved" fades after 2s, "Failed" persists in red.

### Ideas & Questions section
- **Source:** Shows ideas from the `ideas` table that are tagged to this project via `idea_projects` join table.
- **Type indicator:** `?` prefix for questions, `💡` for ideas (or icon variants — `HelpCircle` and `Lightbulb` from Lucide).
- **Filter pills:** All (default), Ideas, Questions — small inline filter within the section header.
- **"+ Capture" button:** Opens the IDEA-01 capture modal with this project pre-selected as context and a type toggle (idea/question). When IDEA-01 is not yet built, this button shows a tooltip "Coming soon".
- **Status display:** Each idea shows status badge (`captured`, `shelved`, `done`) and relative date.
- **Click action:** Expands the idea inline to show full text (ideas can be long enough to truncate in the list).
- **Triage actions on hover:** Shelve, mark done — same as the ideas list in IDEA-01.

### Linked item sections
Each is a `SectionCard` with a compact table inside.

**Shared pattern for all linked sections:**
- **"+ Link" button** in section header — opens a search/picker popover (not a modal). Type to search existing items, click to link. Shared `ItemLinker` component.
- **Row hover:** Shows `×` unlink action. Click opens a small confirmation: "Unlink [item name] from this project?" — removes the join table row, doesn't delete the item.
- **Row click (on name):** Navigates to the item's own detail page (mission workspace, source detail, etc.).
- **Compact table:** No header row — just rows with name, type/phase badge, and date. Keeps it scannable without the weight of a full data table.

### Linked Missions
- Columns: Name (link), Phase badge, Updated (relative)
- Phase badge colours: match MISSION-01 phase colours (to be defined there)
- If MISSION-01 is not yet built, this section shows as a stub: "Missions coming soon."

### Linked Inputs
- Columns: Title (link to source detail), Type badge (transcript, document, etc.), Date
- Links to source documents in `/inputs/sources`

### Linked Stats
- Columns: Claim text (truncated), Source, Date
- Links to the stat record

### Linked Content
- Stub until content registry (REG-01) is built: "Content linking coming with the content registry."

---

## Create flow

**Trigger:** "+ New project" button in list page header, or "New project" in dashboard home.

**Modal** — single step, lightweight:

```
┌──────────────────────────────────────────────┐
│  New client project                     [×]  │
│                                              │
│  Client organisation                         │
│  ┌──────────────────────────────────────┐    │
│  │ Search organisations...         [▾]  │    │
│  └──────────────────────────────────────┘    │
│  or [+ Create new organisation]              │
│                                              │
│  ┌ Inline create (when toggled) ──────────┐  │
│  │ Organisation name: [____________]      │  │
│  │ Website (optional): [____________]     │  │
│  │                          [Save org]    │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  Project name                                │
│  [________________________________________]  │
│                                              │
│  Brief (optional)                            │
│  [________________________________________]  │
│  [________________________________________]  │
│  [________________________________________]  │
│                                              │
│              [Cancel]  [Create project]      │
└──────────────────────────────────────────────┘
```

- **Single step** — no wizard. Pick org, name the project, optionally write a brief.
- **Organisation picker:** Combobox (searchable dropdown). Shows existing orgs. If none match, "Create new organisation" link expands inline fields below.
- **Inline org creation:** Org name (required) + website (optional). "Save org" creates the record and selects it. No separate modal.
- **Validation:** Organisation required, project name required. Validate on submit. Inline error messages below fields.
- **On success:** Navigate to `/projects/clients/[id]` — the new project's workspace.
- **On cancel:** Close modal, stay on list.

---

## Archive flow

- **Trigger:** "Archive" button in workspace header (ghost destructive variant).
- **Confirmation modal:** "Archive [project name]? It will be hidden from your active projects but remains accessible from the Archived filter. Linked items won't be affected."
- **On confirm:** Status set to `archived`. Navigates to `/projects/clients` (list view).
- **Restoring:** Navigate to the project via the "Archived" filter pill, open the workspace, change status back to `active` via the status dropdown.
- **No hard delete in v1.** Archive is the removal mechanism.

---

## Home page integration

The "Current work" section on the dashboard home page:
- **Active projects** appear as rows: Name, Client (org name), Status badge, Updated time.
- **Active missions** (when MISSION-01 is built) appear in the same table, interleaved, with a type indicator column.
- **Sorted by updated time** — most recently touched first.
- **"New project" button** in the empty state becomes functional.
- **Row click** navigates to the project workspace.

---

## Chat integration (future)

When the chat topic selector is built:
- The chat drawer, when invoked from a project workspace page, should auto-select this project as the chat context.
- The LLM receives the project's linked items (missions, inputs, stats, ideas) as scoped context rather than needing natural language description.
- This is not part of CLIENT-01 build — it's a chat enhancement. Noted here for architectural awareness.

---

## Loading and error states

- **List page load:** Skeleton table — 5 rows of shimmer bars matching column widths.
- **Workspace load:** Skeleton for brief area + skeleton tables for each linked section.
- **Autosave (name, brief):** Silent save-on-blur. "Saved" indicator near field, fades after 2s. "Failed" in red, persists.
- **Status change:** Optimistic — badge changes immediately, revert on failure with toast.
- **Fetch error:** Inline error in ContentPane — "Couldn't load this project." with retry.
- **Link/unlink error:** Toast — "Failed to link/unlink [item]."

---

## New components needed

| Component | Category | Notes |
|---|---|---|
| `ItemLinker` | molecule | Search/picker popover for linking existing items to a parent entity. Shared between CLIENT-01 and MISSION-01. Props: `entityType`, `searchFn`, `onLink`. Popover with search input + result list. Register in `components/registry.ts`. |

All other UI is composed from existing molecules: `PageChrome`, `ContentPane`, `SectionCard`, `EmptyState`, `Modal`, `Button`, `Badge`, `DropdownMenu`.

---

## Interaction with existing components

| Component | How it's used |
|---|---|
| `NavSidebar` | "Client Projects" item enabled (remove disabled state) |
| `PageChrome` | Both views — breadcrumb in workspace |
| `ContentPane` | Wraps list table and workspace content |
| `SectionCard` | Each section in the workspace |
| `EmptyState` | Empty list + empty sections |
| `Modal` | Create project modal + archive confirmation |
| Dashboard home | Current work section wired to show active projects |

---

## Schema notes for build

### IDEA-01 extension required
The `ideas` table (from IDEA-01 brief) needs a `type` field:
- `type` enum: `idea` | `question` (default: `idea`)
- This enables the Ideas & Questions section to filter and display with appropriate icons.
- If IDEA-01 is not yet built when CLIENT-01 ships, the Ideas & Questions section renders as a stub: "Idea capture coming soon."

### Status enum update
The `client_projects.status` enum from the brief changes from `active, paused, complete, abandoned` to:
- `active, paused, complete, archived`

---

## Mobile considerations

Desktop-first. `ScreenSizeGate` (min 990px) already blocks small screens. No mobile-specific design in v1.
