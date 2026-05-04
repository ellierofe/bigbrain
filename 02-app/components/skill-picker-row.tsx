'use client'

import type { LucideIcon } from 'lucide-react'

interface SkillPickerRowProps {
  skillId: string
  name: string
  description: string
  icon: LucideIcon
  onClick: () => void
}

export function SkillPickerRow({
  skillId,
  name,
  description,
  icon: Icon,
  onClick,
}: SkillPickerRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-skill-id={skillId}
      aria-label={`Start ${name}`}
      className="flex w-full items-start gap-3 rounded-lg border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-muted/50"
    >
      <Icon className="h-6 w-6 shrink-0 text-muted-foreground" />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">{name}</span>
        <span className="line-clamp-2 text-xs text-muted-foreground">{description}</span>
      </span>
    </button>
  )
}
