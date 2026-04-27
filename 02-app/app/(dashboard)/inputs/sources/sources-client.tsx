'use client'

import { useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ContentPane } from '@/components/content-pane'
import { EmptyState } from '@/components/empty-state'
import {
  FileText, FileAudio, Mail, Image, File, CheckSquare, Square,
  Inbox, Library, Loader2, Filter, Trash2, X, Eye, Upload,
} from 'lucide-react'
import { toast } from 'sonner'
import type { ProcessingMode } from '@/lib/types/processing'

interface SourceItem {
  id: string
  title: string
  type: string
  extractedText: string | null
  tags: string[] | null
  documentDate: string | null
  inboxStatus: string | null
  processingHistory: unknown
  krispMeetingId: string | null
  createdAt: Date | null
}

interface SourcesClientProps {
  sources: SourceItem[]
  inboxCount: number
  brandId: string
}

const sourceTypeIcons: Record<string, typeof FileText> = {
  transcript: FileAudio,
  'session-note': FileText,
  research: File,
  'voice-note': FileAudio,
  image: Image,
  email: Mail,
  document: FileText,
  other: File,
}

function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function SourcesClient({ sources, inboxCount, brandId }: SourcesClientProps) {
  const router = useRouter()
  const [inboxOnly, setInboxOnly] = useState(inboxCount > 0)
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [processing, setProcessing] = useState(false)
  const [processingMode, setProcessingMode] = useState<ProcessingMode | null>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const filtered = useMemo(() => {
    let items = sources.filter((s) => !deletedIds.has(s.id))
    if (inboxOnly) {
      items = items.filter((s) => s.inboxStatus === 'new')
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter((s) => s.title.toLowerCase().includes(q))
    }
    return items
  }, [sources, deletedIds, inboxOnly, search])

  const allSelected = filtered.length > 0 && filtered.every((s) => selectedIds.has(s.id))
  const previewSource = previewId ? sources.find((s) => s.id === previewId) : null

  function toggleAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((s) => s.id)))
    }
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleDelete(id: string, title: string) {
    setDeletingId(id)
    try {
      const res = await fetch(`/api/sources/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      setDeletedIds((prev) => new Set([...prev, id]))
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(id); return next })
      if (previewId === id) setPreviewId(null)
      toast.success(`Deleted "${title}"`)
    } catch (err) {
      toast.error('Failed to delete source')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleDeleteSelected() {
    const ids = Array.from(selectedIds)
    for (const id of ids) {
      const source = sources.find((s) => s.id === id)
      await handleDelete(id, source?.title ?? 'source')
    }
  }

  async function handleProcess(mode: ProcessingMode) {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    setProcessing(true)
    setProcessingMode(mode)

    try {
      const endpoint = mode === 'individual'
        ? '/api/process/individual'
        : `/api/process/${mode}`

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceIds: ids, brandId }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Processing failed')
      }

      router.push('/inputs/results')
      router.refresh()
    } catch (err) {
      console.error('Processing failed:', err)
      toast.error(err instanceof Error ? err.message : 'Processing failed')
    } finally {
      setProcessing(false)
      setProcessingMode(null)
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    let successCount = 0

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('brandId', brandId)

        const res = await fetch('/api/sources', { method: 'POST', body: formData })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Upload failed')
        }
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

  async function handleTriage() {
    const ids = Array.from(selectedIds)
    if (ids.length === 0) return

    try {
      await fetch('/api/sources/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceIds: ids }),
      })
      router.refresh()
      setSelectedIds(new Set())
    } catch (err) {
      console.error('Triage failed:', err)
    }
  }

  return (
    <div className="flex gap-4 flex-1 min-h-0">
      {/* Main list */}
      <ContentPane className={previewSource ? 'flex-1' : undefined}>
        {/* Filter bar */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => { setInboxOnly(true); setSelectedIds(new Set()) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              inboxOnly
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'bg-muted text-muted-foreground border border-border/40 hover:bg-muted/80'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            Inbox
            {inboxCount > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground text-xs font-semibold px-1.5 py-0.5 rounded-full">
                {inboxCount}
              </span>
            )}
          </button>
          <button
            onClick={() => { setInboxOnly(false); setSelectedIds(new Set()) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              !inboxOnly
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'bg-muted text-muted-foreground border border-border/40 hover:bg-muted/80'
            }`}
          >
            <Library className="w-3.5 h-3.5" />
            All sources
          </button>

          <div className="flex-1" />

          <div className="relative">
            <Filter className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search sources..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-sm rounded-md border border-border/40 bg-background focus:outline-none focus:ring-1 focus:ring-primary/50 w-56"
            />
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="application/pdf,image/*,text/*,audio/*,.doc,.docx,.md"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {uploading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>

        {/* Selection bar */}
        {filtered.length > 0 && (
          <div className="flex items-center gap-3 mb-3 text-sm">
            <button onClick={toggleAll} className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors">
              {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
              {allSelected ? 'Deselect all' : 'Select all'}
            </button>
            {selectedIds.size > 0 && (
              <span className="text-muted-foreground">
                {selectedIds.size} selected
              </span>
            )}
            {selectedIds.size > 0 && inboxOnly && (
              <button
                onClick={handleTriage}
                className="text-xs px-2 py-1 rounded bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
              >
                Mark reviewed
              </button>
            )}
            {selectedIds.size > 0 && (
              <button
                onClick={handleDeleteSelected}
                className="text-xs px-2 py-1 rounded bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Delete
              </button>
            )}
          </div>
        )}

        {/* Source list */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={inboxOnly ? Inbox : Library}
            heading={inboxOnly ? 'Inbox is empty' : 'No sources found'}
            description={
              inboxOnly
                ? 'No new sources. Transcripts from Krisp will appear here automatically.'
                : search ? 'Try a different search term.' : 'No sources have been added yet.'
            }
          />
        ) : (
          <div className="flex flex-col divide-y divide-border/30">
            {filtered.map((source) => {
              const Icon = sourceTypeIcons[source.type] ?? File
              const selected = selectedIds.has(source.id)
              const history = Array.isArray(source.processingHistory) ? source.processingHistory : []
              const isPreviewed = previewId === source.id

              return (
                <div
                  key={source.id}
                  className={`flex items-center gap-3 px-3 py-3 transition-colors ${
                    isPreviewed ? 'bg-muted/60' : selected ? 'bg-primary/5' : 'hover:bg-muted/40'
                  }`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => toggleOne(source.id)}
                    className="shrink-0"
                  >
                    {selected ? (
                      <CheckSquare className="w-4 h-4 text-primary" />
                    ) : (
                      <Square className="w-4 h-4 text-muted-foreground/50" />
                    )}
                  </button>

                  {/* Content — click to preview */}
                  <button
                    onClick={() => setPreviewId(isPreviewed ? null : source.id)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{source.title}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{formatDate(source.documentDate)}</span>
                        {source.tags && source.tags.length > 0 && (
                          <>
                            <span className="text-xs text-muted-foreground/40">·</span>
                            {source.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                {tag}
                              </span>
                            ))}
                            {source.tags.length > 3 && (
                              <span className="text-xs text-muted-foreground">+{source.tags.length - 3}</span>
                            )}
                          </>
                        )}
                        {history.length > 0 && (
                          <>
                            <span className="text-xs text-muted-foreground/40">·</span>
                            <span className="text-xs text-muted-foreground">
                              processed {history.length}×
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    {source.inboxStatus === 'new' && (
                      <span className="w-2 h-2 rounded-full bg-primary mr-1" title="New" />
                    )}
                    <button
                      onClick={() => handleDelete(source.id, source.title)}
                      disabled={deletingId === source.id}
                      className="p-1 rounded text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Delete"
                    >
                      {deletingId === source.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Processing mode picker — sticky bottom bar */}
        {selectedIds.size > 0 && (
          <div className="sticky bottom-0 mt-4 -mx-6 -mb-6 px-6 py-4 bg-card border-t border-border/40 flex items-center gap-3">
            {processing ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                {processingMode === 'individual' && 'Extracting...'}
                {processingMode === 'batch' && 'Running batch analysis...'}
                {processingMode === 'reflective' && 'Running reflective analysis...'}
                {processingMode === 'synthesis' && 'Running project synthesis...'}
              </div>
            ) : (
              <>
                <span className="text-sm text-muted-foreground shrink-0">
                  {selectedIds.size} selected →
                </span>
                <button
                  onClick={() => handleProcess('individual')}
                  className="px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Extract individually
                </button>
                <button
                  onClick={() => handleProcess('batch')}
                  disabled={selectedIds.size < 2}
                  className="px-3 py-1.5 text-sm font-medium rounded-md bg-muted text-foreground hover:bg-muted/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Analyse as batch
                </button>
                <button
                  onClick={() => handleProcess('reflective')}
                  disabled={selectedIds.size < 2}
                  className="px-3 py-1.5 text-sm font-medium rounded-md bg-muted text-foreground hover:bg-muted/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Reflective analysis
                </button>
                <button
                  onClick={() => handleProcess('synthesis')}
                  disabled={selectedIds.size < 2}
                  className="px-3 py-1.5 text-sm font-medium rounded-md bg-muted text-foreground hover:bg-muted/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Synthesise project
                </button>
              </>
            )}
          </div>
        )}
      </ContentPane>

      {/* Preview panel */}
      {previewSource && (
        <ContentPane className="w-[480px] shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-display font-semibold">{previewSource.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDate(previewSource.documentDate)}
                {previewSource.tags && previewSource.tags.length > 0 && ` · ${previewSource.tags.join(', ')}`}
              </p>
            </div>
            <button
              onClick={() => setPreviewId(null)}
              className="p-1 rounded hover:bg-muted transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <div className="overflow-auto flex-1 text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
            {previewSource.extractedText ?? 'No text content available.'}
          </div>
        </ContentPane>
      )}
    </div>
  )
}
