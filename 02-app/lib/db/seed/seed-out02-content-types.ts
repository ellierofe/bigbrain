/**
 * OUT-02 Phase 3 — seed content_types + prompt_stages + new fragments.
 *
 * Run via:
 *   cd 02-app && npm run db:seed:out02-content-types
 *
 * Idempotent. Three steps:
 *   1. Upsert 4 new fragments (persona × 2, worldview × 2) by (slug, version=1).
 *   2. Resolve all fragment slugs (legacy + new) to UUIDs.
 *   3. Upsert 3 content_types by slug, then upsert each one's stage_order=1
 *      prompt_stages row by (content_type_id, stage_order).
 *
 * Pre-req: legacy fragments must be seeded first via `db:seed:out02-fragments`.
 */

import { eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contentTypes } from '@/lib/db/schema/content/content-types'
import { promptFragments } from '@/lib/db/schema/content/prompt-fragments'
import { promptStages } from '@/lib/db/schema/content/prompt-stages'
import { out02ContentTypeSeeds, out02NewFragmentSeeds } from './out02-content-types-data'

async function main() {
  // ------------------------------------------------------------------------
  // Step 1: upsert new fragments
  // ------------------------------------------------------------------------
  console.log(`Seeding ${out02NewFragmentSeeds.length} new fragments (personas + worldviews)…`)

  await db
    .insert(promptFragments)
    .values(out02NewFragmentSeeds)
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

  // ------------------------------------------------------------------------
  // Step 2: build slug → id map for fragment resolution
  //
  // A slug can have multiple rows (one per version). Stages reference fragments
  // by slug — always resolve to the latest ACTIVE version. Archived rows are
  // skipped so historical pins do not leak into new stage rows.
  // ------------------------------------------------------------------------
  const allFragments = await db
    .select({
      id: promptFragments.id,
      slug: promptFragments.slug,
      version: promptFragments.version,
      status: promptFragments.status,
    })
    .from(promptFragments)

  const fragmentIdBySlug = new Map<string, string>()
  for (const f of allFragments) {
    if (f.status !== 'active') continue
    const existing = fragmentIdBySlug.get(f.slug)
    if (!existing) {
      fragmentIdBySlug.set(f.slug, f.id)
      continue
    }
    // Prefer higher version among active rows
    const existingVersion = allFragments.find((x) => x.id === existing)?.version ?? 0
    if (f.version > existingVersion) fragmentIdBySlug.set(f.slug, f.id)
  }

  function resolve(slug: string): string {
    const id = fragmentIdBySlug.get(slug)
    if (!id) throw new Error(`Fragment not found: ${slug}`)
    return id
  }

  // ------------------------------------------------------------------------
  // Step 3: upsert content_types and their stages
  // ------------------------------------------------------------------------
  console.log(`Seeding ${out02ContentTypeSeeds.length} content_types + their stages…`)

  for (const { contentType, stage } of out02ContentTypeSeeds) {
    // Upsert the content_type row
    await db
      .insert(contentTypes)
      .values(contentType)
      .onConflictDoUpdate({
        target: contentTypes.slug,
        set: {
          name: sql`excluded.name`,
          description: sql`excluded.description`,
          icon: sql`excluded.icon`,
          pickerGroup: sql`excluded.picker_group`,
          platformType: sql`excluded.platform_type`,
          formatType: sql`excluded.format_type`,
          subtype: sql`excluded.subtype`,
          isMultiStep: sql`excluded.is_multi_step`,
          prerequisites: sql`excluded.prerequisites`,
          defaultVariantCount: sql`excluded.default_variant_count`,
          defaultMinChars: sql`excluded.default_min_chars`,
          defaultMaxChars: sql`excluded.default_max_chars`,
          topicBarEnabled: sql`excluded.topic_bar_enabled`,
          strategyFields: sql`excluded.strategy_fields`,
          topicContextConfig: sql`excluded.topic_context_config`,
          seo: sql`excluded.seo`,
          customerJourneyStage: sql`excluded.customer_journey_stage`,
          timeSavedMinutes: sql`excluded.time_saved_minutes`,
          status: sql`excluded.status`,
          notes: sql`excluded.notes`,
          updatedAt: sql`now()`,
        },
      })

    // Look up the content_type id we just upserted
    const [{ id: contentTypeId }] = await db
      .select({ id: contentTypes.id })
      .from(contentTypes)
      .where(eq(contentTypes.slug, contentType.slug))

    // Upsert the stage row
    await db
      .insert(promptStages)
      .values({
        contentTypeId,
        stageOrder: stage.stageOrder,
        stageKind: stage.stageKind,
        personaFragmentId: resolve(stage.personaFragmentSlug),
        worldviewFragmentId: stage.worldviewFragmentSlug ? resolve(stage.worldviewFragmentSlug) : null,
        taskFraming: stage.taskFraming,
        structuralSkeleton: stage.structuralSkeleton,
        craftFragmentConfig: stage.craftFragmentConfig,
        outputContractFragmentId: resolve(stage.outputContractFragmentSlug),
        outputContractExtras: stage.outputContractExtras,
        defaultModel: stage.defaultModel,
        minTokens: stage.minTokens,
        maxTokens: stage.maxTokens,
        notes: stage.notes,
      })
      .onConflictDoUpdate({
        target: [promptStages.contentTypeId, promptStages.stageOrder],
        set: {
          stageKind: sql`excluded.stage_kind`,
          personaFragmentId: sql`excluded.persona_fragment_id`,
          worldviewFragmentId: sql`excluded.worldview_fragment_id`,
          taskFraming: sql`excluded.task_framing`,
          structuralSkeleton: sql`excluded.structural_skeleton`,
          craftFragmentConfig: sql`excluded.craft_fragment_config`,
          outputContractFragmentId: sql`excluded.output_contract_fragment_id`,
          outputContractExtras: sql`excluded.output_contract_extras`,
          defaultModel: sql`excluded.default_model`,
          minTokens: sql`excluded.min_tokens`,
          maxTokens: sql`excluded.max_tokens`,
          notes: sql`excluded.notes`,
          updatedAt: sql`now()`,
        },
      })

    console.log(`  ✓ ${contentType.slug} (+ stage 1)`)
  }

  console.log('Done.')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
