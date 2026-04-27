import { Suspense } from 'react'
import { NavSidebar } from '@/components/nav-sidebar'
import { TopToolbar } from '@/components/top-toolbar'
import { ScreenSizeGate } from '@/components/screen-size-gate'
import { PageSkeleton } from '@/components/page-skeleton'
import { getPendingInputsCount } from '@/lib/db/queries/dashboard'
import { getInboxCount } from '@/lib/db/queries/sources'

/** Hardcoded brand ID — replace with session lookup when multi-brand auth lands */
const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [pendingCount, inboxCount] = await Promise.all([
    getPendingInputsCount(BRAND_ID),
    getInboxCount(BRAND_ID),
  ])

  return (
    <ScreenSizeGate>
      <div className="flex h-screen w-full">
        <NavSidebar pendingInputsCount={pendingCount} inboxCount={inboxCount} />
        <div className="flex-1 min-w-0 flex flex-col bg-background overflow-hidden">
          {/* Top toolbar — always visible */}
          <header className="flex items-center justify-end shrink-0 px-8 pt-5 pb-0">
            <TopToolbar />
          </header>
          <main className="flex-1 overflow-auto px-8 pb-8 pt-2">
            <Suspense fallback={<PageSkeleton />}>
              {children}
            </Suspense>
          </main>
        </div>
      </div>
    </ScreenSizeGate>
  )
}
