/**
 * Smoke test for the Topic Engine — OUT-02 Phase 2.
 *
 * Run via:
 *   cd 02-app && npx dotenv -e .env.local -- tsx lib/content/__smoke__/topic-engine-smoke.ts
 *
 * Walks the audience cascade end-to-end (categories → segment → aspect →
 * items → resolved chain), then plugs the chain into the assembler against
 * the seeded `instagram-caption` content type to verify Layer 5 lights up.
 *
 * Throws on any failure; exit 1 = topic-engine bug or data drift.
 */

import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contentTypes } from '@/lib/db/schema/content/content-types'
import { promptStages } from '@/lib/db/schema/content/prompt-stages'
import {
  listCategories,
  listChildren,
  resolveChain,
  resolveFreeText,
  type TopicNode,
} from '../topic-engine'
import { assemble } from '@/lib/llm/content/assemble'
import type { GenerationInputs } from '@/lib/llm/content/types'

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

async function main() {
  console.log('═══ STEP 1: list categories ═══')
  const cats = await listCategories(BRAND_ID)
  for (const c of cats) {
    console.log(`  ${c.label}${c.hasData === false ? '  (no data)' : ''}`)
  }
  const audienceCat = cats.find((c) => c.topicPath?.path === 'audience')
  if (!audienceCat) throw new Error('audience category not in listCategories')
  if (audienceCat.hasData === false) throw new Error('audience category gated false but DNA has segments')

  console.log('\n═══ STEP 2: list segments under audience ═══')
  const segments = await listChildren(BRAND_ID, audienceCat.topicPath!.id, {})
  // listChildren returns the .segment row's data items (entity rows from dna_audience_segments).
  // First, expect a single structural child ('audience.segment') that explodes into segment rows.
  const segmentNodes = segments.filter((s) => s.itemId)
  console.log(`  ${segmentNodes.length} segments`)
  for (const s of segmentNodes.slice(0, 5)) {
    console.log(`    - ${s.label}  (id=${s.itemId?.slice(0, 8)}…)`)
  }
  const segment = segmentNodes[0]
  if (!segment?.itemId) throw new Error('No segments returned')

  console.log('\n═══ STEP 3: list aspects under chosen segment ═══')
  // The segment node carries the topic_paths row 'audience.segment' (entity-level).
  // Children of that row are the aspects: problems, desires, objections, beliefs.
  const aspectsParentNode = segment.topicPath!
  const aspects = await listChildren(BRAND_ID, aspectsParentNode.id, { segment_id: segment.itemId })
  for (const a of aspects) {
    console.log(`  ${a.label}  hasData=${a.hasData ?? '(ungated)'}`)
  }
  const problems = aspects.find((a) => a.topicPath?.path === 'audience.segment.problems')
  if (!problems) throw new Error('problems aspect missing')
  if (problems.hasData === false) {
    console.log('\n  (problems gate is false for chosen segment — picking next segment with non-empty problems)')
  }

  // Find a segment whose problems gate passes
  let workingSegment = segment
  let workingAspects = aspects
  if (problems.hasData === false) {
    for (const cand of segmentNodes) {
      const candAspects = await listChildren(BRAND_ID, aspectsParentNode.id, { segment_id: cand.itemId! })
      const candProblems = candAspects.find((a) => a.topicPath?.path === 'audience.segment.problems')
      if (candProblems?.hasData) {
        workingSegment = cand
        workingAspects = candAspects
        console.log(`  switched to segment "${cand.label}"`)
        break
      }
    }
  }

  console.log('\n═══ STEP 4: list items under "problems" aspect ═══')
  const problemsAspect = workingAspects.find((a) => a.topicPath?.path === 'audience.segment.problems')!
  const items = await listChildren(BRAND_ID, problemsAspect.topicPath!.id, { segment_id: workingSegment.itemId! })
  console.log(`  ${items.length} items`)
  for (const it of items.slice(0, 5)) console.log(`    - ${it.label}`)
  if (items.length === 0) throw new Error('No problem items returned despite hasData')

  console.log('\n═══ STEP 5: resolve leaf chain (multi-select first 2 items) ═══')
  const selected = items.slice(0, 2)
  const chain = await resolveChain(
    BRAND_ID,
    'audience.segment.problems.item',
    { segment_id: workingSegment.itemId! },
    selected,
  )
  console.log('  prompt_template_resolved:')
  console.log(`    "${chain.prompt_template_resolved}"`)

  console.log('\n═══ STEP 6: free-text escape hatch ═══')
  const ftChain = await resolveFreeText('how to write better cold emails')
  console.log(`  "${ftChain.prompt_template_resolved}"`)

  console.log('\n═══ STEP 7: feed resolved chain into assembler ═══')
  const [contentType] = await db
    .select()
    .from(contentTypes)
    .where(eq(contentTypes.slug, 'instagram-caption'))
    .limit(1)
  const [stage] = await db
    .select()
    .from(promptStages)
    .where(eq(promptStages.contentTypeId, contentType.id))
    .limit(1)
  const inputs: GenerationInputs = {
    strategy: { audience_segment: workingSegment.itemId!, customer_journey_stage: 'consideration' },
    topic_chain: chain,
    free_text_augments: [],
    settings: {
      variant_count: contentType.defaultVariantCount,
      model_override: null,
      tone_variation: null,
    },
  }
  const result = await assemble({ brandId: BRAND_ID, contentType, stage, inputs })
  console.log(`  assembled OK. final length = ${result.text.length} chars`)
  console.log(`  Layer 5 (topicContext) preview:\n    ${result.layers.topicContext.replace(/\n/g, '\n    ').slice(0, 500)}`)

  console.log('\n✅ Topic engine smoke passed.')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Smoke failed:', err.message)
    if (err.stack) console.error(err.stack)
    process.exit(1)
  })
