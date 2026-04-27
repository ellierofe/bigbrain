'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Modal } from '@/components/modal'
import { Button } from '@/components/ui/button'
import { checkAndArchivePlatform, confirmArchivePlatform } from '@/app/actions/platforms'

interface ArchivePlatformModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  platformId: string
  platformName: string
}

type ModalState =
  | { phase: 'checking' }
  | { phase: 'confirm'; dependents: { name: string; type: string }[] }
  | { phase: 'archiving' }

export function ArchivePlatformModal({
  open,
  onOpenChange,
  platformId,
  platformName,
}: ArchivePlatformModalProps) {
  const router = useRouter()
  const [state, setState] = useState<ModalState>({ phase: 'checking' })
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (!open) {
      setState({ phase: 'checking' })
      return
    }
    startTransition(async () => {
      const result = await checkAndArchivePlatform(platformId)
      if (!result.ok) {
        toast.error(result.error)
        onOpenChange(false)
        return
      }
      setState({ phase: 'confirm', dependents: result.data.dependents })
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleConfirm() {
    setState({ phase: 'archiving' })
    startTransition(async () => {
      const result = await confirmArchivePlatform(platformId)
      if (result.ok) {
        onOpenChange(false)
        if (result.data.nextId) {
          router.push(`/dna/platforms/${result.data.nextId}`)
        } else {
          router.push('/dna/platforms')
        }
      } else {
        toast.error(result.error)
        onOpenChange(false)
      }
    })
  }

  const hasDependents = state.phase === 'confirm' && state.dependents.length > 0

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Archive "${platformName}"`}
      size="md"
    >
      {state.phase === 'checking' && (
        <div className="py-4 text-center text-sm text-muted-foreground">
          Checking dependencies…
        </div>
      )}

      {state.phase === 'confirm' && (
        <div className="flex flex-col gap-4">
          {hasDependents ? (
            <>
              <p className="text-sm text-muted-foreground">
                This channel is used by:
              </p>
              <ul className="rounded-md border border-border bg-muted/30 p-3 text-sm space-y-1">
                {state.dependents.map((dep, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-muted-foreground">{dep.type}:</span>
                    <span>{dep.name}</span>
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted-foreground">
                These references will remain but show the channel as archived.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              This channel will no longer appear in content creation. It will remain visible where already referenced.
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirm}>
              {hasDependents ? 'Archive anyway' : 'Archive'}
            </Button>
          </div>
        </div>
      )}

      {state.phase === 'archiving' && (
        <div className="py-4 text-center text-sm text-muted-foreground">
          Archiving…
        </div>
      )}
    </Modal>
  )
}
