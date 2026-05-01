import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Load a markdown brief from a path relative to the app root (`02-app/`).
 *
 * Skill briefs live alongside their `index.ts` modules but Next.js bundles
 * those modules and rewrites `__dirname`. Using `process.cwd()` (the app
 * root in dev and production) is stable.
 */
export function loadBrief(relativePath: string): string {
  return readFileSync(join(process.cwd(), relativePath), 'utf8')
}
