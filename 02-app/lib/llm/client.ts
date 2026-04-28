import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createXai } from "@ai-sdk/xai"
import { generateObject, type LanguageModel } from "ai"
import type { z } from "zod"

// Centralised LLM clients. All model calls in the app go through here.
// Change model constants in one place — affects everywhere.

export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

export const xai = createXai({
  apiKey: process.env.XAI_API_KEY,
})

// Default models per task type.
// All default to Anthropic — swap per-call if needed.
export const MODELS = {
  // Primary model for generation, strategy, content
  primary: anthropic("claude-sonnet-4-6"),
  // Fast + cheap for classification, tagging, routing
  fast: anthropic("claude-haiku-4-5-20251001"),
  // Most capable — complex reasoning, long-context tasks
  powerful: anthropic("claude-opus-4-6"),
  // App-wide fallback when primary model fails (overload, timeout, etc.)
  fallback: anthropic("claude-opus-4-7"),
  // Alternatives available if needed
  geminiFlash: google("gemini-2.5-flash"),
  geminiPro: google("gemini-3.1-pro-preview"),
  grok: xai("grok-3-mini"),
} as const

export type ModelKey = keyof typeof MODELS

// ---------------------------------------------------------------------------
// generateObjectWithFallback — calls the primary model, falls back to Claude
// Opus 4.7 if the primary fails. Use this for ALL structured generation calls
// to get free resilience when Gemini is overloaded.
// ---------------------------------------------------------------------------

interface GenerateObjectArgs {
  model: LanguageModel
  schema: z.ZodSchema | Record<string, unknown>
  system?: string
  prompt: string
}

/**
 * Wraps `generateObject` with automatic fallback to Claude Opus 4.7.
 * Logs detailed failure info so we can see what failed and why.
 *
 * Use this for ALL structured generation calls — it gives free resilience
 * when the primary model (often Gemini Pro) is overloaded or fails.
 */
export async function generateObjectWithFallback<T>(
  args: GenerateObjectArgs,
  options?: { fallbackModel?: LanguageModel; tag?: string }
): Promise<{ object: T; usedFallback: boolean }> {
  const fallbackModel = options?.fallbackModel ?? MODELS.fallback
  const tag = options?.tag ?? 'generation'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const callArgs = args as any
  const primaryModelId = describeModel(callArgs.model)
  const fallbackModelId = describeModel(fallbackModel)

  try {
    const result = await generateObject(callArgs)
    return { object: result.object as T, usedFallback: false }
  } catch (err) {
    // Try to recover from "wrapped response" cases (e.g. Claude tool-use sometimes
    // wraps the whole object under a "$" key). If we can salvage it, use it.
    const recovered = tryRecoverWrappedObject<T>(err, callArgs.schema)
    if (recovered) {
      console.warn(`[${tag}] primary (${primaryModelId}) returned wrapped object; recovered without fallback.`)
      return { object: recovered, usedFallback: false }
    }

    logGenerationError(tag, `primary (${primaryModelId})`, err)
    console.warn(`[${tag}] Falling back to ${fallbackModelId}.`)

    try {
      const result = await generateObject({ ...callArgs, model: fallbackModel })
      console.log(`[${tag}] Fallback succeeded on ${fallbackModelId}.`)
      return { object: result.object as T, usedFallback: true }
    } catch (fallbackErr) {
      // Same recovery attempt for the fallback model
      const recoveredFallback = tryRecoverWrappedObject<T>(fallbackErr, callArgs.schema)
      if (recoveredFallback) {
        console.warn(`[${tag}] fallback (${fallbackModelId}) returned wrapped object; recovered.`)
        return { object: recoveredFallback, usedFallback: true }
      }
      logGenerationError(tag, `fallback (${fallbackModelId})`, fallbackErr)
      throw fallbackErr
    }
  }
}

/**
 * Recover from response anomalies where the model wraps or stringifies the schema object.
 *
 * Known cases this handles:
 *  - { "$": <object> }                                      — Claude tool-use wrapper
 *  - { "$PARAMETER_NAME": <object> }                        — Claude placeholder leak
 *  - { stages: "{\"stages\":[...]}" }                       — stringified inner JSON
 *  - { value: { value: <object> } }                         — nested wrappers
 *  - <object>                                                — already valid (no-op)
 *
 * Tries up to 4 levels of unwrapping/stringified-JSON parsing and validates against
 * the schema at each step. Returns the validated object if any candidate matches,
 * otherwise null.
 */
function tryRecoverWrappedObject<T>(err: unknown, schema: unknown): T | null {
  if (!err || typeof err !== 'object') return null
  const e = err as Record<string, unknown>
  const text = typeof e.text === 'string' ? e.text : null
  if (!text) return null

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }

  const zodSchema = schema as { safeParse?: (v: unknown) => { success: boolean; data?: unknown } }
  if (typeof zodSchema?.safeParse !== 'function') return null

  // Generate a set of candidate values to validate. Each candidate is a possible
  // unwrapping of the original parsed response — single-key unwrap, string→JSON parse,
  // or combinations thereof. We try each one against the schema.
  const candidates = enumerateCandidates(parsed, 4)

  for (const candidate of candidates) {
    const result = zodSchema.safeParse!(candidate)
    if (result.success) return result.data as T
  }

  return null
}

/** Generate candidate values via repeated unwrap + JSON-parse, up to maxDepth. */
function enumerateCandidates(value: unknown, maxDepth: number): unknown[] {
  const seen = new Set<string>()
  const candidates: unknown[] = []

  function visit(v: unknown, depth: number) {
    if (depth < 0) return
    // Avoid duplicate work via stringified identity (cheap dedup)
    let key: string
    try {
      key = JSON.stringify(v)
    } catch {
      key = String(v)
    }
    if (seen.has(key)) return
    seen.add(key)

    candidates.push(v)

    // If it's a string, try parsing as JSON
    if (typeof v === 'string') {
      const trimmed = v.trim()
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          visit(JSON.parse(trimmed), depth - 1)
        } catch {
          // Not valid JSON — ignore
        }
      }
      return
    }

    // If it's a single-key object, unwrap
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const keys = Object.keys(v as Record<string, unknown>)
      if (keys.length === 1) {
        visit((v as Record<string, unknown>)[keys[0]], depth - 1)
      }
    }
  }

  visit(value, maxDepth)
  return candidates
}

/** Pull a readable model identifier out of a LanguageModel object. */
function describeModel(model: unknown): string {
  if (model && typeof model === 'object') {
    const m = model as { modelId?: string; provider?: string }
    if (m.modelId) return m.provider ? `${m.provider}/${m.modelId}` : m.modelId
  }
  return 'unknown-model'
}

/**
 * Detailed logging for generation errors. AI SDK errors carry useful
 * extra info (text, cause, lastError) that the default message hides.
 */
function logGenerationError(tag: string, label: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err)
  console.warn(`[${tag}] ${label} failed: ${message}`)

  if (!err || typeof err !== 'object') return
  const e = err as Record<string, unknown>

  // AI_NoObjectGeneratedError carries the raw text that failed to parse
  if (typeof e.text === 'string' && e.text.length > 0) {
    const preview = e.text.length > 1500 ? e.text.slice(0, 1500) + '… [truncated]' : e.text
    console.warn(`[${tag}] ${label} raw response:\n${preview}`)
  }

  // Schema validation errors (Zod) come through `cause`
  if (e.cause) {
    const cause = e.cause as { message?: string; issues?: unknown }
    if (cause.message) console.warn(`[${tag}] ${label} cause: ${cause.message}`)
    if (cause.issues) console.warn(`[${tag}] ${label} schema issues:`, JSON.stringify(cause.issues, null, 2))
  }

  // Some provider errors carry `lastError` from internal retries
  if (e.lastError) {
    const last = e.lastError as { message?: string }
    if (last.message) console.warn(`[${tag}] ${label} lastError: ${last.message}`)
  }
}
