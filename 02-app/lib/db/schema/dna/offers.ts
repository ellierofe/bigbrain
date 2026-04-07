import { jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { brands } from '../brands'
import { dnaKnowledgeAssets } from './knowledge-assets'

export const dnaOffers = pgTable('dna_offers', {
  id: uuid('id').defaultRandom().primaryKey(),
  brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 200 }).notNull(),
  /** e.g. 'productised_service' | 'retainer' | 'intensive' | '1_1_coaching' | 'digital_product' | 'course' | 'newsletter' | 'book' | etc. */
  offerType: varchar('offer_type', { length: 100 }).notNull(),
  /** 'draft' | 'active' | 'retired' | 'paused' */
  status: varchar('status', { length: 50 }).notNull().default('active'),
  overview: text('overview'),
  usp: text('usp'),
  uspExplanation: text('usp_explanation'),
  /** Soft refs: uuid[] → dna_audience_segments.id */
  targetAudienceIds: uuid('target_audience_ids').array(),
  knowledgeAssetId: uuid('knowledge_asset_id').references(() => dnaKnowledgeAssets.id, { onDelete: 'set null' }),
  /** { currency, mainPrice, displayPrice, paymentPlans, pricingNotes, reframingNote } */
  pricing: jsonb('pricing'),
  scarcity: text('scarcity'),
  /** { type, headline, description, terms, businessRiskNote } */
  guarantee: jsonb('guarantee'),
  /** 'awareness' | 'consideration' | 'decision' | 'retention' */
  customerJourneyStage: varchar('customer_journey_stage', { length: 50 }),
  salesFunnelNotes: text('sales_funnel_notes'),
  cta: text('cta'),
  visualPrompt: text('visual_prompt'),
  internalNotes: text('internal_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type DnaOffer = typeof dnaOffers.$inferSelect
export type NewDnaOffer = typeof dnaOffers.$inferInsert
