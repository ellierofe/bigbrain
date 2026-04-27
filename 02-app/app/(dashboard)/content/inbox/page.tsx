import { PageHeader } from '@/components/page-header'

export default function ContentInboxPage() {
  return (
    <>
      <PageHeader
        title="Inbox"
        subtitle="Generated content waiting for review, editing, and publishing."
      />
      <div className="mt-8 text-sm text-muted-foreground">
        Content inbox coming in M5.
      </div>
    </>
  )
}
