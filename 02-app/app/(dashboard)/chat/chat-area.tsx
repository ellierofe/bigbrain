'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Brain } from 'lucide-react'
import { toast } from 'sonner'
import type { UIMessage } from 'ai'
import { useChat } from '@/lib/chat/use-chat'
import { ChatMessage } from '@/components/chat-message'
import { ChatInput } from '@/components/chat-input'
import { PromptStarter } from '@/components/prompt-starter'
import { ConversationList } from '@/components/conversation-list'
import { ContextPane } from '@/components/context-pane'
import { InlineWarningBanner } from '@/components/inline-warning-banner'
import { SkillContinueBar } from '@/components/skill-continue-bar'
import { Modal } from '@/components/modal'
import { ActionButton } from '@/components/action-button'
import {
  attachSkillAction,
  createConversationWithSkillAction,
  advanceStageAction,
} from '@/app/actions/skills'
import {
  setChatPaneOpenAction,
  setChatPaneWidthAction,
} from '@/app/actions/brand-preferences'
import { setContextPaneStateAction } from '@/app/actions/chat'
import { listContextPaneTabs } from '@/lib/chat-context-pane/registry'
import type { ConversationCtx, SkillSummary } from '@/lib/chat-context-pane/types'
import type { SkillState } from '@/lib/skills/types'

interface ConversationSummary {
  id: string
  title: string | null
  preview: string | null
  updatedAt: Date | string
  skillId: string | null
  skillCompletedAt: string | null
  skillInRegistry: boolean
}

interface ChatAreaProps {
  conversationId: string | null
  initialMessages: UIMessage[]
  conversations: ConversationSummary[]
  compact?: boolean
  skillState: SkillState | null
  skillName: string | null
  skillMode: 'discursive' | 'staged' | null
  skillInRegistry: boolean
  conversationHasMessages: boolean
  /** Brand-level preference: pane open/closed (defaults true). Ignored in compact mode. */
  paneOpen?: boolean
  /** Brand-level preference: pane width in px. Defaults to 360. */
  paneWidth?: number
  /** Per-conversation persisted tab selection. Null = pane uses default-selection logic. */
  paneSelectedTabId?: string | null
  /** Conversation ID used by the pane (mirror of conversationId). */
  paneConversationId?: string | null
  /** Skill ID used by the pane's ConversationCtx. */
  paneSkillId?: string | null
  /** Skill state used by the pane's ConversationCtx. */
  paneSkillState?: SkillState | null
  /** All registered skills, projected to client-safe summaries. */
  paneAvailableSkills?: SkillSummary[]
  /** Summary for the active conversation's skill (if any). */
  paneActiveSkillSummary?: SkillSummary | null
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
  skillState,
  skillName,
  skillMode,
  skillInRegistry,
  conversationHasMessages,
  paneOpen: paneOpenInitial = true,
  paneWidth: paneWidthInitial = 360,
  paneSelectedTabId = null,
  paneConversationId = null,
  paneSkillId = null,
  paneSkillState = null,
  paneAvailableSkills = [],
  paneActiveSkillSummary = null,
}: ChatAreaProps) {
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const shouldAutoScroll = useRef(true)
  const [pendingInput, setPendingInput] = useState<string | undefined>()
  const [pendingSkillSwitch, setPendingSkillSwitch] = useState<string | null>(null)
  const [advancing, setAdvancing] = useState(false)

  // Pane state — optimistic local state with server-action persistence.
  const [paneOpen, setPaneOpen] = useState(paneOpenInitial)
  const [paneWidth, setPaneWidth] = useState(paneWidthInitial)
  const [selectedTabId, setSelectedTabId] = useState<string | null>(paneSelectedTabId)
  useEffect(() => setPaneOpen(paneOpenInitial), [paneOpenInitial])
  useEffect(() => setPaneWidth(paneWidthInitial), [paneWidthInitial])
  useEffect(() => setSelectedTabId(paneSelectedTabId), [paneSelectedTabId])

  const handlePaneOpenChange = useCallback((open: boolean) => {
    setPaneOpen(open)
    setChatPaneOpenAction(open).catch(() => {
      toast.error('Could not save pane preference.')
      setPaneOpen((prev) => !prev)
    })
  }, [])

  const handlePaneWidthChange = useCallback((width: number) => {
    setPaneWidth(width)
    setChatPaneWidthAction(width).catch(() => {
      // Width is cosmetic — silent revert is fine; toast would be noisy on drag-end.
    })
  }, [])

  const handleSelectedTabChange = useCallback(
    (tabId: string) => {
      setSelectedTabId(tabId)
      if (paneConversationId) {
        setContextPaneStateAction(paneConversationId, tabId).catch(() => {
          // Silent — selected-tab persistence is a nice-to-have, not critical.
        })
      }
    },
    [paneConversationId]
  )

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
      window.history.replaceState(null, '', `/chat/${id}`)
    },
    onFinish: () => {
      router.refresh()
    },
  })

  useEffect(() => {
    setMessages(initialMessages)
  }, [conversationId, initialMessages, setMessages])

  useEffect(() => {
    if (shouldAutoScroll.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

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

  const handlePromptClick = useCallback((text: string) => setPendingInput(text), [])
  const handlePendingConsumed = useCallback(() => setPendingInput(undefined), [])
  const handleSelectConversation = useCallback(
    (id: string) => router.push(`/chat/${id}`),
    [router]
  )
  const handleNewConversation = useCallback(() => router.push('/chat'), [router])

  const handleSlashCommand = useCallback(
    async (skillId: string): Promise<boolean> => {
      const isEmptyAndUnattached =
        Boolean(conversationId) &&
        !conversationHasMessages &&
        !skillName &&
        messages.length === 0

      // Case A: empty current conversation, no skill — attach in place.
      if (isEmptyAndUnattached && conversationId) {
        try {
          await attachSkillAction(conversationId, skillId)
          router.refresh()
          return true
        } catch {
          toast.error('Could not start that skill.')
          return false
        }
      }

      // Special case: brand-new chat with no conversationId yet (truly empty) —
      // create a new conversation with the skill and route to it.
      if (!conversationId) {
        try {
          const { conversationId: newId } = await createConversationWithSkillAction(skillId)
          router.push(`/chat/${newId}`)
          return true
        } catch {
          toast.error('Could not start that skill.')
          return false
        }
      }

      // Case B: conversation has messages or an existing skill — confirm switch.
      setPendingSkillSwitch(skillId)
      return true
    },
    [conversationId, conversationHasMessages, skillName, messages.length, router]
  )

  const handleConfirmSkillSwitch = useCallback(async () => {
    if (!pendingSkillSwitch) return
    try {
      const { conversationId: newId } = await createConversationWithSkillAction(pendingSkillSwitch)
      setPendingSkillSwitch(null)
      router.push(`/chat/${newId}`)
    } catch {
      toast.error('Could not start that skill.')
      setPendingSkillSwitch(null)
    }
  }, [pendingSkillSwitch, router])

  const handleAdvance = useCallback(async () => {
    if (!conversationId) return
    setAdvancing(true)
    try {
      const result = await advanceStageAction(conversationId)
      if (result.ok) {
        toast.success(`Stage advanced to ${result.nextStageLabel}`)
        router.refresh()
      } else if ('missing' in result && result.missing) {
        toast.error(`Still gathering: ${result.missing.join(', ')}`)
      } else {
        toast.error("Couldn't advance stage. Try again.")
      }
    } catch {
      toast.error("Couldn't advance stage. Try again.")
    } finally {
      setAdvancing(false)
    }
  }, [conversationId, router])

  const isStreaming = status === 'streaming' || status === 'submitted'
  const isEmpty = messages.length === 0

  const showRegistryMissBanner =
    Boolean(conversationId) && Boolean(skillState) && !skillInRegistry
  const showContinueBar =
    Boolean(skillState) &&
    skillMode === 'staged' &&
    skillState?.readyToAdvance === true &&
    !isStreaming

  const continueMissingItems = (() => {
    if (!showContinueBar || !skillState?.currentStage) return []
    return skillState.checklist.filter((c) => !c.filled).map((c) => c.label)
  })()

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

  const paneTabs = listContextPaneTabs()
  const paneCtx: ConversationCtx = {
    conversation: {
      id: paneConversationId ?? '',
      skillId: paneSkillId,
      skillState: paneSkillState,
      contextPaneState: selectedTabId ? { selectedTabId } : null,
    },
    messages,
    hasMessages: messages.length > 0 || conversationHasMessages,
    availableSkills: paneAvailableSkills,
    activeSkillSummary: paneActiveSkillSummary,
  }

  return (
    <div className="flex h-full w-full">
      <ConversationList
        conversations={conversations}
        activeId={conversationId}
        onSelect={handleSelectConversation}
        onNew={handleNewConversation}
      />
      <div className="flex flex-1 min-w-0 flex-col">
        {showRegistryMissBanner && (
          <div className="px-6 pt-3">
            <InlineWarningBanner
              title="This conversation used a skill that's no longer available."
              subtitle="Messages remain readable; the skill cannot be resumed."
            />
          </div>
        )}
        <ChatMessageList
          messages={messages}
          isEmpty={isEmpty}
          isStreaming={isStreaming}
          error={error}
          scrollRef={scrollRef}
          onScroll={handleScroll}
          onPromptClick={handlePromptClick}
          continueBar={
            showContinueBar ? (
              <SkillContinueBar
                missingItems={continueMissingItems}
                loading={advancing}
                onAdvance={handleAdvance}
              />
            ) : null
          }
        />
        <div className="shrink-0 border-t border-border px-6 py-4">
          <ChatInput
            onSend={handleSend}
            onStop={stop}
            isStreaming={isStreaming}
            pendingValue={pendingInput}
            onPendingValueConsumed={handlePendingConsumed}
            onSlashCommand={handleSlashCommand}
          />
        </div>
      </div>

      <ContextPane
        ctx={paneCtx}
        tabs={paneTabs}
        paneOpen={paneOpen}
        paneWidth={paneWidth}
        selectedTabId={selectedTabId}
        onPaneOpenChange={handlePaneOpenChange}
        onPaneWidthChange={handlePaneWidthChange}
        onSelectedTabChange={handleSelectedTabChange}
      />

      <Modal
        open={pendingSkillSwitch !== null}
        onOpenChange={(open) => !open && setPendingSkillSwitch(null)}
        title="Start a new conversation?"
        description="Skills can only run in a fresh conversation. Start a new one?"
        footer={
          <>
            <ActionButton variant="ghost" onClick={() => setPendingSkillSwitch(null)}>
              Cancel
            </ActionButton>
            <ActionButton onClick={handleConfirmSkillSwitch}>
              Start new conversation
            </ActionButton>
          </>
        }
      >
        <div />
      </Modal>
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
  continueBar,
}: {
  messages: UIMessage[]
  isEmpty: boolean
  isStreaming: boolean
  error: Error | null
  scrollRef: React.RefObject<HTMLDivElement | null>
  onScroll: () => void
  onPromptClick: (text: string) => void
  compact?: boolean
  continueBar?: React.ReactNode
}) {
  const padding = compact ? 'px-4 py-4' : 'px-6 py-4'
  const gap = compact ? 'gap-4' : 'gap-6'

  if (isEmpty) {
    return (
      <div className="flex flex-1 items-center justify-center px-6">
        <div
          className={`flex flex-col items-center gap-6 text-center ${
            compact ? 'max-w-lg' : 'max-w-2xl w-full'
          }`}
        >
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

        {isStreaming && messages.length > 0 && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div className="h-5 w-1 animate-pulse rounded-full bg-foreground/30" />
          </div>
        )}

        {continueBar}

        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            Something went wrong. Try again.
          </div>
        )}
      </div>
    </div>
  )
}
