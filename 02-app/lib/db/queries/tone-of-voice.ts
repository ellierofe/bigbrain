import { eq, and, desc, ne, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  dnaToneOfVoice,
  dnaTovSamples,
  dnaTovApplications,
  type NewDnaToneOfVoice,
} from '@/lib/db/schema/dna/tone-of-voice'

// ---------------------------------------------------------------------------
// Base ToV record (singular — one per brand)
//
// A brand may simultaneously have a non-draft "current" row (active or archived)
// and a draft row produced by regeneration. Approval promotes the draft and
// archives the previous current.
// ---------------------------------------------------------------------------

/**
 * The "live" tone of voice record for display/edit.
 *
 * Selection rule: prefer a draft (under review) → else active → else most-recent
 * archived. The view shows whichever returns; regeneration banner is driven by
 * `getDraftToneOfVoice` returning non-null at the same time as the page having
 * a separate active sibling.
 */
export async function getToneOfVoice(brandId: string) {
  const rows = await db
    .select()
    .from(dnaToneOfVoice)
    .where(eq(dnaToneOfVoice.brandId, brandId))
    .orderBy(
      // draft (0) → active (1) → archived (2)
      sql`CASE ${dnaToneOfVoice.status} WHEN 'draft' THEN 0 WHEN 'active' THEN 1 ELSE 2 END`,
      desc(dnaToneOfVoice.updatedAt)
    )
    .limit(1)

  return rows[0] ?? null
}

/** Latest draft regeneration if one exists. */
export async function getDraftToneOfVoice(brandId: string) {
  const rows = await db
    .select()
    .from(dnaToneOfVoice)
    .where(
      and(eq(dnaToneOfVoice.brandId, brandId), eq(dnaToneOfVoice.status, 'draft'))
    )
    .orderBy(desc(dnaToneOfVoice.updatedAt))
    .limit(1)

  return rows[0] ?? null
}

/** Latest active record (used to know whether a draft has a sibling to compare against). */
export async function getActiveToneOfVoice(brandId: string) {
  const rows = await db
    .select()
    .from(dnaToneOfVoice)
    .where(
      and(eq(dnaToneOfVoice.brandId, brandId), eq(dnaToneOfVoice.status, 'active'))
    )
    .orderBy(desc(dnaToneOfVoice.updatedAt))
    .limit(1)

  return rows[0] ?? null
}

export async function createToneOfVoiceRecord(data: NewDnaToneOfVoice) {
  const rows = await db
    .insert(dnaToneOfVoice)
    .values(data)
    .returning({ id: dnaToneOfVoice.id })
  return rows[0].id
}

export async function deleteToneOfVoiceRecord(id: string) {
  await db.delete(dnaToneOfVoice).where(eq(dnaToneOfVoice.id, id))
}

/** Promote a draft to active, archiving any previous non-draft record. */
export async function promoteDraftToActive(brandId: string, draftId: string) {
  await db.transaction(async (tx) => {
    await tx
      .update(dnaToneOfVoice)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(
        and(
          eq(dnaToneOfVoice.brandId, brandId),
          ne(dnaToneOfVoice.status, 'draft'),
          ne(dnaToneOfVoice.id, draftId)
        )
      )
    await tx
      .update(dnaToneOfVoice)
      .set({ status: 'active', updatedAt: new Date() })
      .where(eq(dnaToneOfVoice.id, draftId))
  })
}

export async function updateToneOfVoiceField(
  id: string,
  field: keyof typeof dnaToneOfVoice.$inferSelect,
  value: unknown
) {
  const existing = await db
    .select({ version: dnaToneOfVoice.version })
    .from(dnaToneOfVoice)
    .where(eq(dnaToneOfVoice.id, id))
    .limit(1)

  const version = existing[0] ? existing[0].version + 1 : 1

  await db
    .update(dnaToneOfVoice)
    .set({
      [field]: value,
      version,
      updatedAt: new Date(),
      lastEditedByHumanAt: new Date(),
    })
    .where(eq(dnaToneOfVoice.id, id))
}

// ---------------------------------------------------------------------------
// Writing samples (plural — library per brand)
// ---------------------------------------------------------------------------

export async function listSamples(brandId: string) {
  return db
    .select()
    .from(dnaTovSamples)
    .where(
      and(eq(dnaTovSamples.brandId, brandId), eq(dnaTovSamples.isCurrent, true))
    )
    .orderBy(dnaTovSamples.formatType, dnaTovSamples.createdAt)
}

export async function getSampleById(id: string) {
  const rows = await db
    .select()
    .from(dnaTovSamples)
    .where(eq(dnaTovSamples.id, id))
    .limit(1)

  return rows[0] ?? null
}

export async function createSample(
  brandId: string,
  data: {
    formatType: string
    subtype?: string
    body: string
    notes?: string
    sourceContext?: string
  }
) {
  const rows = await db
    .insert(dnaTovSamples)
    .values({ brandId, ...data })
    .returning({ id: dnaTovSamples.id })

  return rows[0].id
}

export async function updateSampleField(
  id: string,
  field: keyof typeof dnaTovSamples.$inferSelect,
  value: unknown
) {
  await db
    .update(dnaTovSamples)
    .set({ [field]: value, updatedAt: new Date() })
    .where(eq(dnaTovSamples.id, id))
}

export async function archiveSample(id: string) {
  await db
    .update(dnaTovSamples)
    .set({ isCurrent: false, updatedAt: new Date() })
    .where(eq(dnaTovSamples.id, id))
}

// ---------------------------------------------------------------------------
// Application deltas (plural — per-format rules)
// ---------------------------------------------------------------------------

export async function listApplications(
  brandId: string,
  opts?: { includeArchived?: boolean }
) {
  const conditions = opts?.includeArchived
    ? eq(dnaTovApplications.brandId, brandId)
    : and(
        eq(dnaTovApplications.brandId, brandId),
        eq(dnaTovApplications.isCurrent, true)
      )

  return db
    .select()
    .from(dnaTovApplications)
    .where(conditions)
    .orderBy(desc(dnaTovApplications.isCurrent), desc(dnaTovApplications.updatedAt))
}

export async function getApplicationById(id: string) {
  const rows = await db
    .select()
    .from(dnaTovApplications)
    .where(eq(dnaTovApplications.id, id))
    .limit(1)

  return rows[0] ?? null
}

export async function createApplication(
  brandId: string,
  data: {
    label: string
    formatType: string
    subtype?: string | null
  }
) {
  const rows = await db
    .insert(dnaTovApplications)
    .values({
      brandId,
      label: data.label,
      formatType: data.formatType,
      subtype: data.subtype ?? null,
    })
    .returning({ id: dnaTovApplications.id })

  return rows[0].id
}

export async function updateApplicationField(
  id: string,
  field: keyof typeof dnaTovApplications.$inferSelect,
  value: unknown
) {
  await db
    .update(dnaTovApplications)
    .set({ [field]: value, updatedAt: new Date() })
    .where(eq(dnaTovApplications.id, id))
}

export async function archiveApplication(id: string) {
  await db
    .update(dnaTovApplications)
    .set({ isCurrent: false, updatedAt: new Date() })
    .where(eq(dnaTovApplications.id, id))
}

export async function restoreApplication(id: string) {
  await db
    .update(dnaTovApplications)
    .set({ isCurrent: true, updatedAt: new Date() })
    .where(eq(dnaTovApplications.id, id))
}
