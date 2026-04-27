---
name: design-system
description: Gate, enforce, and evolve the BigBrain design system. Use when creating or modifying any shared UI component, when reviewing a build for design drift, or when updating the design system spec after a feature build.
---

# design-system (SKL-11)

Maintains `01-design/design-system.md` as the single source of truth for all visual and component decisions. Gates new component creation. Extracts new patterns after feature builds. Prevents visual drift.

This skill has three modes:

- **Gate mode** — use BEFORE creating or modifying a shared component
- **Drift check** — use AFTER a feature build to catch appearance classes in organisms
- **Evolve mode** — use to update the design system spec after a confirmed new pattern

---

## Autonomy level

**Hard gate before new components** — no new molecule may be created without a spec in `01-design/design-system.md` and a confirmed registry entry plan. Present the spec; wait for approval.

**Mode A is invoked at plan time, not build time.** The natural caller is `feature-build` Step B (Molecule plan) → Step C (plan approval). Drafting specs while writing code is too late — Mode A's job is to ensure the spec is in place *before* implementation begins. The `layout-design` skill's "Molecule composition" output is the upstream input that drives which Mode A invocations are needed.

**Soft gate for refactors** — when modifying an existing molecule, confirm the change aligns with the spec before building. No hard gate required if the change is a direct spec implementation.

**Auto-run drift check** — after any feature build that touches organism-layer files (`app/(dashboard)/**` or `02-app/components/*-view.tsx`, `*-modal.tsx`, `*-panel.tsx`, `*-list.tsx`, `*-table.tsx`, `*-workspace.tsx`, `*-area.tsx`, `*-section.tsx`, `*-card.tsx`), run the drift check automatically and surface any violations.

---

## Pre-conditions (all modes)

- `01-design/design-system.md` exists and has been read
- `02-app/components/registry.ts` has been read

---

## Mode A: Gate — before creating or modifying a shared component

### Step A1: Load context

Read:
1. `01-design/design-system.md` — full spec
2. `02-app/components/registry.ts` — all registered components
3. The feature brief for the current build (if in a feature build context)

### Step A2: Registry check

Search `components/registry.ts` for the component type needed.

- **Exact match found:** Use it. Do not create a new component. Surface the existing component to the feature-build skill.
- **Close match found:** Can it be extended? If yes, extend it and update the registry entry. Do not create a new component.
- **No match:** Proceed to Step A3.

### Step A3: Design system spec check

Search `01-design/design-system.md` for a spec for this component type.

- **Spec found:** The component has been designed. Proceed to build using the spec. No hard gate needed — spec already approved.
- **No spec found:** A new pattern is being introduced. Proceed to Step A4.

### Step A4: Draft spec for new component

If no spec exists, draft one before building:

```markdown
### [ComponentName] *(new)*

**File:** `components/[component-name].tsx`
**Purpose:** [One sentence — what it does and why it exists]

**Spec:**
- Props: [list with types]
- Visual behaviour: [idle, hover, focus, active, disabled states as relevant]
- Token usage: [which CSS variables it uses — bg, text, border, shadow]
- Layout: [flex/grid behaviour, how it fills space]
- Variants: [if it has multiple variants, list them]
- Accessibility: [keyboard, ARIA, focus management]
- Do not: [any explicit constraints — e.g. "do not apply appearance classes in the organism that uses this"]
```

**Hard gate:** Present the draft spec. State: "No component has been created. Approve this spec to proceed."

On approval:
1. Add the spec to `01-design/design-system.md` under "Molecule specifications"
2. Update the changelog in `01-design/design-system.md`
3. Proceed to build

### Step A5: Build the component

Follow the approved spec exactly. Token rules:
- Colours: use `--primary`, `--muted`, `--border`, `--foreground`, etc. — never hex values
- Shadows: use `--shadow-pane` or named shadow tokens — never raw `box-shadow` values inline
- Radius: use `rounded-lg`, `rounded-md` etc. (these map to `--radius` tokens)
- Spacing: Tailwind spacing scale is fine — this is not tokenised at the utility level

After building:
1. Add entry to `components/registry.ts` — including the `spec` field pointing at the anchor for the new spec heading (format: `"molecule-specifications/<lowercase-name-no-spaces>"`, matching the GitHub-anchor of the `### MoleculeName` heading you added in Step A4).
2. Run `npm run check:design-system` to confirm the spec ↔ registry link is healthy. Errors here mean either the anchor doesn't match the heading (typo) or the heading wasn't added in the right section.
3. Run Mode B (drift check) on the organism that uses the new component.

---

## Mode B: Drift check — after a feature build

Run this after any feature build that touches shared components or organism-level pages.

### Step B0: Run the coherence check script

Before scanning files by hand, run the automated check:

```
cd 02-app && npm run check:design-system
```

This script (at `02-app/scripts/check-design-system.ts`) reports four classes of drift:
- **Missing specs** (warning) — registry entries with `spec: null`. Tracked by DS-03; do not block on these.
- **Broken anchors** (error) — registry entries whose `spec: "..."` value points at a non-existent heading in `01-design/design-system.md`. Always blocking — fix immediately by either updating the heading or correcting the registry value.
- **Orphan specs** (error) — `### Foo` headings under `## Molecule specifications` with no registry entry. Either add a registry entry pointing at the anchor, or remove the spec.
- **Direct atom imports** (warning) — organism files importing from `@/components/ui/*`. Tracked by DS-05 (button composition) and DS-04 (form controls); do not block on these unless the build *introduced* a new direct atom import that wasn't in the plan, in which case it's a plan-time gate failure that escaped Step C.

Exit code: `0` for warnings only, `1` for any error. CI / future automation can use this directly.

If the script returns errors: fix them before proceeding to Step B1. If it returns warnings only: continue to Step B1 to scan for in-file appearance violations not covered by the import-level check.

### Step B1: Scan organisms for appearance violations

"Organism" is a *role*, not a path. Check all files modified in the build that live in any of these locations:

- `02-app/app/(dashboard)/**/*.tsx`
- `02-app/components/*-view.tsx`
- `02-app/components/*-modal.tsx`
- `02-app/components/*-panel.tsx`
- `02-app/components/*-list.tsx` (excluding `02-app/components/ui/*`)
- `02-app/components/*-table.tsx`
- `02-app/components/*-workspace.tsx`
- `02-app/components/*-area.tsx`
- `02-app/components/*-section.tsx`
- `02-app/components/*-card.tsx`
- Any other file in `02-app/components/` that composes molecules into a feature-specific surface (use judgment; the registry is authoritative — see exclusions below)

**Exclusions:**
- `02-app/components/ui/*` — these are atoms; appearance classes are correct here.
- Any file declared as a molecule in `02-app/components/registry.ts` — appearance classes are correct in molecules.
- Known canonical molecules outside the registry: `inline-field.tsx`, etc. (these should be in the registry; if they aren't, that's a DS-03 backfill gap, not a drift violation).
- `chat-input.tsx` — purpose-built autosizing textarea, documented exception.

Look for Tailwind appearance classes applied directly in organism JSX:
- `bg-*` (except `bg-transparent`, `bg-inherit`)
- `text-*` colour classes (except `text-foreground`, `text-muted-foreground` — these are tokens). Named-colour scales like `green-*`, `amber-*`, `emerald-*`, `red-*` are **always** violations (they should use semantic state tokens — `--color-success` etc. — once DS-02 lands; until then, flag them as known gaps tied to DS-02).
- `border-*` colour classes
- `shadow-*` (except `shadow-[var(--shadow-*)]` token references)
- `p-*`, `px-*`, `py-*` applied to organism wrappers (layout padding is fine; per-element styling is not)
- Hardcoded values: `p-[12px]`, `mt-[7px]`, `w-[480px]`, hex / rgb colours

**Direct atom-import check:** also flag any `import { X } from '@/components/ui/X'` in an organism-layer file. Each direct atom import is a missing-molecule signal — report it alongside the appearance violations so the drift discussion happens in one place.

**False positives to ignore:**
- Layout classes on organism wrappers: `flex`, `grid`, `gap-*`, `h-full`, `min-h-0`, `overflow-*`, `w-full`
- className pass-throughs on molecule props
- Classes inside molecule files themselves (appearance in molecules is correct)

### Step B2: Report

If violations found:
```
Design drift detected in [file]:
- Line [n]: [violation] — this appearance decision belongs in a molecule, not an organism.
  Suggested fix: [extract to X molecule or use existing Y molecule]
```

If clean:
```
Drift check: clean. No appearance classes found in organism layer.
```

### Step B3: Fix violations

For each violation:
- If an existing molecule can accept a prop to handle the style: use it
- If no molecule exists for this visual decision: flag it and propose a spec (run Mode A)
- Do not leave violations unfixed — they compound with every feature

---

## Mode C: Evolve — update the design system spec

Use when:
- A new component was built and approved during a feature build
- A spec needs updating based on what was learned in the build
- A known issue from the "Known issues" section has been fixed

### Step C1: Load context

Read `01-design/design-system.md`.

### Step C2: Update the spec

For a new component: add the full spec under "Molecule specifications".

For an existing component fix: update the relevant section. Note what changed and why.

For a resolved known issue: remove it from the "Known issues to fix" section.

### Step C3: Update changelog

Add a row to the changelog table at the bottom of `01-design/design-system.md`:

```
| [date] | [what changed and why] |
```

### Step C4: Update registry

If a new component was created: confirm `components/registry.ts` has an accurate entry.

If a component was renamed or removed: update `components/registry.ts` immediately.

---

## Rules (enforced by this skill)

1. **No new molecule without a spec** — if it's not in `01-design/design-system.md`, it hasn't been designed. Draft the spec first.
2. **No appearance classes in organisms** — organisms compose molecules. If you're adding `bg-*` or `text-*` to a page file, something is wrong.
3. **Registry is always current** — every shared component has a registry entry. No entry = the component doesn't exist for the system.
4. **Tokens, not hex** — never write a colour value directly in a component. Use the semantic token (`--primary`, `--muted-foreground`, etc.).
5. **Extend before creating** — if a close component exists, extend it. Duplication is the root cause of drift.

---

## Relationship to other skills

- **layout-design:** Produces the **Molecule composition** section of the layout spec — the upstream input that drives Mode A invocations. Existing molecules are listed with their spec references; new molecules get one-line spec sketches. Without this section, `feature-build` cannot satisfy the plan-time gate.
- **feature-build:** Calls Mode A at **plan time** (Step B Molecule plan + Step C plan-approval check), once per new molecule named in the layout spec. Calls Mode B (drift check) after the build completes, scoped per Step B1's widened path list.
- **feature-brief:** Should flag if a feature will require new shared components — this signals that DS scope needs to be accounted for in the size estimate. The brief itself doesn't draft specs; that's `layout-design` + `design-system` Mode A territory.

---

## Edge cases

- **Feature needs a component that's not in the spec:** Run Mode A. Do not build an unspecced component even under time pressure — a 5-minute spec draft is always worth it.
- **Spec exists but doesn't cover a needed prop or state:** Update the spec first (Mode C, Step C2), then build. Don't silently extend beyond the spec.
- **Organism has appearance classes that are genuinely unavoidable:** This is rare. If it happens, document why in a comment in the file and note it in the drift check report. Don't suppress the drift check result silently.
- **shadcn/ui component needs styling customisation:** Customise via the `className` prop or CSS variables — do not fork the shadcn component into `components/ui/`. If the customisation is used in more than one place, wrap it in a molecule.
