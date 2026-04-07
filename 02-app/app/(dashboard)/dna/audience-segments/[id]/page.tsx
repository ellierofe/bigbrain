import { notFound } from 'next/navigation'
import { getSegmentById, listSegments } from '@/lib/db/queries/audience-segments'
import { SegmentDetailView } from './segment-detail-view'

/** Hardcoded brand ID — replace with session lookup when INF-05 is live */
const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

export default async function SegmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab } = await searchParams

  const [segment, allSegments] = await Promise.all([
    getSegmentById(id),
    listSegments(BRAND_ID),
  ])

  if (!segment) notFound()

  const activeCount = allSegments.filter(s => s.status === 'active').length

  return (
    <SegmentDetailView
      segment={segment}
      allSegments={allSegments}
      activeCount={activeCount}
      defaultTab={(tab as 'persona' | 'voc' | 'related') ?? 'persona'}
    />
  )
}
