import { auth } from '@/lib/auth'
import { extractFromText } from '@/lib/processing/extract'
import type { InputMetadata } from '@/lib/types/processing'

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== 'development') {
    const session = await auth()
    if (!session) return new Response('Unauthorized', { status: 401 })
  }

  let text: string
  let metadata: InputMetadata

  try {
    const body = await req.json()
    text = body.text
    metadata = body.metadata
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!text?.trim()) {
    return Response.json({ error: 'text is required' }, { status: 400 })
  }
  if (!metadata?.title?.trim()) {
    return Response.json({ error: 'metadata.title is required' }, { status: 400 })
  }
  if (!metadata?.brandId) {
    return Response.json({ error: 'metadata.brandId is required' }, { status: 400 })
  }

  try {
    const result = await extractFromText(text, metadata)
    return Response.json(result)
  } catch (err) {
    console.error('[POST /api/process] extraction failed:', err)
    return Response.json({ error: 'Extraction failed' }, { status: 500 })
  }
}
