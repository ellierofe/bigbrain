// Fragment registry — fetch prompt_fragments rows by id or slug.
//
// Rules:
//  - by id: fetches that exact row (any version, any status). Used for FK
//    refs on prompt_stages (persona, worldview, output_contract) which pin to
//    a specific row at seed time and stay valid even if the slug ships a v2.
//  - by slugs: fetches the latest ACTIVE version per slug. Used for inline
//    `${slug}` refs in skeletons / extras / fragment content where the
//    reference is unpinned and should always pick up the current canonical text.
//  - Throws on missing rows or non-active rows fetched by slug.
//
// Both code paths populate a versions map so the caller can persist
// `generation_runs.fragment_versions` for audit.

import { and, eq, inArray } from 'drizzle-orm'
import { db } from '@/lib/db'
import { promptFragments, type PromptFragment } from '@/lib/db/schema/content/prompt-fragments'

export type FragmentVersionsMap = Record<string, number>

/**
 * Fetch a single fragment by primary key. Used for stage FK refs.
 * Records the slug→version pair for audit.
 */
export async function getFragmentById(
  id: string,
  versions: FragmentVersionsMap,
): Promise<PromptFragment> {
  const rows = await db
    .select()
    .from(promptFragments)
    .where(eq(promptFragments.id, id))
    .limit(1)

  const row = rows[0]
  if (!row) throw new Error(`Fragment not found by id: ${id}`)
  versions[row.slug] = row.version
  return row
}

/**
 * Fetch the latest active version of each slug. Single round-trip.
 * Throws if any slug has no active row.
 */
export async function getFragmentsBySlugs(
  slugs: string[],
  versions: FragmentVersionsMap,
): Promise<Map<string, PromptFragment>> {
  if (slugs.length === 0) return new Map()

  // Dedupe so the IN list stays minimal even if callers pass repeats.
  const uniqueSlugs = Array.from(new Set(slugs))

  // Single query, narrow to active rows for the requested slugs. The dataset
  // per call is bounded (~10s of fragments at most) so keeping the
  // highest-version-per-slug logic in JS avoids a fragile SQL window query
  // and a neon-http array-binding rough edge.
  const rows = await db
    .select()
    .from(promptFragments)
    .where(and(inArray(promptFragments.slug, uniqueSlugs), eq(promptFragments.status, 'active')))

  const bySlug = new Map<string, PromptFragment>()
  for (const r of rows) {
    const existing = bySlug.get(r.slug)
    if (!existing || r.version > existing.version) bySlug.set(r.slug, r)
  }
  for (const [slug, r] of bySlug) versions[slug] = r.version

  const missing = uniqueSlugs.filter((s) => !bySlug.has(s))
  if (missing.length > 0) {
    throw new Error(`No active fragment for slug(s): ${missing.join(', ')}`)
  }

  return bySlug
}
