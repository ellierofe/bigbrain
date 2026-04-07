import { pgTable, uuid, varchar, text, integer, jsonb, timestamp, uniqueIndex } from 'drizzle-orm/pg-core'
import { brands } from '../brands'

export const dnaBrandIdentity = pgTable(
  'dna_brand_identity',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
    colours: jsonb('colours'),
    typography: jsonb('typography'),
    logoAssets: jsonb('logo_assets'),
    motifs: text('motifs'),
    imageStyle: text('image_style'),
    imageStyleExamples: text('image_style_examples').array(),
    iconStyle: text('icon_style'),
    designPrinciples: text('design_principles').array(),
    doNotUse: text('do_not_use'),
    brandGuidelineUrl: varchar('brand_guideline_url', { length: 500 }),
    status: varchar('status', { length: 50 }).notNull().default('draft'),
    version: integer('version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('dna_brand_identity_brand_idx').on(table.brandId)]
)

export type DnaBrandIdentity = typeof dnaBrandIdentity.$inferSelect
export type NewDnaBrandIdentity = typeof dnaBrandIdentity.$inferInsert
