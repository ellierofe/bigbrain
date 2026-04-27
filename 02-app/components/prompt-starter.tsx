'use client'

interface PromptStarterProps {
  text: string
  onClick: (text: string) => void
}

export function PromptStarter({ text, onClick }: PromptStarterProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(text)}
      className="rounded-lg border border-border px-4 py-3 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
    >
      {text}
    </button>
  )
}
