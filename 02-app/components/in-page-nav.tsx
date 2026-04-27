'use client'

import { cn } from '@/lib/utils'

interface NavItem {
  id: string
  label: string
}

interface InPageNavProps {
  items: NavItem[]
  activeId: string
  onSelect: (id: string) => void
  className?: string
}

/**
 * InPageNav — vertical in-page navigation with active indicator.
 *
 * Renders as a sticky column (w-36, pinned to top) alongside scrolling content.
 * The parent must be a flex row — InPageNav handles its own width and sticky
 * positioning. Place the scrolling content as a sibling `flex-1` div.
 *
 * Used for section navigation within a tab or content area (e.g. persona
 * sections in audience segment detail, strategy sections in platform detail).
 */
export function InPageNav({ items, activeId, onSelect, className }: InPageNavProps) {
  return (
    <div className={cn('w-36 shrink-0 self-start sticky top-0', className)}>
      <nav className="flex flex-col gap-0.5">
        {items.map((item) => {
          const isActive = item.id === activeId
          return (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                'border-l-2 px-3 py-1.5 text-left text-xs transition-colors',
                isActive
                  ? 'border-primary text-foreground font-medium'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {item.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
