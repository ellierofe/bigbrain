'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
// DS-07 exception: explicit-submit input form (process-text flow). Not autosave; values
// are submitted as a batch on user action. DS-04 deferred — see existing comment at the
// SourceType select site below.
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ResultsPanel } from './results-panel'
import type { ExtractionResult, CommitResult, SourceType } from '@/lib/types/processing'

const SOURCE_TYPES: { value: SourceType; label: string }[] = [
  { value: 'transcript', label: 'Transcript' },
  { value: 'session-note', label: 'Session note' },
  { value: 'research', label: 'Research' },
  { value: 'voice-note', label: 'Voice note' },
  { value: 'image', label: 'Image' },
  { value: 'email', label: 'Email' },
  { value: 'document', label: 'Document' },
  { value: 'other', label: 'Other' },
]

const CHUNK_WARNING_CHARS = 28_000

interface ProcessInputClientProps {
  brandId: string
}

export function ProcessInputClient({ brandId }: ProcessInputClientProps) {
  const [title, setTitle] = useState('')
  const [sourceType, setSourceType] = useState<SourceType>('transcript')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [text, setText] = useState('')

  const [extracting, setExtracting] = useState(false)
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const tagInputRef = useRef<HTMLInputElement>(null)

  const charCount = text.length
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0
  const isLongText = charCount > CHUNK_WARNING_CHARS
  const canExtract = title.trim().length > 0 && text.trim().length > 0 && !extracting

  // ---------------------------------------------------------------------------
  // Tag handling
  // ---------------------------------------------------------------------------
  function addTag(value: string) {
    const trimmed = value.trim().toLowerCase()
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed])
    }
    setTagInput('')
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag))
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      setTags((prev) => prev.slice(0, -1))
    }
  }

  // ---------------------------------------------------------------------------
  // Extract
  // ---------------------------------------------------------------------------
  async function handleExtract() {
    if (!canExtract) return
    setExtracting(true)

    try {
      const res = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          metadata: {
            title: title.trim(),
            sourceType,
            date: date || undefined,
            tags: tags.length > 0 ? tags : undefined,
            brandId,
          },
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `HTTP ${res.status}`)
      }

      const result: ExtractionResult = await res.json()
      setExtractionResult(result)
      setPanelOpen(true)
    } catch (err) {
      toast.error('Extraction failed — please try again.')
    } finally {
      setExtracting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // After commit success — reset form
  // ---------------------------------------------------------------------------
  function handleCommitSuccess(_commitResult: CommitResult) {
    // Panel stays open showing success state; user clicks "Process another" to reset
  }

  function handlePanelClose() {
    setPanelOpen(false)
    setExtractionResult(null)
    // Reset form when closing after a successful commit
    setTitle('')
    setText('')
    setTags([])
    setDate(new Date().toISOString().slice(0, 10))
  }

  const fieldsLocked = extracting

  return (
    <div className="flex flex-1 gap-0 min-h-0">
      {/* Main area */}
      <div className={`flex flex-col flex-1 gap-4 min-w-0 transition-all ${panelOpen ? 'pr-6' : ''}`}>
        {/* Metadata row */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-3 flex-wrap">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Mastermind hotseat — March 2026"
              disabled={fieldsLocked}
              className="flex-1 min-w-[200px]"
              aria-label="Title"
            />
            {/* DS-04: deferred — toolbar-row context. Whole row needs a labelled-controls
                pattern (Title/SourceType/Date sit as siblings without labels). Keep native
                until the row is redesigned. */}
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value as SourceType)}
              disabled={fieldsLocked}
              className="border border-input rounded-md px-3 py-2 text-sm bg-background text-foreground disabled:opacity-50"
              aria-label="Source type"
            >
              {SOURCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={fieldsLocked}
              className="w-[160px]"
              aria-label="Date"
            />
          </div>

          {/* Tags row */}
          <div
            className="flex flex-wrap items-center gap-1.5 border border-input rounded-md px-3 py-2 min-h-[38px] bg-background cursor-text"
            onClick={() => tagInputRef.current?.focus()}
          >
            {tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 bg-muted text-muted-foreground text-xs rounded px-2 py-0.5"
              >
                {tag}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
                  disabled={fieldsLocked}
                  className="hover:text-foreground"
                  aria-label={`Remove tag ${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              ref={tagInputRef}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={() => tagInput.trim() && addTag(tagInput)}
              placeholder={tags.length === 0 ? 'Add tags — e.g. coaching, client:acme' : ''}
              disabled={fieldsLocked}
              className="flex-1 min-w-[160px] text-sm bg-transparent outline-none placeholder:text-muted-foreground disabled:opacity-50"
              aria-label="Add tag"
            />
          </div>
        </div>

        {/* Textarea */}
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your text here — transcripts, session notes, documents, research…"
          disabled={fieldsLocked}
          className="flex-1 min-h-[480px] font-mono text-sm resize-none"
        />

        {/* Footer row */}
        <div className="flex items-center justify-between">
          <span
            className={`text-xs ${isLongText ? 'text-warning' : 'text-muted-foreground'}`}
            title={isLongText ? 'Long text will be chunked for processing.' : undefined}
          >
            {charCount.toLocaleString()} chars · ~{wordCount.toLocaleString()} words
            {isLongText && ' · Long text will be chunked'}
          </span>

          <button
            onClick={handleExtract}
            disabled={!canExtract}
            className="flex items-center gap-2 rounded-md bg-primary text-primary-foreground text-sm font-medium px-4 py-2 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {extracting ? (
              <>
                <span className="h-3.5 w-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Extracting…
              </>
            ) : (
              'Extract knowledge →'
            )}
          </button>
        </div>
      </div>

      {/* Results panel */}
      {panelOpen && extractionResult && (
        <ResultsPanel
          result={extractionResult}
          onClose={handlePanelClose}
          onCommitSuccess={handleCommitSuccess}
        />
      )}
    </div>
  )
}
