import { generateText } from 'ai'
import { MODELS } from '@/lib/llm/client'
import { loadSummaryPrompt } from '@/lib/llm/prompts/load-fragment'
import type { SourceType, Authority } from '@/lib/types/lens'

// ---------------------------------------------------------------------------
// Summariser (INP-12 Phase 1)
//
// Produces the ~300-word summary that lives on src_source_documents.summary
// and becomes the SourceDocument graph node description (ADR-002a §3 narrow
// exception to the no-AI-inference rule). Re-summarisation is supported by
// updating summary_generated_at on the parent source.
//
// Uses MODELS.fast (Claude Haiku) — the task is summarisation, not reasoning,
// and the volume on re-ingest day will be ~70 sources. Cost matters; quality
// here is "faithful compression", not "deep analysis".
// ---------------------------------------------------------------------------

const MAX_INPUT_CHARS = 200_000

export interface SummariseInput {
  title: string
  sourceType: SourceType
  authority: Authority
  extractedText: string
  /** Optional ISO date to include in the source header — helps the model
   *  contextualise dated material (e.g. "March 2026 client interview"). */
  documentDate?: string | null
}

export interface SummariseResult {
  summary: string
  /** ISO timestamp of when the summary was generated. */
  generatedAt: Date
  /** Whether the model invocation fell through to a fallback model. */
  usedFallback: boolean
  /** Whether the input had to be truncated due to length. */
  truncated: boolean
}

export async function summariseSource(input: SummariseInput): Promise<SummariseResult> {
  const trimmed = input.extractedText.trim()
  if (!trimmed) {
    throw new Error('summariseSource: extractedText is empty.')
  }

  const truncated = trimmed.length > MAX_INPUT_CHARS
  const body = truncated ? trimmed.slice(0, MAX_INPUT_CHARS) : trimmed

  const systemPrompt = await loadSummaryPrompt()
  const userPrompt = buildUserPrompt({ ...input, extractedText: body })

  let usedFallback = false
  let text: string
  try {
    const { text: out } = await generateText({
      model: MODELS.fast,
      system: systemPrompt,
      prompt: userPrompt,
    })
    text = out
  } catch (err) {
    console.warn('[summarise] fast model failed, falling back:', err instanceof Error ? err.message : err)
    const { text: out } = await generateText({
      model: MODELS.fallback,
      system: systemPrompt,
      prompt: userPrompt,
    })
    text = out
    usedFallback = true
  }

  const summary = text.trim()
  if (!summary) {
    throw new Error('summariseSource: model returned empty summary.')
  }

  return {
    summary,
    generatedAt: new Date(),
    usedFallback,
    truncated,
  }
}

function buildUserPrompt(input: SummariseInput): string {
  const header = [
    `Title: ${input.title}`,
    `Source type: ${input.sourceType}`,
    `Authority: ${input.authority}`,
    input.documentDate ? `Document date: ${input.documentDate}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  return `${header}\n\n--- BEGIN SOURCE ---\n${input.extractedText}\n--- END SOURCE ---`
}
