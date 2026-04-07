import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { canonicalRegister } from '@/lib/db/schema/graph'

/**
 * Derive a stable dedup key from entity type + name.
 * Format: {entitytype}:{slugified-name}
 * e.g. person:ellie-rofe, organisation:nicelyput
 */
export function deriveDedupeKey(entityType: string, name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `${entityType.toLowerCase()}:${slug}`
}

/**
 * Look up canonical register by entity type + name.
 * Returns the graphNodeId if the entity is already registered, null if not.
 */
export async function resolveCanonical(
  entityType: string,
  name: string
): Promise<string | null> {
  const dedupKey = deriveDedupeKey(entityType, name)

  const [row] = await db
    .select({ graphNodeId: canonicalRegister.graphNodeId })
    .from(canonicalRegister)
    .where(eq(canonicalRegister.dedupKey, dedupKey))
    .limit(1)

  return row?.graphNodeId ?? null
}

/**
 * Register a new canonical entity after its graph node has been written.
 * Safe to call multiple times — uses INSERT ... ON CONFLICT DO NOTHING.
 */
export async function registerCanonical(
  entityType: string,
  canonicalName: string,
  graphNodeId: string,
  variations: string[] = []
): Promise<void> {
  const dedupKey = deriveDedupeKey(entityType, canonicalName)

  await db
    .insert(canonicalRegister)
    .values({
      entityType,
      canonicalName,
      variations,
      dedupKey,
      graphNodeId,
    })
    .onConflictDoUpdate({
      target: canonicalRegister.dedupKey,
      set: { graphNodeId, updatedAt: new Date() },
    })
}
