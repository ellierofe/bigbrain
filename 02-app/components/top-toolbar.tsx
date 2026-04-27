'use client'

import { useState } from 'react'
import { Lightbulb, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IdeaCaptureModal } from '@/components/idea-capture-modal'
import { ChatDrawer } from '@/components/chat-drawer'

export function TopToolbar() {
  const [ideaModalOpen, setIdeaModalOpen] = useState(false)
  const [chatDrawerOpen, setChatDrawerOpen] = useState(false)

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setChatDrawerOpen(true)}
          className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
          aria-label="Open chat"
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIdeaModalOpen(true)}
          className="h-8 w-8 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
          aria-label="Capture idea"
        >
          <Lightbulb className="h-4 w-4" />
        </Button>
      </div>
      <IdeaCaptureModal open={ideaModalOpen} onOpenChange={setIdeaModalOpen} />
      <ChatDrawer open={chatDrawerOpen} onOpenChange={setChatDrawerOpen} />
    </>
  )
}
