'use client'

import type { LucideIcon } from 'lucide-react'
import { FilterPill } from '@/components/filter-pill'

export interface MultiFilterPillOption {
  value: string
  label: string
  count?: number
  icon?: LucideIcon
}

interface MultiFilterPillGroupProps {
  label?: string
  values: string[]
  onChange: (values: string[]) => void
  options: MultiFilterPillOption[]
}

/**
 * Multi-select state container for FilterPill. Promised by the FilterPillGroup
 * spec ("multi-select is a future MultiFilterPillGroup"). Click any pill toggles
 * its inclusion in `values`. No deselect-all affordance here — that's the
 * parent's responsibility (e.g. PickerFilterBar's "Clear all" button).
 */
export function MultiFilterPillGroup({
  label,
  values,
  onChange,
  options,
}: MultiFilterPillGroupProps) {
  const toggle = (value: string) => {
    if (values.includes(value)) {
      onChange(values.filter((v) => v !== value))
    } else {
      onChange([...values, value])
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {label && (
        <span className="w-16 shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      )}
      <div className="flex flex-wrap gap-1">
        {options.map((option) => (
          <FilterPill
            key={option.value}
            label={option.label}
            active={values.includes(option.value)}
            onClick={() => toggle(option.value)}
            icon={option.icon}
            count={option.count}
          />
        ))}
      </div>
    </div>
  )
}
