# Session log — 2026-04-14 — Dashboard rework + feature briefs
Session ID: 2026-04-14-dashboard-rework-n8j

## What we worked on
- DASH-01: Dashboard shell — sidebar rework, dashboard home page redesign, top toolbar
- CLIENT-01: Client projects — feature brief (approved)
- MISSION-01: Research missions — feature brief (approved)
- IDEA-01: Ideas / quick capture — feature brief (approved)
- DS-01: Design system — sidebar and dashboard alignment with style guide
- ADR-002: Graph schema — CaseStudy → Mission rename

## What was done

### Feature briefs (3 new, all approved)

**CLIENT-01: Client projects** — `01-design/briefs/CLIENT-01-client-projects.md`
- Knowledge container for client engagements. Links to organisation, holds brief/scope, tracks status (active/paused/complete/abandoned). Not a project management tool — tasks stay in Notion.
- Defined `client_projects` table, `organisations` table (new dependency: ORG-01), join tables for missions/inputs/content/stats.
- Graph: uses existing `Project` node type from ADR-002. Proposed new `COMMISSIONED_BY` relationship (Project → Organisation).

**MISSION-01: Research missions** — `01-design/briefs/MISSION-01-research-missions.md`
- Bounded research investigations with thesis, phase lifecycle (exploring/synthesising/producing/complete/paused), linked knowledge ecosystem (inputs → analysis → outputs).
- Defined `missions` table, `verticals` lookup table (new), join tables to contacts, stats, content pillars, inputs, content.
- Maps to `Mission` graph node type (renamed from CaseStudy — see below).

**IDEA-01: Ideas / quick capture** — `01-design/briefs/IDEA-01-quick-capture.md`
- System-wide capture for thoughts/questions/sparks. Lightbulb button in top toolbar, always visible. Text-only for v1.
- Defined `ideas` table, join tables to missions and projects.
- Ideas list lives as a tab in Inputs section at `/inputs/ideas` — same mental model as queue (things needing review).
- Separate from graph `Idea` nodes — lightweight placeholders, not processed inputs. Future: "promote to graph" action.

### Schema rename: CaseStudy → Mission

"Case Study" was ambiguous — it also exists as a source knowledge subtype (client testimonial case studies). Renamed across:
- `00-project-management/decisions/adr-002-graph-schema.md` — all references
- `02-app/lib/graph/types.ts` — `NodeLabel` union type
- `01-design/briefs/KG-01-02-graph-write-api.md` — node label list
- `00-project-management/backlog.md` — KG-01 description
- `.claude/skills/kg-ingest-creator/SKILL.md` — node labels reference
- `01-design/briefs/CLIENT-01-client-projects.md` — cross-references
- Session logs left untouched (historical records)

### Stats table: folded into existing schema

Discovered `src_statistics` table already exists with most needed fields. Instead of creating a new table, planned extensions via migration:
- Add `stat_type` enum (`brand_proof` / `ecosystem`)
- Add `source_organisation_id` FK → organisations
- Add `stat_date` (full date, not just year)
- Add `mission_stats` and `project_stats` join tables

### Sidebar rework

Rewrote `02-app/components/nav-sidebar.tsx`:
- Permanently expanded (220px), no collapsible/icon-only mode. Plain `<aside>` element — removed shadcn `SidebarProvider` and all associated components from the layout.
- Logo mark: sage square with Brain icon + "BigBrain" wordmark + "by Nicely Put"
- Search bar: cosmetic `⌘K` trigger (wires to command palette later)
- Home: flat link to `/`, sage background when active (matches style guide specimen)
- Down-chevron accordions for section groups
- Active state: sage bg fill (flat links), sage text (sub-items)
- New sections: Projects (Client Projects, Missions), Ideas in Inputs

Updated `02-app/lib/nav-config.ts`:
- New `NavEntry` union type: `NavLink | NavGroup | NavDivider`
- Nav order: Home → DNA → Knowledge → Inputs (with Ideas) → Content → Projects
- Legacy `navSections` export retained for compatibility

### Dashboard layout rework

Updated `02-app/app/(dashboard)/layout.tsx`:
- Removed `SidebarProvider` wrapper
- Simple flex layout: fixed sidebar + scrollable main area
- Added persistent `<header>` with `TopToolbar` component
- Increased padding to `px-8 pb-8` for generous spacing

### Dashboard home page rework

Rewrote `02-app/app/(dashboard)/page.tsx`:
- Bento grid layout with `max-w-5xl` constraint
- Stats row (3-col): Knowledge Nodes, Sources, Input Queue — with `StatCard` sub-component
- Two-column (1.2fr + 0.8fr): Current work (empty state) + Spark feed (empty state) on top
- Quick actions row below current work
- Bottom two-column: Input queue + Recent activity
- "+New input" dropdown: Text enabled, Document/Audio/URL disabled with "Soon" labels
- Removed separate "Brain at a glance" stats card (numbers now in stats row)

### Top toolbar + Ideas capture

Created `02-app/components/top-toolbar.tsx`:
- Persistent in layout header across all pages
- Lightbulb button opens idea capture modal
- Designed to accommodate future additions (notifications, etc.)

Created `02-app/components/idea-capture-modal.tsx`:
- Minimal: textarea + "Capture" button + `⌘↵` keyboard shortcut
- Auto-records context page (current route)
- TODO stub for server action (ideas table doesn't exist yet)

### Other changes

- Installed `motion` library (Framer Motion v11+) for future Spark Feed animations
- Updated `02-app/components/registry.ts` — added TopToolbar, IdeaCaptureModal, updated NavSidebar description
- Added backlog entries: IDEA-02 (voice capture, parked), IDEA-03 (AI-surfaced ideas, parked), ORG-01 (organisations table)
- Marked INP-04 as superseded by IDEA-01
- Added dashboard zone map to DASH-01 brief — maps every dashboard zone to its owning feature and upgrade trigger

## Decisions made

- **Sidebar permanently expanded** — collapsible mode removed. The app is desktop-only (≥990px gate) and 220px is narrow enough. Simplifies the component significantly and matches the style guide specimen. If mobile support is ever needed, revisit.
- **CaseStudy → Mission** — naming collision with source knowledge "case study" type. Graph node, Postgres table, and all references renamed. Session logs left as historical records.
- **Stats folded into existing table** — `src_statistics` already had most fields. Extending it rather than creating a parallel `stats` table. Brand proof vs ecosystem distinction via `stat_type` enum.
- **Ideas live in Inputs section** — `/inputs/ideas` tab alongside Queue. Same mental model: things that need reviewing. Not a separate nav section.
- **Client projects = knowledge container, not PM tool** — no tasks, timelines, or deliverables. Those stay in Notion. Potential Notion integration is a separate future feature.
- **No AI insights card in sidebar** — style guide specimen showed one, but decided it would get in the way across the app. Removed from scope.
- **Capture portal → "+New input" dropdown** — reference mockup had a large textarea portal. Replaced with a compact dropdown button that routes to the appropriate input flow. Less visual weight, same functionality.

## What came up that wasn't planned

- **Research Missions as a concept** — started as expanding CLIENT-01, evolved into a full separate feature (MISSION-01) through collaborative questioning. The existing `CaseStudy` graph node type mapped perfectly.
- **Ideas/Quick Capture (IDEA-01)** — emerged from discussing what "related questions" are in the context of missions. Grew into a system-wide primitive.
- **Organisations table (ORG-01)** — surfaced as a dependency when designing client projects. The contacts table only has free-text `organisation` field.
- **Stats table already existed** — expected to need a new table, found `src_statistics` already covered most requirements.

## Backlog status changes

| Feature | Old status | New status |
|---|---|---|
| CLIENT-01 | parked | brief approved |
| MISSION-01 | (new) | brief approved |
| IDEA-01 | (new) | brief approved |
| ORG-01 | (new) | planned |
| IDEA-02 | (new) | parked |
| IDEA-03 | (new) | parked |
| INP-04 | planned | superseded by IDEA-01 |

## What's next

### Immediate (ready to build)
- **IDEA-01 implementation** — create `ideas` table migration, server action for capture, wire up the modal. Small scope, high value — makes the lightbulb button actually work.
- **ORG-01** — create `organisations` table. Simple schema, no brief needed (defined in CLIENT-01 brief). Blocks CLIENT-01 and MISSION-01.
- **`src_statistics` extension migration** — add `stat_type`, `source_organisation_id`, `stat_date` fields. Depends on ORG-01.

### Next features (need layout-design before build)
- **CLIENT-01** — needs layout-design for the project workspace at `/projects/clients/[id]`
- **MISSION-01** — needs layout-design for the mission workspace at `/projects/missions/[id]`
- Both also need stub route pages and list views

### Dashboard zones that activate with features
- Current work table → CLIENT-01 + MISSION-01 (query active projects/missions)
- Spark feed → RET-01 + IDEA-03 (M3+)
- "+New" dropdown options → INP-05 (document), IDEA-02 (audio)

### Other
- INP-01 (Krisp ingestion) still the remaining M2 item
- Design system refinement ongoing (DS-01)

## Context for future sessions

- **The sidebar is now a plain `<aside>`** — it no longer uses shadcn's `SidebarProvider`, `useSidebar`, or any of the `Sidebar*` components. Any future code that imports these will need updating. The `ui/sidebar.tsx` file still exists but is unused by the layout.
- **Dashboard zone map** is documented in the DASH-01 brief decisions log (2026-04-14 entry). Refer to this when building any feature that has a dashboard surface.
- **Pre-existing build error** — `lib/llm/embeddings.ts:10` has a type error (Google SDK `textEmbeddingModel` signature changed). Not introduced by this session, not blocking.
- **`motion` library is installed** but not yet used. Intended for Spark Feed card animations when that zone goes live (M3+).
- **Three briefs approved but no layout-design done** — CLIENT-01, MISSION-01, and IDEA-01 all need layout-design before build. IDEA-01 is small enough that a lightweight layout spec may suffice.
- **`navSections` legacy export** in `nav-config.ts` is retained but deprecated. If anything still imports it, it works (maps from the new `navEntries` format). Can be removed once verified no consumers remain.

## Skill improvements made

1. **feature-brief (SKL-01):** Added "conversational context shortcut" paragraph to Step B. When the feature has already been discussed substantially in the current conversation, skip the full questionnaire and ask only the gaps. Avoids re-asking answered questions and breaking productive flow.

2. **layout-design (SKL-02):** Added "rework of existing UI" edge case. For restyling already-built pages (e.g. after design system changes), the full layout spec process is overkill. Design conversation can happen inline during the build session. Document decisions in the brief's decisions log or session log instead.
