/**
 * GRF-01: Seed Date nodes
 * Year/Month/Day hierarchy from 2010 to 2030 into FalkorDB.
 * Uses MERGE — safe to rerun.
 * Day nodes link to their month; month nodes link to their year.
 */

import { readFileSync } from "fs"
import { FalkorDB } from "falkordb"

// Load env
const env = readFileSync(new URL("../../../.env.local", import.meta.url), "utf8")
for (const line of env.split("\n")) {
  const match = line.match(/^([A-Z_]+)=(.+)$/)
  if (match) process.env[match[1]] = match[2].trim()
}

const START_YEAR = 2010
const END_YEAR = 2030

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
]

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

async function main() {
  const graph = await FalkorDB.connect({
    username: process.env.FALKORDB_USERNAME,
    password: process.env.FALKORDB_PASSWORD,
    socket: {
      host: process.env.FALKORDB_HOST,
      port: parseInt(process.env.FALKORDB_PORT),
    },
  })
  const g = graph.selectGraph("bigbrain")

  console.log(`Seeding Date nodes ${START_YEAR}–${END_YEAR}...`)

  // Seed year nodes
  for (let year = START_YEAR; year <= END_YEAR; year++) {
    await g.query(
      `MERGE (y:Date {level: 'year', value: $value})
       ON CREATE SET
         y.id = randomUUID(),
         y.name = $value,
         y.description = $description,
         y.source = 'SEED_DATES',
         y.file_ref = 'seed-dates.mjs',
         y.createdAt = timestamp(),
         y.updatedAt = timestamp()
       ON MATCH SET y.updatedAt = timestamp()`,
      { params: { value: String(year), description: `Calendar year ${year}.` } }
    )
  }
  console.log(`  Year nodes done.`)

  // Seed month nodes + IN_YEAR edges
  for (let year = START_YEAR; year <= END_YEAR; year++) {
    for (let month = 1; month <= 12; month++) {
      const value = `${year}-${String(month).padStart(2, "0")}`
      const monthName = MONTH_NAMES[month - 1]
      await g.query(
        `MERGE (m:Date {level: 'month', value: $value})
         ON CREATE SET
           m.id = randomUUID(),
           m.name = $value,
           m.description = $description,
           m.source = 'SEED_DATES',
           m.file_ref = 'seed-dates.mjs',
           m.createdAt = timestamp(),
           m.updatedAt = timestamp()
         ON MATCH SET m.updatedAt = timestamp()
         WITH m
         MATCH (y:Date {level: 'year', value: $year})
         MERGE (m)-[:IN_YEAR {description: $edgeDesc, source: 'SEED_DATES', createdAt: timestamp()}]->(y)`,
        { params: {
          value,
          year: String(year),
          description: `${monthName} ${year}.`,
          edgeDesc: `${value} belongs to year ${year}.`,
        }}
      )
    }
    if ((year - START_YEAR) % 5 === 0) console.log(`  Month nodes: up to ${year}...`)
  }
  console.log(`  Month nodes done.`)

  await graph.close()

  // Seed day nodes + IN_MONTH edges — one UNWIND query per month (batch of days)
  let dayCount = 0
  for (let year = START_YEAR; year <= END_YEAR; year++) {
    const yearGraph = await FalkorDB.connect({
      username: process.env.FALKORDB_USERNAME,
      password: process.env.FALKORDB_PASSWORD,
      socket: { host: process.env.FALKORDB_HOST, port: parseInt(process.env.FALKORDB_PORT) },
    })
    const yg = yearGraph.selectGraph("bigbrain")

    for (let month = 1; month <= 12; month++) {
      const monthValue = `${year}-${String(month).padStart(2, "0")}`
      const monthName = MONTH_NAMES[month - 1]
      const days = daysInMonth(year, month)

      // Build batch of day objects for UNWIND
      const dayBatch = []
      for (let day = 1; day <= days; day++) {
        const value = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
        dayBatch.push({
          value,
          description: `${day} ${monthName} ${year}.`,
          edgeDesc: `${value} belongs to month ${monthValue}.`,
        })
      }

      await yg.query(
        `UNWIND $days AS d
         MERGE (node:Date {level: 'day', value: d.value})
         ON CREATE SET
           node.id = randomUUID(),
           node.name = d.value,
           node.description = d.description,
           node.source = 'SEED_DATES',
           node.file_ref = 'seed-dates.mjs',
           node.createdAt = timestamp(),
           node.updatedAt = timestamp()
         ON MATCH SET node.updatedAt = timestamp()
         WITH node, d
         MATCH (m:Date {level: 'month', value: $monthValue})
         MERGE (node)-[:IN_MONTH {description: d.edgeDesc, source: 'SEED_DATES', createdAt: timestamp()}]->(m)`,
        { params: { days: dayBatch, monthValue } }
      )
      dayCount += days
    }

    await yearGraph.close()
    console.log(`  Day nodes: ${year} done (${dayCount} total)`)
  }

  console.log(`Done. Total day nodes: ${dayCount}`)
}

main().catch(err => { console.error(err); process.exit(1) })
