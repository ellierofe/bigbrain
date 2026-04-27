# Foundation Audit — Design System Drift
Date: 2026-04-25
Scope: `02-app/app/(dashboard)/`, `02-app/components/` (organism layer)
Trigger: UX-10 (form controls) brief surfaced broader concern that molecules and templates were not being created during feature builds.

---

## Why this audit exists

UX-10 inventory of form controls revealed ~20 native `<select>` / `<input>` / `<textarea>` / `<input type=range>` uses outside any molecule. The pattern audit (2026-04-24) found 4 layout templates worth codifying. Both pointed to the same upstream concern: **the design system rule "no molecule without a spec, no appearance classes in organisms" is not being enforced during feature builds.**

Three audits were run in parallel to map the full extent of the drift before scoping foundation work:

1. **Appearance-class drift** in organism-layer files
2. **Save-pattern / behavioural drift** across editable surfaces
3. **Component registry alignment + atom-import audit**

This document is the consolidated finding. Each section below summarises one audit.

---

## 1. Appearance-class drift

**Scope checked:** all dashboard pages, all `*-view`, `*-modal`, `*-panel`, `*-list`, `*-table`, `*-section`, `*-card`, `*-area`, `*-sidebar` files. Excludes `02-app/components/ui/*` (atoms) and `inline-field.tsx` (canonical molecule).

**Headline:** 78+ organism files contain appearance classes. 11 distinct drift categories.

### Drift categories (high → low impact)

| # | Category | Files | Worst examples | Suggested molecule |
|---|---|---|---|---|
| 1 | Status / confidence badges (hardcoded green/amber/emerald) | ~18 | `app/(dashboard)/page.tsx:65-66, 160`; `inputs/process/confidence-badge.tsx:1-20` | `StatusBadge` (registered but breaking rules itself) |
| 2 | Filter / toggle pills with conditional active styling | ~8 | `components/ideas-list.tsx:270-294` (filter pills); `ideas-list.tsx:475` (tag badge) | `FilterPill` / `TogglePill` |
| 3 | Modal footers (`flex justify-end gap-2 pt-2`) | ~11 | `archive-platform-modal.tsx:107`; `archive-offer-modal.tsx:18`; all `create-*-modal.tsx` | `ModalFooter` (or extend Modal molecule with `footer?` prop) |
| 4 | List rows (padding, hover, dividers) | ~12 | `ideas-list.tsx:312, 424`; `app/(dashboard)/page.tsx:146, 174` | `ListItem` / `RowItem` |
| 5 | Inline button styling (manual `bg-primary px-2 py-1 hover:...`) | ~15 | `ideas-list.tsx:518`; `top-toolbar.tsx:20, 29` (Button used but overridden); `source-doc-picker.tsx:187` | Use `Button` atom + add `IconButton` molecule |
| 6 | Floating menus / dropdowns (absolute positioning + shadow inline) | ~6 | `ideas-list.tsx:630`; `entity-outcomes-panel.tsx:38`; `mission-workspace.tsx` | `FloatingMenu` / use shadcn `Popover` |
| 7 | Non-token colours (`green-*`, `amber-*`, `emerald-*`, `red-*`) | 46 instances across ~20 files | `app/(dashboard)/page.tsx:65-66`; `ideas-list.tsx:496`; `inline-field.tsx:135` (`text-emerald-600` "Saved" badge); `confidence-badge.tsx` | Add semantic tokens (`--color-success`, `--color-warning`) to design system |
| 8 | Inline save / feedback states | ~4 | `inline-field.tsx:135` hardcoded `text-emerald-600` "Saved" | `SaveFeedback` molecule or token-driven |
| 9 | Hardcoded spacing (`py-3 px-1`, `mt-1`, `w-[480px]`) | 25+ files | `ideas-list.tsx:424`; `inputs/process/results-panel.tsx` (`w-[480px]`) | Establish documented spacing scale |
| 10 | Empty state styling overrides | ~2 | `ideas-list.tsx:307` overrides EmptyState with local styling | Enforce `EmptyState` molecule; add compact variant if needed |
| 11 | Inline dividers (`divide-y divide-border`, `border-b`) | ~8 | `ideas-list.tsx:312, 632` | Use existing `SectionDivider` molecule |

### Hardcoded values summary

- **46 instances** of named Tailwind colours (no semantic tokens defined for success/warning/error)
- **25+ instances** of arbitrary spacing values
- **8+ instances** of hardcoded widths (`w-64`, `w-[480px]`, `w-[220px]`)

### Direct atom imports
Only **1 found** in this scope: `components/modal.tsx` imports from `@/components/ui/dialog` — acceptable because Modal is itself the wrapper molecule. (See section 3 for the broader atom-import picture.)

---

## 2. Save-pattern / behavioural drift

**Scope checked:** every editable surface across DNA pages, modals, lists, tables. Trigger types, feedback, optimistic update strategy.

**Headline:** Nine distinct save patterns coexist. Tone of Voice has four patterns on a single page.

### Save patterns inventory

| Pattern | Trigger | Feedback | Optimistic | Examples |
|---|---|---|---|---|
| A: InlineField (canonical) | onBlur + 500ms debounce | Toast (debounced) + inline "Saved" badge | Yes | `inline-field.tsx:82-85, 147, 166` |
| B: Slider / range | onMouseUp / onTouchEnd | Toast on error; silent on success | Yes | `tone-of-voice-view.tsx:322-323` |
| C: Table cell onBlur | onBlur per cell | Silent | Yes | `tone-of-voice-view.tsx:437, 446, 455` |
| D: Table immediate persist | onChange → save | Toast on error only | Yes | `voc-table.tsx:300, 437-455` |
| E: Direct onChange (no debounce) | onChange immediate | Silent | Yes (local) | `value-proposition-view.tsx:184, 228, 244` (differentiators) |
| F: Add/remove via button | Button click | Toast on error; no success feedback | Yes + revert | `voc-table.tsx:152-170` |
| G: Modal form + submit | Form submit button | Toast (success/error) | No | `create-offer-modal.tsx:316-319`; `create-segment-modal.tsx:53-87` |
| H: Ideas list optimistic | Button click | Toast on error only | Yes + revert | `ideas-list.tsx:99-118, 162-200` |
| I: String list (Enter / Add) | Enter key or button | None | Yes (local) | `string-list-editor.tsx:56-60, 113-115` |

### Drift hotspots

- **Tone of Voice page** — 4 patterns coexist (left sidebar InlineField, dimensions sliders mouseUp, vocab table onBlur silent, samples InlineField). Switching between sections feels like switching apps.
- **Value Proposition** — 2 patterns. Differentiators save on `onChange` with no feedback at all — users cannot tell if their edit persisted.
- **Brand Meaning** — Statement blocks (InlineField with feedback) coexist with raw textareas in value cards (silent save).
- **Creation modals** vs. **post-creation editing** — fundamental mental-model mismatch: creation requires explicit "Generate" button; editing the same fields after creation is silent autosave.

### Technical debt
- **Duplicate debounced-toast logic** in `inline-field.tsx:11-17` and `ideas-list.tsx:10-17` — identical implementations of the same utility.
- No shared error component — some controls show errors via toast, others via inline badge.

### Recommended canonical contract

| Surface | Trigger | Feedback |
|---|---|---|
| Text fields (short + long) | onBlur + 500ms debounce | Inline "Saved" badge + debounced toast |
| Sliders / ranges | onMouseUp / onTouchEnd | Visual pulse (currently silent — too jarring) |
| Tables / lists | onBlur with debounce, OR explicit Save/Cancel inline-edit mode (decide per surface, document) | Match field convention |
| Creation modals | Form submit button | Spinner during async + success/error toast |
| Bulk operations | Explicit button + optimistic UI | Toast + undo where safe |
| Universal rule | — | If you save silently, surface errors loudly. If you confirm success, confirm errors the same way. |

---

## 3. Component registry alignment + atom-import audit

**Headline:** Registry has 51 molecules; design-system spec has only 8. **44 of 51 registered molecules have no spec.** 40 direct atom imports across 23 organism files signal 5–7 missing molecules.

### Registry vs. spec

**Specs exist for:** PageHeader, ContentPane, InlineField, SectionCard, SectionDivider, TabbedPane, InPageNav, PageChrome (8).

**Registered without specs (44):** all overlay molecules (Modal, all Create/Archive modals, IdeasPanel, ChatDrawer, EntityOutcomesPanel, CustomerJourneyPanel, etc.), all switchers (AudienceSegmentSwitcher, PlatformSwitcher, KnowledgeAssetSwitcher, OfferSwitcher), all editor molecules (ExpandableCardList, OrderedCardList, StringListEditor, KeyValueEditor, SourceDocPicker), feedback molecules (EmptyState, PageSkeleton, ConfidenceBadge), form molecules (FormLayout, VocTable, StatusBadge, SourceMaterialsTable, VocMapping), chat molecules (ChatInput, ChatMessage, ToolCallIndicator, PromptStarter, ConversationList), and others.

This is the upstream cause of all the appearance-class drift: when there's no spec to refer to, organisms compose ad-hoc.

### Direct atom imports (organism layer)

Sorted by frequency:

| Atom | Imports | Files |
|---|---|---|
| Button | 20 | segment-detail-view, platform-detail-view, all `create-*-button-root`, brand-meaning-view, tone-of-voice-view, value-proposition-view, `app/(dashboard)/page.tsx`, project-workspace, mission-workspace, project-list-client, missions-list-client, ideas-client, error.tsx |
| Badge | 4 | segment-detail-view, platform-detail-view, audience-segments/cards/page (×2) |
| Textarea | 4 | platform-detail-view, mission-workspace |
| DropdownMenu | 3 | `app/(dashboard)/page.tsx`, mission-workspace, project-workspace |
| Tooltip | 3 | segment-detail-view, platform-detail-view, `app/(dashboard)/page.tsx` |
| Input | 3 | platform-detail-view, mission-workspace, process-input-client |
| Checkbox | 2 | category-section |
| Select | 1 | platform-detail-view |

**Total: 40 imports across 23 files.** Form-control atoms (Input, Textarea, Checkbox, Select) are covered by UX-10. Everything else is uncovered.

### Worst-offender organisms (atoms imported per file)

1. `platform-detail-view.tsx` — 6 atoms (Button, Badge, Select, Tooltip, Input, Textarea)
2. `segment-detail-view.tsx` — 4 atoms
3. `mission-workspace.tsx` — 4 atoms (custom dropdown reimplemented at lines 429–462)
4. `project-workspace.tsx` — 3 atoms (same custom dropdown pattern)

### Missing molecules (excluding form controls in UX-10)

**Tier 1 — high impact:**
- `IconButton` — wraps Button + Tooltip for icon-only actions. Folds in 3 Tooltip imports + many Button imports.
- `PrimaryButton` / `SecondaryButton` — preset compositions for header/section actions.
- `TypeBadge` / refined `StatusBadge` — replaces 4 direct Badge imports + 18 hardcoded inline status pills.
- `ActionMenu` — wraps DropdownMenu for context-aware triggers. Replaces 3 direct imports + 2 custom dropdown implementations.

**Tier 2 — medium:**
- `FormField` — Input/Textarea + label + error/help text composition (covers the cases inside ExpandableCardList where InlineField doesn't fit).
- Audit existing `InlineField` usage — `mission-workspace.tsx:159-171` reimplements inline editing instead of using the molecule.

---

## Cross-cutting observations

1. **The design-system rule has been bypassed for ~85% of registered molecules.** The "no molecule without a spec" gate is not actually gating anything. Whatever process should enforce it (skill, lint, review) is not running or not catching the violation.

2. **Three audits, three views of the same problem.** Appearance drift, save-pattern drift, and atom-import drift all root-cause to: organisms compose atoms directly + style inline, instead of composing molecules that own their styling and behaviour.

3. **No semantic tokens for state colour.** The 46 hardcoded `green-*` / `amber-*` / `emerald-*` instances would all be one-line fixes if `--color-success` / `--color-warning` / `--color-error` existed.

4. **UX-10 (form controls) is correctly scoped** — but it's one slice of a broader foundation gap. Form-control molecules consume tokens that don't exist yet, so UX-10 should follow token work, not precede it.

---

## Recommended foundation programme (sequence)

1. **DS-FOUNDATION-1: Token system + status molecules.** Define `--color-success`, `--color-warning`, `--color-error`, `--color-info` semantic tokens. Build/finish `StatusBadge`. Replace 46 hardcoded colour instances. Highest leverage, lowest risk.
2. **DS-FOUNDATION-2: Spec backfill.** Write specs for the 44 unspecified molecules. Documentation work but unblocks gate enforcement going forward.
3. **DS-FOUNDATION-3: Button composition.** `IconButton`, `PrimaryButton`, `SecondaryButton`. Migrate 20 organism Button imports.
4. **UX-10 (as scoped).** Form controls: SelectField, InlineCellSelect, SliderField, CheckboxField. Unblocks DNA-09.
5. **DS-FOUNDATION-4: Save contract.** Define and document canonical patterns. Migrate Value Proposition + Tone of Voice.
6. **DS-FOUNDATION-5: Modal / list / popover molecules.** `ModalFooter`, `ListItem`, `FloatingMenu`. Bulk migration.

**Open question before any of this starts:** why is the gate being skipped during feature builds? If we don't fix that root cause, the drift will return after the foundation work lands. Worth a retro on recent feature builds before scoping the foundation backlog further.
