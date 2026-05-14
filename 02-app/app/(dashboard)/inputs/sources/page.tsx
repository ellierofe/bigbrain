import { Suspense } from 'react'
import { PageSkeleton } from '@/components/page-skeleton'
import { listSources, getInboxCount } from '@/lib/db/queries/sources'
import type { SourceListFilters } from '@/lib/types/source-list'
import { SourcesPageClient } from './sources-page-client'

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

interface SourcesPageProps {
  searchParams: Promise<{
    inbox?: string
    type?: string
    authority?: string
    q?: string
  }>
}

export default async function SourcesPage({ searchParams }: SourcesPageProps) {
  const sp = await searchParams

  const inboxCount = await getInboxCount(BRAND_ID)

  const filters: SourceListFilters = {
    inboxStatus:
      sp.inbox === 'new'
        ? 'new'
        : sp.inbox === 'triaged'
          ? 'triaged'
          : sp.inbox === 'all'
            ? 'all'
            : inboxCount > 0
              ? 'new'
              : 'all',
    sourceType: (sp.type as SourceListFilters['sourceType']) || undefined,
    authority: (sp.authority as SourceListFilters['authority']) || undefined,
    search: sp.q || undefined,
  }

  const sources = await listSources(BRAND_ID, filters)

  return (
    <Suspense fallback={<PageSkeleton />}>
      <SourcesPageClient
        sources={sources}
        inboxCount={inboxCount}
        brandId={BRAND_ID}
        initialFilters={filters}
      />
    </Suspense>
  )
}
