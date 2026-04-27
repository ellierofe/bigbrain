import { Compass } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { ContentPane } from '@/components/content-pane'
import { listMissions, countMissionsByPhase } from '@/lib/db/queries/missions'
import { MissionsListClient } from './missions-list-client'

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

export default async function MissionsPage() {
  const [allMissions, phaseCounts] = await Promise.all([
    listMissions(BRAND_ID),
    countMissionsByPhase(BRAND_ID),
  ])

  return (
    <div className="flex flex-col h-full gap-4">
      <PageHeader
        title="Missions"
        subtitle="Bounded research investigations"
        icon={Compass}
      />
      <ContentPane>
        <MissionsListClient
          missions={allMissions}
          phaseCounts={phaseCounts}
        />
      </ContentPane>
    </div>
  )
}
