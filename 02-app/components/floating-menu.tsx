'use client'

import { useEffect, useRef } from 'react'

interface FloatingMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: React.ReactNode
  children: React.ReactNode
  align?: 'start' | 'end'
  side?: 'bottom' | 'top'
  minWidth?: string
  className?: string
  containerClassName?: string
}

export function FloatingMenu({
  open,
  onOpenChange,
  trigger,
  children,
  align = 'start',
  side = 'bottom',
  minWidth,
  className,
  containerClassName = 'relative inline-flex',
}: FloatingMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onOpenChange(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onOpenChange(false)
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onOpenChange])

  const alignClass = align === 'end' ? 'right-0' : 'left-0'
  const sideClass = side === 'top' ? 'bottom-full mb-1' : 'top-full mt-1'

  return (
    <div ref={containerRef} className={containerClassName}>
      {trigger}
      {open && (
        <div
          className={`absolute z-50 rounded-md border border-border bg-card shadow-[var(--shadow-raised)] py-1 ${alignClass} ${sideClass}${className ? ` ${className}` : ''}`}
          style={minWidth ? { minWidth } : undefined}
        >
          {children}
        </div>
      )}
    </div>
  )
}
