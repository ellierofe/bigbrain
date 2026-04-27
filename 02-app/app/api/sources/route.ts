import { getSourceDocuments } from '@/lib/db/queries/sources'
import { uploadBlob } from '@/lib/storage/blob'
import { db } from '@/lib/db'
import { srcSourceDocuments } from '@/lib/db/schema/source'

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

const MIME_TO_TYPE: Record<string, string> = {
  'application/pdf': 'document',
  'text/plain': 'document',
  'text/markdown': 'document',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/gif': 'image',
  'image/webp': 'image',
  'image/svg+xml': 'image',
  'audio/mpeg': 'voice-note',
  'audio/wav': 'voice-note',
  'audio/webm': 'voice-note',
  'audio/mp4': 'voice-note',
}

function inferType(mimeType: string): string {
  return MIME_TO_TYPE[mimeType] ?? 'other'
}

function titleFromFilename(filename: string): string {
  // Strip extension and replace separators with spaces
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
    // Upload to Vercel Blob
    const pathname = `sources/${brandId}/${Date.now()}-${file.name}`
    const blob = await uploadBlob(pathname, file, { contentType: file.type })

    // Create source document record
    const title = customTitle || titleFromFilename(file.name)
    const type = inferType(file.type)

    const rows = await db
      .insert(srcSourceDocuments)
      .values({
        brandId,
        title,
        type,
        fileUrl: blob.url,
        fileSize: file.size,
        mimeType: file.type,
      })
      .returning({
        id: srcSourceDocuments.id,
        title: srcSourceDocuments.title,
        type: srcSourceDocuments.type,
        fileUrl: srcSourceDocuments.fileUrl,
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
