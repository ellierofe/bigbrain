# Graph Write API Brief
Feature ID: KG-01 + KG-02 (combined)
Status: complete
Last updated: 2026-04-01

## Summary
Build the graph write API: TypeScript functions for creating nodes and edges in FalkorDB, with automatic dual-write to the Neon `graph_nodes` / `graph_edges` mirror tables, canonical register management for actor-type nodes, and strict enforcement of ADR-002 ingestion rules at the type level. This is the layer INP-03 calls to persist extracted knowledge — without it, ingestion has nowhere to write. Read, traversal, and search functions are explicitly out of scope for this iteration and will follow once there is data to query.

## Use cases
- INP-03 (input processing pipeline) calls `writeNode()` and `writeEdge()` to persist extracted Ideas, Concepts, SourceDocuments, Persons, Organisations, etc.
- INP-03 calls `resolveCanonical()` before writing Person/Organisation/Project nodes to prevent duplicates
- Seed scripts (GRF-01) can be retrofitted to use these functions to backfill the Neon mirror for existing FalkorDB seed data
- Any future ingestion script follows the same write pattern — one place, one set of rules

## User journey
No user-facing journey. Backend API only.

Deliverables:
1. `lib/graph/types.ts` — shared TypeScript types for all node/edge inputs
2. `lib/graph/write.ts` — `writeNode()`, `writeEdge()`, `writeBatch()`
3. `lib/graph/canonical.ts` — `resolveCanonical()`, `registerCanonical()`
4. `lib/graph/index.ts` — clean re-exports

## Data model / fields

### Node input type

All fields required at compile time unless marked optional:

```ts
interface NodeInput {
  id: string              // caller-generated uuid — consistent across FalkorDB + Neon mirror
  label: NodeLabel        // union type of all valid labels from ADR-002
  name: string            // canonical name (resolved via register for actor types)
  description: string     // required — no AI inference, describe only what source supports
  source: string          // e.g. 'AL_TRANSCRIPT', 'CLIENT_DOC', 'MANUAL', 'SEED_ISO3166'
  fileRef?: string        // reference to specific file/input if applicable
  properties?: Record<string, unknown>  // label-specific fields (see ADR-002 §3)
}
```

### Edge input type

```ts
interface EdgeInput {
  fromNodeId: string
  toNodeId: string
  relationshipType: RelationshipType   // union type of all valid relationship types from ADR-002
  description: string                  // required — describe this specific relationship
  source: string
  properties?: Record<string, unknown>
}
```

### `NodeLabel` union type
All 14 labels from ADR-002:
`Idea` | `Concept` | `Mission` | `Vertical` | `Methodology` | `Person` | `Organisation` | `Event` | `SourceDocument` | `ContentItem` | `Project` | `FundingEvent` | `Policy` | `Country` | `Date`

### `RelationshipType` union type
All relationship types from ADR-002:
`DERIVED_FROM` | `PART_OF` | `INFORMED_BY` | `PRODUCED_BY` | `BELONGS_TO` | `OVERLAPS_WITH` | `SUPPORTS` | `CONTRADICTS` | `RELATES_TO` | `ON_DATE` | `IN_MONTH` | `IN_YEAR` | `MENTIONS` | `INTERVIEWED_IN` | `EMPLOYS` | `ADVISES` | `FUNDS` | `RAISED` | `LOCATED_IN` | `CONCERNS` | `SCOPED_TO` | `GENERATED`

### Canonical register

Auto-registration applies to: `Person`, `Organisation`, `Project` only.

`resolveCanonical(entityType, name)` — looks up `canonical_register` by `dedupKey` (derived from type + normalised name). Returns existing `graphNodeId` if found, or null if not registered.

`registerCanonical(entityType, canonicalName, graphNodeId, variations?)` — inserts a new register entry. Called automatically by `writeNode()` for actor types after a successful FalkorDB write.

`dedupKey` format: `{entityType_lowercase}:{slugified_canonical_name}` — e.g. `person:ellie-rofe`, `organisation:nicelyput`.

## Update behaviour

Nodes: **MERGE not CREATE** — FalkorDB write uses `MERGE` on `id`. If the node already exists, properties are updated in place. Neon mirror uses `INSERT ... ON CONFLICT (id) DO UPDATE`.

Edges: **MERGE not CREATE** — FalkorDB write uses `MERGE` on `(fromNodeId, toNodeId, relationshipType)`. Neon mirror uses `INSERT ... ON CONFLICT DO NOTHING` (edges are immutable once created; if the same relationship is written twice, the second write is a no-op).

## Relationships
### Knowledge graph (FalkorDB)
This feature IS the graph write layer. Writes nodes and edges directly to the `bigbrain` graph.

### Postgres
- `graph_nodes` — mirror row written on every `writeNode()` call
- `graph_edges` — mirror row written on every `writeEdge()` call
- `canonical_register` — read and written by `resolveCanonical()` / `registerCanonical()`

## UI/UX notes
No UI — layout spec not applicable.

## Edge cases
- **Node already exists (MERGE):** Properties updated, no duplicate created. Mirror row upserted.
- **Edge already exists (MERGE):** FalkorDB silently merges. Neon mirror insert is a no-op. No error.
- **`fromNodeId` or `toNodeId` not yet in FalkorDB:** FalkorDB will create a stub node. Callers must write both nodes before writing the edge — `writeNode()` should be called for both ends first. `writeEdge()` does not validate that nodes exist (FalkorDB is authoritative).
- **Neon mirror write fails after successful FalkorDB write:** Log the error and continue — FalkorDB is authoritative. The mirror can be backfilled. Do not roll back the FalkorDB write. Surface the failure in the caller's error log.
- **Canonical register miss for actor type:** Caller receives `null` from `resolveCanonical()` and must decide whether to create a new node or flag for manual review. `writeNode()` does not auto-create nodes on a register miss — that's INP-03's decision.
- **Batch write partial failure:** `writeBatch()` applies nodes then edges in order. If a statement fails, log the failure and continue with the remaining batch — do not abort. Return a result object with success/failure counts.
- **`description` empty string:** Treat as a missing description — throw at runtime in addition to compile-time type enforcement (belt and braces, since `""` satisfies `string`).

## Out of scope
- **Read / traversal / search functions** — `findConnections()`, `traverseFrom()`, `searchByTopic()` are explicitly deferred. These belong in a KG-02 follow-up pass once there is real data to query against. The backlog entry for KG-02 should be updated to reflect this split.
- Batch job infrastructure / queue — `writeBatch()` is a synchronous helper for writing arrays of nodes/edges in one go, not an async job system
- Graph schema migration / constraint management — FalkorDB is schema-less; ADR-002 structure is enforced by the TypeScript types, not the DB
- Graph visualisation — KG-03
- Embedding on `graph_nodes` — deferred to KG-02 follow-up (noted in VEC-01 brief)
- Backfilling seed data into Neon mirror — that's a separate seed script update, not part of this feature

## Open questions / TBDs
None — all decisions made in briefing.

## Decisions log
- 2026-04-01: Brief approved. KG-01 + KG-02 combined. Build complete — `lib/graph/types.ts`, `lib/graph/canonical.ts`, `lib/graph/write.ts`, `lib/graph/index.ts` created. TypeScript clean. — FalkorDB is schema-less so the "schema" is enforced by TypeScript types, not a DB migration step. Write API only in this iteration; read/traversal explicitly deferred. Canonical register auto-registration for Person/Organisation/Project only. `description` required at compile time (string, not optional) plus runtime empty-string check. MERGE throughout for idempotency.
