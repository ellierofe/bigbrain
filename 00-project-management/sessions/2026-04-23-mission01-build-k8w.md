# Session log — 2026-04-23 — MISSION-01 Research Missions

Session ID: 2026-04-23-mission01-build-k8w

## What we worked on
MISSION-01 (Research Missions), UX-07 (new backlog entry)

## What was done

### Schema (SKL-06 + SKL-09)
- Wrote Drizzle schema: `02-app/lib/db/schema/missions.ts` — `missions` table, `verticals` lookup table, `missionPhaseEnum`, 4 join tables (`mission_verticals`, `mission_contacts`, `mission_stats`, `mission_inputs`)
- Generated migration `0014_clammy_spot.sql` — 6 tables, 1 enum, 10 indexes, 10 FK constraints
- Applied via Neon MCP transaction, recorded in `drizzle.__drizzle_migrations`
- Updated `02-app/lib/db/schema/index.ts` to export `./missions`
- Deferred join tables: `mission_content_pillars` (awaits DNA-06), `mission_content` (awaits REG-01)

### Layout design (SKL-02)
- Template check: matched `project-workspace` template (established from CLIENT-01)
- Wrote delta layout spec: `01-design/wireframes/MISSION-01-layout.md`
- Key deltas from template: thesis replaces brief, verticals as chips (not table), phase enum replaces status, client project link as header label
- Updated brief UI/UX notes section

### Feature build (SKL-04)

**New files:**
- `02-app/lib/types/missions.ts` — types, phase labels, phase badge colours
- `02-app/lib/db/queries/missions.ts` — full query layer (CRUD, verticals, link/unlink for contacts/inputs/stats, search functions, dashboard query)
- `02-app/app/actions/missions.ts` — server actions (create, save field, change phase, vertical CRUD, link/unlink, search)
- `02-app/app/(dashboard)/projects/missions/page.tsx` — list page (server component)
- `02-app/app/(dashboard)/projects/missions/missions-list-client.tsx` — list client component (filter pills, table, empty state with CTA)
- `02-app/app/(dashboard)/projects/missions/[id]/page.tsx` — workspace server page
- `02-app/app/(dashboard)/projects/missions/[id]/mission-workspace.tsx` — workspace client component (name autosave, thesis autosave, phase dropdown, verticals chips + combobox, linked sections with search/link/unlink)
- `02-app/components/create-mission-modal.tsx` — create modal (name, thesis, verticals multi-select with inline create)

**Modified files:**
- `02-app/app/(dashboard)/page.tsx` — "Current work" section wired to show active missions
- `02-app/components/registry.ts` — added `CreateMissionModal` entry

### Bugs fixed during testing
1. **Empty state had no "New mission" button** — list page showed EmptyState without CTA when no missions existed. Fixed: always render `MissionsListClient`, early return with EmptyState + button when empty.
2. **Verticals created in modal not linked to mission** — `createAndLinkVertical('temp', name)` tried to link to non-existent mission. Fixed: added `createVertical()` action that just creates the row; `createMission()` handles the linking.
3. **Contact/input/stat search case-sensitive** — Postgres `LIKE` is case-sensitive. Fixed: switched all search queries to `ilike`.
4. **TypeScript errors** — `useRef<NodeJS.Timeout>()` without initial value, `asChild` prop instead of project's `render` pattern, `return () => if(...)` syntax, missing `@/components/ui/label`. All resolved.

### Backlog addition
- Added **UX-07: Autosave feedback consistency** — three different save indicator patterns exist across the app (InlineField inline, SectionCard action slot, toast + inline). Needs standardisation.

## Decisions made
- **`missionInputs` links to `srcSourceDocuments` not `pendingInputs`** — brief specified `pending_inputs.id` but source documents are permanent records; pending inputs are transient. More durable linkage.
- **`graphNodeId` FK uses `onDelete: 'set null'`** — deleting a graph node shouldn't cascade-delete the mission or vertical, just unlink.
- **`clientProjectId` bare uuid, no FK** — CLIENT-01 table exists in schema but FK constraint deferred to avoid circular dependency issues. Add constraint when CLIENT-01 feature lands.
- **Graph node auto-creation deferred** — layout spec says auto-create Mission node in FalkorDB on mission creation. Deferred to v2 to keep this build focused on Postgres CRUD + UI. `graphNodeId` stays null.
- **ItemLinker implemented inline** — shared `ItemLinker` component from template spec built as inline pattern in workspace. Extract to shared component when CLIENT-01 builds its workspace.
- **Save indicators** — thesis uses SectionCard action slot (top-right), name uses inline text. Broader inconsistency tracked as UX-07.

## What came up that wasn't planned
- `02-app/lib/db/schema/projects.ts` already exists with CLIENT-01 tables (`organisations`, `client_projects`, join tables) — built in a parallel session. Schema index already exports it.
- `02-app/lib/db/schema/inputs/ideas.ts` exists (IDEA-01 schema done in parallel).
- Dashboard `page.tsx` was modified externally to import `getActiveProjectsForDashboard` and `FolderKanban` — CLIENT-01 dashboard integration running in parallel.
- `create-project-modal.tsx` has a pre-existing TS error (missing `@/components/ui/label` module) — not from this session.

## Backlog status changes
| Feature | Before | After |
|---|---|---|
| MISSION-01 | brief approved | done |
| UX-07 | — (new) | planned |

## What's next
- **CLIENT-01 build** — schema exists, layout spec approved, ready for feature-build
- **IDEA-01 integration** — once IDEA-01 UI is built, wire the Ideas & Questions section in mission workspace
- **Graph integration (v2)** — auto-create Mission node on creation, BELONGS_TO edges for verticals
- **UX-07** — standardise save indicators across all editable views
- **GEN-01 close-out** — still needs final end-to-end test confirmation

## Context for future sessions
- Nav already configured for both "Client Projects" and "Missions" under the Projects group — both routes are live
- The `project-workspace` template is now validated by MISSION-01 — CLIENT-01 should follow it closely
- `createVertical()` and `createAndLinkVertical()` are separate actions — modal uses the former, workspace uses the latter
- All search queries use `ilike` for case-insensitive matching
- `BRAND_ID` is hardcoded in server actions and pages (`ea444c72-d332-4765-afd5-8dda97f5cf6f`) — same pattern as all other features
