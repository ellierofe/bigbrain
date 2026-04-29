/**
 * OUT-02 Phase 3 — seed prompt_fragments from legacy CSV.
 *
 * Run via:
 *   cd 02-app && npx dotenv -e .env.local -- tsx lib/db/seed/seed-out02-fragments.ts
 *
 * Idempotent: upserts on (slug, version) — re-running with edits to
 * out02-fragments-data.ts will update existing rows in place. To bump a
 * fragment's version (per the append-only versioning rule in the schema doc),
 * edit the data file to add a new row with the same slug and version=2.
 */

import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { promptFragments } from '@/lib/db/schema/content/prompt-fragments'
import { out02FragmentSeeds } from './out02-fragments-data'

async function main() {
  console.log(`Seeding ${out02FragmentSeeds.length} prompt fragments…`)

  const result = await db
    .insert(promptFragments)
    .values(out02FragmentSeeds)
    .onConflictDoUpdate({
      target: [promptFragments.slug, promptFragments.version],
      set: {
        kind: sql`excluded.kind`,
        name: sql`excluded.name`,
        purpose: sql`excluded.purpose`,
        usage: sql`excluded.usage`,
        content: sql`excluded.content`,
        placeholders: sql`excluded.placeholders`,
        status: sql`excluded.status`,
        notes: sql`excluded.notes`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ slug: promptFragments.slug, kind: promptFragments.kind })

  const byKind = result.reduce<Record<string, number>>((acc, r) => {
    acc[r.kind] = (acc[r.kind] ?? 0) + 1
    return acc
  }, {})

  console.log(`Done. ${result.length} rows upserted:`)
  for (const [kind, count] of Object.entries(byKind).sort()) {
    console.log(`  ${kind}: ${count}`)
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
