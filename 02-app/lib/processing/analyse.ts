import { generateObject } from 'ai'
import { MODELS } from '@/lib/llm/client'
import { SYSTEM_PROMPTS } from '@/lib/llm/system-prompts'
import {
  batchAnalysisSchema,
  reflectiveAnalysisSchema,
  projectSynthesisSchema,
  type BatchAnalysis,
  type ReflectiveAnalysis,
  type ProjectSynthesis,
  type SourceForProcessing,
} from '@/lib/types/processing'

/**
 * Build a combined prompt from multiple sources.
 * Each source is prefixed with its title and date for reference.
 */
function buildCorpusPrompt(sources: SourceForProcessing[], preamble?: string): string {
  const parts: string[] = []
  if (preamble) parts.push(preamble)

  for (const source of sources) {
    const dateStr = source.documentDate ?? 'undated'
    parts.push(`--- SOURCE: ${source.title} (${dateStr}) ---`)
    parts.push(source.extractedText)
    parts.push('')
  }

  return parts.join('\n\n')
}

/**
 * Mode 2: Batch analysis — cross-cutting patterns across a set of sources.
 */
export async function runBatchAnalysis(
  sources: SourceForProcessing[],
): Promise<BatchAnalysis> {
  const t0 = Date.now()
  const prompt = buildCorpusPrompt(sources, `Analyse the following ${sources.length} source documents as a corpus.`)

  const { object } = await generateObject({
    model: MODELS.geminiPro,
    system: SYSTEM_PROMPTS.batchAnalysis,
    prompt,
    schema: batchAnalysisSchema,
  })

  console.log(`[runBatchAnalysis] LLM call took ${Date.now() - t0}ms (${sources.length} sources, ${prompt.length} chars)`)
  return object
}

/**
 * Mode 3: Reflective analysis — longitudinal patterns over time.
 * Sources should be passed in chronological order (earliest first).
 */
export async function runReflectiveAnalysis(
  sources: SourceForProcessing[],
): Promise<ReflectiveAnalysis> {
  const t0 = Date.now()
  const prompt = buildCorpusPrompt(
    sources,
    `Analyse the following ${sources.length} sessions in chronological order. These are from the same recurring context.`
  )

  const { object } = await generateObject({
    model: MODELS.geminiPro,
    system: SYSTEM_PROMPTS.reflectiveAnalysis,
    prompt,
    schema: reflectiveAnalysisSchema,
  })

  console.log(`[runReflectiveAnalysis] LLM call took ${Date.now() - t0}ms (${sources.length} sources, ${prompt.length} chars)`)
  return object
}

/**
 * Mode 4: Project synthesis — distil learning from a body of work.
 */
export async function runProjectSynthesis(
  sources: SourceForProcessing[],
  projectName?: string,
): Promise<ProjectSynthesis> {
  const t0 = Date.now()
  const preamble = projectName
    ? `Analyse all source documents from the project "${projectName}".`
    : `Analyse the following ${sources.length} source documents as a complete project.`

  const prompt = buildCorpusPrompt(sources, preamble)

  const { object } = await generateObject({
    model: MODELS.geminiPro,
    system: SYSTEM_PROMPTS.projectSynthesis,
    prompt,
    schema: projectSynthesisSchema,
  })

  console.log(`[runProjectSynthesis] LLM call took ${Date.now() - t0}ms (${sources.length} sources, ${prompt.length} chars)`)
  return object
}
