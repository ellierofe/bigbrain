import { redirect } from 'next/navigation'
import { Users } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { listSegments } from '@/lib/db/queries/audience-segments'
import { CreateSegmentButtonRoot } from './create-segment-button-root'

/** Hardcoded brand ID — replace with session lookup when INF-05 is live */
const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

export default async function AudienceSegmentsIndexPage() {
  const segments = await listSegments(BRAND_ID)

  if (segments.length > 0) {
    redirect(`/dna/audience-segments/${segments[0].id}`)
  }

  // Empty state
  return (
    <div className="flex h-full items-center justify-center">
      <EmptyState
        icon={Users}
        heading="No audience segments yet"
        description="Create your first segment to start building targeted content and offers."
        action={<CreateSegmentButtonRoot label="Create your first segment" />}
      />
    </div>
  )
}
