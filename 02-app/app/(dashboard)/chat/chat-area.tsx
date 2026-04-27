'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Brain } from 'lucide-react'
import type { UIMessage } from 'ai'
import { useChat } from '@/lib/chat/use-chat'
import { ChatMessage } from '@/components/chat-message'
import { ChatInput } from '@/components/chat-input'
import { PromptStarter } from '@/components/prompt-starter'
import { ConversationList } from '@/components/conversation-list'

interface ConversationSummary {
  id: string
  title: string | null
  preview: string | null
  updatedAt: Date | string
}

interface ChatAreaProps {
  conversationId: string | null
  initialMessages: UIMessage[]
  conversations: ConversationSummary[]
  compact?: boolean
}

const PROMPT_STARTERS = [
  'What do I know about...',
  'Help me think through...',
  'Write me a...',
  'How does my strategy...',
]

export function ChatArea({
  conversationId,
  initialMessages,
  conversations,
  compact,
}: ChatAreaProps) {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const shouldAutoScroll = useRef(true)
  const [pendingInput, setPendingInput] = useState<string | undefined>()

  const {
    messages,
    setMessages,
    status,
    error,
    sendMessage,
    stop,
  } = useChat({
    conversationId,
    onConversationCreated: (id) => {
      // Update URL without full navigation
      window.history.replaceState(null, '', `/chat/${id}`)
    },
    onFinish: () => {
      // Refresh the page data (conversation list) after a response
      router.refresh()
    },
  })

  // Load initial messages on mount or conversation change
  useEffect(() => {
    setMessages(initialMessages)
  }, [conversationId, initialMessages, setMessages])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (shouldAutoScroll.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Track if user has scrolled up
  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100
    shouldAutoScroll.current = isAtBottom
  }, [])

  const handleSend = useCallback(
    (text: string, files?: File[]) => {
      shouldAutoScroll.current = true
      sendMessage(text, files)
    },
    [sendMessage]
  )

  const handlePromptClick = useCallback(
    (text: string) => {
      setPendingInput(text)
    },
    []
  )

  const handlePendingConsumed = useCallback(() => {
    setPendingInput(undefined)
  }, [])

  const handleSelectConversation = useCallback(
    (id: string) => {
      router.push(`/chat/${id}`)
    },
    [router]
  )

  const handleNewConversation = useCallback(() => {
    router.push('/chat')
  }, [router])

  const isStreaming = status === 'streaming' || status === 'submitted'
  const isEmpty = messages.length === 0

  if (compact) {
    return (
      <div className="flex h-full flex-col">
        <ChatMessageList
          messages={messages}
          isEmpty={isEmpty}
          isStreaming={isStreaming}
          error={error}
          scrollRef={scrollRef}
          onScroll={handleScroll}
          onPromptClick={handlePromptClick}
          compact
        />
        <div className="shrink-0 border-t border-border p-3">
          <ChatInput
            onSend={handleSend}
            onStop={stop}
            isStreaming={isStreaming}
            pendingValue={pendingInput}
            onPendingValueConsumed={handlePendingConsumed}
            compact
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <ConversationList
        conversations={conversations}
        activeId={conversationId}
        onSelect={handleSelectConversation}
        onNew={handleNewConversation}
      />
      <div className="flex flex-1 min-w-0 flex-col">
        <ChatMessageList
          messages={messages}
          isEmpty={isEmpty}
          isStreaming={isStreaming}
          error={error}
          scrollRef={scrollRef}
          onScroll={handleScroll}
          onPromptClick={handlePromptClick}
        />
        <div className="shrink-0 border-t border-border px-6 py-4">
          <ChatInput
            onSend={handleSend}
            onStop={stop}
            isStreaming={isStreaming}
            pendingValue={pendingInput}
            onPendingValueConsumed={handlePendingConsumed}
          />
        </div>
      </div>
    </div>
  )
}

function ChatMessageList({
  messages,
  isEmpty,
  isStreaming,
  error,
  scrollRef,
  onScroll,
  onPromptClick,
  compact,
}: {
  messages: UIMessage[]
  isEmpty: boolean
  isStreaming: boolean
  error: Error | null
  scrollRef: React.RefObject<HTMLDivElement | null>
  onScroll: () => void
  onPromptClick: (text: string) => void
  compact?: boolean
}) {
  const padding = compact ? 'px-4 py-4' : 'px-6 py-4'
  const gap = compact ? 'gap-4' : 'gap-6'

  if (isEmpty) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <div className="flex flex-col items-center gap-6 max-w-lg text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Brain className="h-6 w-6 text-muted-foreground" />
          </div>
          <h2 className="font-heading text-lg font-semibold text-foreground">
            What can I help you with?
          </h2>
          <div className={compact ? 'flex flex-col gap-2 w-full' : 'grid grid-cols-2 gap-2 w-full'}>
            {PROMPT_STARTERS.slice(0, compact ? 2 : 4).map((prompt) => (
              <PromptStarter key={prompt} text={prompt} onClick={onPromptClick} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
      className={`flex-1 overflow-y-auto ${padding}`}
    >
      <div className={`${compact ? '' : 'max-w-3xl mx-auto'} flex flex-col ${gap}`}>
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} compact={compact} />
        ))}

        {/* Streaming cursor */}
        {isStreaming && messages.length > 0 && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div className="h-5 w-1 animate-pulse rounded-full bg-foreground/30" />
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Something went wrong. Try again.
          </div>
        )}
      </div>
    </div>
  )
}
