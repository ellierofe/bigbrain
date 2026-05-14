'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Upload, Inbox, Library, ListChecks, Loader2, Tag, Shield, Trash2, FileText } from 'lucide-react'
import { toast } from 'sonner'

import { PageChrome } from '@/components/page-chrome'
import { ContentPane } from '@/components/content-pane'
import { EmptyState } from '@/components/empty-state'
import { ActionButton } from '@/components/action-button'
import { IconButton } from '@/components/icon-button'
import { FilterPillGroup } from '@/components/filter-pill-group'
import { SearchInput } from '@/components/search-input'
import { Modal } from '@/components/modal'
import { SelectField } from '@/components/select-field'
import { SourceListRow } from '@/components/source-list-row'
import { InlineHint } from '@/components/inline-hint'
import { LinkButton } from '@/components/link-button'
import { SectionDivider } from '@/components/section-divider'

import { SourcePreviewPane } from './source-preview-pane'
import { BulkTriageModal, type BulkTriageSource } from './bulk-triage-modal'
import { LensPickerModal } from './lens-picker-modal'
import { PasteTextModal } from './paste-text-modal'
import { ActionMenu } from '@/components/action-menu'

import {
  sourceTypeOptions,
  authorityOptions,
} from '@/lib/source-types'
import { deleteSourceAction } from '@/app/actions/sources'
import type { SourceListFilters, SourceListRowData, PersonSummary } from '@/lib/types/source-list'

const BRAND_ID_PARAM = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

interface SourcesPageClientProps {
  sources: SourceListRowData[]
  inboxCount: number
  brandId: string
  initialFilters: SourceListFilters
}

export function SourcesPageClient({
  sources,
  inboxCount,
  initialFilters,
}: SourcesPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Filter state — synced to URL
  const [inboxStatus, setInboxStatus] = useState<NonNullable<SourceListFilters['inboxStatus']>>(
    initialFilters.inboxStatus ?? 'all',
  )
  const [sourceType, setSourceType] = useState<string>(initialFilters.sourceType ?? '')
  const [authority, setAuthority] = useState<string>(initialFilters.authority ?? '')
  const [search, setSearch] = useState<string>(initialFilters.search ?? '')
  const [searchInFlight, setSearchInFlight] = useState(false)

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [previewId, setPreviewId] = useState<string | null>(null)

  // Modal state
  const [triageOpen, setTriageOpen] = useState(false)
  const [lensOpen, setLensOpen] = useState(false)
  const [lensSourceIds, setLensSourceIds] = useState<string[]>([])
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [pasteOpen, setPasteOpen] = useState(false)

  // Upload state
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)

  // Sync URL with filter state (debounced for search)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    setSearchInFlight(true)
    searchDebounceRef.current = setTimeout(() => {
      const params = new URLSearchParams()
      // Always write inbox explicitly — server only applies the "default to NEW
      // when inboxCount>0" rule when the param is missing (first landing).
      params.set('inbox', inboxStatus)
      if (sourceType) params.set('type', sourceType)
      if (authority) params.set('authority', authority)
      if (search) params.set('q', search)
      router.replace(`/inputs/sources?${params.toString()}`)
      setSearchInFlight(false)
    }, 350)
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [inboxStatus, sourceType, authority, search, router])
  void searchParams // ensure we re-run on URL change

  // Derived
  const filtered = useMemo(() => sources, [sources])
  const allSelected = filtered.length > 0 && filtered.every((s) => selectedIds.has(s.id))
  const selectedSources = useMemo(
    () => sources.filter((s) => selectedIds.has(s.id)),
    [sources, selectedIds],
  )
  const newCountInSelection = selectedSources.filter((s) => s.inboxStatus === 'new').length

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set())
    else setSelectedIds(new Set(filtered.map((s) => s.id)))
  }

  const handlePreview = (id: string) => {
    setPreviewId((curr) => (curr === id ? null : id))
  }

  const handleOpenDetail = (id: string, opts?: { newTab?: boolean }) => {
    if (opts?.newTab) {
      window.open(`/inputs/sources/${id}`, '_blank', 'noopener')
      return
    }
    router.push(`/inputs/sources/${id}`)
  }

  const handleDelete = async (id: string) => {
    const result = await deleteSourceAction(id)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('Source deleted')
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    if (previewId === id) setPreviewId(null)
    router.refresh()
  }

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds)
    let failed = 0
    for (const id of ids) {
      const r = await deleteSourceAction(id)
      if (!r.ok) failed++
    }
    if (failed > 0) toast.error(`${failed} of ${ids.length} deletes failed`)
    else toast.success(`Deleted ${ids.length} source${ids.length > 1 ? 's' : ''}`)
    setSelectedIds(new Set())
    setBulkDeleteOpen(false)
    router.refresh()
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    setUploading(true)
    let successCount = 0
    for (const file of Array.from(files)) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('brandId', BRAND_ID_PARAM)
        const res = await fetch('/api/sources', { method: 'POST', body: formData })
        if (!res.ok) throw new Error('Upload failed')
        successCount++
      } catch (err) {
        toast.error(`Failed to upload "${file.name}"`)
        console.error('Upload error:', err)
      }
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (successCount > 0) {
      toast.success(`${successCount} file${successCount > 1 ? 's' : ''} uploaded`)
      router.refresh()
    }
  }

  const openLensFromPreview = (id: string) => {
    setLensSourceIds([id])
    setLensOpen(true)
  }

  const openLensFromSelection = () => {
    setLensSourceIds(Array.from(selectedIds))
    setLensOpen(true)
  }

  const triageSources: BulkTriageSource[] = selectedSources
    .filter((s) => s.inboxStatus === 'new')
    .map((s) => ({
      id: s.id,
      title: s.title,
      sourceType: s.sourceType,
      authority: s.authority,
      tags: s.tags,
      participantIds: [],
      summaryPreview: s.summaryPreview,
    }))

  const hydratedPeople: PersonSummary[] = []

  const sTypeOpts = useMemo(() => [{ value: '', label: 'All types' }, ...sourceTypeOptions()], [])
  const authOpts = useMemo(() => [{ value: '', label: 'All authorities' }, ...authorityOptions()], [])

  const filterPillOptions = [
    {
      value: 'new',
      label: 'NEW',
      icon: Inbox,
      count: inboxCount > 0 ? inboxCount : undefined,
    },
    { value: 'all', label: 'All' },
    { value: 'triaged', label: 'Triaged' },
  ]

  const previewSource = previewId ? sources.find((s) => s.id === previewId) : null
  // Close preview if its source is no longer in the list
  useEffect(() => {
    if (previewId && !sources.some((s) => s.id === previewId)) setPreviewId(null)
  }, [previewId, sources])

  return (
    <div className="flex flex-col h-full">
      <PageChrome
        title="Sources"
        subtitle="Everything you've fed BigBrain"
        action={
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="application/pdf,image/*,text/*,audio/*,.doc,.docx,.md"
              onChange={handleFileUpload}
              className="hidden"
            />
            <ActionMenu
              trigger={
                <ActionButton icon={Upload} loading={uploading}>
                  {uploading ? 'Uploading…' : 'New source'}
                </ActionButton>
              }
              items={[
                {
                  type: 'action',
                  label: 'Upload file…',
                  icon: Upload,
                  onClick: () => fileInputRef.current?.click(),
                },
                {
                  type: 'action',
                  label: 'Paste text…',
                  icon: FileText,
                  onClick: () => setPasteOpen(true),
                },
              ]}
            />
          </>
        }
      />

      <div className="flex gap-4 flex-1 min-h-0">
        <ContentPane className={previewSource ? 'flex-1 min-w-0' : undefined}>
          {/* Filter strip */}
          <div className="flex flex-col gap-3 pb-4">
            <div className="flex items-center justify-between gap-3">
              <FilterPillGroup
                value={inboxStatus}
                onChange={(v) => {
                  setInboxStatus(v as typeof inboxStatus)
                  setSelectedIds(new Set())
                }}
                options={filterPillOptions}
              />
              {searchInFlight && (
                <InlineHint align="right">
                  <Loader2 className="w-3 h-3 animate-spin inline-block mr-1" />
                  Updating…
                </InlineHint>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="w-44">
                <SelectField
                  label="Source type"
                  icon={Tag}
                  value={sourceType}
                  options={sTypeOpts}
                  onSave={async (v) => {
                    setSourceType(v)
                    return { ok: true }
                  }}
                />
              </div>
              <div className="w-44">
                <SelectField
                  label="Authority"
                  icon={Shield}
                  value={authority}
                  options={authOpts}
                  onSave={async (v) => {
                    setAuthority(v)
                    return { ok: true }
                  }}
                />
              </div>
              <div className="flex-1 max-w-md">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Search by title, summary, or tag…"
                />
              </div>
            </div>
          </div>
          <SectionDivider />

          {/* Selection bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 mb-3 mt-3">
              <LinkButton tone="muted" onClick={toggleAll}>
                {allSelected ? 'Deselect all' : 'Select all'}
              </LinkButton>
              <InlineHint align="left">{selectedIds.size} selected</InlineHint>
              <div className="flex-1" />
              <ActionButton
                icon={ListChecks}
                onClick={() => setTriageOpen(true)}
                disabled={newCountInSelection === 0}
                tooltip={
                  newCountInSelection === 0
                    ? 'Triage applies to NEW sources only'
                    : undefined
                }
              >
                Triage
              </ActionButton>
              <ActionButton variant="outline" onClick={openLensFromSelection}>
                Run lens
              </ActionButton>
              <IconButton
                icon={Trash2}
                label="Delete"
                tooltip="Delete selected"
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeleteOpen(true)}
              />
              <LinkButton tone="muted" onClick={() => setSelectedIds(new Set())}>
                Clear
              </LinkButton>
            </div>
          )}

          {/* List */}
          {filtered.length === 0 ? (
            <EmptyState
              icon={inboxStatus === 'new' ? Inbox : Library}
              heading={
                inboxStatus === 'new'
                  ? 'Inbox is clear'
                  : sources.length === 0 && !search && !sourceType && !authority
                    ? 'No sources yet'
                    : 'No matches'
              }
              description={
                inboxStatus === 'new'
                  ? 'Nothing to show here. Try a different filter or add new source materials.'
                  : sources.length === 0
                    ? 'Upload a transcript, document, or paste text to get started.'
                    : 'Try a different filter or search term.'
              }
            />
          ) : (
            <div className="flex flex-col">
              {filtered.map((source) => (
                <SourceListRow
                  key={source.id}
                  source={source}
                  selected={selectedIds.has(source.id)}
                  previewing={previewId === source.id}
                  onToggleSelect={toggleOne}
                  onPreview={handlePreview}
                  onOpenDetail={handleOpenDetail}
                  onDelete={(id) => {
                    const s = sources.find((x) => x.id === id)
                    if (s) setDeleteConfirm({ id, title: s.title })
                  }}
                />
              ))}
            </div>
          )}

          {/* Footer count */}
          {filtered.length > 0 && (
            <InlineHint className="mt-4" align="left">
              {filtered.length} source{filtered.length === 1 ? '' : 's'} · {inboxCount} new
            </InlineHint>
          )}
        </ContentPane>

        {/* Preview pane */}
        {previewSource && (
          <SourcePreviewPane
            sourceId={previewSource.id}
            onClose={() => setPreviewId(null)}
            onRunLens={openLensFromPreview}
          />
        )}
      </div>

      {/* Modals */}
      <BulkTriageModal
        open={triageOpen}
        onOpenChange={setTriageOpen}
        sources={triageSources}
        hydratedPeople={hydratedPeople}
      />

      <LensPickerModal
        open={lensOpen}
        onOpenChange={setLensOpen}
        sources={lensSourceIds
          .map((id) => sources.find((s) => s.id === id))
          .filter((s): s is SourceListRowData => !!s)
          .map((s) => ({ id: s.id, title: s.title, sourceType: s.sourceType }))}
      />

      <PasteTextModal open={pasteOpen} onOpenChange={setPasteOpen} />

      {deleteConfirm && (
        <Modal
          open={!!deleteConfirm}
          onOpenChange={(o) => !o && setDeleteConfirm(null)}
          title="Delete source?"
          description={`This will permanently delete "${deleteConfirm.title}", its chunks, and break any lens-report references. This cannot be undone.`}
          footer={
            <>
              <ActionButton variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </ActionButton>
              <ActionButton
                variant="destructive"
                onClick={async () => {
                  const id = deleteConfirm.id
                  setDeleteConfirm(null)
                  await handleDelete(id)
                }}
              >
                Delete
              </ActionButton>
            </>
          }
        >
          <div />
        </Modal>
      )}

      {bulkDeleteOpen && (
        <Modal
          open={bulkDeleteOpen}
          onOpenChange={setBulkDeleteOpen}
          title={`Delete ${selectedIds.size} source${selectedIds.size > 1 ? 's' : ''}?`}
          description="This will permanently delete the selected sources, their chunks, and break any lens-report references. This cannot be undone."
          footer={
            <>
              <ActionButton variant="outline" onClick={() => setBulkDeleteOpen(false)}>
                Cancel
              </ActionButton>
              <ActionButton variant="destructive" onClick={handleBulkDelete}>
                Delete
              </ActionButton>
            </>
          }
        >
          <div />
        </Modal>
      )}
    </div>
  )
}
