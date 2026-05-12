/**
 * Shared value renderer used by StageCard (skill-state pane) and
 * PendingWriteCard (pending-writes pane). Renders unknown values as readable
 * markup: strings via MarkdownRenderer, booleans as Yes/No, arrays as bullet
 * lists, objects as nested key/value rows, and falls back to a JSON code
 * block.
 *
 * Extracted from StageCard's inline GatheredValueView during OUT-01c build —
 * the same shape was about to land in PendingWriteCard, and the design system
 * rule against duplicate styling decisions applies.
 */

import { MarkdownRenderer } from '@/components/markdown-renderer'

export interface ValueRenderProps {
  value: unknown
  /** Cap on string-content scrollable height. Defaults to 200px (StageCard pattern). */
  maxHeightPx?: number
}

export function ValueRender({ value, maxHeightPx = 200 }: ValueRenderProps) {
  if (value === null || value === undefined || value === '') {
    return <span className="text-muted-foreground">—</span>
  }
  if (typeof value === 'string') {
    return (
      <div
        className="overflow-y-auto whitespace-pre-wrap break-words"
        style={{ maxHeight: `${maxHeightPx}px` }}
      >
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
    return (
      <pre className="overflow-auto rounded bg-muted p-2 text-xs">
        {JSON.stringify(value, null, 2)}
      </pre>
    )
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
                <pre className="overflow-auto rounded bg-muted p-2 text-xs">
                  {JSON.stringify(v, null, 2)}
                </pre>
              )}
            </dd>
          </div>
        ))}
      </dl>
    )
  }
  return (
    <pre className="overflow-auto rounded bg-muted p-2 text-xs">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}
