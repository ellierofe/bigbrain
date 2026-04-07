import { customType } from 'drizzle-orm/pg-core'

// pgvector column type for Drizzle.
// Usage: vector(1536) — dimensions must match the embedding model output.
export const vector = customType<{ data: number[]; driverData: string }>({
  dataType(config) {
    const dims = (config as { dimensions?: number } | undefined)?.dimensions
    return dims ? `vector(${dims})` : 'vector'
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`
  },
  fromDriver(value: string): number[] {
    return value
      .slice(1, -1)
      .split(',')
      .map(Number)
  },
})
