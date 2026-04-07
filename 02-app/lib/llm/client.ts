import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import { createXai } from "@ai-sdk/xai"

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
  // Alternatives available if needed
  geminiFlash: google("gemini-2.5-flash"),
  geminiPro: google("gemini-2.5-pro-preview-03-25"),
  grok: xai("grok-3-mini"),
} as const

export type ModelKey = keyof typeof MODELS
