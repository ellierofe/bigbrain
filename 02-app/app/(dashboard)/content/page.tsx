import { listPickerContentTypes } from '@/lib/db/queries/content-creator'
import { ContentPickerClient } from './content-picker-client'

/** Hardcoded brand ID for single-user app. Replaced with session lookup once INF-05 is live. */
const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

export default async function ContentPickerPage() {
  const items = await listPickerContentTypes(BRAND_ID)

  return <ContentPickerClient initialItems={items} />
}
