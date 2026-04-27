'use client'

import { useRef, useState, useEffect } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface SearchResult {
  id: string
  label: string
  sublabel?: string
}

interface ItemLinkerProps {
  /** What kind of item we're linking */
  entityLabel: string
  /** Async search function — returns filtered results */
  onSearch: (query: string) => Promise<SearchResult[]>
  /** Called when user selects an item */
  onLink: (itemId: string) => Promise<void>
  /** Called to close the linker */
  onClose: () => void
}

export function ItemLinker({ entityLabel, onSearch, onLink, onClose }: ItemLinkerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [linking, setLinking] = useState<string | null>(null)

  // Load initial results on mount
  useEffect(() => {
    handleSearch('')
    inputRef.current?.focus()
  }, [])

  async function handleSearch(q: string) {
    setQuery(q)
    setLoading(true)
    try {
      const items = await onSearch(q)
      setResults(items)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  async function handleLink(itemId: string) {
    setLinking(itemId)
    try {
      await onLink(itemId)
      // Remove from results after linking
      setResults((prev) => prev.filter((r) => r.id !== itemId))
    } catch {
      // Error handled by parent
    } finally {
      setLinking(null)
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder={`Search ${entityLabel}...`}
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-8 pl-8 text-[13px]"
          />
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="max-h-48 overflow-y-auto">
        {loading && results.length === 0 && (
          <div className="flex items-center justify-center py-4 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}

        {!loading && results.length === 0 && (
          <p className="py-3 text-center text-[13px] text-muted-foreground">
            {query ? `No ${entityLabel} found.` : `No ${entityLabel} available to link.`}
          </p>
        )}

        {results.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={linking === item.id}
            onClick={() => handleLink(item.id)}
            className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/50 disabled:opacity-50"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-foreground">{item.label}</p>
              {item.sublabel && (
                <p className="truncate text-[11px] text-muted-foreground">{item.sublabel}</p>
              )}
            </div>
            {linking === item.id && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-muted-foreground" />}
          </button>
        ))}
      </div>
    </div>
  )
}
