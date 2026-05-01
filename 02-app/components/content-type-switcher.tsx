'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface ContentTypeSwitcherOption {
  /** content_type slug — used as the navigation target. */
  value: string
  /** Display name. */
  label: string
}

interface ContentTypeSwitcherProps {
  currentSlug: string
  options: ContentTypeSwitcherOption[]
  /** Called with the new slug; consumer is responsible for navigation. */
  onChange: (slug: string) => void
}

/**
 * Compact dropdown switcher for the creator-workspace-three-region pattern.
 * Renders the current content type as the trigger; on change, the consumer
 * navigates to /content/create/[slug]. Replaces the previous "Switch ↗" link
 * to keep the user inside the workspace flow.
 */
export function ContentTypeSwitcher({
  currentSlug,
  options,
  onChange,
}: ContentTypeSwitcherProps) {
  return (
    <Select value={currentSlug} onValueChange={(v) => v && onChange(v)}>
      <SelectTrigger className="h-8 min-w-[180px] text-xs">
        <SelectValue>
          {(v) => {
            const sel = typeof v === 'string' ? v : currentSlug
            const opt = options.find((o) => o.value === sel)
            return opt?.label ?? sel
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
