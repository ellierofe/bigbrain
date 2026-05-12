'use client'

import type { ContextTab } from './types'
import { skillStateTab } from '@/lib/skills/context-tab'
import { pendingWritesTab } from './pending-writes-tab'

export const contextPaneTabRegistry: Record<string, ContextTab> = {
  [skillStateTab.id]: skillStateTab,
  [pendingWritesTab.id]: pendingWritesTab,
}

export function listContextPaneTabs(): ContextTab[] {
  return Object.values(contextPaneTabRegistry).sort((a, b) => a.priority - b.priority)
}

export function getContextPaneTab(id: string): ContextTab | null {
  return contextPaneTabRegistry[id] ?? null
}
