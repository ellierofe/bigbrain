# Client Projects Brief
Feature ID: CLIENT-01
Status: approved
Last updated: 2026-04-14

## Summary
A scoped workspace for client engagements. Each client project links to an organisation, holds a brief/scope, tracks status, and acts as a hub connecting inputs, missions, content, and graph knowledge related to that engagement. The project is a knowledge container — not a project management tool. Task tracking, deliverables, and timelines stay in Notion.

Addresses **Problem 4** (research as accumulation instead of compounding) — client work should feed back into the wider knowledge system, not stay isolated.

## Use cases
- **Start a client engagement:** Create a project, link it to the client organisation, write the brief/scope, set status to active.
- **Scope knowledge to a project:** Tag inputs, missions, and content as belonging to this project. Knowledge stays in the graph but is discoverable through the project lens.
- **Navigate current work from the dashboard:** See active client projects in the dashboard "current work" list table. Click to jump into the project workspace.
- **Browse project-scoped knowledge:** From inside a project, see all linked missions, inputs, and content pieces — a filtered hub for everything related to this engagement.
- **Complete/pause a project:** Change status. Completed projects remain browsable (the knowledge persists) but drop out of the active list.
- **Feed knowledge back:** Content and analysis produced during a client project is linked back to the wider graph. Client-specific detail stays scoped; patterns and insights flow back. (CLIENT-02 will add structured post-project extraction — out of scope here.)

## User journey
1. User navigates to `/projects/clients` → sees list of all client projects (filterable by status)
2. User clicks "New project" → modal or form: select client organisation, enter project name, write brief/scope → project created with status `active`
3. User is taken to `/projects/clients/[id]` → project detail workspace
4. From the workspace, user can: view/edit the brief, see linked missions, see linked inputs, see linked content
5. User tags items from elsewhere in the app as belonging to this project (e.g. when processing an input, when creating content)
6. User changes project status when engagement ends → project moves to complete/paused/abandoned

## Data model / fields

### `client_projects` table (Postgres)

| Field | Type | Required | Constraints | Notes |
|---|---|---|---|---|
| `id` | uuid | yes | PK, auto-generated | |
| `brand_id` | uuid | yes | FK → brands.id | Scopes to brand for future multi-brand |
| `name` | text | yes | | Project name, e.g. "Robotics Strategy 2025" |
| `organisation_id` | uuid | yes | FK → organisations.id | The client organisation |
| `brief` | text | no | | Free-text brief/scope for the engagement |
| `status` | text | yes | enum: active, paused, complete, archived | Default: `active` |
| `graph_node_id` | varchar(100) | no | FK → graph_nodes.id | Links to the Project node in FalkorDB |
| `created_at` | timestamp(tz) | yes | default now | |
| `updated_at` | timestamp(tz) | yes | default now | |

### `organisations` table (Postgres) — NEW DEPENDENCY

| Field | Type | Required | Constraints | Notes |
|---|---|---|---|---|
| `id` | uuid | yes | PK, auto-generated | |
| `brand_id` | uuid | yes | FK → brands.id | Scoped to brand |
| `name` | text | yes | | Organisation name |
| `graph_node_id` | varchar(100) | no | FK → graph_nodes.id | Links to Organisation node in FalkorDB |
| `website` | text | no | | |
| `notes` | text | no | | |
| `created_at` | timestamp(tz) | yes | default now | |
| `updated_at` | timestamp(tz) | yes | default now | |

**Migration note:** The existing `contacts.organisation` free-text field should eventually be migrated to an FK to `organisations.id`. This is not required for CLIENT-01 but should be tracked as a follow-up.

### Join tables for project relationships

Items are linked to projects via join tables rather than direct FKs, since any item can belong to multiple projects.

| Join table | Columns | Notes |
|---|---|---|
| `project_missions` | project_id, mission_id | Links to missions table (see MISSION-01 brief) |
| `project_inputs` | project_id, input_id | Links to pending_inputs table |
| `project_content` | project_id, content_id | Links to content items (when content registry exists) |
| `project_stats` | project_id, stat_id (FK → src_statistics.id) | Stats relevant to this client engagement |

These are simple junction tables — no additional fields needed beyond the two FKs and a `created_at`.

## Update behaviour
**Freely editable.** Name, brief, status, and linked items can be changed at any time. No version history — this is a working document, not a strategic element.

## Relationships

### Knowledge graph (FalkorDB)
- `Project` node type already defined in ADR-002
- `SCOPED_TO` relationship: any node → Project (marks knowledge as project-scoped)
- `GENERATED` relationship: Project → ContentItem, Methodology (what this project produced)
- `LOCATED_IN` relationship: Project → Country (where the engagement operates)
- New: `COMMISSIONED_BY` relationship: Project → Organisation (the client). This is distinct from SCOPED_TO — it's who commissioned the work, not what knowledge belongs to it.

### Postgres
- `client_projects` → `organisations` (FK: organisation_id)
- `client_projects` → `brands` (FK: brand_id)
- `client_projects` → `graph_nodes` (FK: graph_node_id, optional)
- Join tables link to missions, inputs, content

## UI/UX notes
Layout spec complete: `01-design/wireframes/CLIENT-01-layout.md` (approved 2026-04-23)

**Design model:** The workspace is a lens, not a workbench. Work happens in existing tools (chat, processing, sources). The project workspace scopes and views what's connected. Key actions: view linked items, link/unlink items, edit metadata (name, brief, status), capture ideas/questions (via IDEA-01), chat in context (future topic selector).

**Key layout decisions:**
- List view: table layout at `/projects/clients`, filterable by status, default filter = Active
- Workspace: single scrollable page (not tabs) at `/projects/clients/[id]`
- Sections: Brief, Ideas & Questions, Linked Missions, Linked Inputs, Linked Stats, Linked Content (stub)
- Ideas & Questions: sourced from `ideas` table via `idea_projects` join. Requires `type` field on ideas (`idea` | `question`). If IDEA-01 not built, shows as stub.
- Create flow: single-step modal with inline org creation
- Archive: status `archived` replaces `abandoned`. No hard delete in v1.
- Chat integration: future — chat drawer auto-selects project context when invoked from workspace
- New shared component: `ItemLinker` (search/picker popover for linking items)

## Edge cases
- **Empty state (no projects):** Message + CTA to create first project. "No client projects yet — create one to start scoping work."
- **Empty state (project with no linked items):** Show the brief/scope, with empty sections for missions, inputs, content — each with a prompt to link items.
- **Duplicate project names:** Allowed — different engagements for the same client might have similar names. No uniqueness constraint on name.
- **Archiving a project:** Status set to `archived` — drops from active list, remains browsable via Archived filter. Linked items NOT affected. Restorable by changing status back to `active`. No hard delete in v1.
- **Organisation doesn't exist yet:** The "new project" flow should allow creating an organisation inline (name required, other fields optional) rather than requiring a separate step first.

## Out of scope
- **Task/deliverable tracking** — stays in Notion. No task lists, deadlines, or assignees in BigBrain.
- **Notion integration** — potentially valuable (pull tasks, sync status) but a separate feature.
- **Post-project knowledge extraction** — CLIENT-02 covers this. This brief builds the container; CLIENT-02 builds the structured harvest process.
- **Billing/commercial tracking** — not part of a knowledge system.
- **Multi-user collaboration** — single-user app. No sharing, permissions, or collaboration features.
- **Content creation scoped to a project** — content is created in the content creator (OUT-02) and then linked to a project. The project workspace doesn't have its own content creation flow.

## Dependencies
- **DASH-01** (dashboard shell) — in progress, provides the routing and sidebar structure
- **ORG-01** (organisations table) — new, must be created as part of or before this feature
- **KG-02** (graph write API) — done, needed to create Project nodes and SCOPED_TO edges
- **MISSION-01** (missions) — the project workspace displays linked missions. Can be built in parallel but the join table requires the missions table to exist.

## Open questions / TBDs
- [x] **Project workspace layout:** Single scrollable page with SectionCard sections — resolved in layout spec (2026-04-23)
- [x] **Tagging UX:** ItemLinker search/picker popover from workspace sections. "+ Link" button per section. — resolved in layout spec (2026-04-23)
- [ ] **contacts.organisation migration:** When/whether to migrate the free-text organisation field on contacts to an FK to the new organisations table. Not blocking for CLIENT-01 but should be tracked.
- [ ] **Organisation detail view:** Do organisations get their own detail page (showing linked contacts, projects, graph relationships)? Or is the organisations table purely a lookup for project creation? Likely useful eventually but not required for CLIENT-01.

## Planned enhancements
- **Graph node creation:** Auto-create a `Project` node in FalkorDB when a project is created, and a `COMMISSIONED_BY` edge to the client Organisation node. Currently deferred — `graph_node_id` column exists but is null. Requires: `writeNode()` + `writeEdge()` calls in the create action, org graph node resolution.
- **Chat topic scoping:** When chat drawer is invoked from the project workspace, auto-select this project as chat context. Depends on chat topic selector feature.
- **Idea tagging from workspace:** Currently ideas are tagged to projects from the Ideas list. Add ability to tag directly from the workspace Ideas & Questions section, or auto-tag when capturing from the project workspace page.

## Decisions log
- Brief approved 2026-04-14
- Layout spec approved 2026-04-23 — workspace is a lens (view + link + capture), not a workbench. Status enum: active/paused/complete/archived (replaces abandoned). Ideas & Questions via IDEA-01 with `type` field extension. Chat scoping noted as future integration.
- Build complete 2026-04-23 — Postgres CRUD, list + workspace UI, dashboard integration, ItemLinker molecule. Graph node creation deferred as enhancement.
