import { cn } from '@/lib/utils'

interface SectionLabelProps {
  children: React.ReactNode
  className?: string
}

/**
 * Small uppercase label used to title a sub-block inside a SectionCard or
 * a fieldset-like grouping. Same chrome as InlineField's floating label patch.
 * Captures the 10px uppercase-tracking pattern so organisms don't carry inline
 * `text-*` classes when they need a section title without the full SectionCard
 * envelope (e.g. above a chip row, above a free-form input inside a modal).
 */
export function SectionLabel({ children, className }: SectionLabelProps) {
  return (
    <span
      className={cn(
        'text-[10px] font-semibold uppercase tracking-wide text-muted-foreground',
        className,
      )}
    >
      {children}
    </span>
  )
}
