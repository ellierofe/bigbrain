'use client'

import { Minus, Plus } from 'lucide-react'
import { IconButton } from '@/components/icon-button'

interface NumberStepperProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  /** Optional aria-label for the value display. Defaults to "Value". */
  label?: string
}

/**
 * Three-segment stepper: − / value / +. IconButton bookends use the
 * existing molecule; the value sits in a small read-only display.
 */
export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = Infinity,
  step = 1,
  label = 'Value',
}: NumberStepperProps) {
  const decrement = () => {
    if (value - step >= min) onChange(value - step)
  }
  const increment = () => {
    if (value + step <= max) onChange(value + step)
  }

  return (
    <div className="inline-flex items-center gap-1">
      <IconButton
        icon={Minus}
        label="Decrease"
        onClick={decrement}
        disabled={value - step < min}
        size="sm"
        variant="outline"
        tooltip={false}
      />
      <span
        className="inline-flex h-8 min-w-[2.5rem] items-center justify-center rounded-md border bg-background px-2 text-sm tabular-nums"
        aria-label={label}
      >
        {value}
      </span>
      <IconButton
        icon={Plus}
        label="Increase"
        onClick={increment}
        disabled={value + step > max}
        size="sm"
        variant="outline"
        tooltip={false}
      />
    </div>
  )
}
