'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileEdit } from 'lucide-react'
import { toast } from 'sonner'
import { PendingWritesList } from '@/components/pending-writes-list'
import type { PendingWriteCardState } from '@/components/pending-write-card'
import {
  confirmPendingWriteAction,
  rejectPendingWriteAction,
} from '@/app/actions/pending-writes'
import type { ContextTab, ConversationCtx, PendingWriteSummary } from './types'

const PENDING_WRITES_TAB_ID = 'pending-writes'

export const pendingWritesTab: ContextTab = {
  id: PENDING_WRITES_TAB_ID,
  label: 'Pending writes',
  icon: FileEdit,
  /** Higher than skill-state (10) so when both are active, pending-writes appears below in the rail
   *  (lower priority = higher in the rail; sorting is ascending). */
  priority: 20,
  status: (ctx) => (ctx.pendingWrites.length > 0 ? 'active' : 'hidden'),
  render: (ctx) => <PendingWritesTabBody ctx={ctx} />,
}

function PendingWritesTabBody({ ctx }: { ctx: ConversationCtx }) {
  const router = useRouter()
  // Per-id transient state. Card-level state machine for the brief window
  // between the user's confirm/reject click and the server's response (and the
  // 300ms auto-remove animation that follows). The map is keyed by pending-id;
  // unknown ids render as 'idle' via the `?? 'idle'` fallback at lookup time.
  const [stateById, setStateById] = useState<Record<string, PendingWriteCardState>>({})
  const [errorById, setErrorById] = useState<Record<string, string | undefined>>({})
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())

  const setLocalState = useCallback((id: string, state: PendingWriteCardState) => {
    setStateById((prev) => ({ ...prev, [id]: state }))
  }, [])

  const handleConfirm = useCallback(
    async (id: string) => {
      setLocalState(id, 'saving')
      setErrorById((e) => ({ ...e, [id]: undefined }))
      const result = await confirmPendingWriteAction(id)
      if (result.ok) {
        setLocalState(id, 'success')
        toast.success('Saved')
        setTimeout(() => {
          setRemovedIds((prev) => new Set(prev).add(id))
          router.refresh()
        }, 300)
      } else {
        setLocalState(id, 'error')
        setErrorById((e) => ({ ...e, [id]: result.error }))
      }
    },
    [router, setLocalState]
  )

  const handleReject = useCallback(
    async (id: string) => {
      setLocalState(id, 'rejected')
      setErrorById((e) => ({ ...e, [id]: undefined }))
      const result = await rejectPendingWriteAction(id)
      if (result.ok) {
        setTimeout(() => {
          setRemovedIds((prev) => new Set(prev).add(id))
          router.refresh()
        }, 300)
      } else {
        setLocalState(id, 'error')
        setErrorById((e) => ({ ...e, [id]: result.error }))
      }
    },
    [router, setLocalState]
  )

  const visibleWrites: PendingWriteSummary[] = ctx.pendingWrites.filter(
    (w) => !removedIds.has(w.id)
  )

  return (
    <PendingWritesList
      writes={visibleWrites}
      stateById={stateById}
      errorById={errorById}
      onConfirm={handleConfirm}
      onReject={handleReject}
    />
  )
}

export { PENDING_WRITES_TAB_ID }
