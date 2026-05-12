import { getSourceDocuments } from '@/lib/db/queries/sources'
import { uploadBlob } from '@/lib/storage/blob'
import { db } from '@/lib/db'
import { srcSourceDocuments } from '@/lib/db/schema/source'
import { ingestSource } from '@/lib/processing/ingest/run'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const brandId = url.searchParams.get('brandId')
  const search = url.searchParams.get('search') || undefined
  const type = url.searchParams.get('type') || undefined

  if (!brandId) {
    return Response.json({ error: 'brandId required' }, { status: 400 })
  }

  const docs = await getSourceDocuments(brandId, { search, type })
  return Response.json(docs)
}

// ---------------------------------------------------------------------------
// POST /api/sources — upload a file and create a source document record
// ---------------------------------------------------------------------------
//
// Defaults per INP-12 v3 schema (option A from BUG resolution 2026-05-04):
//   sourceType: 'research-document' — broadest catch-all in the controlled vocab
//   authority:  'external-sample'   — safest default; user upgrades if appropriate
//   inboxStatus: 'new'              — surfaces the row in the triage queue so
//                                     the user can reclassify before the row is
//                                     used elsewhere
//
// MIME inference is intentionally dropped — none of the v3 sourceType values
// (client-interview, meeting-notes, pitch-deck, etc.) can be inferred from a
// file's MIME type. Reclassification is a human-judgement step, deferred to
// the INP-12 inbox UI.

const DEFAULT_SOURCE_TYPE = 'research-document'
const DEFAULT_AUTHORITY = 'external-sample'

function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function POST(req: Request) {
  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const brandId = formData.get('brandId') as string | null
  const customTitle = formData.get('title') as string | null

  if (!file) {
    return Response.json({ error: 'file is required' }, { status: 400 })
  }
  if (!brandId) {
    return Response.json({ error: 'brandId is required' }, { status: 400 })
  }

  try {
    const pathname = `sources/${brandId}/${Date.now()}-${file.name}`
    const blob = await uploadBlob(pathname, file, { contentType: file.type })

    const title = customTitle || titleFromFilename(file.name)

    const rows = await db
      .insert(srcSourceDocuments)
      .values({
        brandId,
        title,
        sourceType: DEFAULT_SOURCE_TYPE,
        authority: DEFAULT_AUTHORITY,
        inboxStatus: 'new',
        fileUrl: blob.url,
        fileSize: file.size,
        mimeType: file.type,
      })
      .returning({
        id: srcSourceDocuments.id,
        title: srcSourceDocuments.title,
        sourceType: srcSourceDocuments.sourceType,
        authority: srcSourceDocuments.authority,
        fileUrl: srcSourceDocuments.fileUrl,
      })

    // Kick off ingest (chunk + summarise + embed + graph write) in the background.
    // Per INP-12 brief §"User journey" step 2: ingest runs immediately after the
    // row lands. Without extractedText (INP-05 hasn't run yet) the orchestrator
    // writes a placeholder SourceDocument graph node and skips chunking/summary —
    // safe to fire here either way. We deliberately don't await: HTTP response
    // returns straight after the row is created.
    void ingestSource(rows[0].id).catch((err) => {
      console.error(`[POST /api/sources] background ingest failed for ${rows[0].id}:`, err)
    })

    return Response.json(rows[0])
  } catch (err) {
    console.error('Source upload failed:', err)
    return Response.json(
      { error: err instanceof Error ? err.message : 'Upload failed' },
      { status: 500 }
    )
  }
}
