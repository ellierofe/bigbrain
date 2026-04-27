import type { StatusOption } from '@/components/status-badge'
import type { VocMapping } from './knowledge-assets'

export type OfferType =
  | 'productised_service'
  | 'retainer'
  | 'intensive'
  | '1_1_coaching'
  | '1_1_consulting'
  | 'course'
  | 'group_programme'
  | 'digital_product'
  | 'subscription'
  | 'newsletter'
  | 'book'
  | 'template'
  | 'tool'
  | 'event'
  | 'other'

export type OfferStatus = 'draft' | 'active' | 'retired' | 'paused'

export interface PricingData {
  currency?: string
  mainPrice?: number
  displayPrice?: string
  paymentPlans?: { label: string; amount: number }[]
  pricingNotes?: string
  reframingNote?: string
}

export interface GuaranteeData {
  type?: string
  headline?: string
  description?: string
  terms?: string
  businessRiskNote?: string
}

export interface CustomerJourneyStage {
  stage: 'awareness' | 'consideration' | 'decision' | 'service' | 'advocacy'
  thinking: string
  feeling: string
  doing: string
  pushToNext?: string
}

/** Full offer row from DB */
export interface Offer {
  id: string
  brandId: string
  name: string
  offerType: string
  status: OfferStatus
  overview: string | null
  usp: string | null
  uspExplanation: string | null
  targetAudienceIds: string[] | null
  knowledgeAssetId: string | null
  pricing: PricingData | null
  scarcity: string | null
  guarantee: GuaranteeData | null
  vocMapping: VocMapping | null
  customerJourney: CustomerJourneyStage[] | null
  salesFunnelNotes: string | null
  cta: string | null
  visualPrompt: string | null
  internalNotes: string | null
  createdAt: Date
  updatedAt: Date
}

/** Minimal shape for card grid and switcher */
export interface OfferSummary {
  id: string
  name: string
  offerType: string
  status: OfferStatus
  overview: string | null
  targetAudienceIds: string[] | null
}

/** Input for creating a new offer (Phase 1) */
export interface CreateOfferInput {
  name: string
  offerType: string
  status?: OfferStatus
  targetAudienceIds?: string[]
  vocMapping?: VocMapping
}

export const OFFER_TYPE_LABELS: Record<string, string> = {
  productised_service: 'Productised Service',
  retainer: 'Retainer',
  intensive: 'Intensive',
  '1_1_coaching': '1:1 Coaching',
  '1_1_consulting': '1:1 Consulting',
  course: 'Course',
  group_programme: 'Group Programme',
  digital_product: 'Digital Product',
  subscription: 'Subscription',
  newsletter: 'Newsletter',
  book: 'Book',
  template: 'Template',
  tool: 'Tool',
  event: 'Event',
  other: 'Other',
}

export const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  retired: 'Retired',
  paused: 'Paused',
}

export const OFFER_STATUS_OPTIONS: StatusOption[] = [
  { value: 'draft', label: 'Draft', state: 'warning' },
  { value: 'active', label: 'Active', state: 'success' },
  { value: 'retired', label: 'Retired', state: 'neutral' },
  { value: 'paused', label: 'Paused', state: 'info' },
]

export const CUSTOMER_JOURNEY_STAGES = [
  'awareness',
  'consideration',
  'decision',
  'service',
  'advocacy',
] as const
