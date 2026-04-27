'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface IconButtonProps {
  icon: LucideIcon
  /** Required. Used as aria-label and as the default tooltip text. */
  label: string
  onClick?: () => void
  /** When set, renders as a Next.js Link. */
  href?: string
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'icon'
  disabled?: boolean
  /** true (default) → tooltip shows the `label`. false → no tooltip. string → tooltip text. */
  tooltip?: boolean | string
  'data-testid'?: string
  className?: string
}

export function IconButton({
  icon: Icon,
  label,
  onClick,
  href,
  variant = 'outline',
  size = 'sm',
  disabled,
  tooltip = true,
  'data-testid': testId,
  className,
}: IconButtonProps) {
  const button = href ? (
    <Button
      variant={variant}
      size={size}
      disabled={disabled}
      nativeButton={false}
      render={<Link href={href} aria-label={label} data-testid={testId} />}
      className={cn(className)}
      onClick={onClick}
    >
      <Icon />
    </Button>
  ) : (
    <Button
      variant={variant}
      size={size}
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      data-testid={testId}
      className={cn(className)}
    >
      <Icon />
    </Button>
  )

  if (tooltip === false) return button

  const tooltipText = typeof tooltip === 'string' ? tooltip : label

  return (
    <Tooltip>
      <TooltipTrigger render={<span />}>
        {button}
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  )
}
