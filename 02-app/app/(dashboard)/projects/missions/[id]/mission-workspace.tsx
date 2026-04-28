'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Compass,
  ChevronLeft,
  X,
  Plus,
  Search,
  Loader2,
  FileText,
  BarChart3,
  Users,
} from 'lucide-react'
import { ContentPane } from '@/components/content-pane'
import { SectionCard } from '@/components/section-card'
import { IdeasPanel } from '@/components/ideas-panel'
import { StatusBadge } from '@/components/status-badge'
import { ActionButton } from '@/components/action-button'
// DS-07 exception: search input inside typeahead popover (lines 429, 570) and thesis Textarea
// (line 223 — pending InlineField textarea migration). category-section-style typeahead is its own
// pattern; not part of DS-07 scope.
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  saveMissionField,
  changeMissionPhase,
  addVertical,
  removeVertical,
  createAndLinkVertical,
  findVerticals,
  linkContactToMission,
  unlinkContactFromMission,
  linkInputToMission,
  unlinkInputFromMission,
  linkStatToMission,
  unlinkStatFromMission,
  searchContactsForMission,
  searchInputsForMission,
  searchStatsForMission,
} from '@/app/actions/missions'
import type {
  MissionDetail,
  MissionPhase,
  MissionVertical,
  MissionLinkedContact,
  MissionLinkedInput,
  MissionLinkedStat,
} from '@/lib/types/missions'
import type { StatusOption } from '@/components/status-badge'
import type { Idea, IdeaTag } from '@/lib/types/ideas'
import type { TaggableEntity } from '@/lib/db/queries/taggable-entities'

const PHASE_OPTIONS: StatusOption[] = [
  { value: 'exploring', label: 'Exploring', hue: 1 },
  { value: 'synthesising', label: 'Synthesising', hue: 2 },
  { value: 'producing', label: 'Producing', hue: 3 },
  { value: 'complete', label: 'Complete', hue: 4 },
  { value: 'paused', label: 'Paused', hue: 5 },
]

interface MissionWorkspaceProps {
  mission: MissionDetail
  verticals: MissionVertical[]
  linkedContacts: MissionLinkedContact[]
  linkedInputs: MissionLinkedInput[]
  linkedStats: MissionLinkedStat[]
  allIdeas: Idea[]
  ideasTagsMap: Record<string, IdeaTag[]>
  taggableEntities: TaggableEntity[]
}

export function MissionWorkspace({
  mission,
  verticals: initialVerticals,
  linkedContacts: initialContacts,
  linkedInputs: initialInputs,
  linkedStats: initialStats,
  allIdeas,
  ideasTagsMap,
  taggableEntities,
}: MissionWorkspaceProps) {
  const router = useRouter()

  // Local state for optimistic updates
  const [name, setName] = useState(mission.name)
  const [thesis, setThesis] = useState(mission.thesis || '')
  const [phase, setPhase] = useState<MissionPhase>(mission.phase)
  const [verticals, setVerticals] = useState(initialVerticals)
  const [contacts, setContacts] = useState(initialContacts)
  const [inputs, setInputs] = useState(initialInputs)
  const [stats, setStats] = useState(initialStats)

  // Save indicators
  const [nameSaveState, setNameSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')
  const [thesisSaveState, setThesisSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')

  const nameTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const thesisTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Autosave name
  const saveName = useCallback(async (value: string) => {
    setNameSaveState('saving')
    const result = await saveMissionField(mission.id, 'name', value)
    if (result.ok) {
      setNameSaveState('saved')
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
      savedTimeoutRef.current = setTimeout(() => setNameSaveState('idle'), 2000)
    } else {
      setNameSaveState('failed')
    }
  }, [mission.id])

  const handleNameChange = (value: string) => {
    setName(value)
    if (nameTimeoutRef.current) clearTimeout(nameTimeoutRef.current)
    nameTimeoutRef.current = setTimeout(() => saveName(value), 500)
  }

  // Autosave thesis
  const saveThesis = useCallback(async (value: string) => {
    setThesisSaveState('saving')
    const result = await saveMissionField(mission.id, 'thesis', value || null)
    if (result.ok) {
      setThesisSaveState('saved')
      if (savedTimeoutRef.current) clearTimeout(savedTimeoutRef.current)
      savedTimeoutRef.current = setTimeout(() => setThesisSaveState('idle'), 2000)
    } else {
      setThesisSaveState('failed')
    }
  }, [mission.id])

  const handleThesisBlur = () => {
    if (thesisTimeoutRef.current) clearTimeout(thesisTimeoutRef.current)
    saveThesis(thesis)
  }

  // Phase change
  const handlePhaseChange = async (newPhase: string) => {
    const previous = phase
    setPhase(newPhase as MissionPhase) // optimistic
    const result = await changeMissionPhase(mission.id, newPhase as MissionPhase)
    if (!result.ok) {
      setPhase(previous)
      return result
    }
    return { ok: true as const }
  }

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <Compass className="mt-1.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Link href="/projects/missions" className="hover:text-foreground transition-colors">
                <ChevronLeft className="h-3.5 w-3.5 inline -mt-px" />
                Missions
              </Link>
            </div>
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full bg-transparent text-xl font-semibold tracking-tight text-foreground outline-none placeholder:text-muted-foreground"
              placeholder="Mission name"
            />
            {nameSaveState === 'saved' && (
              <span className="text-[10px] text-success ml-2">Saved</span>
            )}
            {nameSaveState === 'failed' && (
              <span className="text-[10px] text-destructive ml-2">Failed</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Phase selector */}
          <StatusBadge
            status={phase}
            onChange={handlePhaseChange}
            options={PHASE_OPTIONS}
          />
        </div>
      </div>

      {/* Content */}
      <ContentPane>
        <div className="space-y-6 max-w-3xl">
          {/* Thesis */}
          <SectionCard
            title="Thesis"
            action={
              <>
                {thesisSaveState === 'saved' && (
                  <span className="text-[10px] text-success">Saved</span>
                )}
                {thesisSaveState === 'failed' && (
                  <span className="text-[10px] text-destructive">Failed</span>
                )}
              </>
            }
          >
            <Textarea
              value={thesis}
              onChange={(e) => setThesis(e.target.value)}
              onBlur={handleThesisBlur}
              placeholder="What question are you investigating?"
              rows={3}
              className="resize-none border-border/60"
            />
          </SectionCard>

          {/* Verticals */}
          <VerticalsSection
            missionId={mission.id}
            verticals={verticals}
            onUpdate={setVerticals}
          />

          {/* Linked Contacts */}
          <LinkedSection
            title="Linked Contacts"
            icon={Users}
            items={contacts}
            emptyText="No contacts linked. Link people involved in this investigation."
            renderRow={(item: MissionLinkedContact) => (
              <>
                <span className="text-sm font-medium text-foreground">{item.name}</span>
                <span className="text-xs text-muted-foreground">{item.role || '—'}</span>
                <span className="text-xs text-muted-foreground">{item.organisation || '—'}</span>
              </>
            )}
            searchFn={(q) => searchContactsForMission(mission.id, q)}
            renderSearchResult={(item: MissionLinkedContact) => (
              <span>{item.name}{item.organisation ? ` — ${item.organisation}` : ''}</span>
            )}
            onLink={async (item: MissionLinkedContact) => {
              setContacts((prev) => [...prev, item])
              await linkContactToMission(mission.id, item.id)
            }}
            onUnlink={async (item: MissionLinkedContact) => {
              setContacts((prev) => prev.filter((c) => c.id !== item.id))
              await unlinkContactFromMission(mission.id, item.id)
            }}
          />

          {/* Linked Inputs */}
          <LinkedSection
            title="Linked Inputs"
            icon={FileText}
            items={inputs}
            emptyText="No inputs linked. Tag source documents to scope them to this mission."
            renderRow={(item: MissionLinkedInput) => (
              <>
                <span className="text-sm font-medium text-foreground">{item.title}</span>
                <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide bg-muted text-muted-foreground`}>
                  {item.type}
                </span>
                <span className="text-xs text-muted-foreground">
                  {item.documentDate
                    ? new Date(item.documentDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '—'}
                </span>
              </>
            )}
            searchFn={(q) => searchInputsForMission(mission.id, q)}
            renderSearchResult={(item: MissionLinkedInput) => (
              <span>{item.title}</span>
            )}
            onLink={async (item: MissionLinkedInput) => {
              setInputs((prev) => [...prev, item])
              await linkInputToMission(mission.id, item.id)
            }}
            onUnlink={async (item: MissionLinkedInput) => {
              setInputs((prev) => prev.filter((i) => i.id !== item.id))
              await unlinkInputFromMission(mission.id, item.id)
            }}
          />

          {/* Linked Stats */}
          <LinkedSection
            title="Linked Stats"
            icon={BarChart3}
            items={stats}
            emptyText="No stats linked yet."
            renderRow={(item: MissionLinkedStat) => (
              <>
                <span className="text-sm text-foreground max-w-[300px] truncate">{item.stat}</span>
                <span className="text-xs text-muted-foreground">{item.source}</span>
                <span className="text-xs text-muted-foreground">{item.sourceYear || '—'}</span>
              </>
            )}
            searchFn={(q) => searchStatsForMission(mission.id, q)}
            renderSearchResult={(item: MissionLinkedStat) => (
              <span className="truncate">{item.stat}</span>
            )}
            onLink={async (item: MissionLinkedStat) => {
              setStats((prev) => [...prev, item])
              await linkStatToMission(mission.id, item.id)
            }}
            onUnlink={async (item: MissionLinkedStat) => {
              setStats((prev) => prev.filter((s) => s.id !== item.id))
              await unlinkStatFromMission(mission.id, item.id)
            }}
          />

          {/* Ideas & Questions */}
          <IdeasPanel
            entityType="mission"
            entityId={mission.id}
            entityLabel="this mission"
            allIdeas={allIdeas}
            tagsMap={ideasTagsMap}
            taggableEntities={taggableEntities}
          />

          <SectionCard title="Linked Content">
            <p className="py-4 text-center text-sm text-muted-foreground">
              Content linking coming with the content registry.
            </p>
          </SectionCard>
        </div>
      </ContentPane>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Verticals section (chips + combobox)
// ---------------------------------------------------------------------------

function VerticalsSection({
  missionId,
  verticals,
  onUpdate,
}: {
  missionId: string
  verticals: MissionVertical[]
  onUpdate: (v: MissionVertical[]) => void
}) {
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<MissionVertical[]>([])
  const [showDropdown, setShowDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!search.trim()) {
      setResults([])
      return
    }
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(async () => {
      const found = await findVerticals(search)
      const currentIds = new Set(verticals.map((v) => v.id))
      setResults(found.filter((v) => !currentIds.has(v.id)))
    }, 200)
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current) }
  }, [search, verticals])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleSelect = async (vertical: MissionVertical) => {
    onUpdate([...verticals, vertical])
    setSearch('')
    setShowDropdown(false)
    await addVertical(missionId, vertical.id)
  }

  const handleCreate = async () => {
    const trimmed = search.trim()
    if (!trimmed) return
    setSearch('')
    setShowDropdown(false)
    const result = await createAndLinkVertical(missionId, trimmed)
    if (result.ok) {
      onUpdate([...verticals, { id: result.data.id, name: trimmed }])
    }
  }

  const handleRemove = async (verticalId: string) => {
    onUpdate(verticals.filter((v) => v.id !== verticalId))
    await removeVertical(missionId, verticalId)
  }

  const showCreateOption = search.trim() &&
    !results.some((v) => v.name.toLowerCase() === search.trim().toLowerCase()) &&
    !verticals.some((v) => v.name.toLowerCase() === search.trim().toLowerCase())

  return (
    <SectionCard
      title="Verticals"
      action={
        <div className="relative" ref={dropdownRef}>
          <ActionButton icon={Plus} variant="outline" onClick={() => setShowDropdown(!showDropdown)}>
            Add
          </ActionButton>
          {showDropdown && (
            <div className="absolute right-0 top-full mt-1 w-64 rounded-md border bg-card shadow-[var(--shadow-raised)] z-10">
              <div className="p-2">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search or create..."
                  autoFocus
                  className="h-8 text-sm"
                />
              </div>
              {(results.length > 0 || showCreateOption) && (
                <div className="max-h-36 overflow-auto border-t">
                  {results.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => handleSelect(v)}
                      className="w-full px-3 py-1.5 text-left text-sm hover:bg-muted/50 transition-colors"
                    >
                      {v.name}
                    </button>
                  ))}
                  {showCreateOption && (
                    <button
                      onClick={handleCreate}
                      className="w-full px-3 py-1.5 text-left text-sm text-primary hover:bg-muted/50 transition-colors border-t"
                    >
                      + Create &ldquo;{search.trim()}&rdquo;
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      }
    >
      {verticals.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">
          No verticals tagged. Add sectors to help organise this investigation.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {verticals.map((v) => (
            <span
              key={v.id}
              className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground"
            >
              {v.name}
              <button
                onClick={() => handleRemove(v.id)}
                className="rounded-full p-0.5 hover:bg-foreground/10 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

// ---------------------------------------------------------------------------
// Generic linked section (contacts, inputs, stats)
// ---------------------------------------------------------------------------

interface LinkedSectionProps<T extends { id: string }> {
  title: string
  icon: React.ComponentType<{ className?: string }>
  items: T[]
  emptyText: string
  renderRow: (item: T) => React.ReactNode
  searchFn: (query: string) => Promise<T[]>
  renderSearchResult: (item: T) => React.ReactNode
  onLink: (item: T) => Promise<void>
  onUnlink: (item: T) => Promise<void>
}

function LinkedSection<T extends { id: string }>({
  title,
  icon: Icon,
  items,
  emptyText,
  renderRow,
  searchFn,
  renderSearchResult,
  onLink,
  onUnlink,
}: LinkedSectionProps<T>) {
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<T[]>([])
  const [searching, setSearching] = useState(false)
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(async () => {
      const results = await searchFn(searchQuery)
      setSearchResults(results)
      setSearching(false)
    }, 300)
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current) }
  }, [searchQuery, searchFn])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSearch(false)
        setSearchQuery('')
        setSearchResults([])
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleLink = async (item: T) => {
    setShowSearch(false)
    setSearchQuery('')
    setSearchResults([])
    await onLink(item)
  }

  return (
    <SectionCard
      title={title}
      action={
        <div className="relative" ref={dropdownRef}>
          <ActionButton icon={Plus} variant="outline" onClick={() => setShowSearch(!showSearch)}>
            Link
          </ActionButton>
          {showSearch && (
            <div className="absolute right-0 top-full mt-1 w-80 rounded-md border bg-card shadow-[var(--shadow-raised)] z-10">
              <div className="p-2 flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  autoFocus
                  className="h-8 text-sm border-0 p-0 focus-visible:ring-0"
                />
                {searching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
              </div>
              {searchResults.length > 0 && (
                <div className="max-h-48 overflow-auto border-t">
                  {searchResults.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleLink(item)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors"
                    >
                      {renderSearchResult(item)}
                    </button>
                  ))}
                </div>
              )}
              {searchQuery.trim() && !searching && searchResults.length === 0 && (
                <div className="px-3 py-3 text-center text-xs text-muted-foreground border-t">
                  No results found.
                </div>
              )}
            </div>
          )}
        </div>
      }
    >
      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <div className="divide-y divide-border">
          {items.map((item) => (
            <div
              key={item.id}
              className="group flex items-center justify-between gap-3 py-2.5"
            >
              <div className="flex items-center gap-4 min-w-0 flex-1">
                {renderRow(item)}
              </div>
              <button
                onClick={() => onUnlink(item)}
                className="opacity-0 group-hover:opacity-100 rounded p-1 hover:bg-muted transition-all shrink-0"
                title="Unlink"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}
