import { pgTable, uuid, varchar, text, integer, jsonb, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { brands } from '../brands'
import { vector } from '../types'

export const dnaBusinessOverview = pgTable(
  'dna_business_overview',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
    businessName: varchar('business_name', { length: 200 }).notNull(),
    legalName: varchar('legal_name', { length: 200 }),
    ownerName: varchar('owner_name', { length: 200 }),
    vertical: varchar('vertical', { length: 200 }).notNull(),
    specialism: text('specialism').notNull(),
    businessModel: varchar('business_model', { length: 100 }),
    foundingYear: integer('founding_year'),
    founderNames: text('founder_names').array(),
    geographicFocus: varchar('geographic_focus', { length: 200 }),
    stage: varchar('stage', { length: 100 }),
    shortDescription: text('short_description'),
    fullDescription: text('full_description'),
    websiteUrl: varchar('website_url', { length: 500 }),
    primaryEmail: varchar('primary_email', { length: 200 }),
    socialHandles: jsonb('social_handles'),
    notes: text('notes'),
    // Embedding of fullDescription (fallback: shortDescription). Populated async by VEC-01 pipeline.
    embedding: vector('embedding', { dimensions: 1536 }),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('dna_business_overview_brand_idx').on(table.brandId),
    index('dna_business_overview_embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
  ]
)

export type DnaBusinessOverview = typeof dnaBusinessOverview.$inferSelect
export type NewDnaBusinessOverview = typeof dnaBusinessOverview.$inferInsert
