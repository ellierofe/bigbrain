import { z } from 'zod'

// ---------------------------------------------------------------------------
// Evaluation result — LLM decides if it has enough context
// ---------------------------------------------------------------------------

export interface OfferEvaluationResult {
  ready: boolean
  questions?: string[]
}

export const offerEvaluationSchema = z.object({
  ready: z.boolean().describe('Whether the provided context is sufficient to generate a high-quality offer profile'),
  questions: z.array(z.string()).optional().describe('1-3 targeted follow-up questions to clarify positioning, pricing approach, or key differentiator. Max 3.'),
})

// ---------------------------------------------------------------------------
// Generation output — what the LLM produces for the full offer
// ---------------------------------------------------------------------------

const paymentPlanSchema = z.object({
  label: z.string().describe('e.g. "Pay in full", "3 monthly payments"'),
  amount: z.number().describe('Amount for this plan'),
})

const pricingSchema = z.object({
  currency: z.string().describe('Currency code e.g. GBP, USD'),
  mainPrice: z.number().describe('Main price point'),
  displayPrice: z.string().describe('Formatted price e.g. "£3,500"'),
  paymentPlans: z.array(paymentPlanSchema).optional().describe('Alternative payment options'),
  pricingNotes: z.string().optional().describe('Additional pricing context'),
  reframingNote: z.string().optional().describe('Price reframing — e.g. "Less than one month of a retained senior consultant"'),
})

const guaranteeSchema = z.object({
  type: z.string().describe('e.g. satisfaction, money-back, performance'),
  headline: z.string().describe('One-line guarantee headline'),
  description: z.string().describe('2-3 sentence description of the guarantee'),
  terms: z.string().describe('Specific terms and conditions'),
  businessRiskNote: z.string().optional().describe('Internal note on business risk'),
})

const entityOutcomeSchema = z.object({
  kind: z.enum(['outcome', 'benefit', 'advantage', 'feature', 'bonus', 'faq']).describe('Type of entity outcome'),
  body: z.string().describe('1-2 sentence description. Specific to THIS offer, written in conversational language.'),
  question: z.string().optional().describe('For FAQ kind only — the question'),
  faqType: z.enum(['logistics', 'differentiation', 'psychological', 'pricing', 'timeline']).optional().describe('For FAQ kind only'),
  objectionAddressed: z.string().optional().describe('For bonus kind — the specific psychological block this bonus removes'),
  valueStatement: z.string().optional().describe('For bonus kind — short statement of concrete value'),
  category: z.enum(['resources', 'skills', 'mindset', 'relationships', 'status']).optional().describe('For outcome/benefit kinds'),
})

export const offerGenerationSchema = z.object({
  overview: z.string().describe('2-4 sentence high-level description of the offer'),
  usp: z.string().describe('Unique selling proposition — 1-2 sentences. The "only we…" or "because we…"'),
  uspExplanation: z.string().describe('2-3 sentences explaining why the USP is effective and how it differentiates'),
  cta: z.string().describe('Primary call to action text'),
  pricing: pricingSchema.describe('Pricing structure'),
  guarantee: guaranteeSchema.describe('Guarantee details'),
  scarcity: z.string().optional().describe('Any genuine scarcity or urgency'),
  salesFunnelNotes: z.string().optional().describe('How this offer fits into the broader sales funnel'),
  entityOutcomes: z.array(entityOutcomeSchema).describe('Generate at least: 5 outcomes, 5 benefits, 4 advantages, 5 features, 2 bonuses (with objectionAddressed + valueStatement), and 5 FAQs (with question + faqType). Each specific to THIS offer.'),
})

export type OfferGenerationOutput = z.infer<typeof offerGenerationSchema>

// ---------------------------------------------------------------------------
// Customer journey generation output
// ---------------------------------------------------------------------------

const journeyStageSchema = z.object({
  stage: z.enum(['awareness', 'consideration', 'decision', 'service', 'advocacy']),
  thinking: z.string().describe('What the customer is thinking at this stage — 2-3 sentences'),
  feeling: z.string().describe('Emotional state — 1-2 sentences'),
  doing: z.string().describe('Actions they are taking — 2-3 sentences'),
  pushToNext: z.string().optional().describe('What moves them to the next stage — 1-2 sentences. Not present for advocacy.'),
})

export const offerJourneySchema = z.object({
  stages: z.array(journeyStageSchema).length(5).describe('All 5 stages: awareness, consideration, decision, service, advocacy'),
})

export type OfferJourneyOutput = z.infer<typeof offerJourneySchema>
