'use client'

import type { LucideIcon } from 'lucide-react'

interface FilterPillProps {
  label: string
  active: boolean
  onClick: () => void
  icon?: LucideIcon
  count?: number
}

export function FilterPill({ label, active, onClick, icon: Icon, count }: FilterPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors cursor-pointer ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
      }`}
    >
      {Icon && <Icon className="h-3 w-3" />}
      {label}
      {count !== undefined && (
        <span className={`text-[11px] ${active ? 'opacity-70' : 'opacity-50'}`}>{count}</span>
      )}
    </button>
  )
}
