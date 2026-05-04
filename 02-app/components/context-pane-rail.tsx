'use client'

import type { LucideIcon } from 'lucide-react'
import { RailIcon } from '@/components/rail-icon'

interface ContextPaneRailTab {
  id: string
  label: string
  icon: LucideIcon
  status: 'active' | 'empty'
  dot?: 'success' | null
  adornment?: 'check' | null
}

interface ContextPaneRailProps {
  /** Tabs already filtered by parent (no 'hidden' entries). */
  tabs: ContextPaneRailTab[]
  selectedTabId: string
  onSelect: (tabId: string) => void
}

export function ContextPaneRail({ tabs, selectedTabId, onSelect }: ContextPaneRailProps) {
  return (
    <div
      role="tablist"
      aria-orientation="vertical"
      className="flex w-14 shrink-0 flex-col items-center gap-2 border-l border-border bg-muted px-2 py-3"
    >
      {tabs.map((tab) => (
        <RailIcon
          key={tab.id}
          icon={tab.icon}
          label={tab.label}
          selected={tab.id === selectedTabId}
          status={tab.status}
          dot={tab.dot}
          adornment={tab.adornment}
          onClick={() => onSelect(tab.id)}
        />
      ))}
    </div>
  )
}
