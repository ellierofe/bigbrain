'use client'

import { useRouter } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface ItemSwitcherProps<T> {
  /** Pre-filtered list of items to show. Switcher is hidden when length < 2. */
  items: T[]
  /** ID of the currently-displayed item. Used to mark the active option. */
  currentId: string
  /** Returns the href to navigate to when an item is selected. */
  getHref: (item: T) => string
  /** Returns the label shown in the trigger (when current) and option list. */
  getLabel: (item: T) => string
  /** Returns a stable id. Defaults to `(item as { id: string }).id`. */
  getId?: (item: T) => string
  /**
   * Optional flag rendered as a small warning-coloured pill next to the item
   * name (in trigger and dropdown options). Returns the flag label string, or
   * `null` / `undefined` for items with no flag. Typical use: `(item) =>
   * item.status === 'draft' ? 'Draft' : null`.
   */
  getFlag?: (item: T) => string | null | undefined
  /**
   * Optional grouping. When passed, dropdown options are rendered inside
   * SelectGroup blocks with a small uppercase label per group. Group order
   * follows the order groups first appear in `items`. Pass `getGroupLabel`
   * to control the displayed group label (defaults to the raw key).
   */
  getGroup?: (item: T) => string
  getGroupLabel?: (groupKey: string) => string
  /** Small uppercase descriptor shown above the current value (e.g. "Segment"). */
  label: string
  /** Maximum trigger width in pixels. Default 220. */
  maxWidth?: number
  className?: string
}

function FlagPill({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-warning-bg px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning-foreground">
      {children}
    </span>
  )
}

const defaultGetId = <T,>(item: T): string => (item as { id: string }).id

export function ItemSwitcher<T>({
  items,
  currentId,
  getHref,
  getLabel,
  getId = defaultGetId,
  getFlag,
  getGroup,
  getGroupLabel,
  label,
  maxWidth = 220,
  className,
}: ItemSwitcherProps<T>) {
  const router = useRouter()

  if (items.length < 2) return null

  const currentItem = items.find((item) => getId(item) === currentId)
  const currentLabel = currentItem ? getLabel(currentItem) : label
  const currentFlag = currentItem && getFlag ? getFlag(currentItem) : null

  const handleChange = (value: string | null) => {
    if (!value || value === currentId) return
    const target = items.find((item) => getId(item) === value)
    if (target) router.push(getHref(target))
  }

  return (
    <Select value={currentId} onValueChange={handleChange}>
      <SelectTrigger
        aria-label={`Switch ${label.toLowerCase()}`}
        style={{ maxWidth: `${maxWidth}px` }}
        className={cn(
          'h-auto py-1 px-3 text-sm rounded-md bg-transparent border-border/60',
          'hover:bg-muted/30 hover:border-border transition-colors',
          'data-[state=open]:bg-muted data-[state=open]:border-border',
          'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          'shadow-none',
          className,
        )}
      >
        <span className="flex flex-col items-start min-w-0">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground leading-none">
            {label}
          </span>
          <span className="flex items-center gap-1.5 w-full">
            <span className="text-sm font-medium text-foreground truncate">
              {currentLabel}
            </span>
            {currentFlag && <FlagPill>{currentFlag}</FlagPill>}
          </span>
        </span>
      </SelectTrigger>
      <SelectContent>
        {getGroup
          ? (() => {
              // Build groups in order of first appearance
              const groups: { key: string; items: T[] }[] = []
              for (const item of items) {
                const key = getGroup(item)
                let group = groups.find((g) => g.key === key)
                if (!group) {
                  group = { key, items: [] }
                  groups.push(group)
                }
                group.items.push(item)
              }
              return groups.map((group) => (
                <SelectGroup key={group.key}>
                  <SelectLabel>{getGroupLabel ? getGroupLabel(group.key) : group.key}</SelectLabel>
                  {group.items.map((item) => {
                    const id = getId(item)
                    const flag = getFlag ? getFlag(item) : null
                    return (
                      <SelectItem key={id} value={id}>
                        <span className="inline-flex items-center gap-1.5">
                          <span>{getLabel(item)}</span>
                          {flag && <FlagPill>{flag}</FlagPill>}
                        </span>
                      </SelectItem>
                    )
                  })}
                </SelectGroup>
              ))
            })()
          : items.map((item) => {
              const id = getId(item)
              const flag = getFlag ? getFlag(item) : null
              return (
                <SelectItem key={id} value={id}>
                  <span className="inline-flex items-center gap-1.5">
                    <span>{getLabel(item)}</span>
                    {flag && <FlagPill>{flag}</FlagPill>}
                  </span>
                </SelectItem>
              )
            })}
      </SelectContent>
    </Select>
  )
}
