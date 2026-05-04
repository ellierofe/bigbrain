'use client'

import { Check, type LucideIcon } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface RailIconProps {
  icon: LucideIcon
  /** Required. Used as aria-label and tooltip text. */
  label: string
  selected: boolean
  /** 'active' = applicable AND has content; 'empty' = applicable but empty. */
  status: 'active' | 'empty'
  /** Small dot indicator at top-right when status='active'. */
  dot?: 'success' | null
  /** 12px overlay glyph at bottom-right (e.g. completion check). */
  adornment?: 'check' | null
  onClick: () => void
}

export function RailIcon({
  icon: Icon,
  label,
  selected,
  status,
  dot,
  adornment,
  onClick,
}: RailIconProps) {
  const showDot = status === 'active' && dot === 'success' && !selected
  const glyphTone = selected
    ? 'text-foreground'
    : status === 'active'
      ? 'text-foreground'
      : 'text-muted-foreground'

  return (
    <Tooltip>
      <TooltipTrigger render={<span />}>
        <button
          type="button"
          onClick={onClick}
          aria-label={label}
          aria-pressed={selected}
          className={cn(
            'relative flex h-10 w-10 items-center justify-center rounded-md transition-colors',
            selected ? 'bg-card' : 'hover:bg-card/50 hover:text-foreground',
            glyphTone
          )}
        >
          <Icon className="h-5 w-5" />
          {showDot && (
            <span
              aria-hidden
              className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[var(--color-success)]"
            />
          )}
          {adornment === 'check' && (
            <Check
              aria-hidden
              className="absolute right-0.5 bottom-0.5 h-3 w-3 text-[var(--color-success)]"
            />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}
