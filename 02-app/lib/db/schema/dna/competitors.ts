import { boolean, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { brands } from '../brands'

// Table 1: analysis snapshot — one per competitive review
export const dnaCompetitorAnalyses = pgTable('dna_competitor_analyses', {
  id: uuid('id').defaultRandom().primaryKey(),
  brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  label: varchar('label', { length: 200 }).notNull(),
  scope: text('scope'),
  isCurrent: boolean('is_current').notNull().default(true),
  /** FK → dna_competitors.id — set after own-brand record is created */
  ownBrandAssessmentId: uuid('own_brand_assessment_id'),
  /** Array of { id, label, range: [string, string] } */
  matrixAxes: jsonb('matrix_axes'),
  /** Array of { competitorId, competitorName, axes: Record<string, number> } */
  matrixData: jsonb('matrix_data'),
  summaryInsights: text('summary_insights'),
  aiAnalysedAt: timestamp('ai_analysed_at', { withTimezone: true }),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// Table 2: individual competitor records within an analysis
export const dnaCompetitors = pgTable('dna_competitors', {
  id: uuid('id').defaultRandom().primaryKey(),
  brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  analysisId: uuid('analysis_id').notNull().references(() => dnaCompetitorAnalyses.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 200 }).notNull(),
  /** 'direct' | 'adjacent' | 'alternative_approach' | 'doing_nothing' | 'own_brand' */
  competitorType: varchar('competitor_type', { length: 50 }).notNull(),
  url: varchar('url', { length: 500 }),
  overview: text('overview'),
  isOwnBrand: boolean('is_own_brand').notNull().default(false),
  /** { mainPointOfDifference, communicatesDifference, isPositionUnique, addsValue, enhancesExperience, replicableEasily, uniqueBrandExperience } */
  positioningStrategy: jsonb('positioning_strategy'),
  /** { memorableTagline, compellingHook, communicatesSolution, speaksToFearsDesiresEmotions, consistentAndStructured } */
  brandMessage: jsonb('brand_message'),
  /** { definedPersonalityArchetype, messagingCharacteristics, identityCharacteristics, resonanceTechniques, failureToResonate, brandVoiceWellDefined } */
  personality: jsonb('personality'),
  /** { logoMemorableAndImpactful, colourPaletteCommunicatesCharacteristics, imageStyleCommunicatesCharacteristics, typographyCommunicatesCharacteristics, overallPresenceCommunicatesCharacteristics } */
  brandIdentity: jsonb('brand_identity'),
  /** { websiteEffectiveness, uxRating, uiRating, usefulContent, physicalPresence } */
  brandPresence: jsonb('brand_presence'),
  /** { coreOfferClearlyPromoted, effectiveSalesFunnel, effectiveCTA, competitivelyPriced, improvementOpportunities } */
  coreOffer: jsonb('core_offer'),
  /** { positive: string[], negative: string[], reviewSources: string[], overallSentiment: string } */
  reviews: jsonb('reviews'),
  aiGenerated: boolean('ai_generated').notNull().default(false),
  aiGeneratedAt: timestamp('ai_generated_at', { withTimezone: true }),
  manualNotes: text('manual_notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type DnaCompetitorAnalysis = typeof dnaCompetitorAnalyses.$inferSelect
export type NewDnaCompetitorAnalysis = typeof dnaCompetitorAnalyses.$inferInsert
export type DnaCompetitor = typeof dnaCompetitors.$inferSelect
export type NewDnaCompetitor = typeof dnaCompetitors.$inferInsert
