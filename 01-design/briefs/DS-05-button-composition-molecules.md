# DS-05: Button composition molecules
Feature ID: DS-05
Status: complete
Last updated: 2026-04-27

## Summary

Replace ~21 direct `Button` atom imports across organism files with two purpose-built molecules: `IconButton` (icon-only, optional tooltip / Link) and `ActionButton` (icon + label, optional tooltip / Link / loading state). Eliminate 3 `Tooltip`-wrapping-`Button` imports (Tooltip becomes a built-in feature of IconButton). Net effect: atom-import warnings drop from 41 → ~10. The remaining ~10 are explicitly out-of-scope and tracked as known carrythrough.

## Why this matters

- **21 organism files import `Button` directly** — flagged in `00-project-management/foundation-audit-2026-04-25.md` § 3 as the single largest source of atom-import drift.
- **3 organism files import `Tooltip` directly** to wrap a Button — this two-import pattern (Button + Tooltip) repeats across detail views with identical scaffolding.
- **Boilerplate**: every "open in cards view" button repeats `<Button variant="outline" size="sm" nativeButton={false} render={<Link href="..." />}><Icon /></Button>`. Over four DNA detail views, that's the same 3-line incantation × 4.
- **`render={<Link>}` pattern is footgunny** — the consumer must remember to set `nativeButton={false}` when wrapping in Link, or the button renders inside the link as well as functioning as one. Wrapping into a molecule eliminates the foot.

## Use cases

- **Icon-only buttons** in detail-view headers: `LayoutGrid` (cards view), `Archive`, `CheckCircle` (mark active), kebab menus.
- **Icon-only buttons** in TopToolbar (the lightbulb).
- **Icon-only buttons** in row-action contexts (delete, expand).
- **Icon + label primary actions**: `+ New segment`, `+ New platform`, `Generate`, `Save as draft`.
- **Disabled-with-tooltip pattern**: archive button when there's only one active item.
- **Link-rendered buttons**: navigation between cards/detail views.

## Molecules

### `IconButton`
- **Purpose:** icon-only button. Optionally wrapped with a tooltip explaining the action.
- **Props:** `icon: LucideIcon`, `label: string` (used as `aria-label` AND as tooltip text when `tooltip !== false`), `tooltip?: boolean | string` (default true; pass false to suppress; pass string to override tooltip text), `onClick?: () => void`, `href?: string` (renders as Link), `variant?: 'default' | 'outline' | 'ghost' | 'destructive'` (default `outline`), `size?: 'sm' | 'icon'` (default `sm`), `disabled?: boolean`, `data-testid?: string`.
- **Replaces:** ~12 `<Button size="sm">{Icon}</Button>` patterns + the 3 Tooltip-wrapped variants.

### `ActionButton`
- **Purpose:** icon + label primary action. Used for top-of-page CTAs (`+ New X`, `Generate`).
- **Props:** `icon?: LucideIcon` (most actions have one; some don't), `children: ReactNode` (label content), `onClick?: () => void`, `href?: string`, `variant?: 'default' | 'outline' | 'destructive'` (default `default` — the sage primary), `size?: 'sm' | 'default'` (default `sm`), `loading?: boolean` (disabled + Loader2 spinner inline with label), `disabled?: boolean`, `tooltip?: string`, `data-testid?: string`.
- **Replaces:** ~9 `<Button size="sm">{Icon}<span>Label</span></Button>` patterns.

Both molecules wrap shadcn `Button` internally. Both accept `href` for Link rendering — eliminates the `nativeButton={false} render={<Link>}` boilerplate.

## Migration sites

Sourced from the current `npm run check:design-system` atom-import report. ~21 organism files import Button.

**IconButton candidates** (icon-only):
- `app/(dashboard)/dna/audience-segments/[id]/segment-detail-view.tsx` — cards-view link, archive button (with tooltip).
- `app/(dashboard)/dna/audience-segments/cards/page.tsx` — likely cards-view selection.
- `app/(dashboard)/dna/knowledge-assets/cards/page.tsx` — same.
- `app/(dashboard)/dna/offers/[id]/offer-detail-view.tsx` — archive, cards view.
- `app/(dashboard)/dna/platforms/[id]/platform-detail-view.tsx` — archive, cards view.
- `app/(dashboard)/dna/platforms/cards/page.tsx` — same.
- `app/(dashboard)/dna/value-proposition/value-proposition-view.tsx` — likely sectional buttons.
- `app/(dashboard)/dna/brand-meaning/brand-meaning-view.tsx` — same.
- `app/(dashboard)/dna/tone-of-voice/tone-of-voice-view.tsx` — same.
- `app/(dashboard)/projects/clients/project-list-client.tsx`, `missions-list-client.tsx` — list actions.
- `components/knowledge-asset-detail-view.tsx` — section actions.
- `app/(dashboard)/error.tsx` — refresh / reset.
- `app/(dashboard)/inputs/ideas/ideas-client.tsx` — header actions.

**ActionButton candidates** (icon + label):
- All `create-*-button-root.tsx` files — `+ New X` triggers (~6 files).
- All `create-*-button.tsx` files — same pattern.
- `segment-detail-view.tsx`, `platform-detail-view.tsx`, etc. — `Mark as active` and similar.
- Inside Create modals — Generate / Save as draft buttons.

**Per-file decisions** at migration: each Button site gets evaluated. Most are clear from the JSX shape (`{Icon} <span>Label</span>` → ActionButton; `{Icon}` alone → IconButton).

## Out of scope

Documented as explicit carrythrough — these stay as direct atom imports after DS-05:

- **DropdownMenu** (3 imports: `app/(dashboard)/page.tsx`, `mission-workspace`, `project-workspace`). Two of these are interactive status pickers that should arguably migrate to `StatusBadge` (DS-02); the third is a per-row action menu candidate for a future `ActionMenu` molecule. **Scoped out:** future ticket.
- **Badge** (4 imports: segment-detail-view, platform-detail-view, audience-segments cards, platforms cards). All `variant="secondary"` (muted "Draft" / "Inactive" indicators). Already token-driven; wrapping adds noise. **Scoped out:** accept the imports.
- **Form-control atoms** (Input × 3, Textarea × 4, Checkbox × 2, Select × 1). DS-04 already migrated everything that fit cleanly; the remaining sites are documented deferrals (toolbar-rows, picker-rows). **Scoped out:** documented in DS-04 brief.

After DS-05, expected atom-import count: 41 → ~10. The ~10 are: 4 Badge + 3 DropdownMenu + ~3 form-control deferrals.

## Edge cases

- **Tooltip on disabled button:** the existing pattern uses `<TooltipTrigger render={<span />}>` to allow the tooltip to fire on a disabled button (browsers don't fire pointer events on disabled buttons). IconButton must replicate this — its tooltip must work even when the button is disabled. This is the *whole point* of the disabled-with-tooltip pattern in the audit.
- **`href` + `onClick` together:** if both passed, the molecule routes via Link (clicking navigates). `onClick` fires before navigation if useful for analytics. Keep it simple — Link wins for navigation; onClick is a side effect.
- **Loading state on ActionButton:** while `loading=true`, the button is disabled, the icon is replaced by `Loader2 animate-spin`, the label stays. After resolve, parent sets `loading=false`.
- **`variant="destructive"` ActionButton:** for archive/retire confirmation modals. Current pattern is to use bare Button — wrap into ActionButton with `variant="destructive"`.
- **Icon size:** standardise. Inside both molecules, icons render at `h-4 w-4`. Consumers don't pass icon sizes — molecule controls.

## Migration strategy

All-in-one (matches DS-02 / DS-04 / DS-09 precedent). Per-file walk-through:
1. Read the file's Button uses.
2. Classify each: IconButton / ActionButton / leave-as-bare-Button-with-justification.
3. Migrate.
4. Drop now-unused imports (`Button`, `Tooltip`, `Link` — depending on what remains).
5. Move to next file.

After all 21 files: run `npm run check:design-system` — expect ~10 atom imports remaining (the documented carrythrough). Run `npx tsc --noEmit` — expect zero new errors.

## Decisions log

- 2026-04-27: Brief drafted. Triggered by foundation-audit DS-08 atom-import warnings.
- 2026-04-27: Decisions:
  - **2 molecules, not 3**: `IconButton` + `ActionButton`. No `PrimaryButton`/`SecondaryButton` — those would just rename Button's existing variants.
  - **Both accept `href`** for Link rendering — eliminates the `nativeButton={false} render={<Link>}` boilerplate.
  - **Both accept `tooltip`** — IconButton's tooltip default-on (most icon buttons benefit from explanation); ActionButton's default-off (label is already visible).
  - **`loading` on ActionButton only** — IconButton fires-and-forgets; ActionButton commonly drives async work (Generate, Save).
  - **Out-of-scope, documented**: DropdownMenu (3), Badge (4), form-control deferrals (~3) stay. Future tickets cover these.
  - **All-in-one migration** — matches precedent.
- 2026-04-27: Brief approved.
- 2026-04-27: Build complete.
  - Built `IconButton` and `ActionButton` molecules. Both accept `href` for Link rendering. IconButton has default-on tooltip; ActionButton has optional tooltip + loading state. ActionButton supports `ghost` variant in addition to default/outline/destructive.
  - Migrated ~21 organism files: 5 create-button-root files (all ActionButton), 4 cards/page.tsx files (mix), 4 DNA detail views (segment / platform / knowledge-asset / offer), 4 inline editor view files (brand-meaning, value-proposition, tone-of-voice, ideas-client), 2 list-clients (clients/missions), error.tsx, dashboard home page (partial — DropdownMenu trigger Button kept), and 2 workspace files (mission/project — DropdownMenu trigger Buttons kept with comments).
  - Eliminated all 3 Tooltip-wrapping-Button patterns — folded into IconButton's tooltip prop.
  - Atom imports: 41 → 20. Remaining 20 are documented carrythrough: 4 Badge (decorative pills, deferred), 3 DropdownMenu (deferred to future ActionMenu work), 3 DropdownMenuTrigger render Buttons (commented `Button kept for DropdownMenuTrigger render slot — DS-05 deferred`), and DS-04 form-control deferrals (input × 2, textarea × 3, checkbox × 2).
  - 2 specs added to design-system.md (IconButton + ActionButton). 2 registry entries added.
  - `npm run check:design-system` 0 errors. `npx tsc --noEmit` 0 new errors (pre-existing Trash2 import in knowledge-asset-detail-view.tsx unchanged and unrelated).
