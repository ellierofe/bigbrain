import { boolean, integer, jsonb, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'
import { brands } from '../brands'

export const dnaPlatforms = pgTable('dna_platforms', {
  id: uuid('id').defaultRandom().primaryKey(),
  brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  /** 'social' | 'email' | 'owned_content' | 'video' | 'audio' | 'other' */
  platformType: varchar('platform_type', { length: 50 }).notNull(),
  handle: varchar('handle', { length: 200 }),
  isActive: boolean('is_active').notNull().default(true),
  primaryObjective: text('primary_objective'),
  audience: text('audience'),
  contentStrategy: text('content_strategy'),
  postingFrequency: varchar('posting_frequency', { length: 100 }),
  /** Array of { format, description, characterLimit, bestFor, frequency } */
  contentFormats: jsonb('content_formats').notNull().default([]),
  /** { post, headline, bio, comment, notes } */
  characterLimits: jsonb('character_limits'),
  /** Soft refs: uuid[] → dna_content_pillars.id */
  contentPillarIds: uuid('content_pillar_ids').array(),
  hashtagStrategy: text('hashtag_strategy'),
  engagementApproach: text('engagement_approach'),
  /** 'awareness' | 'engagement' | 'conversion' | 'delight_advocacy' */
  customerJourneyStage: varchar('customer_journey_stage', { length: 50 }),
  growthFunction: text('growth_function'),
  contentPillarThemes: text('content_pillar_themes'),
  /** Array of { subtopic, examples: string[] } */
  subtopicIdeas: jsonb('subtopic_ideas').notNull().default([]),
  /** { signatureFeatures: [{name, description}], contentStructure, brandedComponents } */
  structureAndFeatures: jsonb('structure_and_features'),
  analyticsGoals: text('analytics_goals'),
  performanceSummary: text('performance_summary'),
  doNotDo: text('do_not_do').array(),
  usp: text('usp'),
  notes: text('notes'),
  sortOrder: integer('sort_order'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type DnaPlatform = typeof dnaPlatforms.$inferSelect
export type NewDnaPlatform = typeof dnaPlatforms.$inferInsert
