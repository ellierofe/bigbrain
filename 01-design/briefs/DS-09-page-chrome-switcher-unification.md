# DS-09: Page-chrome switcher unification
Feature ID: DS-09
Status: complete
Last updated: 2026-04-27

## Summary

Replace the four near-identical pill-strip switcher molecules (`AudienceSegmentSwitcher`, `PlatformSwitcher`, `KnowledgeAssetSwitcher`, `OfferSwitcher` — ~40 LOC each, 163 LOC total) with a single generic `ItemSwitcher` molecule rendered as a compact dropdown. Sits in the PageChrome `subheader` slot (unchanged placement — same row as Draft badge, etc.). Uses base-ui Select internally. Link-based navigation. Consumer pre-filters items.

Triggered by long DNA item names overflowing the existing pill strip (e.g. long platform names, long audience-segment names) and the duplication audit-flagged in `00-project-management/foundation-audit-2026-04-25.md` § 3.

## Why this matters

- **Long names overflow the pill strip.** Today's switchers truncate at 24 chars + tooltip — a workaround. A dropdown shows the full name in the option list and only truncates the trigger.
- **4 near-identical molecules with subtle filter-rule drift.** Each has a different "active" predicate hardcoded — `s.status !== 'archived'`, `p.isActive`, `o.status !== 'retired'`. One molecule + consumer-passed-filtered-items is cleaner.
- **DS-03 scope reduction.** Removes 4 specs from the backfill queue.

## Use cases

- **Switching between sibling DNA items in a detail view** — audience segments, platforms, knowledge assets, offers. User opens a detail view, wants to navigate to another item of the same type without going back to the cards/list view.
- **(Future)** Same pattern likely needed for other plural item types (offers, missions, projects, etc. — though some of these have list views with click-through and don't need an in-page switcher).

## User journey

Not user-facing as a feature. The switching behaviour is the same as today; just the visual shape changes from pill-strip to dropdown.

## Design

### Visual contract

- **Compact dropdown trigger** in the PageChrome `subheader` row, alongside other subheader chrome (e.g. Draft badge).
- **Trigger content:** label patch (e.g. "Audience segment" — small uppercase) above + current item name + chevron.
- **Trigger size:** `h-9 max-w-[220px]` — predictable layout, ellipsis truncation when item name is too long.
- **Dropdown popup:** standard base-ui Select popup (same as SelectField/InlineCellSelect). Each option shows the full item name (no truncation).
- **Hover/focus/open states:** match `InlineCellSelect` behaviour — `bg-muted/50` on hover, `bg-muted` when open. Lighter than full SelectField envelope.
- **Empty / single-item:** rendered nothing when fewer than 2 items in the list (matches existing molecule behaviour).

### Navigation

- Link-based: consumer passes `getHref(item)`. Selection triggers `router.push(getHref(item))` internally.
- Each option in the dropdown is rendered as a base-ui Select Item; selection fires the navigation.

### Accessibility

- Built on base-ui Select — full keyboard nav, ARIA correctness, focus management for free.
- Selected item visible with a checkmark in the dropdown.
- Trigger has `aria-label="Switch [item type]"` so screen readers describe the control.

## Molecule API

```ts
interface ItemSwitcherProps<T> {
  /** Pre-filtered list of items to show. Switcher is hidden if length < 2. */
  items: T[]
  /** ID of the currently-displayed item. Used to mark the active option in the dropdown. */
  currentId: string
  /** Returns the href for navigation when an item is selected. */
  getHref: (item: T) => string
  /** Returns the label shown in the trigger (when current) and option list. */
  getLabel: (item: T) => string
  /** Returns a stable id for keying. Defaults to (item) => (item as { id: string }).id. */
  getId?: (item: T) => string
  /** The kind of thing being switched between — shown as a small label patch above the value. e.g. "Audience segment". */
  label: string
  /** Maximum trigger width in px. Default 220. */
  maxWidth?: number
  className?: string
}
```

Generic over `T` so consumers can pass their domain types directly without mapping to a `{ id, label, href }` shape (cleaner than forcing the shape).

## Migration

**4 detail views to migrate:**
- `02-app/app/(dashboard)/dna/audience-segments/[id]/segment-detail-view.tsx` — `<AudienceSegmentSwitcher segments={allSegments} currentId={segment.id} />` → `<ItemSwitcher items={activeSegments} currentId={segment.id} getHref={s => '/dna/audience-segments/' + s.id} getLabel={s => s.segmentName} label="Segment" />` (or similar).
- `02-app/app/(dashboard)/dna/platforms/[id]/platform-detail-view.tsx` — analogous.
- `02-app/components/knowledge-asset-detail-view.tsx` — analogous.
- `02-app/components/offer-detail-view.tsx` — analogous.

**Consumer responsibility for filtering:**
- AudienceSegmentSwitcher's `s.status !== 'archived'` → consumer filter.
- PlatformSwitcher's `p.isActive` → consumer filter.
- KnowledgeAssetSwitcher's filter → confirm at migration time.
- OfferSwitcher's filter → confirm at migration time (likely `o.status !== 'retired'`).

**4 molecule files to delete:**
- `02-app/components/audience-segment-switcher.tsx`
- `02-app/components/platform-switcher.tsx`
- `02-app/components/knowledge-asset-switcher.tsx`
- `02-app/components/offer-switcher.tsx`

**Registry:** add `ItemSwitcher` entry; remove the four old switcher entries.

**Spec doc:** new `### ItemSwitcher` molecule spec; no spec to remove (the four old switchers were `spec: null` — DS-03 territory). Net result: DS-03 has 4 fewer specs to write.

**Template doc** (`01-design/wireframes/templates/dna-plural-item-template.md`): update wherever the pill-strip switcher is documented to reference ItemSwitcher in the subheader slot.

## Update behaviour

Not applicable — this is a refactor.

## Relationships

### Knowledge graph (FalkorDB)
None.

### Postgres
None.

## Edge cases

- **List of 1 active item** → render nothing (matches existing behaviour).
- **List of 0 active items** → render nothing.
- **Long item name (>30 chars)** → truncate with ellipsis in the trigger, full name visible in dropdown.
- **Current item not in active list** → still renders the trigger with the current item's name (so user has a way to navigate away). Defensive — shouldn't happen in normal flow but worth handling.
- **Disabled state** — N/A. Switchers don't have a disabled use case; if needed later, add.

## Out of scope

- **PageChrome API change.** Subheader stays a flexible ReactNode slot. No new `switcher` prop on PageChrome.
- **Title-integrated switcher.** Considered (e.g. "Audience Segments / [select]" breadcrumb-style) and rejected — bigger UI change, lower priority.
- **Migration of non-DNA switchers.** No other switcher molecules exist — the four are all DNA-related.
- **Filter-rule unification.** Each consumer's "active" predicate stays consumer-side. Don't try to unify them in the molecule.

## Decisions log

- 2026-04-27: Brief drafted. Triggered by long-name overflow and audit-flagged duplication. Decisions:
  - **Placement:** PageChrome `subheader` slot (unchanged from today). Considered putting the switcher in the `action` slot alongside view-switcher icons (cards / new / archive) — rejected because action-slot semantics are "things you do to this entity" not "navigate to a sibling".
  - **New molecule, not a SelectField wrapper:** ItemSwitcher has its own semantics (navigation, no save lifecycle, Link-based). Visually borrows from `InlineCellSelect` (compact, no envelope) but is its own molecule.
  - **PageChrome API unchanged.** Subheader stays a generic ReactNode slot.
  - **Link-based API** (`getHref`) over imperative (`onSelect`). Closer to existing pill-strip molecules (which used Next.js `<Link>`) and gets prefetch benefits.
  - **Consumer pre-filters items.** Four old molecules each had different filter rules; pushing this to consumers is simpler than the molecule taking a predicate.
  - **Generic over `T`** rather than forcing a `{ id, label, href }` shape. Less mapping at call sites.
- 2026-04-27: Brief approved.
- 2026-04-27: Build complete.
  - Built: `ItemSwitcher` molecule. Compact dropdown trigger with small uppercase descriptor + current item name + chevron. Generic over `T`. Link-based via `router.push(getHref(item))`. Renders `null` when fewer than 2 items.
  - Migrated: 4 detail views (audience-segments, platforms, knowledge-assets, offers). Each uses consumer-side filter (status/isActive predicates).
  - Deleted: 4 old switcher molecules (`audience-segment-switcher.tsx`, `platform-switcher.tsx`, `knowledge-asset-switcher.tsx`, `offer-switcher.tsx`).
  - Registry: removed 3 entries (Platform/KnowledgeAsset/Offer Switchers); AudienceSegmentSwitcher entry edited in-place to become ItemSwitcher with spec anchor `molecule-specifications/itemswitcher`.
  - Spec doc: new `### ItemSwitcher` entry in design-system.md (full spec). Changelog row added.
  - Template: `dna-plural-item-template.md` updated to reference ItemSwitcher in the subheader slot.
  - `npm run check:design-system` zero errors. Missing-spec count 44 → 42 (-2 net: -3 deleted unspecced switchers, +1 new specced ItemSwitcher; AudienceSegmentSwitcher → ItemSwitcher in-place edit moved one entry from null→specced). DS-03 backfill scope reduced.
  - `npx tsc --noEmit` zero new errors.
