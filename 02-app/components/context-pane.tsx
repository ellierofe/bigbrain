'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { ContextPaneRail } from '@/components/context-pane-rail'
import { IconButton } from '@/components/icon-button'
import type { ContextTab, ContextTabStatus, ConversationCtx } from '@/lib/chat-context-pane/types'

interface ContextPaneProps {
  ctx: ConversationCtx
  tabs: ContextTab[]
  /** Whether the content panel is open. Rail is always visible. */
  paneOpen: boolean
  paneWidth: number
  selectedTabId: string | null
  onPaneOpenChange: (open: boolean) => void
  onPaneWidthChange: (width: number) => void
  onSelectedTabChange: (tabId: string) => void
}

const MIN_WIDTH = 280
const MAX_WIDTH = 560
const MIN_MESSAGE_AREA = 480
const RAIL_WIDTH = 56

export function ContextPane({
  ctx,
  tabs,
  paneOpen,
  paneWidth,
  selectedTabId,
  onPaneOpenChange,
  onPaneWidthChange,
  onSelectedTabChange,
}: ContextPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [draftWidth, setDraftWidth] = useState(paneWidth)
  const draftWidthRef = useRef(paneWidth)
  const [dragging, setDragging] = useState(false)
  const dragStart = useRef<{ clientX: number; startWidth: number } | null>(null)

  useEffect(() => {
    if (!dragging) setDraftWidth(paneWidth)
  }, [paneWidth, dragging])

  useEffect(() => {
    draftWidthRef.current = draftWidth
  }, [draftWidth])

  const tabStatuses = useMemo(() => {
    const map = new Map<string, ContextTabStatus>()
    for (const tab of tabs) map.set(tab.id, tab.status(ctx))
    return map
  }, [tabs, ctx])

  const visibleTabs = useMemo(() => {
    return tabs
      .filter((tab) => tabStatuses.get(tab.id) !== 'hidden')
      .sort((a, b) => a.priority - b.priority)
  }, [tabs, tabStatuses])

  const effectiveSelectedId = useMemo(() => {
    if (selectedTabId && visibleTabs.some((t) => t.id === selectedTabId)) {
      return selectedTabId
    }
    const firstActive = visibleTabs.find((t) => tabStatuses.get(t.id) === 'active')
    return firstActive?.id ?? visibleTabs[0]?.id ?? null
  }, [selectedTabId, visibleTabs, tabStatuses])

  const selectedTab = useMemo(
    () => visibleTabs.find((t) => t.id === effectiveSelectedId) ?? null,
    [visibleTabs, effectiveSelectedId]
  )

  // Measure viewport on mount/resize for the width clamp.
  const [maxAllowed, setMaxAllowed] = useState(MAX_WIDTH)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const compute = () => {
      const container = containerRef.current?.parentElement
      if (!container) {
        setMaxAllowed(MAX_WIDTH)
        return
      }
      const containerWidth = container.getBoundingClientRect().width
      const allowed = Math.max(MIN_WIDTH, containerWidth - MIN_MESSAGE_AREA - RAIL_WIDTH)
      setMaxAllowed(Math.min(MAX_WIDTH, allowed))
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [paneOpen])

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      dragStart.current = { clientX: e.clientX, startWidth: paneWidth }
      setDragging(true)
    },
    [paneWidth]
  )

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent) => {
      const start = dragStart.current
      if (!start) return
      // Drag from the left edge: moving left increases width, right decreases.
      const delta = start.clientX - e.clientX
      const next = Math.min(maxAllowed, Math.max(MIN_WIDTH, start.startWidth + delta))
      setDraftWidth(next)
    }
    const onUp = () => {
      setDragging(false)
      dragStart.current = null
      // Read the latest draftWidth via a ref-style read instead of inside a
      // state setter — calling onPaneWidthChange (a parent setState) inside
      // a state-update callback is treated by React as setState-during-render.
      const finalWidth = draftWidthRef.current
      if (finalWidth !== paneWidth) onPaneWidthChange(finalWidth)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [dragging, maxAllowed, paneWidth, onPaneWidthChange])

  const clampedWidth = Math.min(maxAllowed, Math.max(MIN_WIDTH, draftWidth))

  const handleRailIconClick = useCallback(
    (tabId: string) => {
      // If rail is the active surface (panel closed): clicking opens the panel
      // and selects that tab. If panel is open and we click a different tab,
      // switch tabs. If panel is open and we click the current tab, collapse.
      if (!paneOpen) {
        onSelectedTabChange(tabId)
        onPaneOpenChange(true)
        return
      }
      if (tabId === effectiveSelectedId) {
        onPaneOpenChange(false)
        return
      }
      onSelectedTabChange(tabId)
    },
    [paneOpen, effectiveSelectedId, onPaneOpenChange, onSelectedTabChange]
  )

  return (
    <div
      ref={containerRef}
      data-pane-open={paneOpen}
      style={{ width: paneOpen ? clampedWidth + RAIL_WIDTH : RAIL_WIDTH }}
      className="relative flex h-full shrink-0 flex-row border-l border-border bg-card"
    >
      {paneOpen && (
        <button
          type="button"
          aria-label="Resize context pane"
          onMouseDown={onMouseDown}
          className="group absolute left-0 top-0 z-10 flex h-full w-2 -translate-x-1/2 cursor-col-resize items-center justify-center"
        >
          <span
            aria-hidden
            className="h-full w-px bg-transparent transition-colors group-hover:bg-[var(--color-sage-border)]"
          />
        </button>
      )}
      {paneOpen && (
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-medium text-foreground">
              {selectedTab?.label ?? 'Context'}
            </span>
            <IconButton
              icon={X}
              label="Close panel"
              variant="ghost"
              size="icon"
              onClick={() => onPaneOpenChange(false)}
            />
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">
            {selectedTab ? selectedTab.render(ctx) : null}
          </div>
        </div>
      )}
      <ContextPaneRail
        tabs={visibleTabs.map((tab) => {
          const status = (tabStatuses.get(tab.id) ?? 'empty') as 'active' | 'empty'
          return {
            id: tab.id,
            label: tab.label,
            icon: tab.icon,
            status,
            dot: status === 'active' ? 'success' : null,
            adornment: tab.adornment ? tab.adornment(ctx) : null,
          }
        })}
        selectedTabId={paneOpen ? effectiveSelectedId ?? '' : ''}
        onSelect={handleRailIconClick}
      />
    </div>
  )
}
