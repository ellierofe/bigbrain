'use client'

import { useState, useEffect } from 'react'
import { FileText, File, Image, Mic, Unlink, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SourceDocPicker } from '@/components/source-doc-picker'

interface SourceDoc {
  id: string
  title: string
  type: string
  documentDate: string | null
  fileSize?: number | null
  extractedText?: string | null
  createdAt: Date
}

const TYPE_ICONS: Record<string, typeof FileText> = {
  transcript: Mic,
  image: Image,
  document: FileText,
  research: File,
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface SourceMaterialsTableProps {
  sourceDocumentIds: string[]
  brandId: string
  onLink: (ids: string[]) => Promise<{ ok: boolean; error?: string }>
  onUnlink: (id: string) => Promise<{ ok: boolean; error?: string }>
}

export function SourceMaterialsTable({
  sourceDocumentIds,
  brandId,
  onLink,
  onUnlink,
}: SourceMaterialsTableProps) {
  const [docs, setDocs] = useState<SourceDoc[]>([])
  const [localIds, setLocalIds] = useState<string[]>(sourceDocumentIds)
  const [loading, setLoading] = useState(true)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Sync when prop changes from server revalidation
  useEffect(() => {
    setLocalIds(sourceDocumentIds)
  }, [sourceDocumentIds.join(',')])

  useEffect(() => {
    loadDocs(localIds)
  }, [localIds.join(',')])

  async function loadDocs(ids: string[]) {
    if (ids.length === 0) {
      setDocs([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams({ brandId })
      const res = await fetch(`/api/sources?${params}`)
      if (res.ok) {
        const all = await res.json()
        setDocs(all.filter((d: SourceDoc) => ids.includes(d.id)))
      }
    } catch (err) {
      console.error('Failed to load source docs:', err)
    }
    setLoading(false)
  }

  async function handleUnlink(id: string) {
    const updated = localIds.filter(i => i !== id)
    setLocalIds(updated)
    setDocs(prev => prev.filter(d => d.id !== id))
    await onUnlink(id)
  }

  async function handleLink(ids: string[]) {
    const merged = [...new Set([...localIds, ...ids])]
    setLocalIds(merged)
    await onLink(merged)
  }

  if (loading) {
    return <div className="py-8 text-center text-sm text-muted-foreground">Loading sources...</div>
  }

  if (docs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <p className="text-sm text-muted-foreground">
          No source documents linked. Link existing sources or upload new ones to provide context for this asset.
        </p>
        <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Link source
        </Button>
        <SourceDocPicker
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          brandId={brandId}
          selected={sourceDocumentIds}
          onSelect={handleLink}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{docs.length} linked</p>
        <Button variant="outline" size="sm" onClick={() => setPickerOpen(true)}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          Link source
        </Button>
      </div>

      <div className="rounded-lg border border-border divide-y divide-border">
        {docs.map(doc => {
          const Icon = TYPE_ICONS[doc.type] ?? FileText
          const isExpanded = expandedId === doc.id

          return (
            <div key={doc.id}>
              <div
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : doc.id)}
              >
                <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {doc.type}
                    {doc.documentDate && ` \u00b7 ${doc.documentDate}`}
                    {doc.fileSize && ` \u00b7 ${formatFileSize(doc.fileSize)}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    handleUnlink(doc.id)
                  }}
                  className="rounded p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  title="Unlink"
                >
                  <Unlink className="h-3.5 w-3.5" />
                </button>
              </div>

              {isExpanded && doc.extractedText && (
                <div className="border-t border-border/50 bg-muted/20 px-4 py-3">
                  <p className="text-xs text-muted-foreground mb-1 font-medium">Extracted text preview</p>
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap line-clamp-6">
                    {doc.extractedText.slice(0, 500)}
                    {doc.extractedText.length > 500 ? '...' : ''}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <SourceDocPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        brandId={brandId}
        selected={localIds}
        onSelect={handleLink}
        excludeIds={localIds}
      />
    </div>
  )
}
