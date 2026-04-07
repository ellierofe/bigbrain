# Session log — 2026-03-30 — graph schema
Session ID: 2026-03-30-graph-schema-k7w

## What we worked on
- M0 milestone: graph schema definition (ADR-002) — the final remaining M0 blocker
- Backlog and milestones housekeeping: missing entries for seed data, graph mirror, and ingestion skill

## What was done
- Reviewed all context: domain model, ADR-001, ADR-003, DNA schemas, ingestion rules from the SDP project (`04-documentation/reference/kg-rules/SKILL.md`, `04-documentation/reference/kg-ingest-creator/SKILL.md`), and the Atomic Lounge brief (`04-documentation/reference/atomic_lounge/Atomic Lounge Brief v2.md`)
- Worked through schema design decisions collaboratively before writing — node types, relationship types, seed data, provenance model
- Wrote `00-project-management/decisions/adr-002-graph-schema.md` (APPROVED)
- Updated `00-project-management/milestones.md`: M0 marked COMPLETE, M1 promoted to current milestone with full scope and build order
- Updated `00-project-management/backlog.md`:
  - KG-01 description updated to reflect ADR-002 node/relationship types
  - Added **GRF-01** (graph seed data — Country nodes, Date nodes, Atomic Lounge org node, canonical register)
  - Added **GRF-02** (graph index mirror in Neon — `graph_nodes` + `graph_edges` tables)
  - Added **SKL-12** (`kg-ingest-creator` — port/adapt SDP ingestion skill to BigBrain)
  - Feature count updated: 61 → 64

## Decisions made

See **ADR-002** (`00-project-management/decisions/adr-002-graph-schema.md`) for the full record. Summary of key choices:

- **12 node types:** Idea, Concept, CaseStudy, Vertical, Methodology, Person, Organisation, Event, SourceDocument, ContentItem, Project, FundingEvent, Policy — plus Country and Date as pre-seeded infrastructure nodes
- **`Topic` replaced by `Vertical` + `CaseStudy`:** Vertical = sector/industry (flat, `OVERLAPS_WITH`). CaseStudy = specific investigation or research body.
- **`FundingEvent` as a node, not a relationship property:** Enables traversal queries ("all Series A defence raises in 2024")
- **SourceDocument as a node:** Enables "which ideas came from this transcript?" traversals via `DERIVED_FROM`
- **Methodology gets a graph node; other DNA types don't (yet):** Methodologies are relational by nature. `graphNodeId` fields exist on all DNA schemas for future extension.
- **All 12 SDP ingestion rules carry over:** MERGE not CREATE, canonical register, source+file_ref on every node/edge, natural language descriptions required, UNWIND batching
- **Atomic Lounge as an Organisation node:** `types: ['publication']`. Case files = CaseStudy nodes; interviews = Event nodes `PART_OF → CaseStudy`
- **`CONTRADICTS` relationship is explicit:** Core to Atomic Lounge's three-body framework — narrative vs engineering reality
- **Vertical hierarchy is flat:** Dual-use sectors genuinely overlap; hierarchy would be false precision

## What came up that wasn't planned
- Atomic Lounge brief surfaced node types not in the domain model: Policy, FundingEvent, the three-body structure as a design constraint, `CONTRADICTS` relationship
- SDP project ingestion rules added mid-session — confirmed provenance model, date seeding pattern, canonical register
- GRF-01, GRF-02, SKL-12 were missing from the backlog entirely — added at end of session

## Backlog status changes
- KG-01 description updated (still `planned`)
- GRF-01 added (`planned`)
- GRF-02 added (`planned`)
- SKL-12 added (`planned`)

## What's next
- **M1 — Storage layer** (full scope now in `milestones.md`)
- Recommended first steps:
  1. INF-01 — confirm Vercel rootDirectory = `02-app`
  2. INF-02 → INF-00 — Neon setup, brands root schema
  3. INF-03 → GRF-01 → GRF-02 — FalkorDB connection, seed data, mirror tables
  4. DNA-01 + SRC-01 via SKL-06 + SKL-09

## Context for future sessions
- ADR-002 is the source of truth for the graph schema. KG-01 implementation follows it exactly.
- Seed data (Country, Date nodes) must exist before any graph writes — GRF-01 is a hard prerequisite for all ingestion
- Canonical register in Neon must be created as part of GRF-01 before any entity is written to the graph
- `MERGE` not `CREATE` for all FalkorDB writes
- The `CONTRADICTS` relationship is intentional — don't remove it; it's load-bearing for the Atomic Lounge use case
- All DNA schema files are functionally approved for implementation but `status` frontmatter still says `draft` — treat as approved
- SKL-12 (`kg-ingest-creator`) should be built before INP-03 — the ingestion skill is how scripts get written
