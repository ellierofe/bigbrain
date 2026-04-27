'use client'

import type { ReactNode } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

interface CheckboxFieldProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  label: string | ReactNode
  description?: string
  disabled?: boolean
  className?: string
}

export function CheckboxField({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
  className,
}: CheckboxFieldProps) {
  return (
    <label
      className={cn(
        'flex items-start gap-2 px-2 py-1.5 rounded transition-colors',
        disabled
          ? 'opacity-50 cursor-not-allowed'
          : 'cursor-pointer hover:bg-muted/30',
        className,
      )}
    >
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onCheckedChange(Boolean(value))}
        disabled={disabled}
        className="mt-0.5"
      />
      <span className="flex-1">
        <span className={cn('block text-sm', disabled ? 'text-muted-foreground' : 'text-foreground')}>
          {label}
        </span>
        {description && (
          <span className="block text-xs text-muted-foreground mt-0.5">
            {description}
          </span>
        )}
      </span>
    </label>
  )
}
