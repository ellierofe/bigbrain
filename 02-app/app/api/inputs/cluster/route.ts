import { NextResponse } from 'next/server'
import { clusterByTopic } from '@/lib/processing/cluster'
import type { ExtractionOutput } from '@/lib/types/processing'

/**
 * POST /api/inputs/cluster
 * Generate topic clusters for an extraction on-the-fly.
 * Used for existing pending items that don't have stored clusters.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const extraction = body.extraction as ExtractionOutput

    if (!extraction) {
      return NextResponse.json({ error: 'Missing extraction' }, { status: 400 })
    }

    const clusters = await clusterByTopic(extraction)
    return NextResponse.json({ clusters })
  } catch (err) {
    console.error('[POST /api/inputs/cluster]', err)
    return NextResponse.json(
      { error: 'Failed to cluster items' },
      { status: 500 }
    )
  }
}
