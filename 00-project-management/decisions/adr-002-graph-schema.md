# ADR-002: Knowledge Graph Schema

> Status: APPROVED
> Date: 2026-03-30
> Decides: Node types, relationship types, seed data, provenance rules, and Postgres mirror strategy for the FalkorDB knowledge graph

---

## Context

BigBrain uses FalkorDB as a knowledge graph alongside Neon (Postgres). The graph holds relationships between entities that are too varied and emergent to fit a relational schema — ideas, people, organisations, research, events, and how they connect.

Before implementing GRF-01 (graph schema and seed setup), the schema needed to be designed with enough specificity to guide implementation, while remaining flexible enough to grow as the system is used.

Key inputs to this decision:
- The domain model (`04-documentation/domain-model.md`) — graph stores relationships; Postgres stores structured content
- The Atomic Lounge brief (`04-documentation/reference/atomic_lounge/`) — surfaced concrete node types (Policy, Country, Event, FundingEvent, Vertical)
- Ingestion rules from the SDP project (`04-documentation/reference/kg-rules/`) — rules 1–12 carry over directly
- DNA schema definitions (`01-design/schemas/`) — DNA types have `graphNodeId` fields where relevant
- ADR-003 — source documents are provenance anchors; they belong in the graph too

---

## Decisions

### 1. Node types

Twelve node types, plus two infrastructure types pre-seeded at setup.

#### Content and knowledge nodes

| Label | Description |
|---|---|
| `Idea` | An atomic thought, observation, or insight — extracted from any input. The most common node. Timestamped to its source. |
| `Concept` | An abstract principle, theory, or framing — e.g. "managed decline", "compound moat", "three-body problem". More stable and general than an Idea. |
| `Mission` | A bounded research investigation — clusters Ideas, Events, SourceDocuments, and ContentItems around a defined question. Covers Atomic Lounge case files, standalone research, and client research bodies. Renamed from `CaseStudy` (2026-04-14) to avoid ambiguity with source knowledge case studies. |
| `Vertical` | A sector or industry — e.g. defence, energy, robotics, space, biotech. Flat structure, connected with `OVERLAPS_WITH` rather than hierarchy (dual-use sectors genuinely overlap; a hierarchy would be dishonest). |
| `Methodology` | Ellie's own methodologies, frameworks, and processes. Postgres-primary (full content in `dna_knowledge_assets`), graph-secondary (node enables relationship traversal — "what research supports this methodology?"). Linked via `graphNodeId` in Postgres. |

#### Actor nodes

| Label | Description |
|---|---|
| `Person` | Any individual encountered in research, interviews, client work, or inputs. Has a `roles[]` property (e.g. `['founder', 'interviewee', 'client']`) — a single person can hold multiple roles. |
| `Organisation` | Any company, institution, government body, fund, publication, or entity. Has a `types[]` property (e.g. `['vc_firm', 'portfolio_company']`, `['government', 'procurement_body']`). Atomic Lounge itself is an Organisation node (`type: ['publication']`). |

#### Event and document nodes

| Label | Description |
|---|---|
| `Event` | A discrete occurrence — interview, meeting, conference, call. Provenance anchor for what was said and when. Interviews for Atomic Lounge case files are Events linked to their Mission. |
| `SourceDocument` | An ingested document — transcript, PDF, research file, voice note, web scrape. Provenance anchor for extracted knowledge. Every Idea, Concept, and relationship extracted from a document traces back to its SourceDocument node. |
| `ContentItem` | A published or generated output — documentary, dossier, field note, LinkedIn post, newsletter, sales page. Enables "what have I written about X?" traversal. Linked back to its source Ideas, CaseStudies, and Methodologies. |

#### Commercial and policy nodes

| Label | Description |
|---|---|
| `Project` | A client engagement. Scopes knowledge that is specific to a client while keeping patterns and insights connected to the wider graph. Knowledge flows from Project to the main graph via relationships; client-specific detail stays scoped. |
| `FundingEvent` | A discrete capital allocation — a funding round, grant, government programme, or investment. Node (not just a relationship property) to enable traversal: "all defence companies that raised Series A in 2024", "grants connected to reshoring CaseStudies". |
| `Policy` | A specific policy, legislation, or programme — IRA, CHIPS Act, UK industrial strategy, DASA, MoD procurement frameworks. Enables the three-body analysis: how does this policy connect to capital allocation and engineering reality? |

#### Infrastructure nodes (pre-seeded at setup)

| Label | Description |
|---|---|
| `Country` | 249 ISO 3166-1 nodes, pre-seeded at setup. Geographic anchor for cross-border comparisons, market analysis, and "build here, scale there" dynamics. |
| `Date` | Day/month/year hierarchy, pre-seeded from 2010-01-01 to 2030-12-31. All temporal relationships link to Date nodes, not string properties. |

---

### 2. Relationship types

#### Provenance and source

| Relationship | From → To | Notes |
|---|---|---|
| `DERIVED_FROM` | Idea, Concept → SourceDocument, Event | This idea came from this source |
| `PART_OF` | Event, SourceDocument, ContentItem → Mission | This item belongs to this investigation |
| `INFORMED_BY` | ContentItem, Methodology → Idea, Mission, SourceDocument | Provenance for outputs and strategy |
| `PRODUCED_BY` | ContentItem → Organisation, Project | Attribution |

#### Thematic grouping

| Relationship | From → To | Notes |
|---|---|---|
| `BELONGS_TO` | Idea, Concept, Mission → Vertical | Thematic territory |
| `OVERLAPS_WITH` | Vertical ↔ Vertical, Mission ↔ Mission | Thematic adjacency — undirected |
| `SUPPORTS` | Idea, Mission → Methodology, Concept | Evidence chain — this finding supports this claim or approach |
| `CONTRADICTS` | Idea ↔ Idea, Concept ↔ Concept, Policy ↔ Concept | The gap between narrative and reality — core to Atomic Lounge's thesis |
| `RELATES_TO` | Any → Any | Generic discovered connection — used when a more specific type doesn't apply |

#### Temporal

| Relationship | From → To | Notes |
|---|---|---|
| `ON_DATE` | Any → Date (day level) | Used when exact date is known |
| `IN_MONTH` | Any → Date (month level) | Used when only month is known |
| `IN_YEAR` | Any → Date (year level) | Used when only year is known |

#### Actor relationships

| Relationship | From → To | Notes |
|---|---|---|
| `MENTIONS` | SourceDocument, Event → Person, Organisation | Who appeared in what |
| `INTERVIEWED_IN` | Person → Event | Guest appeared in this interview/meeting |
| `EMPLOYS` | Organisation → Person | Structural relationship |
| `ADVISES` | Person → Organisation | Board, advisory, consulting relationships |
| `FUNDS` | Organisation, FundingEvent → Organisation, Project | Capital relationships |
| `RAISED` | Organisation → FundingEvent | This company raised this round |

#### Geographic

| Relationship | From → To | Notes |
|---|---|---|
| `LOCATED_IN` | Organisation, Project, Event → Country | Where an entity is based or occurred |
| `CONCERNS` | Policy, Mission, FundingEvent → Country | Geopolitical scope |

#### Project scoping

| Relationship | From → To | Notes |
|---|---|---|
| `SCOPED_TO` | Any → Project | Marks knowledge as client-specific while keeping it in the graph |
| `GENERATED` | Project → ContentItem, Methodology | What this project produced |

---

### 3. Node and edge properties

**Every node must have:**
- `id` — uuid, generated on creation
- `name` — canonical name (resolved through the canonical register in Neon before write)
- `description` — natural language description of the node, written at ingestion time. No AI inference — describe only what is sourced. Required, not optional.
- `source` — source code identifying where this came from (e.g. `AL_TRANSCRIPT`, `CLIENT_DOC`, `MANUAL`)
- `file_ref` — reference to the specific file or input if applicable
- `createdAt`, `updatedAt`

**Every edge must have:**
- `description` — natural language description of this specific relationship
- `source` — where this relationship was established
- `createdAt`

**Selected node-specific properties:**

`Person`: `roles[]`, `organisation` (current primary affiliation), `location`
`Organisation`: `types[]`, `country`, `foundedYear`, `website`
`FundingEvent`: `round` (seed/series-a/grant/etc), `amount`, `currency`, `date`, `leadInvestor`
`Mission`: `status` (research/active/published/archived), `thesis` (the specific tension being investigated), `atomicLoungeRef` (case file number if an AL investigation)
`ContentItem`: `format` (documentary/dossier/field-note/post/etc), `platform`, `publishedAt`, `url`
`Policy`: `jurisdiction`, `status` (proposed/active/repealed), `programmeType`
`SourceDocument`: `inputType` (transcript/pdf/voice-note/research/web), `processedAt`, `extractionStatus`
`Vertical`: (no additional required properties beyond core set)
`Methodology`: `postgresId` (links to `dna_knowledge_assets.id`), `kind`

---

### 4. Postgres mirror (graph index in Neon)

Same pattern as ADR-001 and the SDP project. A flat index of all graph nodes and relationships is mirrored in Neon.

**Why:** Graph queries are expressive but slow for filtering and joining with structured data. The Neon mirror enables fast lookup, cross-referencing with DNA tables, full-text search, and reporting without requiring graph traversal for every query.

**What mirrors:**
- `graph_nodes` table — id, label, name, description, source, file_ref, created_at, plus a `properties` JSONB column for label-specific fields
- `graph_edges` table — id, from_node_id, to_node_id, relationship_type, description, source, created_at, properties JSONB

**Authority:** FalkorDB is the authority for relationships and traversal. Neon is the authority for structured content and fast lookup. When they conflict, investigate — don't silently prefer one.

---

### 5. Ingestion rules (carried over from SDP project)

All 12 rules from `04-documentation/reference/kg-rules/SKILL.md` apply:

1. **No AI inference** — null not estimated. Describe only what the source supports.
2. **Entity resolution before write** — check canonical register in Neon first
3. **Canonical names** — resolve through the register
4. **Date linking** — `ON_DATE`/`IN_MONTH`/`IN_YEAR` to pre-created Date nodes. Never store dates as string properties only.
5. **Source tracking** — `source` + `file_ref` on every node and edge
6. **Natural language description** — required on every node and edge
7. **Deduplication on reruns** — MERGE not CREATE
8. **Validation before batch** — defined per ingestion
9. **Self-improvement** — learnings fed back to ingestion scripts and rules
10. **Query provenance** — return traversed nodes/edges, not just answers
11. **Decisions capture** — record in ADRs
12. **Ingestion log** — update ingestion_log table in Neon after every run

---

### 6. Seed data at setup (GRF-01)

The following must be created before any ingestion:

1. **Country nodes** — 249 ISO 3166-1 alpha-2 countries. Pre-seed using a standard library (e.g. `pycountry`). Properties: `iso2`, `iso3`, `name`, `region`.
2. **Date nodes** — day/month/year hierarchy from 2010-01-01 to 2030-12-31. Three levels per date: day (`YYYY-MM-DD`), month (`YYYY-MM`), year (`YYYY`). Month nodes linked to year nodes; day nodes linked to month nodes.
3. **Atomic Lounge Organisation node** — Ellie's publication, manually seeded. `types: ['publication']`, `country: GB`.
4. **Canonical register** — Neon table for entity resolution. Schema: `id`, `entity_type`, `canonical_name`, `variations[]`, `dedup_key`, `graph_node_id`.

---

## What was ruled out

| Option | Why rejected |
|---|---|
| `Topic` as a node type | Too nebulous — replaced by `Vertical` (sector) and `Mission` (specific investigation). Flat `RELATES_TO` and `OVERLAPS_WITH` handle emergent connections without forcing everything into a topic taxonomy. |
| Hierarchy for Verticals | Dual-use sectors genuinely overlap (defence + energy, robotics + defence). A hierarchy would force false precision. Flat with `OVERLAPS_WITH` is more honest. |
| DNA types as graph nodes (all of them) | Only Methodology gets a graph node — it is genuinely relational (connects to research, clients, events). Other DNA types (audience segments, offers, platforms, content pillars) are Postgres-native and accessed by structured query, not traversal. `graphNodeId` fields can be added to other DNA types later without schema changes. |
| `source` as a property only (no SourceDocument node) | Rejected in favour of SourceDocument nodes. A SourceDocument node enables traversal — "which ideas and connections came from this interview transcript?" — which a property cannot support. |
| `FundingEvent` as a relationship property | Node gives traversal power: "all companies that raised Series A in defence in 2024", "grants connected to reshoring investigations". A relationship property cannot be queried this way. |
| Separate `Topic` nodes alongside `Vertical` | Would create overlap and confusion. `Vertical` handles sector territory; `Mission` handles specific research territory; `Concept` handles abstract ideas. Three distinct roles, no need for a fourth. |

---

## Consequences

- GRF-01 (graph schema, seed data, FalkorDB connection) can now be implemented
- GRF-02 (Neon graph index — `graph_nodes` + `graph_edges` tables) is defined by this ADR
- INP-03/INP-05 (input processing pipeline) should produce SourceDocument nodes as the first write, then extract Ideas and Concepts linked via `DERIVED_FROM`
- DNA-05 (knowledge assets / methodologies) should create Methodology graph nodes and populate `graphNodeId`
- All other DNA types leave `graphNodeId` null for now — field exists for future use
- Ingestion scripts should follow the SDP pattern: MERGE not CREATE, canonical register for entity resolution, UNWIND batching for FalkorDB writes
- M0 is complete with this ADR approved
