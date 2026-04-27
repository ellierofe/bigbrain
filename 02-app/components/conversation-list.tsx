'use client'

import { useState } from 'react'
import { Plus, PanelLeftClose, PanelLeftOpen, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { archiveConversationAction } from '@/app/actions/chat'

interface ConversationSummary {
  id: string
  title: string | null
  preview: string | null
  updatedAt: Date | string
}

interface ConversationListProps {
  conversations: ConversationSummary[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
}

export function ConversationList({
  conversations,
  activeId,
  onSelect,
  onNew,
}: ConversationListProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [items, setItems] = useState(conversations)

  const handleArchive = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setItems((prev) => prev.filter((c) => c.id !== id))
    await archiveConversationAction(id)
  }

  if (collapsed) {
    return (
      <div className="flex w-12 shrink-0 flex-col items-center gap-2 border-r border-border py-3">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Expand panel"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onNew}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="New chat"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    )
  }

  const grouped = groupByDate(items)

  return (
    <div className="flex w-[280px] shrink-0 flex-col border-r border-border">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-border">
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Collapse panel"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
        <Button size="sm" onClick={onNew} className="gap-1.5 h-7 text-xs">
          <Plus className="h-3 w-3" />
          New chat
        </Button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto py-2">
        {items.length === 0 ? (
          <p className="px-3 py-8 text-center text-xs text-muted-foreground">
            No conversations yet
          </p>
        ) : (
          grouped.map(({ label, convs }) => (
            <div key={label}>
              <div className="px-3 pt-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </div>
              {convs.map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => onSelect(conv.id)}
                  className={`group flex w-full flex-col gap-0.5 rounded-md px-3 py-2 text-left transition-colors cursor-pointer ${
                    conv.id === activeId
                      ? 'bg-muted text-foreground'
                      : 'text-foreground/80 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate flex-1">
                      {conv.title ?? 'New conversation'}
                    </span>
                    <span
                      role="button"
                      tabIndex={-1}
                      onClick={(e) => handleArchive(e, conv.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); handleArchive(e as unknown as React.MouseEvent, conv.id) } }}
                      className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                      aria-label="Archive conversation"
                    >
                      <Trash2 className="h-3 w-3" />
                    </span>
                  </div>
                  {conv.preview && (
                    <span className="text-xs text-muted-foreground truncate">
                      {conv.preview}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// Group conversations by relative date
function groupByDate(conversations: ConversationSummary[]) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 86400000)
  const weekStart = new Date(todayStart.getTime() - 7 * 86400000)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const groups: { label: string; convs: ConversationSummary[] }[] = [
    { label: 'Today', convs: [] },
    { label: 'Yesterday', convs: [] },
    { label: 'Previous 7 days', convs: [] },
    { label: 'This month', convs: [] },
    { label: 'Older', convs: [] },
  ]

  for (const conv of conversations) {
    const date = new Date(conv.updatedAt)
    if (date >= todayStart) groups[0].convs.push(conv)
    else if (date >= yesterdayStart) groups[1].convs.push(conv)
    else if (date >= weekStart) groups[2].convs.push(conv)
    else if (date >= monthStart) groups[3].convs.push(conv)
    else groups[4].convs.push(conv)
  }

  return groups.filter((g) => g.convs.length > 0)
}
