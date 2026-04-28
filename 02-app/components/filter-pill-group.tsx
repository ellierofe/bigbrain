'use client'

import type { LucideIcon } from 'lucide-react'
import { FilterPill } from '@/components/filter-pill'

export interface FilterPillOption {
  value: string
  label: string
  count?: number
  icon?: LucideIcon
}

interface FilterPillGroupProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: FilterPillOption[]
}

export function FilterPillGroup({ label, value, onChange, options }: FilterPillGroupProps) {
  return (
    <div className="flex items-center gap-1.5">
      {label && (
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground w-12 shrink-0">
          {label}
        </span>
      )}
      <div className="flex gap-1">
        {options.map((option) => (
          <FilterPill
            key={option.value}
            label={option.label}
            active={option.value === value}
            onClick={() => onChange(option.value)}
            icon={option.icon}
            count={option.count}
          />
        ))}
      </div>
    </div>
  )
}
