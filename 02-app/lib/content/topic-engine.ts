// Topic Engine — interprets `topic_paths` cascade against live data.
//
// The picker UI calls this layer at every step; the leaf resolver produces
// the `TopicChain.prompt_template_resolved` sentence that lands in
// `GenerationInputs.topic_chain` and feeds Layer 5 of the assembler.
//
// Responsibilities:
//   1. Walk the topic_paths tree (categories → sub-categories → entities → aspects → items).
//   2. Execute the declarative `data_query` and `has_data_check` jsonb specs.
//   3. Resolve a leaf row's `prompt_template` (the "madlibs" sentence) using
//      placeholder values gathered from the cascade context.
//
// What this module does NOT do:
//   - Render UI. It returns plain JSON — the picker chooses how to display.
//   - Resolve assembler-side ${...} placeholders (e.g. ${segment_name} inside
//     a content fragment). That's the assembler's placeholder layer.
//
// All public functions take an explicit `brandId`. The topic_paths table
// itself is shared across brands (it's the catalogue) but every data query
// applies a brand filter. Multi-tenant cutover = swap the call sites.

import { and, asc, eq, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { topicPaths, type TopicPath } from '@/lib/db/schema/content/topic-paths'
import type { TopicChain } from '@/lib/llm/content/types'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * The picker's view model. Either a topic_paths row (intermediate or leaf
 * structural node) OR a dynamic data item resolved from a 'table' /
 * 'jsonb_array' / 'joined' query.
 *
 * `topicPath` is set when the node is a structural cascade row (the picker
 * advances by following its `id` as the next parent). `itemId`/`itemLabel`
 * are set when the node is a data row (the picker captures `itemId` as the
 * cascade param for the next step). Both can be present when an entity row
 * carries through to a structural sub-tree (e.g. selecting an offer entity
 * surfaces a topic_paths sub-tree of aspects under it).
 */
export type TopicNode = {
  /** Stable identifier for this node within its parent. Either a topic_paths.id or a data row id. */
  key: string
  /** User-facing label. */
  label: string
  /** True when the node is itself selectable as a leaf. False = pick to drill further. */
  isLeaf: boolean
  /** Has-data flag for category / sub-category nodes. Undefined when not gated. */
  hasData?: boolean
  /** The topic_paths row, if this is a structural node. */
  topicPath?: TopicPath
  /** Data item id (e.g. dna_offers.id), if the node came from a `table`/`joined` query. */
  itemId?: string
  /** Index into a jsonb array, if the node came from a `jsonb_array` query. */
  itemIndex?: number
  /** Raw projected value (string or object payload) for leaves that need it during resolveChain. */
  itemPayload?: unknown
}

/** Cascade context — selections gathered as the user clicks through. */
export type TopicParams = {
  /** Picked entity id at step 2 (e.g. selected segment, offer, asset). */
  segment_id?: string
  offer_id?: string
  asset_id?: string
  platform_id?: string
  mission_id?: string
  research_id?: string
  source_document_id?: string
  idea_id?: string
  /** Free-text input (only for the `free_text` category). */
  user_text?: string
}

// ---------------------------------------------------------------------------
// Per-table projection: how to render a row as a TopicNode label / payload
// ---------------------------------------------------------------------------

/**
 * For each table that participates in `data_query.kind = 'table'`/'joined',
 * declare which columns make up the picker label and which become available
 * to the leaf prompt_template via `${...}` placeholders.
 *
 * `labelExpr` is an SQL expression used in the SELECT — keep it simple
 * (column ref or COALESCE). `placeholders` lists the columns the leaf
 * resolver should pull onto the cascade payload (used to fill ${stat},
 * ${client_name}, etc.).
 */
type TableProjection = {
  labelExpr: string
  /** Column name → placeholder name. Missing values resolve to ''. */
  placeholders: Record<string, string>
}

const TABLE_PROJECTIONS: Record<string, TableProjection> = {
  dna_audience_segments: {
    labelExpr: 'segment_name',
    placeholders: { segment_name: 'segment_name' },
  },
  dna_offers: {
    labelExpr: 'name',
    placeholders: { name: 'offer_name' },
  },
  dna_knowledge_assets: {
    labelExpr: 'name',
    placeholders: { name: 'asset_name' },
  },
  dna_platforms: {
    labelExpr: 'name',
    placeholders: { name: 'platform_name' },
  },
  dna_brand_meaning: {
    labelExpr: "'Brand meaning'",
    placeholders: {},
  },
  dna_value_proposition: {
    labelExpr: "'Value proposition'",
    placeholders: {},
  },
  dna_entity_outcomes: {
    labelExpr: 'body',
    placeholders: { body: 'value' },
  },
  src_statistics: {
    labelExpr: "COALESCE(short_label, LEFT(stat, 80))",
    placeholders: { stat: 'stat', source: 'source' },
  },
  src_testimonials: {
    labelExpr: "client_name || ' — ' || LEFT(COALESCE(edited_quote, quote), 60)",
    placeholders: { client_name: 'client_name', quote: 'quote' },
  },
  src_stories: {
    labelExpr: 'title',
    placeholders: { title: 'title', narrative: 'narrative_or_summary' },
  },
  src_source_documents: {
    labelExpr: "COALESCE(title, type)",
    placeholders: { title: 'title', type: 'type' },
  },
  src_own_research: {
    labelExpr: "COALESCE(short_label, title)",
    placeholders: { title: 'title', summary: 'extracted_text_excerpt' },
  },
  missions: {
    labelExpr: 'name',
    placeholders: { name: 'mission_name' },
  },
  ideas: {
    labelExpr: 'LEFT(text, 80)',
    placeholders: { text: 'idea_text' },
  },
  mission_inputs: {
    // Joined to source_documents — picker label is the doc title.
    labelExpr: "(SELECT title FROM src_source_documents WHERE id = mission_inputs.source_document_id)",
    placeholders: {},
  },
  mission_stats: {
    labelExpr: "(SELECT COALESCE(short_label, LEFT(stat, 80)) FROM src_statistics WHERE id = mission_stats.stat_id)",
    placeholders: {},
  },
  mission_verticals: {
    labelExpr: "(SELECT name FROM verticals WHERE id = mission_verticals.vertical_id)",
    placeholders: {},
  },
}

// ---------------------------------------------------------------------------
// Filter parsing — safe whitelist for topic_paths.data_query.filter strings
// ---------------------------------------------------------------------------
//
// Supported grammar (single condition):
//   <field>=<literal>      — equality, literal is single-quoted string OR true|false|null
//   <field>!=<literal>     — inequality
//   <field> IS NOT NULL    — null check
//
// Multiple conditions are NOT supported — the seed never combines them.
// Field names must be lowercase a-z + underscore. Anything outside this
// grammar throws — we never interpolate raw filter text into SQL.

type ParsedFilter = {
  field: string
  op: '=' | '!=' | 'is_not_null'
  value?: string | boolean | null
}

function parseFilter(filter: string | null | undefined): ParsedFilter | null {
  if (!filter) return null
  const trimmed = filter.trim()

  // <field> IS NOT NULL
  const isNotNull = trimmed.match(/^([a-z_][a-z0-9_]*)\s+IS\s+NOT\s+NULL$/i)
  if (isNotNull) return { field: isNotNull[1], op: 'is_not_null' }

  // <field>=<literal> or <field>!=<literal>
  const eq = trimmed.match(/^([a-z_][a-z0-9_]*)\s*(!?=)\s*(.+)$/)
  if (!eq) throw new Error(`Unsupported topic_paths filter: ${filter}`)
  const [, field, op, rawValue] = eq

  const value = parseLiteral(rawValue.trim())
  return { field, op: op === '=' ? '=' : '!=', value }
}

function parseLiteral(raw: string): string | boolean | null {
  if (raw === 'true') return true
  if (raw === 'false') return false
  if (raw === 'null') return null
  // Single-quoted string
  const m = raw.match(/^'((?:[^']|'')*)'$/)
  if (m) return m[1].replace(/''/g, "'")
  throw new Error(`Unsupported filter literal: ${raw}`)
}

function filterAsSqlChunk(parsed: ParsedFilter | null) {
  if (!parsed) return null
  const fieldId = sql.identifier(parsed.field)
  if (parsed.op === 'is_not_null') return sql`${fieldId} IS NOT NULL`
  return parsed.op === '=' ? sql`${fieldId} = ${parsed.value}` : sql`${fieldId} != ${parsed.value}`
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Fetch a topic_paths row by its dotted natural key. */
export async function getNode(path: string): Promise<TopicPath | null> {
  const [row] = await db.select().from(topicPaths).where(eq(topicPaths.path, path)).limit(1)
  return row ?? null
}

/**
 * List the step-1 categories. Filters by has-data so empty categories don't
 * surface in the picker (mirrors the architecture doc's gate rules).
 */
export async function listCategories(brandId: string): Promise<TopicNode[]> {
  const rows = await db
    .select()
    .from(topicPaths)
    .where(and(eq(topicPaths.stepLevel, 1), eq(topicPaths.status, 'active')))
    .orderBy(asc(topicPaths.displayOrder))

  const nodes: TopicNode[] = []
  for (const row of rows) {
    const hasData = row.hasDataCheck ? await checkHasData(brandId, row, {}) : true
    nodes.push({
      key: row.id,
      label: row.label,
      isLeaf: row.promptTemplate != null,
      hasData,
      topicPath: row,
    })
  }
  return nodes
}

/**
 * List the children of a node — what the picker shows at the next step.
 *
 * Two pathways:
 *   - Structural children (`data_query.kind = 'static'`): rows in topic_paths
 *     where parentId = node.id. Returned as TopicNodes wrapping the topic_paths row.
 *   - Dynamic children: execute the node's child rows' `data_query` against
 *     live tables. The seed pattern is: a structural placeholder row carries
 *     the data_query; we surface its results as items rather than the row itself.
 *
 * The seed's actual pattern: when a topic_paths row has `data_query.kind != 'static'`,
 * **that row IS the leaf** (e.g. `audience.segment.problems.item`). Calling
 * listChildren on its parent ('audience.segment.problems') returns the data
 * items (since the .item child IS the leaf to render N times).
 *
 * So the algorithm is:
 *   1. Find structural children of node (parentId = node.id).
 *   2. For each child:
 *        - If data_query.kind == 'static' → return as a structural TopicNode.
 *        - Else → execute the data_query, return one TopicNode per data row.
 *   3. Concatenate.
 *
 * In practice, a parent has EITHER all-static children (sub-categories)
 * OR exactly one non-static child (the .item leaf that surfaces multiple
 * data rows). The architecture doc never combines them.
 */
export async function listChildren(
  brandId: string,
  parentId: string,
  params: TopicParams,
): Promise<TopicNode[]> {
  const children = await db
    .select()
    .from(topicPaths)
    .where(and(eq(topicPaths.parentId, parentId), eq(topicPaths.status, 'active')))
    .orderBy(asc(topicPaths.displayOrder))

  const nodes: TopicNode[] = []
  for (const child of children) {
    const dq = child.dataQuery as { kind?: string } | null
    if (!dq?.kind || dq.kind === 'static') {
      // Structural node — let the picker decide whether it's selectable
      // (leaf) or just a drill-down. Has-data check applies to drill-down
      // sub-categories that gate visibility.
      const hasData = child.hasDataCheck ? await checkHasData(brandId, child, params) : undefined
      nodes.push({
        key: child.id,
        label: child.label,
        isLeaf: child.promptTemplate != null,
        hasData,
        topicPath: child,
      })
    } else {
      // Dynamic — explode this single row into multiple TopicNodes via the data_query.
      const items = await executeDataQuery(brandId, child, params)
      for (const item of items) {
        nodes.push({
          key: item.itemId ?? `${child.id}#${item.itemIndex}`,
          label: item.label,
          isLeaf: child.promptTemplate != null,
          itemId: item.itemId,
          itemIndex: item.itemIndex,
          itemPayload: item.payload,
          topicPath: child,
        })
      }
    }
  }
  return nodes
}

// ---------------------------------------------------------------------------
// has_data evaluator
// ---------------------------------------------------------------------------

/** Evaluate a topic_paths row's has_data_check. Returns true if the gate passes. */
export async function checkHasData(
  brandId: string,
  node: TopicPath,
  params: TopicParams,
): Promise<boolean> {
  const check = node.hasDataCheck as
    | { kind: string; table?: string; field?: string; filter?: string; parent_param?: string; parent_field?: string }
    | null
  if (!check) return true
  switch (check.kind) {
    case 'static':
      return true

    case 'table': {
      const filter = parseFilter(check.filter ?? null)
      const tableId = sql.identifier(check.table!)
      const filterSql = filterAsSqlChunk(filter)
      const where = filterSql
        ? sql`brand_id = ${brandId} AND ${filterSql}`
        : sql`brand_id = ${brandId}`
      const result = await db.execute<{ n: number }>(
        sql`SELECT COUNT(*)::int AS n FROM ${tableId} WHERE ${where} LIMIT 1`,
      )
      return Number(result.rows?.[0]?.n ?? 0) > 0
    }

    case 'single': {
      // Two flavours: brand-singular row's field non-null, or a specific parent row's field non-null.
      const tableId = sql.identifier(check.table!)
      const fieldId = sql.identifier(check.field!)
      if (check.parent_param) {
        const parentId = (params as Record<string, string | undefined>)[check.parent_param]
        if (!parentId) return false
        const result = await db.execute<{ ok: boolean }>(
          sql`SELECT ${fieldId} IS NOT NULL AS ok FROM ${tableId} WHERE id = ${parentId} LIMIT 1`,
        )
        return Boolean(result.rows?.[0]?.ok)
      }
      const result = await db.execute<{ ok: boolean }>(
        sql`SELECT ${fieldId} IS NOT NULL AS ok FROM ${tableId} WHERE brand_id = ${brandId} LIMIT 1`,
      )
      return Boolean(result.rows?.[0]?.ok)
    }

    case 'jsonb_array': {
      const tableId = sql.identifier(check.table!)
      const fieldId = sql.identifier(check.field!)
      const parentId = (params as Record<string, string | undefined>)[check.parent_param!]
      if (!parentId) return false
      const result = await db.execute<{ n: number }>(
        sql`SELECT jsonb_array_length(COALESCE(${fieldId}, '[]'::jsonb))::int AS n FROM ${tableId} WHERE id = ${parentId} LIMIT 1`,
      )
      return Number(result.rows?.[0]?.n ?? 0) > 0
    }

    case 'joined': {
      const tableId = sql.identifier(check.table!)
      const parentFieldId = sql.identifier(check.parent_field!)
      const parentId = (params as Record<string, string | undefined>)[check.parent_param!]
      if (!parentId) return false
      const filter = parseFilter(check.filter ?? null)
      const filterSql = filterAsSqlChunk(filter)
      const where = filterSql
        ? sql`${parentFieldId} = ${parentId} AND ${filterSql}`
        : sql`${parentFieldId} = ${parentId}`
      const result = await db.execute<{ n: number }>(
        sql`SELECT COUNT(*)::int AS n FROM ${tableId} WHERE ${where} LIMIT 1`,
      )
      return Number(result.rows?.[0]?.n ?? 0) > 0
    }

    default:
      throw new Error(`Unknown has_data_check kind: ${check.kind}`)
  }
}

// ---------------------------------------------------------------------------
// data_query executor
// ---------------------------------------------------------------------------

type DataQueryItem = {
  label: string
  itemId?: string
  itemIndex?: number
  /** Projected payload (column values keyed by placeholder name). Used by leaf resolver. */
  payload: Record<string, string>
}

async function executeDataQuery(
  brandId: string,
  node: TopicPath,
  params: TopicParams,
): Promise<DataQueryItem[]> {
  const dq = node.dataQuery as
    | { kind: string; table?: string; field?: string; filter?: string; parent_param?: string; parent_field?: string }
    | null
  if (!dq?.kind) return []

  switch (dq.kind) {
    case 'table':
      return execTable(brandId, dq.table!, dq.filter ?? null)

    case 'joined': {
      const parentId = (params as Record<string, string | undefined>)[dq.parent_param!]
      if (!parentId) return []
      return execJoined(dq.table!, dq.parent_field!, parentId, dq.filter ?? null)
    }

    case 'jsonb_array': {
      const parentId = (params as Record<string, string | undefined>)[dq.parent_param!]
      if (!parentId) return []
      return execJsonbArray(dq.table!, dq.field!, parentId)
    }

    case 'single': {
      // Returns a single item — used by aspect-level rows that are themselves the leaf (no step 4).
      return execSingle(brandId, dq.table!, dq.field!, dq.parent_param ?? null, params)
    }

    default:
      throw new Error(`Unsupported data_query kind for executor: ${dq.kind}`)
  }
}

async function execTable(brandId: string, table: string, filter: string | null): Promise<DataQueryItem[]> {
  const proj = TABLE_PROJECTIONS[table]
  if (!proj) throw new Error(`No TABLE_PROJECTIONS entry for ${table}`)
  const tableId = sql.identifier(table)
  const filterSql = filterAsSqlChunk(parseFilter(filter))
  const where = filterSql ? sql`brand_id = ${brandId} AND ${filterSql}` : sql`brand_id = ${brandId}`

  const placeholderCols = Object.keys(proj.placeholders)
  const placeholderSelect = placeholderCols.length > 0
    ? sql.join(placeholderCols.map((c) => sql.identifier(c)), sql`, `)
    : sql.raw('NULL')
  const labelSelectRaw = sql.raw(`(${proj.labelExpr})`)

  const result = await db.execute(
    sql`SELECT id, ${labelSelectRaw} AS __label__${placeholderCols.length > 0 ? sql`, ${placeholderSelect}` : sql``} FROM ${tableId} WHERE ${where} ORDER BY ${labelSelectRaw}`,
  )
  return (result.rows as Record<string, unknown>[]).map((r) => projectRow(proj, r, String(r.id)))
}

async function execJoined(
  table: string,
  parentField: string,
  parentId: string,
  filter: string | null,
): Promise<DataQueryItem[]> {
  const proj = TABLE_PROJECTIONS[table]
  if (!proj) throw new Error(`No TABLE_PROJECTIONS entry for ${table}`)
  const tableId = sql.identifier(table)
  const parentFieldId = sql.identifier(parentField)
  const filterSql = filterAsSqlChunk(parseFilter(filter))
  const where = filterSql
    ? sql`${parentFieldId} = ${parentId} AND ${filterSql}`
    : sql`${parentFieldId} = ${parentId}`

  const placeholderCols = Object.keys(proj.placeholders)
  const placeholderSelect = placeholderCols.length > 0
    ? sql.join(placeholderCols.map((c) => sql.identifier(c)), sql`, `)
    : sql.raw('NULL')
  const labelSelectRaw = sql.raw(`(${proj.labelExpr})`)

  const result = await db.execute(
    sql`SELECT id, ${labelSelectRaw} AS __label__${placeholderCols.length > 0 ? sql`, ${placeholderSelect}` : sql``} FROM ${tableId} WHERE ${where} ORDER BY ${labelSelectRaw}`,
  )
  return (result.rows as Record<string, unknown>[]).map((r) => projectRow(proj, r, String(r.id)))
}

async function execJsonbArray(table: string, field: string, parentId: string): Promise<DataQueryItem[]> {
  const tableId = sql.identifier(table)
  const fieldId = sql.identifier(field)
  const result = await db.execute<{ idx: number; value: unknown }>(
    sql`SELECT (i.ord - 1)::int AS idx, i.value FROM ${tableId} t, LATERAL jsonb_array_elements(COALESCE(${fieldId}, '[]'::jsonb)) WITH ORDINALITY AS i(value, ord) WHERE t.id = ${parentId} ORDER BY idx`,
  )
  return (result.rows as Array<{ idx: number; value: unknown }>).map((r) => {
    // Tolerate two shapes: scalar string elements OR objects with a known
    // label-bearing field. Order of fallbacks matters — try the most specific
    // first. Confirmed live shapes: VOC arrays use {text, category};
    // src_own_research.key_findings uses {finding, significance, tags};
    // dna_brand_meaning.values uses {name, description, behaviours[]};
    // dna_audience_segments.shared_beliefs uses {text}.
    const v = r.value
    let label: string
    let payload: Record<string, string> = {}
    if (typeof v === 'string') {
      label = v
      payload = { value: v, selected: v }
    } else if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>
      label = String(o.text ?? o.finding ?? o.name ?? o.title ?? JSON.stringify(o))
      payload = Object.fromEntries(Object.entries(o).map(([k, val]) => [k, String(val ?? '')]))
      payload.value = label
      payload.selected = label
    } else {
      label = String(v ?? '')
      payload = { value: label, selected: label }
    }
    return { label, itemIndex: r.idx, payload }
  })
}

async function execSingle(
  brandId: string,
  table: string,
  field: string,
  parentParam: string | null,
  params: TopicParams,
): Promise<DataQueryItem[]> {
  const tableId = sql.identifier(table)
  const fieldId = sql.identifier(field)
  if (parentParam) {
    const parentId = (params as Record<string, string | undefined>)[parentParam]
    if (!parentId) return []
    const result = await db.execute<{ id: string; v: string | null }>(
      sql`SELECT id, ${fieldId} AS v FROM ${tableId} WHERE id = ${parentId} LIMIT 1`,
    )
    const row = result.rows?.[0]
    if (!row || row.v == null) return []
    return [{ label: row.v, itemId: row.id, payload: { value: row.v, selected: row.v, [field]: row.v } }]
  }
  const result = await db.execute<{ id: string; v: string | null }>(
    sql`SELECT id, ${fieldId} AS v FROM ${tableId} WHERE brand_id = ${brandId} LIMIT 1`,
  )
  const row = result.rows?.[0]
  if (!row || row.v == null) return []
  return [{ label: row.v, itemId: row.id, payload: { value: row.v, selected: row.v, [field]: row.v } }]
}

function projectRow(proj: TableProjection, row: Record<string, unknown>, id: string): DataQueryItem {
  const label = String(row.__label__ ?? '')
  const payload: Record<string, string> = { value: label, selected: label }
  for (const [col, ph] of Object.entries(proj.placeholders)) {
    const v = row[col]
    if (v != null) payload[ph] = String(v)
  }
  return { label, itemId: id, payload }
}

// ---------------------------------------------------------------------------
// Leaf resolver — turns a leaf row + cascade context into prompt_template_resolved
// ---------------------------------------------------------------------------

/**
 * Build the TopicChain for the assembler. The leaf's `prompt_template` has
 * `${...}` tokens; we fill them from:
 *   - the cascade context (segment_name, offer_name, etc. — fetched via TABLE_PROJECTIONS)
 *   - the leaf row's own static aspect_label
 *   - the user's selected items at the leaf step (selected_items_joined)
 *   - the per-item payload for single-value aspects (value, stat, quote, etc.)
 *
 * `selectedItems` is the array of TopicNodes the user picked at the leaf
 * step (multi-select for items; single for aspects). Empty for free_text.
 */
export async function resolveChain(
  brandId: string,
  leafPath: string,
  params: TopicParams,
  selectedItems: TopicNode[],
): Promise<TopicChain> {
  const leaf = await getNode(leafPath)
  if (!leaf) throw new Error(`Topic leaf not found: ${leafPath}`)
  if (!leaf.promptTemplate) throw new Error(`Node ${leafPath} has no prompt_template — not a leaf`)

  const placeholderValues = await collectPlaceholders(brandId, leaf, params, selectedItems)

  const resolved = leaf.promptTemplate.replace(/\$\{([a-z_]+)\}/g, (_match, name: string) => {
    const v = placeholderValues[name]
    if (v == null) {
      throw new Error(`Topic engine: unresolved placeholder \${${name}} in ${leafPath}`)
    }
    return v
  })

  // Build the TopicChain shape the assembler expects.
  return {
    category: leaf.category,
    step1: leaf.category, // step1 is the category in our cascade
    step2: pickStep2Param(params, leaf.category) ?? undefined,
    step3: deriveAspect(leaf),
    step4: selectedItems.length > 0 ? selectedItems.map((n) => n.label) : undefined,
    prompt_template_resolved: resolved,
  }
}

/**
 * Free-text escape hatch — bypasses the cascade entirely.
 */
export async function resolveFreeText(text: string): Promise<TopicChain> {
  const leaf = await getNode('free_text')
  if (!leaf?.promptTemplate) throw new Error('free_text leaf missing prompt_template')
  return {
    category: 'free_text',
    step1: 'free_text',
    prompt_template_resolved: leaf.promptTemplate.replace(/\$\{user_text\}/g, text),
  }
}

// ---------------------------------------------------------------------------
// Placeholder collection — turns cascade context into a flat name → value map
// ---------------------------------------------------------------------------

async function collectPlaceholders(
  brandId: string,
  leaf: TopicPath,
  params: TopicParams,
  selectedItems: TopicNode[],
): Promise<Record<string, string>> {
  const out: Record<string, string> = {}

  // 1. The leaf's own surface label is the aspect_label. Walk up to the
  //    nearest 'aspect' or 'sub_category' ancestor to get the human-readable.
  out.aspect_label = await deriveAspectLabel(leaf)

  // 2. Fill parent-entity placeholders by reading the chosen entity row.
  //    e.g. segment_id → segment_name, offer_id → offer_name, etc.
  for (const [paramKey, paramValue] of Object.entries(params)) {
    if (!paramValue) continue
    const entityFields = await fetchParamPlaceholders(brandId, paramKey, paramValue)
    Object.assign(out, entityFields)
  }

  // 3. Items selected at the leaf step.
  if (selectedItems.length > 0) {
    out.selected_items_joined = joinItems(selectedItems.map((n) => n.label))
    // Single-value aspects: surface the first item's payload at the top level
    // so ${value}, ${stat}, ${quote}, etc. resolve.
    const first = selectedItems[0]
    if (first.itemPayload && typeof first.itemPayload === 'object') {
      for (const [k, v] of Object.entries(first.itemPayload as Record<string, unknown>)) {
        if (out[k] == null) out[k] = String(v ?? '')
      }
    }
  }

  // 4. user_text only matters for free_text — already handled by resolveFreeText.

  return out
}

/**
 * Look up a parent-entity row and return the placeholder-keyed payload.
 * Used to resolve ${segment_name}, ${offer_name}, etc. when only the
 * cascade param (uuid) is in hand.
 */
async function fetchParamPlaceholders(
  brandId: string,
  paramKey: string,
  paramValue: string,
): Promise<Record<string, string>> {
  // Map cascade params back to (table, projection).
  const PARAM_TO_TABLE: Record<string, string> = {
    segment_id: 'dna_audience_segments',
    offer_id: 'dna_offers',
    asset_id: 'dna_knowledge_assets',
    platform_id: 'dna_platforms',
    mission_id: 'missions',
    research_id: 'src_own_research',
    source_document_id: 'src_source_documents',
    idea_id: 'ideas',
  }
  const table = PARAM_TO_TABLE[paramKey]
  if (!table) return {}
  const proj = TABLE_PROJECTIONS[table]
  if (!proj) return {}

  const tableId = sql.identifier(table)
  const placeholderCols = Object.keys(proj.placeholders)
  if (placeholderCols.length === 0) return {}
  const placeholderSelect = sql.join(placeholderCols.map((c) => sql.identifier(c)), sql`, `)

  const result = await db.execute(
    sql`SELECT ${placeholderSelect} FROM ${tableId} WHERE id = ${paramValue} AND brand_id = ${brandId} LIMIT 1`,
  )
  const row = result.rows?.[0] as Record<string, unknown> | undefined
  if (!row) return {}
  const out: Record<string, string> = {}
  for (const [col, ph] of Object.entries(proj.placeholders)) {
    if (row[col] != null) out[ph] = String(row[col])
  }
  return out
}

/**
 * The ${aspect_label} placeholder uses human-readable wording from the doc:
 * "problems, worries or fears", "desires/needs", "objections", "beliefs".
 * Walk up ancestors until we hit a 'sub_category' or 'aspect' surface — its
 * label is the aspect_label.
 */
async function deriveAspectLabel(leaf: TopicPath): Promise<string> {
  // The 'aspect' or 'sub_category' is leaf.parentId most of the time.
  let current: TopicPath | null = leaf
  while (current) {
    if (current.surfaceKind === 'aspect' || current.surfaceKind === 'sub_category') {
      return current.label
    }
    if (!current.parentId) break
    const [parent] = await db.select().from(topicPaths).where(eq(topicPaths.id, current.parentId)).limit(1)
    current = parent ?? null
  }
  return leaf.label
}

/** Used as TopicChain.step3 — keep the aspect label for audit (not the rendered ${aspect_label} prose). */
function deriveAspect(leaf: TopicPath): string[] | undefined {
  // step3 in TopicChain is an array of aspect labels; for V1 single-aspect cascades
  // this is a one-element array. Empty for entity-leaf cascades (no aspect).
  if (leaf.surfaceKind === 'item' || leaf.surfaceKind === 'aspect') {
    return [leaf.label]
  }
  return undefined
}

function pickStep2Param(params: TopicParams, category: string): string | null {
  // Map category → which cascade param holds the step-2 selection.
  const KEY: Record<string, keyof TopicParams> = {
    audience: 'segment_id',
    offer: 'offer_id',
    knowledge_asset: 'asset_id',
    platform: 'platform_id',
    mission: 'mission_id',
    own_research: 'research_id',
    source_material: 'source_document_id',
    idea: 'idea_id',
  }
  const k = KEY[category]
  return k ? (params[k] as string | undefined) ?? null : null
}

function joinItems(labels: string[]): string {
  if (labels.length === 0) return ''
  if (labels.length === 1) return `"${labels[0]}"`
  if (labels.length === 2) return `"${labels[0]}" and "${labels[1]}"`
  return `${labels.slice(0, -1).map((l) => `"${l}"`).join(', ')} and "${labels[labels.length - 1]}"`
}
