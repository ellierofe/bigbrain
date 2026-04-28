'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/modal'
import { Button } from '@/components/ui/button'

interface DependencyCheckOk {
  ok: true
  data: { dependents: { name: string; type: string }[] }
}
interface DependencyCheckErr {
  ok: false
  error: string
}
type DependencyCheckResult = DependencyCheckOk | DependencyCheckErr

interface ConfirmArchiveOk {
  ok: true
  data: { nextId?: string | null }
}
interface ConfirmArchiveErr {
  ok: false
  error: string
}
type ConfirmArchiveResult = ConfirmArchiveOk | ConfirmArchiveErr

export interface ArchiveCopy {
  withDependents?: string
  warningWithDependents?: string
  withoutDependents?: string
}

interface ArchiveItemModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemName: string
  /** Singular lowercase noun for the entity, e.g. "channel", "offer", "segment". */
  itemType: string
  dependencyCheck: () => Promise<DependencyCheckResult>
  onConfirm: () => Promise<ConfirmArchiveResult>
  onArchived?: (nextId: string | null) => void
  dependentsCopy?: ArchiveCopy
}

type Phase = 'checking' | 'confirm' | 'archiving'

const DEFAULT_COPY: Required<ArchiveCopy> = {
  withDependents: 'This {itemType} is used by:',
  warningWithDependents:
    'These references will remain but show the {itemType} as archived.',
  withoutDependents:
    'This {itemType} will no longer appear in selection. It will remain visible where already referenced.',
}

function fillTemplate(template: string, itemType: string): string {
  return template.replaceAll('{itemType}', itemType)
}

export function ArchiveItemModal({
  open,
  onOpenChange,
  itemName,
  itemType,
  dependencyCheck,
  onConfirm,
  onArchived,
  dependentsCopy,
}: ArchiveItemModalProps) {
  const [phase, setPhase] = useState<Phase>('checking')
  const [dependents, setDependents] = useState<{ name: string; type: string }[]>([])

  const copy = {
    withDependents: dependentsCopy?.withDependents ?? DEFAULT_COPY.withDependents,
    warningWithDependents:
      dependentsCopy?.warningWithDependents ?? DEFAULT_COPY.warningWithDependents,
    withoutDependents:
      dependentsCopy?.withoutDependents ?? DEFAULT_COPY.withoutDependents,
  }

  useEffect(() => {
    if (!open) {
      setPhase('checking')
      setDependents([])
      return
    }

    let cancelled = false
    ;(async () => {
      const result = await dependencyCheck()
      if (cancelled) return
      if (!result.ok) {
        toast.error(result.error)
        onOpenChange(false)
        return
      }
      setDependents(result.data.dependents)
      setPhase('confirm')
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function handleConfirm() {
    setPhase('archiving')
    const result = await onConfirm()
    if (!result.ok) {
      toast.error(result.error)
      onOpenChange(false)
      return
    }
    onOpenChange(false)
    onArchived?.(result.data.nextId ?? null)
  }

  const hasDependents = dependents.length > 0

  const footer =
    phase === 'confirm' ? (
      <>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={handleConfirm}>
          {hasDependents ? 'Archive anyway' : 'Archive'}
        </Button>
      </>
    ) : undefined

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Archive "${itemName}"`}
      size="md"
      footer={footer}
    >
      {phase === 'checking' && (
        <div className="py-4 text-center text-sm text-muted-foreground">
          Checking dependencies…
        </div>
      )}

      {phase === 'confirm' && (
        <div className="flex flex-col gap-4">
          {hasDependents ? (
            <>
              <p className="text-sm text-muted-foreground">
                {fillTemplate(copy.withDependents, itemType)}
              </p>
              <ul className="rounded-md border border-border bg-muted/30 p-3 text-sm space-y-1">
                {dependents.map((dep, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-muted-foreground">{dep.type}:</span>
                    <span>{dep.name}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">
                {fillTemplate(copy.warningWithDependents, itemType)}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {fillTemplate(copy.withoutDependents, itemType)}
            </p>
          )}
        </div>
      )}

      {phase === 'archiving' && (
        <div className="py-4 text-center text-sm text-muted-foreground">
          Archiving…
        </div>
      )}
    </Modal>
  )
}
