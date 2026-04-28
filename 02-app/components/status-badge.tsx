'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { FloatingMenu } from '@/components/floating-menu'

export type StatusBadgeState = 'success' | 'warning' | 'error' | 'info' | 'neutral'
export type StatusBadgeHue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export type StatusOption =
  | { value: string; label: string; state: StatusBadgeState }
  | { value: string; label: string; hue: StatusBadgeHue }

const DEFAULT_OPTIONS: StatusOption[] = [
  { value: 'draft', label: 'Draft', state: 'warning' },
  { value: 'active', label: 'Active', state: 'success' },
  { value: 'archived', label: 'Archived', state: 'neutral' },
]

const stateBgClass: Record<StatusBadgeState, string> = {
  success: 'bg-success-bg text-success-foreground',
  warning: 'bg-warning-bg text-warning-foreground',
  error: 'bg-error-bg text-error-foreground',
  info: 'bg-info-bg text-info-foreground',
  neutral: 'bg-muted text-muted-foreground',
}

const stateDotClass: Record<StatusBadgeState, string> = {
  success: 'bg-success-bg',
  warning: 'bg-warning-bg',
  error: 'bg-error-bg',
  info: 'bg-info-bg',
  neutral: 'bg-muted',
}

const hueBgClass: Record<StatusBadgeHue, string> = {
  1: 'bg-tag-1 text-foreground',
  2: 'bg-tag-2 text-foreground',
  3: 'bg-tag-3 text-foreground',
  4: 'bg-tag-4 text-foreground',
  5: 'bg-tag-5 text-foreground',
  6: 'bg-tag-6 text-foreground',
  7: 'bg-tag-7 text-foreground',
  8: 'bg-tag-8 text-foreground',
}

const hueDotClass: Record<StatusBadgeHue, string> = {
  1: 'bg-tag-1',
  2: 'bg-tag-2',
  3: 'bg-tag-3',
  4: 'bg-tag-4',
  5: 'bg-tag-5',
  6: 'bg-tag-6',
  7: 'bg-tag-7',
  8: 'bg-tag-8',
}

function bgClassFor(option: StatusOption): string {
  return 'state' in option ? stateBgClass[option.state] : hueBgClass[option.hue]
}

function dotClassFor(option: StatusOption): string {
  return 'state' in option ? stateDotClass[option.state] : hueDotClass[option.hue]
}

interface StatusBadgeProps {
  status: string
  /** Omit to render as a static read-only pill (no dropdown, no chevron, no click). */
  onChange?: (status: string) => Promise<{ ok: boolean; error?: string }>
  options?: StatusOption[]
}

export function StatusBadge({ status, onChange, options = DEFAULT_OPTIONS }: StatusBadgeProps) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)

  const current = options.find((o) => o.value === status) ?? options[0]
  const readOnly = !onChange

  async function handleSelect(value: string) {
    if (!onChange || value === status || pending) return
    setPending(true)
    setOpen(false)
    await onChange(value)
    setPending(false)
  }

  if (readOnly) {
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${bgClassFor(current)}`}
      >
        {current.label}
      </span>
    )
  }

  const trigger = (
    <button
      type="button"
      onClick={() => setOpen(!open)}
      disabled={pending}
      aria-haspopup="listbox"
      aria-expanded={open}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-opacity ${bgClassFor(current)} ${pending ? 'opacity-60' : 'hover:opacity-80 cursor-pointer'}`}
    >
      {current.label}
      <ChevronDown className="h-3 w-3" />
    </button>
  )

  return (
    <FloatingMenu
      open={open}
      onOpenChange={setOpen}
      align="start"
      minWidth="120px"
      trigger={trigger}
    >
      {options
        .filter((o) => o.value !== status)
        .map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value)}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted transition-colors"
          >
            <span className={`inline-block h-2 w-2 rounded-full ${dotClassFor(option)}`} />
            {option.label}
          </button>
        ))}
    </FloatingMenu>
  )
}
