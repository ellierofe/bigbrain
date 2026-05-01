'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { MissingPrereqDeeplink } from '@/components/missing-prereq-deeplink'

export interface TopicCascadeStepOption {
  key: string
  label: string
  /** When true, the option is dimmed and not selectable. */
  isLocked?: boolean
  missingPrereqLabel?: string
  missingPrereqHref?: string
}

interface TopicCascadeStepProps {
  label: string
  required: boolean
  /** When true, render checkbox list. When false, render single-select dropdown. */
  allowMultiSelect: boolean
  options: TopicCascadeStepOption[]
  selectedKeys: string[]
  onChange: (keys: string[]) => void
  loading?: boolean
}

/**
 * Single step in the topic engine cascade. Renders either a Select (single)
 * or a checkbox list (multi). Locked options are dimmed with an inline
 * "+ Add" deeplink.
 */
export function TopicCascadeStep({
  label,
  required,
  allowMultiSelect,
  options,
  selectedKeys,
  onChange,
  loading = false,
}: TopicCascadeStepProps) {
  const labelEl = (
    <label className="text-xs font-medium text-muted-foreground">
      {label}
      {required && <span className="ml-0.5 text-destructive">*</span>}
    </label>
  )

  if (loading) {
    return (
      <div className="flex flex-col gap-1.5">
        {labelEl}
        <div className="h-9 animate-pulse rounded-md bg-muted" />
      </div>
    )
  }

  if (allowMultiSelect) {
    const toggle = (key: string) => {
      if (selectedKeys.includes(key)) {
        onChange(selectedKeys.filter((k) => k !== key))
      } else {
        onChange([...selectedKeys, key])
      }
    }
    return (
      <div className="flex flex-col gap-1.5">
        {labelEl}
        <div className="flex flex-col gap-1 rounded-md border p-2">
          {options.length === 0 ? (
            <p className="text-xs text-muted-foreground">No options available.</p>
          ) : (
            // Each row wraps Checkbox + label text in one <label> element so the
            // whole row is clickable. The base-ui Checkbox is a custom <div> — an
            // external <label htmlFor=...> won't dispatch clicks to it.
            options.map((opt) => (
              <label
                key={opt.key}
                className={`flex items-start gap-2 rounded px-1 py-1 text-sm leading-snug transition-colors ${
                  opt.isLocked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-muted/40'
                }`}
              >
                <Checkbox
                  checked={selectedKeys.includes(opt.key)}
                  onCheckedChange={() => !opt.isLocked && toggle(opt.key)}
                  disabled={opt.isLocked}
                  className="mt-0.5"
                />
                <span className="flex-1">{opt.label}</span>
              </label>
            ))
          )}
        </div>
      </div>
    )
  }

  // Single-select
  const value = selectedKeys[0] ?? ''
  return (
    <div className="flex flex-col gap-1.5">
      {labelEl}
      <Select value={value} onValueChange={(v) => onChange(v ? [v] : [])}>
        <SelectTrigger>
          <SelectValue placeholder="Select one…">
            {(v) => {
              const sel = typeof v === 'string' ? v : value
              const opt = options.find((o) => o.key === sel)
              return opt?.label ?? sel ?? ''
            }}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">
              No options available
            </div>
          ) : (
            options.map((opt) => (
              <SelectItem
                key={opt.key}
                value={opt.key}
                disabled={opt.isLocked}
                className={opt.isLocked ? 'opacity-60' : ''}
              >
                {opt.label}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
      {/* Locked-prereq deeplinks below the select */}
      {options.filter((o) => o.isLocked && o.missingPrereqHref).map((opt) => (
        <div key={opt.key} className="ml-1">
          <MissingPrereqDeeplink
            label={opt.missingPrereqLabel ?? opt.label}
            href={opt.missingPrereqHref!}
          />
        </div>
      ))}
    </div>
  )
}
