import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { dnaBusinessOverview } from '@/lib/db/schema/dna/business-overview'
import { dnaBrandMeaning } from '@/lib/db/schema/dna/brand-meaning'
import { dnaValueProposition } from '@/lib/db/schema/dna/value-proposition'

// ---------------------------------------------------------------------------
// Business Overview
// ---------------------------------------------------------------------------

export async function getBusinessOverview(brandId: string) {
  const rows = await db
    .select()
    .from(dnaBusinessOverview)
    .where(eq(dnaBusinessOverview.brandId, brandId))
    .limit(1)

  return rows[0] ?? null
}

export async function upsertBusinessOverview(
  brandId: string,
  data: Partial<typeof dnaBusinessOverview.$inferInsert>
) {
  const existing = await getBusinessOverview(brandId)

  if (existing) {
    await db
      .update(dnaBusinessOverview)
      .set({ ...data, version: existing.version + 1, updatedAt: new Date() })
      .where(eq(dnaBusinessOverview.id, existing.id))
    return existing.id
  }

  const rows = await db
    .insert(dnaBusinessOverview)
    .values({
      brandId,
      businessName: '',
      vertical: '',
      specialism: '',
      ...data,
    })
    .returning({ id: dnaBusinessOverview.id })

  return rows[0].id
}

export async function updateBusinessOverviewField(
  id: string,
  field: keyof typeof dnaBusinessOverview.$inferSelect,
  value: unknown
) {
  const existing = await db
    .select({ version: dnaBusinessOverview.version })
    .from(dnaBusinessOverview)
    .where(eq(dnaBusinessOverview.id, id))
    .limit(1)

  const version = existing[0] ? existing[0].version + 1 : 1

  await db
    .update(dnaBusinessOverview)
    .set({ [field]: value, version, updatedAt: new Date() })
    .where(eq(dnaBusinessOverview.id, id))
}

// ---------------------------------------------------------------------------
// Brand Meaning
// ---------------------------------------------------------------------------

export async function getBrandMeaning(brandId: string) {
  const rows = await db
    .select()
    .from(dnaBrandMeaning)
    .where(eq(dnaBrandMeaning.brandId, brandId))
    .limit(1)

  return rows[0] ?? null
}

export async function upsertBrandMeaning(
  brandId: string,
  data: Partial<typeof dnaBrandMeaning.$inferInsert>
) {
  const existing = await getBrandMeaning(brandId)

  if (existing) {
    await db
      .update(dnaBrandMeaning)
      .set({ ...data, version: existing.version + 1, updatedAt: new Date() })
      .where(eq(dnaBrandMeaning.id, existing.id))
    return existing.id
  }

  const rows = await db
    .insert(dnaBrandMeaning)
    .values({ brandId, ...data })
    .returning({ id: dnaBrandMeaning.id })

  return rows[0].id
}

export async function updateBrandMeaningField(
  id: string,
  field: keyof typeof dnaBrandMeaning.$inferSelect,
  value: unknown
) {
  const existing = await db
    .select({ version: dnaBrandMeaning.version })
    .from(dnaBrandMeaning)
    .where(eq(dnaBrandMeaning.id, id))
    .limit(1)

  const version = existing[0] ? existing[0].version + 1 : 1

  await db
    .update(dnaBrandMeaning)
    .set({ [field]: value, version, updatedAt: new Date() })
    .where(eq(dnaBrandMeaning.id, id))
}

// ---------------------------------------------------------------------------
// Value Proposition
// ---------------------------------------------------------------------------

export async function getValueProposition(brandId: string) {
  const rows = await db
    .select()
    .from(dnaValueProposition)
    .where(eq(dnaValueProposition.brandId, brandId))
    .limit(1)

  return rows[0] ?? null
}

export async function upsertValueProposition(
  brandId: string,
  data: Partial<typeof dnaValueProposition.$inferInsert>
) {
  const existing = await getValueProposition(brandId)

  if (existing) {
    await db
      .update(dnaValueProposition)
      .set({ ...data, version: existing.version + 1, updatedAt: new Date() })
      .where(eq(dnaValueProposition.id, existing.id))
    return existing.id
  }

  const rows = await db
    .insert(dnaValueProposition)
    .values({ brandId, ...data })
    .returning({ id: dnaValueProposition.id })

  return rows[0].id
}

export async function updateValuePropositionField(
  id: string,
  field: keyof typeof dnaValueProposition.$inferSelect,
  value: unknown
) {
  const existing = await db
    .select({ version: dnaValueProposition.version })
    .from(dnaValueProposition)
    .where(eq(dnaValueProposition.id, id))
    .limit(1)

  const version = existing[0] ? existing[0].version + 1 : 1

  await db
    .update(dnaValueProposition)
    .set({ [field]: value, version, updatedAt: new Date() })
    .where(eq(dnaValueProposition.id, id))
}
