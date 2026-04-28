import { randomUUID } from 'crypto'
import { MODELS, generateObjectWithFallback } from '@/lib/llm/client'
import { SYSTEM_PROMPTS } from '@/lib/llm/system-prompts'
import {
  extractionResultSchema,
  type InputMetadata,
  type ExtractionResult,
} from '@/lib/types/processing'

// Text over this character count is chunked into overlapping segments.
const CHUNK_SIZE = 28_000
const CHUNK_OVERLAP = 2_000

/**
 * Extract structured knowledge from plain text.
 * Calls the LLM with generateObject — nothing is written to storage.
 * Returns an ExtractionResult containing the metadata and all extracted items.
 *
 * For long texts (>28k chars), splits into overlapping chunks and merges results.
 */
export async function extractFromText(
  text: string,
  metadata: InputMetadata
): Promise<ExtractionResult> {
  const trimmed = text.trim()

  if (trimmed.length <= CHUNK_SIZE) {
    const extraction = await runExtraction(trimmed)
    return { metadata, text: trimmed, extraction }
  }

  // Long text — chunk and merge
  const chunks = chunkText(trimmed, CHUNK_SIZE, CHUNK_OVERLAP)
  const results = await Promise.all(chunks.map((chunk) => runExtraction(chunk)))

  const merged = mergeExtractions(results)
  return { metadata, text: trimmed, extraction: merged }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function runExtraction(text: string) {
  const t0 = Date.now()
  const { object } = await generateObjectWithFallback<unknown>({
    model: MODELS.geminiFlash,
    system: SYSTEM_PROMPTS.processing,
    prompt: text,
    schema: extractionResultSchema,
  }, { tag: 'INP-03 extract' })

  // Ensure stable ids across chunks by prefixing with a short random token
  console.log(`[extractFromText] LLM call took ${Date.now() - t0}ms (${text.length} chars)`)
  const prefix = randomUUID().slice(0, 8)
  return prefixIds(object as Parameters<typeof prefixIds>[0], prefix)
}

function prefixIds(
  extraction: ReturnType<typeof extractionResultSchema.parse>,
  prefix: string
) {
  return {
    ideas: extraction.ideas.map((i) => ({ ...i, id: `${prefix}-${i.id}` })),
    concepts: extraction.concepts.map((c) => ({ ...c, id: `${prefix}-${c.id}` })),
    people: extraction.people.map((p) => ({ ...p, id: `${prefix}-${p.id}` })),
    organisations: extraction.organisations.map((o) => ({ ...o, id: `${prefix}-${o.id}` })),
    stories: extraction.stories.map((s) => ({ ...s, id: `${prefix}-${s.id}` })),
    techniques: extraction.techniques.map((t) => ({ ...t, id: `${prefix}-${t.id}` })),
    contentAngles: extraction.contentAngles.map((a) => ({ ...a, id: `${prefix}-${a.id}` })),
  }
}

function mergeExtractions(
  results: ReturnType<typeof prefixIds>[]
) {
  return {
    ideas: results.flatMap((r) => r.ideas),
    concepts: dedupeByName(results.flatMap((r) => r.concepts)),
    people: dedupeByName(results.flatMap((r) => r.people)),
    organisations: dedupeByName(results.flatMap((r) => r.organisations)),
    stories: results.flatMap((r) => r.stories),
    techniques: dedupeByName(results.flatMap((r) => r.techniques)),
    contentAngles: results.flatMap((r) => r.contentAngles),
  }
}

function dedupeByName<T extends { name: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    const key = item.name.toLowerCase().trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function chunkText(text: string, size: number, overlap: number): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    chunks.push(text.slice(start, start + size))
    start += size - overlap
  }
  return chunks
}
