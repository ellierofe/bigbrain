---
name: kg-ingest-creator
description: Conversational skill for generating graph ingestion scripts. Receives a data source brief, reviews the file, asks targeted questions, then generates a Node.js script that writes to both FalkorDB and the Neon mirror.
---

# kg-ingest-creator (SKL-12)

Generate a data ingestion script for the BigBrain knowledge graph. This is a conversational process — not a one-shot generation.

## Context

BigBrain maintains a dual-database knowledge graph:
- **FalkorDB** (`bigbrain` graph) — via the `falkordb` npm package. Connection config in `lib/graph/client.ts`.
- **Neon Postgres** — via `@neondatabase/serverless`. Every graph write must also write to `graph_nodes` and `graph_edges` mirror tables.

Every ingestion writes to both databases. FalkorDB is the authority for traversal; Neon is the fast lookup and join layer.

## Pre-conditions

Before using this skill:
- GRF-01 must be complete (seed data: Country nodes, Date nodes, canonical_register)
- GRF-02 must be complete (`graph_nodes`, `graph_edges` tables in Neon)
- ADR-002 must be read — it defines all node labels, relationship types, and required properties

## Universal Rules (ADR-002 / kg-rules)

Before generating any script, read and apply all 12 rules from `04-documentation/reference/kg-rules/SKILL.md`:

1. **No AI inference** — null not estimated. Describe only what the source supports.
2. **Entity resolution before write** — check `canonical_register` in Neon first
3. **Canonical names** — resolve through the register
4. **Date linking** — `ON_DATE`/`IN_MONTH`/`IN_YEAR` to pre-created Date nodes. Never store dates as string properties only.
5. **Source tracking** — `source` + `file_ref` on every node and edge
6. **Natural language description** — required on every node and edge
7. **Deduplication on reruns** — MERGE not CREATE
8. **Validation before batch** — define at least 3 validation queries per ingestion
9. **Self-improvement** — learnings fed back to ingestion scripts and rules
10. **Query provenance** — return traversed nodes/edges, not just answers
11. **Decisions capture** — record in ADRs
12. **Ingestion log** — update `ingestion_log` table in Neon after every run

## Node Labels Available (ADR-002)

**Content/knowledge:** `Idea`, `Concept`, `Mission`, `Vertical`, `Methodology`
**Actors:** `Person`, `Organisation`
**Events/docs:** `Event`, `SourceDocument`, `ContentItem`
**Commercial/policy:** `Project`, `FundingEvent`, `Policy`
**Infrastructure (pre-seeded):** `Country` (247 nodes), `Date` (day/month/year hierarchy, 2010–2030)

Full property definitions and relationship types: `00-project-management/decisions/adr-002-graph-schema.md`

## FalkorDB Node.js Pattern

Connection is via the `falkordb` npm package. Always import from `lib/graph/client.ts`:

```typescript
import { getGraphClient, GRAPH_NAME } from "@/lib/graph/client"

const client = await getGraphClient()
const g = client.selectGraph(GRAPH_NAME)
```

For standalone scripts (`.mjs`), connect directly:

```javascript
import { FalkorDB } from "falkordb"

const client = await FalkorDB.connect({
  username: process.env.FALKORDB_USERNAME,
  password: process.env.FALKORDB_PASSWORD,
  socket: {
    host: process.env.FALKORDB_HOST,
    port: parseInt(process.env.FALKORDB_PORT),
    // NOTE: do NOT set tls: true — FalkorDB Cloud handles TLS at network level.
    // Setting tls: true causes connection timeouts.
  },
})
const g = client.selectGraph("bigbrain")
```

**Critical syntax — params must be wrapped:**
```javascript
// CORRECT
await g.query(`MERGE (n:Idea {id: $id}) SET n.name = $name`, { params: { id, name } })

// WRONG — causes "Missing parameters" error
await g.query(`MERGE (n:Idea {id: $id}) SET n.name = $name`, { id, name })
```

**UNWIND batching — mandatory for all writes (Rule 11):**

Do NOT send one Cypher statement per node/edge. Batch using UNWIND — one query per label/relationship type per batch of 50:

```javascript
// Batch nodes by label
for (const [label, nodes] of Object.entries(nodesByLabel)) {
  for (let i = 0; i < nodes.length; i += 50) {
    const batch = nodes.slice(i, i + 50)
    await g.query(
      `UNWIND $batch AS n
       MERGE (x:${label} {id: n.id})
       ON CREATE SET x.name = n.name, x.description = n.description,
                     x.source = n.source, x.file_ref = n.fileRef,
                     x.createdAt = timestamp()
       ON MATCH SET  x.updatedAt = timestamp()`,
      { params: { batch } }
    )
  }
}

// Batch edges by relationship type
for (const [relType, edges] of Object.entries(edgesByType)) {
  for (let i = 0; i < edges.length; i += 50) {
    const batch = edges.slice(i, i + 50)
    await g.query(
      `UNWIND $batch AS e
       MATCH (a {id: e.fromId})
       MATCH (b {id: e.toId})
       MERGE (a)-[r:${relType}]->(b)
       ON CREATE SET r.description = e.description, r.source = e.source,
                     r.createdAt = timestamp()`,
      { params: { batch } }
    )
  }
}
```

**Reconnect between large batches** — FalkorDB Cloud drops long-idle connections. For scripts writing thousands of nodes, reconnect once per logical batch (e.g. once per year for date-like data, or every 500 nodes for general ingestion). Alternatively, keep queries flowing with no long pauses.

## Neon Mirror Pattern

Every graph write must be mirrored to `graph_nodes` and `graph_edges` in Neon. Use `@neondatabase/serverless`:

```javascript
import { neon } from "@neondatabase/serverless"
const db = neon(process.env.DATABASE_URL)

// Mirror node
await db`
  INSERT INTO graph_nodes (id, label, name, description, source, file_ref, properties)
  VALUES (${nodeId}, ${label}, ${name}, ${description}, ${source}, ${fileRef}, ${properties})
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    properties = EXCLUDED.properties
`

// Mirror edge
await db`
  INSERT INTO graph_edges (from_node_id, to_node_id, relationship_type, description, source, properties)
  VALUES (${fromId}, ${toId}, ${relType}, ${description}, ${source}, ${properties})
  ON CONFLICT DO NOTHING
`
```

## Canonical Register Pattern

Before writing any entity to the graph, check the canonical register:

```javascript
// Load into memory at script start — do NOT query per-row
const register = {}
const rows = await db`SELECT dedup_key, canonical_name, graph_node_id FROM canonical_register`
for (const row of rows) register[row.dedup_key] = row

// Resolve entity
function resolve(entityType, name, dedupKey) {
  if (register[dedupKey]) return register[dedupKey]
  // No match — will need to create new entry
  return null
}

// After writing new node, register it
await db`
  INSERT INTO canonical_register (entity_type, canonical_name, variations, dedup_key, graph_node_id)
  VALUES (${entityType}, ${canonicalName}, ${variations}, ${dedupKey}, ${graphNodeId})
  ON CONFLICT (dedup_key) DO UPDATE SET graph_node_id = EXCLUDED.graph_node_id, updated_at = now()
`
```

## Date Linking Pattern

All temporal data must link to pre-created Date nodes. Never store dates as string properties only:

```javascript
// Full date known
await g.query(
  `MATCH (n {id: $nodeId}), (d:Date {level: 'day', value: $date})
   MERGE (n)-[:ON_DATE {description: $desc, source: $source, createdAt: timestamp()}]->(d)`,
  { params: { nodeId, date: "2026-03-30", desc: "...", source } }
)

// Month only
await g.query(
  `MATCH (n {id: $nodeId}), (m:Date {level: 'month', value: $month})
   MERGE (n)-[:IN_MONTH {description: $desc, source: $source, createdAt: timestamp()}]->(m)`,
  { params: { nodeId, month: "2026-03", desc: "...", source } }
)

// Year only
await g.query(
  `MATCH (n {id: $nodeId}), (y:Date {level: 'year', value: $year})
   MERGE (n)-[:IN_YEAR {description: $desc, source: $source, createdAt: timestamp()}]->(y)`,
  { params: { nodeId, year: "2026", desc: "...", source } }
)
```

---

## Process — Follow These Steps

### Step A: Receive the brief

The user will describe the data source — what it is, what file it contains, what they're trying to get from it. Can be voice-transcribed or typed. Does not need to be structured.

### Step B: Autonomous data review

Read the source file to understand its structure. Report:
- **Shape**: row/record count
- **Fields**: name, type, sample values
- **Null rates**: which fields have significant nulls
- **Date fields**: identify them, report their range
- **Entity candidates**: fields that look like names, IDs, organisations
- **Relationship candidates**: fields that link two entities
- **Dedup key candidates**: unique IDs, reference codes, or field combinations

### Step C: Ask smart questions

Based on what you found, ask targeted questions — not a generic template. Categories to consider:

**Entity mapping:**
- Which fields become which node labels?
- Are there entities that already exist in the graph from other sources?

**Relationship mapping:**
- What edges should be created, between which node types?
- What properties should edges carry?

**Entity resolution:**
- Which dedup keys are available?
- For entities without formal IDs, what field combination makes them unique?

**Date handling:**
- Which date fields should trigger date linking?
- Are there dates outside the pre-seeded range (before 2010 or after 2030)?
- What granularity — day, month, or year?

**Scope:**
- Should all rows be ingested, or a subset?
- Are there rows representing different entity types in the same field?

**Validation:**
- What questions should this data answer once ingested?
- What counts or totals can be checked against known values?

Ask 5–8 focused questions. Wait for answers before proceeding.

### Step D: Iterate if needed

Continue until you have clear answers on:
- [ ] Node labels to create, from which fields, with which properties
- [ ] Edges to create, with which properties
- [ ] Entity resolution strategy per entity type
- [ ] Date linking strategy
- [ ] Validation queries (at least 3)

### Step E: Generate the ingestion script

Create a `.mjs` script at `02-app/lib/graph/ingest/ingest-[source]-[datatype].mjs`.

The script must follow this order:

1. **Load env** — read `.env.local` manually (scripts run outside Next.js)
2. **Connect** to FalkorDB and Neon
3. **Pre-load canonical register** into memory — one query, into a dict keyed by `dedup_key`. All entity resolution happens in-memory, NOT per-row queries.
4. **Read and process source data** in memory — resolve entities, accumulate node/edge batches, track new canonical entries
5. **Batch write to Neon** — new canonical register entries first, then `graph_nodes`, then `graph_edges`
6. **Batch write to FalkorDB** — UNWIND batches of 50, nodes before edges, MERGE throughout
7. **Date linking** — MERGE relationships to Date nodes
8. **Log the run** — INSERT into `ingestion_log` table
9. **Run validation queries** — report results with node/edge provenance

### Step F: Dry run

Run on a sample (first 50–100 rows) and report:
- Node counts by label
- Edge counts by type
- Entity resolution hit rate
- Any warnings or issues
- Sample nodes with descriptions

### Step G: Validation queries

Run at least 3 queries the data should be able to answer. For each:
- Show the Cypher query
- Show the result
- Show which nodes/edges were traversed
- Flag any unexpected results

### Step H: Self-improvement check

After the dry run:
1. Did entity resolution work correctly?
2. Are descriptions accurate and useful?
3. Are there patterns to add to the canonical register?
4. Any improvements to these rules or this skill?

Propose specific changes only if material. Record decisions in an ADR if they meet the bar.

### Step I: Full ingest

Once dry run is validated, run on the complete dataset. Report:
- Total nodes/edges created vs skipped (MERGE dedup)
- Any errors
- Final entity resolution stats
- Execution time

### Step J: Neon sync verification

Confirm after full ingest:
- `graph_nodes` has all new nodes
- `graph_edges` has all new edges
- `canonical_register` has any new entries
- `ingestion_log` has a completed entry

### Step K: Self-improvement (repeat)

Same as Step H — reassess after full run. Anything that only becomes visible at scale.
