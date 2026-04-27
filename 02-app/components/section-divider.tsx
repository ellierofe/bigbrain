import { cn } from '@/lib/utils'

interface SectionDividerProps {
  label?: string
  className?: string
}

export function SectionDivider({ label, className }: SectionDividerProps) {
  return (
    <div className={cn('my-1', className)}>
      {label && (
        <span className="block px-1 pb-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/50">
          {label}
        </span>
      )}
      <hr className="border-t border-border/30" />
    </div>
  )
}
