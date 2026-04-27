import { eq, ilike } from 'drizzle-orm'
import { db } from '@/lib/db'
import { organisations } from '@/lib/db/schema/projects'
import type { OrganisationSummary } from '@/lib/types/client-projects'

/** All organisations for a brand, alphabetical */
export async function listOrganisations(brandId: string): Promise<OrganisationSummary[]> {
  return db
    .select({
      id: organisations.id,
      name: organisations.name,
      website: organisations.website,
    })
    .from(organisations)
    .where(eq(organisations.brandId, brandId))
    .orderBy(organisations.name)
}

/** Search organisations by name (case-insensitive partial match) */
export async function searchOrganisations(brandId: string, query: string): Promise<OrganisationSummary[]> {
  return db
    .select({
      id: organisations.id,
      name: organisations.name,
      website: organisations.website,
    })
    .from(organisations)
    .where(eq(organisations.brandId, brandId))
    .orderBy(organisations.name)
    .then((rows) =>
      rows.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()))
    )
}

/** Create an organisation */
export async function createOrganisation(input: {
  brandId: string
  name: string
  website?: string
}): Promise<{ id: string; name: string }> {
  const rows = await db
    .insert(organisations)
    .values(input)
    .returning({ id: organisations.id, name: organisations.name })

  return rows[0]
}
