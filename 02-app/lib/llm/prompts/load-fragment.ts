import { readFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { SourceType, LensId } from '@/lib/types/lens'
import { NON_LENSABLE_SOURCE_TYPES } from '@/lib/types/lens'

// ---------------------------------------------------------------------------
// Disk-based prompt fragment loader (ADR-009 / INP-12)
//
// Fragments live in 01-design/schemas/ as markdown files with a "## Prompt fragment"
// section. This module reads them at request time so the user can edit prompt content
// without code changes.
//
// Path discovery: walks up from this file to find a directory containing
// `01-design/schemas/`. Cached on first hit. The path is computed once per process.
// ---------------------------------------------------------------------------

const FRAGMENT_SECTION_HEADING = '## Prompt fragment'
const FRAGMENT_NEXT_HEADING = /^##\s+/m  // any subsequent ## heading ends the section

let cachedSchemasRoot: string | null = null

/** Walk up from cwd / module file path to find the repo's `01-design/schemas/` directory. */
function resolveSchemasRoot(): string {
  if (cachedSchemasRoot) return cachedSchemasRoot

  // Try common parents — production builds copy schemas/ into the Next.js server bundle's
  // root, dev runs from 02-app/. Walk up from process.cwd().
  const candidates: string[] = []
  let dir = process.cwd()
  for (let i = 0; i < 6; i++) {
    candidates.push(join(dir, '01-design', 'schemas'))
    candidates.push(join(dir, '..', '01-design', 'schemas'))
    dir = join(dir, '..')
  }

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      cachedSchemasRoot = candidate
      return candidate
    }
  }

  throw new Error(
    `Could not locate 01-design/schemas/ directory. Searched relative to cwd=${process.cwd()}. ` +
    `Set BIGBRAIN_SCHEMAS_ROOT env var to override.`,
  )
}

/** Extract the body of the "## Prompt fragment" section from a markdown file. */
function extractPromptFragment(markdown: string, filename: string): string {
  const headingIdx = markdown.indexOf(FRAGMENT_SECTION_HEADING)
  if (headingIdx === -1) {
    throw new Error(`Fragment file ${filename} is missing the "${FRAGMENT_SECTION_HEADING}" section.`)
  }

  // Move past the heading line itself.
  const afterHeading = markdown.slice(headingIdx + FRAGMENT_SECTION_HEADING.length)
  const newlineIdx = afterHeading.indexOf('\n')
  const body = newlineIdx === -1 ? '' : afterHeading.slice(newlineIdx + 1)

  // Cut off at the next `## ` heading.
  const nextHeadingMatch = body.match(FRAGMENT_NEXT_HEADING)
  const fragment = nextHeadingMatch ? body.slice(0, nextHeadingMatch.index) : body
  const trimmed = fragment.trim()
  if (trimmed.length === 0) {
    throw new Error(`Fragment file ${filename} has an empty "${FRAGMENT_SECTION_HEADING}" section.`)
  }
  return trimmed
}

async function readFragmentFile(absPath: string, label: string): Promise<string> {
  if (!existsSync(absPath)) {
    throw new Error(`Fragment file not found: ${absPath} (${label}). Run \`npm run check:fragments\` to validate registration.`)
  }
  const content = await readFile(absPath, 'utf8')
  return extractPromptFragment(content, label)
}

/** Path on disk for a given source-type fragment. */
export function pathForSourceTypeFragment(sourceType: SourceType): string {
  return join(resolveSchemasRoot(), 'extraction-schemas', `${sourceType}.md`)
}

/** Path on disk for a given lens prompt. */
export function pathForLensPrompt(lens: LensId): string {
  return join(resolveSchemasRoot(), 'lens-prompts', `${lens}.md`)
}

/** Path for the universal base extraction prompt. */
export function pathForBasePrompt(): string {
  return join(resolveSchemasRoot(), 'extraction-schemas', '_base.md')
}

/** Load the universal base extraction prompt fragment. */
export async function loadBasePrompt(): Promise<string> {
  return readFragmentFile(pathForBasePrompt(), '_base.md')
}

/** Load a source-type fragment by id. Throws for `dataset` (no fragment file exists). */
export async function loadSourceTypeFragment(sourceType: SourceType): Promise<string> {
  if (NON_LENSABLE_SOURCE_TYPES.includes(sourceType)) {
    throw new Error(
      `Source type '${sourceType}' has no extraction-schema fragment (per ADR-009 amendment). ` +
      `Datasets bypass the lens path. Use kg-ingest-creator (SKL-12) instead.`,
    )
  }
  return readFragmentFile(pathForSourceTypeFragment(sourceType), `${sourceType}.md`)
}

/** Load a lens prompt fragment by id. */
export async function loadLensPrompt(lens: LensId): Promise<string> {
  return readFragmentFile(pathForLensPrompt(lens), `${lens}.md`)
}

/** Discover which (sourceType, lens) fragment files exist on disk.
 *  Used by check-fragments.ts to assert coverage. */
export function fragmentFileChecks(): {
  base: { path: string; exists: boolean }
  sourceTypes: { sourceType: SourceType; path: string; exists: boolean; required: boolean }[]
  lenses: { lens: LensId; path: string; exists: boolean }[]
} {
  return {
    base: { path: pathForBasePrompt(), exists: existsSync(pathForBasePrompt()) },
    sourceTypes: (Object.values<SourceType>(
      // pull from the const tuple via a typed array literal
      // (kept inline to avoid a circular import on the constants module)
      [
        'client-interview', 'coaching-call', 'peer-conversation', 'supplier-conversation',
        'accountability-checkin', 'meeting-notes', 'internal-notes', 'research-document',
        'dataset', 'pitch-deck', 'report', 'collection', 'content-idea',
      ] as const,
    )).map((sourceType) => ({
      sourceType,
      path: pathForSourceTypeFragment(sourceType),
      exists: existsSync(pathForSourceTypeFragment(sourceType)),
      required: !NON_LENSABLE_SOURCE_TYPES.includes(sourceType),
    })),
    lenses: ([
      'surface-extraction', 'self-reflective', 'project-synthesis', 'pattern-spotting',
      'catch-up', 'decision-support', 'content-ideas',
    ] as const).map((lens) => ({
      lens,
      path: pathForLensPrompt(lens),
      exists: existsSync(pathForLensPrompt(lens)),
    })),
  }
}
