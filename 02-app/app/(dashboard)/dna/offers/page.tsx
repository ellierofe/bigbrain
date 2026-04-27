import { redirect } from 'next/navigation'
import { Package } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { ContentPane } from '@/components/content-pane'
import { PageChrome } from '@/components/page-chrome'
import { listOffers } from '@/lib/db/queries/offers'
import { CreateOfferButtonRoot } from './create-offer-button-root'
import { db } from '@/lib/db'
import { dnaAudienceSegments } from '@/lib/db/schema/dna/audience-segments'
import { eq, ne, and } from 'drizzle-orm'

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

export default async function OffersIndexPage() {
  const offers = await listOffers(BRAND_ID)

  if (offers.length > 0) {
    redirect(`/dna/offers/${offers[0].id}`)
  }

  // Load segments with VOC data for creation modal
  const segments = await db.select({
    id: dnaAudienceSegments.id,
    segmentName: dnaAudienceSegments.segmentName,
    problems: dnaAudienceSegments.problems,
    desires: dnaAudienceSegments.desires,
    objections: dnaAudienceSegments.objections,
    sharedBeliefs: dnaAudienceSegments.sharedBeliefs,
  })
  .from(dnaAudienceSegments)
  .where(and(eq(dnaAudienceSegments.brandId, BRAND_ID), ne(dnaAudienceSegments.status, 'archived')))

  return (
    <div className="flex flex-col h-full">
      <PageChrome
        title="Offers"
        subtitle="Define what you sell."
      />
      <ContentPane>
        <EmptyState
          icon={Package}
          heading="No offers yet"
          description="Create your first offer to define what you sell and how it maps to your audience."
          action={
            <CreateOfferButtonRoot
              label="Create your first offer"
              brandId={BRAND_ID}
              segments={segments.map(s => ({
                id: s.id,
                segmentName: s.segmentName,
                problems: (s.problems ?? []) as unknown[],
                desires: (s.desires ?? []) as unknown[],
                objections: (s.objections ?? []) as unknown[],
                sharedBeliefs: (s.sharedBeliefs ?? []) as unknown[],
              }))}
            />
          }
        />
      </ContentPane>
    </div>
  )
}
