import type { LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/page-header'

interface PageChromeProps {
  title: string
  subtitle?: string
  icon?: LucideIcon
  action?: React.ReactNode
  /** Slot below PageHeader for sub-header chrome (tab strips, switchers, breadcrumbs) */
  subheader?: React.ReactNode
}

/**
 * PageChrome — wraps the full page header area as a single layout unit.
 *
 * Renders PageHeader at top, optional sub-header below, then mb-4 before
 * ContentPane. No visual background of its own — sits in the page column.
 */
export function PageChrome({ title, subtitle, icon, action, subheader }: PageChromeProps) {
  return (
    <div className="mb-4 flex flex-col gap-4">
      <PageHeader title={title} subtitle={subtitle} icon={icon} action={action} className="mb-0" />
      {subheader}
    </div>
  )
}
