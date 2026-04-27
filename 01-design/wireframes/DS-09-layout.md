# DS-09 Layout — Page-chrome switcher unification

Status: draft
Last updated: 2026-04-27
Brief: `01-design/briefs/DS-09-page-chrome-switcher-unification.md`

## Template match
No applicable template. DS-09 is molecule design (1 new molecule, 4 deletions, 4 consumer migrations). Logged in the brief.

## Why a layout spec at all

DS-09 has no views, no routes. The layout work is the visual + behavioural spec of `ItemSwitcher` — the spec section that lands in `design-system.md` after build. Sections that don't apply are omitted.

---

## Molecule composition *(mandatory — drives feature-build plan gate)*

### Existing molecules used
- **PageChrome** (registry: `02-app/components/page-chrome.tsx`, spec: `design-system.md § PageChrome`) — unchanged. ItemSwitcher renders inside its `subheader` ReactNode slot. No PageChrome API change.

### Existing atoms used (in the molecule)
- **base-ui Select** via the existing shadcn-style atom at `02-app/components/ui/select.tsx`. ItemSwitcher uses `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem` — same set as `SelectField` and `InlineCellSelect`.
- **Next.js `useRouter`** from `next/navigation` — for programmatic navigation when an item is selected.

### Existing molecules used but unspecced *(known gap — DS-03)*
None — none of the molecules touched by DS-09 lack specs.

### Existing molecules to extend
None.

### New molecules required

1. **ItemSwitcher** *(net new)* — see full spec below.

### Existing molecules to remove

Four molecules deleted, registry entries removed, spec backfill scope reduced by 4:

- **AudienceSegmentSwitcher** (`02-app/components/audience-segment-switcher.tsx`) — registered, no spec (DS-03 todo). Replaced by `ItemSwitcher`.
- **PlatformSwitcher** (`02-app/components/platform-switcher.tsx`) — same.
- **KnowledgeAssetSwitcher** (`02-app/components/knowledge-asset-switcher.tsx`) — same.
- **OfferSwitcher** (`02-app/components/offer-switcher.tsx`) — same.

### Atoms used directly *(should be empty)*
None directly in organisms. (Within the ItemSwitcher molecule itself, base-ui Select atoms are correctly used — the molecule IS the right place for atom composition.)

---

## Visual spec

### ItemSwitcher

**File:** `02-app/components/item-switcher.tsx` *(new)*

**Purpose:** Compact dropdown for navigating between sibling items of the same DNA type within a detail view. Sits in the PageChrome `subheader` slot. Distinct from `SelectField` (which edits a value), `InlineCellSelect` (which is for table cells), and `StatusBadge` (which changes state). ItemSwitcher's purpose is *navigation* — selecting an option triggers a route change.

**Anatomy:**
- Outer wrapper: nothing — the molecule renders the base-ui Select directly with the trigger styled as a compact pill.
- **Trigger** (`Select.Trigger`):
  - `inline-flex items-center gap-1 h-9 max-w-[var(--max-width)] px-3 rounded-md text-sm bg-transparent border border-border/60 hover:border-border hover:bg-muted/30 transition-colors`
  - `data-[state=open]:bg-muted data-[state=open]:border-border`
  - Inside the trigger, vertical-stack the small uppercase label (`text-[10px] font-semibold uppercase tracking-wide text-muted-foreground`) with the current item name (`text-sm font-medium text-foreground truncate`).
  - Chevron at the right (`ChevronDown h-3.5 w-3.5 text-muted-foreground shrink-0`).
- **Dropdown popup** (`Select.Content`): standard base-ui Select popup, same pattern as SelectField/InlineCellSelect — `bg-card border border-border rounded-lg shadow-[var(--shadow-raised)] py-1`. Each option: `flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted cursor-pointer`. Selected option: `bg-muted` + `Check` icon at right.

**Behavioural states:**
- **Idle**: `border-border/60`.
- **Hover**: `border-border bg-muted/30`.
- **Open**: `border-border bg-muted`.
- **Focus**: standard focus ring (focus-visible) — `ring-2 ring-ring ring-offset-1`.
- **Hidden** (when `items.length < 2`): nothing rendered. Returns `null`.

**Navigation behaviour:**
- On select: `router.push(getHref(selectedItem))`. No optimistic state — Next.js handles the route change.
- The base-ui Select's `onValueChange` fires once the user picks an option; the molecule passes the selected `id` to `getHref`.

**Truncation behaviour:**
- Trigger `max-w-[220px]` by default (configurable via `maxWidth` prop). `truncate` on the current item name → CSS ellipsis when too long.
- Dropdown options are NOT truncated. Long names visible in full.

**Accessibility:**
- `aria-label="Switch ${label}"` on the trigger, where `label` is the prop (e.g. "segment", "platform"). Screen reader announces "Switch segment, button" or similar.
- Selected option has `aria-selected={true}` (handled by base-ui automatically).
- Keyboard navigation: standard base-ui Select behaviour — Up/Down to move, Enter to select, Esc to close.

**Edge cases:**
- **`items.length < 2`**: render `null` (matches existing molecules' behaviour).
- **Current item not in `items`**: render the trigger with the current item's name still showing (defensive — current item should always be in the list, but if it isn't, user still has a way to navigate away). The molecule receives `items` and `currentId`; if no match, the `currentLabel` falls back to the `label` prop. *(Implementation note: pass the current item's label separately if the current item might be filtered out — at build I'll check the four migration sites to see which is relevant.)*
- **Trigger overflow when label + name combined are very long**: `truncate` ensures CSS handles it; nothing breaks.

**Props:**
```ts
interface ItemSwitcherProps<T> {
  items: T[]                      // pre-filtered active items
  currentId: string
  getHref: (item: T) => string
  getLabel: (item: T) => string
  getId?: (item: T) => string     // default: (item) => (item as { id: string }).id
  label: string                   // small uppercase text shown inside trigger
  maxWidth?: number               // default 220
  className?: string
}
```

**Do not:**
- Hardcode colour classes inside the molecule.
- Render the small label as a floating-label patch like InlineField/SelectField — this is a compact pill, not a field.
- Save anything — navigation only. No `onSave`, no Saved/Failed indicator.
- Add an `onSelect` callback — `getHref` is the API. If a future use case truly needs imperative selection, that's a different molecule.
- Add a "create new" option in the dropdown — separate concern; the existing "+ New segment" button in the action slot covers that.

---

## Where each piece lands in design-system.md

After build:

1. **`## Molecule specifications`** — new entry `### ItemSwitcher` (full DS-02 format).
2. **`## Changelog`** — new row: `2026-04-27 | DS-09: ItemSwitcher molecule replaces 4 pill-strip switcher molecules. Long item names now handled via dropdown.`

No other sections change. The four old switcher molecules had no specs in design-system.md (they were `spec: null` DS-03 todos), so nothing to remove.

---

## Open questions to resolve at build time

1. **Current-item-not-in-items handling** — the current item's label needs to render in the trigger. If consumers always pass a `currentItem` that's also in `items`, we're fine; if not, we need a fallback `currentLabel` prop. Decide at migration time when reading each consumer's filter logic.

2. **base-ui Select trigger structure for the small uppercase label** — base-ui Select's `Select.Value` renders the selected item's value. We may need to render the label patch outside the `Select.Value` (as a sibling div inside the trigger). At build, verify this works without breaking base-ui's selection rendering.

3. **`getId` default** — defaults to `(item as { id: string }).id`. Most consumer types have `id` as a required string field. If any consumer's "id" is named differently, override via prop.

4. **`maxWidth` as a number vs. a Tailwind class** — passed as a number (default 220) and converted to `style={{ maxWidth: maxWidth + 'px' }}`. Could alternatively accept an arbitrary Tailwind class. Number-based is simpler at the call site; sticking with it unless a consumer needs something Tailwind-only handles.
