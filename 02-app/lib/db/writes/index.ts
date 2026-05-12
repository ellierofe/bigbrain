import { businessOverviewWrites } from './dna/business-overview'
import { brandMeaningWrites } from './dna/brand-meaning'
import { valuePropositionWrites } from './dna/value-proposition'
import { audienceSegmentWrites } from './dna/audience-segment'
import { offerWrites } from './dna/offer'
import { platformWrites } from './dna/platform'
import { toneOfVoiceWrites } from './dna/tone-of-voice'
import { knowledgeAssetWrites } from './dna/knowledge-asset'
import { ideaWrites } from './ideas'
import type { EntityWrites, WriteEntityType } from './types'

export { logEntityWrite } from './audit'
export { entityBreadcrumb, entityShortLabel, entityWriteSummary, entityWriteOpVerb } from './entity-breadcrumb'
export type { WriteContext, WriteResult, WriteOp, WriteEntityType, WriteErrorCode, EntityWrites, SingularEntityWrites, PluralEntityWrites } from './types'

export { businessOverviewWrites, brandMeaningWrites, valuePropositionWrites, audienceSegmentWrites, offerWrites, platformWrites, toneOfVoiceWrites, knowledgeAssetWrites, ideaWrites }
export { kickoffGeneration as kickoffAudienceSegmentGeneration } from './dna/audience-segment'

export const WRITES_BY_ENTITY: Record<WriteEntityType, EntityWrites> = {
  dna_business_overview: businessOverviewWrites,
  dna_brand_meaning: brandMeaningWrites,
  dna_value_proposition: valuePropositionWrites,
  dna_audience_segment: audienceSegmentWrites,
  dna_offer: offerWrites,
  dna_platform: platformWrites,
  dna_tone_of_voice: toneOfVoiceWrites,
  dna_knowledge_asset: knowledgeAssetWrites,
  idea: ideaWrites,
}

export function getEntityWrites(entityType: WriteEntityType): EntityWrites {
  return WRITES_BY_ENTITY[entityType]
}
