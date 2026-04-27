'use client'

import { useState, useRef } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Info } from 'lucide-react'
import { toast } from 'sonner'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { debouncedSaveToast } from '@/lib/save-feedback'
import { cn } from '@/lib/utils'

interface SelectOption {
  value: string
  label: string
}

interface SelectFieldProps {
  label: string
  value: string
  options: SelectOption[]
  onSave: (value: string) => Promise<{ ok: boolean; error?: string }>
  placeholder?: string
  icon?: LucideIcon
  description?: string
  /** Background class for the label patch (must match parent bg). Default: bg-card */
  labelBg?: string
  disabled?: boolean
  className?: string
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function SelectField({
  label,
  value,
  options,
  onSave,
  placeholder,
  icon: Icon,
  description,
  labelBg,
  disabled,
  className,
}: SelectFieldProps) {
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  const savedValueRef = useRef(value)

  const isEmpty = options.length === 0
  const showLabel = label.length > 0

  const handleChange = (newValue: string | null) => {
    if (newValue === null || newValue === savedValueRef.current) return
    void (async () => {
      setSaveState('saving')
      setErrorMsg(null)
      const result = await onSave(newValue)
      if (result.ok) {
        savedValueRef.current = newValue
        setSaveState('saved')
        debouncedSaveToast()
        setTimeout(() => setSaveState('idle'), 2000)
      } else {
        setSaveState('error')
        setErrorMsg(result.error ?? 'Save failed')
        toast.error(result.error ?? 'Save failed — try again')
      }
    })()
  }

  return (
    <div className={cn('relative', showLabel && 'mt-3')}>
      <div
        className={cn(
          'rounded-md border transition-colors duration-100',
          isFocused
            ? 'border-field-active/50 bg-field-active/[0.03]'
            : 'border-border/60 bg-transparent hover:border-border',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        {showLabel && (
          <div className={cn('absolute -top-2 left-2.5 flex items-center gap-1 px-1', labelBg ?? 'bg-card')}>
            {Icon && (
              <Icon
                className={cn(
                  'h-3 w-3 shrink-0 transition-colors duration-100',
                  isFocused ? 'text-field-active' : 'text-muted-foreground',
                )}
              />
            )}
            <span
              className={cn(
                'text-[10px] font-semibold capitalize tracking-wide transition-colors duration-100',
                isFocused ? 'text-field-active' : 'text-muted-foreground',
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

        <Select
          value={value}
          onValueChange={handleChange}
          disabled={disabled || isEmpty}
        >
          <SelectTrigger
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={cn(
              'border-0 bg-transparent shadow-none px-3 text-sm',
              showLabel ? 'pt-3 pb-1.5 h-auto' : 'py-2 h-auto',
              'focus-visible:ring-0 focus-visible:ring-offset-0',
              className,
            )}
            aria-label={label}
          >
            <SelectValue placeholder={isEmpty ? 'No options available' : placeholder}>
              {(val) => {
                const v = typeof val === 'string' ? val : value
                const opt = options.find((o) => o.value === v)
                return opt?.label ?? v ?? ''
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
