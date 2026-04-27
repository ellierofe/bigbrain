'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Upload, X, FileText, File, Image, Mic, Loader2 } from 'lucide-react'
import { Modal } from '@/components/modal'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface SourceDoc {
  id: string
  title: string
  type: string
  documentDate: string | null
  createdAt: Date
}

const TYPE_ICONS: Record<string, typeof FileText> = {
  transcript: Mic,
  image: Image,
  document: FileText,
  research: File,
}

interface SourceDocPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  brandId: string
  selected: string[]
  onSelect: (ids: string[]) => void
  excludeIds?: string[]
}

export function SourceDocPicker({
  open,
  onOpenChange,
  brandId,
  selected,
  onSelect,
  excludeIds = [],
}: SourceDocPickerProps) {
  const [docs, setDocs] = useState<SourceDoc[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [localSelected, setLocalSelected] = useState<Set<string>>(new Set(selected))
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) return
    setLocalSelected(new Set(selected))
    loadDocs()
  }, [open])

  async function loadDocs() {
    setLoading(true)
    try {
      const params = new URLSearchParams({ brandId })
      if (search) params.set('search', search)
      if (typeFilter) params.set('type', typeFilter)
      const res = await fetch(`/api/sources?${params}`)
      if (res.ok) {
        const data = await res.json()
        setDocs(data.filter((d: SourceDoc) => !excludeIds.includes(d.id)))
      }
    } catch (err) {
      console.error('Failed to load source docs:', err)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(loadDocs, 300)
    return () => clearTimeout(timer)
  }, [search, typeFilter])

  function toggleDoc(id: string) {
    const next = new Set(localSelected)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setLocalSelected(next)
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    for (const file of Array.from(files)) {
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('brandId', brandId)

        const res = await fetch('/api/sources', { method: 'POST', body: formData })
        if (!res.ok) throw new Error('Upload failed')

        const newDoc = await res.json()
        // Add to docs list and auto-select
        setDocs(prev => [newDoc, ...prev])
        setLocalSelected(prev => new Set([...prev, newDoc.id]))
        toast.success(`Uploaded "${newDoc.title}"`)
      } catch (err) {
        toast.error(`Failed to upload "${file.name}"`)
      }
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleConfirm() {
    onSelect(Array.from(localSelected))
    onOpenChange(false)
  }

  const TypeIcon = (type: string) => TYPE_ICONS[type] ?? FileText

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Link Source Documents"
      size="xl"
    >
      <div className="flex flex-col gap-4">
        {/* Search + filter */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by title..."
              className="w-full rounded-md border border-border bg-transparent pl-9 pr-3 py-2 text-sm focus:border-[var(--field-active)]/50 focus:outline-none"
            />
          </div>
          {/* DS-04: deferred — toolbar-row context (search input + type filter sit
              as siblings without labels). Native until the row is redesigned. */}
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="rounded-md border border-border bg-transparent px-3 py-2 text-sm focus:border-[var(--field-active)]/50 focus:outline-none"
          >
            <option value="">All types</option>
            <option value="transcript">Transcript</option>
            <option value="document">Document</option>
            <option value="research">Research</option>
            <option value="image">Image</option>
            <option value="voice-note">Voice note</option>
            <option value="email">Email</option>
          </select>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="application/pdf,image/*,text/*,audio/*,.doc,.docx,.md"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="shrink-0"
          >
            {uploading ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="mr-1 h-3.5 w-3.5" />
            )}
            {uploading ? 'Uploading...' : 'Upload new'}
          </Button>
        </div>

        {/* Selected chips */}
        {localSelected.size > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {Array.from(localSelected).map(id => {
              const doc = docs.find(d => d.id === id)
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium"
                >
                  {doc?.title ?? 'Unknown'}
                  <button
                    type="button"
                    onClick={() => toggleDoc(id)}
                    className="rounded-full p-0.5 hover:bg-primary/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )
            })}
          </div>
        )}

        {/* Doc list */}
        <div className="max-h-[320px] overflow-y-auto rounded-md border border-border">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8">
              <p className="text-sm text-muted-foreground">
                No source documents found.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {docs.map(doc => {
                const Icon = TypeIcon(doc.type)
                const isChecked = localSelected.has(doc.id)
                return (
                  <label
                    key={doc.id}
                    className={`flex items-center gap-3 px-3 py-2.5 transition-colors cursor-pointer ${
                      isChecked ? 'bg-primary/5' : 'hover:bg-muted/50'
                    }`}
                  >
                    {/* DS-04: deferred — row chrome (icon + title + metadata) doesn't fit
                        CheckboxField's mt-0.5 vertical alignment cleanly. Native until
                        the picker row is redesigned. */}
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleDoc(doc.id)}
                      className="shrink-0"
                    />
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{doc.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {doc.type}
                        {doc.documentDate && ` \u00b7 ${doc.documentDate}`}
                      </p>
                    </div>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {localSelected.size} selected
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleConfirm}>
              Link selected
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
