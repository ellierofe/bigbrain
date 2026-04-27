import { eq, and, asc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { dnaPlatforms } from '@/lib/db/schema/dna/platforms'
import type { Platform, PlatformSummary } from '@/lib/types/platforms'

/** All active platforms for a brand, ordered by sort_order then created_at */
export async function listPlatforms(brandId: string): Promise<PlatformSummary[]> {
  const rows = await db
    .select({
      id: dnaPlatforms.id,
      name: dnaPlatforms.name,
      category: dnaPlatforms.category,
      channel: dnaPlatforms.channel,
      primaryObjective: dnaPlatforms.primaryObjective,
      isActive: dnaPlatforms.isActive,
    })
    .from(dnaPlatforms)
    .where(
      and(
        eq(dnaPlatforms.brandId, brandId),
        eq(dnaPlatforms.isActive, true)
      )
    )
    .orderBy(asc(dnaPlatforms.sortOrder), asc(dnaPlatforms.createdAt))

  return rows as PlatformSummary[]
}

/** All platforms including inactive, for the card grid "show archived" toggle */
export async function listAllPlatforms(brandId: string): Promise<PlatformSummary[]> {
  const rows = await db
    .select({
      id: dnaPlatforms.id,
      name: dnaPlatforms.name,
      category: dnaPlatforms.category,
      channel: dnaPlatforms.channel,
      primaryObjective: dnaPlatforms.primaryObjective,
      isActive: dnaPlatforms.isActive,
    })
    .from(dnaPlatforms)
    .where(eq(dnaPlatforms.brandId, brandId))
    .orderBy(asc(dnaPlatforms.sortOrder), asc(dnaPlatforms.createdAt))

  return rows as PlatformSummary[]
}

/** Single platform by ID */
export async function getPlatformById(id: string): Promise<Platform | null> {
  const rows = await db
    .select()
    .from(dnaPlatforms)
    .where(eq(dnaPlatforms.id, id))
    .limit(1)

  if (rows.length === 0) return null
  return rows[0] as unknown as Platform
}

/** Count of active platforms for a brand (used for archive guard) */
export async function countActivePlatforms(brandId: string): Promise<number> {
  const rows = await db
    .select({ id: dnaPlatforms.id })
    .from(dnaPlatforms)
    .where(
      and(
        eq(dnaPlatforms.brandId, brandId),
        eq(dnaPlatforms.isActive, true)
      )
    )
  return rows.length
}

/** Check whether a platform ID is referenced in any dependent tables.
 *  Currently: no dependent tables exist yet.
 *  Returns empty array. Extend when content registry (REG-01) is built. */
export async function getPlatformDependents(
  _platformId: string
): Promise<{ name: string; type: string }[]> {
  return []
}

/** Update a scalar field on a platform. Used by autosave. */
export async function updatePlatformField(
  id: string,
  field: keyof typeof dnaPlatforms.$inferSelect,
  value: unknown
): Promise<void> {
  await db
    .update(dnaPlatforms)
    .set({ [field]: value, updatedAt: new Date() })
    .where(eq(dnaPlatforms.id, id))
}

/** Archive a platform (set isActive = false) */
export async function archivePlatform(id: string): Promise<void> {
  await db
    .update(dnaPlatforms)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(dnaPlatforms.id, id))
}

/** Activate a platform (set isActive = true) */
export async function activatePlatform(id: string): Promise<void> {
  await db
    .update(dnaPlatforms)
    .set({ isActive: true, updatedAt: new Date() })
    .where(eq(dnaPlatforms.id, id))
}
