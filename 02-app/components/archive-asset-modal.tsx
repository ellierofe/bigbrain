'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/modal'
import { Button } from '@/components/ui/button'
import { checkAndArchiveAsset, confirmArchiveAsset } from '@/app/actions/knowledge-assets'

interface ArchiveAssetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assetId: string
  assetName: string
}

export function ArchiveAssetModal({
  open,
  onOpenChange,
  assetId,
  assetName,
}: ArchiveAssetModalProps) {
  const router = useRouter()
  const [phase, setPhase] = useState<'checking' | 'confirm' | 'archiving'>('checking')
  const [dependents, setDependents] = useState<{ name: string; type: string }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!open) {
      setPhase('checking')
      setDependents([])
      setError(null)
      return
    }

    startTransition(async () => {
      const result = await checkAndArchiveAsset(assetId)
      if (result.ok) {
        setDependents(result.data.dependents)
        setPhase('confirm')
      } else {
        setError(result.error)
        setPhase('confirm')
      }
    })
  }, [open, assetId])

  async function handleConfirm() {
    setPhase('archiving')
    startTransition(async () => {
      const result = await confirmArchiveAsset(assetId)
      if (result.ok) {
        onOpenChange(false)
        if (result.data.nextId) {
          router.push(`/dna/knowledge-assets/${result.data.nextId}`)
        } else {
          router.push('/dna/knowledge-assets')
        }
      } else {
        setError(result.error)
        setPhase('confirm')
      }
    })
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Archive Knowledge Asset">
      {phase === 'checking' && (
        <p className="text-sm text-muted-foreground">Checking for dependencies...</p>
      )}

      {phase === 'confirm' && error && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      )}

      {phase === 'confirm' && !error && (
        <div className="flex flex-col gap-4">
          {dependents.length > 0 ? (
            <>
              <p className="text-sm">
                <strong>{assetName}</strong> is referenced by:
              </p>
              <ul className="list-disc pl-5 text-sm text-muted-foreground">
                {dependents.map((d, i) => (
                  <li key={i}>
                    {d.name} ({d.type})
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">
                Archived assets remain visible where referenced but cannot be selected for new work.
              </p>
            </>
          ) : (
            <p className="text-sm">
              Archive <strong>{assetName}</strong>? It will remain visible where referenced but
              won't be selectable for new work.
            </p>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirm}
              disabled={isPending}
            >
              {dependents.length > 0 ? 'Archive anyway' : 'Archive'}
            </Button>
          </div>
        </div>
      )}

      {phase === 'archiving' && (
        <p className="text-sm text-muted-foreground">Archiving...</p>
      )}
    </Modal>
  )
}
