import { PageHeader } from '@/components/page-header'
import { ProcessInputClient } from './process-input-client'

/** Hardcoded brand ID — replace with session lookup when multi-brand auth lands */
const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

export default function ProcessInputPage() {
  return (
    <div className="flex flex-col h-full gap-6">
      <PageHeader
        title="Process Input"
        subtitle="Turn text into linked knowledge."
      />
      <ProcessInputClient brandId={BRAND_ID} />
    </div>
  )
}
