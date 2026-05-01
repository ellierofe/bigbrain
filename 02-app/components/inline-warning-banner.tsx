'use client'

import { AlertTriangle, X } from 'lucide-react'
import { IconButton } from '@/components/icon-button'

interface InlineWarningBannerProps {
  title: string
  subtitle?: string
  onDismiss?: () => void
}

export function InlineWarningBanner({ title, subtitle, onDismiss }: InlineWarningBannerProps) {
  return (
    <div className="flex items-start gap-2 rounded-md border border-[var(--color-warning)] bg-[var(--color-warning-bg)] px-3 py-2 text-[var(--color-warning-foreground)]">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-warning)]" />
      <div className="flex-1 min-w-0">
        <p className="text-sm">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {onDismiss && (
        <IconButton
          icon={X}
          label="Dismiss"
          variant="ghost"
          size="sm"
          tooltip={false}
          onClick={onDismiss}
        />
      )}
    </div>
  )
}
