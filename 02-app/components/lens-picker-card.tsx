'use client'

import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { LensId } from '@/lib/types/lens'

interface LensPickerCardProps {
  lens: LensId
  name: string
  description: string
  caveat?: string
  selected: boolean
  disabled?: boolean
  disabledReason?: string
  onSelect: (lens: LensId) => void
  className?: string
}

export function LensPickerCard({
  lens,
  name,
  description,
  caveat,
  selected,
  disabled = false,
  disabledReason,
  onSelect,
  className,
}: LensPickerCardProps) {
  const card = (
    <button
      type="button"
      onClick={() => !disabled && onSelect(lens)}
      disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      aria-pressed={selected}
      className={cn(
        'flex flex-col gap-2 rounded-lg border p-4 text-left transition-colors min-h-[140px]',
        !disabled && !selected && 'border-border bg-card hover:border-primary/40 hover:bg-muted/30',
        !disabled && selected && 'border-primary bg-primary/5',
        disabled && 'border-border bg-card opacity-60 cursor-not-allowed',
        className,
      )}
    >
      <span className="text-sm font-display font-semibold">{name}</span>
      <span className="text-xs text-muted-foreground line-clamp-3">{description}</span>
      {caveat && <span className="text-[11px] text-muted-foreground mt-auto">{caveat}</span>}
    </button>
  )

  if (disabled && disabledReason) {
    return (
      <Tooltip>
        <TooltipTrigger render={<span />}>{card}</TooltipTrigger>
        <TooltipContent side="top">{disabledReason}</TooltipContent>
      </Tooltip>
    )
  }

  return card
}
