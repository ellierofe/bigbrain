'use client'

import { useState, useRef, useCallback } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface InlineFieldBaseProps {
  value: string | null
  onSave: (value: string) => Promise<{ ok: boolean; error?: string }>
  label: string
  placeholder?: string
  icon?: LucideIcon
  className?: string
  /** debounce delay after blur before save fires, default 500ms */
  debounceMs?: number
}

interface InlineInputProps extends InlineFieldBaseProps {
  variant: 'input'
}

interface InlineTextareaProps extends InlineFieldBaseProps {
  variant: 'textarea'
  rows?: number
}

type InlineFieldProps = InlineInputProps | InlineTextareaProps

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function InlineField(props: InlineFieldProps) {
  const { value, onSave, label, placeholder, icon: Icon, className, debounceMs = 500 } = props

  const [localValue, setLocalValue] = useState(value ?? '')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedValueRef = useRef(value ?? '')

  const triggerSave = useCallback(
    (val: string) => {
      if (val === savedValueRef.current) return

      if (timerRef.current) clearTimeout(timerRef.current)

      timerRef.current = setTimeout(async () => {
        setSaveState('saving')
        setErrorMsg(null)
        const result = await onSave(val)
        if (result.ok) {
          savedValueRef.current = val
          setSaveState('saved')
          setTimeout(() => setSaveState('idle'), 2000)
        } else {
          setSaveState('error')
          setErrorMsg(result.error ?? 'Save failed')
        }
      }, debounceMs)
    },
    [onSave, debounceMs]
  )

  const handleBlur = () => triggerSave(localValue)

  const sharedInputClass = cn(
    'w-full rounded-md border border-transparent bg-transparent px-0 py-1',
    'text-sm text-foreground placeholder:text-muted-foreground/50',
    'focus:outline-none focus:border-border focus:bg-muted/30 focus:px-2',
    'hover:bg-muted/20 hover:px-2 transition-all duration-100',
    className
  )

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>

      {props.variant === 'textarea' ? (
        <textarea
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          rows={props.rows ?? 3}
          className={cn(sharedInputClass, 'resize-none')}
          aria-label={label}
        />
      ) : (
        <input
          type="text"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={sharedInputClass}
          aria-label={label}
        />
      )}

      <div className="min-h-4">
        {saveState === 'saved' && (
          <p className="text-[11px] text-emerald-600">Saved ✓</p>
        )}
        {saveState === 'error' && (
          <p className="text-[11px] text-destructive">{errorMsg ?? 'Save failed — try again'}</p>
        )}
      </div>
    </div>
  )
}
