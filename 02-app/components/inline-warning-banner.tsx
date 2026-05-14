'use client'

import { AlertTriangle, CheckCircle2, Info, X, type LucideIcon } from 'lucide-react'
import { IconButton } from '@/components/icon-button'

type InlineBannerTone = 'warning' | 'success' | 'info'

interface InlineWarningBannerProps {
  title: string
  subtitle?: string
  /** Defaults to 'warning' to preserve existing call-sites. */
  tone?: InlineBannerTone
  onDismiss?: () => void
}

const TONE_CLASSES: Record<InlineBannerTone, { container: string; icon: string }> = {
  warning: {
    container:
      'border-[var(--color-warning)] bg-[var(--color-warning-bg)] text-[var(--color-warning-foreground)]',
    icon: 'text-[var(--color-warning)]',
  },
  success: {
    container:
      'border-[var(--color-success)] bg-[var(--color-success-bg)] text-[var(--color-success-foreground)]',
    icon: 'text-[var(--color-success)]',
  },
  info: {
    container:
      'border-[var(--color-info)] bg-[var(--color-info-bg)] text-[var(--color-info-foreground)]',
    icon: 'text-[var(--color-info)]',
  },
}

const TONE_GLYPH: Record<InlineBannerTone, LucideIcon> = {
  warning: AlertTriangle,
  success: CheckCircle2,
  info: Info,
}

export function InlineWarningBanner({
  title,
  subtitle,
  tone = 'warning',
  onDismiss,
}: InlineWarningBannerProps) {
  const Icon = TONE_GLYPH[tone]
  const styles = TONE_CLASSES[tone]
  return (
    <div
      className={`flex items-start gap-2 rounded-md border px-3 py-2 ${styles.container}`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${styles.icon}`} />
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
