import { auth } from '@/lib/auth'
import { ingestSource } from '@/lib/processing/ingest/run'

// ---------------------------------------------------------------------------
// POST /api/sources/[id]/ingest — manual trigger for the INP-12 ingest pipeline
//
// Runs chunking + summarisation + embeddings + graph writes for one source.
// Idempotent: re-running deletes existing chunks for the source and writes a
// fresh set (per src-source-chunks.md immutability rule).
//
// Returns the IngestResult so the caller can render counts + any errors.
// Doesn't fail the HTTP response on partial errors — the result body carries
// the failure detail and a non-empty `errors[]` is informational, not fatal.
// ---------------------------------------------------------------------------

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV !== 'development') {
    const session = await auth()
    if (!session) return new Response('Unauthorized', { status: 401 })
  }

  const { id } = await params
  if (!id) {
    return Response.json({ error: 'id is required' }, { status: 400 })
  }

  try {
    const result = await ingestSource(id)
    const statusCode = result.status === 'failed' ? 500 : 200
    return Response.json(result, { status: statusCode })
  } catch (err) {
    console.error(`[ingest] source ${id} failed:`, err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'ingest failed' },
      { status: 500 },
    )
  }
}
