'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import type { StrategyFieldId } from '@/lib/llm/content/types'

export interface StrategyFieldOption {
  value: string
  label: string
}

interface StrategyFieldProps {
  field: { id: StrategyFieldId; required: boolean }
  value: string | null
  onChange: (value: string | null) => void
  options?: StrategyFieldOption[]
  placeholder?: string
}

const FIELD_LABELS: Record<StrategyFieldId, string> = {
  audience_segment: 'Target audience',
  offer: 'Offer',
  knowledge_asset: 'Knowledge asset',
  platform: 'Channel',
  customer_journey_stage: 'Customer journey stage',
  tone_variation: 'Tone variation',
  sales_page_angle: 'Sales angle',
  cta_url: 'CTA link',
}

const TEXT_FIELDS = new Set<StrategyFieldId>(['sales_page_angle', 'cta_url'])

/**
 * Declarative widget registry for one strategy field. Switches on `field.id`
 * to render a Select (against `options`) or a text Input.
 *
 * Atom imports (Select, Input) live INSIDE this molecule — organisms compose
 * StrategyField, never the bare atoms.
 */
export function StrategyField({
  field,
  value,
  onChange,
  options = [],
  placeholder,
}: StrategyFieldProps) {
  const label = FIELD_LABELS[field.id]
  const isText = TEXT_FIELDS.has(field.id)

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
        {field.required && <span className="ml-0.5 text-destructive">*</span>}
      </label>
      {isText ? (
        <Input
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder={placeholder}
        />
      ) : (
        <Select value={value ?? ''} onValueChange={(v) => onChange(v || null)}>
          <SelectTrigger>
            <SelectValue placeholder={placeholder ?? `Select ${label.toLowerCase()}…`}>
              {(v) => {
                const sel = typeof v === 'string' ? v : value
                const opt = options.find((o) => o.value === sel)
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
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
