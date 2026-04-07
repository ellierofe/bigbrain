interface FormLayoutProps {
  title?: string
  description?: string
  children: React.ReactNode
  /** Rendered in the footer — typically submit + cancel buttons */
  actions: React.ReactNode
  onSubmit?: (e: React.FormEvent<HTMLFormElement>) => void
}

export function FormLayout({
  title,
  description,
  children,
  actions,
  onSubmit,
}: FormLayoutProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      {(title || description) && (
        <div>
          {title && <h2 className="text-lg font-semibold">{title}</h2>}
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <div className="flex flex-col gap-4">{children}</div>
      <div className="flex justify-end gap-2 border-t pt-4">{actions}</div>
    </form>
  )
}
