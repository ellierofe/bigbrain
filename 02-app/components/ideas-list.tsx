'use client'

import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import {
  Lightbulb, HelpCircle, Trash2, ChevronDown, ChevronUp,
  Tag, X, Search, Compass, FolderKanban, Target, BookOpen, Users, Link2,
} from 'lucide-react'
import { toast } from 'sonner'
import { debouncedSaveToast } from '@/lib/save-feedback'

import {
  updateIdeaText,
  updateIdeaStatus,
  updateIdeaType,
  deleteIdea,
  tagIdeaAction,
  untagIdeaAction,
} from '@/app/actions/ideas'
import { EmptyState } from '@/components/empty-state'
import type { Idea, IdeaType, IdeaStatus, IdeaTag, IdeaTagEntityType } from '@/lib/types/ideas'
import type { TaggableEntity } from '@/lib/db/queries/taggable-entities'

interface IdeasListProps {
  ideas: Idea[]
  tagsMap?: Record<string, IdeaTag[]>
  taggableEntities?: TaggableEntity[]
  showFilters?: boolean
  onCaptureClick?: () => void
  /** When set, rows get a one-click "Link" affordance to tag to this context (used in embedded panels) */
  contextFilter?: { entityType: IdeaTagEntityType; entityId: string; entityLabel: string }
  /** Called after any tag change (add/remove) so parent can mirror the updated tags map */
  onTagsChange?: (tagsMap: Record<string, IdeaTag[]>) => void
}

type StatusFilter = 'all' | IdeaStatus
type TypeFilter = 'all' | IdeaType

const ENTITY_TYPE_LABELS: Record<IdeaTagEntityType, string> = {
  mission: 'Mission',
  client_project: 'Project',
  offer: 'Offer',
  knowledge_asset: 'Knowledge Asset',
  audience_segment: 'Segment',
}

const ENTITY_TYPE_ICONS: Record<IdeaTagEntityType, typeof Compass> = {
  mission: Compass,
  client_project: FolderKanban,
  offer: Target,
  knowledge_asset: BookOpen,
  audience_segment: Users,
}

export function IdeasList({
  ideas: initialIdeas,
  tagsMap: initialTagsMap = {},
  taggableEntities = [],
  showFilters = true,
  onCaptureClick,
  contextFilter,
  onTagsChange,
}: IdeasListProps) {
  const [ideas, setIdeas] = useState(initialIdeas)
  const [tagsMap, setTagsMap] = useState(initialTagsMap)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('captured')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  useEffect(() => { setIdeas(initialIdeas) }, [initialIdeas])
  useEffect(() => { setTagsMap(initialTagsMap) }, [initialTagsMap])

  const filtered = useMemo(() => {
    return ideas.filter((idea) => {
      if (statusFilter !== 'all' && idea.status !== statusFilter) return false
      if (typeFilter !== 'all' && idea.type !== typeFilter) return false
      return true
    })
  }, [ideas, statusFilter, typeFilter])

  const counts = useMemo(() => {
    const c = { all: ideas.length, captured: 0, shelved: 0, done: 0, ideas: 0, questions: 0 }
    for (const idea of ideas) {
      if (idea.status === 'captured') c.captured++
      if (idea.status === 'shelved') c.shelved++
      if (idea.status === 'done') c.done++
      if (idea.type === 'idea') c.ideas++
      if (idea.type === 'question') c.questions++
    }
    return c
  }, [ideas])

  const handleStatusChange = useCallback(async (id: string, newStatus: IdeaStatus) => {
    const prev = ideas.find((i) => i.id === id)
    if (!prev) return
    setIdeas((curr) => curr.map((i) => i.id === id ? { ...i, status: newStatus } : i))
    const result = await updateIdeaStatus(id, newStatus)
    if (!result.ok) {
      setIdeas((curr) => curr.map((i) => i.id === id ? { ...i, status: prev.status } : i))
      toast.error(result.error)
    }
  }, [ideas])

  const handleTypeToggle = useCallback(async (id: string, currentType: IdeaType) => {
    const newType: IdeaType = currentType === 'idea' ? 'question' : 'idea'
    setIdeas((curr) => curr.map((i) => i.id === id ? { ...i, type: newType } : i))
    const result = await updateIdeaType(id, newType)
    if (!result.ok) {
      setIdeas((curr) => curr.map((i) => i.id === id ? { ...i, type: currentType } : i))
      toast.error(result.error)
    }
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    const prev = ideas.find((i) => i.id === id)
    if (!prev) return
    setIdeas((curr) => curr.filter((i) => i.id !== id))

    let undone = false
    toast('Idea deleted.', {
      action: {
        label: 'Undo',
        onClick: () => {
          undone = true
          setIdeas((curr) => [...curr, prev].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ))
        },
      },
      duration: 3000,
      onAutoClose: async () => {
        if (!undone) {
          const result = await deleteIdea(id)
          if (!result.ok) {
            setIdeas((curr) => [...curr, prev].sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            ))
            toast.error("Couldn't delete idea")
          }
        }
      },
      onDismiss: async () => {
        if (!undone) {
          const result = await deleteIdea(id)
          if (!result.ok) {
            setIdeas((curr) => [...curr, prev].sort(
              (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
            ))
            toast.error("Couldn't delete idea")
          }
        }
      },
    })
  }, [ideas])

  const handleTag = useCallback(async (ideaId: string, entity: TaggableEntity) => {
    const tempTag: IdeaTag = {
      id: `temp-${Date.now()}`,
      ideaId,
      entityType: entity.entityType,
      entityId: entity.id,
      entityName: entity.name,
      createdAt: new Date(),
    }
    setTagsMap((curr) => {
      const next = { ...curr, [ideaId]: [...(curr[ideaId] ?? []), tempTag] }
      onTagsChange?.(next)
      return next
    })

    const result = await tagIdeaAction(ideaId, entity.entityType, entity.id)
    if (result.ok) {
      setTagsMap((curr) => {
        const next = {
          ...curr,
          [ideaId]: (curr[ideaId] ?? []).map((t) =>
            t.id === tempTag.id ? { ...t, id: result.data.id } : t
          ),
        }
        onTagsChange?.(next)
        return next
      })
      debouncedSaveToast()
    } else {
      setTagsMap((curr) => {
        const next = {
          ...curr,
          [ideaId]: (curr[ideaId] ?? []).filter((t) => t.id !== tempTag.id),
        }
        onTagsChange?.(next)
        return next
      })
      toast.error(result.error)
    }
  }, [onTagsChange])

  const handleUntag = useCallback(async (ideaId: string, tagId: string) => {
    const prev = tagsMap[ideaId]?.find((t) => t.id === tagId)
    if (!prev) return

    setTagsMap((curr) => {
      const next = { ...curr, [ideaId]: (curr[ideaId] ?? []).filter((t) => t.id !== tagId) }
      onTagsChange?.(next)
      return next
    })

    const result = await untagIdeaAction(tagId)
    if (!result.ok) {
      setTagsMap((curr) => {
        const next = { ...curr, [ideaId]: [...(curr[ideaId] ?? []), prev] }
        onTagsChange?.(next)
        return next
      })
      toast.error(result.error)
    }
  }, [tagsMap, onTagsChange])

  if (ideas.length === 0) {
    return (
      <EmptyState
        icon={Lightbulb}
        heading="No ideas yet"
        description="Thoughts, questions, sparks — capture them here so they don't get lost. Use the lightbulb button in the toolbar, or click below."
        action={
          onCaptureClick ? (
            <button
              type="button"
              onClick={onCaptureClick}
              className="text-sm font-medium text-primary hover:underline"
            >
              + Capture an idea
            </button>
          ) : undefined
        }
      />
    )
  }

  const statusPills: { value: StatusFilter; label: string; count: number }[] = [
    { value: 'all', label: 'All', count: counts.all },
    { value: 'captured', label: 'Captured', count: counts.captured },
    { value: 'shelved', label: 'Shelved', count: counts.shelved },
    { value: 'done', label: 'Done', count: counts.done },
  ]

  const typePills: { value: TypeFilter; label: string; count: number; icon: typeof Lightbulb }[] = [
    { value: 'all', label: 'All', count: counts.all, icon: Lightbulb },
    { value: 'idea', label: 'Ideas', count: counts.ideas, icon: Lightbulb },
    { value: 'question', label: 'Questions', count: counts.questions, icon: HelpCircle },
  ]

  return (
    <div className="flex flex-col gap-3">
      {showFilters && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground w-12 shrink-0">Status</span>
            <div className="flex gap-1">
              {statusPills.map((pill) => (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => setStatusFilter(pill.value)}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
                    statusFilter === pill.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {pill.label}
                  <span className={`text-[11px] ${statusFilter === pill.value ? 'opacity-70' : 'opacity-50'}`}>{pill.count}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground w-12 shrink-0">Type</span>
            <div className="flex gap-1">
              {typePills.map((pill) => (
                <button
                  key={pill.value}
                  type="button"
                  onClick={() => setTypeFilter(pill.value)}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
                    typeFilter === pill.value
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {pill.value !== 'all' && <pill.icon className="h-3 w-3" />}
                  {pill.label}
                  <span className={`text-[11px] ${typeFilter === pill.value ? 'opacity-70' : 'opacity-50'}`}>{pill.count}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No {statusFilter !== 'all' ? statusFilter : ''}{' '}
          {typeFilter !== 'all' ? (typeFilter === 'idea' ? 'ideas' : 'questions') : 'ideas'} yet.
        </p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {filtered.map((idea) => (
            <IdeaRow
              key={idea.id}
              idea={idea}
              tags={tagsMap[idea.id] ?? []}
              taggableEntities={taggableEntities}
              contextFilter={contextFilter}
              onStatusChange={handleStatusChange}
              onTypeToggle={handleTypeToggle}
              onDelete={handleDelete}
              onTag={handleTag}
              onUntag={handleUntag}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// --- Idea Row ---

interface IdeaRowProps {
  idea: Idea
  tags: IdeaTag[]
  taggableEntities: TaggableEntity[]
  contextFilter?: { entityType: IdeaTagEntityType; entityId: string; entityLabel: string }
  onStatusChange: (id: string, status: IdeaStatus) => void
  onTypeToggle: (id: string, currentType: IdeaType) => void
  onDelete: (id: string) => void
  onTag: (ideaId: string, entity: TaggableEntity) => void
  onUntag: (ideaId: string, tagId: string) => void
}

function IdeaRow({ idea, tags, taggableEntities, contextFilter, onStatusChange, onTypeToggle, onDelete, onTag, onUntag }: IdeaRowProps) {
  const [editing, setEditing] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [tagPickerOpen, setTagPickerOpen] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const isLong = idea.text.length > 150

  async function handleSave() {
    const newText = textareaRef.current?.value?.trim()
    if (!newText || newText === idea.text) {
      setEditing(false)
      return
    }
    const result = await updateIdeaText(idea.id, newText)
    if (result.ok) {
      debouncedSaveToast()
    } else {
      toast.error(result.error)
    }
    setEditing(false)
  }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') setEditing(false)
  }

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus()
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [editing])

  const TypeIcon = idea.type === 'question' ? HelpCircle : Lightbulb

  const statusLabel = idea.status === 'captured' ? 'captured'
    : idea.status === 'shelved' ? 'shelved' : 'done'

  const nextStatusAction = idea.status === 'captured'
    ? { label: 'Shelve', status: 'shelved' as IdeaStatus }
    : idea.status === 'shelved'
    ? { label: 'Unshelve', status: 'captured' as IdeaStatus }
    : { label: 'Reopen', status: 'captured' as IdeaStatus }

  const doneAction = idea.status === 'done'
    ? { label: 'Reopen', status: 'captured' as IdeaStatus }
    : { label: 'Done', status: 'done' as IdeaStatus }

  // Filter out already-tagged entities from the picker
  const taggedEntityKeys = new Set(tags.map((t) => `${t.entityType}:${t.entityId}`))

  // Context-link state: is this idea tagged to the context filter entity?
  const contextTag = contextFilter
    ? tags.find((t) => t.entityType === contextFilter.entityType && t.entityId === contextFilter.entityId)
    : undefined
  const showLinkButton = contextFilter && !contextTag

  function handleContextLink() {
    if (!contextFilter) return
    const entity = taggableEntities.find(
      (e) => e.entityType === contextFilter.entityType && e.id === contextFilter.entityId
    )
    if (!entity) {
      // Fallback: synthesise a minimal entity so the tag still saves
      onTag(idea.id, {
        id: contextFilter.entityId,
        name: contextFilter.entityLabel,
        entityType: contextFilter.entityType,
      })
      return
    }
    onTag(idea.id, entity)
  }

  return (
    <div className="group flex gap-3 py-3 px-1">
      {/* Type icon */}
      <button
        type="button"
        onClick={() => onTypeToggle(idea.id, idea.type)}
        className="mt-0.5 shrink-0 text-muted-foreground hover:text-primary transition-colors"
        title={`Switch to ${idea.type === 'idea' ? 'question' : 'idea'}`}
      >
        <TypeIcon className="h-4 w-4" />
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <textarea
            ref={textareaRef}
            defaultValue={idea.text}
            onBlur={handleSave}
            onKeyDown={handleEditKeyDown}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            rows={3}
          />
        ) : (
          <div>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-left text-sm leading-relaxed hover:text-foreground/80 transition-colors cursor-text"
            >
              {isLong && !expanded ? <>{idea.text.slice(0, 150).trimEnd()}...</> : idea.text}
            </button>
            {isLong && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="ml-1 inline-flex items-center gap-0.5 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
              >
                {expanded ? <>Show less <ChevronUp className="h-3 w-3" /></> : <>Show more <ChevronDown className="h-3 w-3" /></>}
              </button>
            )}
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {tags.map((tag) => {
              const Icon = ENTITY_TYPE_ICONS[tag.entityType]
              return (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground"
                >
                  <Icon className="h-3 w-3 opacity-60" />
                  <span className="max-w-[120px] truncate">{tag.entityName ?? tag.entityId.slice(0, 8)}</span>
                  <button
                    type="button"
                    onClick={() => onUntag(idea.id, tag.id)}
                    className="ml-0.5 opacity-40 hover:opacity-100 transition-opacity"
                    title="Remove tag"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )
            })}
          </div>
        )}

        {/* Meta line */}
        <div className="mt-1 flex items-center gap-2 text-[12px] text-muted-foreground">
          <span className={
            idea.status === 'done' ? 'text-success'
            : idea.status === 'shelved' ? 'opacity-60' : ''
          }>
            {statusLabel}
          </span>
          {idea.contextPage && (
            <>
              <span className="opacity-40">&middot;</span>
              <span>from {idea.contextPage}</span>
            </>
          )}
          <span className="opacity-40">&middot;</span>
          <span>{formatRelativeTime(idea.createdAt)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-start gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {showLinkButton && (
          <button
            type="button"
            onClick={handleContextLink}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-[12px] font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            title={`Link to ${contextFilter!.entityLabel}`}
          >
            <Link2 className="h-3.5 w-3.5" />
            Link
          </button>
        )}
        {taggableEntities.length > 0 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setTagPickerOpen(!tagPickerOpen)}
              className="rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="Tag to entity"
            >
              <Tag className="h-3.5 w-3.5" />
            </button>
            {tagPickerOpen && (
              <TagPicker
                entities={taggableEntities}
                excludeKeys={taggedEntityKeys}
                onSelect={(entity) => {
                  onTag(idea.id, entity)
                  setTagPickerOpen(false)
                }}
                onClose={() => setTagPickerOpen(false)}
              />
            )}
          </div>
        )}
        {idea.status !== 'done' && (
          <button
            type="button"
            onClick={() => onStatusChange(idea.id, nextStatusAction.status)}
            className="rounded px-2 py-1 text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {nextStatusAction.label}
          </button>
        )}
        <button
          type="button"
          onClick={() => onStatusChange(idea.id, doneAction.status)}
          className="rounded px-2 py-1 text-[12px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          {doneAction.label}
        </button>
        <button
          type="button"
          onClick={() => onDelete(idea.id)}
          className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Delete idea"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// --- Tag Picker ---

interface TagPickerProps {
  entities: TaggableEntity[]
  excludeKeys: Set<string>
  onSelect: (entity: TaggableEntity) => void
  onClose: () => void
}

function TagPicker({ entities, excludeKeys, onSelect, onClose }: TagPickerProps) {
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  const available = useMemo(() => {
    return entities.filter((e) => {
      if (excludeKeys.has(`${e.entityType}:${e.id}`)) return false
      if (query.trim()) {
        const q = query.toLowerCase()
        return e.name.toLowerCase().includes(q) || ENTITY_TYPE_LABELS[e.entityType].toLowerCase().includes(q)
      }
      return true
    })
  }, [entities, excludeKeys, query])

  // Group by entity type
  const grouped = useMemo(() => {
    const groups: Record<string, TaggableEntity[]> = {}
    for (const e of available) {
      if (!groups[e.entityType]) groups[e.entityType] = []
      groups[e.entityType].push(e)
    }
    return groups
  }, [available])

  return (
    <div
      ref={ref}
      className="absolute right-0 top-8 z-50 w-64 rounded-lg border border-border bg-card shadow-[var(--shadow-raised)] overflow-hidden"
    >
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search entities..."
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
        />
      </div>
      <div className="max-h-[240px] overflow-y-auto py-1">
        {Object.keys(grouped).length === 0 ? (
          <p className="px-3 py-4 text-center text-[12px] text-muted-foreground">
            {entities.length === 0 ? 'No entities to tag to' : 'No matches'}
          </p>
        ) : (
          Object.entries(grouped).map(([type, items]) => {
            const Icon = ENTITY_TYPE_ICONS[type as IdeaTagEntityType]
            return (
              <div key={type}>
                <div className="px-3 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {ENTITY_TYPE_LABELS[type as IdeaTagEntityType]}s
                </div>
                {items.map((entity) => (
                  <button
                    key={entity.id}
                    type="button"
                    onClick={() => onSelect(entity)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-foreground hover:bg-muted transition-colors text-left"
                  >
                    <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{entity.name}</span>
                  </button>
                ))}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// --- Helpers ---

function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
