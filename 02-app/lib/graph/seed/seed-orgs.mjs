/**
 * GRF-01: Seed founding Organisation nodes
 * - Atomic Lounge (Ellie's publication)
 * Uses MERGE — safe to rerun.
 */

import { readFileSync } from "fs"
import { FalkorDB } from "falkordb"
import { neon } from "@neondatabase/serverless"

// Load env
const env = readFileSync(new URL("../../../.env.local", import.meta.url), "utf8")
for (const line of env.split("\n")) {
  const match = line.match(/^([A-Z_]+)=(.+)$/)
  if (match) process.env[match[1]] = match[2].trim()
}

const ORGS = [
  {
    name: "Atomic Lounge",
    types: ["publication"],
    country: "GB",
    description: "Atomic Lounge is Ellie Rofe's publication covering hard tech, defence, energy, and the structural forces reshaping the industrial economy. Based in the United Kingdom.",
    dedupKey: "org:atomic-lounge",
    source: "SEED_ORGS",
  },
  {
    name: "NicelyPut",
    types: ["consultancy"],
    country: "GB",
    description: "NicelyPut is Ellie Rofe's strategy and content consultancy, specialising in complex B2B sectors including hard tech, defence, and industrial markets. Based in the United Kingdom.",
    dedupKey: "org:nicelyput",
    source: "SEED_ORGS",
  },
]

async function main() {
  const db = neon(process.env.DATABASE_URL)
  const graph = await FalkorDB.connect({
    username: process.env.FALKORDB_USERNAME,
    password: process.env.FALKORDB_PASSWORD,
    socket: {
      host: process.env.FALKORDB_HOST,
      port: parseInt(process.env.FALKORDB_PORT),
    },
  })
  const g = graph.selectGraph("bigbrain")

  for (const org of ORGS) {
    const result = await g.query(
      `MERGE (o:Organisation {name: $name})
       ON CREATE SET
         o.id = randomUUID(),
         o.types = $types,
         o.country = $country,
         o.description = $description,
         o.source = $source,
         o.file_ref = 'seed-orgs.mjs',
         o.createdAt = timestamp(),
         o.updatedAt = timestamp()
       ON MATCH SET
         o.updatedAt = timestamp()
       RETURN o.id AS nodeId`,
      { params: { name: org.name, types: org.types, country: org.country, description: org.description, source: org.source } }
    )

    const nodeId = result.data?.[0]?.nodeId

    await db`
      INSERT INTO canonical_register (entity_type, canonical_name, variations, dedup_key, graph_node_id)
      VALUES ('Organisation', ${org.name}, ${[org.name]}, ${org.dedupKey}, ${nodeId ?? null})
      ON CONFLICT (dedup_key) DO UPDATE SET
        graph_node_id = EXCLUDED.graph_node_id,
        updated_at = now()
    `

    console.log(`Seeded: ${org.name} (nodeId: ${nodeId})`)
  }

  await graph.close()
  console.log("Done.")
}

main().catch(err => { console.error(err); process.exit(1) })
