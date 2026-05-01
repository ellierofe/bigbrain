'use client'

import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from 'react'
import { Paperclip, ArrowUp, X, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { parseSlashCommand } from '@/lib/chat/slash-command'

interface ChatInputProps {
  onSend: (text: string, files?: File[]) => void
  onStop?: () => void
  isStreaming?: boolean
  disabled?: boolean
  compact?: boolean
  placeholder?: string
  /** Externally-set value (e.g. from prompt starters). Populates input without sending. */
  pendingValue?: string
  onPendingValueConsumed?: () => void
  /**
   * Optional slash-command interceptor. Returns true if the command was
   * handled (e.g. attached a skill, opened a confirm modal); the input is
   * cleared and onSend is NOT called. Returning false (or undefined) lets
   * the message flow through as a normal chat turn.
   */
  onSlashCommand?: (skillId: string) => boolean | Promise<boolean>
}

export function ChatInput({
  onSend,
  onStop,
  isStreaming,
  disabled,
  pendingValue,
  onPendingValueConsumed,
  compact,
  placeholder = 'Ask BigBrain anything...',
  onSlashCommand,
}: ChatInputProps) {
  const [text, setText] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Accept externally-set value (e.g. from prompt starters)
  useEffect(() => {
    if (pendingValue) {
      setText(pendingValue)
      onPendingValueConsumed?.()
      // Focus the textarea
      setTimeout(() => textareaRef.current?.focus(), 0)
    }
  }, [pendingValue, onPendingValueConsumed])

  const handleSend = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed && files.length === 0) return

    // Slash-command interception (no popover — pure parse-on-submit).
    if (onSlashCommand && files.length === 0) {
      const parsed = parseSlashCommand(trimmed)
      if (parsed) {
        const handled = await onSlashCommand(parsed.skillId)
        if (handled) {
          setText('')
          if (textareaRef.current) textareaRef.current.style.height = 'auto'
          return
        }
        // handled === false → fall through and send as normal chat turn.
      }
    }

    onSend(trimmed, files.length > 0 ? files : undefined)
    setText('')
    setFiles([])
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [text, files, onSend, onSlashCommand])

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isStreaming && !disabled) {
        void handleSend()
      }
    }
  }

  const handleInput = () => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    const maxHeight = compact ? 80 : 120
    ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`
  }

  const handleFileSelect = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files
    if (!selected) return

    const validFiles: File[] = []
    for (let i = 0; i < selected.length; i++) {
      const file = selected[i]
      if (file.size > 10 * 1024 * 1024) continue // Skip >10MB
      if (!file.type.startsWith('image/')) continue // Images only in v1
      validFiles.push(file)
    }
    setFiles((prev) => [...prev, ...validFiles])
    e.target.value = '' // Reset so same file can be re-selected
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const hasContent = text.trim().length > 0 || files.length > 0
  const radius = compact ? 'rounded-lg' : 'rounded-xl'

  return (
    <div className={compact ? '' : 'max-w-3xl mx-auto w-full'}>
      <div
        className={`border border-border ${radius} bg-card shadow-[var(--shadow-pane)] overflow-hidden`}
      >
        {/* Image previews */}
        {files.length > 0 && (
          <div className="flex gap-2 px-3 pt-3 flex-wrap">
            {files.map((file, i) => (
              <div key={i} className="relative group">
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="h-12 w-12 rounded-md object-cover border border-border"
                />
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-foreground text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2 px-3 py-2">
          {/* Attach button */}
          <button
            type="button"
            onClick={handleFileSelect}
            className="shrink-0 mb-0.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Attach image"
          >
            <Paperclip className="h-4 w-4" />
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isStreaming || disabled}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
            style={{ minHeight: '24px' }}
          />

          {/* Send / Stop button */}
          {isStreaming ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onStop}
              className="h-7 w-7 shrink-0 rounded-full"
              aria-label="Stop generating"
            >
              <Square className="h-3 w-3" />
            </Button>
          ) : (
            <Button
              size="icon"
              onClick={() => void handleSend()}
              disabled={!hasContent || disabled}
              className={`h-7 w-7 shrink-0 rounded-full transition-colors ${
                hasContent && !disabled
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
              aria-label="Send message"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      {!compact && (
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          BigBrain can make mistakes. Verify important info.
        </p>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}
