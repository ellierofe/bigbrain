'use client'

import Link from 'next/link'
import type { KeyboardEvent } from 'react'

type ListItemDensity = 'default' | 'compact'

interface ListItemBaseProps {
  leading?: React.ReactNode
  children: React.ReactNode
  trailing?: React.ReactNode
  density?: ListItemDensity
  divider?: boolean
  className?: string
}

type ListItemProps =
  | (ListItemBaseProps & { as?: 'div'; onClick?: () => void })
  | (ListItemBaseProps & { as: 'link'; href: string })
  | (ListItemBaseProps & { as: 'button'; onClick: () => void })

const densityClass: Record<ListItemDensity, string> = {
  default: 'py-3 px-3',
  compact: 'py-1.5 px-2',
}

function buildClass({
  density = 'default',
  divider = true,
  interactive,
  className,
}: {
  density?: ListItemDensity
  divider?: boolean
  interactive: boolean
  className?: string
}) {
  const base = 'flex items-center gap-3'
  const padding = densityClass[density]
  const dividerClass = divider ? 'border-b border-border' : ''
  const interactiveClass = interactive
    ? 'hover:bg-muted/50 cursor-pointer transition-colors focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
    : ''
  return [base, padding, dividerClass, interactiveClass, className]
    .filter(Boolean)
    .join(' ')
}

export function ListItem(props: ListItemProps) {
  const {
    leading,
    children,
    trailing,
    density = 'default',
    divider = true,
    className,
  } = props

  const inner = (
    <>
      {leading}
      <div className="flex-1 min-w-0">{children}</div>
      {trailing && <div className="flex items-center gap-3 shrink-0">{trailing}</div>}
    </>
  )

  if (props.as === 'link') {
    return (
      <Link
        href={props.href}
        className={buildClass({ density, divider, interactive: true, className })}
      >
        {inner}
      </Link>
    )
  }

  if (props.as === 'button') {
    return (
      <button
        type="button"
        onClick={props.onClick}
        className={buildClass({ density, divider, interactive: true, className })}
      >
        {inner}
      </button>
    )
  }

  // as === 'div' (default)
  const onClick = props.onClick
  if (onClick) {
    function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onClick?.()
      }
    }
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        className={buildClass({ density, divider, interactive: true, className })}
      >
        {inner}
      </div>
    )
  }

  return (
    <div className={buildClass({ density, divider, interactive: false, className })}>
      {inner}
    </div>
  )
}
