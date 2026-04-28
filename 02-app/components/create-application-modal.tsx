'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Modal } from '@/components/modal'
import { addApplication } from '@/app/actions/tone-of-voice'
import { TOV_FORMAT_OPTIONS, type TovFormatType } from '@/lib/types/tone-of-voice'

interface CreateApplicationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: (
    id: string,
    payload: { label: string; formatType: string; subtype: string | null }
  ) => void
}

export function CreateApplicationModal({
  open,
  onOpenChange,
  onCreated,
}: CreateApplicationModalProps) {
  const [label, setLabel] = useState('')
  const [formatType, setFormatType] = useState<TovFormatType | ''>('')
  const [subtype, setSubtype] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const canSubmit = label.trim().length > 0 && formatType !== '' && !submitting

  function reset() {
    setLabel('')
    setFormatType('')
    setSubtype('')
    setSubmitting(false)
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  async function handleCreate() {
    if (!canSubmit) return
    setSubmitting(true)

    const payload = {
      label: label.trim(),
      formatType,
      subtype: subtype.trim() || null,
    }

    const result = await addApplication(payload)

    if (result.ok && result.data) {
      onCreated?.(result.data, payload)
      handleOpenChange(false)
    } else {
      toast.error(result.ok ? 'Created but no ID returned.' : result.error)
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={handleOpenChange}
      title="New application"
      description="Define a per-format voice shift. You can edit everything else after creating."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={() => handleOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!canSubmit}>
            {submitting ? 'Creating…' : 'Create'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 pt-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Label</label>
          <Input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. LinkedIn posts"
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Format type</label>
          <Select value={formatType} onValueChange={(v) => setFormatType(v as TovFormatType)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a format type" />
            </SelectTrigger>
            <SelectContent>
              {TOV_FORMAT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium">Subtype <span className="text-muted-foreground font-normal">(optional)</span></label>
          <Input
            value={subtype}
            onChange={(e) => setSubtype(e.target.value)}
            placeholder="e.g. linkedin_post"
          />
        </div>

      </div>
    </Modal>
  )
}
