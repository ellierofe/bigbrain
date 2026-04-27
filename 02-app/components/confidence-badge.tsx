import type { Confidence } from '@/lib/types/processing'

const styles: Record<Confidence, string> = {
  high: 'bg-success-bg text-success-foreground',
  medium: 'bg-warning-bg text-warning-foreground',
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
