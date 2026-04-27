'use client'

import type { UIMessage } from 'ai'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { ToolCallIndicator } from '@/components/tool-call-indicator'

interface ChatMessageProps {
  message: UIMessage
  compact?: boolean
}

export function ChatMessage({ message, compact }: ChatMessageProps) {
  if (message.role === 'user') {
    return <UserMessage message={message} compact={compact} />
  }
  return <AssistantMessage message={message} compact={compact} />
}

function UserMessage({ message, compact }: ChatMessageProps) {
  const textSize = compact ? 'text-[13px]' : 'text-sm'
  const textParts = message.parts.filter((p) => p.type === 'text')
  const fileParts = message.parts.filter((p) => p.type === 'file')

  return (
    <div className="flex justify-end">
      <div className="max-w-[80%]">
        <div className={`rounded-2xl bg-muted px-4 py-3 ${textSize} text-foreground`}>
          {textParts.map((part, i) => (
            <p key={i} className="whitespace-pre-wrap">
              {part.type === 'text' ? part.text : ''}
            </p>
          ))}
        </div>
        {fileParts.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 justify-end">
            {fileParts.map((part, i) => {
              if (part.type !== 'file') return null
              const filePart = part as { type: 'file'; mediaType: string; url: string }
              if (filePart.mediaType?.startsWith('image/')) {
                return (
                  <img
                    key={i}
                    src={filePart.url}
                    alt="Attached image"
                    className="max-w-[200px] rounded-lg border border-border"
                  />
                )
              }
              return null
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function AssistantMessage({ message, compact }: ChatMessageProps) {
  const toolParts = message.parts.filter(
    (p) => p.type === 'tool-invocation' || (p.type as string).startsWith?.('tool-')
  )
  const textParts = message.parts.filter((p) => p.type === 'text')
  const fullText = textParts
    .map((p) => (p.type === 'text' ? p.text : ''))
    .join('')

  return (
    <div className="flex justify-start">
      <div className={compact ? 'w-full' : 'max-w-full'}>
        {/* Tool call indicators */}
        {toolParts.length > 0 && (
          <div className="mb-2 flex flex-col gap-1">
            {toolParts.map((part, i) => {
              // Handle both tool-invocation and dynamic tool part types
              const toolPart = part as any
              return (
                <ToolCallIndicator
                  key={i}
                  toolName={toolPart.toolName ?? toolPart.name ?? 'unknown'}
                  args={toolPart.args}
                  result={toolPart.result}
                  state={toolPart.state}
                  compact={compact}
                />
              )
            })}
          </div>
        )}

        {/* Text content */}
        {fullText && (
          <MarkdownRenderer content={fullText} compact={compact} />
        )}
      </div>
    </div>
  )
}
