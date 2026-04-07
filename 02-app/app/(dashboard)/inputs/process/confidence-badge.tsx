import type { Confidence } from '@/lib/types/processing'

const styles: Record<Confidence, string> = {
  high: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  low: 'bg-muted text-muted-foreground',
}

const labels: Record<Confidence, string> = {
  high: 'HIGH',
  medium: 'MED',
  low: 'LOW',
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return (
    <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold tracking-wide ${styles[confidence]}`}>
      {labels[confidence]}
    </span>
  )
}
