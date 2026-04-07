interface SectionCardProps {
  title: string
  description?: string
  /** Optional: action rendered top-right of the card header */
  action?: React.ReactNode
  children: React.ReactNode
}

export function SectionCard({ title, description, action, children }: SectionCardProps) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="font-semibold">{title}</h2>
          {description && (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  )
}
