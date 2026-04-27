'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { ActionButton } from '@/components/action-button'
import { CreateOfferModal } from '@/components/create-offer-modal'

interface CreateOfferButtonRootProps {
  label?: string
  brandId: string
  segments: {
    id: string
    segmentName: string
    problems: unknown[]
    desires: unknown[]
    objections: unknown[]
    sharedBeliefs: unknown[]
  }[]
}

export function CreateOfferButtonRoot({
  label = 'New offer',
  brandId,
  segments,
}: CreateOfferButtonRootProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <ActionButton icon={Plus} size="default" onClick={() => setOpen(true)}>
        {label}
      </ActionButton>
      <CreateOfferModal
        open={open}
        onOpenChange={setOpen}
        brandId={brandId}
        segments={segments}
      />
    </>
  )
}
