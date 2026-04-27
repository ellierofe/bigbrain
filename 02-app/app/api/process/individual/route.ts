import { auth } from '@/lib/auth'
import { extractFromText } from '@/lib/processing/extract'
import { getSourcesByIds, updateSourceProcessingHistory } from '@/lib/db/queries/sources'
import { createProcessingRun } from '@/lib/db/queries/processing-runs'
import type { InputMetadata, SourceType } from '@/lib/types/processing'

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== 'development') {
    const session = await auth()
    if (!session) return new Response('Unauthorized', { status: 401 })
  }

  let sourceIds: string[]
  let brandId: string

  try {
    const body = await req.json()
    sourceIds = body.sourceIds
    brandId = body.brandId
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!sourceIds?.length) {
    return Response.json({ error: 'sourceIds is required' }, { status: 400 })
  }
  if (!brandId) {
    return Response.json({ error: 'brandId is required' }, { status: 400 })
  }

  try {
    const sources = await getSourcesByIds(sourceIds)
    const runIds: string[] = []

    for (const source of sources) {
      if (!source.extractedText) continue

      const metadata: InputMetadata = {
        title: source.title,
        sourceType: (source.type as SourceType) ?? 'transcript',
        date: source.documentDate ?? undefined,
        tags: source.tags ?? [],
        brandId,
      }

      const result = await extractFromText(source.extractedText, metadata)

      const run = await createProcessingRun({
        brandId,
        mode: 'individual',
        sourceIds: [source.id],
        title: source.title,
        extractionResult: result,
        status: 'pending',
      })

      await updateSourceProcessingHistory(source.id, {
        date: new Date().toISOString(),
        mode: 'individual',
        runId: run.id,
      })

      runIds.push(run.id)
    }

    return Response.json({ runIds })
  } catch (err) {
    console.error('[POST /api/process/individual] failed:', err)
    return Response.json({ error: 'Processing failed' }, { status: 500 })
  }
}
