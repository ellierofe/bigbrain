'use client'

import { useState, useRef, useCallback, useMemo } from 'react'
import { DefaultChatTransport, type UIMessage, type ChatStatus as AIChatStatus } from 'ai'

export type ChatStatus = 'ready' | 'submitted' | 'streaming' | 'error'

interface UseChatOptions {
  api?: string
  conversationId: string | null
  onConversationCreated?: (id: string) => void
  onFinish?: (message: UIMessage) => void
}

interface UseChatReturn {
  messages: UIMessage[]
  setMessages: (msgs: UIMessage[]) => void
  status: ChatStatus
  error: Error | null
  sendMessage: (text: string, files?: File[]) => Promise<void>
  stop: () => void
}

export function useChat({
  api = '/api/chat',
  conversationId,
  onConversationCreated,
  onFinish,
}: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<UIMessage[]>([])
  const [status, setStatus] = useState<ChatStatus>('ready')
  const [error, setError] = useState<Error | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const stop = useCallback(() => {
    abortRef.current?.abort()
    abortRef.current = null
    setStatus('ready')
  }, [])

  const sendMessage = useCallback(
    async (text: string, files?: File[]) => {
      if (status === 'submitted' || status === 'streaming') return

      setError(null)
      setStatus('submitted')

      // Build the user message parts
      const userParts: UIMessage['parts'] = [{ type: 'text' as const, text }]

      // Process file attachments — keep display parts separate from API parts
      const imageDataUrls: string[] = []
      const attachments: Array<{ type: string; url: string; name: string; size: number }> = []
      if (files?.length) {
        for (const file of files) {
          const dataUrl = await fileToBase64(file)
          imageDataUrls.push(dataUrl)
          // Add file part for display in the chat UI
          userParts.push({
            type: 'file' as const,
            mediaType: file.type,
            url: dataUrl,
          } as any)
          attachments.push({
            type: file.type,
            url: dataUrl,
            name: file.name,
            size: file.size,
          })
        }
      }

      const userMessage: UIMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        parts: userParts,
      }

      // Optimistically add user message
      const updatedMessages = [...messages, userMessage]
      setMessages(updatedMessages)

      const abortController = new AbortController()
      abortRef.current = abortController

      try {
        // Use fetch directly and parse the UIMessage stream manually
        const response = await fetch(api, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: updatedMessages,
            conversationId,
            attachments: attachments.length > 0 ? attachments : undefined,
            imageDataUrls: imageDataUrls.length > 0 ? imageDataUrls : undefined,
          }),
          signal: abortController.signal,
        })

        if (!response.ok) {
          throw new Error(`Chat request failed: ${response.status}`)
        }

        // Check if a new conversation was created (returned in header)
        const newConversationId = response.headers.get('x-conversation-id')
        if (newConversationId && !conversationId) {
          onConversationCreated?.(newConversationId)
        }

        if (!response.body) {
          throw new Error('No response body')
        }

        setStatus('streaming')

        // Parse the SSE-like UIMessage stream
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let assistantMessage: UIMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          parts: [],
        }

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Parse chunks — UIMessage stream uses newline-delimited JSON
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed) continue

            try {
              const chunk = JSON.parse(trimmed)
              assistantMessage = applyChunk(assistantMessage, chunk)
              setMessages([...updatedMessages, assistantMessage])
            } catch {
              // Skip unparseable lines
            }
          }
        }

        // Process remaining buffer
        if (buffer.trim()) {
          try {
            const chunk = JSON.parse(buffer.trim())
            assistantMessage = applyChunk(assistantMessage, chunk)
            setMessages([...updatedMessages, assistantMessage])
          } catch {
            // Skip
          }
        }

        setStatus('ready')
        onFinish?.(assistantMessage)
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          setStatus('ready')
          return
        }
        setError(err as Error)
        setStatus('error')
      } finally {
        abortRef.current = null
      }
    },
    [messages, status, api, conversationId, onConversationCreated, onFinish]
  )

  return { messages, setMessages, status, error, sendMessage, stop }
}

/**
 * Apply a UIMessage stream chunk to build up the assistant message.
 * The stream format from toUIMessageStreamResponse() sends chunks like:
 * {"type":"text","text":"..."} or {"type":"tool-call",...} etc.
 */
function applyChunk(message: UIMessage, chunk: any): UIMessage {
  const parts = [...message.parts]

  switch (chunk.type) {
    case 'text': {
      // Find existing text part or create new one
      const lastPart = parts[parts.length - 1]
      if (lastPart && lastPart.type === 'text') {
        parts[parts.length - 1] = {
          ...lastPart,
          text: lastPart.text + (chunk.text ?? ''),
        }
      } else {
        parts.push({ type: 'text', text: chunk.text ?? '' })
      }
      break
    }
    case 'tool-invocation': {
      // Add or update tool invocation part
      const existingIdx = parts.findIndex(
        (p: any) => p.type === 'tool-invocation' && p.toolCallId === chunk.toolCallId
      )
      if (existingIdx >= 0) {
        parts[existingIdx] = { ...parts[existingIdx], ...chunk } as any
      } else {
        parts.push(chunk as any)
      }
      break
    }
    case 'step-start': {
      parts.push({ type: 'step-start' } as any)
      break
    }
    default: {
      // For unknown types, just append
      if (chunk.type) {
        parts.push(chunk as any)
      }
      break
    }
  }

  return { ...message, parts }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
