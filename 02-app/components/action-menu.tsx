'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { FloatingMenu } from '@/components/floating-menu'

export type ActionMenuItem =
  | { type: 'action'; label: string; icon?: LucideIcon; onClick: () => void; destructive?: boolean }
  | { type: 'link'; label: string; icon?: LucideIcon; href: string }
  | { type: 'disabled'; label: string; icon?: LucideIcon; hint?: string }
  | { type: 'divider' }

interface ActionMenuProps {
  trigger: React.ReactNode
  items: ActionMenuItem[]
  align?: 'start' | 'end'
  side?: 'bottom' | 'top'
  minWidth?: string
}

export function ActionMenu({
  trigger,
  items,
  align = 'end',
  side = 'bottom',
  minWidth = '12rem',
}: ActionMenuProps) {
  const [open, setOpen] = useState(false)

  const triggerWithToggle = (
    <span onClick={() => setOpen(!open)} className="contents">
      {trigger}
    </span>
  )

  return (
    <FloatingMenu
      open={open}
      onOpenChange={setOpen}
      align={align}
      side={side}
      minWidth={minWidth}
      trigger={triggerWithToggle}
    >
      {items.map((item, i) => {
        if (item.type === 'divider') {
          return <div key={`divider-${i}`} className="h-px bg-border my-1" />
        }

        const Icon = item.icon

        if (item.type === 'link') {
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted transition-colors"
            >
              {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
              {item.label}
            </Link>
          )
        }

        if (item.type === 'disabled') {
          return (
            <div
              key={item.label}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm opacity-50 cursor-not-allowed"
            >
              {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
              {item.label}
              {item.hint && (
                <span className="ml-auto text-[10px] text-muted-foreground">{item.hint}</span>
              )}
            </div>
          )
        }

        // type === 'action'
        const destructive = item.destructive
        return (
          <button
            key={item.label}
            type="button"
            onClick={() => {
              item.onClick()
              setOpen(false)
            }}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm transition-colors ${
              destructive
                ? 'text-destructive hover:bg-destructive/10'
                : 'hover:bg-muted'
            }`}
          >
            {Icon && (
              <Icon
                className={`h-3.5 w-3.5 ${destructive ? 'text-destructive' : 'text-muted-foreground'}`}
              />
            )}
            {item.label}
          </button>
        )
      })}
    </FloatingMenu>
  )
}
