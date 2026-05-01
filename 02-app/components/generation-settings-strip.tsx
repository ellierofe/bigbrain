'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { NumberStepper } from '@/components/number-stepper'

export type PersonOverride = 'default' | 'singular' | 'plural'

export interface GenerationSettingsStripValue {
  modelSlug: string // '' = default
  person: PersonOverride
  toneVariation: string // '' = default (auto)
  variantCount: number
}

interface GenerationSettingsStripProps {
  value: GenerationSettingsStripValue
  onChange: (value: GenerationSettingsStripValue) => void
  aiModels: { slug: string; name: string }[]
  toneOptions: { value: string; label: string }[]
  variantMin?: number
  variantMax?: number
}

/**
 * Lighter inline Settings strip for the creator-workspace-three-region pattern.
 * Compact controls (Model + I/we override + Tone variation + Variant count)
 * sit in a single bg-muted/40 row above the primary action button — kept
 * lighter than a SectionCard to reduce visual weight at the bottom of the rail.
 */
export function GenerationSettingsStrip({
  value,
  onChange,
  aiModels,
  toneOptions,
  variantMin = 1,
  variantMax = 20,
}: GenerationSettingsStripProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md bg-muted/40 px-3 py-2">
      <Control label="Model">
        <Select
          value={value.modelSlug}
          onValueChange={(v) => onChange({ ...value, modelSlug: v ?? '' })}
        >
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="Default">
              {(v) => {
                const sel = typeof v === 'string' ? v : value.modelSlug
                if (!sel) return 'Default'
                const m = aiModels.find((mm) => mm.slug === sel)
                return m?.name ?? 'Default'
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Default</SelectItem>
            {aiModels.map((m) => (
              <SelectItem key={m.slug} value={m.slug}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Control>

      <Control label="I/we">
        <Select
          value={value.person}
          onValueChange={(v) => onChange({ ...value, person: (v as PersonOverride) ?? 'default' })}
        >
          <SelectTrigger className="h-8 w-[110px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="singular">I / me</SelectItem>
            <SelectItem value="plural">we / us</SelectItem>
          </SelectContent>
        </Select>
      </Control>

      {toneOptions.length > 0 && (
        <Control label="Tone">
          <Select
            value={value.toneVariation}
            onValueChange={(v) => onChange({ ...value, toneVariation: v ?? '' })}
          >
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Default (auto)">
                {(v) => {
                  const sel = typeof v === 'string' ? v : value.toneVariation
                  const o = toneOptions.find((opt) => opt.value === sel)
                  return o?.label ?? 'Default (auto)'
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {toneOptions.map((opt) => (
                <SelectItem key={opt.value || 'default'} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Control>
      )}

      <Control label="Variants">
        <NumberStepper
          value={value.variantCount}
          onChange={(n) => onChange({ ...value, variantCount: n })}
          min={variantMin}
          max={variantMax}
        />
      </Control>
    </div>
  )
}

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {children}
    </div>
  )
}
