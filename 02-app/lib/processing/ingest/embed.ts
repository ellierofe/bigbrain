import { generateEmbedding } from '@/lib/llm/embeddings'

// ---------------------------------------------------------------------------
// Batch embedding helper (INP-12 Phase 1)
//
// Wraps `generateEmbedding` (gemini-embedding-2-preview → 1536-dim vector)
// with a small concurrency limiter so ingesting a 200-chunk transcript doesn't
// fire 200 simultaneous embed calls. Returns vectors aligned to the input order.
//
// Failures: per-item nulls. Callers decide whether a null vector should block
// the row insert or just leave embedding NULL for backfill (the source-chunks
// schema has `embeddingGeneratedAt nullable` for exactly this — see
// `src-source-chunks.md` partial-index note).
// ---------------------------------------------------------------------------

const DEFAULT_CONCURRENCY = 4

export interface EmbedManyOptions {
  concurrency?: number
}

export interface EmbedManyResult {
  vectors: Array<number[] | null>
  failures: Array<{ index: number; error: string }>
}

export async function embedMany(
  texts: string[],
  options: EmbedManyOptions = {},
): Promise<EmbedManyResult> {
  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY
  const vectors: Array<number[] | null> = new Array(texts.length).fill(null)
  const failures: Array<{ index: number; error: string }> = []

  let cursor = 0
  async function worker(): Promise<void> {
    while (cursor < texts.length) {
      const i = cursor++
      try {
        vectors[i] = await generateEmbedding(texts[i])
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        failures.push({ index: i, error: message })
        vectors[i] = null
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, texts.length) }, () => worker())
  await Promise.all(workers)

  return { vectors, failures }
}
