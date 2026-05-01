'use client'

import { AlertTriangle, Brain, Check, MessageCircle } from 'lucide-react'

interface ConversationListRowIconProps {
  state: 'freeform' | 'skill-active' | 'skill-completed' | 'registry-miss'
}

export function ConversationListRowIcon({ state }: ConversationListRowIconProps) {
  const Glyph = state === 'freeform' ? MessageCircle : Brain
  const adornment =
    state === 'skill-completed' ? 'check' : state === 'registry-miss' ? 'warning' : null

  return (
    <span className="relative inline-flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground">
      <Glyph className="h-4 w-4" />
      {adornment === 'check' && (
        <Check className="absolute -mr-1 -mb-1 h-2.5 w-2.5 text-[var(--color-success)] right-0 bottom-0" />
      )}
      {adornment === 'warning' && (
        <AlertTriangle className="absolute -mr-1 -mb-1 h-2.5 w-2.5 text-[var(--color-warning)] right-0 bottom-0" />
      )}
    </span>
  )
}
