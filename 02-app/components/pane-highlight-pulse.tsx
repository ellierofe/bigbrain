'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PaneHighlightPulseProps {
  /** When this value changes, a 300ms pulse fires. Stable values mean no pulse. */
  pulseKey: string | number
  children: ReactNode
  className?: string
}

export function PaneHighlightPulse({ pulseKey, children, className }: PaneHighlightPulseProps) {
  const [active, setActive] = useState(false)
  const initial = useRef(true)
  const previous = useRef(pulseKey)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (initial.current) {
      initial.current = false
      previous.current = pulseKey
      return
    }
    if (previous.current === pulseKey) return
    previous.current = pulseKey
    setActive(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setActive(false), 300)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [pulseKey])

  return (
    <div className={cn(active && 'pane-highlight-pulse-active', className)}>
      {children}
    </div>
  )
}
