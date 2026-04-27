'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { ActionButton } from '@/components/action-button'
import { CreateAssetModal } from '@/components/create-asset-modal'

interface CreateAssetButtonRootProps {
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

export function CreateAssetButtonRoot({
  label = 'New asset',
  brandId,
  segments,
}: CreateAssetButtonRootProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <ActionButton icon={Plus} size="default" onClick={() => setOpen(true)}>
        {label}
      </ActionButton>
      <CreateAssetModal
        open={open}
        onOpenChange={setOpen}
        brandId={brandId}
        segments={segments}
      />
    </>
  )
}
