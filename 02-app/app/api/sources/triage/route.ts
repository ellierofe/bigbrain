import { auth } from '@/lib/auth'
import { markSourcesTriaged } from '@/lib/db/queries/sources'

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== 'development') {
    const session = await auth()
    if (!session) return new Response('Unauthorized', { status: 401 })
  }

  let sourceIds: string[]

  try {
    const body = await req.json()
    sourceIds = body.sourceIds
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!sourceIds?.length) {
    return Response.json({ error: 'sourceIds is required' }, { status: 400 })
  }

  try {
    await markSourcesTriaged(sourceIds)
    return Response.json({ success: true })
  } catch (err) {
    console.error('[POST /api/sources/triage] failed:', err)
    return Response.json({ error: 'Triage failed' }, { status: 500 })
  }
}
