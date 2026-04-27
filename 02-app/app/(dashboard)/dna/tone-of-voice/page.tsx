export const dynamic = 'force-dynamic'

import { loadTovData } from '@/app/actions/tone-of-voice'
import { ToneOfVoiceView } from './tone-of-voice-view'

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

export default async function ToneOfVoicePage() {
  const { tov, draft, active, samples, applications } = await loadTovData()

  return (
    <ToneOfVoiceView
      brandId={BRAND_ID}
      tov={tov}
      draft={draft}
      active={active}
      samples={samples}
      applications={applications}
    />
  )
}
