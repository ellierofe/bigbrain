# Layout Spec: OUT-01b Adaptive Chat Context Pane
Status: approved
Last updated: 2026-04-30
Brief: `01-design/briefs/OUT-01b-adaptive-chat-context-pane.md` (approved 2026-04-30)
Template: establishes `chat-context-pane` pattern (new pattern — extends `chat-conversation` from OUT-01)

---

## Template check result

No applicable template found. The closest existing pattern is `chat-conversation` (OUT-01) which establishes the chat page layout (history panel left + message area + input area), but does not include a right-side context pane. OUT-01b adds a third column to the chat-conversation pattern and introduces an icon-rail-plus-content-panel structure that no other pattern carries. This spec extends `chat-conversation` and establishes a reusable `chat-context-pane` sub-pattern.

---

## Views

| View | Purpose | When it appears |
|---|---|---|
| Pane open (default) | Right-side icon rail + content panel within `/chat` and `/chat/[id]` | When `brand.chat_pane_open = true` |
| Pane closed | Pane fully collapsed; only a re-open toggle remains in the chat toolbar area | When `brand.chat_pane_open = false` |
| Skill-state tab — active skill | Shows skill name, checklist, stage cards with gathered values, completion banner if completed | `conversation.skill_id` is set |
| Skill-state tab — empty conversation freeform | Shows skill picker (list of available skills) | `conversation.skill_id` is null AND no messages |
| Skill-state tab — freeform with messages | Empty-state explainer + "start a new conversation" CTA | `conversation.skill_id` is null AND messages exist |
| Skill-state tab — registry miss | Explainer "this conversation used a skill that's no longer available" | `skill_id` set but not in registry |
| Skill-state tab — completed | Completion banner + final state snapshot | `skill_state.completedAt` is set |

The drawer mode (OUT-01's slide-out drawer from the top toolbar) does **not** include the context pane in v1 — too narrow at 440px. Drawer remains as in OUT-01.

---

## Navigation and routing

No new routes. The pane mounts as a new column inside the existing `/chat` and `/chat/[id]` layouts. State persists per-brand (`brands.chat_pane_open`, `brands.chat_pane_width`) and per-conversation (`conversations.context_pane_state.selectedTabId`).

The pane is **not** present on the slide-out chat drawer. Drawer remains a full-bleed compact chat experience as in OUT-01.

---

## Page layout: full chat page with pane open

### Updated structure (extends OUT-01)

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  [NavSidebar]  │  CHAT PAGE                                                    │
│   220px        │                                                               │
│                │  ┌────────┬─────────────────────────────────────┬───────────┐│
│                │  │HISTORY │ MESSAGE AREA                        │ CONTEXT   ││
│                │  │PANEL   │                                     │ PANE      ││
│                │  │280px   │  [messages, max-w-3xl]              │ 360px*    ││
│                │  │(coll)  │                                     │           ││
│                │  │        │                                     │ ┌─────┬─┐ ││
│                │  │        │                                     │ │ CONT│R│ ││
│                │  │        │                                     │ │ ENT │A│ ││
│                │  │        │                                     │ │ PNL │I│ ││
│                │  │        │                                     │ │     │L│ ││
│                │  │        │                                     │ │     │ │ ││
│                │  │        │                                     │ │     │ │ ││
│                │  │        │                                     │ │     │ │ ││
│                │  │        │  ┌─────────────────────────┐        │ │     │ │ ││
│                │  │        │  │ INPUT AREA              │        │ │     │ │ ││
│                │  │        │  └─────────────────────────┘        │ └─────┴─┘ ││
│                │  └────────┴─────────────────────────────────────┴───────────┘│
└────────────────────────────────────────────────────────────────────────────────┘
*per-brand width (default 360px), resizable 280–560px, clamped so message area ≥ 480px.
```

### Updated structure with pane closed

```
┌────────────────────────────────────────────────────────────────────────────────┐
│  [NavSidebar]  │  CHAT PAGE                                                    │
│   220px        │                                                               │
│                │  ┌────────┬─────────────────────────────────────────────────┐│
│                │  │HISTORY │ MESSAGE AREA       [⊞ open pane]                ││
│                │  │PANEL   │                                                  ││
│                │  │280px   │  [messages, max-w-3xl, more breathing room]     ││
│                │  │        │                                                  ││
│                │  │        │  ┌─────────────────────────┐                    ││
│                │  │        │  │ INPUT AREA              │                    ││
│                │  │        │  └─────────────────────────┘                    ││
│                │  └────────┴─────────────────────────────────────────────────┘│
└────────────────────────────────────────────────────────────────────────────────┘
```

The `[⊞ open pane]` re-open toggle is placed in the top-right of the message area (above the messages, aligned with where the pane would start). When the pane is open, the toggle becomes the close button inside the pane header.

### Width constraints

- Pane width: clamped at render time to `min(brand.chat_pane_width, viewport - 480px - 220px - 280px - margins)`. If the message area would be squeezed below 480px, the pane shrinks first; if shrinking to its minimum (280px) still violates the constraint, the message area takes priority and the pane uses 280px.
- History panel collapse (existing behaviour) gives the pane more room when the user wants both visible at full width.
- Below 990px viewport: not supported (`ScreenSizeGate` blocks).

---

## Pane structure

### Outer shell

```
┌─────────────────────────────────────────┬─────┐
│ [tab label]                       [×]   │     │
├─────────────────────────────────────────┤     │ ← rail (right edge, ~56px)
│                                         │  ●  │   ● = icon for skill-state tab
│                                         │     │     (active state — has dot)
│   CONTENT PANEL                         │     │
│   (selected tab's render)               │  ○  │   ○ = future tab icons
│   scrollable                            │     │     (greyed when hidden;
│                                         │     │      empty when applicable
│                                         │     │      but no content)
│                                         │     │
│                                         │     │
│                                         │     │
└─────────────────────────────────────────┴─────┘
       ↑
   resize handle (left edge of pane)
```

### Container

- Surface: `bg-card`, `border-l border-border`
- Sits as a sibling to `MESSAGE AREA`. Full height of the chat page area.
- No shadow (it's part of page chrome, not floating chrome).
- The whole pane (rail + content panel) acts as a single layout block.

### Rail (right edge of the pane)

- Width: 56px, fixed
- Position: pinned to the right edge of the pane
- Surface: `bg-muted` (sage-light) — visually distinct from the content panel's `bg-card`
- Border: `border-l border-border` separating rail from content panel
- Icon stack: vertical, top-aligned, gap-2, padding `py-3 px-2`
- Each icon is a `RailIcon` button (new molecule — see Molecule composition):
  - `Brain` icon for skill-state tab (Lucide `Brain`)
  - 40px square hit area (larger than the standard IconButton — primary nav surface)
  - Selected state: `bg-card` background (so it visually "joins" the content panel) + `text-foreground`
  - Active-with-content state: small dot indicator (`--color-success`, 6px, top-right) when `status === 'active'` AND there's content
  - Empty-but-applicable state: no dot, `text-muted-foreground`
  - Hidden state: not rendered at all
  - Hover: `bg-card/50` with `text-foreground`
  - Tooltip on hover: tab `label` (e.g. "Skill state")
  - Completion state (skill-state tab only when `completedAt` set): `Check` icon adornment overlaid bottom-right, in `--color-success`

### Content panel

- Fills remaining width (pane width minus 56px rail)
- Surface: `bg-card`
- Padding: `px-4 py-3` (header) + scrollable content body with `px-4 pb-4`
- Internal layout: header strip (current tab's label + close button) on top, scrollable body below

### Pane header strip

```
┌─────────────────────────────────────────┐
│ [Tab label]                       [×]   │
└─────────────────────────────────────────┘
```

- Border-bottom: `border-b border-border`
- Padding: `px-4 py-3`
- Label: `text-sm font-medium text-foreground`
- Close button: `IconButton` molecule with `X` icon, `variant="ghost"`, sets `brand.chat_pane_open = false`

### Resize handle

- 4px-wide invisible drag target on the pane's left edge
- Cursor: `col-resize` on hover
- Hover: 1px sage-light line appears (subtle indicator)
- Drag updates pane width live; on release, persists `brand.chat_pane_width` via server action
- Bounds: 280px–560px (clamped further by viewport rule above)

### Re-open toggle (pane closed state)

- Placement: floating button in the top-right of the message area, sitting just inside the chat page area
- Component: `IconButton` molecule, icon `PanelRightOpen` (Lucide), `variant="ghost"`, tooltip "Open context pane"
- Action: sets `brand.chat_pane_open = true`

---

## Tab content: skill-state (v1's only tab)

The skill-state tab renders four distinct states based on the conversation's status:

### State 1: active skill (most common)

```
┌─────────────────────────────────────────┐
│ Skill state                       [×]   │
├─────────────────────────────────────────┤
│ ╭─────────────────────────────────────╮ │  ← Skill summary card
│ │ Brand meaning generate              │ │     (SectionCard)
│ │ Capture problem, future, values,    │ │
│ │ and draft a brand meaning statement │ │
│ ╰─────────────────────────────────────╯ │
│                                         │
│ Checklist                               │  ← label heading (uppercase meta)
│ ☑ Problem captured                      │
│ ☑ Future state captured                 │
│ ☐ Values captured                       │  ← unfilled
│ ☐ Draft written                         │
│                                         │
│ Stages                                  │  ← label heading
│ ╭─ ✓ Problem ─────────────────────╮     │  ← collapsed completed stage
│ │                                  ▾│     │
│ ╰──────────────────────────────────╯     │
│ ╭─ ✓ Future ──────────────────────╮     │  ← collapsed completed stage
│ │                                  ▾│     │
│ ╰──────────────────────────────────╯     │
│ ┃   Values  (current)  ──────────╮     │  ← collapsed current stage
│ ┃                                  ▾│     │     (3px primary left border, no inline marker)
│ ╰──────────────────────────────────╯     │
│ ╭─ ○ Draft ───────────────────────╮     │  ← collapsed pending stage
│ │                                  ▾│     │
│ ╰──────────────────────────────────╯     │
└─────────────────────────────────────────┘
```

Sections, top to bottom:

1. **Skill summary card** — `SectionCard` molecule with skill `name` as title, `description` as description. No action.
2. **Checklist heading** — small uppercase label: `text-xs font-medium uppercase tracking-wide text-muted-foreground`, with `mb-2 mt-4` spacing.
3. **Checklist** — a vertical list of items. Each item:
   - Filled: `Check` icon in `--color-success`, label in `text-foreground`
   - Unfilled: empty circle in `text-muted-foreground`, label in `text-muted-foreground`
   - `text-sm`, `gap-2 py-1.5`
   - Read-only — no click handler in v1 (manual fill is out of scope per the brief)
4. **Stages heading** — same as checklist heading.
5. **Stage cards** — `StageCard` (new molecule). One per stage, in declared order. Each card has:
   - Status marker: `Check` icon for completed (in `--color-success`), empty circle for pending; the **current stage** has no inline marker — instead, the entire card carries a 3px coloured left border in `--primary` for unmissable identification.
   - Stage label (centre): `text-sm font-medium`
   - Current-stage suffix: `(current)` in `text-muted-foreground` when the stage is the current one
   - Disclosure caret (right): chevron, rotates on expand
   - **All collapsed by default. Multiple can be expanded at once.** Expand reveals a list of `gathered` keys+values associated with that stage (read-only key-value display — see "Gathered value rendering" below).
   - Click on the whole header toggles expand/collapse.

The whole panel is scrollable; if there are many stages or large gathered values, scroll happens inside the content panel.

### State 2: empty conversation, no skill (skill picker)

```
┌─────────────────────────────────────────┐
│ Skill state                       [×]   │
├─────────────────────────────────────────┤
│ Choose a skill                          │  ← uppercase label
│                                         │
│ ╭─────────────────────────────────────╮ │
│ │ [icon] Brand meaning generate       │ │  ← SkillPickerRow (new molecule)
│ │        Capture problem, future...   │ │
│ ╰─────────────────────────────────────╯ │
│ ╭─────────────────────────────────────╮ │
│ │ [icon] Hello world                  │ │
│ │        Test fixture for runtime     │ │
│ ╰─────────────────────────────────────╯ │
│                                         │
│ Or keep chatting freely                 │  ← muted explainer below the list
└─────────────────────────────────────────┘
```

Click on a row attaches the skill to the current conversation (since it has no messages). On attach: pane re-renders into State 1, conversation gets `skill_id` set (server action) and the skill's opening message is generated by OUT-01a's runtime.

If the picker is empty (no skills in registry — shouldn't happen in v1 with the `hello-world` fixture), shows an `EmptyState` molecule: "No skills available yet."

### State 3: freeform with messages (locked)

```
┌─────────────────────────────────────────┐
│ Skill state                       [×]   │
├─────────────────────────────────────────┤
│       [Brain icon, muted, 32px]         │
│                                         │
│   This conversation is freeform.        │
│   To use a skill, start a new           │
│   conversation.                         │
│                                         │
│   [+ Start new conversation]            │  ← ActionButton, primary
└─────────────────────────────────────────┘
```

Centred vertically in the content panel. Clicking the button creates a new conversation (existing OUT-01 "+ New chat" path), routes to `/chat/[new-id]`, where the skill picker is reachable.

### State 4: skill registry miss (skill_id set but not in registry)

```
┌─────────────────────────────────────────┐
│ Skill state                       [×]   │
├─────────────────────────────────────────┤
│       [AlertTriangle icon, warning]     │
│                                         │
│   This conversation used a skill that   │
│   is no longer available.               │
│                                         │
│   Messages remain visible above. You    │
│   can read this conversation but        │
│   cannot resume the skill.              │
└─────────────────────────────────────────┘
```

Static explainer. No CTA.

### State 5: completion (overlays State 1)

When `skill_state.completedAt` is set, **above** the skill summary card and below the pane header, render a banner:

```
┌─────────────────────────────────────────┐
│ ✓ Completed at 14:32                    │  ← SectionCard variant (success token)
│ Database updated. Keep chatting.        │
└─────────────────────────────────────────┘
```

- Surface: `bg-[var(--color-success-bg)]`, text `text-[var(--color-success-foreground)]`
- Icon: `CheckCircle2` in `--color-success`
- Padding: matches SectionCard
- Below the banner, the rest of State 1 renders unchanged (skill summary + checklist + stages — all read-only; the conversation has continued past the skill's hard goals)

The skill-state rail icon also gets the `Check` adornment per the rail spec above.

### Defensive state extraction warning row

If a turn's state extraction fails despite structured output (the OUT-01a amendment's defensive fallback), a single warning row appears at the very top of the content panel, above all other content:

```
⚠ State update failed at 14:33 — last successful update at 14:31.
```

- Surface: `bg-[var(--color-warning-bg)]`, text `text-[var(--color-warning-foreground)]`
- Icon: `AlertTriangle`, `--color-warning`
- One line, dismissible (`X` button on right) — dismissing hides until the next failure
- Persists in the warning row until a successful state update happens (then auto-clears)

---

## Gathered value rendering (inside expanded stage cards)

Each stage's expanded body shows the gathered values that fall under that stage's checklist items.

```
╭─ ✓ Problem ────────────────────╮
│                                ▴│  ← rotated caret = expanded
├─────────────────────────────────┤
│ Problem statement               │  ← label heading (uppercase meta)
│ "Founders building solo can't   │
│  see what they don't know       │
│  about their own business."     │
│                                 │
│ Audience                        │
│ "Solo founders, year 1–3"       │
╰─────────────────────────────────╯
```

- Each value: a label heading + a value block
- Strings: rendered as-is, `text-sm`, with `whitespace-pre-wrap` for line breaks. Long values wrap; the panel scrolls.
- Arrays of strings: rendered as a bulleted list (each item `text-sm`)
- Objects: rendered as a nested key-value display (1 level deep — anything deeper falls back to a JSON-formatted code block)
- Booleans: rendered as `Yes` / `No`
- Numbers: rendered as-is

No truncation; the user wants visibility. If a value is unusually large (>500 chars), it scrolls within the stage card body up to ~200px, then the user can scroll further inside the card.

### Highlight pulse on update

When `skill_state` changes after a turn, items that changed get a subtle pulse:
- `transition: background-color 300ms ease-in-out`
- Brief flash to `bg-[var(--primary)]/10` then back to default
- Applied to: checklist items that flipped from unfilled→filled; whole stage cards whose status changed (e.g. became current, or completed); gathered value blocks that gained new content
- One pulse per turn-complete event; queued if multiple changes happen at once

---

## Empty states

- **Pane open, freeform new conversation, no skill:** State 2 (skill picker). The pane is intentionally not "empty" — it's an entry point for skills.
- **Pane open, freeform with messages:** State 3 (locked explainer with CTA).
- **Pane open, active skill, empty `skill_state.gathered`:** State 1 renders normally; checklist items all unfilled; stage cards all collapsed; current stage is whatever the runtime sets.
- **Skill picker has no skills:** EmptyState molecule inside the content panel: "No skills available yet."

---

## Loading and error states

- **Pane initial load:** content panel renders a skeleton (`PageSkeleton` or a smaller shimmer set — three rows of `h-4` + a card placeholder) while `skill_state` is fetched. Should be a flash for most cases since it's already in the conversation row.
- **Skill picker loading:** rail visible immediately, content panel skeleton (3–5 rows of `h-12` placeholders) until registry is loaded (synchronous import — should never actually need this).
- **Skill state fetch error:** content panel shows an error message with retry: `Couldn't load skill state. [Retry]`.
- **Server action failure on toggle/resize/tab-switch:** show a toast (`Failed to save preference`) and revert the local state. Existing chat preference patterns in the codebase will handle this.
- **Optimistic updates:**
  - Toggle pane open/closed: optimistic, server confirms in background
  - Resize: optimistic during drag, server confirms on release
  - Tab switch: optimistic, server confirms in background
  - Skill picker selection (skill attach): optimistic — pane switches to State 1 immediately, conversation row is updated server-side; if server fails, revert with toast

---

## Mobile considerations

Out of scope per brief — `ScreenSizeGate` already blocks <990px. At 990px viewport with both history panel (280px) and pane (default 360px) open: nav 220 + history 280 + pane 360 = 860; message area gets only 130px. **The viewport clamp rule** (message area ≥ 480px) will force the pane to shrink to its minimum (280px), and even then the message area is 210px. Practical guidance: at narrow viewports the user collapses the history panel — that gives the message area 490px with the pane at 280px, which works.

This is the same kind of trade-off as OUT-01's existing 990px constraint and doesn't need new responsive logic in v1. If users routinely hit this, layout-design v1.1 should consider auto-collapsing the history panel when the pane opens at narrow viewports.

---

## Molecule composition

### Existing molecules used

- `SectionCard` (registry: `components/section-card.tsx`, spec: `design-system.md § SectionCard`) — used for the skill summary card and the completion banner (with success-state surface variant)
- `EmptyState` (registry: `components/empty-state.tsx`, spec: `design-system.md § EmptyState`) — used for "no skills available yet" in the empty picker and for State 3 / State 4 explainers
- `IconButton` (registry: `components/icon-button.tsx`, spec: `design-system.md § IconButton`) — used for the pane close button (X) and the re-open toggle (PanelRightOpen)
- `ActionButton` (registry: `components/action-button.tsx`, spec: `design-system.md § ActionButton`) — used for the "Start new conversation" CTA in State 3
- `MarkdownRenderer` (registry: `components/markdown-renderer.tsx`, spec: `design-system.md § MarkdownRenderer`) — used inside expanded stage cards to render long-form gathered text values that may include user-typed markdown. Compact mode.

### Existing molecules used but unspecced *(known gap — DS-03)*

(None for this feature — all molecules listed above have specs.)

### New molecules required

- **`ContextPane`** — the pane shell itself (rail + content panel + header + resize handle). Owns brand-preferences read/write and tab-selection state.
  - Props: `conversation` (Conversation), `messages` (Message[]), `tabs` (ContextTab[]), `paneOpen` (boolean), `paneWidth` (number), `selectedTabId` (string | null), `onPaneOpenChange` ((open: boolean) => void), `onPaneWidthChange` ((width: number) => void), `onSelectedTabChange` ((tabId: string) => void)
  - Visual: full-height column, `bg-card`, `border-l border-border`, no shadow. Rail (56px) on the right; content panel fills remaining width. Pane header (`px-4 py-3`, `border-b border-border`) above scrollable content body (`px-4 pb-4`).
  - Replaces: net new — no inline pattern this absorbs.

- **`ContextPaneRail`** — the vertical icon strip on the right edge of the pane.
  - Props: `tabs` (ContextTab[]), `tabStatuses` (Record<string, 'active' | 'empty' | 'hidden'>), `selectedTabId` (string), `onSelect` ((tabId: string) => void), `dotForTab?` ((tabId: string) => 'success' | null)
  - Visual: 56px wide, `bg-muted`, `border-l border-border`. Vertical stack of `RailIcon` items with `gap-2 py-3 px-2`.
  - Replaces: net new.

- **`RailIcon`** — single rail icon button (one per tab on the rail).
  - Props: `icon` (LucideIcon), `label` (string — for tooltip + aria-label), `selected` (boolean), `status` ('active' | 'empty'), `dot?` ('success' | null), `adornment?` ('check' | null), `onClick` (() => void)
  - Visual: 40px square hit area (deliberately larger than the standard `IconButton` size — the rail icon is a primary navigation surface, not a secondary action), rounded. Inner icon glyph 20px. Selected: `bg-card` + `text-foreground`. Active-with-dot: small 6px dot in `--color-success` at top-right. Empty: `text-muted-foreground`. Adornment "check": `Check` icon overlay bottom-right in `--color-success` (12px). Hover: `bg-card/50` + `text-foreground`. Tooltip on hover (uses existing tooltip atom from shadcn).
  - Replaces: net new — and explicitly does NOT extend `IconButton` because IconButton has button chrome (border, padding, default `sm` size) that doesn't match the rail's visual contract.

- **`StageCard`** — collapsible card showing one skill stage with status marker, label, and (when expanded) gathered values for that stage.
  - Props: `id` (string), `label` (string), `status` ('completed' | 'current' | 'pending'), `expanded` (boolean), `onToggle` (() => void), `gatheredValues` ({ label: string, value: unknown }[])
  - Visual: card surface `bg-card` with `border border-border rounded-lg`. **Current stage** carries a 3px coloured left border in `--primary` (replacing the default left border on that side); the rest of the border stays `--border`. Header row: status icon (left, 16px — `Check` for completed in `--color-success`, empty circle for pending; **omitted for current** since the left border carries that role), label (`text-sm font-medium`), "(current)" suffix for current stage in `text-muted-foreground`, disclosure caret (right, `ChevronDown`/`ChevronUp`). Expanded body: `border-t border-border`, `px-4 py-3`, gathered values rendered as label/value pairs. Multiple cards can be expanded simultaneously — expansion state is owned by the parent (no internal state).
  - Replaces: net new.

- **`SkillChecklist`** — compact vertical checklist for skill checklists in the pane.
  - Props: `items` ({ id: string, label: string, filled: boolean }[])
  - Visual: vertical list. Each item: `Check` icon in `--color-success` for filled, empty circle in `text-muted-foreground` for unfilled. Label `text-sm` (foreground if filled, muted if not). `gap-2 py-1.5`. Read-only — no interaction.
  - Replaces: net new (similar in shape to existing checklists in VocMapping but visually simpler and not interactive — distinct enough to warrant its own molecule rather than reuse).

- **`SkillPickerRow`** — single row in the skill picker (State 2 of skill-state tab).
  - Props: `skillId` (string), `name` (string), `description` (string), `icon` (LucideIcon), `onClick` (() => void)
  - Visual: card-like row with `border border-border rounded-lg`, hover `bg-muted/50`. Padding `px-4 py-3`. Icon on left (24px in `text-muted-foreground`). Name + description stacked on right (`text-sm font-medium` + `text-xs text-muted-foreground`).
  - Replaces: net new — could in future generalise into a `PickerRow` molecule if a similar list shape recurs (e.g. content type picker in OUT-02 P4); for v1, keeps a focused contract for skill picker only.

- **`PaneHighlightPulse`** — utility wrapper that triggers a single background-flash pulse when its `pulseKey` changes.
  - Props: `pulseKey` (string | number — when it changes, pulse fires), `children` (ReactNode), `className?` (string)
  - Visual: wraps a child element. On `pulseKey` change, applies a CSS class that runs a 300ms transition flashing background to `bg-[var(--primary)]/10` then back to transparent.
  - Replaces: net new — used by checklist items, stage status markers, and gathered value blocks. Keeping it as a small molecule rather than ad-hoc inline keeps the animation contract single-sourced.

### Atoms used directly *(should be empty — every direct atom use is a missing molecule)*

(None expected. The components above wrap all atom usage.)

---

## Decisions log

- 2026-04-30: Layout approved. `RailIcon` is a new molecule, deliberately larger than the standard `IconButton` (40px hit area / 56px-wide rail) because it's a primary nav surface. `SkillPickerRow` ships as a focused molecule for v1, with the option to generalise into a `PickerRow` later (e.g. content-type picker). `PaneHighlightPulse` ships as a single-source pulse animation wrapper for reuse beyond OUT-01b. Skill-state tab status stays `active` whenever applicable (always selectable, never `empty`). Current-stage marker is a 3px coloured left border (no inline status icon for current), so the current stage reads as a distinct landmark in the stage list. Completion banner sits above the skill summary card.
