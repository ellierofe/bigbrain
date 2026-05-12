'use client'

import { ArrowRight, Pencil, Plus, Sparkles } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { ActionButton } from '@/components/action-button'
import { StatusBadge } from '@/components/status-badge'
import { ValueRender } from '@/lib/value-render'
import { entityBreadcrumb } from '@/lib/db/writes/entity-breadcrumb'
import type { WriteEntityType } from '@/lib/db/writes/types'
import { cn } from '@/lib/utils'

export type PendingWriteCardState = 'idle' | 'saving' | 'success' | 'error' | 'rejected'

export type PendingWriteCardPayload =
  | { op: 'update'; field: string; before: unknown; after: unknown }
  | { op: 'create'; fields: { label: string; value: unknown }[] }
  | { op: 'generate'; seedSummary: string }

export interface PendingWriteCardProps {
  id: string
  entityType: WriteEntityType
  op: 'update' | 'create' | 'generate'
  payload: PendingWriteCardPayload
  state: PendingWriteCardState
  errorMessage?: string
  onConfirm: () => void
  onReject: () => void
}

const OP_ICON = {
  update: Pencil,
  create: Plus,
  generate: Sparkles,
} as const

const OP_LABEL = {
  update: 'Update',
  create: 'Create',
  generate: 'Generate',
} as const

const STATE_BADGE_OPTIONS = [
  { value: 'saving', label: 'Saving…', state: 'info' as const },
  { value: 'success', label: 'Saved', state: 'success' as const },
  { value: 'started', label: 'Started', state: 'success' as const },
  { value: 'error', label: 'Failed', state: 'error' as const },
  { value: 'rejected', label: 'Rejected', state: 'neutral' as const },
]

export function PendingWriteCard({
  id,
  entityType,
  op,
  payload,
  state,
  errorMessage,
  onConfirm,
  onReject,
}: PendingWriteCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isSaving = state === 'saving'
  const isError = state === 'error'

  // Cmd/Ctrl+Enter primary-action shortcut while focused inside the card.
  useEffect(() => {
    const node = containerRef.current
    if (!node) return
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (state === 'idle' || state === 'error') {
          e.preventDefault()
          onConfirm()
        }
      }
    }
    node.addEventListener('keydown', onKey)
    return () => {
      node.removeEventListener('keydown', onKey)
    }
  }, [onConfirm, state])

  const Icon = OP_ICON[op]
  const summary = buildOpSummary(op, payload)
  const breadcrumb = entityBreadcrumb(entityType)

  const showStatusPill = state !== 'idle'
  const statusPillValue =
    state === 'saving' ? 'saving'
    : state === 'success' ? (op === 'generate' ? 'started' : 'success')
    : state === 'error' ? 'error'
    : state === 'rejected' ? 'rejected'
    : 'saving'

  const primaryLoadingLabel =
    op === 'update' ? 'Confirming…'
    : op === 'create' ? 'Creating…'
    : 'Starting…'
  const primaryIdleLabel =
    op === 'update' ? 'Confirm'
    : op === 'create' ? 'Create'
    : 'Generate'

  return (
    <div
      ref={containerRef}
      data-pending-write-id={id}
      tabIndex={-1}
      className="flex w-full flex-col rounded-lg border border-border bg-card focus-within:outline-none"
    >
      <div className="flex items-start justify-between gap-3 px-4 py-3">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-xs text-muted-foreground">{breadcrumb}</span>
            <span className="truncate text-sm font-medium text-foreground">
              {OP_LABEL[op]} {summary}
            </span>
          </div>
        </div>
        {showStatusPill && (
          <StatusBadge status={statusPillValue} options={STATE_BADGE_OPTIONS} />
        )}
      </div>

      <div className="flex flex-col gap-3 border-t border-border px-4 py-3">
        {payload.op === 'update' && <UpdateBody field={payload.field} before={payload.before} after={payload.after} />}
        {payload.op === 'create' && <CreateBody fields={payload.fields} />}
        {payload.op === 'generate' && <GenerateBody seedSummary={payload.seedSummary} />}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
        <ActionButton variant="ghost" onClick={onReject} disabled={isSaving}>
          Reject
        </ActionButton>
        <ActionButton
          onClick={onConfirm}
          loading={isSaving}
          disabled={isSaving}
          trailingIcon={op === 'generate' ? ArrowRight : undefined}
          tooltip="⌘↵"
        >
          {isSaving ? primaryLoadingLabel : primaryIdleLabel}
        </ActionButton>
      </div>

      {isError && errorMessage && (
        <p className="border-t border-border px-4 py-2 text-xs text-destructive">{errorMessage}</p>
      )}
    </div>
  )
}

function buildOpSummary(
  op: 'update' | 'create' | 'generate',
  payload: PendingWriteCardPayload
): string {
  if (payload.op === 'update') return payload.field
  if (payload.op === 'create') return ''
  return ''
}

function UpdateBody({
  field,
  before,
  after,
}: {
  field: string
  before: unknown
  after: unknown
}) {
  const beforeIsEmpty = before === null || before === undefined || before === ''
  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Before
        </span>
        {beforeIsEmpty ? (
          <span className="text-sm italic text-muted-foreground">Empty</span>
        ) : (
          <div className="text-sm text-muted-foreground">
            <ValueRender value={before} maxHeightPx={200} />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          After
        </span>
        <div className={cn('border-l-2 border-[var(--primary)] pl-3 text-sm text-foreground')}>
          <ValueRender value={after} maxHeightPx={200} />
        </div>
      </div>
      {/* Field name shown small below for context (e.g. when summary truncated) */}
      <span className="text-[11px] text-muted-foreground">field: {field}</span>
    </>
  )
}

function CreateBody({ fields }: { fields: { label: string; value: unknown }[] }) {
  return (
    <div className="max-h-[400px] overflow-y-auto">
      <dl className="flex flex-col gap-3">
        {fields.map((entry, index) => (
          <div key={`${entry.label}-${index}`} className="flex flex-col gap-1">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {entry.label}
            </dt>
            <dd className="text-sm text-foreground">
              <ValueRender value={entry.value} maxHeightPx={200} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function GenerateBody({ seedSummary }: { seedSummary: string }) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Seed
        </span>
        <blockquote className="border-l-2 border-[var(--primary)] pl-3 text-sm text-foreground whitespace-pre-wrap">
          {seedSummary}
        </blockquote>
      </div>
      <p className="text-xs text-muted-foreground">
        Generation runs in the background. You&apos;ll be notified when ready.
      </p>
    </>
  )
}
