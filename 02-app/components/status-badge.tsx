'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

export type StatusBadgeState = 'success' | 'warning' | 'error' | 'info' | 'neutral'

export interface StatusOption {
  value: string
  label: string
  state: StatusBadgeState
}

const DEFAULT_OPTIONS: StatusOption[] = [
  { value: 'draft', label: 'Draft', state: 'warning' },
  { value: 'active', label: 'Active', state: 'success' },
  { value: 'archived', label: 'Archived', state: 'neutral' },
]

const stateClass: Record<StatusBadgeState, string> = {
  success: 'bg-success-bg text-success-foreground',
  warning: 'bg-warning-bg text-warning-foreground',
  error: 'bg-error-bg text-error-foreground',
  info: 'bg-info-bg text-info-foreground',
  neutral: 'bg-muted text-muted-foreground',
}

const dotClass: Record<StatusBadgeState, string> = {
  success: 'bg-success-bg',
  warning: 'bg-warning-bg',
  error: 'bg-error-bg',
  info: 'bg-info-bg',
  neutral: 'bg-muted',
}

interface StatusBadgeProps {
  status: string
  onChange: (status: string) => Promise<{ ok: boolean; error?: string }>
  options?: StatusOption[]
}

export function StatusBadge({ status, onChange, options = DEFAULT_OPTIONS }: StatusBadgeProps) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = options.find(o => o.value === status) ?? options[0]

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleSelect(value: string) {
    if (value === status || pending) return
    setPending(true)
    setOpen(false)
    await onChange(value)
    setPending(false)
  }

  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={pending}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-opacity ${stateClass[current.state]} ${pending ? 'opacity-60' : 'hover:opacity-80 cursor-pointer'}`}
      >
        {current.label}
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 rounded-md border border-border bg-card shadow-[var(--shadow-raised)] py-1 min-w-[120px]">
          {options
            .filter(o => o.value !== status)
            .map(option => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted transition-colors"
              >
                <span className={`inline-block h-2 w-2 rounded-full ${dotClass[option.state]}`} />
                {option.label}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
