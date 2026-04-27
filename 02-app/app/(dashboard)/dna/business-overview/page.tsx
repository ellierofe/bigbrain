export const dynamic = 'force-dynamic'

import { getBusinessOverview, upsertBusinessOverview } from '@/lib/db/queries/dna-singular'
import { BusinessOverviewView } from './business-overview-view'

/** Hardcoded brand ID — replace with session lookup when multi-brand auth lands */
const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

export default async function BusinessOverviewPage() {
  let data = await getBusinessOverview(BRAND_ID)

  if (!data) {
    // Auto-create the row so the page always has something to render
    await upsertBusinessOverview(BRAND_ID, {
      businessName: '',
      vertical: '',
      specialism: '',
    })
    data = await getBusinessOverview(BRAND_ID)
  }

  return <BusinessOverviewView data={data!} />
}
