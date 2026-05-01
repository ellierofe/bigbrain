import { index, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core'
import { brands } from '@/lib/db/schema/brands'
import { contentTypes } from './content-types'

/**
 * Brand-scoped favourites for the content-creator picker. Composite PK on
 * (brand_id, content_type_id). Thin join so per-favourite metadata can land
 * later without a column bloom.
 */
export const brandContentTypeFavourites = pgTable('brand_content_type_favourites', {
  brandId: uuid('brand_id').notNull().references(() => brands.id, { onDelete: 'cascade' }),
  contentTypeId: uuid('content_type_id').notNull().references(() => contentTypes.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  primaryKey({ columns: [t.brandId, t.contentTypeId] }),
  index('brand_content_type_favourites_brand_idx').on(t.brandId),
])

export type BrandContentTypeFavourite = typeof brandContentTypeFavourites.$inferSelect
export type NewBrandContentTypeFavourite = typeof brandContentTypeFavourites.$inferInsert
