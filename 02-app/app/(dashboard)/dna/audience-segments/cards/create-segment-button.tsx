'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { ActionButton } from '@/components/action-button'
import { CreateSegmentModal } from '@/components/create-segment-modal'

export function CreateSegmentButton({ label }: { label?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <ActionButton icon={Plus} onClick={() => setOpen(true)}>
        {label ?? 'New segment'}
      </ActionButton>
      <CreateSegmentModal open={open} onOpenChange={setOpen} />
    </>
  )
}
