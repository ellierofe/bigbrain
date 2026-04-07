import { auth } from '@/lib/auth'
import { commitExtraction } from '@/lib/processing/commit'
import type { ExtractionResult, StorySubject } from '@/lib/types/processing'

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== 'development') {
    const session = await auth()
    if (!session) return new Response('Unauthorized', { status: 401 })
  }

  let result: ExtractionResult
  let confirmedIds: string[]
  let storySubjects: Record<string, StorySubject>

  try {
    const body = await req.json()
    result = body.result
    confirmedIds = body.confirmedIds
    storySubjects = body.storySubjects ?? {}
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!result || !Array.isArray(confirmedIds)) {
    return Response.json({ error: 'result and confirmedIds are required' }, { status: 400 })
  }

  try {
    const commitResult = await commitExtraction(result, confirmedIds, storySubjects)
    return Response.json(commitResult)
  } catch (err) {
    console.error('[POST /api/process/commit] commit failed:', err)
    return Response.json({ error: 'Commit failed' }, { status: 500 })
  }
}
