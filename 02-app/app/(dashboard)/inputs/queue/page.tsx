import { PageHeader } from '@/components/page-header'
import { QueueClient } from './queue-client'
import { getAllPendingInputs } from '@/lib/db/queries/dashboard'

/** Hardcoded brand ID — replace with session lookup when multi-brand auth lands */
const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

export default async function InputQueuePage() {
  const rows = await getAllPendingInputs(BRAND_ID)

  const items = rows.map((row) => ({
    id: row.id,
    title: row.title,
    inputDate: row.inputDate,
    sourceType: row.sourceType,
    tags: row.tags,
    extractionJson: row.extractionResult,
    status: row.status,
    createdAt: row.createdAt,
  }))

  return (
    <div className="flex flex-col h-full gap-4">
      <PageHeader
        title="Input Queue"
        subtitle={`${items.length} item${items.length !== 1 ? 's' : ''} waiting for review`}
      />
      <QueueClient items={items} />
    </div>
  )
}
