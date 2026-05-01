'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { IconButton } from '@/components/icon-button'

interface AssembledPromptInspectorProps {
  runId: string
  assembledPrompt: string
}

/**
 * Right-pane debug viewer for the assembled prompt — OUT-02-P4a only.
 * Replaced wholesale in 4b by variant cards. Don't over-polish.
 */
export function AssembledPromptInspector({
  runId,
  assembledPrompt,
}: AssembledPromptInspectorProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(assembledPrompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API blocked — silent fallback (acceptable for debug surface).
    }
  }

  const shortRunId = runId.slice(0, 8)

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-2">
        <span className="font-mono text-xs text-muted-foreground">
          Run: {shortRunId}…
        </span>
        <IconButton
          icon={copied ? Check : Copy}
          label={copied ? 'Copied' : 'Copy assembled prompt'}
          onClick={handleCopy}
          variant="ghost"
          size="sm"
        />
      </div>
      <pre className="flex-1 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-xs leading-relaxed text-foreground">
        {assembledPrompt}
      </pre>
    </div>
  )
}
