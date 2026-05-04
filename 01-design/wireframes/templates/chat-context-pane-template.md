# Template: chat-context-pane

A right-side adaptive context pane mounted within a chat page layout. Provides a vertical icon rail (tab strip) + content panel for surface-area that needs to be visible alongside the conversation but not interleaved with messages. Pluggable tabs let multiple kinds of conversation-scoped context coexist (skill state, referenced item, topic, variant context, etc.) without re-architecting the pane each time.

**Established from:** OUT-01b (skill-state context tab as v1's only tab).

**Applies to:** any future feature that adds a new conversation-scoped context surface inside `/chat` or `/chat/[id]`. Not for full-page panes outside chat — those use other patterns. Not for the slide-out drawer — drawer remains a full-bleed compact chat without the pane.

---

## Canonical structure (do not vary)

### Container
- Mounted as a sibling column to the message area inside the chat page layout
- `bg-card`, `border-l border-border`, no shadow (part of page chrome, not floating)
- Full height of the chat page area
- Acts as a single layout block: rail + content panel

### Rail
- 56px wide, fixed
- Pinned to the right edge of the pane
- Surface: `bg-muted` (sage-light) — visually distinct from content panel's `bg-card`
- `border-l border-border` separating rail from content panel
- Vertical stack of `RailIcon` items, top-aligned, `gap-2 py-3 px-2`
- Each icon represents one tab. Clicking selects that tab.

### RailIcon states (per tab)
- **Selected**: `bg-card` background (visually "joins" the content panel) + `text-foreground`
- **Active with content** (status='active'): no special bg if not selected; small 6px dot in `--color-success` at top-right
- **Empty but applicable** (status='empty'): no dot, `text-muted-foreground`
- **Hidden**: not rendered
- **Hover**: `bg-card/50` + `text-foreground`
- **Tooltip on hover**: tab `label`
- **Optional adornment**: `Check` icon overlay bottom-right in `--color-success` (12px) — used by tabs that have a "complete" state

### Content panel
- Fills remaining width (pane width minus 56px rail)
- `bg-card`
- Header strip: `px-4 py-3`, `border-b border-border`, contains current tab's `label` (text-sm font-medium) + close button (`IconButton` with `X`)
- Scrollable body below header: `px-4 pb-4`
- Renders the selected tab's `render(ctx)` output

### Resize handle
- 4px-wide invisible drag target on the pane's left edge
- Cursor `col-resize` on hover
- Hover: 1px sage-light line appears (subtle indicator)
- Drag updates pane width live; on release, persists `brand.chat_pane_width` via server action
- Bounds: 280–560px (clamped further by the viewport rule below)

### Re-open toggle (when pane closed)
- `IconButton` with `PanelRightOpen` (Lucide), `variant="ghost"`, tooltip "Open context pane"
- Placed top-right of message area, above messages
- Sets `brand.chat_pane_open = true`

### Width clamp rule
- Pane width is clamped at render so message area gets at least 480px after subtracting nav (220px), history panel (280px when open), pane width, and margins.
- If clamping would shrink pane below 280px, message area takes priority and pane uses 280px (further squeeze hidden by overflow).

### Persistence model
- **Per-brand** (`brands.chat_pane_open`, `brands.chat_pane_width`): pane visibility and width
- **Per-conversation** (`conversations.context_pane_state.selectedTabId`): selected tab
- Optimistic local updates; server actions persist in background; toast on failure with revert.

---

## Tab contract (do not vary)

Each tab is a code-backed module exporting a `ContextTab`:

```ts
type ContextTab = {
  id: string                       // e.g. 'skill-state'
  label: string                    // tooltip + header strip
  icon: LucideIcon                 // rail icon
  priority: number                 // ordering (lower = earlier)
  status: (ctx: ConversationCtx) => 'active' | 'empty' | 'hidden'
  render: (ctx: ConversationCtx) => ReactNode
}
```

Tabs live co-located with the feature that owns their data (e.g. `lib/skills/context-tab.tsx` for skill-state). The pane registry (`lib/chat-context-pane/registry.ts`) imports each tab module and exports a `Record<string, ContextTab>`.

Default-selection logic on first load: the highest-priority `active` tab is selected. If none are active, the highest-priority `empty` tab. If a persisted `selectedTabId` references a tab no longer in the registry, fall back to default-selection logic.

---

## Variable parts (vary per instance)

What each new tab decides:

- **`id`** — the unique identifier for the tab module
- **`label`** — display name (rail tooltip, content panel header)
- **`icon`** — LucideIcon for the rail
- **`priority`** — ordering relative to other tabs
- **`status` function** — when this tab applies and whether it has content. Returns 'hidden' to disappear from the rail entirely; 'empty' for "applicable but no content yet"; 'active' for "applicable with content".
- **`render` function** — the content panel output. Free-form ReactNode; no enforced internal structure beyond using design-system molecules.
- **Optional rail adornment** — if the tab has a "complete" or other terminal state worth surfacing, return an adornment marker (handled by the rail). Currently only the `'check'` adornment is supported; new adornments require a rail extension.

What each new tab can compose:

- Existing molecules (`SectionCard`, `EmptyState`, `IconButton`, `ActionButton`, `MarkdownRenderer`)
- Tab-specific molecules (e.g. `StageCard`, `SkillChecklist`, `SkillPickerRow`, `PaneHighlightPulse` from skill-state) — can be reused if applicable, or new ones can be specced for the new tab
- Highlight-pulse contract (`PaneHighlightPulse`) for fading background updates when its source data changes

---

## Out of scope (template-level — do not add per instance)

- Multiple tabs visible simultaneously / split content
- Drag-to-reorder tabs by user
- Mobile / responsive collapse logic (pane assumes ≥ 990px viewport)
- Real-time streaming content updates within a turn (tabs refresh on turn-complete events from the chat runtime)
- In-pane editing of database state (tabs are read-mostly; writes go through server actions associated with each tab's data domain)

---

## How to use this template

1. Read the established instance: `01-design/wireframes/OUT-01b-layout.md` (skill-state tab)
2. Define the new tab's `ContextTab` shape — `id`, `label`, `icon`, `priority`, `status`, `render`
3. Co-locate the tab module with its data domain (e.g. `lib/<domain>/context-tab.tsx`)
4. Register the tab in `lib/chat-context-pane/registry.ts`
5. Spec any new molecules at layout-design time using design-system Mode A
6. Compose only existing or newly-specced molecules in the tab's `render`

For OUT-01d (skill creator skill), this template + the skill registry contract is the primary input — the skill walks through these inputs to scaffold a new tab module.
