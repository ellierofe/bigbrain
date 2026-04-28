'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FolderKanban,
  ChevronLeft,
  Archive,
  X,
  Plus,
} from 'lucide-react'
import { PageChrome } from '@/components/page-chrome'
import { ContentPane } from '@/components/content-pane'
import { SectionCard } from '@/components/section-card'
import { IdeasPanel } from '@/components/ideas-panel'
import { EmptyState } from '@/components/empty-state'
import { ActionButton } from '@/components/action-button'
import { IconButton } from '@/components/icon-button'
// DS-07 exception: brief Textarea (line 275) — pending InlineField textarea migration in a follow-up.
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/modal'
import { ItemLinker } from '@/components/item-linker'
import { TypeBadge } from '@/components/type-badge'
import { StatusBadge, type StatusOption } from '@/components/status-badge'
import {
  updateProjectFieldAction,
  linkItemAction,
  unlinkItemAction,
  searchItemsAction,
} from '@/app/actions/client-projects'
import type {
  ClientProjectDetail,
  ProjectStatus,
  LinkedMission,
  LinkedInput,
  LinkedStat,
} from '@/lib/types/client-projects'
import type { Idea, IdeaTag } from '@/lib/types/ideas'
import type { TaggableEntity } from '@/lib/db/queries/taggable-entities'

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'active', label: 'Active', state: 'success' },
  { value: 'paused', label: 'Paused', state: 'warning' },
  { value: 'complete', label: 'Complete', state: 'info' },
  { value: 'archived', label: 'Archived', state: 'neutral' },
]

// Phase = mission phase (read-only display in linked-missions list).
// Interactive phase changing happens in mission-workspace.tsx.
// Mapped to tag tokens via TypeBadge below.
const phaseHue: Record<string, 1 | 2 | 3 | 4 | 5 | 6 | null> = {
  exploring: 4,       // dusty lavender
  synthesising: 1,    // dusty blue
  producing: 6,       // olive
  complete: null,     // muted (uses bg-muted text-muted-foreground)
  paused: 3,          // custard
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface ProjectWorkspaceProps {
  project: ClientProjectDetail
  missions: LinkedMission[]
  inputs: LinkedInput[]
  stats: LinkedStat[]
  allIdeas: Idea[]
  ideasTagsMap: Record<string, IdeaTag[]>
  taggableEntities: TaggableEntity[]
}

export function ProjectWorkspace({
  project,
  missions: initialMissions,
  inputs: initialInputs,
  stats: initialStats,
  allIdeas,
  ideasTagsMap,
  taggableEntities,
}: ProjectWorkspaceProps) {
  const router = useRouter()

  // Editable state
  const [name, setName] = useState(project.name)
  const [brief, setBrief] = useState(project.brief ?? '')
  const [status, setStatus] = useState<ProjectStatus>(project.status as ProjectStatus)
  const [saveIndicator, setSaveIndicator] = useState<Record<string, string>>({})

  // Archive modal
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [archiving, setArchiving] = useState(false)

  // Linker state
  const [linkerType, setLinkerType] = useState<'mission' | 'input' | 'stat' | null>(null)

  // Unlink confirm
  const [unlinkTarget, setUnlinkTarget] = useState<{
    type: 'mission' | 'input' | 'stat' | 'idea'
    linkId: string
    label: string
  } | null>(null)

  // Editing name
  const [editingName, setEditingName] = useState(false)
  const nameInputRef = useRef<HTMLInputElement>(null)

  // ---------------------------------------------------------------------------
  // Save handlers
  // ---------------------------------------------------------------------------

  async function saveField(field: 'name' | 'brief', value: string) {
    const res = await updateProjectFieldAction(project.id, field, value)
    setSaveIndicator((prev) => ({ ...prev, [field]: res.ok ? 'Saved' : 'Failed' }))
    if (res.ok) {
      setTimeout(() => setSaveIndicator((prev) => ({ ...prev, [field]: '' })), 2000)
    }
  }

  async function handleStatusChange(newStatus: string) {
    const previous = status
    setStatus(newStatus as ProjectStatus)
    const result = await updateProjectFieldAction(project.id, 'status', newStatus)
    if (!result.ok) {
      setStatus(previous)
      return result
    }
    router.refresh()
    return { ok: true as const }
  }

  async function handleArchive() {
    setArchiving(true)
    await updateProjectFieldAction(project.id, 'status', 'archived')
    setArchiving(false)
    setArchiveOpen(false)
    router.push('/projects/clients')
  }

  async function handleUnlink() {
    if (!unlinkTarget) return
    await unlinkItemAction(project.id, unlinkTarget.type, unlinkTarget.linkId)
    setUnlinkTarget(null)
    router.refresh()
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex h-full flex-col">
      <PageChrome
        title={project.name}
        icon={FolderKanban}
        subheader={
          <div className="flex items-center gap-3">
            <Link
              href="/projects/clients"
              className="flex items-center gap-1 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Client Projects
            </Link>
            <span className="text-muted-foreground/40">/</span>

            {/* Inline-editable name */}
            {editingName ? (
              <input
                ref={nameInputRef}
                className="bg-transparent text-[13px] font-medium text-foreground outline-none border-b border-primary/50 min-w-[200px]"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => {
                  setEditingName(false)
                  if (name.trim() && name !== project.name) saveField('name', name.trim())
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLInputElement).blur() }
                  if (e.key === 'Escape') { setName(project.name); setEditingName(false) }
                }}
                autoFocus
              />
            ) : (
              <button
                type="button"
                onClick={() => { setEditingName(true); setTimeout(() => nameInputRef.current?.focus(), 0) }}
                className="text-[13px] font-medium text-foreground hover:text-primary transition-colors"
              >
                {name}
              </button>
            )}
            {saveIndicator.name && (
              <span className={`text-[11px] ${saveIndicator.name === 'Saved' ? 'text-success' : 'text-destructive'}`}>
                {saveIndicator.name}
              </span>
            )}
          </div>
        }
        action={
          <div className="flex items-center gap-2">
            {/* Status picker */}
            <StatusBadge
              status={status}
              onChange={handleStatusChange}
              options={STATUS_OPTIONS}
            />

            {/* Archive button */}
            <IconButton
              icon={Archive}
              label="Archive project"
              variant="ghost"
              onClick={() => setArchiveOpen(true)}
              className="text-muted-foreground"
            />
          </div>
        }
      />

      <ContentPane>
        <div className="max-w-3xl space-y-6">
          {/* Brief section */}
          <SectionCard title="Brief">
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <span className="font-medium">Client:</span>
                <span>{project.organisationName}</span>
              </div>
              <div>
                <Textarea
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  onBlur={() => { if (brief !== (project.brief ?? '')) saveField('brief', brief) }}
                  placeholder="Scope, objectives, key questions..."
                  className="min-h-[100px] resize-none text-sm"
                />
                {saveIndicator.brief && (
                  <span className={`mt-1 block text-[10px] ${saveIndicator.brief === 'Saved' ? 'text-success' : 'text-destructive'}`}>
                    {saveIndicator.brief}
                  </span>
                )}
              </div>
            </div>
          </SectionCard>

          {/* Ideas & Questions */}
          <IdeasPanel
            entityType="client_project"
            entityId={project.id}
            entityLabel="this project"
            allIdeas={allIdeas}
            tagsMap={ideasTagsMap}
            taggableEntities={taggableEntities}
          />

          {/* Linked Missions */}
          <LinkedSection
            title="Linked Missions"
            items={initialMissions}
            onLinkClick={() => setLinkerType('mission')}
            linkerOpen={linkerType === 'mission'}
            linkerEntityLabel="missions"
            onLinkerSearch={(q) => searchItemsAction(project.id, 'mission', q).then((r) => r.ok ? r.data : [])}
            onLinkerLink={async (id) => { await linkItemAction(project.id, 'mission', id); router.refresh() }}
            onLinkerClose={() => setLinkerType(null)}
            emptyText="No missions linked. Link a mission to scope research to this project."
            renderItem={(item) => (
              <div className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-foreground truncate">{item.name}</p>
                </div>
                {phaseHue[item.phase] ? (
                  <TypeBadge hue={phaseHue[item.phase]!} label={item.phase} />
                ) : (
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {item.phase}
                  </span>
                )}
                <span className="shrink-0 text-[11px] text-muted-foreground w-14 text-right">
                  {timeAgo(item.updatedAt)}
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setUnlinkTarget({ type: 'mission', linkId: item.id, label: item.name }) }}
                  className="shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            )}
          />

          {/* Linked Inputs */}
          <LinkedSection
            title="Linked Inputs"
            items={initialInputs}
            onLinkClick={() => setLinkerType('input')}
            linkerOpen={linkerType === 'input'}
            linkerEntityLabel="inputs"
            onLinkerSearch={(q) => searchItemsAction(project.id, 'input', q).then((r) => r.ok ? r.data : [])}
            onLinkerLink={async (id) => { await linkItemAction(project.id, 'input', id); router.refresh() }}
            onLinkerClose={() => setLinkerType(null)}
            emptyText="No inputs linked. Tag inputs from Sources to scope them to this project."
            renderItem={(item: LinkedInput) => (
              <div className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-foreground truncate">{item.title}</p>
                </div>
                <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-secondary-foreground">
                  {item.type}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground w-20 text-right">
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setUnlinkTarget({ type: 'input', linkId: item.id, label: item.title }) }}
                  className="shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            )}
          />

          {/* Linked Stats */}
          <LinkedSection
            title="Linked Stats"
            items={initialStats}
            onLinkClick={() => setLinkerType('stat')}
            linkerOpen={linkerType === 'stat'}
            linkerEntityLabel="statistics"
            onLinkerSearch={(q) => searchItemsAction(project.id, 'stat', q).then((r) => r.ok ? r.data : [])}
            onLinkerLink={async (id) => { await linkItemAction(project.id, 'stat', id); router.refresh() }}
            onLinkerClose={() => setLinkerType(null)}
            emptyText="No stats linked."
            renderItem={(item: LinkedStat) => (
              <div className="flex items-center gap-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] text-foreground line-clamp-2">{item.claim}</p>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground w-24 text-right truncate">
                  {item.source ?? '—'}
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setUnlinkTarget({ type: 'stat', linkId: item.id, label: item.claim.slice(0, 40) }) }}
                  className="shrink-0 opacity-0 group-hover/row:opacity-100 transition-opacity"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </button>
              </div>
            )}
          />

          {/* Linked Content (stub) */}
          <SectionCard title="Linked Content">
            <p className="py-4 text-center text-[13px] text-muted-foreground">
              Content linking coming with the content registry.
            </p>
          </SectionCard>
        </div>
      </ContentPane>

      {/* Archive confirmation modal */}
      <Modal
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title="Archive project"
        size="sm"
        footer={
          <>
            <ActionButton variant="outline" onClick={() => setArchiveOpen(false)}>Cancel</ActionButton>
            <ActionButton variant="destructive" onClick={handleArchive} loading={archiving}>
              {archiving ? 'Archiving...' : 'Archive'}
            </ActionButton>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Archive <span className="font-medium text-foreground">{project.name}</span>?
          It will be hidden from your active projects but remains accessible from the Archived filter.
          Linked items won't be affected.
        </p>
      </Modal>

      {/* Unlink confirmation modal */}
      <Modal
        open={unlinkTarget !== null}
        onOpenChange={(open) => { if (!open) setUnlinkTarget(null) }}
        title="Unlink item"
        size="sm"
        footer={
          unlinkTarget ? (
            <>
              <ActionButton variant="outline" onClick={() => setUnlinkTarget(null)}>Cancel</ActionButton>
              <ActionButton variant="destructive" onClick={handleUnlink}>Unlink</ActionButton>
            </>
          ) : undefined
        }
      >
        {unlinkTarget && (
          <p className="text-sm text-muted-foreground">
            Unlink <span className="font-medium text-foreground">{unlinkTarget.label}</span> from this project?
            The item itself won't be deleted.
          </p>
        )}
      </Modal>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Generic linked section component
// ---------------------------------------------------------------------------

interface LinkedSectionProps<T> {
  title: string
  items: T[]
  onLinkClick: () => void
  linkerOpen: boolean
  linkerEntityLabel: string
  onLinkerSearch: (q: string) => Promise<{ id: string; label: string; sublabel?: string }[]>
  onLinkerLink: (id: string) => Promise<void>
  onLinkerClose: () => void
  emptyText: string
  renderItem: (item: T) => React.ReactNode
}

function LinkedSection<T extends { id: string }>({
  title,
  items,
  onLinkClick,
  linkerOpen,
  linkerEntityLabel,
  onLinkerSearch,
  onLinkerLink,
  onLinkerClose,
  emptyText,
  renderItem,
}: LinkedSectionProps<T>) {
  return (
    <SectionCard
      title={title}
      action={
        <ActionButton icon={Plus} variant="outline" onClick={onLinkClick}>
          Link
        </ActionButton>
      }
    >
      {linkerOpen && (
        <div className="mb-3">
          <ItemLinker
            entityLabel={linkerEntityLabel}
            onSearch={onLinkerSearch}
            onLink={onLinkerLink}
            onClose={onLinkerClose}
          />
        </div>
      )}

      {items.length === 0 && !linkerOpen ? (
        <p className="py-4 text-center text-[13px] text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {items.map((item) => (
            <div key={item.id} className="group/row">
              {renderItem(item)}
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}
