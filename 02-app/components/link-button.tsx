'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils'

interface LinkButtonBaseProps {
  children: React.ReactNode
  tone?: 'primary' | 'muted' | 'destructive'
  size?: 'xs' | 'sm'
  className?: string
}

type LinkButtonProps =
  | (LinkButtonBaseProps & { onClick: () => void; href?: never; disabled?: boolean })
  | (LinkButtonBaseProps & { href: string; onClick?: never; disabled?: never })

const toneClass: Record<NonNullable<LinkButtonBaseProps['tone']>, string> = {
  primary: 'text-primary hover:text-primary/80',
  muted: 'text-muted-foreground hover:text-foreground',
  destructive: 'text-destructive hover:text-destructive/80',
}

const sizeClass: Record<NonNullable<LinkButtonBaseProps['size']>, string> = {
  xs: 'text-[11px]',
  sm: 'text-xs',
}

/**
 * Inline text-link affordance — for "Show more" / "View all N →" / "Re-summarise"
 * style cues that sit inline with body copy. Tone-driven (primary, muted,
 * destructive). Renders as <button> with onClick, or <Link> with href.
 * Distinct from ActionButton (which is a real button surface with icon slot)
 * and IconButton (which is icon-only).
 */
export function LinkButton(props: LinkButtonProps) {
  const { children, tone = 'primary', size = 'sm', className } = props
  const classes = cn(
    'transition-colors inline-flex items-center gap-1',
    toneClass[tone],
    sizeClass[size],
    className,
  )

  if ('href' in props && props.href) {
    return (
      <Link href={props.href} className={classes}>
        {children}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      className={cn(classes, props.disabled && 'opacity-50 cursor-not-allowed')}
    >
      {children}
    </button>
  )
}
