'use client'

import { AlertTriangle, ArrowRight } from 'lucide-react'
import { ActionButton } from '@/components/action-button'

interface SkillContinueBarProps {
  missingItems: string[]
  loading: boolean
  onAdvance: () => void
}

export function SkillContinueBar({ missingItems, loading, onAdvance }: SkillContinueBarProps) {
  const blocked = missingItems.length > 0
  const showHint = blocked && !loading

  return (
    <div className="flex flex-col items-start gap-1">
      <ActionButton
        trailingIcon={ArrowRight}
        loading={loading}
        disabled={blocked}
        onClick={onAdvance}
      >
        {loading ? 'Advancing…' : 'Continue to next stage'}
      </ActionButton>
      {showHint && (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <AlertTriangle className="h-3 w-3" />
          Still gathering: {missingItems.join(', ')}
        </span>
      )}
    </div>
  )
}
