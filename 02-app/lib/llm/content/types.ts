// Runtime types for the eight-layer prompt assembler (ADR-006, OUT-02).
//
// These mirror the jsonb shapes declared on `content_types` and `prompt_stages`.
// Co-located here (not on the Drizzle schema files) because they are runtime
// contracts shared by the assembler, the picker resolver, and the seed scripts —
// the schema files keep their `.default({})` looseness, but consumers cast to
// these types at the boundary.

// ---------------------------------------------------------------------------
// content_types.prerequisites
// ---------------------------------------------------------------------------

/** What must exist before a content type unlocks in the picker. */
export type Prerequisites = {
  /** Channel keys (channel-taxonomy.md). Resolves to dna_platforms.channel. */
  channels: string[]
  /** Lead-magnet kinds (channel-taxonomy.md). Resolves to dna_lead_magnets.kind. V1 always []. */
  lead_magnets: string[]
  /** DNA record keys. See PrerequisiteDnaKey for the V1 vocabulary. */
  dna: PrerequisiteDnaKey[]
}

export type PrerequisiteDnaKey =
  | 'brand'
  | 'tov'
  | 'audience'
  | 'value_proposition'
  | 'offers'
  | 'expertise'
  | 'central_bio'
  | 'brand_meaning'

// ---------------------------------------------------------------------------
// content_types.strategy_fields
// ---------------------------------------------------------------------------

/** Declarative config for the Strategy panel. Order is preserved as render order. */
export type StrategyFields = StrategyField[]

export type StrategyField = {
  /** Picker-scoped field id (not a column name). Resolver maps to a DNA record or freeform input. */
  id: StrategyFieldId
  required: boolean
}

export type StrategyFieldId =
  | 'offer'
  | 'audience_segment'
  | 'knowledge_asset'
  | 'platform'
  | 'sales_page_angle'
  | 'cta_url'
  | 'tone_variation'
  | 'customer_journey_stage'
  // V2 expansions go here

// ---------------------------------------------------------------------------
// content_types.topic_context_config — Layer 5
// ---------------------------------------------------------------------------

/** Provisional shape per ADR-006 Open Question 9 — refine through use. */
export type TopicContextConfig = {
  uses_topic_engine: boolean
  /** DNA bundle resolver slugs to call (e.g. 'offer_full', 'audience_voc', 'tov_frame'). */
  dna_pulls: string[]
  /** When to inject channel/format hints from dna_platforms. */
  platform_metadata: 'always' | 'when_platform_selected' | 'never'
  /** What Layer 5 falls back to when neither topic engine nor strategy supply context. */
  fallback: 'free_text_only' | 'dna_only' | 'none'
}

// ---------------------------------------------------------------------------
// prompt_stages.craft_fragment_config — Layer 7
// ---------------------------------------------------------------------------

/**
 * Three usage modes: list (most common), tiered (sales AIDA copy), or empty
 * (skeleton-inline only).
 *
 * Storage shape (seed canonical):
 *   list   → { mode: 'list', slugs: string[] }
 *   tiered → { mode: 'tiered', tiers: Record<label, string[]> }
 *   empty  → {}
 *
 * Slugs here are fragment slugs; the assembler injects them as
 * ${slug} placeholders to flow through the same substitution pipeline as
 * any other inline ref.
 */
export type CraftFragmentConfig =
  | { mode: 'list'; slugs: string[] }
  | { mode: 'tiered'; tiers: Record<string, string[]> }
  | Record<string, never> // empty {}

// ---------------------------------------------------------------------------
// generation_runs.inputs — assembler input shape
// ---------------------------------------------------------------------------

/** Full structured snapshot of what the user submitted. Persists on generation_runs.inputs. */
export type GenerationInputs = {
  strategy: StrategyAnswers
  topic_chain: TopicChain | null
  free_text_augments: string[]
  settings: GenerationSettings
}

/** Map of strategy field id → resolved value (uuid for record refs, string for freeform). */
export type StrategyAnswers = Partial<Record<StrategyFieldId, string | null>>

/** A user's traversal through the Topic Engine cascade. Up to 4 steps. */
export type TopicChain = {
  category: string
  step1?: string
  step2?: string
  step3?: string[]
  step4?: string[]
  /** The literal sentence injected into Layer 5 when the cascade reaches a leaf. */
  prompt_template_resolved: string
}

export type GenerationSettings = {
  variant_count: number
  model_override: string | null
  /** ToV variation slug (maps to dna_tov.tonalTags). */
  tone_variation: string | null
}

// ---------------------------------------------------------------------------
// Placeholder vocabulary — must match 04-documentation/reference/prompt-vocabulary.md
// ---------------------------------------------------------------------------

/** Group A — strategy / topic-chain selections. Filled from GenerationInputs. */
export const PLACEHOLDERS_GROUP_A = [
  'selected',
  'selected_items_joined',
  'segment_name',
  'offer_name',
  'platform_name',
  'asset_name',
  'aspect_label',
  'value',
  'cta_url',
  'sales_page_angle',
  'customer_journey_stage',
] as const

/** Group B — DNA reads. Cached per-request. */
export const PLACEHOLDERS_GROUP_B = [
  'brand_name',
  'business_context_short',
  'tov_core',
  'voc_problems',
  'voc_desires',
  'voc_objections',
  'value_proposition_core',
  'offer_benefits',
] as const

/** Group C — assembler/stage state. Constants per call. */
export const PLACEHOLDERS_GROUP_C = [
  'variant_count',
  'min_chars',
  'max_chars',
] as const

export const ALL_PLACEHOLDERS = [
  ...PLACEHOLDERS_GROUP_A,
  ...PLACEHOLDERS_GROUP_B,
  ...PLACEHOLDERS_GROUP_C,
] as const

export type PlaceholderName = (typeof ALL_PLACEHOLDERS)[number]

/** Bundle slug vocabulary — must match prompt-vocabulary.md. V1 = 10 slugs (competitor_context deferred). */
export const BUNDLE_SLUGS_V1 = [
  'offer_full',
  'offer_summary',
  'audience_voc',
  'audience_summary',
  'tov_frame',
  'topic_intro',
  'value_proposition',
  'brand_meaning',
  'knowledge_asset',
  'recent_research',
] as const

export type BundleSlug = (typeof BUNDLE_SLUGS_V1)[number]
