'use client'

import { Calendar as CalendarIcon, Info, type LucideIcon } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { DatePicker } from '@/components/date-picker'
import { useDebouncedSave } from '@/lib/save-feedback'
import { cn } from '@/lib/utils'

interface DateFieldProps {
  /** ISO date string (YYYY-MM-DD) or null. */
  value: string | null
  onSave: (value: string | null) => Promise<{ ok: boolean; error?: string }>
  label: string
  placeholder?: string
  icon?: LucideIcon
  description?: string
  labelBg?: string
  disabled?: boolean
  debounceMs?: number
  className?: string
}

function toDate(iso: string | null): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

function toIso(d: Date | null): string | null {
  if (!d) return null
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function DateField({
  value,
  onSave,
  label,
  placeholder,
  icon: Icon = CalendarIcon,
  description,
  labelBg,
  disabled,
  debounceMs = 500,
  className,
}: DateFieldProps) {
  const { state: saveState, errorMsg, trigger } = useDebouncedSave({ value, onSave, debounceMs })

  const handleChange = (d: Date | null) => {
    trigger(toIso(d))
  }

  return (
    <div className={cn('relative mt-3 group', className)}>
      <div
        className={cn(
          'rounded-md border px-3 pt-5 pb-2 transition-colors duration-100',
          'border-border/60 bg-transparent hover:border-border',
          'focus-within:border-field-active/50 focus-within:bg-field-active/[0.03]',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <div className={cn('absolute -top-2 left-2.5 flex items-center gap-1 px-1', labelBg ?? 'bg-card')}>
          <Icon className="h-3 w-3 shrink-0 text-muted-foreground transition-colors duration-100 group-focus-within:text-field-active" />
          <span className="text-[10px] font-semibold capitalize tracking-wide text-muted-foreground transition-colors duration-100 group-focus-within:text-field-active">
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
          {saveState === 'saved' && <span className="text-[10px] text-success ml-1">Saved</span>}
          {saveState === 'error' && (
            <span className="text-[10px] text-destructive ml-1">{errorMsg ?? 'Failed'}</span>
          )}
        </div>

        <DatePicker
          value={toDate(value)}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className="border-0 px-0 py-0.5 hover:bg-transparent"
        />
      </div>
    </div>
  )
}
