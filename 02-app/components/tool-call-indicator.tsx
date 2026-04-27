'use client'

import { useState } from 'react'
import { Search, Dna, FileText, Network, ChevronDown } from 'lucide-react'

const TOOL_CONFIG: Record<string, { icon: typeof Search; label: string }> = {
  search_knowledge: { icon: Search, label: 'Searched knowledge' },
  get_brand_dna: { icon: Dna, label: 'Loaded brand DNA' },
  get_source_knowledge: { icon: FileText, label: 'Loaded source knowledge' },
  explore_graph: { icon: Network, label: 'Explored graph' },
}

interface ToolCallIndicatorProps {
  toolName: string
  args?: Record<string, unknown>
  result?: unknown
  state?: string
  compact?: boolean
}

export function ToolCallIndicator({
  toolName,
  args,
  result,
  state,
  compact,
}: ToolCallIndicatorProps) {
  const [expanded, setExpanded] = useState(false)
  const config = TOOL_CONFIG[toolName] ?? { icon: Search, label: toolName }
  const Icon = config.icon
  const textSize = compact ? 'text-[11px]' : 'text-xs'
  const isLoading = state === 'call' || state === 'partial-call'

  // Build description from args
  const description = getDescription(toolName, args)

  return (
    <div className="mb-1">
      <button
        type="button"
        onClick={() => result && setExpanded(!expanded)}
        className={`flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1 ${textSize} text-muted-foreground transition-colors hover:bg-muted ${result ? 'cursor-pointer' : 'cursor-default'}`}
      >
        {isLoading ? (
          <span className="h-3 w-3 shrink-0 animate-spin rounded-full border border-muted-foreground/30 border-t-muted-foreground" />
        ) : (
          <Icon className="h-3 w-3 shrink-0" />
        )}
        <span>
          {config.label}
          {description ? `: ${description}` : ''}
        </span>
        {result != null && (
          <ChevronDown
            className={`h-3 w-3 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          />
        )}
      </button>
      {expanded && result != null && (
        <div className={`mt-1 ml-5 rounded-md bg-muted/30 px-2 py-1.5 ${textSize} text-muted-foreground max-h-32 overflow-y-auto`}>
          <pre className="whitespace-pre-wrap break-words font-mono">
            {typeof result === 'string'
              ? result.slice(0, 500)
              : JSON.stringify(result, null, 2)?.slice(0, 500)}
            {(typeof result === 'string' ? result.length : JSON.stringify(result)?.length ?? 0) > 500 && '…'}
          </pre>
        </div>
      )}
    </div>
  )
}

function getDescription(toolName: string, args?: Record<string, unknown>): string {
  if (!args) return ''
  switch (toolName) {
    case 'search_knowledge':
      return args.query ? `"${args.query}"` : ''
    case 'get_brand_dna':
      return (args.dna_type as string)?.replace(/_/g, ' ') ?? ''
    case 'get_source_knowledge':
      return (args.source_type as string) ?? ''
    case 'explore_graph':
      return args.node_id ? `from ${(args.node_id as string).slice(0, 8)}…` : ''
    default:
      return ''
  }
}
