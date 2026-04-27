import { FolderKanban } from 'lucide-react'
import { PageChrome } from '@/components/page-chrome'
import { ContentPane } from '@/components/content-pane'
import { EmptyState } from '@/components/empty-state'
import {
  listClientProjects,
  getProjectStatusCounts,
} from '@/lib/db/queries/client-projects'
import { ProjectListClient } from './project-list-client'

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

export default async function ClientProjectsPage() {
  const [projects, counts] = await Promise.all([
    listClientProjects(BRAND_ID),
    getProjectStatusCounts(BRAND_ID),
  ])

  return (
    <div className="flex h-full flex-col">
      <ProjectListClient
        initialProjects={projects}
        counts={counts}
      />
    </div>
  )
}
