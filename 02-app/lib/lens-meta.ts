import { LENSES, NON_LENSABLE_SOURCE_TYPES, type LensId, type SourceType } from '@/lib/types/lens'

// ---------------------------------------------------------------------------
// Lens picker metadata + per-lens applicability rules (INP-12 Pass 1).
// Drives the lens picker modal tiles. The applicability rules mirror the
// disabled-state table in 01-design/wireframes/INP-12-pass1-layout.md.
// ---------------------------------------------------------------------------

export interface LensMeta {
  id: LensId
  name: string
  description: string
  caveat?: string
  /** Lens-specific input form id, if any. v1 only 'decision-support' has an input. */
  inputForm?: 'decision-text'
}

export const LENS_META: Record<LensId, LensMeta> = {
  'surface-extraction': {
    id: 'surface-extraction',
    name: 'Surface extraction',
    description: 'Pulls discrete items — ideas, concepts, people, organisations, methodologies, quotes — straight into the graph.',
    caveat: 'Default extraction.',
  },
  'pattern-spotting': {
    id: 'pattern-spotting',
    name: 'Pattern spotting',
    description: 'Recurring themes, convergences, divergences across a set. Best with 2+ sources on a related topic.',
    caveat: 'Needs 2+ sources.',
  },
  'self-reflective': {
    id: 'self-reflective',
    name: 'Self-reflective',
    description: 'Realisations, shifts in thinking, recurring blockers, commitments, energy patterns. Coaching and accountability over time.',
  },
  'project-synthesis': {
    id: 'project-synthesis',
    name: 'Project synthesis',
    description: 'Methodology, what worked, what didn’t, reusable patterns, case-study narrative, content angles.',
  },
  'catch-up': {
    id: 'catch-up',
    name: 'Catch-up',
    description: 'What’s new since last time? What changed? Who said what? Returning to a project or person after a gap.',
    caveat: 'Needs 2+ sources.',
  },
  'decision-support': {
    id: 'decision-support',
    name: 'Decision support',
    description: 'Interrogate the corpus against an open decision. Surfaces evidence for and against, gaps, suggested next steps.',
    inputForm: 'decision-text',
  },
  'content-ideas': {
    id: 'content-ideas',
    name: 'Content ideas',
    description: 'Hooks, angles, formats, audience hypotheses — mining the corpus for what could become content.',
  },
}

export const LENS_ORDER: LensId[] = [
  'surface-extraction',
  'pattern-spotting',
  'self-reflective',
  'project-synthesis',
  'catch-up',
  'decision-support',
  'content-ideas',
]

export interface LensAvailability {
  available: boolean
  reason?: string
}

/** Per-lens applicability rules. `sources` is the set picked for the run. */
export function isLensAvailable(lens: LensId, sources: { id: string; sourceType: SourceType }[]): LensAvailability {
  const nonLensable = sources.filter((s) => (NON_LENSABLE_SOURCE_TYPES as readonly SourceType[]).includes(s.sourceType))
  const lensable = sources.filter((s) => !(NON_LENSABLE_SOURCE_TYPES as readonly SourceType[]).includes(s.sourceType))

  if (lensable.length === 0) {
    return { available: false, reason: 'Datasets bypass lens processing.' }
  }

  switch (lens) {
    case 'surface-extraction':
      return { available: true }
    case 'pattern-spotting':
      if (lensable.length < 2) return { available: false, reason: 'Needs 2 or more lensable sources.' }
      return { available: true }
    case 'catch-up':
      if (lensable.length < 2) return { available: false, reason: 'Needs 2 or more lensable sources.' }
      return { available: true }
    case 'self-reflective':
    case 'project-synthesis':
    case 'decision-support':
    case 'content-ideas':
      return { available: true }
    default:
      return { available: true }
  }

  // (nonLensable is referenced indirectly through `lensable` — left here for future warnings.)
  void nonLensable
}

/** True when every source is a non-lensable type (datasets only). */
export function allSourcesNonLensable(sources: { sourceType: SourceType }[]): boolean {
  if (sources.length === 0) return false
  return sources.every((s) => (NON_LENSABLE_SOURCE_TYPES as readonly SourceType[]).includes(s.sourceType))
}

void LENSES
