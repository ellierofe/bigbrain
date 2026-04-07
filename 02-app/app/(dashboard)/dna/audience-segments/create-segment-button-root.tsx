'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CreateSegmentModal } from '@/components/create-segment-modal'

export function CreateSegmentButtonRoot({ label }: { label?: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        <span className="ml-1.5">{label ?? 'New segment'}</span>
      </Button>
      <CreateSegmentModal open={open} onOpenChange={setOpen} />
    </>
  )
}
