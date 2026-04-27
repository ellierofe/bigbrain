export const dynamic = 'force-dynamic'

import { getValueProposition, upsertValueProposition } from '@/lib/db/queries/dna-singular'
import { ValuePropositionView } from './value-proposition-view'

/** Hardcoded brand ID — replace with session lookup when multi-brand auth lands */
const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

export default async function ValuePropositionPage() {
  let data = await getValueProposition(BRAND_ID)

  if (!data) {
    await upsertValueProposition(BRAND_ID, {})
    data = await getValueProposition(BRAND_ID)
  }

  return <ValuePropositionView data={data!} />
}
