'use client'

import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** Width in Tailwind units (e.g. 'w-60'). Defaults to 'w-60'. */
  widthClass?: string
}

/**
 * Generic search input with leading magnifier icon. Use anywhere a free-text
 * search field needs the icon affordance — pickers, list filters, modals.
 */
export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  widthClass = 'w-60',
}: SearchInputProps) {
  return (
    <div className={`relative ${widthClass}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
      />
    </div>
  )
}
