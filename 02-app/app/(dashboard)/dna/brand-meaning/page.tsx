export const dynamic = 'force-dynamic'

import { getBrandMeaning, upsertBrandMeaning } from '@/lib/db/queries/dna-singular'
import { BrandMeaningView } from './brand-meaning-view'

/** Hardcoded brand ID — replace with session lookup when multi-brand auth lands */
const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

export default async function BrandMeaningPage() {
  let data = await getBrandMeaning(BRAND_ID)

  if (!data) {
    await upsertBrandMeaning(BRAND_ID, {})
    data = await getBrandMeaning(BRAND_ID)
  }

  return <BrandMeaningView data={data!} />
}
