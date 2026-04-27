'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FolderKanban, Plus } from 'lucide-react'
import { PageChrome } from '@/components/page-chrome'
import { ContentPane } from '@/components/content-pane'
import { EmptyState } from '@/components/empty-state'
import { ActionButton } from '@/components/action-button'
import { CreateProjectModal } from '@/components/create-project-modal'
import type { ClientProjectSummary, ProjectStatus } from '@/lib/types/client-projects'

const STATUS_FILTERS: { label: string; value: ProjectStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Paused', value: 'paused' },
  { label: 'Complete', value: 'complete' },
  { label: 'Archived', value: 'archived' },
]

const statusBadge: Record<string, string> = {
  active: 'bg-success-bg text-success-foreground',
  paused: 'bg-warning-bg text-warning-foreground',
  complete: 'bg-info-bg text-info-foreground',
  archived: 'bg-muted text-muted-foreground',
}

function timeAgo(date: Date | string | null): string {
  if (!date) return '—'
  const now = Date.now()
  const then = new Date(date).getTime()
  const seconds = Math.floor((now - then) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

interface ProjectListClientProps {
  initialProjects: ClientProjectSummary[]
  counts: Record<string, number>
}

export function ProjectListClient({ initialProjects, counts }: ProjectListClientProps) {
  const [filter, setFilter] = useState<ProjectStatus | 'all'>('active')
  const [modalOpen, setModalOpen] = useState(false)

  const filtered = filter === 'all'
    ? initialProjects
    : initialProjects.filter((p) => p.status === filter)

  const isEmpty = initialProjects.length === 0

  return (
    <>
      <PageChrome
        title="Client Projects"
        icon={FolderKanban}
        action={
          <ActionButton icon={Plus} size="default" onClick={() => setModalOpen(true)}>
            New project
          </ActionButton>
        }
      />

      <ContentPane>
        {isEmpty ? (
          <EmptyState
            icon={FolderKanban}
            heading="No client projects yet"
            description="Create a project to start scoping client work."
            action={
              <ActionButton icon={Plus} size="default" onClick={() => setModalOpen(true)}>
                New project
              </ActionButton>
            }
          />
        ) : (
          <div className="flex flex-col gap-4">
            {/* Filter pills */}
            <div className="flex gap-1.5">
              {STATUS_FILTERS.map((f) => {
                const count = f.value === 'all' ? (counts.all ?? 0) : (counts[f.value] ?? 0)
                const isActive = filter === f.value
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFilter(f.value)}
                    className={`rounded-full px-3 py-1 text-[13px] font-medium transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {f.label}
                    {count > 0 && (
                      <span className={`ml-1.5 ${isActive ? 'opacity-80' : 'text-muted-foreground'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Table */}
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-[13px] text-muted-foreground">
                No {filter} projects.
              </p>
            ) : (
              <div className="flex flex-col divide-y divide-border">
                {filtered.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/clients/${project.id}`}
                    className="flex items-center gap-4 py-3 transition-colors hover:bg-muted/30 rounded-md px-2 -mx-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
                    </div>
                    <span className="shrink-0 text-[13px] text-muted-foreground w-32 truncate">
                      {project.organisationName}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusBadge[project.status] ?? statusBadge.active}`}
                    >
                      {project.status}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground w-16 text-right">
                      {timeAgo(project.updatedAt)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </ContentPane>

      <CreateProjectModal open={modalOpen} onOpenChange={setModalOpen} />
    </>
  )
}
