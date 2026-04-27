# Skill Enforcement Gap Analysis — DS-08
Date: 2026-04-25
Trigger: Foundation audit found 44 of 51 registered molecules have no design-system spec, plus 78+ organism files with appearance-class drift. The `design-system` skill exists and contains the right rules. The rules aren't being enforced. This document is the root-cause analysis.

---

## TL;DR

**The skill is correct. The plumbing isn't.** Five concrete failure modes, all addressable:

1. The "hard gate" in `design-system` Mode A is invoked from `feature-build` Step D ("Build"), AFTER the plan has been approved and code is being written. By that point, time pressure makes "draft a spec for this molecule" feel like a detour.
2. `layout-design` says "flag if new molecules are needed" but doesn't actually require listing them, and doesn't itself draft specs — it punts the work to build time.
3. `feature-template-check` only checks layout templates, not molecule specs. A feature can match a layout template (e.g. `dna-plural-item-template`) and still introduce 5 new uncatalogued molecules inside it.
4. The drift check (Mode B) runs *after* build and only on `app/(dashboard)/`. Components outside that path (`02-app/components/*-modal.tsx`, `*-panel.tsx` etc.) are not scanned. ~80% of drift discovered in the audit lives in these files.
5. There is no enforcement at the registry level. A molecule can be added to `components/registry.ts` without a corresponding spec entry being verified to exist. The two are documented but not coupled.

---

## How the skills are *supposed* to interact

```
feature-brief
    └── flags new shared components needed (per design-system.md § Relationship)
        ↓
layout-design (Step A reads design-system.md)
    └── runs feature-template-check (layout templates only)
    └── flags new molecules needed in the layout spec
        ↓
feature-build (Step A reads design-system.md, plans which molecules to use)
    └── Step D: Build — calls design-system Mode A before creating any component
        └── design-system Mode A (Hard Gate)
            └── If no spec: drafts spec, presents for approval, blocks build
        ↓
    └── Step D+: drift check — calls design-system Mode B on app/(dashboard)/
        └── design-system Mode B
            └── reports + fixes appearance-class violations
```

In theory: any new molecule gets specced before code is written; appearance classes can't survive past build.

In practice: most molecules ship without specs, and 78 organism files have drift.

---

## Gap 1: The gate fires at the wrong moment

**What the design-system skill says:**
> "Hard gate: Present the draft spec. State: 'No component has been created. Approve this spec to proceed.'" (Mode A, Step A4)

**What feature-build says:**
> Step C is the plan-approval gate. Step D is "Build — Follow the plan exactly." Step D includes a paragraph titled "Design system gate (from DS-01)" which lists the rules but doesn't actually invoke `design-system` as a skill call.

**The problem:** Mode A is described as a step that *should* run, but `feature-build` Step D doesn't structurally make it a sub-gate. The plan has been approved, the human is waiting for build output, and now you'd need to stop, draft a spec, and re-gate. Under that pressure, the path of least resistance is to compose with `components/ui/*` atoms inline and move on.

**Evidence from the audit:** 20 organism files import Button directly, 4 import Badge, 3 each import Tooltip / DropdownMenu / Input. Each of these is a place where Mode A *should* have fired ("you need an IconButton — it doesn't exist — draft the spec") and didn't.

**Fix:** Move the molecule inventory to **plan time**, not build time. In `feature-build` Step B (plan), require an explicit "Molecules to use / molecules to create" subsection. Any molecule in the "to create" list must have a spec drafted before Step C plan approval. Then Step D is just composing — no mid-build gates needed.

---

## Gap 2: `layout-design` punts the molecule decision

**What `layout-design` says:**
> "Read `01-design/design-system.md`. Note which molecule components are available to use, which are needed for this feature, and whether any new molecules will be required. If new molecules are needed, flag them — they must be specced before build starts." (Step A)

**The problem:** "Flag them" is vague. There's no required output field in the layout spec template (Step D) for "molecules needed (existing) / molecules needed (new)". The layout spec describes *visual layout*, not its component composition. A reviewer approving a layout spec has no surface to push back on missing molecules.

**Evidence:** The DS-04 (form controls) brief is itself a meta-document that should have been caught at layout-design time for DNA-09. DNA-09 layout spec said "needs a select" — and proceeded to build with a hand-styled native `<select>`. No skill challenged this.

**Fix:** Add a mandatory section to layout specs: **"Molecule composition"** — a list of every molecule the layout uses, separated into "existing (with registry path)" and "new (with one-line spec sketch)". This makes the gap visible at the layout-approval gate, not at build time.

---

## Gap 3: `feature-template-check` only checks layout templates

**What it does:** Scans `01-design/wireframes/templates/` and reports a match (e.g. "this is a `dna-plural-item-template`") or not.

**What it doesn't do:** Look at molecule-level reuse. A feature can match `dna-plural-item-template` perfectly and still need an `IconButton`, a `StatusBadge`, a `FilterPill`, an `ActionMenu` — none of which the layout template tracks.

**The deeper issue:** The system has two axes — *layout templates* (page-level structure) and *molecule specs* (component-level reuse). The skill set covers axis 1 well and axis 2 poorly. Result: layout templates look "registered and clean" while the molecule layer drifts.

**Fix:** Either extend `feature-template-check` to also scan `01-design/design-system.md` molecule specs and report which existing molecules apply, OR add a sister skill `molecule-check` that runs alongside it. The output should feed the layout spec's new "Molecule composition" section.

---

## Gap 4: Drift check scope is too narrow

**What the skill says:**
> "Run this after any feature build that touches shared components or organism-level pages. Check all files modified in the build that live in `app/(dashboard)/`." (Mode B, Step B1)

**What the audit found:** The largest single category of drift (modal footers — 11 files) lives in `02-app/components/create-*-modal.tsx` and `02-app/components/archive-*-modal.tsx`. Detail views (`*-detail-view.tsx`), panels (`*-panel.tsx`), and lists (`*-list.tsx`) are also organism-layer per the design-system rule, but the drift check doesn't scan them because they're under `02-app/components/` not `app/(dashboard)/`.

**The problem:** "Organism" is a *role*, not a *path*. The current check confuses the two. Any file in `02-app/components/` that imports from `@/components/ui/*` and composes molecules into a feature-specific surface is an organism, regardless of directory.

**Fix:** Redefine the drift-check scope. It should scan:
- `02-app/app/(dashboard)/**/*.tsx` (current scope)
- `02-app/components/*-view.tsx`, `*-modal.tsx`, `*-panel.tsx`, `*-list.tsx`, `*-table.tsx`, `*-workspace.tsx`, `*-area.tsx`, `*-section.tsx`, `*-card.tsx`
- Excludes `02-app/components/ui/*` (atoms) and any file declared in `components/registry.ts` as a molecule

The exclusion list comes from the registry — making the registry the source of truth for "this is a molecule, appearance is allowed here."

---

## Gap 5: Registry and spec are not coupled

**What's documented:**
- `components/registry.ts` — flat list of molecules, no spec link
- `01-design/design-system.md` — specs in prose, no registry link
- `design-system` Mode A Step A4: "On approval: Add the spec to `01-design/design-system.md`. Update the registry."

**What's missing:** Nothing prevents a molecule from being added to `registry.ts` without a spec entry. There's no automated check, no required field, no sanity check that runs.

**Evidence:** 44 of 51 registered molecules have no spec. This isn't a one-off oversight; it's the default outcome of "two files, both edited by hand, no coupling."

**Fix options (pick one or combine):**
- **Lightweight:** add a required "spec" field to each registry entry — a path to the spec section in `design-system.md` (or `null` for atoms-passthrough). A nightly/manual check: every entry with `spec: null` is a violation.
- **Heavier:** generate the registry *from* the spec doc. Make `design-system.md` the source of truth, parse it to derive the registry. Out of scope for now but worth flagging.
- **Process-only:** a checklist item in `feature-build` Step G (Finalise): "Confirm every new entry in `registry.ts` has a corresponding spec section." Cheaper, depends on human discipline — exactly the kind of process that's been failing.

The lightweight option is the right starting point — small change, immediately visible drift signal.

---

## Why didn't this catch up sooner?

Three contributing factors, in order of impact:

1. **The system rewards layout reuse over molecule reuse.** Layout templates have a dedicated skill (`feature-template-check`), a dedicated registry (`01-design/wireframes/templates/`), and a clear ceremony around them. Molecules have a one-paragraph mention inside `design-system` Mode A. When the visible incentive is "match a template" and not "compose existing molecules," the molecule layer is where the corner-cutting happens.

2. **DS-01 was treated as done.** The DS-01 backlog entry shows status `in-progress`, but in practice the skill, the registry, and 8 specs were treated as the deliverable, after which feature builds resumed. There was no follow-up audit at any milestone to verify the gate was actually firing — until UX-10 surfaced it accidentally.

3. **Time-pressure asymmetry.** Drafting a spec for a molecule mid-build feels like a 10-minute detour. Writing inline appearance classes feels like 10 seconds. The skill says the spec is mandatory, but no part of the workflow physically blocks code from being written without one. The path of least resistance always wins under deadline pressure unless the workflow physically refuses.

---

## Concrete remediation plan

Sequence matters — the early items unblock the later ones.

### Phase 1: Make the gate fire at the right time (fixes Gap 1 + Gap 2)

1. **Update `layout-design` Step D** — add a mandatory "Molecule composition" section to the layout spec template, with subsections "Existing molecules used" and "New molecules required (one-line spec sketch each)." Add this to the hard-gate checklist.

2. **Update `feature-build` Step B** — add a required "Molecules to use / molecules to create" subsection. Plan approval (Step C) cannot proceed if any "to create" entry lacks a draft spec. This moves the gate from build time to plan time.

3. **Update `design-system` Mode A** — note that Mode A is now invoked during planning, not building. The skill itself doesn't change, just when it runs.

### Phase 2: Widen the drift check (fixes Gap 4)

4. **Update `design-system` Mode B Step B1** — change scope from `app/(dashboard)/**` to "all organism-layer files: `app/(dashboard)/**` plus `components/*-view.tsx`, `*-modal.tsx`, `*-panel.tsx`, `*-list.tsx`, `*-table.tsx`, `*-workspace.tsx`, `*-area.tsx`, `*-section.tsx`, `*-card.tsx`. Exclude any file present in `components/registry.ts` as a molecule."

### Phase 3: Couple registry to spec (fixes Gap 5)

5. **Update `components/registry.ts` schema** — add a required `spec` field to each entry, pointing at the spec section anchor in `design-system.md`. Migrate all 51 existing entries (most will be `null` until DS-03 backfills the specs).

6. **Add a registry coherence check** — either as a script in `02-app/scripts/check-registry.ts` or as a step in `design-system` Mode B. Reports any registry entry with `spec: null`. Lands as part of DS-03.

### Phase 4: Bridge the molecule axis (fixes Gap 3)

7. **Extend `feature-template-check`** to also scan `01-design/design-system.md` and report applicable existing molecules for the feature. Output feeds `layout-design`'s new "Molecule composition" section. (Lower priority than 1–6; can ship after Phase 1 takes effect.)

### Phase 5: Process check

8. **Add to milestone reviews** — every milestone close should run a quick audit: count direct atom imports in organism layer, count spec/registry mismatches, count appearance-class violations. Numbers should trend toward zero. If they don't, something in 1–7 isn't working and we revisit.

---

## What this *doesn't* fix

- Existing drift (78 files, 44 missing specs, 40 direct atom imports) — that's what the DS-02..DS-07 foundation programme is for.
- Behavioural / save-pattern drift — the skills don't currently address this at all. DS-06 will introduce the canonical save contract; the skills should reference it once it exists.
- New atoms from shadcn that haven't been wrapped — the rule "always wrap new shadcn atoms in a molecule before use" should be added to `feature-build` Step D explicitly. Currently implied, not stated.

---

## Recommended order of work

1. **First**: Phase 1 (skill updates) — cheap, immediate, prevents new drift from accumulating during foundation work.
2. **Second**: DS-02 (semantic tokens) and DS-03 (spec backfill) — must precede DS-05/06/07 and unlock Phase 3 (registry coupling).
3. **In parallel**: DS-04 (form controls) — has its own brief, can proceed once DS-02 lands.
4. **Then**: DS-05 → DS-06 → DS-07 in sequence.
5. **Throughout**: Phase 5 milestone audits to catch regressions.
