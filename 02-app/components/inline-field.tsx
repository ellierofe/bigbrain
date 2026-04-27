'use client'

import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Info } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { useDebouncedSave } from '@/lib/save-feedback'
import { cn } from '@/lib/utils'

interface InlineFieldBaseProps {
  value: string | null
  onSave: (value: string) => Promise<{ ok: boolean; error?: string }>
  label: string
  placeholder?: string
  icon?: LucideIcon
  /** Optional description shown as an info icon with tooltip */
  description?: string
  /** Background class for the label patch (must match parent bg). Default: bg-card */
  labelBg?: string
  className?: string
  /** debounce delay after blur before save fires, default 500ms */
  debounceMs?: number
  /** When true, the input is non-interactive and visually muted. */
  disabled?: boolean
}

interface InlineInputProps extends InlineFieldBaseProps {
  variant: 'input'
}

interface InlineTextareaProps extends InlineFieldBaseProps {
  variant: 'textarea'
  rows?: number
}

type InlineFieldProps = InlineInputProps | InlineTextareaProps

export function InlineField(props: InlineFieldProps) {
  const { value, onSave, label, placeholder, icon: Icon, description, labelBg, className, debounceMs = 500, disabled } = props

  const [localValue, setLocalValue] = useState(value ?? '')
  const [isFocused, setIsFocused] = useState(false)
  const { state: saveState, errorMsg, trigger } = useDebouncedSave({ value: value ?? '', onSave, debounceMs })

  const handleBlur = () => {
    setIsFocused(false)
    trigger(localValue)
  }

  const handleFocus = () => {
    setIsFocused(true)
  }

  const showLabel = label.length > 0

  return (
    <div className={cn("relative", showLabel && "mt-3")}>
      {/* Field container with always-visible border */}
      <div
        className={cn(
          'rounded-md border px-3 pb-2 transition-colors duration-100',
          showLabel ? 'pt-5' : 'pt-2',
          isFocused
            ? 'border-field-active/50 bg-field-active/[0.03]'
            : 'border-border/60 bg-transparent hover:border-border',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        {/* Label integrated with top border */}
        {showLabel && (
          <div className={cn("absolute -top-2 left-2.5 flex items-center gap-1 px-1", labelBg ?? 'bg-card')}>
            {Icon && (
              <Icon
                className={cn(
                  'h-3 w-3 shrink-0 transition-colors duration-100',
                  isFocused ? 'text-field-active' : 'text-muted-foreground'
                )}
              />
            )}
            <span
              className={cn(
                'text-[10px] font-semibold capitalize tracking-wide transition-colors duration-100',
                isFocused ? 'text-field-active' : 'text-muted-foreground'
              )}
            >
              {label}
            </span>
            {description && (
              <Tooltip>
                <TooltipTrigger render={<span />} className="cursor-help">
                  <Info className="h-2.5 w-2.5 text-muted-foreground/50" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  {description}
                </TooltipContent>
              </Tooltip>
            )}
            {saveState === 'saved' && (
              <span className="text-[10px] text-success ml-1">Saved</span>
            )}
            {saveState === 'error' && (
              <span className="text-[10px] text-destructive ml-1">{errorMsg ?? 'Failed'}</span>
            )}
          </div>
        )}

        {/* Input */}
        {props.variant === 'textarea' ? (
          <textarea
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            rows={props.rows ?? 3}
            disabled={disabled}
            className={cn(
              'w-full resize-none bg-transparent text-sm text-foreground',
              'placeholder:text-muted-foreground/40',
              'focus:outline-none disabled:cursor-not-allowed',
              className
            )}
            aria-label={label}
          />
        ) : (
          <input
            type="text"
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              'w-full bg-transparent py-0.5 text-sm text-foreground',
              'placeholder:text-muted-foreground/40',
              'focus:outline-none disabled:cursor-not-allowed',
              className
            )}
            aria-label={label}
          />
        )}
      </div>
    </div>
  )
}
