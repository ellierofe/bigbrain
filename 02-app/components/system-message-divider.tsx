'use client'

import type { LucideIcon } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type IconColor = 'success' | 'warning' | 'info'

const ICON_COLOR_CLASS: Record<IconColor, string> = {
  success: 'text-[var(--color-success)]',
  warning: 'text-[var(--color-warning)]',
  info: 'text-[var(--color-info)]',
}

interface SystemMessageDividerProps {
  icon: LucideIcon
  iconColor: IconColor
  text: string
  /** Optional hover tooltip — useful for surfacing entity_type / op metadata */
  tooltip?: string
}

export function SystemMessageDivider({
  icon: Icon,
  iconColor,
  text,
  tooltip,
}: SystemMessageDividerProps) {
  const inner = (
    <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <Icon className={cn('h-3 w-3 shrink-0', ICON_COLOR_CLASS[iconColor])} />
      <span className="whitespace-normal">{text}</span>
    </span>
  )

  return (
    <div className="my-2 flex justify-center">
      {tooltip ? (
        <Tooltip>
          <TooltipTrigger render={<span />}>{inner}</TooltipTrigger>
          <TooltipContent>{tooltip}</TooltipContent>
        </Tooltip>
      ) : (
        inner
      )}
    </div>
  )
}
