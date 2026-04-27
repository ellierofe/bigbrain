'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

let toastTimer: ReturnType<typeof setTimeout> | null = null
export function debouncedSaveToast() {
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.success('Changes saved')
  }, 800)
}

interface UseDebouncedSaveOptions<T> {
  value: T
  onSave: (value: T) => Promise<{ ok: boolean; error?: string }>
  debounceMs?: number
}

export function useDebouncedSave<T>({
  value,
  onSave,
  debounceMs = 500,
}: UseDebouncedSaveOptions<T>) {
  const [state, setState] = useState<SaveState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedValueRef = useRef<T>(value)
  const idleResetRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const trigger = useCallback(
    (val: T) => {
      if (val === savedValueRef.current) return

      if (timerRef.current) clearTimeout(timerRef.current)
      if (idleResetRef.current) clearTimeout(idleResetRef.current)

      timerRef.current = setTimeout(async () => {
        setState('saving')
        setErrorMsg(null)
        const result = await onSave(val)
        if (result.ok) {
          savedValueRef.current = val
          setState('saved')
          debouncedSaveToast()
          idleResetRef.current = setTimeout(() => setState('idle'), 2000)
        } else {
          setState('error')
          setErrorMsg(result.error ?? 'Save failed')
          toast.error(result.error ?? 'Save failed — try again')
        }
      }, debounceMs)
    },
    [onSave, debounceMs]
  )

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (idleResetRef.current) clearTimeout(idleResetRef.current)
    }
  }, [])

  return { state, errorMsg, trigger }
}
