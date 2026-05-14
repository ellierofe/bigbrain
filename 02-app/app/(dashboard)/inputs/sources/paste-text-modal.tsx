'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Modal } from '@/components/modal'
import { ActionButton } from '@/components/action-button'
import { SelectField } from '@/components/select-field'
import { PlainTextField } from '@/components/plain-text-field'
import { InlineHint } from '@/components/inline-hint'
import { sourceTypeOptions } from '@/lib/source-types'
import { createSourceFromTextAction } from '@/app/actions/sources'
import type { SourceType } from '@/lib/types/lens'

interface PasteTextModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DEFAULT_TYPE: SourceType = 'internal-notes'

export function PasteTextModal({ open, onOpenChange }: PasteTextModalProps) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [sourceType, setSourceType] = useState<SourceType>(DEFAULT_TYPE)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const charCount = text.length
  const canSubmit = title.trim().length > 0 && text.trim().length > 0 && !submitting

  const handleClose = () => {
    if (submitting) return
    setTitle('')
    setSourceType(DEFAULT_TYPE)
    setText('')
    onOpenChange(false)
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    const result = await createSourceFromTextAction({ title, sourceType, text })
    setSubmitting(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('Source created — ingest running in background')
    setTitle('')
    setText('')
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleClose}
      title="Paste text"
      description="Create a source from pasted text. Source type defaults to internal notes — you can change it after ingest."
      size="2xl"
      footer={
        <>
          <ActionButton variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </ActionButton>
          <ActionButton onClick={handleSubmit} disabled={!canSubmit} loading={submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin mr-1" /> Creating…
              </>
            ) : (
              'Create source'
            )}
          </ActionButton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <PlainTextField
          label="Title"
          value={title}
          onChange={setTitle}
          placeholder="e.g. Sprint retro — 14 May"
          disabled={submitting}
        />

        <div className="w-64">
          <SelectField
            label="Source type"
            value={sourceType}
            options={sourceTypeOptions()}
            onSave={async (v) => {
              setSourceType(v as SourceType)
              return { ok: true }
            }}
          />
        </div>

        <div className="flex flex-col gap-1">
          <PlainTextField
            variant="textarea"
            label="Text"
            value={text}
            onChange={setText}
            placeholder="Paste your notes, transcript, or thinking here…"
            rows={12}
            disabled={submitting}
          />
          <InlineHint align="right">{charCount.toLocaleString()} characters</InlineHint>
        </div>
      </div>
    </Modal>
  )
}
