'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { X, ExternalLink, Plus } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { ChatArea } from '@/app/(dashboard)/chat/chat-area'

interface ChatDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ChatDrawer({ open, onOpenChange }: ChatDrawerProps) {
  const router = useRouter()
  const [conversationId, setConversationId] = useState<string | null>(null)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  const handleOpenInFullView = useCallback(() => {
    onOpenChange(false)
    if (conversationId) {
      router.push(`/chat/${conversationId}`)
    } else {
      router.push('/chat')
    }
  }, [conversationId, router, onOpenChange])

  const handleNewChat = useCallback(() => {
    setConversationId(null)
  }, [])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-foreground/10"
            onClick={() => onOpenChange(false)}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed right-0 top-0 z-40 flex h-full w-[440px] flex-col border-l border-border bg-background shadow-[var(--shadow-overlay)]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <button
                type="button"
                onClick={handleNewChat}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="h-3 w-3" />
                New chat
              </button>
              <span className="text-sm font-medium text-foreground truncate max-w-[200px]">
                {conversationId ? 'Chat' : 'New chat'}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleOpenInFullView}
                  className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Open in full view"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Chat content */}
            <div className="flex-1 min-h-0">
              <ChatArea
                conversationId={conversationId}
                initialMessages={[]}
                conversations={[]}
                compact
                skillState={null}
                skillName={null}
                skillMode={null}
                skillInRegistry={true}
                conversationHasMessages={false}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
