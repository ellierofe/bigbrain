# Session log — 2026-04-23 — CLIENT-01 Client Projects

Session ID: 2026-04-23-client01-build-h7w

## What we worked on
CLIENT-01 (Client Projects), ORG-01 (Organisations table), layout-design for CLIENT-01

## What was done

### Layout design (SKL-02)
- Ran feature-template-check → no match, new pattern needed
- Designed full layout spec through conversation with Ellie — key insight: **workspace is a lens, not a workbench**. Work happens in existing tools (chat, processing, sources); the project workspace scopes and views what's connected.
- Status enum changed from `active/paused/complete/abandoned` to `active/paused/complete/archived`
- Ideas & Questions section designed to use IDEA-01's existing `ideas` table with `idea_projects` join table, not a custom field
- Confirmed need for `type` field on ideas (`idea` | `question`) — already built by IDEA-01
- Saved layout spec: `01-design/wireframes/CLIENT-01-layout.md`
- Created reusable template: `01-design/wireframes/templates/project-workspace-template.md`
- Updated feature-template-check registry with new `project-workspace` pattern

### Build (SKL-04)

**Schema + migration:**
- `02-app/lib/db/schema/projects.ts` — 7 tables: `organisations`, `client_projects`, `project_missions`, `project_inputs`, `project_stats`, `project_content`, `idea_projects`
- Migration `0017_living_manta.sql` generated and applied to Neon
- Added `COMMISSIONED_BY` to `RelationshipType` union in `lib/graph/types.ts`

**Query + actions layer:**
- `lib/db/queries/organisations.ts` — list, search, create
- `lib/db/queries/client-projects.ts` — full CRUD + link/unlink + search for ItemLinker + dashboard query
- `lib/types/client-projects.ts` — all TypeScript types
- `app/actions/client-projects.ts` — server actions for all operations

**UI:**
- `components/item-linker.tsx` — new molecule: inline search/picker for linking items to a parent entity (shared with MISSION-01)
- `components/create-project-modal.tsx` — single-step modal with inline org creation
- `app/(dashboard)/projects/clients/page.tsx` + `project-list-client.tsx` — list view with status filter pills
- `app/(dashboard)/projects/clients/[id]/page.tsx` + `project-workspace.tsx` — full workspace with Brief, Ideas & Questions, Linked Missions/Inputs/Stats/Content sections
- Dashboard home `page.tsx` — Current Work section now shows active projects interleaved with missions
- `components/registry.ts` — added `CreateProjectModal` and `ItemLinker` entries

### Bug fix during testing
- Brief save indicator was positioned `absolute top-2 right-3`, floating over textarea text. Fixed: moved to `mt-1 block text-[10px]` below the textarea, matching InlineField's save feedback pattern.

## Decisions made
- **Workspace = lens, not workbench** — the project detail page is a hub for viewing linked items, not a place to do substantive work. Work happens in chat, processing, sources; the project scopes it.
- **Archive replaces abandoned** — `archived` is more accurate for projects that simply ended vs projects that failed.
- **Ideas & Questions via IDEA-01** — no custom questions field on client_projects. Ideas tagged to projects via `idea_projects` join table. `type` field (`idea`|`question`) enables filtering.
- **Graph node creation deferred** — `graph_node_id` column exists but stays null. Auto-creating Project nodes in FalkorDB is a follow-up enhancement.
- **`project_missions.mission_id` has no FK constraint** — bare uuid to avoid circular imports between projects.ts and missions.ts schemas. Data integrity via application layer.
- **Default list filter = Active** — not "All", so archived/complete projects don't clutter the default view.

## What came up that wasn't planned
- IDEA-01 was already fully built (discovered during planning) — including the `type` field for idea/question. This simplified the build significantly.
- Missions table also already existed with `clientProjectId` column (FK deferred). The join table approach supplements this.
- `idea_projects` join table didn't exist in IDEA-01's build — created here as part of the CLIENT-01 migration.

## Backlog status changes
| Feature | Before | After |
|---|---|---|
| ORG-01 | planned | done |
| CLIENT-01 | brief approved | done |

## What's next
- **MISSION-01** — being built in parallel session. Can reuse `ItemLinker` molecule and `project-workspace` template.
- **GEN-01 close-out** — still needs end-to-end test confirmation from earlier today
- **Idea tagging from workspace** — currently ideas are tagged to projects from the Ideas list only. A future enhancement could auto-tag when capturing from a project workspace page.
- **Graph node creation** — captured as planned enhancement in CLIENT-01 brief. Create Project + Organisation nodes in FalkorDB when projects/orgs are created.
- **Chat topic scoping** — captured as planned enhancement. Auto-select project context when chat is invoked from workspace.

## Context for future sessions
- `BRAND_ID` is hardcoded as `ea444c72-d332-4765-afd5-8dda97f5cf6f` in server actions — same pattern as all other features.
- The `project-workspace` template at `01-design/wireframes/templates/project-workspace-template.md` is ready for MISSION-01 to adapt via delta.
- `ItemLinker` component is generic — takes `entityLabel`, `onSearch`, `onLink`, `onClose`. MISSION-01 can use it directly.
- No `Label` atom in shadcn/ui — use plain `<label>` elements. Caught during build.
