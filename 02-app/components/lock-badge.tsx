import { Lock } from 'lucide-react'

interface LockBadgeProps {
  label: string
}

/**
 * Tiny "Needs an X" pill shown on locked content-type cards.
 * Token-only styling (no appearance classes leak into organisms).
 */
export function LockBadge({ label }: LockBadgeProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground">
      <Lock className="h-3 w-3" />
      {label}
    </span>
  )
}
