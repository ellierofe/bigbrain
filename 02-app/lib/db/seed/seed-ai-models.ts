/**
 * OUT-02-P4a — seed ai_models registry from `lib/llm/client.ts` MODELS const.
 *
 * Run via:
 *   cd 02-app && npx dotenv -e .env.local -- tsx lib/db/seed/seed-ai-models.ts
 *
 * Idempotent: upserts on slug. Costs and context windows are reference values;
 * keep accurate by editing this file (the table is the single source of truth
 * the picker reads from).
 */

import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { aiModels, type NewAiModel } from '@/lib/db/schema/content/ai-models'

const seeds: NewAiModel[] = [
  {
    slug: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6',
    provider: 'anthropic',
    providerModelId: 'claude-sonnet-4-6',
    tier: 'primary',
    costInputPerMtok: '3.00',
    costOutputPerMtok: '15.00',
    contextWindow: 200000,
    isActive: true,
  },
  {
    slug: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    providerModelId: 'claude-haiku-4-5-20251001',
    tier: 'fast',
    costInputPerMtok: '1.00',
    costOutputPerMtok: '5.00',
    contextWindow: 200000,
    isActive: true,
  },
  {
    slug: 'claude-opus-4-6',
    name: 'Claude Opus 4.6',
    provider: 'anthropic',
    providerModelId: 'claude-opus-4-6',
    tier: 'powerful',
    costInputPerMtok: '15.00',
    costOutputPerMtok: '75.00',
    contextWindow: 200000,
    isActive: true,
  },
  {
    slug: 'claude-opus-4-7',
    name: 'Claude Opus 4.7',
    provider: 'anthropic',
    providerModelId: 'claude-opus-4-7',
    tier: 'fallback',
    costInputPerMtok: '15.00',
    costOutputPerMtok: '75.00',
    contextWindow: 1000000,
    isActive: true,
  },
  {
    slug: 'gemini-2-5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    providerModelId: 'gemini-2.5-flash',
    tier: 'alternative',
    costInputPerMtok: '0.30',
    costOutputPerMtok: '2.50',
    contextWindow: 1000000,
    isActive: true,
  },
  {
    slug: 'gemini-3-1-pro',
    name: 'Gemini 3.1 Pro',
    provider: 'google',
    providerModelId: 'gemini-3.1-pro-preview',
    tier: 'alternative',
    costInputPerMtok: '1.25',
    costOutputPerMtok: '10.00',
    contextWindow: 1000000,
    isActive: true,
  },
  {
    slug: 'grok-3-mini',
    name: 'Grok 3 Mini',
    provider: 'xai',
    providerModelId: 'grok-3-mini',
    tier: 'alternative',
    costInputPerMtok: '0.30',
    costOutputPerMtok: '0.50',
    contextWindow: 131072,
    isActive: true,
  },
]

async function main() {
  console.log(`Seeding ${seeds.length} ai_models…`)

  const result = await db
    .insert(aiModels)
    .values(seeds)
    .onConflictDoUpdate({
      target: aiModels.slug,
      set: {
        name: sql`excluded.name`,
        provider: sql`excluded.provider`,
        providerModelId: sql`excluded.provider_model_id`,
        tier: sql`excluded.tier`,
        costInputPerMtok: sql`excluded.cost_input_per_mtok`,
        costOutputPerMtok: sql`excluded.cost_output_per_mtok`,
        contextWindow: sql`excluded.context_window`,
        isActive: sql`excluded.is_active`,
        updatedAt: sql`now()`,
      },
    })
    .returning({ slug: aiModels.slug })

  console.log(`✓ Upserted ${result.length} ai_models rows`)
  console.log(`  ${result.map((r) => r.slug).join(', ')}`)
  process.exit(0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
