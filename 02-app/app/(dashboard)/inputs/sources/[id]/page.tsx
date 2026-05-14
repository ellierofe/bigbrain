import { notFound } from 'next/navigation'
import {
  getSourceDetail,
  getChunksForSource,
  getLinkedLensReports,
  getPeopleByIds,
} from '@/lib/db/queries/sources'
import { SourceDetailClient } from './source-detail-client'

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

interface SourceDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function SourceDetailPage({ params }: SourceDetailPageProps) {
  const { id } = await params

  const source = await getSourceDetail(BRAND_ID, id)
  if (!source) notFound()

  const [chunks, linkedReports, hydratedPeople] = await Promise.all([
    getChunksForSource(id),
    getLinkedLensReports(id),
    source.participantIds.length > 0 ? getPeopleByIds(source.participantIds) : Promise.resolve([]),
  ])

  return (
    <SourceDetailClient
      source={source}
      chunks={chunks}
      linkedReports={linkedReports}
      hydratedPeople={hydratedPeople}
    />
  )
}
