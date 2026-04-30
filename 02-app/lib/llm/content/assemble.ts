// Eight-layer prompt assembler — OUT-02 Phase 2 implementation (ADR-006).
//
// Walks the eight layers in order, resolves all ${...} substitutions, and
// returns the final prompt text plus an audit-ready breakdown. Every fragment
// version actually used is recorded for persistence on
// generation_runs.fragment_versions.
//
// The eight layers (ADR-006):
//   1. Persona              — prompt_stages.persona_fragment_id
//   2. Worldview            — prompt_stages.worldview_fragment_id (nullable)
//   3. Task framing         — prompt_stages.task_framing (text)
//   4. Brand context        — invariant; assembled from DNA placeholders
//   5. Topic context        — content_types.topic_context_config drives it
//   6. Structural skeleton  — prompt_stages.structural_skeleton
//   7. Craft directives     — prompt_stages.craft_fragment_config
//   8. Output contract      — prompt_stages.output_contract_fragment_id +
//                             optional output_contract_extras
//
// Substitution model (per Ellie's spec — two fragment expansion passes):
//   pass 1: substitute ${fragment_slug} with fragment content
//   pass 2: substitute ${fragment_slug} again, picking up nested fragment refs
//   pass 3: substitute ${placeholder} from inputs / DNA / settings
//
// Anything still matching ${...} after pass 3 is unresolved → throw.
// Fail-closed by design (vocab doc, "Resolution rules" section).

import type { ContentType, PromptStage } from '@/lib/db/schema'
import { BUNDLE_RESOLVERS, isKnownBundleSlug } from './bundles'
import { type FragmentVersionsMap, getFragmentById, getFragmentsBySlugs } from './fragments'
import {
  type AssemblerCtx,
  createAssemblerCtx,
  isKnownPlaceholder,
  resolvePlaceholder,
} from './placeholders'
import type {
  CraftFragmentConfig,
  GenerationInputs,
  TopicContextConfig,
} from './types'

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export type AssembleArgs = {
  brandId: string
  contentType: ContentType
  stage: PromptStage
  inputs: GenerationInputs
}

export type AssembledPrompt = {
  /** Final prompt sent to the model. */
  text: string
  /** Map of fragment slug → version used. Persist on generation_runs.fragment_versions. */
  fragmentVersions: FragmentVersionsMap
  /** Layer-by-layer breakdown for audit / debug. */
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
 * Walks the eight layers, resolves every ${...}, returns final prompt.
 * Throws on unresolved tokens, missing fragments, or missing required DNA.
 */
export async function assemble(args: AssembleArgs): Promise<AssembledPrompt> {
  const { brandId, contentType, stage, inputs } = args
  const versions: FragmentVersionsMap = {}
  const ctx = createAssemblerCtx(
    brandId,
    inputs,
    {
      slug: contentType.slug,
      platformType: contentType.platformType,
      formatType: contentType.formatType,
      subtype: contentType.subtype,
    },
    {
      defaultMinChars: contentType.defaultMinChars,
      defaultMaxChars: contentType.defaultMaxChars,
    },
  )

  // Layer 1 — Persona (FK ref, pinned to a specific fragment row)
  const personaFrag = await getFragmentById(stage.personaFragmentId, versions)

  // Layer 2 — Worldview (optional FK ref)
  const worldviewFrag = stage.worldviewFragmentId
    ? await getFragmentById(stage.worldviewFragmentId, versions)
    : null

  // Layer 8 — Output contract fragment (FK ref)
  const outputContractFrag = await getFragmentById(stage.outputContractFragmentId, versions)

  // Now resolve all four templated layers (3, 6, 7, 8-extras) — each may carry
  // ${fragment_slug} refs that we want to batch-fetch in one round-trip.
  const taskFramingTemplate = stage.taskFraming
  const skeletonTemplate = stage.structuralSkeleton
  const outputExtrasTemplate = stage.outputContractExtras ?? ''
  const craftTemplate = await composeCraftTemplate(stage.craftFragmentConfig as CraftFragmentConfig)

  // Pass 1 prep: gather all fragment slugs referenced by these templates +
  // by the FK fragments themselves (their content may contain refs too).
  const slugsToFetch = new Set<string>()
  for (const tpl of [
    taskFramingTemplate,
    skeletonTemplate,
    outputExtrasTemplate,
    craftTemplate,
    personaFrag.content,
    worldviewFrag?.content ?? '',
    outputContractFrag.content,
  ]) {
    for (const t of extractTokens(tpl)) {
      if (!isKnownPlaceholder(t)) slugsToFetch.add(t)
    }
  }

  let fragmentMap = await getFragmentsBySlugs(Array.from(slugsToFetch), versions)

  // Pass 1 + 2: fragment-slug substitution, twice, to expand one level of
  // nested refs. After pass 1 we may discover NEW slugs in the expanded text
  // (fragments that themselves reference other fragments) — fetch those too,
  // then run pass 2.
  const pass1 = (s: string): string => substituteFragments(s, fragmentMap)

  const allTexts = [
    taskFramingTemplate,
    skeletonTemplate,
    outputExtrasTemplate,
    craftTemplate,
    personaFrag.content,
    worldviewFrag?.content ?? '',
    outputContractFrag.content,
  ].map(pass1)

  // Discover any new fragment refs introduced by pass 1 expansions.
  const newSlugs = new Set<string>()
  for (const s of allTexts) {
    for (const t of extractTokens(s)) {
      if (!isKnownPlaceholder(t) && !fragmentMap.has(t)) newSlugs.add(t)
    }
  }
  if (newSlugs.size > 0) {
    const more = await getFragmentsBySlugs(Array.from(newSlugs), versions)
    fragmentMap = new Map([...fragmentMap, ...more])
  }

  const pass2 = (s: string): string => substituteFragments(s, fragmentMap)
  const [
    taskFramingP2,
    skeletonP2,
    outputExtrasP2,
    craftP2,
    personaP2,
    worldviewP2,
    outputContractP2,
  ] = allTexts.map(pass2)

  // Anything still matching ${slug} that's not a known placeholder is a
  // missing fragment beyond depth-2 nesting — fail-closed.
  for (const s of [
    taskFramingP2,
    skeletonP2,
    outputExtrasP2,
    craftP2,
    personaP2,
    worldviewP2,
    outputContractP2,
  ]) {
    for (const t of extractTokens(s)) {
      if (!isKnownPlaceholder(t)) {
        throw new Error(
          `Unresolved fragment ref \${${t}} after 2 expansion passes — nesting too deep or fragment missing`,
        )
      }
    }
  }

  // Pass 3: placeholder substitution. Async because some placeholders read DNA.
  const persona = await substitutePlaceholders(personaP2, ctx)
  const worldview = worldviewFrag ? await substitutePlaceholders(worldviewP2, ctx) : null
  const taskFraming = await substitutePlaceholders(taskFramingP2, ctx)
  const structuralSkeleton = await substitutePlaceholders(skeletonP2, ctx)
  const craftDirectives = await substitutePlaceholders(craftP2, ctx)
  const outputContractFragText = await substitutePlaceholders(outputContractP2, ctx)
  const outputExtrasText = outputExtrasP2 ? await substitutePlaceholders(outputExtrasP2, ctx) : ''
  const outputContract = outputExtrasText
    ? `${outputContractFragText}\n\n${outputExtrasText}`
    : outputContractFragText

  // Layer 4 — Brand context (invariant per call). Assembled from a fixed
  // template that pulls Group B placeholders only. Lives here, not on the
  // stage, per ADR-006 ("brand context is uniform across every content type").
  const brandContext = await assembleBrandContext(ctx)

  // Layer 5 — Topic context (config-driven; depends on inputs + bundles).
  const topicContext = await assembleTopicContext(
    contentType.topicContextConfig as TopicContextConfig,
    ctx,
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
  return { text, fragmentVersions: versions, layers }
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
// Substitution primitives
// ---------------------------------------------------------------------------

const TOKEN_RE = /\$\{([a-z0-9_]+)\}/g

function extractTokens(s: string): string[] {
  const out: string[] = []
  for (const m of s.matchAll(TOKEN_RE)) out.push(m[1])
  return out
}

function substituteFragments(
  s: string,
  fragmentMap: Map<string, { content: string }>,
): string {
  return s.replace(TOKEN_RE, (match, name: string) => {
    if (isKnownPlaceholder(name)) return match // leave for pass 3
    const frag = fragmentMap.get(name)
    if (!frag) return match // leave for pass 2 retry / final error check
    return frag.content
  })
}

async function substitutePlaceholders(s: string, ctx: AssemblerCtx): Promise<string> {
  // Collect all unique placeholder tokens, resolve in parallel, then sync replace.
  const tokens = Array.from(new Set(extractTokens(s)))
  const resolutions = new Map<string, string>()
  await Promise.all(
    tokens.map(async (name) => {
      if (!isKnownPlaceholder(name)) {
        throw new Error(`Unknown placeholder \${${name}} in prompt — not in vocabulary`)
      }
      resolutions.set(name, await resolvePlaceholder(name, ctx))
    }),
  )
  return s.replace(TOKEN_RE, (_match, name: string) => resolutions.get(name) ?? '')
}

// ---------------------------------------------------------------------------
// Layer 7 — craft directives composer (no substitution yet; just template)
// ---------------------------------------------------------------------------

async function composeCraftTemplate(config: CraftFragmentConfig): Promise<string> {
  // Mode 'list'   — concatenate fragments by slug.
  // Mode 'tiered' — group fragments under tier labels.
  // Empty {}      — Layer 7 entirely delivered via inline ${slug} refs in Layer 6.
  if (!('mode' in config)) return ''

  if (config.mode === 'list') {
    return config.slugs.map((s) => `\${${s}}`).join('\n\n')
  }

  if (config.mode === 'tiered') {
    return Object.entries(config.tiers)
      .map(([label, slugs]) => `### ${label}\n\n${slugs.map((s) => `\${${s}}`).join('\n\n')}`)
      .join('\n\n')
  }

  throw new Error(`Unknown craft_fragment_config mode: ${JSON.stringify(config)}`)
}

// ---------------------------------------------------------------------------
// Layer 4 — Brand context (invariant bundle)
// ---------------------------------------------------------------------------

async function assembleBrandContext(ctx: AssemblerCtx): Promise<string> {
  // Fixed template; same shape every call. Pulls Group B placeholders that
  // resolve to DNA business overview + tone-of-voice. Required fields fail
  // closed — a brand without business_overview can't generate content.
  const template = `***BRAND CONTEXT***

\${business_context_short}

Tone of voice: \${tov_core}`
  return substitutePlaceholders(template, ctx)
}

// ---------------------------------------------------------------------------
// Layer 5 — Topic context (config-driven)
// ---------------------------------------------------------------------------

async function assembleTopicContext(
  config: TopicContextConfig,
  ctx: AssemblerCtx,
): Promise<string> {
  const parts: string[] = []

  // Topic Engine sentence is the primary input when enabled.
  if (config.uses_topic_engine && ctx.inputs.topic_chain) {
    parts.push(ctx.inputs.topic_chain.prompt_template_resolved)
  }

  // DNA bundle pulls — resolved in declared order.
  for (const slug of config.dna_pulls ?? []) {
    if (!isKnownBundleSlug(slug)) {
      throw new Error(`Unknown bundle slug "${slug}" in topic_context_config.dna_pulls`)
    }
    const block = await BUNDLE_RESOLVERS[slug](ctx)
    if (block) parts.push(block)
  }

  // Platform metadata injection — V1 always-or-when-selected collapse to the
  // same branch (every V1 content type has NOT NULL platformType). Deferred
  // until bundles ship; nothing to add here for now.

  // Free-text augments are additive.
  if (ctx.inputs.free_text_augments && ctx.inputs.free_text_augments.length > 0) {
    parts.push(...ctx.inputs.free_text_augments)
  }

  // Fallback when nothing fired.
  if (parts.length === 0) {
    if (config.fallback === 'free_text_only') {
      // Already captured above; an empty result here just means user gave nothing.
    }
    // 'dna_only' / 'none' / null — empty Layer 5 is allowed.
  }

  return parts.join('\n\n')
}
