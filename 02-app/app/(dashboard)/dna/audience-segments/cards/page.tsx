import { Users, LayoutList } from 'lucide-react'
import Link from 'next/link'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { listAllSegments } from '@/lib/db/queries/audience-segments'
import { CreateSegmentButton } from './create-segment-button'

/** Hardcoded brand ID — replace with session lookup when INF-05 is live */
const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

export default async function AudienceSegmentsCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ showArchived?: string }>
}) {
  const params = await searchParams
  const showArchived = params.showArchived === 'true'
  const allSegments = await listAllSegments(BRAND_ID)

  const visibleSegments = showArchived
    ? allSegments
    : allSegments.filter(s => s.status !== 'archived')

  const activeSegments = allSegments.filter(s => s.status !== 'archived')
  const firstActiveId = activeSegments[0]?.id

  return (
    <div>
      <PageHeader
        title="Audience Segments"
        subtitle="Define who you're talking to."
        action={
          <div className="flex items-center gap-2">
            {firstActiveId && (
              <Button variant="outline" size="sm" render={<Link href={`/dna/audience-segments/${firstActiveId}`} />}>
                <LayoutList className="h-4 w-4" />
                <span className="ml-1.5">Detail view</span>
              </Button>
            )}
            <CreateSegmentButton />
          </div>
        }
      />

      {allSegments.length === 0 ? (
        <EmptyState
          icon={Users}
          heading="No audience segments yet"
          description="Create your first segment to start building targeted content and offers."
          action={<CreateSegmentButton label="Create your first segment" />}
        />
      ) : (
        <>
          <div className="mb-4 flex items-center gap-2">
            <Link
              href={showArchived ? '/dna/audience-segments/cards' : '/dna/audience-segments/cards?showArchived=true'}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              {showArchived ? 'Hide archived' : 'Show archived'}
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {visibleSegments.map(segment => (
              <Link
                key={segment.id}
                href={`/dna/audience-segments/${segment.id}`}
                className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-foreground/20 hover:bg-muted/30"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground"
                    aria-hidden
                  >
                    {segment.segmentName.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-semibold text-sm">{segment.segmentName}</p>
                      {segment.status === 'draft' && (
                        <Badge variant="secondary" className="text-[10px] shrink-0">Draft</Badge>
                      )}
                      {segment.status === 'archived' && (
                        <Badge variant="outline" className="text-[10px] shrink-0 opacity-60">Archived</Badge>
                      )}
                    </div>
                    {segment.summary && (
                      <p className="mt-1 text-xs text-muted-foreground line-clamp-3">
                        {segment.summary}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
