/**
 * Smoke test for the generation_runs sweep — OUT-02 Phase 2.
 *
 * Run via:
 *   cd 02-app && npx dotenv -e .env.local -- tsx lib/db/__smoke__/sweep-generation-runs-smoke.ts
 *
 * Inserts three test rows into generation_runs:
 *   1. expired + kept=false → must be deleted
 *   2. expired + kept=true  → must survive (pinned to library)
 *   3. fresh   + kept=false → must survive (still within 30-day TTL)
 *
 * Runs the same DELETE the cron route runs, then verifies exactly the right
 * rows were touched. Cleans up survivors at the end.
 */

import { and, eq, inArray, lt, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contentTypes } from '@/lib/db/schema/content/content-types'
import { generationRuns } from '@/lib/db/schema/content/generation-runs'
import { promptStages } from '@/lib/db/schema/content/prompt-stages'

async function main() {
  console.log('Picking a real content_type + stage to satisfy FKs…')
  const [ct] = await db.select().from(contentTypes).where(eq(contentTypes.slug, 'instagram-caption')).limit(1)
  if (!ct) throw new Error('instagram-caption seed missing — run db:seed:out02-content-types first')
  const [stage] = await db.select().from(promptStages).where(eq(promptStages.contentTypeId, ct.id)).limit(1)
  if (!stage) throw new Error('No stage for instagram-caption')

  const past = new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day from now

  console.log('Inserting 3 test rows…')
  const inserted = await db
    .insert(generationRuns)
    .values([
      {
        contentTypeId: ct.id,
        stageId: stage.id,
        status: 'complete',
        inputs: { __smoke__: 'expired_unkept' },
        kept: false,
        expiresAt: past,
      },
      {
        contentTypeId: ct.id,
        stageId: stage.id,
        status: 'complete',
        inputs: { __smoke__: 'expired_kept' },
        kept: true,
        expiresAt: past,
      },
      {
        contentTypeId: ct.id,
        stageId: stage.id,
        status: 'complete',
        inputs: { __smoke__: 'fresh_unkept' },
        kept: false,
        expiresAt: future,
      },
    ])
    .returning({ id: generationRuns.id, kept: generationRuns.kept, expiresAt: generationRuns.expiresAt })

  const ids = inserted.map((r) => r.id)
  console.log(`  inserted ids: ${ids.map((i) => i.slice(0, 8)).join(', ')}…`)

  console.log('\nRunning the same DELETE the cron route runs…')
  const deleted = await db
    .delete(generationRuns)
    .where(and(lt(generationRuns.expiresAt, sql`now()`), eq(generationRuns.kept, false)))
    .returning({ id: generationRuns.id })
  console.log(`  deleted ${deleted.length} row(s)`)

  // Verify the right rows got hit
  const survivors = await db
    .select({ id: generationRuns.id, inputs: generationRuns.inputs })
    .from(generationRuns)
    .where(inArray(generationRuns.id, ids))

  const survivorLabels = survivors.map((s) => (s.inputs as { __smoke__: string }).__smoke__).sort()
  const expected = ['expired_kept', 'fresh_unkept'].sort()
  const ok = JSON.stringify(survivorLabels) === JSON.stringify(expected)

  console.log('\nSurvivors:')
  for (const s of survivors) console.log(`  - ${(s.inputs as { __smoke__: string }).__smoke__}`)

  // Clean up survivors so we don't pollute the DB
  console.log('\nCleaning up survivors…')
  await db
    .delete(generationRuns)
    .where(inArray(generationRuns.id, survivors.map((s) => s.id)))

  if (!ok) {
    console.error(`\n❌ Wrong survivor set. Expected: ${expected.join(',')}; got: ${survivorLabels.join(',')}`)
    process.exit(1)
  }
  console.log('\n✅ Sweep behaviour correct.')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Smoke failed:', err.message)
    if (err.stack) console.error(err.stack)
    process.exit(1)
  })
