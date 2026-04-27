'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Modal } from '@/components/modal'
import { SelectField } from '@/components/select-field'
import { Button } from '@/components/ui/button'
import { updatePlatformCategoryAndChannel } from '@/app/actions/platforms'
import {
  CATEGORIES,
  CATEGORY_LABELS,
  CHANNEL_LABELS,
  channelsForCategory,
  type Category,
  type Channel,
} from '@/lib/types/channels'

interface ChangeCategoryChannelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  platformId: string
  currentCategory: Category
  currentChannel: Channel
}

export function ChangeCategoryChannelModal({
  open,
  onOpenChange,
  platformId,
  currentCategory,
  currentChannel,
}: ChangeCategoryChannelModalProps) {
  const router = useRouter()
  const [category, setCategory] = useState<Category>(currentCategory)
  const [channel, setChannel] = useState<Channel>(currentChannel)
  const [saving, setSaving] = useState(false)

  function handleCategoryChange(next: Category) {
    if (next === category) return
    setCategory(next)
    // If the current channel isn't valid for the new category, reset to first option
    const allowed = channelsForCategory(next)
    if (!allowed.includes(channel)) {
      setChannel(allowed[0])
    }
  }

  async function handleSave() {
    setSaving(true)
    const result = await updatePlatformCategoryAndChannel(platformId, category, channel)
    setSaving(false)
    if (result.ok) {
      toast.success('Category and channel updated')
      onOpenChange(false)
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  function handleClose() {
    if (saving) return
    setCategory(currentCategory)
    setChannel(currentChannel)
    onOpenChange(false)
  }

  const categoryOptions = CATEGORIES.map((c) => ({ value: c, label: CATEGORY_LABELS[c] }))
  const channelOptions = channelsForCategory(category).map((c) => ({
    value: c,
    label: CHANNEL_LABELS[c],
  }))

  const categoryChanged = category !== currentCategory

  return (
    <Modal open={open} onOpenChange={handleClose} title="Change category / channel" size="md">
      <div className="flex flex-col gap-5 pt-2">
        <SelectField
          label="Category"
          value={category}
          options={categoryOptions}
          onSave={(v) => {
            handleCategoryChange(v as Category)
            return Promise.resolve({ ok: true })
          }}
        />

        <SelectField
          label="Channel"
          value={channel}
          options={channelOptions}
          onSave={(v) => {
            setChannel(v as Channel)
            return Promise.resolve({ ok: true })
          }}
        />

        {categoryChanged && (
          <p className="rounded-md bg-warning-bg px-3 py-2 text-xs text-warning-foreground">
            Changing category may hide some fields and show others. No data will be deleted.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={handleClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
