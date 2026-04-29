/**
 * OUT-02 Phase 3 — seed topic_paths (V1 cascade catalogue).
 *
 * Run via:
 *   cd 02-app && npm run db:seed:out02-topic-paths
 *
 * Two-pass insert because parent_id requires the parent's UUID:
 *   Pass 1 — upsert all rows with parent_id=null. Captures path→id map.
 *   Pass 2 — for rows with a parentPath, UPDATE parent_id from the map.
 *
 * Idempotent: upserts on `path` (unique).
 */

import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { topicPaths } from '@/lib/db/schema/content/topic-paths'
import { out02TopicPathSeeds } from './out02-topic-paths-data'

async function main() {
  console.log(`Seeding ${out02TopicPathSeeds.length} topic_paths rows…`)

  // -------------------------------------------------------------------------
  // Pass 1: upsert each row with parent_id=null. Path is the natural key.
  // -------------------------------------------------------------------------
  for (const seed of out02TopicPathSeeds) {
    await db
      .insert(topicPaths)
      .values({
        path: seed.path,
        parentId: null,
        stepLevel: seed.stepLevel,
        category: seed.category,
        label: seed.label,
        surfaceKind: seed.surfaceKind,
        dataQuery: seed.dataQuery,
        hasDataCheck: seed.hasDataCheck,
        multiSelect: seed.multiSelect,
        promptTemplate: seed.promptTemplate,
        displayOrder: seed.displayOrder,
        status: seed.status,
        notes: seed.notes,
      })
      .onConflictDoUpdate({
        target: topicPaths.path,
        set: {
          stepLevel: sql`excluded.step_level`,
          category: sql`excluded.category`,
          label: sql`excluded.label`,
          surfaceKind: sql`excluded.surface_kind`,
          dataQuery: sql`excluded.data_query`,
          hasDataCheck: sql`excluded.has_data_check`,
          multiSelect: sql`excluded.multi_select`,
          promptTemplate: sql`excluded.prompt_template`,
          displayOrder: sql`excluded.display_order`,
          status: sql`excluded.status`,
          notes: sql`excluded.notes`,
          updatedAt: sql`now()`,
          // parentId left untouched in pass 1 — set in pass 2
        },
      })
  }

  // -------------------------------------------------------------------------
  // Build path → id map (now that all rows exist).
  // -------------------------------------------------------------------------
  const all = await db
    .select({ id: topicPaths.id, path: topicPaths.path })
    .from(topicPaths)

  const idByPath = new Map(all.map((r) => [r.path, r.id]))

  // -------------------------------------------------------------------------
  // Pass 2: set parent_id on every row whose seed has a parentPath.
  // -------------------------------------------------------------------------
  let parentLinks = 0
  for (const seed of out02TopicPathSeeds) {
    if (!seed.parentPath) continue
    const parentId = idByPath.get(seed.parentPath)
    if (!parentId) {
      throw new Error(`Parent path not found for ${seed.path}: ${seed.parentPath}`)
    }
    await db
      .update(topicPaths)
      .set({ parentId, updatedAt: new Date() })
      .where(eq(topicPaths.path, seed.path))
    parentLinks++
  }

  console.log(`Done. ${out02TopicPathSeeds.length} rows upserted, ${parentLinks} parent links set.`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
