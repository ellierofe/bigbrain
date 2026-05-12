import type { WriteEntityType, WriteOp } from './types'

const BREADCRUMBS: Record<WriteEntityType, string> = {
  dna_business_overview: 'DNA › Business overview',
  dna_brand_meaning: 'DNA › Brand meaning',
  dna_value_proposition: 'DNA › Value proposition',
  dna_audience_segment: 'DNA › Audience segments',
  dna_offer: 'DNA › Offers',
  dna_platform: 'DNA › Platforms',
  dna_tone_of_voice: 'DNA › Tone of voice',
  dna_knowledge_asset: 'DNA › Knowledge assets',
  idea: 'Ideas',
}

const ENTITY_LABEL_SHORT: Record<WriteEntityType, string> = {
  dna_business_overview: 'business overview',
  dna_brand_meaning: 'brand meaning',
  dna_value_proposition: 'value proposition',
  dna_audience_segment: 'audience segment',
  dna_offer: 'offer',
  dna_platform: 'platform',
  dna_tone_of_voice: 'tone of voice',
  dna_knowledge_asset: 'knowledge asset',
  idea: 'idea',
}

/** "DNA › Brand meaning" — used in PendingWriteCard headers. */
export function entityBreadcrumb(entityType: WriteEntityType): string {
  return BREADCRUMBS[entityType] ?? entityType
}

/** "brand meaning" / "audience segment" — used in summary text. */
export function entityShortLabel(entityType: WriteEntityType): string {
  return ENTITY_LABEL_SHORT[entityType] ?? entityType
}

/**
 * Human-readable summary for a write — used as the body of the in-chat
 * SystemMessageDivider after a successful write.
 *
 *   ('dna_brand_meaning', 'update', 'mission')   → "mission updated"
 *   ('dna_audience_segment', 'create')           → "audience segment created"
 *   ('dna_audience_segment', 'generate')         → "audience segment generation started"
 */
export function entityWriteSummary(
  entityType: WriteEntityType,
  op: WriteOp | 'generate',
  field?: string
): string {
  const label = ENTITY_LABEL_SHORT[entityType] ?? entityType
  if (op === 'update') return `${field ?? label} updated`
  if (op === 'create') return `${label} created`
  if (op === 'generate') return `${label} generation started`
  return `${label} ${op}`
}

/** Op icon hint for SystemMessageDivider — kept here so the wording and visual stay co-located. */
export function entityWriteOpVerb(op: WriteOp | 'generate'): string {
  if (op === 'update') return 'Saved'
  if (op === 'create') return 'Created'
  if (op === 'generate') return 'Generation started'
  return op
}
