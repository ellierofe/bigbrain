// Cron: sweep expired generation_runs.
//
// generation_runs is the system-of-record for in-flight + recently-generated
// content. Each row carries a 30-day TTL via `expires_at` (set at submit).
// When a variant is saved to the library, `kept` flips to true and the row is
// pinned forever. Anything else gets deleted by this sweep.
//
// Schedule: daily, ~03:15 UTC (low-traffic). See vercel.json crons config.
// Auth: Vercel cron triggers send `Authorization: Bearer ${CRON_SECRET}`.
//       Manual triggers from the same secret are also fine — handy for
//       backfill / admin work.

import { and, eq, lt, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { generationRuns } from '@/lib/db/schema/content/generation-runs'

// Force Node runtime — Drizzle/neon-http expects it.
export const runtime = 'nodejs'
// Don't cache the sweep response.
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return Response.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()

  // Single statement: delete every expired non-kept run. RESTRICT FKs on
  // content_types/prompt_stages mean we never need a join — runs reference
  // those, not the other way round. parentRunId is SET NULL.
  const deleted = await db
    .delete(generationRuns)
    .where(and(lt(generationRuns.expiresAt, sql`now()`), eq(generationRuns.kept, false)))
    .returning({ id: generationRuns.id })

  return Response.json({
    ok: true,
    deletedCount: deleted.length,
    durationMs: Date.now() - startedAt,
  })
}
