import { embed } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
})

// gemini-embedding-2-preview supports Matryoshka truncation.
// We truncate to 1536 to match existing pgvector column dimensions.
const EMBEDDING_MODEL = google.textEmbeddingModel('gemini-embedding-2-preview', {
  outputDimensionality: 1536,
})

// Max ~8000 tokens. Using char count approximation (1 token ≈ 4 chars).
const MAX_CHARS = 32_000

/**
 * Generate a 1536-dimension embedding vector for the given text.
 * Returns null if the input is empty or whitespace-only.
 * Truncates input silently if it exceeds MAX_CHARS.
 */
export async function generateEmbedding(text: string): Promise<number[] | null> {
  const trimmed = text.trim()
  if (!trimmed) return null

  const input = trimmed.length > MAX_CHARS ? trimmed.slice(0, MAX_CHARS) : trimmed

  const { embedding } = await embed({
    model: EMBEDDING_MODEL,
    value: input,
  })

  // Truncate to 1536 if model returns more dimensions (Matryoshka models preserve quality)
  return embedding.length > 1536 ? embedding.slice(0, 1536) : embedding
}
