import { MODELS, generateObjectWithFallback } from '@/lib/llm/client'
import {
  ASSET_GENERATION_SYSTEM_PROMPT,
  ASSET_EVALUATION_SYSTEM_PROMPT,
  buildAssetGenerationUserMessage,
  buildAssetEvaluationUserMessage,
  type AssetPromptInput,
  type AssetPromptContext,
} from '@/lib/llm/prompts/knowledge-asset'
import {
  assetGenerationSchema,
  assetEvaluationSchema,
  type AssetGenerationOutput,
  type AssetEvaluationResult,
} from '@/lib/types/generation-knowledge-asset'
import { getBusinessOverview } from '@/lib/db/queries/dna-singular'
import { listAssets } from '@/lib/db/queries/knowledge-assets'

// ---------------------------------------------------------------------------
// Load business context for prompt injection
// ---------------------------------------------------------------------------

async function loadBusinessContext(brandId: string): Promise<AssetPromptContext> {
  const [business, assets] = await Promise.all([
    getBusinessOverview(brandId),
    listAssets(brandId),
  ])

  return {
    business: business
      ? {
          businessName: business.businessName ?? undefined,
          vertical: business.vertical ?? undefined,
          specialism: business.specialism ?? undefined,
          shortDescription: business.shortDescription ?? undefined,
        }
      : null,
    existingAssets: assets.map(a => ({
      name: a.name,
      kind: a.kind,
      summary: a.summary,
    })),
  }
}

// ---------------------------------------------------------------------------
// Evaluate whether inputs are sufficient for generation
// ---------------------------------------------------------------------------

export async function evaluateAssetInputs(
  input: AssetPromptInput,
  brandId: string
): Promise<AssetEvaluationResult> {
  const context = await loadBusinessContext(brandId)

  const { object } = await generateObjectWithFallback<AssetEvaluationResult>({
    model: MODELS.geminiPro,
    schema: assetEvaluationSchema,
    system: ASSET_EVALUATION_SYSTEM_PROMPT,
    prompt: buildAssetEvaluationUserMessage(input, context),
  }, { tag: 'DNA-05 evaluate' })

  return {
    ready: object.ready,
    questions: object.questions?.slice(0, 3), // hard cap at 3
  }
}

// ---------------------------------------------------------------------------
// Generate the full knowledge asset profile
// ---------------------------------------------------------------------------

export async function generateKnowledgeAsset(
  input: AssetPromptInput,
  brandId: string
): Promise<AssetGenerationOutput> {
  const context = await loadBusinessContext(brandId)

  const { object } = await generateObjectWithFallback<AssetGenerationOutput>({
    model: MODELS.geminiPro,
    schema: assetGenerationSchema,
    system: ASSET_GENERATION_SYSTEM_PROMPT,
    prompt: buildAssetGenerationUserMessage(input, context),
  }, { tag: 'DNA-05 generate' })

  return object
}
