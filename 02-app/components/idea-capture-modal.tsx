'use client'

import { useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Lightbulb, HelpCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { createIdea, tagIdeaAction } from '@/app/actions/ideas'
import type { IdeaType, IdeaTagEntityType } from '@/lib/types/ideas'

interface IdeaCaptureModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, the captured idea is immediately tagged to this entity */
  autoTag?: { entityType: IdeaTagEntityType; entityId: string; entityLabel?: string }
  /** Called after a successful capture so the parent can refresh its view */
  onCaptured?: () => void
}

export function IdeaCaptureModal({ open, onOpenChange, autoTag, onCaptured }: IdeaCaptureModalProps) {
  const textRef = useRef<HTMLTextAreaElement>(null)
  const pathname = usePathname()
  const [type, setType] = useState<IdeaType>('idea')
  const [saving, setSaving] = useState(false)

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setType('idea')
      if (textRef.current) textRef.current.value = ''
    }
    onOpenChange(nextOpen)
  }

  async function handleCapture() {
    const text = textRef.current?.value?.trim()
    if (!text || saving) return

    setSaving(true)
    try {
      const result = await createIdea({ text, type, contextPage: pathname })
      if (result.ok && autoTag) {
        await tagIdeaAction(result.data.id, autoTag.entityType, autoTag.entityId)
      }
      if (textRef.current) textRef.current.value = ''
      setType('idea')
      onCaptured?.()
      onOpenChange(false)
    } catch {
      // Server action returns ActionResult; network errors swallowed
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleCapture()
    }
  }

  const description = autoTag?.entityLabel
    ? `This will be tagged to ${autoTag.entityLabel}.`
    : 'Jot it down. You can triage it later in Inputs → Ideas.'

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Capture idea</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setType('idea')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
              type === 'idea'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            <Lightbulb className="h-3.5 w-3.5" />
            Idea
          </button>
          <button
            type="button"
            onClick={() => setType('question')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
              type === 'question'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            <HelpCircle className="h-3.5 w-3.5" />
            Question
          </button>
        </div>

        <Textarea
          ref={textRef}
          placeholder="What's on your mind?"
          className="min-h-[100px] resize-none"
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <DialogFooter>
          <Button onClick={handleCapture} size="sm" disabled={saving}>
            {saving ? 'Saving...' : 'Capture'}
            {!saving && <kbd className="ml-2 text-[10px] opacity-50">⌘↵</kbd>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
