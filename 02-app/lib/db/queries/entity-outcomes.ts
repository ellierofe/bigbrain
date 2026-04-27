import { eq, and, max, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { dnaEntityOutcomes } from '@/lib/db/schema/dna/entity-outcomes'

export type EntityOutcomeKind = 'outcome' | 'benefit' | 'advantage' | 'feature' | 'bonus' | 'faq'

export interface EntityOutcomeRow {
  id: string
  brandId: string
  offerId: string | null
  knowledgeAssetId: string | null
  kind: EntityOutcomeKind
  body: string
  question: string | null
  faqType: string | null
  objectionAddressed: string | null
  valueStatement: string | null
  category: string | null
  sortOrder: number | null
  createdAt: Date
}

// ---------------------------------------------------------------------------
// List by parent
// ---------------------------------------------------------------------------

export async function listOutcomesByAsset(assetId: string): Promise<EntityOutcomeRow[]> {
  return db
    .select()
    .from(dnaEntityOutcomes)
    .where(eq(dnaEntityOutcomes.knowledgeAssetId, assetId))
    .orderBy(dnaEntityOutcomes.kind, dnaEntityOutcomes.sortOrder) as Promise<EntityOutcomeRow[]>
}

export async function listOutcomesByOffer(offerId: string): Promise<EntityOutcomeRow[]> {
  return db
    .select()
    .from(dnaEntityOutcomes)
    .where(eq(dnaEntityOutcomes.offerId, offerId))
    .orderBy(dnaEntityOutcomes.kind, dnaEntityOutcomes.sortOrder) as Promise<EntityOutcomeRow[]>
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function addOutcome(data: {
  brandId: string
  knowledgeAssetId?: string
  offerId?: string
  kind: EntityOutcomeKind
  body: string
  question?: string
  faqType?: string
  objectionAddressed?: string
  valueStatement?: string
  category?: string
}): Promise<string> {
  // Get max sortOrder for this parent + kind
  const parentCol = data.knowledgeAssetId ? 'knowledgeAssetId' : 'offerId'
  const parentId = data.knowledgeAssetId ?? data.offerId!

  const maxResult = await db
    .select({ value: max(dnaEntityOutcomes.sortOrder) })
    .from(dnaEntityOutcomes)
    .where(
      and(
        eq(dnaEntityOutcomes[parentCol === 'knowledgeAssetId' ? 'knowledgeAssetId' : 'offerId'], parentId),
        eq(dnaEntityOutcomes.kind, data.kind)
      )
    )

  const nextOrder = (maxResult[0]?.value ?? 0) + 1

  const rows = await db
    .insert(dnaEntityOutcomes)
    .values({
      brandId: data.brandId,
      knowledgeAssetId: data.knowledgeAssetId,
      offerId: data.offerId,
      kind: data.kind,
      body: data.body,
      question: data.question,
      faqType: data.faqType,
      objectionAddressed: data.objectionAddressed,
      valueStatement: data.valueStatement,
      category: data.category,
      sortOrder: nextOrder,
    })
    .returning({ id: dnaEntityOutcomes.id })

  return rows[0].id
}

export async function updateOutcome(
  id: string,
  data: Partial<{
    body: string
    question: string
    faqType: string
    objectionAddressed: string
    valueStatement: string
    category: string
    sortOrder: number
  }>
): Promise<void> {
  await db
    .update(dnaEntityOutcomes)
    .set(data)
    .where(eq(dnaEntityOutcomes.id, id))
}

export async function deleteOutcome(id: string): Promise<void> {
  await db
    .delete(dnaEntityOutcomes)
    .where(eq(dnaEntityOutcomes.id, id))
}
