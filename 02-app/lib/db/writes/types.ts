/**
 * Shared types for the writes lib. The lib sits between Drizzle and both:
 *   - existing UI server actions (refactored to call here)
 *   - the new db_update_bot sub-agent tools (which call here via dryRun proposals)
 *
 * Every write is logged to `entity_writes` with an `actor` string identifying
 * the source. UI writes pass `actor: 'ui:<path>'`; chat writes pass
 * `actor: 'chat:<conversationId>'`; skill terminal saves pass
 * `actor: 'skill:<skillId>:conversation:<id>'`.
 */

/** All entity types currently writable via the lib. v1 scope. */
export type WriteEntityType =
  | 'dna_business_overview'
  | 'dna_brand_meaning'
  | 'dna_value_proposition'
  | 'dna_audience_segment'
  | 'dna_offer'
  | 'dna_platform'
  | 'dna_tone_of_voice'
  | 'dna_knowledge_asset'
  | 'idea'

export type WriteOp = 'create' | 'update'

export interface WriteContext {
  /** Identifier for the source of this write — see file header for shapes. */
  actor: string
  /** Brand scope. Required for the audit log. */
  brandId: string
}

export type WriteResult<T = void> =
  | { ok: true; data: T; pathsToRevalidate: string[] }
  | { ok: false; error: string; code?: WriteErrorCode }

export type WriteErrorCode =
  | 'field_not_writable'
  | 'validation'
  | 'not_found'
  | 'internal'

/**
 * Per-entity writes module shape. Singular entities (one row per brand) and
 * plural entities (many rows per brand) both expose the same shape; the
 * meaningful difference is whether `id` is required for `updateField`.
 */
export interface SingularEntityWrites {
  isSingular: true
  entityType: WriteEntityType
  WRITABLE_FIELDS: ReadonlySet<string>
  /** Returns the current value of a field for diff purposes. */
  getCurrentValue(brandId: string, field: string): Promise<unknown>
  /** Returns the canonical entity ID for diff/audit. May be null if the row doesn't exist yet. */
  getCurrentRowId(brandId: string): Promise<string | null>
  /** Update a field. Auto-creates the row on first write. */
  updateField(field: string, value: unknown, ctx: WriteContext): Promise<WriteResult>
}

export interface PluralEntityWrites {
  isSingular: false
  entityType: WriteEntityType
  WRITABLE_FIELDS: ReadonlySet<string>
  /** Returns the current value of a field for diff purposes. */
  getCurrentValue(id: string, field: string): Promise<unknown>
  /** Update a field on an existing row. */
  updateField(id: string, field: string, value: unknown, ctx: WriteContext): Promise<WriteResult>
  /** Direct create — payload must satisfy the entity's required fields. May be undefined for entities where create is skill-shaped (e.g. offers). */
  create?(payload: Record<string, unknown>, ctx: WriteContext): Promise<WriteResult<{ id: string }>>
}

export type EntityWrites = SingularEntityWrites | PluralEntityWrites
