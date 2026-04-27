/**
 * Design system coherence check (DS-08 / SKL-11 plumbing).
 *
 * Reports drift between:
 *   - 02-app/components/registry.ts (component registry)
 *   - 01-design/design-system.md (canonical specs)
 *   - 02-app/app/(dashboard)/ + 02-app/components/*-{view,modal,panel,list,table,workspace,area,section,card}.tsx (organism layer)
 *
 * Four checks:
 *   1. Missing specs   — registry entries with spec: null  (DS-03 backfill list, warning)
 *   2. Broken anchors  — spec: "..." pointing at a heading that doesn't exist (error)
 *   3. Orphan specs    — ### headings under "## Molecule specifications" not referenced by registry (error)
 *   4. Direct atoms    — organism files importing from @/components/ui/* (warning until DS-05 lands)
 *
 * Exit code:
 *   0 → no errors (broken anchors, orphan specs); warnings allowed.
 *   1 → at least one error.
 *
 * Usage: npm run check:design-system
 *
 * Wired into design-system skill Mode B (drift check) and CI (future).
 */

import { readFileSync, readdirSync, statSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { componentRegistry, type ComponentEntry } from "../components/registry"

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, "..", "..")
const APP_ROOT = resolve(__dirname, "..")
const DESIGN_SYSTEM_PATH = join(REPO_ROOT, "01-design", "design-system.md")

// ---------- Helpers ----------

/** Convert a heading to its anchor format used in `spec` field values. */
function anchorFor(heading: string): string {
  return heading
    .toLowerCase()
    // Strip italic-parenthetical suffixes like "*(new)*", "*(light)*", "*(DS-04)*"
    .replace(/\*\([^)]*\)\*/g, "")
    // Strip plain parenthetical suffixes like "(shared pattern)"
    .replace(/\([^)]*\)/g, "")
    // Replace remaining non-word chars (except hyphens, which we keep)
    .replace(/[^\w\s-]/g, "")
    .trim()
    // Collapse whitespace into hyphens for multi-word anchors
    .replace(/\s+/g, "-")
}

/** Parse `01-design/design-system.md` and return a Set of anchors under "## Molecule specifications". */
function readSpecAnchors(): Set<string> {
  const md = readFileSync(DESIGN_SYSTEM_PATH, "utf8")
  const lines = md.split("\n")
  const anchors = new Set<string>()
  let inMoleculeSection = false
  for (const line of lines) {
    if (/^##\s+Molecule specifications\b/.test(line)) {
      inMoleculeSection = true
      continue
    }
    if (inMoleculeSection && /^##\s+/.test(line)) {
      // Reached the next H2 — molecule specs block has ended
      inMoleculeSection = false
    }
    if (inMoleculeSection) {
      const match = line.match(/^###\s+(.+?)\s*$/)
      if (match) {
        anchors.add(`molecule-specifications/${anchorFor(match[1])}`)
      }
    }
  }
  return anchors
}

/** Recursively walk a directory and yield .tsx files. */
function* walkTsx(dir: string): Generator<string> {
  let entries: string[]
  try {
    entries = readdirSync(dir)
  } catch {
    return
  }
  for (const entry of entries) {
    const full = join(dir, entry)
    let stat
    try {
      stat = statSync(full)
    } catch {
      continue
    }
    if (stat.isDirectory()) {
      // Skip node_modules, .next, ui (atoms)
      if (entry === "node_modules" || entry === ".next" || entry === "ui") continue
      yield* walkTsx(full)
    } else if (stat.isFile() && entry.endsWith(".tsx")) {
      yield full
    }
  }
}

/** Is this file in the organism layer per the design-system rules? */
function isOrganism(absPath: string, registeredMoleculeFiles: Set<string>): boolean {
  // Anything under app/(dashboard)/ counts.
  const rel = absPath.replace(APP_ROOT + "/", "")
  if (rel.startsWith("app/(dashboard)/")) return true

  // In components/, organism files match these suffixes.
  const organismSuffixes = [
    "-view.tsx",
    "-modal.tsx",
    "-panel.tsx",
    "-list.tsx",
    "-table.tsx",
    "-workspace.tsx",
    "-area.tsx",
    "-section.tsx",
    "-card.tsx",
  ]
  if (rel.startsWith("components/") && organismSuffixes.some((s) => rel.endsWith(s))) {
    // Exclude anything declared in the registry as a molecule.
    if (registeredMoleculeFiles.has(absPath)) return false
    return true
  }
  return false
}

/** Find direct atom imports (`@/components/ui/*`) in organism files. */
function findDirectAtomImports(registeredMoleculeFiles: Set<string>): Map<string, string[]> {
  const imports = new Map<string, string[]>() // file → [atom names]
  for (const file of walkTsx(APP_ROOT)) {
    if (!isOrganism(file, registeredMoleculeFiles)) continue
    const src = readFileSync(file, "utf8")
    const matches = src.matchAll(/from\s+["']@\/components\/ui\/([\w-]+)["']/g)
    const atoms: string[] = []
    for (const m of matches) atoms.push(m[1])
    if (atoms.length) {
      const rel = file.replace(APP_ROOT + "/", "")
      imports.set(rel, atoms)
    }
  }
  return imports
}

// ---------- Checks ----------

const specAnchors = readSpecAnchors()

const missingSpecs: ComponentEntry[] = []
const brokenAnchors: { entry: ComponentEntry; anchor: string }[] = []
const referencedAnchors = new Set<string>()

for (const entry of componentRegistry) {
  if (entry.spec === null) {
    missingSpecs.push(entry)
    continue
  }
  if (!specAnchors.has(entry.spec)) {
    brokenAnchors.push({ entry, anchor: entry.spec })
    continue
  }
  referencedAnchors.add(entry.spec)
}

const orphanSpecs: string[] = []
for (const anchor of specAnchors) {
  if (!referencedAnchors.has(anchor)) orphanSpecs.push(anchor)
}

// Atom-import scan
const registeredMoleculeFiles = new Set(
  componentRegistry
    .map((e) => e.path)
    .map((p) => {
      // "@/components/foo" → absolute path
      if (!p.startsWith("@/")) return null
      const rel = p.replace("@/", "")
      return resolve(APP_ROOT, rel + ".tsx")
    })
    .filter((p): p is string => p !== null)
)

const directAtomImports = findDirectAtomImports(registeredMoleculeFiles)

// ---------- Report ----------

const errors: string[] = []
const warnings: string[] = []

console.log("Design system coherence check")
console.log("=".repeat(60))
console.log(`Registry entries:        ${componentRegistry.length}`)
console.log(`Spec anchors found:      ${specAnchors.size}`)
console.log(`Anchored entries:        ${referencedAnchors.size}`)
console.log()

if (missingSpecs.length) {
  warnings.push(`${missingSpecs.length} registry entries have no spec (DS-03 backfill).`)
  console.log(`⚠️  Missing specs (warning) — ${missingSpecs.length} entries need DS-03 backfill:`)
  for (const e of missingSpecs) console.log(`     • ${e.name} (${e.path})`)
  console.log()
}

if (brokenAnchors.length) {
  errors.push(`${brokenAnchors.length} registry entries point to a non-existent spec anchor.`)
  console.log(`❌ Broken anchors (error) — ${brokenAnchors.length} entries point at headings that don't exist:`)
  for (const { entry, anchor } of brokenAnchors) {
    console.log(`     • ${entry.name} → ${anchor}`)
  }
  console.log()
}

if (orphanSpecs.length) {
  errors.push(`${orphanSpecs.length} spec headings have no registry entry.`)
  console.log(`❌ Orphan specs (error) — ${orphanSpecs.length} headings under "## Molecule specifications" with no registry reference:`)
  for (const a of orphanSpecs) console.log(`     • ${a}`)
  console.log("     Either add a registry entry pointing at this anchor, or remove the spec.")
  console.log()
}

if (directAtomImports.size) {
  const totalAtoms = [...directAtomImports.values()].reduce((n, a) => n + a.length, 0)
  warnings.push(`${directAtomImports.size} organism files contain ${totalAtoms} direct atom imports.`)
  console.log(`⚠️  Direct atom imports in organisms (warning) — each one is a missing-molecule signal:`)
  for (const [file, atoms] of [...directAtomImports.entries()].sort()) {
    console.log(`     • ${file}: ${atoms.join(", ")}`)
  }
  console.log()
}

console.log("=".repeat(60))
if (!errors.length && !warnings.length) {
  console.log("✅ Design system coherence: clean.")
  process.exit(0)
}
if (errors.length) {
  console.log(`❌ ${errors.length} error(s):`)
  for (const e of errors) console.log(`   ${e}`)
}
if (warnings.length) {
  console.log(`⚠️  ${warnings.length} warning(s):`)
  for (const w of warnings) console.log(`   ${w}`)
}
console.log()
console.log(
  errors.length
    ? "Errors must be fixed. Warnings are tracked by DS-03 (spec backfill) and DS-05 (button molecules)."
    : "Warnings only — no fail. DS-03 and DS-05 will close these out."
)

process.exit(errors.length ? 1 : 0)
