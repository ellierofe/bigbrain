'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface SelectOption {
  value: string
  label: string
}

interface InlineCellSelectProps {
  value: string
  options: SelectOption[]
  onSave: (value: string) => Promise<{ ok: boolean; error?: string }>
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function InlineCellSelect({
  value,
  options,
  onSave,
  placeholder,
  disabled,
  className,
}: InlineCellSelectProps) {
  const [errorFlash, setErrorFlash] = useState(false)
  const savedValueRef = useRef(value)

  const isEmpty = options.length === 0

  const handleChange = (newValue: string | null) => {
    if (newValue === null || newValue === savedValueRef.current) return
    void (async () => {
      const result = await onSave(newValue)
      if (result.ok) {
        savedValueRef.current = newValue
      } else {
        setErrorFlash(true)
        setTimeout(() => setErrorFlash(false), 1500)
        toast.error(result.error ?? 'Save failed — try again')
      }
    })()
  }

  return (
    <Select
      value={value}
      onValueChange={handleChange}
      disabled={disabled || isEmpty}
    >
      <SelectTrigger
        className={cn(
          'h-auto px-2 py-1 text-sm rounded-md bg-transparent border-0 shadow-none',
          'hover:bg-muted/50 transition-colors',
          'focus-visible:ring-0 focus-visible:ring-offset-0',
          'data-[state=open]:bg-muted',
          errorFlash && 'border border-destructive/60',
          className,
        )}
      >
        <SelectValue placeholder={isEmpty ? 'No options' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
