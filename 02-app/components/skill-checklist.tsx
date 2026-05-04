import { Check, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SkillChecklistItem {
  id: string
  label: string
  filled: boolean
}

interface SkillChecklistProps {
  items: SkillChecklistItem[]
}

export function SkillChecklist({ items }: SkillChecklistProps) {
  if (items.length === 0) return null
  return (
    <ul className="flex flex-col gap-1">
      {items.map((item) => (
        <li
          key={item.id}
          className={cn(
            'flex items-center gap-2 py-1.5 text-sm',
            item.filled ? 'text-foreground' : 'text-muted-foreground'
          )}
        >
          {item.filled ? (
            <Check className="h-4 w-4 shrink-0 text-[var(--color-success)]" />
          ) : (
            <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  )
}
