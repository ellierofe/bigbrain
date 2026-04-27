import { PageHeader } from '@/components/page-header'
import { ResultsClient } from './results-client'
import { getAllRuns } from '@/lib/db/queries/processing-runs'

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

export default async function ResultsPage() {
  const runs = await getAllRuns(BRAND_ID)
  const pendingCount = runs.filter((r) => r.status === 'pending').length

  return (
    <div className="flex flex-col h-full gap-4">
      <PageHeader
        title="Results"
        subtitle={pendingCount > 0 ? `${pendingCount} pending review` : `${runs.length} results`}
      />
      <ResultsClient runs={runs} brandId={BRAND_ID} />
    </div>
  )
}
