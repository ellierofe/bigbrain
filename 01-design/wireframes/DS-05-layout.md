# DS-05 Layout — Button composition molecules

Status: draft
Last updated: 2026-04-27
Brief: `01-design/briefs/DS-05-button-composition-molecules.md`

## Template match
No applicable template. DS-05 is molecule design (2 new molecules + ~21 site migrations).

---

## Molecule composition *(mandatory — drives feature-build plan gate)*

### Existing molecules used

None — both new molecules wrap the `Button` atom directly, plus optional `Tooltip` (for IconButton) and Next.js `Link` (when `href` is set). Atoms inside molecules is correct.

### Existing molecules to extend
None.

### Existing molecules used but unspecced *(known gap)*
None — DS-03 closed the spec gap.

### New molecules required

1. **`IconButton`** *(net new)* — see full spec below.
2. **`ActionButton`** *(net new)* — see full spec below.

### Atoms used directly
- Inside `IconButton`: `Button` from `@/components/ui/button`, `Tooltip` / `TooltipTrigger` / `TooltipContent` from `@/components/ui/tooltip`, optionally `Link` from `next/link`.
- Inside `ActionButton`: `Button` from `@/components/ui/button`, optionally `Tooltip`, optionally `Link`. `Loader2` icon from `lucide-react` for loading state.

All inside molecules — correct.

---

## Visual specs

### IconButton

**File:** `02-app/components/icon-button.tsx` *(new)*
**Purpose:** Icon-only button. Optional tooltip explaining the action. Optional Link rendering for navigation. Distinct from `ActionButton` (which has a visible label).

**Anatomy:**
- Wraps shadcn `Button` atom internally.
- Default `variant="outline"`, default `size="sm"`. Icon rendered at `h-4 w-4` (size sm + Button's auto-icon-sizing handles this).
- Single child: the icon component.
- When `tooltip` is truthy: wrapped in `<Tooltip><TooltipTrigger render={<span />}>...</TooltipTrigger><TooltipContent>{tooltipText}</TooltipContent></Tooltip>`. The `<span />` wrapper allows tooltips on disabled buttons (browsers don't fire pointer events on disabled `<button>`s directly).
- When `href` is set: rendered as `<Button nativeButton={false} render={<Link href={href} />}>` (base-ui's render-prop pattern).

**Behavioural states:**
- **Idle / hover / focus / active**: handled by `Button` atom.
- **Disabled**: standard Button disabled. Tooltip still fires when hovered.
- **Open** (e.g. when this button triggers a dropdown): standard Button `aria-expanded` styling.

**Tooltip behaviour:**
- `tooltip={true}` (default): tooltip text = `label` prop.
- `tooltip={false}`: no tooltip wrapper.
- `tooltip="Custom text"`: tooltip text = the string.

The default-on tooltip is intentional — most icon buttons benefit from explanation. Consumers can opt out for cases where the icon is universally understood (e.g. close X in a tightly-bounded modal header).

**Edge cases:**
- **`href` + `onClick`**: both fire — onClick first (synchronous), then Link navigation. Useful for analytics or local state cleanup before navigation.
- **`tooltip` and `disabled` together**: tooltip still appears on hover (the `<span />` wrapper is what makes this work).
- **Pass-through of `data-testid`**: forwarded to the rendered button (or to the Link if `href` is set, since the Link becomes the rendered DOM node).

**Accessibility:**
- `aria-label` set from `label` prop — required, never empty.
- When `href` is set: still renders as a button-shaped link (visually). Keyboard semantics follow Link (Enter activates).

**Props:**
```ts
interface IconButtonProps {
  icon: LucideIcon
  label: string                       // required — used for aria-label and default tooltip text
  onClick?: () => void
  href?: string                       // when set, renders as Link
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'   // default 'outline'
  size?: 'sm' | 'icon'                // default 'sm'
  disabled?: boolean
  tooltip?: boolean | string          // default true
  'data-testid'?: string
  className?: string
}
```

**Do not:**
- Allow `children` — the icon is the prop. If a button has both icon and label, use `ActionButton`.
- Pass `aria-label` separately — derived from `label`.
- Hardcode icon sizes — Button atom's auto-sizing handles this.

---

### ActionButton

**File:** `02-app/components/action-button.tsx` *(new)*
**Purpose:** Icon (optional) + visible label primary action. Used for top-of-page CTAs (`+ New X`, `Generate`), confirmation buttons, and other primary/secondary actions where the label is important. Optional Link rendering. Optional loading state for async actions.

**Anatomy:**
- Wraps shadcn `Button` atom internally.
- Default `variant="default"` (sage primary), default `size="sm"`.
- Children rendered as the visible label, with the icon (when provided) preceding via Button's gap utility.
- When `loading=true`: icon (or, if no icon, prepended) is replaced by `<Loader2 className="h-4 w-4 animate-spin">`. Label stays visible. Button is disabled.
- When `tooltip` (string) provided: button wrapped in `<Tooltip>...</Tooltip>` scaffold (same `<span />` trick as IconButton).
- When `href` is set: rendered as `<Button nativeButton={false} render={<Link href={href} />}>`.

**Behavioural states:**
- **Idle / hover / focus / active**: standard Button.
- **Disabled**: standard Button disabled.
- **Loading**: button disabled, icon replaced by spinner, label persists. Click handler doesn't fire.
- **With tooltip**: tooltip shows on hover (works on disabled too).

**Edge cases:**
- **`loading` and `disabled` together**: both honoured (button disabled, spinner visible).
- **No icon**: ActionButton renders the children (label) only. In `loading=true` without an icon, the spinner is prepended to the label via the gap utility.
- **`href` + `onClick`**: same as IconButton — onClick fires first, then navigation.

**Accessibility:**
- Label content is the visible text (and accessible name).
- Loading state should announce via `aria-busy="true"` when loading.

**Props:**
```ts
interface ActionButtonProps {
  icon?: LucideIcon
  children: React.ReactNode           // the visible label
  onClick?: () => void
  href?: string
  variant?: 'default' | 'outline' | 'destructive'   // default 'default'
  size?: 'sm' | 'default'             // default 'sm'
  disabled?: boolean
  loading?: boolean
  tooltip?: string                    // optional — most ActionButtons don't need one
  'data-testid'?: string
  className?: string
  type?: 'button' | 'submit'          // default 'button'
}
```

**Do not:**
- Use ActionButton for icon-only — that's `IconButton`.
- Add `tooltip` as default-true — labels are visible; tooltips only for clarification.
- Set both `loading` and `onClick` expecting the click to register during loading — clicks are blocked while loading.

---

## Where each piece lands in design-system.md

After build:
1. **`## Molecule specifications`** — two new entries (`### IconButton`, `### ActionButton`) added after `### ItemSwitcher` (the last layout-category entry) and before the form-control specs (`### SelectField` etc.).
2. **`## Changelog`** — new row.

## Registry impact

| Action | Count |
|---|---|
| Add IconButton entry (form? layout?) | 1 |
| Add ActionButton entry | 1 |
| Net registry size change | +2 |

I'll classify both as `form` category — they're action-shaped controls. (Could argue `layout` since they're structural; but `form` is closer to user-facing semantics — they're how users *do things*.)

## Migration order

1. Build `IconButton`.
2. Build `ActionButton`.
3. Migrate one site as smoke test (e.g. `audience-segments/[id]/segment-detail-view.tsx` — has both shapes).
4. Migrate remaining ~20 sites file-by-file.
5. Drop now-unused `Button` and `Tooltip` imports per file.
6. Registry update.
7. Spec doc update.
8. Run check: expect ~10 atom-import warnings remaining (the documented carrythrough).
9. tsc + lint.

## Open questions to resolve at build time

1. **`Link` import path**: Next.js `Link` from `next/link`. Confirm the correct export shape (default or named) at build time when wiring up the molecules.
2. **Per-site classification**: a few Button uses may need judgment — e.g. an icon button that *also* has a tooltip but where the tooltip text differs from the action label. IconButton's `tooltip="..."` string override handles this; verify at migration.
3. **`type="submit"` for form submissions**: ActionButton needs to support `type="submit"` for use inside `<form>` elements (some create modals submit via form). Default `type="button"`.
4. **Bare-Button retention**: at the end of migration, run a final `grep` for remaining Button atom imports in organism files. Any that remain need explicit justification (typically: passed as a child to an atom that takes a Button, or used in a way the molecules don't cover). Document each in the build summary.
