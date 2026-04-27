'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/modal'
import { Button } from '@/components/ui/button'
import { checkOfferDependents, archiveOfferAction } from '@/app/actions/offers'
import { toast } from 'sonner'

interface ArchiveOfferModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  offerId: string
  offerName: string
}

export function ArchiveOfferModal({
  open,
  onOpenChange,
  offerId,
  offerName,
}: ArchiveOfferModalProps) {
  const router = useRouter()
  const [dependents, setDependents] = useState<{ name: string; type: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [archiving, setArchiving] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    checkOfferDependents(offerId).then(result => {
      if (result.ok) {
        setDependents(result.data.dependents)
      }
      setLoading(false)
    })
  }, [open, offerId])

  async function handleArchive() {
    setArchiving(true)
    const result = await archiveOfferAction(offerId)
    setArchiving(false)

    if (!result.ok) {
      toast.error(result.error)
      return
    }

    onOpenChange(false)
    if (result.data.redirectTo) {
      router.push(result.data.redirectTo)
    } else {
      router.push('/dna/offers')
    }
    router.refresh()
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={`Archive "${offerName}"?`}
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Checking dependencies…</p>
      ) : dependents.length > 0 ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm">
            This offer is referenced by:
          </p>
          <ul className="list-disc pl-5 text-sm text-muted-foreground">
            {dependents.map((dep, i) => (
              <li key={i}>
                {dep.name} <span className="text-xs">({dep.type})</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            These references will remain but show the offer as archived.
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          This offer will no longer appear in new content or project creation.
          It will remain visible where already referenced.
        </p>
      )}

      <div className="mt-4 flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onOpenChange(false)}
          disabled={archiving}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleArchive}
          disabled={loading || archiving}
        >
          {archiving ? 'Archiving…' : dependents.length > 0 ? 'Archive anyway' : 'Archive'}
        </Button>
      </div>
    </Modal>
  )
}
