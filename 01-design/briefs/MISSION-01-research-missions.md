# Research Missions Brief
Feature ID: MISSION-01
Status: complete
Last updated: 2026-04-14

## Summary
A bounded research investigation with its own thesis, lifecycle, and linked knowledge. Missions cluster inputs, graph knowledge, stats, ideas, and content around a specific question — e.g. "reshoring and near-shoring funding patterns in Europe." They can be standalone (personal research) or linked to a client project. Over time, a mission's topic may evolve into a recurring theme, but the initial model is a named, time-bound inquiry.

Addresses **Problem 4** (research as accumulation instead of compounding) directly — each mission builds on the graph, and the next investigation in adjacent territory starts richer.

Maps to the `Mission` node type in the knowledge graph (ADR-002, renamed from `CaseStudy`).

## Use cases
- **Start a new investigation:** Create a mission with a name and thesis. Set phase to `exploring`. Optionally link to a client project, verticals, and content pillars.
- **Collect inputs around a question:** Tag inputs (transcripts, documents, research) as belonging to this mission. They're processed into the graph as normal, but also linked to the mission.
- **Capture structured findings:** Add stats (structured claims with source and date) as research produces concrete data points.
- **Park tangent questions:** Capture ideas/questions that arise during research without getting derailed. They're tagged to the mission and can be reviewed later.
- **Query the graph in context:** From inside a mission, ask questions that leverage the linked knowledge — "what connections exist between the entities in this investigation?"
- **Produce content from findings:** Once analysis is sufficient, create content that draws on the mission's knowledge. Content pieces link back for provenance.
- **Track progress:** Move through phases (exploring → synthesising → producing → complete) or pause/shelve.
- **Navigate from dashboard:** See active missions in the dashboard "current work" list table. Click to jump in.
- **Link to client work:** A mission can be linked to a client project (e.g. "robotics market analysis for [client]"). The link is optional — many missions are standalone.

## User journey
1. User navigates to `/projects/missions` → sees list of all missions (filterable by phase)
2. User clicks "New mission" → form: name, thesis, phase (defaults to `exploring`), optionally select verticals, content pillars, client project → created
3. User is taken to `/projects/missions/[id]` → mission workspace
4. From the workspace, user can: edit thesis, view/change phase, see linked inputs, see linked stats, see linked ideas/questions, see linked content, see linked contacts (interviewees)
5. While working elsewhere in the app (processing inputs, browsing knowledge, creating content), user can tag items as belonging to this mission
6. User adds stats as findings emerge — structured claims with source and date
7. User captures ideas/questions that arise — quick capture, tagged to this mission
8. User changes phase as work progresses → eventually completes or shelves the mission

## Data model / fields

### `missions` table (Postgres)

| Field | Type | Required | Constraints | Notes |
|---|---|---|---|---|
| `id` | uuid | yes | PK, auto-generated | |
| `brand_id` | uuid | yes | FK → brands.id | Scoped to brand |
| `name` | text | yes | | Mission name, e.g. "European Reshoring Funding Patterns" |
| `thesis` | text | no | | The framing question or hypothesis being investigated |
| `phase` | text | yes | enum: exploring, synthesising, producing, complete, paused | Default: `exploring` |
| `graph_node_id` | varchar(100) | no | FK → graph_nodes.id | Links to Mission node in FalkorDB |
| `client_project_id` | uuid | no | FK → client_projects.id | Optional link to a client project |
| `created_at` | timestamp(tz) | yes | default now | |
| `updated_at` | timestamp(tz) | yes | default now | |

### `verticals` table (Postgres) — NEW

A lookup table for sectors/industries. Canonical source for vertical names, mirroring the Vertical nodes in the graph.

| Field | Type | Required | Constraints | Notes |
|---|---|---|---|---|
| `id` | uuid | yes | PK, auto-generated | |
| `name` | text | yes | unique | Canonical name: "Defence", "Robotics", "Energy", etc. |
| `graph_node_id` | varchar(100) | no | FK → graph_nodes.id | Links to Vertical node in FalkorDB |
| `created_at` | timestamp(tz) | yes | default now | |

**Canonical enforcement:** The verticals table IS the canonical register for sectors. When adding a vertical, check for near-duplicates (e.g. "Robotics" vs "Physical AI"). If the graph already has a Vertical node, the table entry should reference it. New verticals created here should also create the corresponding graph node.

### Join tables

| Join table | Columns | Notes |
|---|---|---|
| `mission_verticals` | mission_id, vertical_id | Many-to-many: a mission spans multiple sectors |
| `mission_content_pillars` | mission_id, content_pillar_id (FK → dna_content_pillars.id) | Many-to-many: a mission feeds into multiple pillars |
| `mission_contacts` | mission_id, contact_id (FK → contacts.id) | Many-to-many: interviewees and key people |
| `mission_stats` | mission_id, stat_id (FK → src_statistics.id) | Many-to-many: stats can belong to multiple missions |
| `mission_inputs` | mission_id, input_id (FK → pending_inputs.id) | Many-to-many: inputs tagged to this investigation |
| `mission_content` | mission_id, content_id | Many-to-many: content produced from this mission |

All join tables include `created_at` timestamp.

## Knowledge ecosystem

A mission's knowledge flows through three stages:

### Inputs
- Processed text, source documents, transcripts tagged to this mission
- Graph nodes and edges created from those inputs (linked via `PART_OF` → Mission)
- The raw material of the investigation

### Analysis
- Knowledge graph queries exploring connections between linked entities
- Stats — structured findings with provenance (date, source, location)
- Ideas/questions — thoughts and tangents captured during research (see IDEA-01)
- Further input text/audio as thinking develops

### Outputs
- Content pieces produced from the mission's findings
- Chat conversations that draw on the mission's knowledge
- These link back to the mission for provenance

## Update behaviour
**Freely editable.** Name, thesis, phase, and all relationships can be changed at any time. No version history — the thesis may evolve as research progresses, and that's expected.

## Relationships

### Knowledge graph (FalkorDB)
Defined in ADR-002 (renamed from CaseStudy):
- `Mission` node type with `status`, `thesis` properties
- `PART_OF` relationship: Event, SourceDocument, ContentItem → Mission
- `BELONGS_TO` relationship: Mission → Vertical
- `OVERLAPS_WITH` relationship: Mission ↔ Mission (thematic adjacency)
- `SUPPORTS` relationship: Idea, Mission → Methodology, Concept

Extended:
- `SCOPED_TO` relationship: Mission → Project (when linked to a client project — reuses existing relationship type)

### Postgres
- `missions` → `brands` (FK: brand_id)
- `missions` → `client_projects` (FK: client_project_id, optional)
- `missions` → `graph_nodes` (FK: graph_node_id, optional)
- Join tables to: verticals, content pillars, contacts, stats, inputs, content

## UI/UX notes
Layout spec: `01-design/wireframes/MISSION-01-layout.md` (approved 2026-04-23)
Template: adaptation of `project-workspace` (established from CLIENT-01)

**Key decisions:**
- List view at `/projects/missions` — table with Name, Thesis (truncated), Phase badge, Updated
- Workspace at `/projects/missions/[id]` — single scroll, SectionCard sections
- Phase badge colours: Exploring (blue), Synthesising (purple), Producing (amber), Complete (green), Paused (muted)
- Default list filter: Exploring
- Workspace sections (order): Thesis, Verticals (chip display), Contacts, Inputs, Stats, Ideas (stub), Content (stub)
- Verticals displayed as chips with inline create via combobox (not a table)
- Client project link as header label with edit picker (hidden until CLIENT-01 is built)
- Create modal: name (required), thesis (optional), verticals (optional multi-select)
- Archive sets phase to `paused`, navigates to list
- Graph node auto-created on mission creation

## Edge cases
- **Empty state (no missions):** Message + CTA. "No missions yet — start an investigation."
- **Empty state (mission with no linked items):** Show thesis and phase, with empty sections prompting the user to start collecting inputs and capturing findings.
- **Duplicate names:** Allowed — different investigations might share similar names.
- **Deleting a mission:** Phase → `complete` or remove from active view. Hard delete removes the Postgres row and graph node + `PART_OF` edges, but leaves all linked items (inputs, stats, content, contacts) intact. They existed independently.
- **Mission linked to a deleted/abandoned client project:** Mission persists independently. The `client_project_id` FK becomes null (or references the abandoned project). Recommend: keep the link, since the project still exists in `abandoned` status.
- **Vertical deduplication:** When creating a new vertical, check for near-matches in the existing table. Surface a warning: "Did you mean [existing]?" Don't auto-merge — let the user decide.

## Out of scope
- **Full knowledge graph explorer within the mission workspace** — the workspace links to graph nodes but doesn't embed a graph visualization. That's a separate feature (the Knowledge Graph explorer).
- **AI-driven synthesis** — "summarise this mission's findings" or "suggest connections" is M3+ retrieval functionality. The container exists now; intelligence comes later.
- **Template missions** — pre-built investigation structures for common research types. Potentially useful but not v1.
- **Mission → theme evolution** — the concept that a mission topic becomes a recurring lens. This is a future enhancement to the model, not part of the initial build.
- **Notion sync** — pulling research tasks or notes from Notion into a mission. Separate feature.

## Dependencies
- **DASH-01** (dashboard shell) — in progress
- **CLIENT-01** (client projects) — optional FK. Can be built in parallel; the FK is nullable.
- **ORG-01** (organisations table) — needed for src_statistics.source_organisation_id extension
- **IDEA-01** (ideas/quick capture) — missions will link to ideas. Can be built in parallel; the relationship is additive.
- **src_statistics schema extension** — add `stat_type` enum (brand_proof/ecosystem), `source_organisation_id` FK → organisations, `stat_date` (full date). Existing table, migration only — no new brief needed.
- Content pillars table (`dna_content_pillars`) must exist for the join table.

## Open questions / TBDs
- [ ] **Mission workspace layout:** Panel structure, tabs vs single scroll, information hierarchy — deferred to layout-design
- [ ] **Tagging UX:** How does the user tag inputs/content to a mission? Same question as CLIENT-01 — likely a shared pattern.
- [ ] **Graph sync:** When a mission is created in Postgres, should the Mission graph node be created automatically? Or manually via "sync to graph" action? Recommend: auto-create on save, same pattern as other graph-linked entities.
- [ ] **Phase transitions:** Are there any rules about phase transitions (e.g. can't go from `complete` back to `exploring`)? Or is it fully flexible? Recommend: fully flexible — research is messy, you might reopen a completed investigation.

## Decisions log
- Renamed from CASE-01 / CaseStudy to MISSION-01 / Mission (2026-04-14) — "Case Study" was ambiguous with source knowledge case studies (client testimonial case studies). Graph node type renamed from `CaseStudy` to `Mission` in ADR-002 and types.ts.
- Brief approved 2026-04-14
- Stats folded into existing `src_statistics` table (2026-04-14) — no separate SRC-02 brief. Extending the table with `stat_type`, `source_organisation_id`, and `stat_date` fields via migration.
