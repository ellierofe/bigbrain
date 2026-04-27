# DS-02 Layout — Semantic colour tokens + status & type molecules

Status: draft
Last updated: 2026-04-25
Brief: `01-design/briefs/DS-02-semantic-tokens-status-and-type-molecules.md`

## Template match
No applicable template. DS-02 is a token + molecule design, not a page-level UI pattern. Logged in the brief.

## Why a layout spec at all

DS-02 doesn't have views, navigation, or routes. But it does have **two molecules with concrete visual contracts** (`StatusBadge`, `TypeBadge`) that the build will consume. The spec for those molecules is the layout work. The rest of this document focuses on:

1. The full molecule composition (drives `feature-build` plan gate).
2. Visual specs for `StatusBadge` and `TypeBadge` — what they look like in every state.
3. Where in the design-system spec each new piece lands.
4. Globals.css token block structure.

Sections that don't apply (List view, Detail view, Create flow, Edit flow, Delete flow, Image handling, Empty states, Loading states, Mobile) are omitted — this is internal infrastructure.

---

## Molecule composition *(mandatory — drives feature-build plan gate)*

### Existing molecules used
- **InlineField** (registry: `02-app/components/inline-field.tsx`, spec: `design-system.md § InlineField`) — touched only to update one line of its spec doc (the "Saved" colour reference). No code change to the component itself; its `text-emerald-600` literal at line 135 becomes `text-success` as part of migration. Spec stays accurate because the new token resolves to roughly the same colour.

### Existing molecules used but unspecced *(known gap — DS-03)*
- **ConfidenceBadge** (registry: `02-app/app/(dashboard)/inputs/process/confidence-badge.tsx`, no spec) — refactored to consume state tokens. DS-02 does NOT spec it (that's DS-03's job), but does close the broken-internals problem by removing hardcoded hue classes and dropping `dark:` overrides. Future spec backfill (DS-03) documents what's already implemented.

### Existing molecules to extend
- **StatusBadge** (registry: `02-app/components/status-badge.tsx`, no spec — currently a known-gap entry) — refactored internals to consume state tokens. Adds a spec to `design-system.md` (closes the gap for this molecule as part of DS-02). Public API change: the `options` prop's option shape changes from `{ value, label, className }` to `{ value, label, state }` where `state` is one of `'success' | 'warning' | 'error' | 'info' | 'neutral'`. The default option set's behaviour is preserved: draft → warning, active → success, archived → neutral. All call sites passing custom options need to migrate (see Migration scope in the brief — only the default-options call sites are affected; no current site passes custom options, so it's purely an internal refactor).

### New molecules required
- **TypeBadge** *(net new)* — generic decorative category pill. **One-line spec sketch:**
  - **Props**: `hue: 1 | 2 | 3 | 4 | 5 | 6`, `label: string`, `size?: 'xs' | 'sm'` (default `'xs'`).
  - **Visual**: `inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-tag-{hue} text-foreground`. `size='sm'` upgrades to `text-sm px-2.5 py-1`. No hover/focus state — non-interactive by design.
  - **Replaces**: ~10 sites currently composing inline pills with hardcoded hue classes (voc-table category cells, voc-mapping kind labels in 3 modal files, entity-outcomes-panel kind cells, platforms cards, platform-detail-view header, mission-workspace phase labels, project-workspace phase labels).

### Atoms used directly *(should be empty)*
None. Both molecules are self-contained — no `components/ui/*` atoms are composed inside them. `StatusBadge` already uses a plain `<button>` and a custom dropdown div internally (which is its own design-system-debt — that custom dropdown should eventually become an `ActionMenu` molecule, scope of DS-05/07, NOT DS-02).

---

## Visual specs

### StatusBadge — final spec

**File:** `02-app/components/status-badge.tsx`
**Purpose:** Interactive status indicator with dropdown to change status. Used in detail view headers (knowledge assets, audience segments, platforms, offers) and list cards.

**Anatomy:**
- Button (the visible pill): `inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-opacity` — interactive, opens dropdown on click.
- Dropdown (positioned below the button): `absolute top-full left-0 z-50 mt-1 rounded-md border border-border bg-card shadow-[var(--shadow-raised)] py-1 min-w-[120px]` — already token-driven, no change.
- Each dropdown option: a button with a small dot indicator + label.

**State styling (driven by the `state` keyword on each option):**
- `state: 'success'` → `bg-color-success-bg text-color-success-foreground` (or use Tailwind alias `bg-success-bg text-success-foreground` — the `globals.css` mapping is in the implementation section below).
- `state: 'warning'` → `bg-warning-bg text-warning-foreground`.
- `state: 'error'` → `bg-error-bg text-error-foreground`.
- `state: 'info'` → `bg-info-bg text-info-foreground`.
- `state: 'neutral'` → `bg-muted text-muted-foreground` (already token-driven, kept).

**Behavioural states:**
- Idle: full opacity.
- Hover: `hover:opacity-80 cursor-pointer` (existing — keep).
- Pending (waiting for the async `onChange`): `opacity-60`, button disabled.
- Open dropdown: chevron rotates? — current implementation does not rotate; keep as is for DS-02. (Polish for DS-07 maybe.)

**Default option set:**
```ts
[
  { value: 'draft',    label: 'Draft',    state: 'warning' },
  { value: 'active',   label: 'Active',   state: 'success' },
  { value: 'archived', label: 'Archived', state: 'neutral' },
]
```

**Custom options:** Consumers pass an array of `{ value, label, state }`. The map from `state` keyword to className is internal to the molecule.

**Accessibility:**
- Button has `aria-haspopup="listbox"` and `aria-expanded={open}`.
- Dropdown options are buttons (already keyboard-focusable).
- Existing click-outside dismissal preserved.

**Do not:**
- Hardcode colour classes inside the component.
- Add a state keyword the brief doesn't list (`success | warning | error | info | neutral` is the closed set for now).
- Bake in any specific status string — `value` and `label` are arbitrary; the molecule renders whatever the consumer passes.

---

### TypeBadge — full spec

**File:** `02-app/components/type-badge.tsx` *(new)*
**Purpose:** Decorative non-interactive pill indicating *which kind* of thing this is. Distinct from StatusBadge (which indicates *what state*). Used inline in tables, inline in card grids, inline in detail-view headers, inline in workspace headers.

**Anatomy:**
A single `<span>` element. No children other than the label string.

**Sizes:**

| Size | Default | Tailwind |
|---|---|---|
| `xs` | yes | `text-xs px-2 py-0.5` |
| `sm` | no | `text-sm px-2.5 py-1` |

**Hue mapping (numeric, 1–6):**
The molecule does not name hues. Each call site picks an index. Per-feature mappings (which platform type → which index) live in the consumer file — they're feature concerns, not molecule concerns.

**Layout:**
- Inline by default — drops into table cells, card metadata rows, header chrome alongside text.
- `inline-flex items-center` so any future icon prop slot would align correctly.
- `rounded-full`. `font-medium` always.
- Background: `bg-tag-{hue}` (one of 6 desaturated colours).
- Text: `text-foreground` (the existing dark foreground token — sufficient contrast on all six tag backgrounds since they're all desaturated).
- No transition, no hover, no focus state.

**Accessibility:**
- Renders as a plain `<span>` — the label is plain text and screen readers read it. No special ARIA needed. If a consumer needs the pill to convey meaning beyond the visible label, that should be provided in surrounding context.

**Do not:**
- Make it interactive. If a feature needs a clickable category filter, that's a different molecule.
- Add an `onClick` prop. It's a `<span>`, not a button.
- Hardcode colour classes; only consume tag tokens.

**Example consumer code (illustrative, not part of the spec):**

```tsx
// voc-table.tsx category header
const VOC_CATEGORY_HUES = {
  problems: 1,
  desires: 6,
  objections: 3,
  shared_beliefs: 4,
} as const

<TypeBadge hue={VOC_CATEGORY_HUES[category]} label={CATEGORY_LABELS[category]} />
```

---

## Token system — globals.css structure

### Where to add the tokens
Inside the existing `:root` block in `02-app/app/globals.css`, immediately after the existing semantic colour tokens (`--field-active` is the last one). Two new sub-blocks with section comments:

```css
:root {
  /* ... existing semantic tokens ... */
  --field-active: #4A8B9C;

  /* ===== State tokens (DS-02) ===== */
  /* Used for status, save feedback, confidence, warnings. */
  --color-success: #047857;             /* emerald-700 */
  --color-success-bg: #D1FAE5;          /* emerald-100 */
  --color-success-foreground: #064E3B;  /* emerald-900 */

  --color-warning: #B45309;             /* amber-700 */
  --color-warning-bg: #FEF3C7;          /* amber-100 */
  --color-warning-foreground: #78350F;  /* amber-900 */

  --color-error: var(--destructive);
  --color-error-bg: #FEE2E2;            /* red-100 */
  --color-error-foreground: #7F1D1D;    /* red-900 */

  --color-info: #1D4ED8;                /* blue-700 */
  --color-info-bg: #DBEAFE;             /* blue-100 */
  --color-info-foreground: #1E3A8A;     /* blue-900 */

  /* ===== Tag tokens (DS-02) ===== */
  /* Decorative category differentiation. Indexed for future-proofing — */
  /* hue names in comments, not in token names. */
  /* Each token is a desaturated background colour. Pill text uses */
  /* --foreground (existing dark token) — sufficient contrast on all six. */
  --color-tag-1: #A1BED6;   /* dusty blue */
  --color-tag-2: #C4A5B7;   /* dusty lilac */
  --color-tag-3: #E5E0A3;   /* custard */
  --color-tag-4: #A5A8C4;   /* dusty lavender */
  --color-tag-5: #CE998B;   /* terracotta */
  --color-tag-6: #748B7E;   /* olive */
}
```

Tag tokens are single-role (background only). Text on a tag pill is always `--foreground` (existing dark text token). User-supplied desaturated palette gives sufficient contrast for AA-compliant readable text without per-tag foreground colours.

### How they're consumed (Tailwind v4)

This project uses Tailwind v4 with `@theme inline { ... }` in `globals.css` — there is **no `tailwind.config.js`**. CSS variables prefixed with `--color-*` inside the `@theme inline` block automatically generate Tailwind utility classes.

So the implementation has two parts in `globals.css`:

1. **Define semantic CSS variables in `:root`** — e.g. `--success: #047857;`. (No `--color-` prefix here — that's reserved for the theme block to avoid double prefixing.)
2. **Register them in `@theme inline`** — e.g. `--color-success: var(--success);`. This is what auto-generates `text-success`, `bg-success`, etc.

The exact additions in the implementation plan are spelled out in Step B's "Files to modify".

### Naming convention for utility classes
- State: `text-success`, `bg-success-bg`, `text-success-foreground`, etc. (and same for warning/error/info).
- Tag: `bg-tag-{1-6}` only. No `-bg` or `-foreground` suffixes — tag tokens are single-role backgrounds. Pill text uses `text-foreground` (existing).
- Hex values are tuned in the `:root` block; the `@theme inline` block doesn't change.

---

## Where each piece lands in design-system.md

This is what gets edited in `01-design/design-system.md` after build:

1. **`## Semantic tokens` → new subsection `### State (DS-02)`** — the four state tokens table.
2. **`## Semantic tokens` → new subsection `### Tag (DS-02)`** — the six tag tokens table.
3. **`## Molecule specifications` → new entry `### StatusBadge`** — the spec written above (closes the molecule's spec gap as part of DS-02).
4. **`## Molecule specifications` → new entry `### TypeBadge` *(new)`*** — the full spec written above.
5. **`### InlineField` spec** — one-line update: change "`text-emerald-600`" reference to "`text-success`" in the Save feedback bullet.
6. **`## Changelog`** — new row: `2026-04-25 | DS-02: state + tag tokens, StatusBadge spec backfilled, TypeBadge new.`

---

## Visual benchmark — expected outcome

After DS-02:
- "Saved" badges across the app render in the same `--color-success` hue (today: `text-emerald-600` in 4 files; final: same colour, single source).
- All "draft" status pills render in `--color-warning-bg` / `-foreground` (today: 6 different files each saying `bg-amber-100 text-amber-800`; final: a single StatusBadge that knows draft → warning).
- VOC category pills render in 4 of the 6 tag hues, consistently across voc-table, voc-mapping, create-asset-modal, create-offer-modal (today: 4 files each saying `bg-blue-100 text-blue-800` etc.; final: `<TypeBadge hue={VOC_CATEGORY_HUES[category]} ...>`).
- Platform type pills render in 5 of the 6 tag hues, consistently across platforms-cards and platform-detail-view (today: 2 files each saying `bg-blue-100 text-blue-700` etc.).
- The drift-check script reports zero broken anchors (StatusBadge gains a real spec; ConfidenceBadge becomes a known-gap on tokens internally even if its spec stays a DS-03 todo).
- Direct atom imports (DS-08 warning) unchanged by DS-02 — that's DS-05's territory.

---

## Open questions to resolve at build time

(Carried forward from the brief, plus any new ones surfaced by this spec.)

1. **Final hex tuning** — provisional state-token values mapped to current Tailwind for minimal visual jump. At build, sample against `--background` and `--card` and verify the success/warning hues don't clash with sage primary. Tag tokens are user-supplied; tweak in token file if any prove illegible against `--foreground` text.
2. **Per-feature hue mappings** — final visual check during migration that no two adjacent badges in any view collide hues. The starting suggestions in the brief are just that; can be swapped per consumer if a clash is found.

## Decisions confirmed since brief approval (2026-04-25)

- Tag tokens are single-role backgrounds (6 tokens, not 18). Text uses existing `--foreground`.
- `TypeBadge` `outline` variant dropped (no consumer needs it).
- VOC-mapping hue map extracted to `02-app/lib/voc-mapping-hues.ts` (shared by voc-mapping, create-asset-modal, create-offer-modal). Standardising over duplication.
