'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { ActionButton } from '@/components/action-button'
import { CreatePlatformModal } from '@/components/create-platform-modal'

export function CreatePlatformButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <ActionButton icon={Plus} onClick={() => setOpen(true)}>
        New channel
      </ActionButton>
      <CreatePlatformModal open={open} onOpenChange={setOpen} />
    </>
  )
}
