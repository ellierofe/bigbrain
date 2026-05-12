# Layout Spec: OUT-01c LLM Database Write Tool
Status: approved
Last updated: 2026-05-05
Brief: `01-design/briefs/OUT-01c-llm-database-write-tool.md` (approved 2026-05-05)
Template: extends `chat-context-pane` (established by OUT-01b)

---

## Template check result

**Partial match.** OUT-01c is the **second consumer** of the `chat-context-pane` pattern that OUT-01b established. The pane shell, rail, tab plumbing, resize, persistence, and registry contract are fully templated — OUT-01c registers a new tab and reuses every existing molecule (`ContextPane`, `ContextPaneRail`, `RailIcon`, `PaneHighlightPulse`).

What is **template-templated** (no design work):
- Pane outer shell, rail behaviour, header strip, close affordance, resize, width clamp
- Tab registration via `lib/chat-context-pane/registry.ts`
- Rail icon shape/states (selected, dot, adornment, hover, tooltip)
- `PaneHighlightPulse` for "this just updated" affordance

What is **net-new** (designed in this spec):
- The body of the new `pending-writes` tab — different visual contract from the skill-state tab (cards, not stages)
- A new molecule for the pending-write card itself (`PendingWriteCard`) with three op variants (update / create / generate)
- A new molecule for the per-conversation pending-write list shell (`PendingWritesList`) — handles empty state, ordering, and the pulse-on-arrival behaviour
- Two **new pane behaviours** that extend OUT-01b: auto-open the panel + select the `pending-writes` tab when a new pending write arrives; auto-close-or-revert behaviour after the last pending write is decided (see "Pane behaviour extension" below)
- An **in-chat system message** style for the post-confirmation "Saved: …" line (UC-2 step 11)
- A **generation-complete notification** (toast + rail-icon adornment) for async creates

---

## Views

| View | Purpose | When it appears |
|---|---|---|
| Pane: pending-writes tab — empty | Empty state with explainer | Tab is hidden in this state — never user-visible |
| Pane: pending-writes tab — one or more pending | Stack of `PendingWriteCard` items, each with Confirm + Reject | `pending_writes.status = 'pending'` rows exist for the conversation |
| Pane: pending-writes tab — last decision in flight | Card transitions through saving → success/failure → removed; tab status updates | Between the moment the user clicks Confirm/Reject and the server action returning |
| Pane: pending-writes tab — all decided | Tab auto-hides; pane returns to whichever tab was previously selected | Once the last `pending` row flips to `confirmed`/`rejected` |
| In-chat system confirmation message | One-line system-attributed line in the message stream after a successful write | Immediately after a write completes (UC-2, UC-4) |
| Generation-complete notification | Toast + rail-icon adornment | Async generation finishes (UC-5) |

The `pending-writes` tab is **status-driven**: it appears in the rail only when there's something pending. Otherwise hidden. This keeps the rail clean during the vast majority of conversation time.

---

## Navigation and routing

No new routes. All UI is within existing `/chat` and `/chat/[id]` layouts.

The tab registers via the existing `lib/chat-context-pane/registry.ts` mechanism — adding `pendingWritesTab` to the exported `contextPaneTabRegistry` object. No changes to the pane shell or rail contract.

The in-chat saved-confirmation message is rendered inside the existing `MessageList` / `ChatMessage` flow — it's a system-attributed message persisted to the `messages` table with `role = 'system'` and a structured `metadata.kind = 'write-confirmation'` field.

---

## Pane behaviour extension (extends OUT-01b)

Two new behaviours that OUT-01b's spec did not cover, because OUT-01b had only one tab:

### Auto-open + select on arrival

When the runtime persists a new `pending_writes` row for the active conversation:
- If `paneOpen = false`: set `paneOpen = true` AND `selectedTabId = 'pending-writes'`. Pane animates open per existing OUT-01b transition. The `pending-writes` rail icon also fires its `PaneHighlightPulse`.
- If `paneOpen = true` AND `selectedTabId !== 'pending-writes'`: do **not** auto-switch tabs (don't yank the user out of the skill-state view they're reading). Instead, the `pending-writes` rail icon appears (status flips from hidden → active), gets a `dot: 'success'`, and fires its `PaneHighlightPulse`. The user clicks the icon to switch.
- If `paneOpen = true` AND `selectedTabId === 'pending-writes'`: pulse the new card; no tab/pane state change.

Rationale: hijacking a closed pane is fine (the user sees nothing relevant in chat right now — opening reveals the action they need); hijacking an *open* pane while they're mid-read is rude. The pulse + dot is enough discovery.

### Tab auto-hide after last decision

When the last `pending` row in the conversation flips out of `pending`:
- Tab status returns to `'hidden'`. Rail icon disappears.
- If `selectedTabId === 'pending-writes'` at the moment of hide: fall back to whichever tab was previously selected (use a small `previousTabId` stash on `context_pane_state`). If no previous tab, fall back to the existing OUT-01b default-tab logic.
- Pane stays open (the user explicitly opened it; we don't close it automatically).

### Persistence concern

These two behaviours are runtime-driven (chat route), not molecule-driven. The `ContextPane` molecule's contract is unchanged — it still receives `paneOpen` / `selectedTabId` as props. The chat route's existing `setContextPaneStateAction` is extended to accept these auto-changes and persist them.

---

## Tab content: pending-writes

### Layout

```
┌─────────────────────────────────────────┐
│ Pending writes                    [×]   │
├─────────────────────────────────────────┤
│                                         │
│ ╭─────────────────────────────────────╮ │
│ │ DNA › Brand meaning                 │ │  ← PendingWriteCard
│ │ Update mission                      │ │     (op: update)
│ │                                     │ │
│ │ Before                              │ │
│ │ "We help founders ship."            │ │
│ │                                     │ │
│ │ After                               │ │
│ │ "We make founders shippable."       │ │
│ │                                     │ │
│ │ [Reject]              [Confirm]     │ │
│ ╰─────────────────────────────────────╯ │
│                                         │
│ ╭─────────────────────────────────────╮ │
│ │ DNA › Audience segments             │ │  ← PendingWriteCard
│ │ Generate new segment                │ │     (op: generate)
│ │                                     │ │
│ │ Seed: Early-stage technical         │ │
│ │ founders raising their first round  │ │
│ │                                     │ │
│ │ Generation runs in the background.  │ │
│ │ You'll be notified when ready.      │ │
│ │                                     │ │
│ │ [Reject]            [Generate →]    │ │
│ ╰─────────────────────────────────────╯ │
│                                         │
└─────────────────────────────────────────┘
```

Cards stack vertically with `gap-3`. Newest at the top (most recent first — usually the one that triggered the auto-open).

### PendingWriteCard structure (per card)

A `PendingWriteCard` molecule with three op variants. Common scaffold, divergent body and primary-button label.

#### Common scaffold

```
╭ surface: bg-card, border border-border rounded-lg ────╮
│ ── Header ───────────────────────────────────────────  │
│  [icon]  Entity breadcrumb              [status pill]  │ ← when saving/error
│          Op + field summary                            │
│                                                        │
│ ── Body (op-specific) ───────────────────────────────  │
│  ...                                                   │
│                                                        │
│ ── Footer ───────────────────────────────────────────  │
│                          [Reject]  [Primary button]    │
╰────────────────────────────────────────────────────────╯
```

- Surface: `bg-card`, `border border-border rounded-lg`, no shadow (the pane is the elevated surface)
- Padding: `px-4 py-3` header; `px-4 py-3 border-t border-border` body; `px-4 py-3 border-t border-border` footer
- Internal section divider: `border-t border-border` between header→body and body→footer
- Width: fills the pane content panel (`w-full`)
- The card carries no left-border accent (unlike `StageCard` current-stage). All pending-write cards are equal-priority — the act of being in this list IS the priority signal.

#### Header (all ops)

Three-row mini-block:

- **Leading icon** (16px, left, `mt-0.5`): op-specific Lucide glyph
  - `update` → `Pencil` in `text-muted-foreground`
  - `create` → `Plus` in `text-muted-foreground`
  - `generate` → `Sparkles` in `text-muted-foreground`
- **Breadcrumb** (`text-xs text-muted-foreground`): one line, e.g. `DNA › Brand meaning`. Composed from a static `entityBreadcrumb(entity_type)` lookup.
- **Op summary** (`text-sm font-medium text-foreground`): one line, e.g. `Update mission`, `Create audience segment`, `Generate new segment`.
- **Status pill** (right, only when `state !== 'idle'`): `StatusBadge` molecule reused. Tones below.

The header carries no diff data — that's body's job. The header tells the user *what kind of decision* they're making.

#### Body — op variant `update`

Two stacked label/value blocks:

```
Before
[wrapped value, monospace-friendly typography]

After
[wrapped value, accented]
```

- Label rows: `text-xs font-medium uppercase tracking-wide text-muted-foreground`
- Value rows: `text-sm whitespace-pre-wrap break-words`
- "Before" value: `text-muted-foreground` (de-emphasised — it's the value being replaced)
- "After" value: `text-foreground` with a left-edge accent — `border-l-2 border-[var(--primary)] pl-3` — to mark "this is what will land if you confirm"
- Long values: max-height ~200px scrollable, then user scrolls inside the block (mirrors `StageCard`'s long-value handling)
- Boolean / number / array values: rendered using the same logic as `StageCard`'s gathered-value renderer (extract the renderer to a shared helper — see Molecule composition)
- Empty `before` (singular DNA first write): shows the value as `<em>Empty</em>` in `text-muted-foreground italic`

#### Body — op variant `create`

Single label/value block per field of the proposed new row, stacked:

```
Name
"Early-stage technical founders"

Description
"Solo founders raising pre-seed, ship velocity > polish."

Demographics
- Stage: pre-seed
- Geography: UK + US
- Team size: 1
```

- One label per field, value below
- Same typography as `update` body
- No before/after — this is a creation, the "before" is non-existence
- For long payloads: the body scrolls within the card up to ~400px

#### Body — op variant `generate`

```
Seed
[short multi-line summary of seed inputs as a quoted block]

Generation runs in the background.
You'll be notified when ready.
```

- Seed block: same typography as the other op bodies
- Trailing two-line explainer: `text-xs text-muted-foreground`, helps the user know what they're approving (an async operation, not an immediate write)
- No before/after blocks

#### Footer (all ops)

Two buttons, right-aligned, with `gap-2`:

- **Reject**: `ActionButton variant="ghost"`, label "Reject"
- **Primary**: `ActionButton variant="default"` (sage primary)
  - `update` → label "Confirm", no trailing icon
  - `create` → label "Create", no trailing icon
  - `generate` → label "Generate", `trailingIcon={ArrowRight}` to signal async kickoff
- Optional reject-reason capture (deferred — see brief out-of-scope)

When `state === 'saving'`: primary button shows `loading=true` (spinner replaces leading position, label becomes "Confirming…" / "Creating…" / "Starting…"), Reject becomes `disabled`.

When `state === 'error'`: Reject re-enabled, primary button re-enabled with original label, error message rendered as a single line below the footer in `--color-error`.

#### Card-level states (driven by parent)

| State | Visual |
|---|---|
| `idle` | Default rendering, both buttons enabled |
| `saving` | Primary button loading, Reject disabled, status pill "Saving…" with `--color-info-bg` |
| `success` | Card briefly shows status pill "Saved" with `--color-success-bg`, then is removed from the list (300ms) |
| `error` | Status pill "Failed" with `--color-error-bg`, error line below footer, both buttons re-enabled |
| `rejected` | Card briefly shows status pill "Rejected" with `--color-info-bg` (neutral, not error), then removed (300ms) |

The card itself is presentational; transitions are parent-driven via the `state` prop.

### Empty state

The tab is `'hidden'` when there are no pending writes — so an empty tab body is *never user-visible* in the rail. Defensive empty state for completeness (e.g. an old pending row was deleted out from under the pane while the tab was open):

```
┌─────────────────────────────────────────┐
│ Pending writes                    [×]   │
├─────────────────────────────────────────┤
│                                         │
│       [FileCheck icon, muted, 32px]     │
│                                         │
│   Nothing pending. The chat will        │
│   propose writes here when needed.      │
│                                         │
└─────────────────────────────────────────┘
```

Reuses `EmptyState` molecule — single line title, no CTA.

### Pulse on new card

`PaneHighlightPulse` wraps each `PendingWriteCard`. The card's `pulseKey` is the row's `created_at` ISO string — when a new card mounts, its first render establishes the pulse-key baseline; an update to the underlying row (rare — usually an LLM revising its proposal) re-pulses. This matches OUT-01b's pattern.

The rail icon also pulses on arrival (existing `RailIcon` accepts pulse via parent re-render). The runtime triggers this by bumping a counter on `context_pane_state.pendingWritesPulseKey`.

---

## In-chat system confirmation message

After a successful write (UC-2 step 11, UC-4 success path), the runtime injects a message into the conversation with `role: 'system'` and structured metadata:

```ts
{
  role: 'system',
  parts: [{ type: 'text', text: 'Saved: mission updated.' }],
  metadata: { kind: 'write-confirmation', entity_type: 'dna_brand_meaning', op: 'update', field: 'mission' }
}
```

### Visual treatment

System messages with `metadata.kind = 'write-confirmation'` render as a single, narrow, centred line in the message stream:

```
┌────────────────────────────────────────────────────────┐
│ MESSAGE STREAM                                         │
│                                                        │
│  [...assistant message]                                │
│                                                        │
│        ─── ✓ Saved: mission updated ───                │ ← centred, muted, small
│                                                        │
│  [...user types next message]                          │
└────────────────────────────────────────────────────────┘
```

- Layout: `flex justify-center my-2`
- Inner container: `inline-flex items-center gap-2 text-xs text-muted-foreground`
- Icon: `Check` 12px in `--color-success`
- Text: `Saved: <human-readable summary>` — generated runtime-side from metadata (e.g. `Saved: mission updated`, `Created audience segment "Early-stage technical founders"`, `Generation started for new audience segment`)
- No bubble, no border — it's a stream divider, not a participant turn
- Hover tooltip: shows entity_type and op for debuggability (`dna_brand_meaning · update`)

### Why a real message and not a toast

Visibility (design rule 4). The user can scroll back through a conversation and see *exactly when* each write happened. A toast would disappear and the trail would only live in `entity_writes` (which has no UI in v1). The message also serves as anchored context for the LLM's next turn ("good, mission is now X — do you want to update vision next?").

This shape isn't a separate molecule — it's a render branch inside the existing `ChatMessage` molecule (or, if `ChatMessage` is too tightly scoped to user/assistant roles, a new tiny `SystemMessageDivider` molecule). See Molecule composition for the recommendation.

### Failure path (write-after-confirmation fails)

If `confirmPendingWriteAction` fails after the user clicked Confirm: the `PendingWriteCard` shows the `error` state described above. **No** in-chat message is injected — the chat stream only records confirmed writes. The card stays in `pending_writes` table with `status = 'pending'` (the action server-side rolls back the status flip on failure) so the user can retry.

---

## Generation-complete notification

For UC-5 (async create-via-generation): when generation finishes (existing GEN-01 callback), three things happen:

1. **Toast** (`sonner.success`): `New audience segment "Early-stage technical founders" is ready` with an action link (`View`). Click navigates to the new segment's detail page.
2. **In-chat system confirmation message** (same shape as the post-write message): `Created: audience segment "Early-stage technical founders"`. This lands in the conversation that requested the generation, regardless of whether the user is currently viewing it.
3. **Rail-icon adornment** (transient): if the user is currently viewing the originating conversation AND the pane is open, the conversation list row's existing `ConversationListRowIcon` flashes briefly with a success dot (3 seconds).

If the user is *not* viewing the originating conversation: only the toast fires (with conversation context). Clicking the toast's action navigates them.

If generation fails: `sonner.error` toast, in-chat message says `Generation failed for audience segment "<name>" — <reason>`.

---

## Empty states

- **Pane open, pending-writes tab visible, list empty (defensive)**: `EmptyState` molecule (covered above).
- **Pane closed when write arrives**: behaviour described in "Pane behaviour extension" — pane auto-opens.
- **First-ever write across the app (audit log empty)**: no UI implication; audit log has no UI surface in v1.

---

## Loading and error states

- **Card transitioning to "saving"**: card-level `state="saving"` (visual described above). Both buttons disabled; spinner on primary.
- **Pending-writes list initial load**: skeleton — three `h-32` placeholder cards rendered while `pending_writes` rows are fetched. Should be a flash since rows usually come down with the conversation hydrate.
- **Confirm action server failure**: `error` state on the card, error line below footer in `--color-error`. Card stays mounted; user can retry.
- **Reject action server failure**: same treatment — error pill + error line. Rejecting twice is fine (idempotent).
- **Optimistic updates**: 
  - On Confirm click: card immediately shows `saving` state (no waiting on round-trip). On success → `success` then auto-remove.
  - On Reject click: card immediately shows `rejected` state, then auto-remove. If server fails, revert and show error.
- **Pane behaviour optimism**: auto-open + tab-select on new pending row is optimistic — the row is persisted server-side first (so reload preserves the proposal), but the pane state mutation is fired the moment the runtime detects the new row in the chat-route response.

---

## Mobile considerations

Same as OUT-01b — `ScreenSizeGate` blocks <990px. At narrow viewports, the user collapses the history panel to make room for the pane. No additional responsive logic for OUT-01c.

The `PendingWriteCard` body has built-in scroll on long values (200px max for update bodies, 400px for create bodies), so cards never grow unbounded regardless of viewport.

---

## Keyboard interactions

- **Inside pane**, focus management:
  - On pane auto-open: focus moves to the first `PendingWriteCard`'s primary button (Confirm). This is the action the user just got pulled here for; pre-focusing it lets them confirm with `Enter` if they trust the proposal.
  - `Tab` cycles within the card: Reject → Confirm → next card's Reject…
  - `Esc` closes the pane (existing OUT-01b `IconButton` close behaviour applies — closing the panel via `IconButton` already calls `onPaneOpenChange(false)`; we extend the keyboard contract by trapping `Esc` inside the panel).
- **Confirm shortcut**: `Cmd+Enter` (or `Ctrl+Enter`) inside a focused `PendingWriteCard` triggers the primary button. Discoverable via tooltip on the primary button (`Confirm (⌘↵)`). For `generate` ops the same shortcut works — no special handling needed.
- **Reject shortcut**: none in v1. Reject requires a deliberate click.
- Tab order is correct, focus rings are visible (token-driven), all interactive elements reachable without a mouse — assumed.

---

## Molecule composition

### Existing molecules used

- `ContextPane` (registry: `components/context-pane.tsx`, spec: `design-system.md § ContextPane`) — the pane shell. **No changes needed.** OUT-01c registers a new tab; the molecule's contract is unchanged.
- `ContextPaneRail` (registry: `components/context-pane-rail.tsx`, spec: `design-system.md § ContextPaneRail`) — rail. **No changes needed.**
- `RailIcon` (registry: `components/rail-icon.tsx`, spec: `design-system.md § RailIcon`) — used for the new `pending-writes` rail icon (Lucide `FileEdit`).
- `PaneHighlightPulse` (registry: `components/pane-highlight-pulse.tsx`, spec: `design-system.md § PaneHighlightPulse`) — wraps each `PendingWriteCard` for arrival pulse, and is reused on the rail icon for tab-arrival pulse.
- `ActionButton` (registry: `components/action-button.tsx`, spec: `design-system.md § ActionButton`) — the Confirm / Reject buttons + the generation primary button (with `trailingIcon={ArrowRight}`).
- `IconButton` (registry: `components/icon-button.tsx`, spec: `design-system.md § IconButton`) — pane close. Existing.
- `EmptyState` (registry: `components/empty-state.tsx`, spec: `design-system.md § EmptyState`) — defensive empty state on the tab.
- `StatusBadge` (registry: `components/status-badge.tsx`, spec: `design-system.md § StatusBadge`) — used for the card-level `Saving…` / `Saved` / `Failed` / `Rejected` pills, mapped to existing tones via DS-02 state tokens.

### Existing molecules used but unspecced *(known gap — DS-03)*

(None. Every molecule listed above has a spec.)

### New molecules required

- **`PendingWriteCard`** — the diff/payload card with three op variants. The molecule that does most of the work in this layout.
  - Props:
    ```ts
    interface PendingWriteCardProps {
      id: string                                // pending_writes row id
      entityType: string                         // e.g. 'dna_brand_meaning'
      op: 'update' | 'create' | 'generate'
      payload:                                   // discriminated by op
        | { op: 'update'; field: string; before: unknown; after: unknown }
        | { op: 'create'; fields: { label: string; value: unknown }[] }
        | { op: 'generate'; seedSummary: string }
      state: 'idle' | 'saving' | 'success' | 'error' | 'rejected'
      errorMessage?: string                      // shown below footer when state === 'error'
      onConfirm: () => void
      onReject: () => void
    }
    ```
  - Visual: token-driven card surface, three-section internal layout (header / body / footer), op-specific icon and primary button label, inline status pill when state !== 'idle'. Long values scroll within the body. The "After" block in update bodies carries a 2px primary left-edge accent.
  - Replaces: net new — no existing inline pattern this absorbs.

- **`PendingWritesList`** — the per-conversation list shell that renders cards in order.
  - Props:
    ```ts
    interface PendingWritesListProps {
      writes: PendingWrite[]                     // already-decoded shape (one per row)
      onConfirm: (id: string) => void
      onReject: (id: string) => void
      stateById: Record<string, PendingWriteCardProps['state']>
      errorById: Record<string, string | undefined>
    }
    ```
  - Visual: vertical stack of `PendingWriteCard` items wrapped in `PaneHighlightPulse`, `gap-3`. Empty array → `EmptyState`. Each card pulses on its first mount in this list (pulse-key = card id).
  - Replaces: net new. Tab body needs *something* that owns the empty state + ordering + pulse plumbing; making it a molecule keeps the tab-render function in `lib/db-update/context-tab.tsx` clean.

- **`SystemMessageDivider`** — centred narrow line in the message stream for system-attributed messages (writes, errors, generation completions).
  - Props:
    ```ts
    interface SystemMessageDividerProps {
      icon: LucideIcon                            // e.g. Check, AlertTriangle, Sparkles
      iconColor: 'success' | 'warning' | 'info'   // maps to DS-02 state tokens
      text: string                                // e.g. "Saved: mission updated"
      tooltip?: string                            // e.g. "dna_brand_meaning · update"
    }
    ```
  - Visual: `flex justify-center my-2`, inner `inline-flex items-center gap-2 text-xs text-muted-foreground`, icon 12px in the chosen state colour, text in muted foreground. Rendered as a divider — no border, no surface, just spacing + glyph.
  - Replaces: net new. **Important:** this is *not* a `ChatMessage` extension — `ChatMessage` is scoped to user/assistant roles per its current spec. A separate molecule keeps the system-message rendering decision encapsulated. The chat message-list organism branches on `message.role === 'system'` and renders this molecule instead of `ChatMessage`. Future system-message kinds (errors, info) reuse this molecule with different `iconColor` + `icon`.

### Atoms used directly *(should be empty)*

(None. All token / tone / button / icon usage flows through the molecules above.)

### Notes on what is *not* a new molecule

- The "before/after" diff block inside `PendingWriteCard` body is *not* extracted as its own molecule. It's only used inside `PendingWriteCard` and has tight coupling to that card's spacing/typography. If a second consumer ever wants a diff display, extract then — premature otherwise.
- The "value renderer" (string / boolean / number / array / object → display) is **shared** with `StageCard`. Recommendation: extract `02-app/lib/value-render.tsx` (a pure render helper, not a molecule) consuming `MarkdownRenderer` for strings. Both `StageCard` and `PendingWriteCard` import it. This is a small lib refactor; flag as a tracked side-quest in the brief's decisions log if not done as part of OUT-01c.
- The `entityBreadcrumb(entity_type)` lookup ("DNA › Brand meaning" etc.) is a pure string helper — not a molecule. Lives in `lib/db/writes/entity-breadcrumb.ts` alongside the entity-type enum.

---

## Decisions log

- 2026-05-05: New `pending-writes` tab in the OUT-01b pane (option (a) in the layout-design discussion), not a section inside the skill-state tab. Reason: writes happen in freeform conversations too, not just skills — a tab is the right shape.
- 2026-05-05: Tab status is `'active'` when pending rows exist, `'hidden'` otherwise — keeps the rail clean during the vast majority of conversation time.
- 2026-05-05: Two pane behaviour extensions to OUT-01b: auto-open + tab-select when the pane is closed and a new pending write arrives; tab auto-hide when the last pending write is decided. Auto-open does not happen if the pane is already open on a different tab — that would yank the user mid-read; the rail icon's appearance + pulse is sufficient discovery.
- 2026-05-05: In-chat system confirmation rendered as a `SystemMessageDivider` (new molecule), not a toast. Reason: visibility (design rule 4) — the conversation history is the audit trail the user can scroll back through.
- 2026-05-05: `PendingWriteCard` is one molecule with three op variants (discriminated payload), not three molecules. Reason: shared scaffold (header/body/footer), shared state machine (idle/saving/success/error/rejected), shared button treatment. Variant divergence is body-only and small.
- 2026-05-05: `PendingWritesList` is a separate molecule rather than rendering directly inside the tab's render function. Reason: empty state + ordering + pulse-on-arrival are non-trivial composition; extracting it keeps the tab-render function in `lib/db-update/context-tab.tsx` to a thin pass-through.
- 2026-05-05: Confirm shortcut `Cmd+Enter` available when a `PendingWriteCard` is focused, surfaced via tooltip on the primary button. Reject has no shortcut — must be a deliberate click.
- 2026-05-05: Generation-complete notification is three-channel: toast (with View link) + in-chat `SystemMessageDivider` + transient conversation-list-row dot when the user is on the originating conversation. Tracks the user wherever they go.
- 2026-05-05: Value-renderer logic shared with `StageCard` extracted to `lib/value-render.tsx` as a pure helper, not a molecule. Tracked side-quest for OUT-01c build (or as a tiny standalone refactor if scope grows).
