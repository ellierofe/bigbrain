/**
 * Smoke test for the eight-layer assembler — OUT-02 Phase 2.
 *
 * Run via:
 *   cd 02-app && npx dotenv -e .env.local -- tsx lib/llm/content/__smoke__/assemble-smoke.ts
 *
 * Picks a seeded V1 content type (default: instagram-caption), builds a
 * minimal GenerationInputs with a real audience_segment id from DNA, and
 * runs the assembler end-to-end. Prints the final prompt + fragment-version
 * map. Throws on any failure — exit code 1 = drift/missing-data/bug.
 *
 * This is not a unit test framework — it's a one-shot integration smoke. Adapt
 * BRAND_ID / segment id below if the seed data shifts.
 */

import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { contentTypes } from '@/lib/db/schema/content/content-types'
import { promptStages } from '@/lib/db/schema/content/prompt-stages'
import { dnaAudienceSegments } from '@/lib/db/schema/dna/audience-segments'
import { dnaPlatforms } from '@/lib/db/schema/dna/platforms'
import { assemble } from '../assemble'
import type { GenerationInputs, StrategyFields } from '../types'

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'
const CONTENT_TYPE_SLUG = process.argv[2] ?? 'instagram-caption'

async function main() {
  console.log(`Smoke-testing assembler with content_type="${CONTENT_TYPE_SLUG}"…\n`)

  // 1. Load content type + its stage 1
  const [contentType] = await db
    .select()
    .from(contentTypes)
    .where(eq(contentTypes.slug, CONTENT_TYPE_SLUG))
    .limit(1)
  if (!contentType) throw new Error(`Content type not found: ${CONTENT_TYPE_SLUG}`)

  const [stage] = await db
    .select()
    .from(promptStages)
    .where(eq(promptStages.contentTypeId, contentType.id))
    .limit(1)
  if (!stage) throw new Error(`No stage 1 for content_type ${CONTENT_TYPE_SLUG}`)

  // 2. Pick a real audience segment with non-empty VOC arrays for this brand
  const [segment] = await db
    .select()
    .from(dnaAudienceSegments)
    .where(eq(dnaAudienceSegments.brandId, BRAND_ID))
    .limit(1)
  if (!segment) throw new Error('No audience_segments for current brand')

  // 3. Build the strategy answers. Look at strategy_fields on the content
  // type and only set what's declared (so we exercise the real selection
  // contract). Fields beyond V1 vocabulary are ignored by the assembler.
  const strategyFields = (contentType.strategyFields as StrategyFields) ?? []
  const strategy: Record<string, string | null> = {}
  for (const f of strategyFields) {
    if (f.id === 'audience_segment') {
      strategy.audience_segment = segment.id
    } else if (f.id === 'customer_journey_stage') {
      strategy.customer_journey_stage = 'consideration'
    } else if ((f.id as string) === 'platform') {
      const [platform] = await db
        .select()
        .from(dnaPlatforms)
        .where(eq(dnaPlatforms.brandId, BRAND_ID))
        .limit(1)
      if (!platform) throw new Error('No dna_platforms for current brand — required by this content type')
      strategy.platform = platform.id
    }
  }

  const inputs: GenerationInputs = {
    strategy,
    topic_chain: {
      category: 'audience',
      step1: 'segment',
      step2: segment.id,
      step3: ['problems'],
      prompt_template_resolved: `the problems faced by ${segment.segmentName}`,
    },
    free_text_augments: [],
    settings: {
      variant_count: contentType.defaultVariantCount,
      model_override: null,
      tone_variation: null,
    },
  }

  // 4. Assemble
  const result = await assemble({ brandId: BRAND_ID, contentType, stage, inputs })

  console.log('═══ FINAL PROMPT ═══\n')
  console.log(result.text)
  console.log('\n═══ FRAGMENT VERSIONS ═══\n')
  console.log(JSON.stringify(result.fragmentVersions, null, 2))
  console.log('\n═══ LAYER BREAKDOWN ═══\n')
  for (const [layer, content] of Object.entries(result.layers)) {
    const preview = content == null ? '(null)' : content.length > 200 ? `${content.slice(0, 200)}…` : content
    console.log(`[${layer}] ${preview}`)
  }
  console.log(`\n✅ Assembled OK. Final length: ${result.text.length} chars.`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Smoke failed:', err.message)
    if (err.stack) console.error(err.stack)
    process.exit(1)
  })
