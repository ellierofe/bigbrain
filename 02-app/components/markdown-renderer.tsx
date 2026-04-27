import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownRendererProps {
  content: string
  compact?: boolean
}

export function MarkdownRenderer({ content, compact }: MarkdownRendererProps) {
  const textSize = compact ? 'text-[13px]' : 'text-sm'

  return (
    <div className={`${textSize} leading-relaxed text-foreground`}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="font-heading text-lg font-semibold mt-4 mb-2 first:mt-0">
            {children}
          </h1>
        ),
        h2: ({ children }) => (
          <h2 className="font-heading text-base font-semibold mt-4 mb-2 first:mt-0">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="font-heading text-sm font-semibold mt-3 mb-1 first:mt-0">
            {children}
          </h3>
        ),
        p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
        ul: ({ children }) => (
          <ul className="mb-3 pl-5 list-disc space-y-1 last:mb-0">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-3 pl-5 list-decimal space-y-1 last:mb-0">{children}</ol>
        ),
        li: ({ children }) => <li>{children}</li>,
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        em: ({ children }) => <em className="italic">{children}</em>,
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2 hover:text-primary/80"
          >
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="mb-3 border-l-2 border-primary/40 pl-4 text-muted-foreground italic last:mb-0">
            {children}
          </blockquote>
        ),
        code: ({ className, children, ...props }) => {
          const isBlock = className?.includes('language-')
          if (isBlock) {
            return (
              <code
                className={`block mb-3 rounded-md bg-muted px-4 py-3 font-mono text-xs overflow-x-auto last:mb-0 ${className ?? ''}`}
                {...props}
              >
                {children}
              </code>
            )
          }
          return (
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs" {...props}>
              {children}
            </code>
          )
        },
        pre: ({ children }) => <pre className="mb-3 last:mb-0">{children}</pre>,
        table: ({ children }) => (
          <div className="mb-3 overflow-x-auto last:mb-0">
            <table className="w-full border-collapse text-xs">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="border-b border-border">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 text-left font-medium text-muted-foreground">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 border-b border-border/50">{children}</td>
        ),
        hr: () => <hr className="my-4 border-border" />,
      }}
    >
      {content}
    </ReactMarkdown>
    </div>
  )
}
