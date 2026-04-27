'use client'

import { useState, useRef } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Info } from 'lucide-react'
import { toast } from 'sonner'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import {
  Slider,
  SliderControl,
  SliderTrack,
  SliderIndicator,
  SliderThumb,
} from '@/components/ui/slider'
import { debouncedSaveToast } from '@/lib/save-feedback'
import { cn } from '@/lib/utils'

interface SliderFieldProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  onSave: (value: number) => Promise<{ ok: boolean; error?: string }>
  lowLabel?: string
  highLabel?: string
  /** Format the visible numeric readout. Default: signed for zero-centred, plain otherwise. */
  valueFormatter?: (value: number) => string
  description?: string
  icon?: LucideIcon
  /** Adds a centre tick at 0 and signs the readout. Use for delta sliders (e.g. -50..+50). */
  zeroCentred?: boolean
  labelBg?: string
  disabled?: boolean
  className?: string
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const defaultFormatter = (zeroCentred: boolean) => (value: number) => {
  if (!zeroCentred) return String(value)
  if (value === 0) return '0'
  return value > 0 ? `+${value}` : String(value)
}

export function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  onSave,
  lowLabel,
  highLabel,
  valueFormatter,
  description,
  icon: Icon,
  zeroCentred = false,
  labelBg,
  disabled,
  className,
}: SliderFieldProps) {
  const [localValue, setLocalValue] = useState(value)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isFocused, setIsFocused] = useState(false)
  const savedValueRef = useRef(value)

  const isLocked = disabled || min === max
  const formatter = valueFormatter ?? defaultFormatter(zeroCentred)
  const showLowHigh = Boolean(lowLabel || highLabel)

  const handleChange = (next: number | readonly number[]) => {
    const v = Array.isArray(next) ? next[0] : (next as number)
    setLocalValue(v)
  }

  const handleCommit = async (next: number | readonly number[]) => {
    const v = Array.isArray(next) ? next[0] : (next as number)
    if (v === savedValueRef.current) return
    setSaveState('saving')
    setErrorMsg(null)
    const result = await onSave(v)
    if (result.ok) {
      savedValueRef.current = v
      setSaveState('saved')
      debouncedSaveToast()
      setTimeout(() => setSaveState('idle'), 2000)
    } else {
      setSaveState('error')
      setErrorMsg(result.error ?? 'Save failed')
      setLocalValue(savedValueRef.current)
      toast.error(result.error ?? 'Save failed — try again')
    }
  }

  // Zero-centred tick position as a percentage of the track
  const zeroPercent = zeroCentred && min < 0 && max > 0
    ? ((0 - min) / (max - min)) * 100
    : null

  return (
    <div className={cn('relative', label.length > 0 && 'mt-3', className)}>
      <div
        className={cn(
          'rounded-md border px-3 pt-5 pb-3 transition-colors duration-100',
          isFocused
            ? 'border-field-active/50 bg-field-active/[0.03]'
            : 'border-border/60 bg-transparent hover:border-border',
          isLocked && 'opacity-50 cursor-not-allowed',
        )}
      >
        {label.length > 0 && (
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

        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground">{lowLabel ?? ''}</span>
          <span className="text-sm font-mono text-foreground tabular-nums">
            {formatter(localValue)}
          </span>
          <span className="text-xs text-muted-foreground">{highLabel ?? ''}</span>
        </div>

        <Slider
          value={localValue}
          min={min}
          max={max}
          step={step}
          disabled={isLocked}
          onValueChange={handleChange}
          onValueCommitted={handleCommit}
        >
          <SliderControl
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          >
            <SliderTrack>
              <SliderIndicator />
              {zeroPercent !== null && (
                <span
                  aria-hidden
                  className="absolute -top-0.5 h-3 w-px bg-border"
                  style={{ left: `${zeroPercent}%` }}
                />
              )}
              <SliderThumb />
            </SliderTrack>
          </SliderControl>
        </Slider>

        {!showLowHigh && (lowLabel || highLabel) && null}
      </div>
    </div>
  )
}
