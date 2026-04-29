import Link from 'next/link'
import { Package, LayoutList } from 'lucide-react'
import { PageChrome } from '@/components/page-chrome'
import { ContentPane } from '@/components/content-pane'
import { EmptyState } from '@/components/empty-state'
import { IconButton } from '@/components/icon-button'
import { listAllOffers } from '@/lib/db/queries/offers'
import { getSegmentById } from '@/lib/db/queries/audience-segments'
import { CreateOfferButtonRoot } from '../create-offer-button-root'
import { OFFER_TYPE_LABELS } from '@/lib/types/offers'
import { db } from '@/lib/db'
import { dnaAudienceSegments } from '@/lib/db/schema/dna/audience-segments'
import { eq, ne, and } from 'drizzle-orm'

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

export default async function OffersCardsPage() {
  const offers = await listAllOffers(BRAND_ID)

  // Load segments for creation modal
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

  // Resolve primary audience names
  const audienceNames: Record<string, string> = {}
  for (const offer of offers) {
    const primaryId = offer.targetAudienceIds?.[0]
    if (primaryId && !audienceNames[primaryId]) {
      const seg = await getSegmentById(primaryId)
      if (seg) audienceNames[primaryId] = seg.segmentName
    }
  }

  return (
    <div className="flex flex-col h-full">
      <PageChrome
        title="Offers"
        subtitle="Define what you sell."
        action={
          <div className="flex items-center gap-2">
            {offers.length > 0 && (
              <IconButton
                icon={LayoutList}
                label="List view"
                href={`/dna/offers/${offers[0].id}`}
              />
            )}
            <CreateOfferButtonRoot
              segments={segments.map(s => ({
                id: s.id,
                segmentName: s.segmentName,
                problems: (s.problems ?? []) as unknown[],
                desires: (s.desires ?? []) as unknown[],
                objections: (s.objections ?? []) as unknown[],
                sharedBeliefs: (s.sharedBeliefs ?? []) as unknown[],
              }))}
            />
          </div>
        }
      />
      <ContentPane>
        {offers.length === 0 ? (
          <EmptyState
            icon={Package}
            heading="No offers yet"
            description="Create your first offer to define what you sell and how it maps to your audience."
            action={
              <CreateOfferButtonRoot
                label="Create your first offer"
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
        ) : (
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">
            {offers.map(offer => {
              const primaryAudienceName = offer.targetAudienceIds?.[0]
                ? audienceNames[offer.targetAudienceIds[0]]
                : null
              const isRetired = offer.status === 'retired'
              const isDraft = offer.status === 'draft'

              return (
                <Link
                  key={offer.id}
                  href={`/dna/offers/${offer.id}`}
                  className={`flex flex-col gap-2 rounded-lg border border-border p-4 transition-colors hover:border-primary/30 ${
                    isRetired ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-display font-semibold text-sm truncate flex-1">
                      {offer.name}
                    </span>
                    {isDraft && (
                      <span className="shrink-0 rounded-full bg-warning-bg px-1.5 py-0.5 text-[10px] font-medium text-warning-foreground">
                        Draft
                      </span>
                    )}
                    {isRetired && (
                      <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Retired
                      </span>
                    )}
                    {offer.status === 'paused' && (
                      <span className="shrink-0 rounded-full bg-info-bg px-1.5 py-0.5 text-[10px] font-medium text-info-foreground">
                        Paused
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {OFFER_TYPE_LABELS[offer.offerType] ?? offer.offerType}
                  </span>
                  {primaryAudienceName && (
                    <span className="text-xs text-muted-foreground">
                      {primaryAudienceName}
                    </span>
                  )}
                  {offer.overview && (
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {offer.overview}
                    </p>
                  )}
                </Link>
              )
            })}
          </div>
        )}
      </ContentPane>
    </div>
  )
}
