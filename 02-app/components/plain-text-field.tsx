'use client'

import { SectionLabel } from '@/components/section-label'
import { cn } from '@/lib/utils'

interface PlainTextFieldBaseProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

type PlainTextFieldProps =
  | (PlainTextFieldBaseProps & { variant?: 'input' })
  | (PlainTextFieldBaseProps & { variant: 'textarea'; rows?: number })

/**
 * Controlled, non-autosave text input or textarea inside a modal or form
 * surface. Used when the value is collected and submitted as a batch (e.g.
 * paste-text modal, future explicit-submit forms). Distinct from `InlineField`
 * (which autosaves) and `ListRowField` (which is bare-chrome for list rows).
 */
export function PlainTextField(props: PlainTextFieldProps) {
  const { label, value, onChange, placeholder, disabled, className } = props
  const isTextarea = 'variant' in props && props.variant === 'textarea'

  const sharedClass = cn(
    'w-full rounded-md border border-border/60 bg-transparent px-3 py-2 text-sm',
    'focus:outline-none focus:border-field-active/50 focus:bg-field-active/[0.03]',
    disabled && 'opacity-50 cursor-not-allowed',
    className,
  )

  return (
    <div className="flex flex-col gap-1">
      <SectionLabel>{label}</SectionLabel>
      {isTextarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          rows={(props as Extract<PlainTextFieldProps, { variant: 'textarea' }>).rows ?? 3}
          className={cn(sharedClass, 'resize-none')}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={sharedClass}
        />
      )}
    </div>
  )
}
