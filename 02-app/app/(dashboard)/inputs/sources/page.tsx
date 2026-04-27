import { PageHeader } from '@/components/page-header'
import { SourcesClient } from './sources-client'
import { getSourceDocuments, getInboxCount } from '@/lib/db/queries/sources'

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

export default async function SourcesPage() {
  const [sources, inboxCount] = await Promise.all([
    getSourceDocuments(BRAND_ID),
    getInboxCount(BRAND_ID),
  ])

  return (
    <div className="flex flex-col h-full gap-4">
      <PageHeader
        title="Sources"
        subtitle={inboxCount > 0 ? `${inboxCount} new in inbox` : `${sources.length} sources`}
      />
      <SourcesClient
        sources={sources}
        inboxCount={inboxCount}
        brandId={BRAND_ID}
      />
    </div>
  )
}
