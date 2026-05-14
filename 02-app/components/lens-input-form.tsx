'use client'

import { cn } from '@/lib/utils'
import type { LensId } from '@/lib/types/lens'

interface LensInputFormProps {
  lens: LensId
  value: string
  onChange: (value: string) => void
  className?: string
}

// V1 only supports decision-text input (for the `decision-support` lens).
// Future lenses can register additional input shapes by extending this molecule.

export function LensInputForm({ lens, value, onChange, className }: LensInputFormProps) {
  if (lens !== 'decision-support') return null

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Decision text
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. Should I run a defence-tech investor roundtable in Q3?"
        rows={3}
        className="w-full rounded-md border border-border/60 bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-field-active/50 focus:bg-field-active/[0.03] resize-none"
      />
      <span className="text-[11px] text-muted-foreground">Required for decision-support.</span>
    </div>
  )
}
