# DS-03 Layout — Spec backfill

Status: draft
Last updated: 2026-04-27
Brief: `01-design/briefs/DS-03-spec-backfill.md`

## Template match
No applicable template. DS-03 is documentation work — 38 spec writes, 8 spec rewrites, 2 file moves. No new UI patterns, no new molecules.

## Why a layout spec at all

DS-03 doesn't add a molecule, so the "Molecule composition" section is the file-move plan + the spec template references. This document is short.

---

## Molecule composition *(mandatory — drives feature-build plan gate)*

### Existing molecules used
None — DS-03 doesn't compose molecules into a new surface. It documents existing ones.

### Existing molecules to extend
None — DS-03 doesn't change behaviour. Specs describe what's there.

### Existing molecules used but unspecced *(known gap — closes DS-03 itself)*
The 42 entries listed in the brief's "Scope" section. After DS-03, this list is empty.

### Existing molecules to move (registry/file-system changes)

1. **`OfferDetailView`** — currently at `02-app/components/offer-detail-view.tsx`. Move to `02-app/app/(dashboard)/dna/offers/[id]/offer-detail-view.tsx`. Remove from registry. Update one consumer import in `02-app/app/(dashboard)/dna/offers/[id]/page.tsx`. Reasoning: 700+ LOC detail view that composes many molecules — organism-shaped, not a reusable molecule. Mirrors the existing `audience-segments/[id]/segment-detail-view.tsx` and `platforms/[id]/platform-detail-view.tsx` pattern.

2. **`ConfidenceBadge`** — currently at `02-app/app/(dashboard)/inputs/process/confidence-badge.tsx`. Move to `02-app/components/confidence-badge.tsx`. Update registry path from `@/app/(dashboard)/inputs/process/confidence-badge` to `@/components/confidence-badge`. Update one consumer import in `02-app/app/(dashboard)/inputs/process/category-section.tsx`. Reasoning: registered molecules belong in `02-app/components/`. The current location is an artifact of where it was first introduced.

### New molecules required
None.

### Atoms used directly *(should be empty)*
N/A.

---

## Spec format reference

Three formats. Used per-entry per the brief.

### Full spec (DS-02 style)

```markdown
### MoleculeName

**File:** `path/to/file.tsx`
**Purpose:** [One sentence + how it differs from similar molecules.]

**Anatomy:**
- [Outer wrapper class set]
- [Inner parts in order, each with class set or molecule reference]

**Behavioural states:**
- **Idle / hover / focus / active / disabled / saving / saved / error / loading / empty** — only the relevant ones.

**Edge cases:**
- [Each known case]

**Accessibility:**
- [ARIA, keyboard, focus management — only when non-trivial]

**Props:**
```ts
interface MoleculeNameProps { ... }
```

**Do not:**
- [Specific constraints — typically 3-5 bullets]
```

### Light spec (feature-coupled, create modals)

```markdown
### MoleculeName

**File:** `path/to/file.tsx`
**Purpose:** [One sentence — what it does, where it's used.]

**Composes:** [Which existing molecules it builds on. e.g. "Wraps `Modal` at size=md, uses `InlineField` for text inputs, `SelectField` for dropdowns, `CheckboxField` for VOC checklists."]

**Spec:**
- [3-6 bullets covering anatomy + key behaviour]
- Save / phase / step structure if multi-step

**Props:** [one-line summary]

**Do not:** [1-3 bullets — only the non-obvious constraints]
```

### Shared spec (archive modals)

```markdown
### Archive modal (shared pattern)

**Files:** `archive-segment-modal.tsx`, `archive-platform-modal.tsx`, `archive-asset-modal.tsx`, `archive-offer-modal.tsx`
**Purpose:** Confirmation modal for archiving a DNA item. Shared structural pattern, type-specific labels.

**Composes:** `Modal` at size=sm.

**Anatomy:**
- [Shared structure across all four]

**Behavioural states:**
- [Shared behaviour]

**Per-type variations:**
- [Table: file → status target value, redirect target on success, dependent-checking logic, label strings]

**Props (shared shape):**
```ts
interface ArchiveModalProps { open, onOpenChange, [id], [name] }
```

**Do not:**
- [Shared constraints]
```

---

## Where each piece lands in design-system.md

After build, `01-design/design-system.md` has:

1. **Existing 8 specs rewritten** in DS-02 format. Anchors stay stable (heading text unchanged).
2. **19 new full specs** added under `## Molecule specifications`, ordered by category (structural → editor → chat).
3. **18 new light specs** under the same section, after the full specs.
4. **1 shared archive spec** added.
5. **Existing `### Archive modal`** entries: there are none currently — the four archive modals had no specs (DS-03 backfill targets).
6. **Changelog row.**

## Registry impact

| Action | Count | Effect |
|---|---|---|
| Add spec anchor to existing entry | 41 | `spec: null` → `spec: "molecule-specifications/..."` |
| Move file path (ConfidenceBadge) | 1 | path string updated |
| Remove entry (OfferDetailView) | 1 | entry deleted |
| Net registry size change | -1 | 57 → 56 entries |

## Order of work (matches brief migration order)

1. File moves (OfferDetailView + ConfidenceBadge) — keep tsc green between steps.
2. Modal full spec.
3. Group A remaining full specs.
4. Rewrite 8 DS-01 specs.
5. Group B full specs.
6. Group C full specs.
7. Light specs Groups D, E, H.
8. Shared archive spec.
9. Registry update — every entry's spec field gets a real anchor.
10. Coherence check — expect 0 missing, 0 broken, 0 orphan.
11. tsc.

## Open questions / TBDs

(Carried from brief.)

1. **`KnowledgeAsset` create-modal phase structure detail level** — light spec captures phase count and purpose; full per-phase fields in code, not in spec.
2. **`IdeasPanel` vs. `IdeasList` separation** — two specs (IdeasPanel composes IdeasList).
3. **`ApplicationsTab` / `CreateApplicationModal` depth** — light specs (narrow consumer scope).
4. **`ScreenSizeGate` message text** — include in spec as canonical.

## Drift annotations to expect

Per Decision 7, if I find a molecule's current behaviour clearly differs from what the spec should say, I add a `**Note:**` paragraph in the spec rather than changing code. Likely candidates (will confirm during writing):

- `Modal` may not currently support all sizes its registry description claims (sm/md/lg/xl). Spec documents what's there; if size variants are missing, annotate.
- `EmptyState` may have slight class drift between consumers. Spec defines the canonical shape; annotate consumers that drifted (without fixing them).
- `IdeasList` includes filter pills that are inline-styled (not yet a `FilterPill` molecule — DS-07 territory). Spec annotates the inline styling as known drift.

These are predictions; final list determined while writing.
