import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface MissingPrereqDeeplinkProps {
  /** Object label without the leading verb. e.g. "an Offer", "a Newsletter channel". */
  label: string
  href: string
}

/**
 * "+ Add ${label} →" deeplink for empty-state affordances inline under
 * locked cards or empty topic-engine steps.
 */
export function MissingPrereqDeeplink({ label, href }: MissingPrereqDeeplinkProps) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
    >
      <span>+ Add {label}</span>
      <ArrowRight className="h-3 w-3" />
    </Link>
  )
}
