import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { srcSourceDocuments } from '@/lib/db/schema/source'
import { eq } from 'drizzle-orm'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV !== 'development') {
    const session = await auth()
    if (!session) return new Response('Unauthorized', { status: 401 })
  }

  const { id } = await params

  if (!id) {
    return Response.json({ error: 'id is required' }, { status: 400 })
  }

  await db.delete(srcSourceDocuments).where(eq(srcSourceDocuments.id, id))

  return Response.json({ success: true })
}
