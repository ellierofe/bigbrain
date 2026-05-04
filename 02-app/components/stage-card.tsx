'use client'

import { Check, ChevronDown, ChevronUp, Circle } from 'lucide-react'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { cn } from '@/lib/utils'

interface StageCardValue {
  label: string
  value: unknown
}

interface StageCardProps {
  id: string
  label: string
  status: 'completed' | 'current' | 'pending'
  expanded: boolean
  onToggle: () => void
  gatheredValues: StageCardValue[]
}

export function StageCard({
  id,
  label,
  status,
  expanded,
  onToggle,
  gatheredValues,
}: StageCardProps) {
  const isCurrent = status === 'current'
  return (
    <div
      data-stage-id={id}
      className={cn(
        'rounded-lg bg-card',
        isCurrent
          ? 'border border-l-[3px] border-border border-l-[var(--primary)]'
          : 'border border-border'
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {!isCurrent && (
          <span aria-hidden className="flex h-4 w-4 shrink-0 items-center justify-center">
            {status === 'completed' ? (
              <Check className="h-4 w-4 text-[var(--color-success)]" />
            ) : (
              <Circle className="h-4 w-4 text-muted-foreground" />
            )}
          </span>
        )}
        <span className="flex-1 text-sm font-medium text-foreground">
          {label}
          {isCurrent && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">(current)</span>
          )}
        </span>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-border px-4 py-3">
          {gatheredValues.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nothing captured yet.</p>
          ) : (
            <dl className="flex flex-col gap-3">
              {gatheredValues.map((entry, index) => (
                <div key={`${entry.label}-${index}`} className="flex flex-col gap-1">
                  <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {entry.label}
                  </dt>
                  <dd className="text-sm text-foreground">
                    <GatheredValueView value={entry.value} />
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </div>
  )
}

function GatheredValueView({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted-foreground">—</span>
  }
  if (typeof value === 'string') {
    return (
      <div className="max-h-[200px] overflow-y-auto whitespace-pre-wrap break-words">
        <MarkdownRenderer content={value} compact />
      </div>
    )
  }
  if (typeof value === 'boolean') {
    return <span>{value ? 'Yes' : 'No'}</span>
  }
  if (typeof value === 'number') {
    return <span>{value}</span>
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">Empty list</span>
    if (value.every((item) => typeof item === 'string' || typeof item === 'number')) {
      return (
        <ul className="ml-4 list-disc">
          {value.map((item, index) => (
            <li key={index}>{String(item)}</li>
          ))}
        </ul>
      )
    }
    return <pre className="overflow-auto rounded bg-muted p-2 text-xs">{JSON.stringify(value, null, 2)}</pre>
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return <span className="text-muted-foreground">Empty</span>
    return (
      <dl className="flex flex-col gap-1.5">
        {entries.map(([k, v]) => (
          <div key={k} className="flex flex-col">
            <dt className="text-xs font-medium text-muted-foreground">{k}</dt>
            <dd className="text-sm text-foreground">
              {typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? (
                <span>{String(v)}</span>
              ) : (
                <pre className="overflow-auto rounded bg-muted p-2 text-xs">{JSON.stringify(v, null, 2)}</pre>
              )}
            </dd>
          </div>
        ))}
      </dl>
    )
  }
  return <pre className="overflow-auto rounded bg-muted p-2 text-xs">{JSON.stringify(value, null, 2)}</pre>
}
