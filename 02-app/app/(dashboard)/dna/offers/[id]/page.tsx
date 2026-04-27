import { notFound } from 'next/navigation'
import { getOfferById, listOffers, countActiveOffers } from '@/lib/db/queries/offers'
import { listOutcomesByOffer } from '@/lib/db/queries/entity-outcomes'
import { getSegmentById } from '@/lib/db/queries/audience-segments'
import { listAssets } from '@/lib/db/queries/knowledge-assets'
import { db } from '@/lib/db'
import { dnaAudienceSegments } from '@/lib/db/schema/dna/audience-segments'
import { eq, ne, and } from 'drizzle-orm'
import { OfferDetailView } from './offer-detail-view'
import type { Offer } from '@/lib/types/offers'

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}

export default async function OfferDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { tab } = await searchParams

  const [offer, allOffers, activeCount, outcomes, knowledgeAssets, allSegmentsRaw] = await Promise.all([
    getOfferById(id),
    listOffers(BRAND_ID),
    countActiveOffers(BRAND_ID),
    listOutcomesByOffer(id),
    listAssets(BRAND_ID),
    db.select({
      id: dnaAudienceSegments.id,
      segmentName: dnaAudienceSegments.segmentName,
      status: dnaAudienceSegments.status,
      problems: dnaAudienceSegments.problems,
      desires: dnaAudienceSegments.desires,
      objections: dnaAudienceSegments.objections,
      sharedBeliefs: dnaAudienceSegments.sharedBeliefs,
    })
    .from(dnaAudienceSegments)
    .where(and(eq(dnaAudienceSegments.brandId, BRAND_ID), ne(dnaAudienceSegments.status, 'archived'))),
  ])

  if (!offer) notFound()

  // Load primary audience segment for VOC mapping display
  const primaryAudienceId = offer.targetAudienceIds?.[0]
  const audienceSegment = primaryAudienceId
    ? await getSegmentById(primaryAudienceId)
    : null

  return (
    <OfferDetailView
      offer={offer as Offer}
      allOffers={allOffers}
      activeCount={activeCount}
      defaultTab={tab}
      audienceSegment={audienceSegment ? {
        id: audienceSegment.id,
        segmentName: audienceSegment.segmentName,
        status: audienceSegment.status ?? 'active',
        problems: (audienceSegment.problems ?? []) as unknown[],
        desires: (audienceSegment.desires ?? []) as unknown[],
        objections: (audienceSegment.objections ?? []) as unknown[],
        sharedBeliefs: (audienceSegment.sharedBeliefs ?? []) as unknown[],
      } : null}
      outcomes={outcomes}
      knowledgeAssets={knowledgeAssets}
      allSegments={allSegmentsRaw.map(s => ({
        id: s.id,
        segmentName: s.segmentName,
        status: s.status ?? 'active',
        problems: (s.problems ?? []) as unknown[],
        desires: (s.desires ?? []) as unknown[],
        objections: (s.objections ?? []) as unknown[],
        sharedBeliefs: (s.sharedBeliefs ?? []) as unknown[],
      }))}
    />
  )
}
