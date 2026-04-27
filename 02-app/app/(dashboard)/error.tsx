'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { ActionButton } from '@/components/action-button'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <AlertTriangle className="h-10 w-10 text-muted-foreground" />
        <div className="flex flex-col gap-1">
          <p className="font-semibold text-foreground">Something went wrong</p>
          <p className="text-sm text-muted-foreground">
            This page encountered an error. Your navigation and other sections are unaffected.
          </p>
        </div>
        <ActionButton onClick={reset} variant="outline">
          Try again
        </ActionButton>
      </div>
    </div>
  )
}
