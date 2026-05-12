import type { SourceType, LensId } from '@/lib/types/lens'
import { LensNotApplicableError, NON_LENSABLE_SOURCE_TYPES } from '@/lib/types/lens'
import {
  loadBasePrompt, loadSourceTypeFragment, loadLensPrompt,
  pathForBasePrompt, pathForSourceTypeFragment, pathForLensPrompt,
} from './load-fragment'

// ---------------------------------------------------------------------------
// Prompt composer (ADR-009 §"Prompt composition")
//
// composeSystemPrompt({ sourceType, lens }) → [_base.md] + [source-type fragment]
//                                             + [lens fragment], joined with blank lines.
// Throws LensNotApplicableError for `sourceType === 'dataset'` (or any future
// non-lensable source type).
//
// Also reports the file paths used so processing_runs.promptFragmentsUsed can record
// provenance for the run.
// ---------------------------------------------------------------------------

export interface ComposedPrompt {
  /** The full system prompt text. */
  text: string
  /** Provenance — paths to each fragment file composed in. Stored on
   *  processing_runs.promptFragmentsUsed for audit. */
  fragmentsUsed: Array<{ path: string; role: 'base' | 'source-type' | 'lens' }>
}

export async function composeSystemPrompt({
  sourceType,
  lens,
}: {
  sourceType: SourceType
  lens: LensId
}): Promise<ComposedPrompt> {
  if (NON_LENSABLE_SOURCE_TYPES.includes(sourceType)) {
    throw new LensNotApplicableError(sourceType, lens)
  }

  const [base, sourceTypeFragment, lensFragment] = await Promise.all([
    loadBasePrompt(),
    loadSourceTypeFragment(sourceType),
    loadLensPrompt(lens),
  ])

  const text = [base, sourceTypeFragment, lensFragment].join('\n\n')

  return {
    text,
    fragmentsUsed: [
      { path: relativeFragmentPath(pathForBasePrompt()), role: 'base' },
      { path: relativeFragmentPath(pathForSourceTypeFragment(sourceType)), role: 'source-type' },
      { path: relativeFragmentPath(pathForLensPrompt(lens)), role: 'lens' },
    ],
  }
}

/** Trim absolute path down to `01-design/schemas/...` so provenance records stay portable. */
function relativeFragmentPath(absPath: string): string {
  const marker = '01-design/schemas/'
  const idx = absPath.indexOf(marker)
  return idx === -1 ? absPath : absPath.slice(idx)
}
