/**
 * Drift check for `lib/skills/sub-agents/db_update_bot/SCHEMA.md`. Exit 1 if
 * the committed file differs from a freshly generated one. Wire into CI / lint.
 *
 * Run: npm run check:write-schema
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { execSync } from 'node:child_process'

const target = join(process.cwd(), 'lib/skills/sub-agents/db_update_bot/SCHEMA.md')
const committed = readFileSync(target, 'utf8')

// Run the generator to a temp string by invoking it with stdout capture is fiddly
// across tsx versions; simplest path: the generator writes the file in place,
// so we compare before/after by running the generator and re-reading.
execSync('tsx scripts/generate-db-update-bot-schema.ts', { stdio: 'pipe' })
const fresh = readFileSync(target, 'utf8')

if (fresh.trim() !== committed.trim()) {
  console.error('SCHEMA.md drift detected. Run `npm run gen:write-schema` and commit the result.')
  process.exit(1)
}

console.log('SCHEMA.md is in sync.')
