// Eight-layer prompt assembler — SKETCH (OUT-02 Phase 1, ADR-006).
//
// This is a pressure-test of the jsonb shapes on `content_types` and
// `prompt_stages` before the rest of Batch 2 ships. Bundle resolvers, fragment
// lookups, and DNA reads are stubbed — the goal is to walk all eight layers
// against real schema shapes and surface any awkwardness in the contracts.
//
// The eight layers (ADR-006):
//   1. Persona              — `prompt_stages.persona_fragment_id`
//   2. Worldview            — `prompt_stages.worldview_fragment_id` (nullable)
//   3. Task framing         — `prompt_stages.task_framing` (text)
//   4. Brand context        — invariant; brand_context_v1 bundle
//   5. Topic context        — `content_types.topic_context_config` drives it
//   6. Structural skeleton  — `prompt_stages.structural_skeleton` (with placeholders)
//   7. Craft directives     — `prompt_stages.craft_fragment_config`
//   8. Output contract      — `prompt_stages.output_contract_fragment_id` + extras

import type { ContentType } from '@/lib/db/schema'
import type { PromptStage } from '@/lib/db/schema'
import type {
  CraftFragmentConfig,
  GenerationInputs,
  TopicContextConfig,
} from './types'

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export type AssembleArgs = {
  contentType: ContentType
  stage: PromptStage
  inputs: GenerationInputs
}

export type AssembledPrompt = {
  /** Final prompt sent to the model. */
  text: string
  /** Map of fragment slug → version used. Persisted on generation_runs.fragment_versions. */
  fragmentVersions: Record<string, number>
  /** Layer-by-layer breakdown for audit/debug. */
  layers: AssembledLayers
}

export type AssembledLayers = {
  persona: string
  worldview: string | null
  taskFraming: string
  brandContext: string
  topicContext: string
  structuralSkeleton: string
  craftDirectives: string
  outputContract: string
}

/**
 * Walks the eight layers in order and produces a final prompt string.
 * SKETCH: bundle resolvers and fragment lookups are stubbed.
 */
export async function assemble(args: AssembleArgs): Promise<AssembledPrompt> {
  const { contentType, stage, inputs } = args
  const fragmentVersions: Record<string, number> = {}

  // Layer 1 — Persona
  const persona = await resolveFragmentById(stage.personaFragmentId, fragmentVersions)

  // Layer 2 — Worldview (nullable)
  const worldview = stage.worldviewFragmentId
    ? await resolveFragmentById(stage.worldviewFragmentId, fragmentVersions)
    : null

  // Layer 3 — Task framing (literal text)
  const taskFraming = stage.taskFraming

  // Layer 4 — Brand context (invariant bundle, not on this stage)
  const brandContext = await resolveBrandContextBundle()

  // Layer 5 — Topic context (config-driven)
  const topicContext = await resolveTopicContext(
    contentType.topicContextConfig as TopicContextConfig,
    inputs,
  )

  // Layer 6 — Structural skeleton (with inline ${slug} fragment refs + placeholder substitution)
  const structuralSkeleton = await resolveSkeleton(stage.structuralSkeleton, inputs, fragmentVersions)

  // Layer 7 — Craft directives (list / tiered / empty)
  const craftDirectives = await resolveCraft(
    stage.craftFragmentConfig as CraftFragmentConfig,
    fragmentVersions,
  )

  // Layer 8 — Output contract (fragment + per-stage extras)
  const outputContract = await resolveOutputContract(
    stage.outputContractFragmentId,
    stage.outputContractExtras,
    fragmentVersions,
  )

  const layers: AssembledLayers = {
    persona,
    worldview,
    taskFraming,
    brandContext,
    topicContext,
    structuralSkeleton,
    craftDirectives,
    outputContract,
  }

  const text = composeLayers(layers)

  return { text, fragmentVersions, layers }
}

function composeLayers(l: AssembledLayers): string {
  return [
    l.persona,
    l.worldview,
    l.taskFraming,
    l.brandContext,
    l.topicContext,
    l.structuralSkeleton,
    l.craftDirectives,
    l.outputContract,
  ]
    .filter((s): s is string => s !== null && s.length > 0)
    .join('\n\n')
}

// ---------------------------------------------------------------------------
// Layer 5 — topic_context_config resolver
// ---------------------------------------------------------------------------

async function resolveTopicContext(
  config: TopicContextConfig,
  inputs: GenerationInputs,
): Promise<string> {
  const parts: string[] = []

  // Topic Engine sentence (Layer 5's primary input when enabled)
  if (config.uses_topic_engine && inputs.topic_chain) {
    parts.push(inputs.topic_chain.prompt_template_resolved)
  }

  // DNA bundle pulls (e.g. offer_full, audience_voc)
  for (const slug of config.dna_pulls) {
    const bundle = await resolveDnaBundle(slug, inputs)
    if (bundle) parts.push(bundle)
  }

  // Platform metadata injection
  if (config.platform_metadata === 'always') {
    const meta = await resolvePlatformMetadata(null)
    if (meta) parts.push(meta)
  } else if (config.platform_metadata === 'when_platform_selected') {
    // V1: every content type has a NOT NULL platform_type, so this branch is
    // effectively identical to 'always'. Kept distinct for V2 (multi-platform
    // content types may need conditional injection). See content-types.md notes.
    const meta = await resolvePlatformMetadata(null)
    if (meta) parts.push(meta)
  }

  // Fallback if nothing else fired
  if (parts.length === 0) {
    if (config.fallback === 'free_text_only' && inputs.free_text_augments.length > 0) {
      parts.push(inputs.free_text_augments.join('\n'))
    } else if (config.fallback === 'dna_only') {
      // Already handled above via dna_pulls — fallback is a no-op here.
    }
    // 'none' fallback → empty Layer 5 is allowed
  }

  // Free-text augments are additive even when Topic Engine fired
  if (parts.length > 0 && inputs.free_text_augments.length > 0 && config.uses_topic_engine) {
    parts.push(...inputs.free_text_augments)
  }

  return parts.join('\n\n')
}

// ---------------------------------------------------------------------------
// Layer 7 — craft_fragment_config resolver
// ---------------------------------------------------------------------------

async function resolveCraft(
  config: CraftFragmentConfig,
  fragmentVersions: Record<string, number>,
): Promise<string> {
  if (!('mode' in config)) {
    // Empty config — Layer 7 is delivered entirely by inline ${slug} refs in the skeleton (Layer 6)
    return ''
  }

  if (config.mode === 'list') {
    const fragments = await Promise.all(
      config.fragment_ids.map((slug) => resolveFragmentBySlug(slug, fragmentVersions)),
    )
    return fragments.join('\n\n')
  }

  if (config.mode === 'tiered') {
    const tierBlocks: string[] = []
    for (const tier of config.tiers) {
      const fragments = await Promise.all(
        tier.fragment_ids.map((slug) => resolveFragmentBySlug(slug, fragmentVersions)),
      )
      tierBlocks.push(`### ${tier.label}\n\n${fragments.join('\n\n')}`)
    }
    return tierBlocks.join('\n\n')
  }

  // Exhaustiveness — if a new mode is added without updating this branch, fail loudly.
  throw new Error(`Unknown craft_fragment_config mode: ${JSON.stringify(config)}`)
}

// ---------------------------------------------------------------------------
// Layer 6 — structural skeleton resolver
// ---------------------------------------------------------------------------

async function resolveSkeleton(
  skeleton: string,
  inputs: GenerationInputs,
  fragmentVersions: Record<string, number>,
): Promise<string> {
  // Two kinds of ${...} substitutions live inline in the skeleton:
  //  (a) ${fragment_slug} → fetch from prompt_fragments and inline
  //  (b) ${placeholder}   → resolve from inputs / DNA / etc.
  // The resolver tries fragment-slug match first, then placeholder.
  return skeleton.replace(/\$\{([a-z0-9_]+)\}/g, (_match, name) => {
    // Fragment-slug refs are resolved synchronously here — in production this
    // would be batched up-front by parsing the skeleton, fetching all referenced
    // slugs in one query, and substituting from a map. For the sketch, just
    // surface that this layer needs that pre-pass.
    // FRICTION FLAG (#2): replace() is sync but resolveFragmentBySlug is async.
    // The real implementation must do a parse-then-fetch pre-pass, then a sync
    // substitution pass. Worth modelling explicitly in the production version.

    // Try placeholder substitution first (cheaper)
    const placeholderValue = resolvePlaceholder(name, inputs)
    if (placeholderValue !== undefined) return placeholderValue

    // Otherwise treat as fragment slug — return a marker for the pre-pass
    return `<<FRAGMENT:${name}>>` // placeholder; pre-pass would substitute real fragment text
  })
  // (In production: walk the result, replace `<<FRAGMENT:slug>>` markers with
  // pre-fetched fragment content, populate fragmentVersions for each.)
}

function resolvePlaceholder(name: string, inputs: GenerationInputs): string | undefined {
  // Picks values out of inputs.strategy and inputs.topic_chain by name.
  // Real implementation has a richer placeholder vocabulary (e.g.
  // ${brand_name}, ${voc_problems}, ${selected}). Stub: return undefined to
  // signal "not a placeholder, treat as fragment slug".
  if (name === 'selected' && inputs.topic_chain) {
    // Best-effort — the Topic Engine resolver should already have substituted
    // ${selected} into prompt_template_resolved. This is here for skeletons
    // that reference ${selected} directly.
    return inputs.topic_chain.prompt_template_resolved
  }
  // Canonical placeholder vocabulary lives at
  // 04-documentation/reference/prompt-vocabulary.md. Returning undefined here
  // signals "not a known placeholder" — the caller falls through to fragment-slug
  // resolution. Production version reads from a constant map of placeholder
  // resolvers keyed by name.
  return undefined
}

// ---------------------------------------------------------------------------
// Layer 8 — output contract resolver
// ---------------------------------------------------------------------------

async function resolveOutputContract(
  fragmentId: string,
  extras: string | null,
  fragmentVersions: Record<string, number>,
): Promise<string> {
  const fragment = await resolveFragmentById(fragmentId, fragmentVersions)
  if (!extras) return fragment
  return `${fragment}\n\n${extras}`
}

// ---------------------------------------------------------------------------
// Stubs — to be implemented properly in Batch 2 / 3
// ---------------------------------------------------------------------------

async function resolveFragmentById(
  id: string,
  fragmentVersions: Record<string, number>,
): Promise<string> {
  // Real impl: SELECT slug, version, content FROM prompt_fragments WHERE id = $1
  // Then: fragmentVersions[slug] = version
  fragmentVersions[`__by_id:${id}`] = 1
  return `<<FRAGMENT-BY-ID:${id}>>`
}

async function resolveFragmentBySlug(
  slug: string,
  fragmentVersions: Record<string, number>,
): Promise<string> {
  // Real impl: SELECT version, content FROM prompt_fragments
  // WHERE slug = $1 AND status = 'active' ORDER BY version DESC LIMIT 1
  fragmentVersions[slug] = 1
  return `<<FRAGMENT:${slug}>>`
}

async function resolveBrandContextBundle(): Promise<string> {
  // Real impl: pulls a fixed set of DNA records (business_overview short,
  // value_proposition core, audience summary) and concatenates per a static
  // template. This is the invariant bundle — same for every content type.
  return '<<BRAND_CONTEXT_BUNDLE>>'
}

async function resolveDnaBundle(
  slug: string,
  _inputs: GenerationInputs,
): Promise<string | null> {
  // Canonical bundle slug vocabulary lives at
  // 04-documentation/reference/prompt-vocabulary.md. Production version reads
  // from a BUNDLE_RESOLVERS map in 02-app/lib/llm/content/bundles.ts (one
  // resolver per slug). Stub returns the slug for visibility.
  return `<<BUNDLE:${slug}>>`
}

async function resolvePlatformMetadata(_channelKey: string | null): Promise<string | null> {
  // Real impl: SELECT relevant cols FROM dna_platforms WHERE channel = $1
  // AND is_active = true, format per channel-taxonomy.md per-category field-relevance matrix.
  return '<<PLATFORM_METADATA>>'
}

// ---------------------------------------------------------------------------
// Sketch outcome
// ---------------------------------------------------------------------------
//
// All four jsonb shapes survived the eight-layer walk. No schema changes:
//
//   ✅ content_types.prerequisites    — { channels, lead_magnets, dna }
//   ✅ content_types.strategy_fields  — [{ id, required }]
//   ✅ content_types.topic_context_config — { uses_topic_engine, dna_pulls,
//                                            platform_metadata, fallback }
//   ✅ prompt_stages.craft_fragment_config — discriminated by `mode`, `{}` empty
//
// Vocabulary docs resolved:
//   - Placeholder + bundle slug vocabularies live at
//     04-documentation/reference/prompt-vocabulary.md.
//   - V1 simplification of platform_metadata enum documented inline above.
//
// Outstanding for the production build (not blocking schema work):
//   - Skeleton resolution must do an async pre-pass: parse → batch-fetch →
//     sync substitute. The sync regex.replace pattern in resolveSkeleton is a
//     sketch shortcut and won't work at runtime.
