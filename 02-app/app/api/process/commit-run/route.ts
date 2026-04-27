import { auth } from '@/lib/auth'
import { updateRunStatus } from '@/lib/db/queries/processing-runs'

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== 'development') {
    const session = await auth()
    if (!session) return new Response('Unauthorized', { status: 401 })
  }

  let runId: string
  let status: 'committed' | 'skipped'

  try {
    const body = await req.json()
    runId = body.runId
    status = body.status
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!runId || !['committed', 'skipped'].includes(status)) {
    return Response.json({ error: 'runId and valid status required' }, { status: 400 })
  }

  try {
    await updateRunStatus(runId, status)
    return Response.json({ success: true })
  } catch (err) {
    console.error('[POST /api/process/commit-run] failed:', err)
    return Response.json({ error: 'Update failed' }, { status: 500 })
  }
}
