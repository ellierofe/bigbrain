'use client'

import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface ActionButtonProps {
  icon?: LucideIcon
  /** Optional trailing icon, rendered to the right of children. Hidden while loading. */
  trailingIcon?: LucideIcon
  children: React.ReactNode
  onClick?: () => void
  /** When set, renders as a Next.js Link. */
  href?: string
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'default'
  disabled?: boolean
  /** When true, button is disabled and the icon (or leading position) shows a spinner. */
  loading?: boolean
  /** When provided, button is wrapped with a tooltip (works on disabled buttons). */
  tooltip?: string
  type?: 'button' | 'submit'
  'data-testid'?: string
  className?: string
}

export function ActionButton({
  icon: Icon,
  trailingIcon: TrailingIcon,
  children,
  onClick,
  href,
  variant = 'default',
  size = 'sm',
  disabled,
  loading,
  tooltip,
  type = 'button',
  'data-testid': testId,
  className,
}: ActionButtonProps) {
  const isDisabled = Boolean(disabled || loading)
  const LeadingIcon = loading ? Loader2 : Icon
  const Trailing = !loading ? TrailingIcon : undefined

  const button = href ? (
    <Button
      variant={variant}
      size={size}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      nativeButton={false}
      render={<Link href={href} data-testid={testId} />}
      className={cn(className)}
      onClick={onClick}
    >
      {LeadingIcon && (
        <LeadingIcon className={cn(loading && 'animate-spin')} />
      )}
      {children}
      {Trailing && <Trailing />}
    </Button>
  ) : (
    <Button
      variant={variant}
      size={size}
      disabled={isDisabled}
      type={type}
      onClick={onClick}
      aria-busy={loading || undefined}
      data-testid={testId}
      className={cn(className)}
    >
      {LeadingIcon && (
        <LeadingIcon className={cn(loading && 'animate-spin')} />
      )}
      {children}
      {Trailing && <Trailing />}
    </Button>
  )

  if (!tooltip) return button

  return (
    <Tooltip>
      <TooltipTrigger render={<span />}>
        {button}
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}
