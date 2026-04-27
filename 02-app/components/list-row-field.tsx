'use client'

import { useState } from 'react'
import { useDebouncedSave } from '@/lib/save-feedback'
import { cn } from '@/lib/utils'

interface ListRowFieldBaseProps {
  value: string | null
  onSave: (value: string) => Promise<{ ok: boolean; error?: string }>
  placeholder?: string
  'aria-label': string
  disabled?: boolean
  className?: string
  /** debounce delay after blur before save fires, default 500ms */
  debounceMs?: number
}

interface ListRowInputProps extends ListRowFieldBaseProps {
  variant: 'input'
}

interface ListRowTextareaProps extends ListRowFieldBaseProps {
  variant: 'textarea'
  rows?: number
}

type ListRowFieldProps = ListRowInputProps | ListRowTextareaProps

const inputClasses =
  'flex-1 min-w-0 bg-transparent rounded-md border border-transparent px-0 py-1 text-sm text-foreground placeholder:text-muted-foreground/50 transition-all duration-100 focus:outline-none focus:bg-muted/30 focus:px-2 focus:border-border hover:bg-muted/20 hover:px-2 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:px-0'

const textareaClasses =
  'w-full min-w-0 resize-none bg-transparent rounded-md border border-transparent px-0 py-1 text-sm text-foreground placeholder:text-muted-foreground/50 transition-all duration-100 focus:outline-none focus:bg-muted/30 focus:px-2 focus:border-border hover:bg-muted/20 hover:px-2 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:px-0'

export function ListRowField(props: ListRowFieldProps) {
  const { value, onSave, placeholder, disabled, className, debounceMs = 500 } = props
  const ariaLabel = props['aria-label']

  const [localValue, setLocalValue] = useState(value ?? '')
  const { state: saveState, errorMsg, trigger } = useDebouncedSave({
    value: value ?? '',
    onSave,
    debounceMs,
  })

  const handleBlur = () => {
    trigger(localValue)
  }

  const indicatorText =
    saveState === 'saved'
      ? 'Saved'
      : saveState === 'error'
        ? errorMsg ?? 'Failed'
        : ''
  const indicatorTone = saveState === 'error' ? 'text-destructive' : 'text-success'

  if (props.variant === 'textarea') {
    return (
      <div className={cn('relative flex flex-col gap-1 min-w-0', disabled && 'opacity-50')}>
        <textarea
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          placeholder={placeholder}
          rows={props.rows ?? 2}
          disabled={disabled}
          aria-label={ariaLabel}
          className={cn(textareaClasses, className)}
        />
        <div
          aria-live="polite"
          className={cn(
            'flex justify-end text-[10px] min-h-[14px]',
            indicatorTone
          )}
        >
          {indicatorText}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('relative flex items-center gap-2 min-w-0 flex-1', disabled && 'opacity-50')}>
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn(inputClasses, className)}
      />
      <span
        aria-live="polite"
        className={cn(
          'text-[10px] shrink-0 min-w-[3rem] text-right',
          indicatorTone
        )}
      >
        {indicatorText}
      </span>
    </div>
  )
}
