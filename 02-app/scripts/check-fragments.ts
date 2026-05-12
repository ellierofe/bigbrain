#!/usr/bin/env tsx
/**
 * Build-time validator for INP-12 prompt fragments.
 *
 * Per ADR-009: every source type in the controlled vocabulary (except `dataset`)
 * must have a registered file at `01-design/schemas/extraction-schemas/{source-type}.md`,
 * and every lens must have one at `01-design/schemas/lens-prompts/{lens}.md`.
 *
 * Plus: the `_base.md` extraction-schemas file must exist.
 *
 * Missing fragments are a deployment error — exits non-zero so this can be wired
 * into predev / prebuild without ceremony.
 */
import { fragmentFileChecks } from '@/lib/llm/prompts/load-fragment'

function main() {
  const checks = fragmentFileChecks()
  const failures: string[] = []
  const skipped: string[] = []
  let ok = 0

  if (!checks.base.exists) {
    failures.push(`Missing base prompt: ${checks.base.path}`)
  } else {
    ok++
  }

  if (!checks.summary.exists) {
    failures.push(`Missing summary prompt: ${checks.summary.path}`)
  } else {
    ok++
  }

  for (const entry of checks.sourceTypes) {
    if (!entry.required) {
      skipped.push(`  · ${entry.sourceType} (intentionally absent per ADR-009 amendment)`)
      continue
    }
    if (!entry.exists) {
      failures.push(`Missing source-type fragment for '${entry.sourceType}': ${entry.path}`)
    } else {
      ok++
    }
  }

  for (const entry of checks.lenses) {
    if (!entry.exists) {
      failures.push(`Missing lens prompt for '${entry.lens}': ${entry.path}`)
    } else {
      ok++
    }
  }

  console.log(`[check-fragments] ${ok} fragments present.`)
  if (skipped.length > 0) {
    console.log(`[check-fragments] skipped (by design):`)
    for (const line of skipped) console.log(line)
  }

  if (failures.length > 0) {
    console.error(`\n[check-fragments] FAIL — ${failures.length} missing fragment file(s):`)
    for (const failure of failures) console.error(`  · ${failure}`)
    console.error(`\nFix: write the missing fragment file under 01-design/schemas/ before deploying.\n`)
    process.exit(1)
  }

  console.log('[check-fragments] OK')
}

main()
