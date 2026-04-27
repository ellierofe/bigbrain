import { auth } from '@/lib/auth'
import { commitAnalysis } from '@/lib/processing/commit-analysis'

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== 'development') {
    const session = await auth()
    if (!session) return new Response('Unauthorized', { status: 401 })
  }

  let runId: string

  try {
    const body = await req.json()
    runId = body.runId
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!runId) {
    return Response.json({ error: 'runId is required' }, { status: 400 })
  }

  try {
    const result = await commitAnalysis(runId)
    return Response.json(result)
  } catch (err) {
    console.error('[POST /api/process/commit-analysis] failed:', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Commit failed' },
      { status: 500 }
    )
  }
}
