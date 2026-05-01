import { notFound } from 'next/navigation'
import {
  getContentTypeBySlug,
  listActiveAiModels,
  listAudienceSegmentOptions,
  listOfferOptions,
  listKnowledgeAssetOptions,
  listPickerContentTypes,
  listPlatformOptions,
  listTovApplicationOptions,
  CUSTOMER_JOURNEY_STAGES,
  type StrategyFieldOption,
} from '@/lib/db/queries/content-creator'
import type { StrategyFieldId } from '@/lib/llm/content/types'
import { GenerationSurfaceClient } from './generation-surface-client'

/** Hardcoded brand ID for single-user app. */
const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function GenerationSurfacePage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const sp = await searchParams

  const contentType = await getContentTypeBySlug(slug)
  if (!contentType || contentType.status === 'archived') return notFound()

  // Fetch option-loaders in parallel for every strategy field declared on the content type.
  const [audienceOptions, offerOptions, assetOptions, platformOptions, tovOptions, aiModels, allTypes] =
    await Promise.all([
      listAudienceSegmentOptions(BRAND_ID),
      listOfferOptions(BRAND_ID),
      listKnowledgeAssetOptions(BRAND_ID),
      listPlatformOptions(BRAND_ID),
      listTovApplicationOptions(BRAND_ID, contentType.formatType),
      listActiveAiModels(),
      listPickerContentTypes(BRAND_ID),
    ])

  const switcherOptions = allTypes
    .filter((t) => !t.isLocked)
    .map((t) => ({ value: t.slug, label: t.name }))

  const fieldOptions: Partial<Record<StrategyFieldId, StrategyFieldOption[]>> = {
    audience_segment: audienceOptions,
    offer: offerOptions,
    knowledge_asset: assetOptions,
    platform: platformOptions,
    customer_journey_stage: CUSTOMER_JOURNEY_STAGES,
    tone_variation: [{ value: '', label: 'Default (auto)' }, ...tovOptions],
  }

  // Pre-fill from query params (for project-aware UC-2; stub now)
  const prefill: Record<string, string | null> = {}
  for (const key of ['audience_segment', 'offer', 'knowledge_asset', 'platform']) {
    const v = sp[key]
    if (typeof v === 'string') prefill[key] = v
  }

  return (
    <GenerationSurfaceClient
      contentType={{
        id: contentType.id,
        slug: contentType.slug,
        name: contentType.name,
        description: contentType.description,
        icon: contentType.icon,
        formatType: contentType.formatType,
        defaultVariantCount: contentType.defaultVariantCount,
        topicBarEnabled: contentType.topicBarEnabled,
        strategyFields: contentType.strategyFields as { id: StrategyFieldId; required: boolean }[],
      }}
      fieldOptions={fieldOptions}
      aiModels={aiModels.map((m) => ({ slug: m.slug, name: m.name }))}
      switcherOptions={switcherOptions}
      prefill={prefill}
    />
  )
}
