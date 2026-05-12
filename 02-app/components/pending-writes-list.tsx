'use client'

import { FileCheck } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { PaneHighlightPulse } from '@/components/pane-highlight-pulse'
import {
  PendingWriteCard,
  type PendingWriteCardProps,
  type PendingWriteCardState,
  type PendingWriteCardPayload,
} from '@/components/pending-write-card'
import type { WriteEntityType } from '@/lib/db/writes/types'

export interface PendingWriteSummary {
  id: string
  entityType: WriteEntityType
  op: 'update' | 'create' | 'generate'
  payload: PendingWriteCardPayload
}

interface PendingWritesListProps {
  writes: PendingWriteSummary[]
  stateById: Record<string, PendingWriteCardState>
  errorById: Record<string, string | undefined>
  onConfirm: (id: string) => void
  onReject: (id: string) => void
}

export function PendingWritesList({
  writes,
  stateById,
  errorById,
  onConfirm,
  onReject,
}: PendingWritesListProps) {
  if (writes.length === 0) {
    return (
      <EmptyState
        icon={FileCheck}
        heading="Nothing pending"
        description="The chat will propose writes here when needed."
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {writes.map((write) => {
        const state = stateById[write.id] ?? 'idle'
        const errorMessage = errorById[write.id]
        const cardProps: PendingWriteCardProps = {
          id: write.id,
          entityType: write.entityType,
          op: write.op,
          payload: write.payload,
          state,
          errorMessage,
          onConfirm: () => onConfirm(write.id),
          onReject: () => onReject(write.id),
        }
        return (
          <PaneHighlightPulse key={write.id} pulseKey={write.id}>
            <PendingWriteCard {...cardProps} />
          </PaneHighlightPulse>
        )
      })}
    </div>
  )
}
