'use client'

import { Plus, ChevronDown } from 'lucide-react'
import { ActionMenu } from '@/components/action-menu'
import { ActionButton } from '@/components/action-button'

export function NewInputDropdown() {
  return (
    <ActionMenu
      trigger={
        <ActionButton icon={Plus} size="default">
          New input
          <ChevronDown className="h-3 w-3 opacity-50" />
        </ActionButton>
      }
      items={[
        { type: 'link', label: 'Sources', href: '/inputs/sources' },
        { type: 'disabled', label: 'Document', hint: 'Soon' },
        { type: 'disabled', label: 'Audio', hint: 'Soon' },
        { type: 'disabled', label: 'URL / Link', hint: 'Soon' },
      ]}
    />
  )
}
