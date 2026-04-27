# DS-02: Semantic colour tokens + status & type molecules
Feature ID: DS-02
Status: complete
Last updated: 2026-04-25

## Summary

Establish two parallel token systems and the molecules that consume them: **state tokens** (`--color-success`, `--color-warning`, `--color-error`, `--color-info`) for status / save / confidence / warning UI, and **tag tokens** (`--color-tag-1` through `--color-tag-6`) for category differentiation across VOC, platforms, outcomes, and mission phases. Finalise the existing `StatusBadge` molecule and introduce a new `TypeBadge` molecule. Migrate the 60 hardcoded named-Tailwind-colour instances (`green-*`, `amber-*`, `emerald-*`, `red-*`, `blue-*`, `purple-*`, `rose-*`, `orange-*`) across ~30 organism files to use the tokens.

This is the first foundation entry of the DS programme established by the 2026-04-25 audit. It is the lowest-risk, highest-leverage piece — every remaining DS-02..DS-07 entry consumes these tokens.

## Why this matters

- **No semantic state colour tokens exist.** Every "Saved" badge, every status pill, every confidence indicator hardcodes a Tailwind hue. The drift-audit found 60 instances. The semantic tokens (`--primary`, `--muted-foreground`) cover decoration but not state.
- **Category colours are repeated inline across ~10 files** — voc-table, voc-mapping, entity-outcomes-panel, platforms cards + detail, mission-workspace, project-workspace, analysis-review-panel, knowledge-assets cards, offers cards. Each file owns its own className lookup table; they share the same six hues but no token coordinates them.
- **`StatusBadge` is registered but breaks the design system rule itself** (uses hardcoded `bg-amber-100 text-amber-800` etc. internally). Any feature that adopts it inherits the problem.
- **The check script (DS-08) flags 24 organism files with 41 direct atom imports.** Most of those are `Badge` and ad-hoc inline pill divs that a `TypeBadge` molecule would absorb.

## Use cases

- **State badges** — show status (draft / active / archived), save feedback (Saved / Failed), confidence (high / med / low), and inline warnings (length, recurring duplicate, low-relevance) consistently across the app.
- **Type badges** — show category differentiation for VOC categories, platform types, outcome kinds, mission phases. Currently rendered as one-off pills with hardcoded colours.
- **Token-only state styling** — features that show state without a badge (e.g. inline `text-emerald-600` "Saved" text in `inline-field.tsx`, mission-workspace, project-workspace) consume `text-success` directly.

## User journey

Not user-facing as a feature. Net effect: every state colour and category colour across the app is consistent and visually coherent with the sage primary palette.

## Tokens

### State tokens *(4 hues × 3 roles = 12 tokens)*

Defined in `02-app/app/globals.css` as `:root` CSS variables.

| Token | Provisional value | Usage |
|---|---|---|
| `--color-success` | `#047857` (emerald-700-ish) | Standalone success text — "Saved" badges, completed status |
| `--color-success-bg` | `#D1FAE5` (emerald-100-ish) | Pill background for success states |
| `--color-success-foreground` | `#064E3B` (emerald-900-ish) | Text on filled success pill |
| `--color-warning` | `#B45309` (amber-700-ish) | Standalone warning text — "Approaching limit", "Low confidence" |
| `--color-warning-bg` | `#FEF3C7` (amber-100-ish) | Pill background for warning states (draft, paused) |
| `--color-warning-foreground` | `#78350F` (amber-900-ish) | Text on filled warning pill |
| `--color-error` | re-uses existing `--destructive` | Standalone error text — "Failed", validation errors |
| `--color-error-bg` | `#FEE2E2` (red-100-ish) | Pill background for error states (dropped) |
| `--color-error-foreground` | `#7F1D1D` (red-900-ish) | Text on filled error pill |
| `--color-info` | `#1D4ED8` (blue-700-ish) | Standalone info text |
| `--color-info-bg` | `#DBEAFE` (blue-100-ish) | Pill background for info states (in_progress, complete, committed) |
| `--color-info-foreground` | `#1E3A8A` (blue-900-ish) | Text on filled info pill |

Final hex values to be tuned during build to fit the sage / paper / forest palette — provisional values match current Tailwind use to minimise visual jump during migration. The build will sample them in context against `--background` (#F8FAF9) and `--card` (#FFFFFF) and adjust if needed.

### Tag tokens *(6 hues × 3 roles = 18 tokens)*

Indexed naming (`tag-1`..`tag-6`) over hue naming. Reasoning: the whole point of tokens is decoupling visual from code — naming after the hue (`tag-blue`) re-couples them and creates pain on any future palette swap. Hue names live in code comments above each token, not in the token name.

User-supplied desaturated palette, sympathetic to sage (`#A5C4B2`):

| Token | Hue | Provisional value (foreground) |
|---|---|---|
| `--color-tag-1` | dusty blue | `#A1BED6` |
| `--color-tag-2` | dusty lilac | `#C4A5B7` |
| `--color-tag-3` | custard | `#E5E0A3` |
| `--color-tag-4` | dusty lavender | `#A5A8C4` |
| `--color-tag-5` | terracotta orange | `#CE998B` |
| `--color-tag-6` | olive | `#748B7E` |

Each gets `-bg` (a soft tint of the same hue, ~`#XX/15` opacity equivalent) and `-foreground` (a darker version of the same hue for filled-pill text contrast). Final tuning at build time once the script can show actual swatches in context.

**Mapping current categories to tag indices** (chosen during migration; not part of token spec):

- VOC: problems→1, desires→6, objections→3, beliefs→4
- VOC mapping: practical→1, emotional→5, psychological→4, social→3
- Outcomes: resources→1, skills→6, mindset→4, relationships→3, status→5
- Platform types: social→1, email→4, owned_content→6, video→5, audio→3
- Mission phases: exploring→4, synthesising→1, producing→6, paused→3

These are starting points — final assignments to be confirmed during build to ensure no two adjacent badges in any view collide hues.

## Molecules

### StatusBadge *(existing — finalising)*

Already registered. Currently breaks the rule by hardcoding `bg-amber-100 text-amber-800` etc. internally. Refactor to consume state tokens.

**Spec sketch** (full spec at layout-design time):
- Props: `status` (string), `onChange` (async), `options?` (default: draft/active/archived).
- Each option declares a `state` keyword (`'success' | 'warning' | 'error' | 'info' | 'neutral'`) instead of a className. The molecule maps state → token classes internally.
- Uses `bg-{state}-bg text-{state}-foreground` for the pill, with no hardcoded colour values inside.
- Default option set: draft → warning, active → success, archived → neutral (uses `bg-muted text-muted-foreground` — already token-driven).
- Replaces 6 sites currently using hardcoded status colours.

### TypeBadge *(new)*

A generic, decorative category pill. Distinct from StatusBadge because it's non-interactive and indicates *which kind* of thing this is, not *what state* it's in.

**Spec sketch:**
- Props: `hue` (1–6), `label` (string), `size?` ('xs' default | 'sm'), `variant?` ('soft' default = filled bg | 'outline').
- Renders an inline pill: `bg-tag-{hue}-bg text-tag-{hue}-foreground rounded-full px-2 py-0.5 text-xs font-medium` (final values via tokens).
- `outline` variant: transparent bg, `border border-tag-{hue}-foreground/40 text-tag-{hue}` for places where a soft pill would be too heavy (e.g. inside table cells).
- Each consumer (voc-table, platform-detail-view, etc.) keeps its own category → hue mapping. The mapping is a per-feature concern; the molecule is the rendering primitive.
- Replaces ~10 sites currently composing inline pills with hardcoded hue classes.

## Update behaviour

Not a data feature. This is a refactor.

## Relationships

### Knowledge graph (FalkorDB)

None.

### Postgres

None.

## Migration scope

All-in-one migration. The 60 instances split as follows (from drift-audit, 2026-04-25):

**State-colour migrations (~30 instances):**

| File | Sites | Migration |
|---|---|---|
| `02-app/components/inline-field.tsx:135` | 1 | `text-emerald-600` "Saved" → `text-success` |
| `02-app/components/ordered-card-list.tsx:124` | 1 | `text-emerald-600` "Saved" → `text-success` |
| `02-app/components/status-badge.tsx:13-15` | 1 (3 options) | refactor to consume state tokens internally |
| `02-app/components/create-asset-modal.tsx:496` | 1 | `text-amber-600` warning → `text-warning` |
| `02-app/components/create-offer-modal.tsx:340` | 1 | `text-amber-600` warning → `text-warning` |
| `02-app/app/(dashboard)/page.tsx:65-66, 160` | 3 | activity status pills + green status badge → StatusBadge |
| `02-app/app/(dashboard)/projects/clients/project-list-client.tsx:22-24` | 1 (3 options) | status pill className map → StatusBadge |
| `02-app/app/(dashboard)/projects/clients/[id]/project-workspace.tsx:56-67, 218, 272` | 4 | status pills → StatusBadge; "Saved"/"Failed" inline → `text-success`/`text-destructive` |
| `02-app/app/(dashboard)/projects/missions/[id]/mission-workspace.tsx:166, 213` | 2 | "Saved" → `text-success` |
| `02-app/app/(dashboard)/dna/offers/cards/page.tsx:113, 123` | 2 | inline status pills → StatusBadge |
| `02-app/app/(dashboard)/dna/knowledge-assets/cards/page.tsx:22-23` | 1 (2 options) | status pill className map → StatusBadge |
| `02-app/app/(dashboard)/dna/tone-of-voice/tone-of-voice-view.tsx:135` | 1 | `bg-emerald-50 text-emerald-700` "set" pill → `text-success` styled pill (decide per-context: if it's a status indicator, StatusBadge; if it's decorative, inline `bg-success-bg text-success-foreground` is acceptable) |
| `02-app/app/(dashboard)/inputs/results/results-client.tsx:179` | 1 | `text-green-600` icon+text → `text-success` |
| `02-app/app/(dashboard)/inputs/results/analysis-review-panel.tsx:153-156, 347` | 2 (5 + 1 options) | status pills (completed/in_progress/dropped/recurring + committed) → StatusBadge variants |
| `02-app/app/(dashboard)/inputs/process/process-input-client.tsx:211` | 1 | `text-amber-600` long-text warning → `text-warning` |
| `02-app/app/(dashboard)/inputs/process/category-section.tsx:566, 573` | 2 | match-score warnings → `text-warning` (drop the `text-yellow-600` distinction — it's a 0.85 threshold flag, can be done with opacity or just a single warning state) |
| `02-app/app/(dashboard)/inputs/process/confidence-badge.tsx:4-5` | 1 (2 options) | refactor to consume state tokens (high → success, medium → warning, low → muted) — drop `dark:` overrides |
| `02-app/components/voc-table.tsx:205` | 1 | `text-amber-500` below-min indicator → `text-warning` |
| `02-app/components/ideas-list.tsx:496` | 1 | `text-emerald-600` done status → `text-success` |

**Tag-colour migrations (~30 instances, ~10 files):**

| File | Categories | Migration |
|---|---|---|
| `02-app/components/voc-table.tsx:50-53` | problems, desires, objections, beliefs (4) | replace inline className map with category → tag-hue map; render via `<TypeBadge hue={...} />` |
| `02-app/components/voc-mapping.tsx:25-28` | practical, emotional, psychological, social (4) | as above |
| `02-app/components/create-asset-modal.tsx:32-35` | (same 4 — VOC mapping) | as above; consider extracting the map to a shared util since voc-mapping/create-asset/create-offer all share it |
| `02-app/components/create-offer-modal.tsx:33-36` | (same 4) | as above |
| `02-app/components/entity-outcomes-panel.tsx:27-31` | resources, skills, mindset, relationships, status (5) | as above |
| `02-app/app/(dashboard)/dna/platforms/cards/page.tsx:14-18` | social, email, owned_content, video, audio (5) | as above |
| `02-app/app/(dashboard)/dna/platforms/[id]/platform-detail-view.tsx:59-63` | (same 5) | as above; consider extracting the map to a shared util |
| `02-app/app/(dashboard)/projects/clients/[id]/project-workspace.tsx:63-65` | exploring, synthesising, producing (mission phases — 3) | as above |

**Drop entirely:** all `dark:` colour overrides during migration (Decision 2). The token system is light-only; if dark mode is added later it's a single `globals.css` edit.

## Edge cases

- **Status with no state mapping** — if a feature passes a status string the StatusBadge default options don't recognise, render with neutral styling and warn in dev. Custom options can map any string to any state.
- **Hue collision in adjacent badges** — e.g. an outcome of kind "skills" sitting next to a platform of type "owned_content" would both be hue 6 (olive). Acceptable: badges in different *contexts* (different sections, different rows) using the same hue is fine. Badges in the *same* row that need to be distinguished should use different hues — handled by the per-feature mapping, not by the molecule.
- **Save feedback inside `InlineField`** — currently `text-emerald-600` (line 135). This is the canonical "Saved" treatment and the design-system spec for InlineField references it explicitly. Spec needs a one-line update to say the colour is `--color-success`. Same for the "Failed" colour, which already uses `text-destructive` — keep, but rename to `--color-error` in the spec.
- **`text-yellow-600` vs `text-amber-600`** in `category-section.tsx:573` — currently used as a 0.85-threshold visual distinction. Migration drops this distinction; both become `text-warning`. If the threshold matters, surface it via opacity (`text-warning/70`) or another mechanism, not via a separate hue.

## Out of scope

- **Adding dark mode** — explicitly deferred (Decision 2). All `dark:` prefixes are removed during migration.
- **Changing the existing semantic tokens** (`--primary`, `--muted-foreground`, etc.) — DS-02 only adds new state and tag tokens.
- **`InlineField` refactor** — its spec gets a one-line token-name update (`text-emerald-600` → `text-success`) but no behavioural change.
- **Confidence-badge consolidation into StatusBadge** — `ConfidenceBadge` stays as a separate molecule (different label conventions: HIGH/MED/LOW vs Draft/Active/Archived). It just adopts state tokens internally.
- **Save-pattern coherence** — that's DS-06. DS-02 only fixes the *colour* of "Saved" / "Failed", not when they appear or how the save behaviour works.
- **Other appearance drift** — modal footers, list rows, filter pills, button styling — all outside DS-02 scope. They're DS-05, DS-07.

## Open questions / TBDs

- **Final hex values** — provisional values listed above are mapped to current Tailwind use for minimal visual disruption during migration. Final values to be tuned during build, sampled against `--background` (#F8FAF9) and `--card` (#FFFFFF) and against existing sage `--primary` (#A5C4B2).
- **Per-feature hue mappings** — starting points listed in the Tokens section. Final assignments confirmed during build by visual check (no two adjacent badges in any view should collide hues).
- **`outline` variant on TypeBadge** — included in the spec sketch but uncertain if any current site needs it. If no consumer needs it after migration, drop it.
- **Shared category-hue map utility** — voc-mapping, create-asset-modal, create-offer-modal share the same VOC-mapping kinds → hues map. Question: extract to `lib/voc-mapping-hues.ts` or accept the duplication? Resolve at build time.

## Decisions log

- 2026-04-25: Brief drafted. Triggered by the design-system audit (`00-project-management/foundation-audit-2026-04-25.md`). DS-02 was originally scoped state-only; user pushed back to include category colours since both will be consumed by molecules and deferring would leave the gate inconsistent. Scope expanded to two parallel token systems and two molecules.
- 2026-04-25: Naming decided — index-based (`--color-tag-1`..`-6`) over hue-based for future-proofing. Rationale: token names should be stable across palette changes; hue names go in code comments.
- 2026-04-25: Dark mode dropped (no dark mode story exists for the rest of the app). All `dark:` prefixes removed during migration.
- 2026-04-25: Token shape — paired (`--color-success` + `-bg` + `-foreground`) to match existing `--primary` / `--primary-foreground` convention.
- 2026-04-25: Migration approach — all-in-one. Mechanical edits, drift script catches regressions, partial migration would leave `npm run check:design-system` perpetually noisy.
- 2026-04-25: User-supplied desaturated palette for tag tokens (sympathetic to sage primary).
- 2026-04-25: Brief approved. Scope kept as one (state + tag tokens together). All-in-one migration confirmed. Hue mapping suggestions accepted as-is.
- 2026-04-25: Layout spec confirmed simplified tag tokens — single-role backgrounds (6 tokens, not 18) since user supplied 6 backgrounds. Pill text uses existing `--foreground`. `TypeBadge` `outline` variant dropped. VOC-mapping hue map extracted to shared util.
- 2026-04-25: Build complete. 60+ hardcoded colour instances migrated. Mission phases use tag tokens via PHASE_COLOURS map (interactive but the visual shape stays as existing DropdownMenu pattern; full StatusBadge migration deferred to DS-07 territory). Platform types extracted to `lib/platform-type-hues.ts`. Threshold-colour distinction in dedup indicators (category-section.tsx) dropped — wording carries the meaning. `outcomes/skills/mindset/...` `CATEGORY_COLORS` was dead code in entity-outcomes-panel — removed entirely. `npm run check:design-system` returns zero errors. `npx tsc --noEmit` returns zero new errors. No remaining hardcoded named-Tailwind-colour instances anywhere in `02-app/components/**`, `02-app/app/**`, or `02-app/lib/**`.
