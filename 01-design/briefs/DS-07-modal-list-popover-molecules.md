# DS-07: Modal / list / popover / status molecules — final foundation leg
Feature ID: DS-07
Status: approved
Last updated: 2026-04-27

## Summary

Last leg of the foundation programme. Closes the remaining 20 direct atom imports across 10 organism files by introducing the structural and overlay molecules the audit identified, plus unifying the three near-identical archive modals. After this ticket, the design-system coherence check reports zero atom imports in organisms (the only remaining warning is `AddSamplesModal` missing a spec — DS-03 carryover).

Six new molecules ship: `FloatingMenu` (popover chrome — used internally by `StatusBadge` and `ActionMenu`), `ActionMenu` (DropdownMenu wrapper), `ListItem` (opinionated list-row shell), `FilterPill` + `FilterPillGroup` (filter-pill pattern), and `ArchiveItemModal` (replaces 3 archive modals). Two existing surfaces migrate to the existing `StatusBadge`: mission-workspace phase picker, project-workspace status picker. `ModalFooter` lands as a `footer?: ReactNode` slot on the existing `Modal` molecule (not a separate molecule). EmptyState and SectionDivider usage is enforced across remaining list and section sites.

This is the structural counterpart to DS-02 (token unification), DS-05 (button molecules), and DS-06 (save contract) — same drift pattern (organisms reinventing shared chrome), different surface area.

## Why this matters

- **Closes the foundation programme.** DS-01 through DS-06, DS-08, DS-09 are done. DS-07 is the only outstanding ticket. The coherence check warning ("10 organism files contain 20 direct atom imports") becomes zero after this.
- **One source of truth for popover chrome.** Today, click-outside handling, raised shadow, escape-key dismissal, and absolute positioning are reimplemented in 5 places (`mission-workspace`, `project-workspace`, `ideas-list`, `entity-outcomes-panel`, `status-badge` itself). Centralising in `FloatingMenu` means popover behaviour changes happen once, not five times.
- **Eliminates the three archive modals.** `archive-platform-modal`, `archive-offer-modal`, `archive-segment-modal` are 99% identical (same state machine, same dependency-check flow, same UI). Unifying them removes ~250 lines of duplication and locks the archive UX so future archive flows (clients, missions, ideas) use the same molecule.
- **Locks list-row consistency.** `ListItem` becomes opinionated on padding, hover, and divider tokens. Today's row-level variation (compact vs spacious, hover vs no hover, dividers vs none) is drift, not intent — the migration resolves it.
- **Status pickers stop being bespoke dropdowns.** Mission phase and project status are the *only* actions on those triggers. `StatusBadge` is the right molecule (status picking is its dedicated affordance); the current DropdownMenu+Button+span composition is generic-dropdown drift.

## Use cases

Not user-facing as a feature. The user-visible effects:

- Mission-workspace phase picker and project-workspace status picker render as `StatusBadge` pills with state-tinted backgrounds (success/warning/info/neutral) — visually identical to status pills elsewhere in the app.
- All popovers (StatusBadge dropdown, ActionMenu, list-row overflow menus) share one set of chrome behaviours: open-on-click, click-outside dismisses, escape dismisses, raised shadow, token-driven background.
- The three archive flows (platform, offer, segment) become visually and behaviourally identical (modulo the entity-specific copy strings) — same dependency-check, same confirmation, same buttons, same spinner states.
- Filter pill groups in `ideas-list` (status + type) become consistent with any future filter pill group built later.
- All modals get a footer slot — no more bespoke `flex justify-end gap-2 pt-2` rows scattered across 11 files.

## User journey

Pure UI/refactor work; no journey changes. Three migrations have small visual deltas:

1. **Mission-workspace phase picker.** Currently a `Button variant="outline"` with a coloured pill inside it that says "Phase" alongside the current phase name. After: a `StatusBadge` pill that *is* the current phase (no separate "Phase" label). Visual is more compact and matches every other status pill.
2. **Project-workspace status picker.** Same transformation; same visual delta.
3. **Ideas-list filter pills.** Same visual; behaviour unchanged. Just composes from the molecule.

## Molecules introduced

### `FloatingMenu`

Popover chrome: positioned overlay, raised shadow, click-outside-dismiss, escape-key-dismiss, focus-on-open. Used internally by StatusBadge (refactored) and ActionMenu (new). Available for direct use in any popover surface.

**Props:**
- `open: boolean`
- `onOpenChange: (open: boolean) => void`
- `trigger: ReactNode` — rendered inside a wrapping element with relative positioning
- `children: ReactNode` — popover contents
- `align?: 'start' | 'end'` — defaults to `'start'`. Horizontal alignment of popover relative to trigger.
- `side?: 'top' | 'bottom'` — defaults to `'bottom'`. Vertical placement.
- `minWidth?: string` — optional CSS width override; defaults to fitting content.

**Visual treatment:**
- `absolute` positioning relative to trigger wrapper
- `border-border bg-card shadow-[var(--shadow-raised)] rounded-md py-1`
- z-index: `z-50`
- All tokens, no hardcoded colours

**Behaviour:**
- Click outside (anywhere not inside the menu or trigger): close
- Escape key: close + return focus to trigger
- Trigger click toggles open/closed
- When open, first focusable child receives focus

**Decision log entry:** This is the minimum opinionated wrapper. We're not using shadcn's `Popover` directly because (a) we want our token-driven chrome baked in, (b) we want the click-outside + escape behaviour standardised across StatusBadge, ActionMenu, and any future popover, (c) thin abstraction means future swap to shadcn Popover is trivial if needed.

### `ActionMenu`

Dropdown menu for context-aware actions. Wraps `FloatingMenu` + a styled trigger button. Replaces the bespoke DropdownMenu+Button composition currently in `app/(dashboard)/page.tsx`. Single consumer at ship time, but the molecule locks the pattern for future overflow menus.

**Props:**
- `trigger: ReactNode` — typically an `IconButton` (DS-05) or icon
- `items: ActionMenuItem[]` — see below
- `align?: 'start' | 'end'` — defaults to `'end'`

**ActionMenuItem:**
```ts
type ActionMenuItem =
  | { type: 'action'; label: string; icon?: LucideIcon; onClick: () => void; destructive?: boolean }
  | { type: 'link'; label: string; icon?: LucideIcon; href: string }
  | { type: 'divider' }
```

**Visual treatment:**
- Items: `flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted`
- Destructive items: `text-destructive`
- Dividers: `h-px bg-border my-1`

### `StatusBadge` (existing — small refactor only)

Already exists at `02-app/components/status-badge.tsx`. Two changes:

1. **Refactored to use `FloatingMenu`** for the popover chrome. Removes the inline `useEffect` click-outside handler and the inline `<div className="absolute top-full ...">` block.
2. **Migration consumers added.** Mission-workspace and project-workspace currently use a DropdownMenu; switch them to `StatusBadge` with appropriate `options` arrays.

**Status options to wire up:**

Project (clients):
```ts
[
  { value: 'active',    label: 'Active',    state: 'success'  },
  { value: 'paused',    label: 'Paused',    state: 'warning'  },
  { value: 'complete',  label: 'Complete',  state: 'info'     },
  { value: 'archived',  label: 'Archived',  state: 'neutral'  },
]
```

Mission (phase — same molecule, different field):
```ts
[
  { value: 'exploring',     label: 'Exploring',     state: 'info'     },
  { value: 'synthesising',  label: 'Synthesising',  state: 'info'     },
  { value: 'producing',     label: 'Producing',     state: 'success'  },
  { value: 'complete',      label: 'Complete',      state: 'success'  },
  { value: 'paused',        label: 'Paused',        state: 'warning'  },
]
```

Mission state mapping decision deferred to layout-design — `info`/`info`/`success`/`success`/`warning` is a reasonable first cut (active progress = info, terminal = success, blocked = warning) but worth a 30-second eye-check before locking.

### `ListItem`

Opinionated list-row shell. Owns padding, hover, divider tokens. Composes `leading`, `children`, `trailing` slots — consumers control the row contents, not the chrome.

**Props:**
- `leading?: ReactNode` — left-aligned slot (icon, status indicator)
- `children: ReactNode` — main content (always horizontally flexible)
- `trailing?: ReactNode` — right-aligned slot (action button, count, chevron)
- `onClick?: () => void` — if provided, row is interactive (cursor + hover bg)
- `density?: 'compact' | 'default'` — defaults to `'default'`. Compact = `py-1.5 px-2`; default = `py-3 px-3`.
- `divider?: boolean` — defaults to `true`. Renders `border-b border-border` on the row.

**Visual treatment (defaults):**
- Default: `flex items-center gap-3 py-3 px-3 border-b border-border`
- Interactive (when `onClick` provided): `hover:bg-muted/50 cursor-pointer transition-colors`
- Compact: same but `py-1.5 px-2`

**Decision log entry:** ListItem is opinionated by design — list-row variance today is drift, not intent. The `density` prop exists because some lists genuinely benefit from compact rows (sidebars, dense data lists), but the default carries everyone else. No `padding` or `hover` overrides accepted in the API; consumers that need that should use a custom row composition, not `ListItem` with appearance overrides.

**Migration sites (~12 expected, exact count confirmed at layout-design):**
- `ideas-list.tsx` (idea row, tag row)
- `app/(dashboard)/page.tsx` (recent items rows)
- `entity-outcomes-panel.tsx`
- `customer-journey-panel.tsx` (potentially)
- Various dashboard list previews

### `FilterPill`

Visual pill atom for filter groups. Single button with optional leading icon, label, optional count badge.

**Props:**
- `label: string`
- `count?: number` — rendered to the right of the label, smaller and dimmer
- `icon?: LucideIcon` — rendered before the label
- `active: boolean`
- `onClick: () => void`

**Visual treatment:**
- Active: `bg-primary text-primary-foreground`
- Inactive: `bg-secondary text-secondary-foreground hover:bg-secondary/80`
- Shape: `rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors`
- Icon: `h-3 w-3`
- Count: `text-[11px]` with `opacity-70` (active) / `opacity-50` (inactive)

### `FilterPillGroup`

State container for a group of `FilterPill`s. Single-select among options. Renders an optional label on the left + the pills.

**Props:**
- `label?: string` — uppercase tracking-wide muted label (e.g. "Status", "Type")
- `value: string` — currently selected pill value
- `onChange: (value: string) => void`
- `options: FilterPillOption[]` — `{ value: string; label: string; count?: number; icon?: LucideIcon }[]`

**Visual treatment:**
- Row: `flex items-center gap-1.5`
- Label: `text-[11px] font-medium uppercase tracking-wide text-muted-foreground w-12 shrink-0`
- Pills container: `flex gap-1`

**Migration sites:**
- `ideas-list.tsx:252-294` (status group + type group)
- Potential future: any list with a single-select filter row

### `ArchiveItemModal`

Configurable confirmation modal for archive flows. Replaces `archive-platform-modal`, `archive-offer-modal`, `archive-segment-modal`.

**Props:**
- `open: boolean`
- `onOpenChange: (open: boolean) => void`
- `itemName: string` — used in title and copy
- `itemType: string` — singular, lowercase ("channel", "offer", "segment") — used in copy
- `dependencyCheck: () => Promise<{ ok: true; dependents: { name: string; type: string }[] } | { ok: false; error: string }>`
- `onConfirm: () => Promise<{ ok: true; nextId?: string | null } | { ok: false; error: string }>`
- `onArchived?: (nextId: string | null) => void` — optional callback after successful archive (for navigation)
- `dependentsCopy?: { withDependents: string; withoutDependents: string }` — optional override for the two body-copy strings; defaults provided

**State machine** (preserves existing pattern):
- `phase: 'checking'` — runs `dependencyCheck()` on open
- `phase: 'confirm'` — shows confirmation UI; if `dependents.length > 0`, shows the dependents list
- `phase: 'archiving'` — running `onConfirm()`

**Visual treatment:**
- Wraps the existing `Modal` molecule (`size="md"`)
- Footer rendered via Modal's new `footer?` slot (see ModalFooter section below) — Cancel + Archive buttons
- Body copy varies by `itemType` and dependency state
- Spinner / "Checking…" / "Archiving…" intermediate states preserved

**Decision log entry:** Three call sites (platform, offer, segment) ship as the migration; the molecule's API is general enough to absorb future archive flows (clients, missions, ideas) without API changes.

### `Modal` extension — `footer?: ReactNode` slot (not a new molecule)

Per Q6 resolution, no separate `ModalFooter` molecule. The existing `Modal` gains:

- `footer?: ReactNode` — optional slot. When provided, rendered with the canonical `flex justify-end gap-2 pt-2 border-t border-border` chrome (or no border-top — confirm at layout-design).
- Existing modal callers that still want full control of the bottom area can omit `footer` and continue rendering inside `children` — but the migration moves all 11 modal files to use the slot.

**Migration sites:**
- `form-layout.tsx`
- `create-segment-modal.tsx`
- `create-mission-modal.tsx`
- `create-offer-modal.tsx`
- `create-platform-modal.tsx`
- `create-project-modal.tsx`
- `create-application-modal.tsx`
- `archive-platform-modal.tsx` → folded into `ArchiveItemModal`
- `archive-offer-modal.tsx` → folded into `ArchiveItemModal`
- `archive-segment-modal.tsx` → folded into `ArchiveItemModal`
- `customer-journey-panel.tsx` (if it's a modal-shaped surface — verify at layout-design)
- `project-workspace.tsx` (the modal embedded there — verify)

## Migration scope

### Files touched (full list — confirm at layout-design):

**Status picker migrations (`StatusBadge`):**
- `app/(dashboard)/projects/missions/[id]/mission-workspace.tsx` — replaces lines 178–202 (DropdownMenu) with `StatusBadge`. Removes Button + DropdownMenu* imports.
- `app/(dashboard)/projects/clients/[id]/project-workspace.tsx` — replaces lines 234–251 with `StatusBadge`. Removes the `statusBadge` lookup map (lines 59-64) — colour mapping moves into the `options` array `state` field.

**ActionMenu migration:**
- `app/(dashboard)/page.tsx` — replaces DropdownMenu at lines 178–202 with `ActionMenu`. Removes Button, Tooltip, DropdownMenu* imports.

**Modal footer slot migrations:**
- 8 create/form modals + 1 panel + 2 workspace embedded modals (verify count at layout-design). Each replaces `<div className="flex justify-end gap-2 pt-2">...</div>` with `footer={...}` prop.

**ArchiveItemModal migrations:**
- Delete: `archive-platform-modal.tsx`, `archive-offer-modal.tsx`, `archive-segment-modal.tsx` (collectively ~370 lines).
- Add: `archive-item-modal.tsx` (~150 lines).
- Update call sites: any page that currently renders one of the three archive modals.

**ListItem migrations (~12 sites — confirm at layout-design):**
- `ideas-list.tsx` (idea rows, tag rows)
- `app/(dashboard)/page.tsx` (recent activity rows)
- `entity-outcomes-panel.tsx`
- Other dashboard list previews per audit § 1 row 4

**FilterPillGroup migrations:**
- `ideas-list.tsx:252-294` (status group + type group)

**FloatingMenu adoption:**
- Refactor `status-badge.tsx` to compose `FloatingMenu` instead of inline absolute-positioned div + click-outside hook
- Used internally by new `ActionMenu`

**EmptyState / SectionDivider enforcement (per audit § 1 rows 10, 11):**
- Audit `ideas-list.tsx:307` (current EmptyState override)
- Audit `ideas-list.tsx:312, 632` (inline dividers)
- Replace with canonical molecules where appropriate

### Out-of-scope migrations (confirmed)

- Pre-existing `Trash2` import error in `knowledge-asset-detail-view.tsx:586` — fix when next touching that file
- `KnowledgeAssetDetailView` move to organism layer — separate ticket
- Multi-tag input molecule for verticals (CreateMissionModal) — future ticket
- `AddSamplesModal` spec backfill — DS-03 carryover, not DS-07's job
- DropdownMenu atom itself — stays in `02-app/components/ui/`; only its direct organism imports get folded into ActionMenu/StatusBadge
- Customer-journey-panel internal structure — only its modal footer migrates if it has one

## Update behaviour

Not applicable — refactor + new molecules + documentation work.

## Relationships

### Knowledge graph (FalkorDB)
None.

### Postgres
None — but `ArchiveItemModal` consumes existing archive server actions unchanged (`checkAndArchive*`, `confirmArchive*`).

## UI/UX notes

**Template check:** No applicable template found — DS-07 is foundation/refactor work, not a feature pattern. The template registry covers feature-level navigation patterns (plural item, workspace, tab master-detail). Molecule-layer foundation work establishes specs in `design-system.md`, which is the template-equivalent at this layer. Same as DS-02 through DS-06.

Layout spec to be produced via `layout-design` skill at `01-design/wireframes/DS-07-layout.md`. Most molecules are simple enough that layout-design can run light (similar to DS-06).

Items the layout-design pass needs to resolve:

- Final visual treatment of `FloatingMenu` (border, shadow, padding) — propose using existing `--shadow-raised` token + `border-border` + `py-1`
- Whether `Modal` footer slot has a `border-t` separator or not — propose: yes, with `pt-2` for breathing room
- `ListItem` density default — propose: `default` (py-3) is the right baseline; compact is opt-in
- Mission phase state mapping — `exploring`/`synthesising` both `info`? Or differentiate?
- `ArchiveItemModal` default copy strings — confirm wording

## Edge cases

- **`FloatingMenu` click-outside fires when popover is closed.** Cleanup: only attach the listener when `open === true`.
- **`FloatingMenu` escape key while textarea inside is focused.** Decision: escape always closes the menu; if the consumer wants to trap escape (textarea Esc-to-cancel), they handle it before the listener fires (stop propagation).
- **`StatusBadge` while save in flight.** Existing molecule already handles `pending` state (button disabled, `opacity-60`). Preserve.
- **`ArchiveItemModal` dependency check fails.** Existing pattern: toast.error + close modal. Preserve.
- **`ArchiveItemModal` archive succeeds with no `nextId`.** Caller decides where to navigate — the molecule passes the result to `onArchived` and lets the caller route.
- **`ListItem` with no `leading` and no `trailing`.** Just renders children with the row chrome. No special-case.
- **`FilterPillGroup` with no `value` matching options.** Defensively render no active state; first interaction sets a value.
- **Modal opened with `footer` undefined.** Renders normally with no footer chrome — backward compatible with existing callers that haven't migrated yet.
- **Click-outside fires on a nested modal/popover.** When two FloatingMenus are open simultaneously (hypothetical), the inner one should not close the outer. Use `event.target` check against `ref.current` (existing StatusBadge pattern preserves correct behaviour for nested case).

## Out of scope

- Building shadcn `Popover`-equivalent flexibility into `FloatingMenu`. It's a thin token-driven wrapper, not a positioning engine. No `align="center"`, no collision detection, no portal rendering. If we ever need those, swap the implementation.
- Animating `FloatingMenu` open/close. Today's behaviour is instant (no transition). Don't add transitions in this ticket — separate visual-polish concern.
- `ListItem` selectable variant (checkbox + multi-select). Not used today; build when first needed.
- Multi-select `FilterPillGroup`. Today's pattern is single-select; multi-select can come as a separate variant later.
- Migrating `string-list-editor.tsx` rows to `ListItem`. Its UX (click-to-edit + Enter/Escape commit) is a different contract — covered in DS-06's deferred-list note. Future ticket if alignment becomes desirable.
- New archive flows (clients, missions, ideas) — `ArchiveItemModal` is general enough to absorb them, but wiring them up is feature-level work, not foundation.
- `Tooltip` molecule. Today the only direct Tooltip import is in `app/(dashboard)/page.tsx` — folded into `ActionMenu`. If a free-standing tooltip molecule becomes necessary, build it then.
- `IconButton`-only refactors not on the DS-07 path. DS-05 already covered button molecules; this ticket doesn't revisit.

## Open questions / TBDs

1. **Mission phase state mapping** — `exploring`/`synthesising` both as `info`, or differentiate (e.g. `exploring` = `info`, `synthesising` = `warning`)? Decide at layout-design.
2. **Modal footer separator** — `border-t` or no separator? Propose `border-t border-border pt-2` for visual hierarchy. Confirm at layout-design.
3. **`ListItem` exact density values** — propose `py-3 px-3` (default) and `py-1.5 px-2` (compact). Confirm at layout-design after sampling current row sites.
4. **`ArchiveItemModal` default copy strings** — exact wording for "with dependents" and "without dependents" body text. Currently each archive modal has slightly different phrasing; pick one canonical.
5. **`FloatingMenu` initial focus behaviour** — focus first item on open (keyboard-accessible) or no auto-focus (click-driven UX)? Propose: auto-focus first item only if menu was opened via keyboard (tracked by listening for the trigger's keydown event); otherwise no auto-focus. Investigate at layout-design.
6. **`customer-journey-panel.tsx` and `project-workspace.tsx` modal references** — verify at layout-design which of the 11 footer-pattern files are actual modals vs panels with similar chrome.

## Decisions log

- 2026-04-27: Brief drafted. Source: foundation audit § 1, 3 + handoff from DS-06 build session.
- 2026-04-27: Q1 scope — expanded scope confirmed (StatusBadge migrations + ActionMenu + FloatingMenu + ListItem + FilterPill/FilterPillGroup + Modal footer slot + ArchiveItemModal unification + EmptyState/SectionDivider enforcement check).
- 2026-04-27: Q2 — `ActionMenu` built despite single consumer to lock the pattern for future overflow menus.
- 2026-04-27: Q3 — `StatusBadge` refactored to compose `FloatingMenu` (option (c)). Avoids two sources of truth for popover behaviour.
- 2026-04-27: Q4 — `FilterPill` (visual atom) + `FilterPillGroup` (state container) ship as two molecules. Group owns single-select state.
- 2026-04-27: Q5 — `ListItem` is opinionated on padding/hover/divider tokens. Variance today is drift, not intent. `density` prop accommodates compact lists; no other API knobs accepted.
- 2026-04-27: Q6 — `ModalFooter` is a `footer?: ReactNode` slot on the existing `Modal` molecule, not a separate molecule.
- 2026-04-27: Q7 — completeness target: zero atom imports in organisms after DS-07 lands; only remaining warning is `AddSamplesModal` missing spec (DS-03 carryover).
- 2026-04-27: Q8 — Status options confirmed: project = Active/Paused/Complete/Archived (success/warning/info/neutral); mission phase = Exploring/Synthesising/Producing/Complete/Paused. State mapping for missions deferred to layout-design.
- 2026-04-27: Q9 — `ArchiveItemModal` unification added to DS-07 scope (was previously parked as a separate follow-up). Bundling is efficient since it touches the same modal files as the footer slot work.
- 2026-04-27: Brief approved.
- 2026-04-27: Layout spec approved (`01-design/wireframes/DS-07-layout.md`). Two decisions baked in beyond the brief: (1) mission phases use `TypeBadge`'s tag hue palette instead of the status state palette — phases are categorical, not health signals. Requires extending `StatusBadge` with a `'tag'` option variant (`hue: 1-8` instead of `state: 'success' | ...`). Project status continues using semantic state palette. (2) `SectionDivider` enforcement scope narrowed — `divide-y divide-border` on list containers stays; SectionDivider is for *section* boundaries, not item boundaries.

## Backlog status changes (on completion)

- DS-07 → done
- Add to backlog: any deferred items surfaced at layout-design (e.g. multi-select FilterPillGroup if needed)

## Pre-conditions and dependencies

- DS-02 (semantic tokens), DS-03 (spec backfill), DS-05 (button molecules), DS-06 (save contract): all done.
- No outstanding blocker.
- Foundation audit `00-project-management/foundation-audit-2026-04-25.md` § 1 and § 3 are the source of truth for scope.

## Hard gate checklist before `layout-design`

- [x] All primary use cases covered (refactor + 6 new molecules + 1 modal extension)
- [x] User journey delta documented (3 visual deltas: mission phase picker, project status picker, ideas-list filter pills — all minor)
- [x] All molecule props specified
- [x] Update behaviour: N/A (refactor)
- [x] Graph and DB relationships: N/A
- [x] Edge cases enumerated
- [x] Out of scope explicit
- [x] Open TBDs flagged for layout-design resolution
