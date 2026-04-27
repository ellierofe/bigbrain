import { auth } from '@/lib/auth'
import { runBatchAnalysis } from '@/lib/processing/analyse'
import { getSourcesByIds, updateSourceProcessingHistory } from '@/lib/db/queries/sources'
import { createProcessingRun } from '@/lib/db/queries/processing-runs'
import type { SourceForProcessing } from '@/lib/types/processing'

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== 'development') {
    const session = await auth()
    if (!session) return new Response('Unauthorized', { status: 401 })
  }

  let sourceIds: string[]
  let brandId: string
  let title: string | undefined

  try {
    const body = await req.json()
    sourceIds = body.sourceIds
    brandId = body.brandId
    title = body.title
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!sourceIds?.length || sourceIds.length < 2) {
    return Response.json({ error: 'At least 2 sourceIds required for batch analysis' }, { status: 400 })
  }
  if (!brandId) {
    return Response.json({ error: 'brandId is required' }, { status: 400 })
  }

  try {
    const sources = await getSourcesByIds(sourceIds)
    const processable: SourceForProcessing[] = sources
      .filter((s) => s.extractedText)
      .map((s) => ({
        id: s.id,
        title: s.title,
        extractedText: s.extractedText!,
        documentDate: s.documentDate,
        type: s.type,
        tags: s.tags ?? [],
      }))

    if (processable.length < 2) {
      return Response.json({ error: 'At least 2 sources with text required' }, { status: 400 })
    }

    const result = await runBatchAnalysis(processable)

    const run = await createProcessingRun({
      brandId,
      mode: 'batch',
      sourceIds: processable.map((s) => s.id),
      title: title ?? `Batch analysis — ${processable.length} sources`,
      analysisResult: result,
      status: 'pending',
    })

    for (const source of processable) {
      await updateSourceProcessingHistory(source.id, {
        date: new Date().toISOString(),
        mode: 'batch',
        runId: run.id,
      })
    }

    return Response.json({ runId: run.id, result })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[POST /api/process/batch] failed:', message, err)
    return Response.json({ error: `Batch analysis failed: ${message}` }, { status: 500 })
  }
}
