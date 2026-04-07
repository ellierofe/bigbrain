import { index, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { brands } from '../brands'
import { dnaOffers } from './offers'
import { dnaKnowledgeAssets } from './knowledge-assets'

export const dnaEntityOutcomes = pgTable('dna_entity_outcomes', {
  id: uuid('id').defaultRandom().primaryKey(),
  brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  offerId: uuid('offer_id').references(() => dnaOffers.id, { onDelete: 'cascade' }),
  knowledgeAssetId: uuid('knowledge_asset_id').references(() => dnaKnowledgeAssets.id, { onDelete: 'cascade' }),
  /** 'outcome' | 'benefit' | 'advantage' | 'feature' | 'bonus' | 'faq' */
  kind: varchar('kind', { length: 50 }).notNull(),
  body: text('body').notNull(),
  question: text('question'),
  /** For faq kind: 'logistics' | 'differentiation' | 'psychological' | 'pricing' | 'timeline' */
  faqType: varchar('faq_type', { length: 50 }),
  objectionAddressed: text('objection_addressed'),
  valueStatement: text('value_statement'),
  /** For outcome/benefit kinds: 'resources' | 'skills' | 'mindset' | 'relationships' | 'status' */
  category: varchar('category', { length: 50 }),
  sortOrder: integer('sort_order'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('dna_entity_outcomes_offer_kind_idx').on(t.offerId, t.kind),
  index('dna_entity_outcomes_asset_kind_idx').on(t.knowledgeAssetId, t.kind),
])

export type DnaEntityOutcome = typeof dnaEntityOutcomes.$inferSelect
export type NewDnaEntityOutcome = typeof dnaEntityOutcomes.$inferInsert
