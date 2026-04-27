import { notFound } from 'next/navigation'
import { getPlatformById, listPlatforms, countActivePlatforms } from '@/lib/db/queries/platforms'
import { PlatformDetailView } from './platform-detail-view'

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

export default async function PlatformDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab } = await searchParams

  const [platform, allPlatforms, activeCount] = await Promise.all([
    getPlatformById(id),
    listPlatforms(BRAND_ID),
    countActivePlatforms(BRAND_ID),
  ])

  if (!platform) notFound()

  return (
    <PlatformDetailView
      platform={platform}
      allPlatforms={allPlatforms}
      activeCount={activeCount}
      defaultTab={tab || 'strategy'}
    />
  )
}
