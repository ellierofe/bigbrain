import { cn } from '@/lib/utils'

interface ContentPaneProps {
  children: React.ReactNode
  className?: string
  /** Padding inside the pane. Default: p-6. Pass false to remove all padding (for full-bleed layouts). */
  padding?: boolean
}

/**
 * ContentPane — the white working area within a dashboard page.
 *
 * Usage pattern for every dashboard page:
 *
 *   <div className="flex flex-col h-full gap-4">
 *     <PageHeader title="..." action={...} />
 *     {/* any sub-header chrome (tabs, switchers, badges) goes here *\/}
 *     <ContentPane>
 *       {/* scrollable working content goes here *\/}
 *     </ContentPane>
 *   </div>
 *
 * The ContentPane is flex-1 and overflow-auto — it fills the remaining height
 * after the page chrome and scrolls internally. The page itself does not scroll.
 *
 * Never put PageHeader or action buttons inside ContentPane.
 */
export function ContentPane({ children, className, padding = true }: ContentPaneProps) {
  return (
    <div
      className={cn(
        'flex-1 min-h-0 overflow-auto rounded-lg bg-card shadow-[var(--shadow-pane)]',
        padding && 'p-6',
        className
      )}
    >
      {children}
    </div>
  )
}
