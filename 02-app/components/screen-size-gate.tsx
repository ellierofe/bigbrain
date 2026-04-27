'use client'

import { useEffect, useState } from 'react'

const MIN_WIDTH = 990

interface ScreenSizeGateProps {
  children: React.ReactNode
}

/**
 * Renders children on screens ≥990px wide.
 * Below that threshold, shows a full-page message asking the user to switch to a larger screen.
 * Renders children on the server (no window) to avoid hydration mismatch.
 */
export function ScreenSizeGate({ children }: ScreenSizeGateProps) {
  const [isTooSmall, setIsTooSmall] = useState(false)

  useEffect(() => {
    function check() {
      setIsTooSmall(window.innerWidth < MIN_WIDTH)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (isTooSmall) {
    return (
      <div className="flex h-full min-h-screen items-center justify-center bg-background px-6">
        <div className="text-center max-w-sm">
          <p className="text-2xl font-bold text-foreground mb-3">BigBrain</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            BigBrain works best on a larger screen.
            <br />
            Please view on a desktop or laptop.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
