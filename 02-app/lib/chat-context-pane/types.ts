import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { UIMessage } from 'ai'
import type { SkillState } from '@/lib/skills/types'
import type { PendingWriteSummary } from '@/components/pending-writes-list'

export type { PendingWriteSummary }

export type ContextTabStatus = 'active' | 'empty' | 'hidden'

/**
 * Client-safe summary of a registered skill. The full Skill object lives only
 * on the server (it carries the brief text + Zod schemas + callbacks); the
 * pane consumes this small projection in the browser.
 */
export interface SkillSummary {
  id: string
  name: string
  description: string
  mode: 'discursive' | 'staged'
  checklistMeta: { id: string; label: string }[]
  stagesMeta: { id: string; label: string; checklistItemIds: string[] }[]
}

export interface ConversationCtx {
  conversation: {
    id: string
    skillId: string | null
    skillState: SkillState | null
    contextPaneState: ContextPaneState | null
  }
  messages: UIMessage[]
  /** True when the conversation has at least one persisted message. */
  hasMessages: boolean
  /** All registered skills, projected to a client-safe summary. */
  availableSkills: SkillSummary[]
  /** Summary for the active conversation's skill (if any), or null. */
  activeSkillSummary: SkillSummary | null
  /** Pending LLM-proposed writes for this conversation (status='pending' rows). */
  pendingWrites: PendingWriteSummary[]
}

export interface ContextPaneState {
  selectedTabId: string
  /** Stashed when a tab auto-selects; used as fallback when that tab returns to 'hidden'. */
  previousTabId?: string | null
}

export interface ContextTab {
  id: string
  label: string
  icon: LucideIcon
  /** Default ordering in the rail; lower values appear first. */
  priority: number
  /**
   * 'active' = applicable AND has content (rail icon shown with success dot)
   * 'empty'  = applicable but no content yet (rail icon shown, no dot)
   * 'hidden' = not applicable to this conversation (rail icon hidden)
   */
  status: (ctx: ConversationCtx) => ContextTabStatus
  /**
   * Optional adornment overlay on the rail icon (bottom-right). e.g. 'check'
   * for a completed terminal state. Returning null means no adornment.
   */
  adornment?: (ctx: ConversationCtx) => 'check' | null
  render: (ctx: ConversationCtx) => ReactNode
}
