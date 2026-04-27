import { redirect } from 'next/navigation'
import { Monitor } from 'lucide-react'
import { listPlatforms } from '@/lib/db/queries/platforms'
import { PageChrome } from '@/components/page-chrome'
import { ContentPane } from '@/components/content-pane'
import { EmptyState } from '@/components/empty-state'
import { CreatePlatformButton } from './create-platform-button'

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

export default async function PlatformsPage() {
  const platforms = await listPlatforms(BRAND_ID)

  if (platforms.length > 0) {
    redirect(`/dna/platforms/${platforms[0].id}`)
  }

  return (
    <>
      <PageChrome
        title="Channels"
        icon={Monitor}
        action={<CreatePlatformButton />}
      />
      <ContentPane>
        <EmptyState
          icon={Monitor}
          heading="No channels yet"
          description="Add your first channel to define how your brand shows up."
          action={<CreatePlatformButton />}
        />
      </ContentPane>
    </>
  )
}
