# DS-07 — Modal / list / popover / status molecules: layout spec

Feature ID: DS-07
Status: approved (2026-04-27)
Brief: `01-design/briefs/DS-07-modal-list-popover-molecules.md` (approved 2026-04-27)

## Scope

Foundation work, not a feature. The layout artefacts are:

1. Six new molecules — `FloatingMenu`, `ActionMenu`, `ListItem`, `FilterPill`, `FilterPillGroup`, `ArchiveItemModal` — with full specs.
2. One existing molecule refactor — `StatusBadge` rebuilt on top of `FloatingMenu`. No external API change.
3. One existing molecule extension — `Modal` gains a `footer?: ReactNode` slot. Backward-compatible.
4. Migrations — 5 status pickers, 1 ActionMenu, ~12 list rows, ~10 modal footers, 3 archive flows, 2 filter pill groups, 5 floating-menu adoption sites.
5. EmptyState / SectionDivider enforcement check on `ideas-list.tsx`.

No new views, routes, drawers, or feature surfaces.

## Foundation order (build sequence)

The molecules form a small dependency tree. Build order matters:

```
FloatingMenu        ────┬──→ StatusBadge refactor ──→ mission/project workspace migrations
                        ├──→ ActionMenu          ──→ dashboard NewInputDropdown migration
                        └──→ (entity-outcomes-panel, mission-workspace add-menus, etc.)

Modal footer slot   ────────→ all create-* / archive-* / customer-journey-panel modals
                          └─→ ArchiveItemModal ──→ replaces 3 archive-*-modal files

ListItem            ────────→ ideas-list, dashboard mission row, recent-items rows

FilterPill          ────┬──→ FilterPillGroup ──→ ideas-list status + type groups
                        └──→ (also usable standalone for future surfaces)
```

Six independent molecule subtrees. Build can flow molecule → migration → next molecule, or build all six molecules first and migrate at the end. Recommendation: each molecule + its migrations as one cohesive vertical, in the order above. FloatingMenu first because three other molecules depend on it.

## Molecule specs

---

### `FloatingMenu`

**File:** `02-app/components/floating-menu.tsx`
**Purpose:** Token-driven popover container. Owns positioning, raised shadow, click-outside dismissal, escape-key dismissal. Used internally by `StatusBadge` (after refactor) and `ActionMenu` (new). Available for direct use anywhere a popover is the right pattern. Distinct from shadcn `Popover` — thinner, no portal, no collision detection, no animation. Swap to shadcn Popover later if those needs arise.

**Anatomy:**
- Outer wrapper: `<div className="relative inline-flex">` (when trigger is inline) or `<div className="relative">` (when trigger is block).
- Trigger: rendered as-is via `trigger` prop. Wrapping is the consumer's responsibility for keyboard semantics; FloatingMenu does not inject `aria-haspopup` or `aria-expanded` (the trigger element does, since it's the consumer's choice of element).
- Popover panel (when `open === true`): `absolute z-50 mt-1 rounded-md border border-border bg-card shadow-[var(--shadow-raised)] py-1`.
  - `align="start"` (default): `left-0`.
  - `align="end"`: `right-0`.
  - `side="bottom"` (default): `top-full`.
  - `side="top"`: `bottom-full mb-1` (overrides `mt-1`).
- Content: rendered via `children`. The molecule does NOT impose item styling — `ActionMenu` and `StatusBadge` provide their own item chrome.

**Behavioural states:**
- **Closed:** trigger only; popover panel not rendered.
- **Open:** popover panel rendered; click-outside listener active; escape listener active.
- **Closing:** instant (no transition).

**Click-outside behaviour:**
- Listener attached on `mousedown` (matches existing StatusBadge pattern).
- Listener attached only when `open === true` (effect dependency).
- Click target must be outside `containerRef.current` (the relative wrapper). Click on trigger toggles via the trigger's own onClick — do NOT also fire close from outside-click for the trigger itself.

**Escape behaviour:**
- `keydown` listener on `document`, attached only when open.
- On `Escape`: `onOpenChange(false)`. Focus returns to whatever had focus before open (default browser behaviour after focus trap exits — no explicit return needed because no trap is added).

**Initial focus (TBD #5 resolved):**
- **No automatic initial focus.** When the menu opens, focus stays on the trigger.
- Rationale: today's usage is overwhelmingly mouse-driven (status pickers, dropdown menus). Auto-focusing the first item creates jumpy keyboard behaviour for mouse users (visible focus ring appears, then disappears on next mouse move). Keyboard users can `Tab` into the menu — the popover is a sibling element after the trigger in DOM order, so `Tab` lands on the first interactive child naturally.
- **Keep this simple in v1.** If a future surface needs roving focus / arrow-key navigation, build it then. ActionMenu and StatusBadge as designed do not need it.

**Edge cases:**
- **Nested FloatingMenus:** outer menu has its own `containerRef`; clicks inside the inner menu are inside the outer ref too, so neither closes the other inadvertently. Click outside both closes both via each listener.
- **Trigger and panel both consume keyboard events:** trigger Enter/Space toggles; Escape inside panel closes. No conflict.
- **Open prop changes via parent:** standard controlled component — listener re-attaches on `open` change.

**Props:**
```ts
interface FloatingMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: React.ReactNode
  children: React.ReactNode
  align?: 'start' | 'end'   // default 'start'
  side?: 'bottom' | 'top'   // default 'bottom'
  minWidth?: string         // optional, e.g. '120px' or '12rem'
  className?: string        // applied to the popover panel only
}
```

**Do not:**
- Add a portal — keep the popover in-DOM next to the trigger. If positioning context becomes a real problem later, migrate to shadcn `Popover` rather than reinventing.
- Add open/close transitions in v1 — instant matches existing StatusBadge feel.
- Inject `aria-haspopup` / `aria-expanded` on the trigger — the consumer renders the trigger element and is responsible for its semantics.
- Use `<button>` as the wrapper — it must be a `<div>` so the trigger element retains its own role (button, link, etc.).

---

### `ActionMenu`

**File:** `02-app/components/action-menu.tsx`
**Purpose:** Generic context-action dropdown menu. Wraps `FloatingMenu` with item chrome (links, actions, dividers, disabled state, optional icons). Replaces the bespoke `DropdownMenu` + `DropdownMenuContent` + `DropdownMenuItem` composition. Single consumer at ship time (`NewInputDropdown` in `app/(dashboard)/page.tsx`); locks the pattern for future overflow menus.

**Anatomy:**
- Wraps `FloatingMenu` (passes through `align`, `side`, `minWidth`, `open`, `onOpenChange`, `trigger`).
- Item rendering controlled by the molecule, not the consumer:
  - Action item: `<button type="button" onClick={...} className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted transition-colors">`. With icon: `<Icon className="h-3.5 w-3.5 text-muted-foreground" />` left of label. Destructive variant: `text-destructive hover:bg-destructive/10`.
  - Link item: same chrome, rendered via `<Link>` (Next.js). Opens via standard navigation; closes the menu via `onOpenChange(false)` on click.
  - Disabled item: same chrome, `opacity-50 cursor-not-allowed`, click is a no-op. Optional `hint` (right-aligned suffix string, e.g. "Soon"): `<span className="ml-auto text-[10px] text-muted-foreground">{hint}</span>`.
  - Divider: `<div className="h-px bg-border my-1" />`.

**Behavioural states:**
- **Closed:** trigger only.
- **Open:** items rendered inside `FloatingMenu`. Each item is independently hoverable / focusable.
- **Item hover:** `hover:bg-muted` (or `hover:bg-destructive/10` for destructive).
- **Item active (mouse down):** browser default; no special chrome.
- **Item disabled:** non-interactive, opacity reduced.

**Edge cases:**
- **Click on link item:** `onOpenChange(false)` fires synchronously before navigation. Standard Next.js client-side navigation handles the rest.
- **Click on disabled item:** click handler not attached. Visually present but inert.
- **No items:** popover renders empty (consumer's bug). Don't add a placeholder.

**Props:**
```ts
type ActionMenuItem =
  | { type: 'action'; label: string; icon?: LucideIcon; onClick: () => void; destructive?: boolean }
  | { type: 'link';   label: string; icon?: LucideIcon; href: string }
  | { type: 'disabled'; label: string; icon?: LucideIcon; hint?: string }
  | { type: 'divider' }

interface ActionMenuProps {
  trigger: React.ReactNode
  items: ActionMenuItem[]
  align?: 'start' | 'end'   // default 'end' (action menus typically right-aligned)
  side?: 'bottom' | 'top'   // default 'bottom'
  minWidth?: string         // default '12rem'
}
```

**Internal state:** `useState<boolean>` for open/close. Consumer passes a stateless trigger; ActionMenu owns the open state. (Distinct from FloatingMenu, which is fully controlled — ActionMenu is a sealed unit.)

**Do not:**
- Expose `FloatingMenu` props the consumer shouldn't need (e.g. `className` on the panel — items have fixed chrome).
- Add a "checked" item variant — use `StatusBadge` for status-style selection, not ActionMenu.
- Add roving keyboard focus — same v1 reasoning as FloatingMenu.

---

### `StatusBadge` (refactor — no external API change)

Existing molecule at `02-app/components/status-badge.tsx`. Refactor scope:

- Replaces the inline `useEffect` click-outside handler with composition of `FloatingMenu`.
- Replaces the inline absolute-positioned `<div>` with `FloatingMenu`'s panel.
- The pill button (the trigger), the option list (the contents), and the state-driven background classes stay exactly as today.
- External props (`status`, `onChange`, `options`) unchanged.

**After-refactor anatomy:**
```tsx
<FloatingMenu
  open={open}
  onOpenChange={setOpen}
  align="start"
  minWidth="120px"
  trigger={
    <button
      type="button"
      onClick={() => setOpen(!open)}
      disabled={pending}
      aria-haspopup="listbox"
      aria-expanded={open}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-opacity ${stateClass[current.state]} ${pending ? 'opacity-60' : 'hover:opacity-80 cursor-pointer'}`}
    >
      {current.label}
      <ChevronDown className="h-3 w-3" />
    </button>
  }
>
  {options.filter(o => o.value !== status).map(option => (
    <button key={option.value} type="button" onClick={() => handleSelect(option.value)} className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted transition-colors">
      <span className={`inline-block h-2 w-2 rounded-full ${dotClass[option.state]}`} />
      {option.label}
    </button>
  ))}
</FloatingMenu>
```

The inline `useEffect` for click-outside (currently lines 50-58) and the inline panel div (currently lines 80-96) are deleted. Net: ~25 lines removed, same behaviour.

**Spec entry update in `design-system.md`:** the `### StatusBadge` section gets a note: "Composes `FloatingMenu` for popover chrome." No other changes.

---

### `Modal` extension — `footer?: ReactNode` slot

Existing molecule at `02-app/components/modal.tsx`. Extension scope:

- Add `footer?: React.ReactNode` to props.
- When `footer` is provided, render it inside the `DialogContent` after `children`, in a wrapper that bakes the canonical chrome.

**Footer wrapper chrome (TBD #2 resolved):**
- `mt-6 flex justify-end gap-2` — same as the convention currently used inline by every modal.
- **No `border-t`.** Rationale: the existing convention (per the StatusBadge spec example, per all 11 footer sites) is no separator. Adding a separator would be a visual change to every modal in the app. Keep parity with current behaviour.

**Anatomy after change:**
```tsx
<DialogContent className={sizeClasses[size]}>
  <DialogHeader>
    <DialogTitle>{title}</DialogTitle>
    {description && <DialogDescription>{description}</DialogDescription>}
  </DialogHeader>
  {children}
  {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
</DialogContent>
```

**Spec entry update in `design-system.md`:** the `### Modal` section's "Footer convention" example switches from "consumer renders this inline" to "pass via `footer` prop"; the "Do not — add a footer prop" line is deleted (inverted by this work). The "footer convention" code block updates to:

```tsx
<Modal
  title="..."
  footer={
    <>
      <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
      <Button size="sm" onClick={handleSubmit}>Confirm</Button>
    </>
  }
>
  {/* body */}
</Modal>
```

**Backward compatibility:** existing callers that haven't migrated still work — `footer` is optional. Migration moves all 11 footer sites in one pass; this isn't a long-lived dual-path situation.

**Props (after change):**
```ts
interface ModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode      // NEW
  size?: "sm" | "md" | "lg" | "xl" | "2xl"
}
```

---

### `ListItem`

**File:** `02-app/components/list-item.tsx`
**Purpose:** Opinionated list-row shell. Owns padding, gap, hover, and divider tokens. Composes three slots — `leading`, `children` (main), `trailing` — letting consumers control row contents while the molecule owns chrome. Closes ~12 hand-rolled list-row patterns.

**Anatomy:**
- Outer element: `<div>` (or `<Link>` / `<button>` per `as` prop — see below).
- Layout: `flex items-center gap-3`.
- Padding: density-driven — see below.
- Divider: optional bottom border. The convention is parent renders `<div className="flex flex-col">` containing N `<ListItem divider />`; the last item's bottom border is fine because the parent's outer container has its own bottom (or sits inside a `SectionCard` etc.).

**Density (TBD #3 resolved):**
- `default` (default): `py-3 px-3`. Matches current ideas-list IdeaRow (`py-3 px-1`) modulo a 2px horizontal nudge to align with section padding. Verify exact match at migration time on each site; the `px-3` baseline can adjust to `px-2` if a site genuinely needs flush-left.
- `compact`: `py-1.5 px-2`. For dense sidebar lists or quick-pick rows. No current consumer at ship time, but build the variant — the audit identified that some surfaces want this.

**Hover behaviour:**
- When `onClick` is provided OR `as="link"` is used: `hover:bg-muted/50 cursor-pointer transition-colors` applied automatically.
- When neither is provided: no hover chrome (row is non-interactive).
- Hover treatment is fixed; no opt-out — non-interactive rows simply have no hover trigger.

**Divider behaviour:**
- `divider` prop (default `true`): renders `border-b border-border` on the row.
- `divider={false}`: no border. Used when the parent wants its own separator strategy (e.g. dividers between sections, not items).
- The divider is on the *row*, not between rows — meaning the last row also gets a border. If that's not desired, parent uses `divide-y divide-border` on the wrapper and `divider={false}` on rows. Both are valid; pick per site.

**`as` prop — what element renders:**
- `'div'` (default): non-interactive container. `onClick` makes it effectively interactive but it stays a `<div>` (with `role="button"` and `tabIndex={0}` auto-added if `onClick` provided).
- `'link'`: renders as Next.js `<Link href={...}>`. `href` becomes required. `onClick` ignored.
- `'button'`: renders as `<button type="button">`. `onClick` becomes required.

**Decision (in scope):** No appearance overrides accepted. No `padding`, `hover`, `bg` props. If a consumer thinks they need them, that's drift trying to sneak back in — push back to the design system for a real variant.

**Behavioural states:**
- Idle / hover (interactive only) / focus-visible (interactive only — `focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`).
- No active/pressed state — let the underlying element handle that.

**Edge cases:**
- **No `leading`, no `trailing`:** `children` fills row. Layout still `flex items-center` so vertical alignment is correct.
- **Long `children` truncation:** consumer wraps the relevant child in `<div className="flex-1 min-w-0">` + `truncate` — ListItem's `flex-1` on `children` slot enables this but doesn't impose `truncate` (some children are multi-line by design).
- **Trailing slot wider than content suggests:** consumer's responsibility to size it. Common pattern: `<div className="flex items-center gap-3 shrink-0">...</div>` for a multi-element trailing slot.

**Props:**
```ts
type ListItemAs = 'div' | 'link' | 'button'

interface ListItemBaseProps {
  leading?: React.ReactNode
  children: React.ReactNode
  trailing?: React.ReactNode
  density?: 'default' | 'compact'  // default 'default'
  divider?: boolean                // default true
  className?: string               // applied to outer; for layout overrides only, NOT appearance
}

// Plus: discriminated union on `as`:
//   { as?: 'div';    onClick?: () => void }
//   { as: 'link';    href: string }
//   { as: 'button';  onClick: () => void }
```

**Do not:**
- Accept `bg`, `padding`, or `hover` props. These belong in density variants, not in the API.
- Bake in icons in the `leading` slot — leave it free-form. Different lists want different leading content (icon, status dot, avatar, checkbox).
- Add a `selected` prop in v1 — no current consumer needs it. Build when needed.

---

### `FilterPill`

**File:** `02-app/components/filter-pill.tsx`
**Purpose:** Visual pill atom for filter groups. Single button with optional leading icon, label, optional count. Used by `FilterPillGroup` (state container) but also exportable for future ad-hoc filter rows.

**Anatomy:**
- `<button type="button">` element.
- Layout: `inline-flex items-center gap-1.5`.
- Shape: `rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors`.
- Icon (optional): `<Icon className="h-3 w-3" />` left of label.
- Count (optional): `<span className="text-[11px]">{count}</span>` right of label, opacity-driven by active state.

**State styling (driven by `active` prop):**
- Active: `bg-primary text-primary-foreground`.
- Inactive: `bg-secondary text-secondary-foreground hover:bg-secondary/80`.
- Count opacity: active → `opacity-70`, inactive → `opacity-50`.

**Behavioural states:**
- Idle (active or inactive).
- Hover (inactive only — active state has no hover shift, since clicking it is a no-op when single-select).
- Disabled: `opacity-50 cursor-not-allowed`, click no-op. Currently no consumer needs this; build when needed (skip in v1 if API symmetry demands it, otherwise omit).

**Edge cases:**
- **Long label:** no truncation. Consumer responsibility to keep filter labels short.
- **Count = 0:** still renders. Filter showing "No matches (0)" is meaningful.
- **No icon and no count:** label-only pill. Layout still works.

**Props:**
```ts
interface FilterPillProps {
  label: string
  active: boolean
  onClick: () => void
  icon?: LucideIcon
  count?: number
}
```

**Do not:**
- Hardcode colours — use `bg-primary` / `bg-secondary` tokens.
- Accept a `variant` prop — there's one shape. New shape = new molecule.
- Build multi-select state into the pill itself — that's `FilterPillGroup`'s job (or future `MultiFilterPillGroup`).

---

### `FilterPillGroup`

**File:** `02-app/components/filter-pill-group.tsx`
**Purpose:** State container for a group of `FilterPill`s. Single-select among options. Renders an optional left label + the pills row. Closes the duplicated status-group / type-group markup in `ideas-list.tsx:252-294`.

**Anatomy:**
- Row container: `flex items-center gap-1.5`.
- Optional label (left): `<span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground w-12 shrink-0">{label}</span>`.
- Pills container: `<div className="flex gap-1">{...pills}</div>`.

**Single-select behaviour:**
- `value` prop is the currently selected option's `value`.
- `onChange(value)` fires on any pill click. Clicking the active pill re-fires `onChange` with the same value — consumer can ignore or use as a "refresh".
- No "deselect" affordance in v1 — there's always one selected. Consumers wanting "All" provide an `'all'` option in the list.

**Edge cases:**
- **`value` doesn't match any option:** all pills render inactive. First click sets `value`. Defensive but expected — consumers should always have a default matching one option.
- **Empty `options` array:** renders an empty pills row (consumer's bug; don't add placeholder).
- **Single option:** renders one pill; clicking it re-fires `onChange` with the same value (harmless).

**Props:**
```ts
interface FilterPillOption {
  value: string
  label: string
  count?: number
  icon?: LucideIcon
}

interface FilterPillGroupProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: FilterPillOption[]
}
```

**Do not:**
- Build multi-select in this molecule. `MultiFilterPillGroup` is a separate molecule when needed.
- Layout pills in a wrapping multi-row layout. Filter pill groups are designed for ≤6 options on one row. If more are needed, that's a different molecule (filter dropdown, faceted search).

---

### `ArchiveItemModal`

**File:** `02-app/components/archive-item-modal.tsx`
**Purpose:** Configurable confirmation modal for archive flows. Consumes `Modal` (with `footer` slot). Replaces three near-identical files: `archive-platform-modal.tsx`, `archive-offer-modal.tsx`, `archive-segment-modal.tsx` (each ~120 lines). The molecule's API is general enough to absorb future archive flows (clients, missions, ideas) without API changes.

**Anatomy:**
- Wraps `Modal` (`size="md"`, title `"Archive {itemName}"`).
- Body switches on internal `phase` state (`'checking' | 'confirm' | 'archiving'`).
- Footer rendered via Modal's `footer` slot — Cancel + Archive buttons.

**Body per phase:**
- `'checking'`: `<div className="py-4 text-center text-sm text-muted-foreground">Checking dependencies…</div>`. Footer omitted (or buttons disabled — see below).
- `'confirm'` with `dependents.length > 0`:
  - `<p className="text-sm text-muted-foreground">{copy.withDependents}</p>`
  - `<ul className="rounded-md border border-border bg-muted/30 p-3 text-sm space-y-1">` listing dependents (`{type}: {name}` per row).
  - `<p className="text-sm text-muted-foreground">{copy.warningWithDependents}</p>`
- `'confirm'` with `dependents.length === 0`:
  - `<p className="text-sm text-muted-foreground">{copy.withoutDependents}</p>`
- `'archiving'`: `<div className="py-4 text-center text-sm text-muted-foreground">Archiving…</div>`.

**Footer per phase:**
- `'checking'`: footer omitted entirely (cleaner than disabled buttons during a transient state).
- `'confirm'`: `<><Button variant="outline" onClick={...}>Cancel</Button><Button variant="destructive" onClick={handleConfirm}>{dependents.length > 0 ? 'Archive anyway' : 'Archive'}</Button></>`.
- `'archiving'`: footer omitted.

**Default copy strings (TBD #4 resolved):**

```ts
const DEFAULT_COPY = {
  withDependents: `This {itemType} is used by:`,
  warningWithDependents: `These references will remain but show the {itemType} as archived.`,
  withoutDependents: `This {itemType} will no longer appear in selection. It will remain visible where already referenced.`,
}
```

The `{itemType}` token is replaced with the consumer-provided `itemType` string (e.g. `"channel"`, `"offer"`, `"segment"`). Consumers can override any of the three strings by passing `dependentsCopy`. The current per-modal copy variations ("This channel is used by:" / "This segment is used by:" / "This offer is used by:") all collapse to the templated default.

The "remain visible where already referenced" / "remain visible where already referenced. You can reassign them later." variation in the existing segment modal is consolidated to the shorter form. The "You can reassign them later" detail is too segment-specific to be a sensible default — segments override via `dependentsCopy.warningWithDependents` if it's worth keeping.

**State machine:**
- `phase` resets to `'checking'` whenever `open` transitions to `true`.
- On open, fires `dependencyCheck()`. If `ok: false`: toast.error + `onOpenChange(false)`. If `ok: true`: phase → `'confirm'`, dependents stored.
- On Confirm click: phase → `'archiving'`, fires `onConfirm()`. On `ok: true`: `onOpenChange(false)` + `onArchived?(nextId ?? null)`. On `ok: false`: toast.error + `onOpenChange(false)`.

**Edge cases:**
- **`dependencyCheck` slow:** "Checking…" state holds. No timeout.
- **User cancels during `'checking'`:** Modal Escape / backdrop / Cancel button — all gated since footer is omitted in that phase. Modal-level dismiss (Escape, backdrop) still works via shadcn Dialog defaults; the in-flight `dependencyCheck` resolves into a closed modal harmlessly (the result handler checks `open` indirectly via `phase` reset on next open).
- **`onConfirm` slow:** "Archiving…" state holds. Same: no timeout.
- **`open` toggles to `false` mid-async:** existing pattern in archive-segment-modal handles this via `useEffect` reset; preserve.

**Props:**
```ts
interface DependencyCheckResult {
  dependents: { name: string; type: string }[]
}

interface ConfirmArchiveResult {
  nextId?: string | null
}

interface ArchiveCopy {
  withDependents?: string
  warningWithDependents?: string
  withoutDependents?: string
}

interface ArchiveItemModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemName: string
  itemType: string  // singular lowercase, e.g. "channel", "offer"
  dependencyCheck: () => Promise<{ ok: true; data: DependencyCheckResult } | { ok: false; error: string }>
  onConfirm: () => Promise<{ ok: true; data: ConfirmArchiveResult } | { ok: false; error: string }>
  onArchived?: (nextId: string | null) => void
  dependentsCopy?: ArchiveCopy
}
```

The `Promise<{ ok, data } | { ok, error }>` shape matches the existing server actions exactly — no wrapper changes needed at consumer sites beyond passing the action references.

**Do not:**
- Bake in routing logic (`router.push`). Leave navigation to `onArchived` so different entity types can land on different pages.
- Hardcode `itemType` in the copy templates beyond the `{itemType}` token. Custom phrasing belongs in `dependentsCopy`.
- Add a "soft delete" / "hard delete" toggle. This molecule is for soft archive only. A hard-delete molecule is a different thing.

---

### Mission phase mapping — uses tag hues, not status states (TBD #1 resolved)

Mission phases are *categorical* lifecycle states, not status alerts. Using `success`/`warning`/`info` semantic state tokens for them would conflate two different meanings — status colours signal *health* ("is this OK?"), tag hues signal *category* ("which kind?"). Phases are five distinct kinds of activity, not five health levels.

**Decision:** mission phases use `TypeBadge`'s tag hue palette (`bg-tag-1` through `bg-tag-8`). Project status (Active / Paused / Complete / Archived) continues to use the semantic state palette — those *are* health signals.

This requires a small extension to `StatusBadge` — see "StatusBadge `'tag'` option variant" below.

**Phase → hue mapping (sequential, eye-check at build):**

| Phase | Hue |
|---|---|
| Exploring | `1` |
| Synthesising | `2` |
| Producing | `3` |
| Complete | `4` |
| Paused | `5` |

DS-02 didn't lock semantics onto specific tag-N tokens, so any sequential 5 work as a starting point. Verify visually at build — the desaturated palette should give five clearly distinguishable but harmonious phase colours. If a specific hue assignment is jarring, swap it in the options array; the molecule has no opinion on which hue means what.

### StatusBadge `'tag'` option variant (extension to existing molecule)

Existing `StatusOption` shape — kept for backward compatibility:
```ts
type StatusOption = { value: string; label: string; state: 'success' | 'warning' | 'error' | 'info' | 'neutral' }
```

New variant — for categorical badges (mission phase, future use cases):
```ts
type StatusOptionTag = { value: string; label: string; hue: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 }
```

The molecule's `options` prop becomes a discriminated array — every option in a single list must use the same shape (all `state` or all `hue`). Mixing within one list is forbidden: a badge is either status-coloured or hue-coloured, not both. Type system enforces this via `StatusOption[] | StatusOptionTag[]`.

**Rendering rules:**
- `state`-shaped options → existing `bg-{state}-bg text-{state}-foreground` classes (and `bg-{state}-bg` dot indicator).
- `hue`-shaped options → `bg-tag-{N}` background, `text-foreground` text (matches TypeBadge: tag tokens are desaturated enough that foreground reads on all eight). Dot indicator: `bg-tag-{N}`.

**Behaviour:** identical between variants. The only difference is the colour token lookup. The pill chrome, dropdown chrome, click-outside, escape, pending state, and accessibility attributes are unchanged.

**Spec entry update in `design-system.md` `### StatusBadge`:** add a "Tag-hue variant" section after the existing state list, documenting the alternative option shape and when to use it ("Use the tag-hue variant when the values represent categories rather than statuses — e.g. mission phases, project types").

**Decision (in scope):** This is a small extension, not a new molecule. Reasons:
- Same behaviour (interactive picker), same anatomy (pill + dropdown), same accessibility — only the colour vocabulary differs.
- Building a separate `PhaseBadge` / `CategoryBadge` molecule duplicates FloatingMenu composition + click-outside + pending lifecycle for no benefit.
- Generalising the molecule to take arbitrary colour tokens loses the design system's voice — "use the right palette for the right semantic" is the rule we're enforcing.

### Project status mapping

Already aligned with StatusBadge's default semantic:

| Status | State |
|---|---|
| Active | `success` |
| Paused | `warning` |
| Complete | `info` |
| Archived | `neutral` |

No ambiguity here.

### Customer-journey-panel and project-workspace verification (TBD #6 resolved)

- **`customer-journey-panel.tsx:200-220`** — contains an embedded confirmation modal (regenerate-customer-journey). The `flex justify-end gap-2` at line 208 *is* a modal footer site — migrate to `footer` slot.
- **`project-workspace.tsx`** — confirmed contains an embedded modal with a `flex justify-end gap-2` block (line 234 in earlier scan was the status DropdownMenu, not a modal footer; the modal footer is elsewhere in the file — verify exact line at build time).
- **All other 9 files in the modal-footer migration scope are explicit modal files** — no panel surfaces accidentally swept in.

Final modal-footer migration count: **11 sites** confirmed.

## Migrations — example before/after

### Mission-workspace phase picker

**Before** (`mission-workspace.tsx:178-202`):
```tsx
<DropdownMenu>
  <DropdownMenuTrigger
    render={
      <Button variant="outline" size="sm">
        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide mr-1.5 ${PHASE_COLOURS[phase]}`}>
          {PHASE_LABELS[phase]}
        </span>
        Phase
      </Button>
    }
  />
  <DropdownMenuContent align="end">
    {ALL_PHASES.map((p) => (
      <DropdownMenuItem key={p} onClick={() => handlePhaseChange(p)} className={phase === p ? 'font-medium' : ''}>
        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide mr-2 ${PHASE_COLOURS[p]}`}>
          {PHASE_LABELS[p]}
        </span>
      </DropdownMenuItem>
    ))}
  </DropdownMenuContent>
</DropdownMenu>
```

**After:**
```tsx
<StatusBadge
  status={phase}
  onChange={async (next) => {
    const result = await changeMissionPhase(missionId, next as MissionPhase)
    return result
  }}
  options={[
    { value: 'exploring',     label: 'Exploring',     hue: 1 },
    { value: 'synthesising',  label: 'Synthesising',  hue: 2 },
    { value: 'producing',     label: 'Producing',     hue: 3 },
    { value: 'complete',      label: 'Complete',      hue: 4 },
    { value: 'paused',        label: 'Paused',        hue: 5 },
  ]}
/>
```

Visual delta: the trigger goes from "[colored pill] Phase ▼" to "[colored pill] ▼". Loses the "Phase" word in the trigger; gains the colour-state pill *as* the trigger. Matches every other StatusBadge in the app.

`PHASE_COLOURS` and `PHASE_LABELS` lookups become unused after migration — delete them at migration time. They live in `lib/types/missions.ts` so deletion is local.

### Project-workspace status picker

Analogous to mission-workspace migration. The `statusBadge` lookup map at `project-workspace.tsx:59-64` becomes unused — delete it.

### Dashboard NewInputDropdown → ActionMenu

**Before** (`app/(dashboard)/page.tsx:359-384`):
```tsx
<DropdownMenu>
  <DropdownMenuTrigger
    render={
      <Button className="gap-2">
        <Plus className="h-4 w-4" />
        New input
        <ChevronDown className="h-3 w-3 opacity-50" />
      </Button>
    }
  />
  <DropdownMenuContent align="end">
    {inputTypes.map((item) =>
      item.enabled ? (
        <DropdownMenuItem key={item.label} render={<Link href={item.href} />}>
          {item.label}
        </DropdownMenuItem>
      ) : (
        <DropdownMenuItem key={item.label} disabled>
          {item.label}
          <span className="ml-auto text-[10px] text-muted-foreground">Soon</span>
        </DropdownMenuItem>
      )
    )}
  </DropdownMenuContent>
</DropdownMenu>
```

**After:**
```tsx
<ActionMenu
  trigger={
    <Button className="gap-2">
      <Plus className="h-4 w-4" />
      New input
      <ChevronDown className="h-3 w-3 opacity-50" />
    </Button>
  }
  items={[
    { type: 'link',     label: 'Text',      href: '/inputs/process' },
    { type: 'disabled', label: 'Document',  hint: 'Soon' },
    { type: 'disabled', label: 'Audio',     hint: 'Soon' },
    { type: 'disabled', label: 'URL / Link', hint: 'Soon' },
  ]}
/>
```

Removes 3 atom imports (Button is consumer-rendered, but DropdownMenu* and Tooltip* gone) — wait, this site doesn't use Tooltip. Just DropdownMenu*. Tooltip is used elsewhere in `app/(dashboard)/page.tsx` (3 sites per audit). Build the migration as a single pass through that file.

### Ideas-list filter pills → FilterPillGroup

**Before** (`ideas-list.tsx:252-296`):
```tsx
<div className="flex flex-col gap-2">
  <div className="flex items-center gap-1.5">
    <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground w-12 shrink-0">Status</span>
    <div className="flex gap-1">
      {statusPills.map((pill) => (
        <button key={pill.value} type="button" onClick={() => setStatusFilter(pill.value)} className={`...`}>
          {pill.label}
          <span className={`text-[11px] ${statusFilter === pill.value ? 'opacity-70' : 'opacity-50'}`}>{pill.count}</span>
        </button>
      ))}
    </div>
  </div>
  {/* same again for type pills */}
</div>
```

**After:**
```tsx
<div className="flex flex-col gap-2">
  <FilterPillGroup
    label="Status"
    value={statusFilter}
    onChange={(v) => setStatusFilter(v as StatusFilter)}
    options={statusPills}
  />
  <FilterPillGroup
    label="Type"
    value={typeFilter}
    onChange={(v) => setTypeFilter(v as TypeFilter)}
    options={typePills}
  />
</div>
```

The `statusPills` / `typePills` arrays already match `FilterPillOption[]` — `{ value, label, count, icon? }`. Just rename if needed; structurally identical.

### Modal footer migration (one example — pattern repeats 11 times)

**Before** (`archive-platform-modal.tsx:107-114`):
```tsx
<Modal title={...} ...>
  {/* body */}
  <div className="flex justify-end gap-2 pt-2">
    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
    <Button variant="destructive" onClick={handleConfirm}>{...}</Button>
  </div>
</Modal>
```

**After:** (this file is being deleted in favour of `ArchiveItemModal` — but for the *other* 8 modals that aren't archive flows, the pattern is:)

```tsx
<Modal
  title={...}
  footer={
    <>
      <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
      <Button onClick={handleSubmit}>Confirm</Button>
    </>
  }
  ...
>
  {/* body */}
</Modal>
```

The `pt-2` becomes part of Modal's internal `mt-6` — slightly more separation than today, but the visual delta is small. Verify at build time.

### Floating menu adoption (entity-outcomes-panel example)

**Before** (`entity-outcomes-panel.tsx` ~line 238):
```tsx
{open && (
  <div className="absolute right-0 top-full z-50 mt-1 rounded-md border border-border bg-card shadow-[var(--shadow-raised)] py-1 min-w-[140px]">
    {/* items */}
  </div>
)}
```

Plus a sibling `useEffect` doing click-outside.

**After:**
```tsx
<FloatingMenu
  open={open}
  onOpenChange={setOpen}
  align="end"
  minWidth="140px"
  trigger={triggerElement}
>
  {/* items, same as before */}
</FloatingMenu>
```

`useEffect` for click-outside deleted. The trigger element migration depends on the file's existing structure — verify per site.

## Loading and error states

Not applicable to molecules themselves. ArchiveItemModal has explicit `'checking'` / `'archiving'` loading phases (specced above).

## Mobile

No new viewport assumptions:

- `FloatingMenu` is `absolute`-positioned, not fixed — overflows are the consumer's problem (ActionMenu and StatusBadge use `align="end"` to avoid right-edge overflow on narrow viewports).
- `ListItem` is `flex` with `min-w-0` flexibility — survives narrow containers.
- `FilterPillGroup` does NOT wrap to multiple rows. On narrow viewports with many pills this overflows horizontally — acceptable for ship time; revisit if it becomes a real complaint.
- `Modal` size cap is `sm:max-w-*` — mobile defaults to full-width with shadcn Dialog defaults. Footer slot inherits.

## Molecule composition

### Existing molecules used (unchanged externally)
- `Modal` (registry: `modal.tsx`, spec: `design-system.md § Modal`) — gains a `footer?: ReactNode` slot. Spec block updates to reflect the new prop and the inverted "do not add a footer prop" line. External consumers either pass `footer` (new) or render footer inside `children` (existing — backward-compatible).
- `Button`, `IconButton`, `ActionButton` (DS-05) — used in migration sites, consumed unchanged.
- `EmptyState` (registry: `empty-state.tsx`, spec: `design-system.md § EmptyState`) — enforcement check on `ideas-list.tsx:298-302`. The current "no ideas yet" copy is a hand-rolled `<p>` rather than `EmptyState`. Replace with `<EmptyState heading={...} />` if that's stylistically right; if the audit's note ("ideas-list overrides EmptyState with local styling") was about a different site, verify and adjust.
- `SectionDivider` (registry: `section-divider.tsx`, spec: `design-system.md § SectionDivider`) — enforcement check on `ideas-list.tsx:304` (`divide-y divide-border`) and `:312, :632` per audit. `divide-y` on a flex column container is the canonical "list of items" pattern — replacing every instance with explicit `<SectionDivider />` between items would be busier, not cleaner. Decision: **leave `divide-y divide-border` on list containers as-is**. SectionDivider is for *section* boundaries, not item boundaries. Audit note interpreted as a false positive for this kind of inline divider.

### Existing molecules used but unspecced *(known DS-03 gap)*
- None new.

### New molecules required
- **`FloatingMenu`** — popover chrome (positioning, shadow, click-outside, escape). Spec above.
- **`ActionMenu`** — wraps FloatingMenu with item chrome (action / link / disabled / divider). Spec above.
- **`ListItem`** — opinionated row shell with leading / children / trailing slots, density variants. Spec above.
- **`FilterPill`** — visual pill atom for filter rows. Spec above.
- **`FilterPillGroup`** — single-select state container for FilterPill. Spec above.
- **`ArchiveItemModal`** — configurable archive confirmation modal, replaces 3 archive-*-modal files. Spec above.

### Existing molecule refactor (no API change)
- **`StatusBadge`** — refactored to compose `FloatingMenu` instead of inline absolute-positioned popover + click-outside hook. Spec note added to existing entry. ~25 lines removed.

### Existing molecule extension (backward-compatible)
- **`Modal`** — adds `footer?: React.ReactNode` prop. Spec block updates. Existing consumers untouched.

### Atoms used directly (target: zero after this ticket)
- After DS-07 lands: zero. The 20 atom imports across 10 organism files surveyed in foundation audit § 3 all close.
- Mid-migration, atoms remain in place file-by-file; the coherence check tracks progress.

## Open TBDs resolved at layout time

1. **TBD #1 — Mission phase mapping.** Resolved: phases use `TypeBadge`'s tag hue palette (`hue: 1-5`), not the status state palette. Phases are categorical (which kind of activity), not health signals. Requires a small `StatusBadge` extension — new `StatusOptionTag` shape with `hue` instead of `state`. See "Mission phase mapping" and "StatusBadge `'tag'` option variant" sections.
2. **TBD #2 — Modal footer separator.** Resolved: no `border-t`. Match existing convention; avoid visual delta on every modal.
3. **TBD #3 — ListItem density values.** Resolved: `default = py-3 px-3`, `compact = py-1.5 px-2`. Verify `px-3` baseline at first migration site; adjust if a site needs `px-2` flush-left.
4. **TBD #4 — ArchiveItemModal canonical copy.** Resolved: templated default with `{itemType}` substitution; consumers override via `dependentsCopy`. Defaults specified in the spec above.
5. **TBD #5 — FloatingMenu initial focus.** Resolved: no auto-focus. Trigger keeps focus; keyboard users `Tab` into the menu naturally. Roving focus / arrow nav out of scope for v1.
6. **TBD #6 — Modal-footer site verification.** Resolved: 11 confirmed sites (8 standalone modals + customer-journey-panel embedded modal + 2 workspace embedded modals). All explicit modals; no panels swept in.

## Decisions baked in beyond the brief

1. **`SectionDivider` enforcement scope narrowed.** `divide-y divide-border` on list containers is the right pattern; SectionDivider is for *section* boundaries, not item boundaries. The audit's note flagging `ideas-list.tsx:312, :632` is interpreted as a false positive for this case. EmptyState enforcement at `ideas-list.tsx:298-302` stands.
2. **No `FloatingMenu` open/close transitions in v1.** Match existing instant behaviour. Add transitions later if visual polish demands it.
3. **`ListItem` interactivity opt-in via `as` prop.** Discriminated union for `as: 'div' | 'link' | 'button'`. Default `'div'`; `onClick` makes it interactive without forcing a button element semantically.
4. **`ActionMenu` is sealed (owns its own open state); `FloatingMenu` is fully controlled.** Two different abstraction levels — ActionMenu is a one-stop dropdown; FloatingMenu is a building block.
5. **`ArchiveItemModal` copy templated, not hardcoded per entity.** `{itemType}` placeholder + `dependentsCopy` overrides covers current and future archive flows.
6. **Mission phase mapping uses tag hues (categorical), not status states (health).** Phases are kinds of activity, not levels of health. Adds a `'tag'` variant to `StatusBadge`'s option type — discriminated by `hue` vs `state`. Project status keeps semantic state palette; missions get the tag palette.

## Hard gate checklist before approving this layout spec

- [x] Six new molecule specs complete with props, anatomy, behaviour, edge cases
- [x] Two existing-molecule changes (StatusBadge refactor, Modal extension) specified with backward-compat notes
- [x] All 6 brief TBDs resolved
- [x] Migration before/after examples for each major pattern
- [x] Mission phase + project status state mappings concrete
- [x] Mobile and accessibility considerations noted
- [x] Out-of-scope items inherited from the brief, not duplicated here

Layout spec status: **approved 2026-04-27.**
