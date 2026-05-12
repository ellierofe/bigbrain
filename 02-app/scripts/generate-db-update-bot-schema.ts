/**
 * Generate `lib/skills/sub-agents/db_update_bot/SCHEMA.md` from the writes-lib
 * WRITABLE_FIELDS exports + Drizzle schema column types. Committed to the
 * repo; regenerate via `npm run gen:write-schema` whenever schemas or
 * WRITABLE_FIELDS change. Drift is detected by `check:write-schema`.
 *
 * Run: npm run gen:write-schema
 */

import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { WRITES_BY_ENTITY } from '@/lib/db/writes'
import {
  dnaBusinessOverview,
  dnaBrandMeaning,
  dnaValueProposition,
  dnaAudienceSegments,
  dnaOffers,
  dnaPlatforms,
  dnaToneOfVoice,
  dnaKnowledgeAssets,
} from '@/lib/db/schema/dna'
import { ideas } from '@/lib/db/schema/inputs/ideas'
import type { WriteEntityType } from '@/lib/db/writes'

// `unknown` widens the heterogeneous Drizzle table types — we only ever read
// column metadata via Object.entries, never type-narrow back.
const TABLES_BY_ENTITY: Record<WriteEntityType, { table: unknown; label: string }> = {
  dna_business_overview: { table: dnaBusinessOverview, label: 'Business overview (singular)' },
  dna_brand_meaning: { table: dnaBrandMeaning, label: 'Brand meaning (singular)' },
  dna_value_proposition: { table: dnaValueProposition, label: 'Value proposition (singular)' },
  dna_audience_segment: { table: dnaAudienceSegments, label: 'Audience segments (plural)' },
  dna_offer: { table: dnaOffers, label: 'Offers (plural — update only; create is skill-shaped)' },
  dna_platform: { table: dnaPlatforms, label: 'Platforms (plural)' },
  dna_tone_of_voice: { table: dnaToneOfVoice, label: 'Tone of voice (singular)' },
  dna_knowledge_asset: { table: dnaKnowledgeAssets, label: 'Knowledge assets (plural)' },
  idea: { table: ideas, label: 'Ideas (plural)' },
}

function describeColumn(col: unknown): string {
  if (!col || typeof col !== 'object') return 'unknown'
  const c = col as { dataType?: string; columnType?: string; notNull?: boolean }
  const type = c.dataType ?? c.columnType ?? 'unknown'
  const optional = c.notNull ? '' : ' (optional)'
  return `${type}${optional}`
}

function buildEntitySection(entityType: WriteEntityType): string {
  const meta = TABLES_BY_ENTITY[entityType]
  const writes = WRITES_BY_ENTITY[entityType]
  const tableColumns = (meta.table as unknown as Record<string, unknown>) ?? {}

  const lines: string[] = []
  lines.push(`### ${entityType} — ${meta.label}`)
  lines.push('')
  lines.push('Writable fields:')
  lines.push('')

  for (const fieldName of Array.from(writes.WRITABLE_FIELDS).sort()) {
    const col = tableColumns[fieldName] as unknown
    lines.push(`- \`${fieldName}\` — ${describeColumn(col)}`)
  }

  lines.push('')
  lines.push('Available tools for this entity:')
  if (writes.isSingular) {
    lines.push(`- \`update_${entityType}({ field, value })\` — auto-creates the row on first write`)
  } else {
    lines.push(`- \`update_${entityType}({ id, field, value })\``)
    if ('create' in writes && writes.create) {
      lines.push(`- \`create_${entityType}({ payload })\``)
    }
    if (entityType === 'dna_audience_segment') {
      lines.push(`- \`request_${entityType}_generation({ seedInputs })\` — async generation`)
    }
  }
  lines.push('')

  return lines.join('\n')
}

function generate(): string {
  const lines: string[] = []
  lines.push('## Schema')
  lines.push('')
  lines.push('Generated from Drizzle schema + writes-lib WRITABLE_FIELDS exports.')
  lines.push('Do not edit by hand — run `npm run gen:write-schema` to regenerate.')
  lines.push('')

  const entityTypes = Object.keys(TABLES_BY_ENTITY) as WriteEntityType[]
  for (const entityType of entityTypes) {
    lines.push(buildEntitySection(entityType))
  }

  return lines.join('\n')
}

const target = join(process.cwd(), 'lib/skills/sub-agents/db_update_bot/SCHEMA.md')
const content = generate()
writeFileSync(target, content, 'utf8')
console.log(`Wrote ${target} (${content.length} chars)`)
