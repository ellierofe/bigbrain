import { Skeleton } from '@/components/ui/skeleton'

/**
 * Generic full-page loading skeleton.
 * Used as the default Suspense fallback for all dashboard routes via (dashboard)/loading.tsx.
 * Individual pages can define more specific skeletons by providing their own loading.tsx.
 */
export function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-8 h-full">
      {/* Page header */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      {/* Content blocks */}
      <div className="flex flex-col gap-4 flex-1">
        <Skeleton className="h-32 w-full rounded-lg" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-48 w-full rounded-lg" />
        </div>
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    </div>
  )
}
