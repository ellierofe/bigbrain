# Layout Spec: OUT-01a Chat Skills Infrastructure
Status: approved
Last updated: 2026-04-30
Brief: `01-design/briefs/OUT-01a-chat-skills-infrastructure.md` (approved 2026-04-30)
Template: none — small new pattern (chat surface extensions). No new template registered; the page-launched "Generate / Refresh" button pattern will be considered for templating after DNA-02 ships.

---

## Template check result

No applicable template found. OUT-01a is infrastructure that adds a small set of affordances to the existing `chat-conversation` surface (OUT-01) and a reusable launch-button pattern. No new pages, no list/detail surface, no workspace. The skill-state pane (OUT-01b) is a sibling feature — this spec does not duplicate it.

---

## Scope of this spec

OUT-01a's UI surface is deliberately small. It covers four things, all live inside or adjacent to the existing chat surface:

1. **Skill marker on conversation list rows** — a fixed icon slot in front of every conversation title; `Brain` for skill conversations, `MessageCircle` for freeform. Keeps titles aligned.
2. **Continue affordance for staged skills** — inline button below the latest assistant message when the runtime detects `readyToAdvance: true`. Click validates the checklist server-side and advances the stage.
3. **Slash-command parsing** — the existing chat input recognises `/<skill-id>` (and `/skill <skill-id>`) at the start of a message and triggers skill attach. No popover/autocomplete in v1.
4. **Registry-miss banner** — small one-line warning above the message stream when a conversation has `skill_id` set but the registry has no match.

What this spec does **not** cover:
- The right-side skill-state pane and skill picker — owned by OUT-01b's spec.
- Any specific skill's UI (DNA-02, etc.) — those have their own briefs.
- Page-launched "Generate / Refresh" buttons on DNA pages — explicitly deferred. DNA-02 introduces the first real one; until then no `SkillLaunchButton` molecule is created. The v1 example skill (`hello-world`) is launched via slash command only.

---

## Views

| View | Purpose | When it appears |
|---|---|---|
| Conversation list with skill markers | Existing list, now with a fixed-width icon slot per row | Always |
| Chat with active staged skill (Continue ready) | Existing chat with a Continue button below the latest assistant message | `conversation.skill_id` set AND `mode === 'staged'` AND latest assistant message structured-output `readyToAdvance === true` |
| Chat with active staged skill (Continue blocked) | Same as above with the button disabled and a one-line reason | `readyToAdvance === true` BUT current stage's checklist items aren't all filled |
| Chat with registry miss | Existing chat with a one-line warning bar above the message area | `conversation.skill_id` set AND not present in the runtime registry |
| Slash-command echo | Existing chat — when user submits `/<skill-id>`, the input is intercepted before sending | User types `/<id>` or `/skill <id>` as the first/only token of a message |

No new routes. All four affordances mount inside the existing `/chat` and `/chat/[id]` layouts.

---

## Navigation and routing

No additions. Existing routing (OUT-01) handles the three relevant flows:

- **New chat from elsewhere** (page-launched buttons, future) → existing `/chat/[id]` route. Conversation row is created server-side with `skill_id` already set. Out of scope for v1's UI work.
- **Slash command in an empty current conversation** → conversation gets `skill_id` set (server action), pane re-renders, opening message generated. No route change.
- **Slash command in a conversation with messages or an existing skill** → confirm prompt; on accept, route to a new `/chat/[new-id]` (existing `+ New chat` flow) with `skill_id` pre-set on the created row. The brief's "one skill per conversation" rule is enforced at this transition.

---

## Surface 1: skill marker on conversation list

### Updated row layout

```
┌─────────────────────────────────────────────┐
│ [icon] [Title text                       ]🗑│  ← icon: 16px, gap-2 to title
│        [preview text                       ]│  ← preview indents to align with title
└─────────────────────────────────────────────┘
```

Every row reserves the icon slot whether or not the conversation has a skill. Title and preview baselines stay aligned across the list. Hover archive button (existing) sits at the right unchanged.

### Icon contract

| Conversation state | Icon | Colour |
|---|---|---|
| Freeform (`skill_id === null`) | `MessageCircle` (Lucide) | `text-muted-foreground` |
| In-progress skill (`skill_id` set, `completedAt == null`) | `Brain` (Lucide) | `text-muted-foreground` |
| Completed skill (`completedAt` set) | `Brain` with `Check` adornment bottom-right | `text-muted-foreground` icon + `--color-success` adornment |
| Registry miss (`skill_id` set but not in registry) | `Brain` with `AlertTriangle` adornment bottom-right | `text-muted-foreground` icon + `--color-warning` adornment |

- Icon size: 16px (h-4 w-4) — same scale as the existing archive icon for visual rhythm
- Slot width: 24px total (16px icon + 8px gap before the title)
- The active row's title colour rule (existing — `text-foreground` when active, `text-foreground/80` otherwise) carries over unchanged. The icon itself stays muted regardless of active state — it's a metadata signal, not a focus signal.

### Conversation summary fetch — additions

The existing `ConversationList` `ConversationSummary` shape gains:

```ts
interface ConversationSummary {
  id: string
  title: string | null
  preview: string | null
  updatedAt: Date | string
  // additions:
  skillId: string | null
  skillCompletedAt: string | null   // null if not completed
  skillInRegistry: boolean          // false → registry miss
}
```

The "in registry" check is computed server-side (so the client doesn't need the registry imported). For v1's small registry it's effectively free.

---

## Surface 2: Continue affordance

### Behaviour

When the latest assistant turn's structured output includes `readyToAdvance: true` AND the conversation's skill is `mode === 'staged'`:

```
┌─────────────────────────────────────────────────────┐
│  [latest assistant message bubble]                 │
│                                                     │
│  ┌─────────────────────────────────────┐           │
│  │   Continue to next stage  →         │           │  ← inline button below the bubble
│  └─────────────────────────────────────┘           │
│                                                     │
│  [next user input expected]                        │
└─────────────────────────────────────────────────────┘
```

- Button placement: below the latest assistant message bubble, left-aligned with the bubble's content (not viewport-centred).
- Button width: hugs content + horizontal padding; not full-width — it's an action affordance, not a separator.
- Component: `ActionButton` molecule (existing), `variant="primary"`, with `ArrowRight` icon to the right of the label.
- Label: `Continue to next stage` (literal — not parameterised; the next stage's name appears in the OUT-01b pane once that ships, but in OUT-01a-only the button stays generic).

### Disabled state (checklist not filled)

If `readyToAdvance: true` but the current stage's `checklistItemIds` aren't all `filled` in `skill_state.checklist`:

```
┌─────────────────────────────────────────┐
│   Continue to next stage  →             │  ← disabled (existing ActionButton disabled style)
└─────────────────────────────────────────┘
   ⚠ Still gathering: Values, Draft         ← inline hint below, text-xs text-muted-foreground
```

- Button: disabled (existing `ActionButton` disabled treatment — pointer-events:none, opacity-50, cursor-not-allowed).
- Below the button: a one-line hint listing the unfilled checklist item labels, comma-separated. Surface: plain text, no icon background.
- The hint is static — it's there to make the block visible; the conversation continues and the LLM is expected to gather what's missing.

### Click behaviour

On click of an enabled Continue button:
1. Optimistic: button shows `Loader2` spinner, label becomes `Advancing…`.
2. Server action: validates the current stage's checklist; if valid, advances `currentStage` and appends the new stage's prompt addendum to the system prompt for the next turn. Returns the updated `skillState`.
3. On success: the button disappears (the new stage's first turn hasn't happened yet, so `readyToAdvance` is implicitly false). A subtle toast: `Stage advanced to [next stage label]` (positive variant, auto-dismiss 3s).
4. On failure (server validation rejects, network error): toast `Couldn't advance stage. [Retry]`. Button returns to its enabled state.

The toast is the same toast pattern used elsewhere in the app — no new molecule needed.

### Where the `readyToAdvance` signal comes from

The runtime's structured-output schema (per-skill, per-stage) includes a `readyToAdvance: boolean` field. The chat route reads this from the latest assistant turn's persisted structured-output blob and passes it down to the message component. The message component decides whether to render the button. No client-side LLM-output parsing.

### Discursive skills

Discursive skills do not render a Continue button — `mode === 'discursive'` skips the affordance entirely, even if a structured-output `readyToAdvance` somehow surfaces. Discursive completion is signalled by the user closing/abandoning the conversation or the skill calling `onComplete` based on its own logic (e.g. "draft saved" condition).

---

## Surface 3: slash-command parsing

### Behaviour in the chat input

The existing `ChatInput` (single textarea + send button) gains a thin parse-on-submit step:

1. User types a message.
2. On submit (Enter or send button), the runtime checks if the message's first non-whitespace token is `/<skill-id>` or `/skill <skill-id>`.
3. If yes → intercept: do NOT send the message as a normal chat turn. Instead trigger skill attach (see below).
4. If no → send normally (existing behaviour).

No popover, no autocomplete, no inline preview. Pure parse-on-submit.

### Skill attach behaviour (slash-command path)

Two cases:

**Case A — current conversation is empty AND has no skill:** attach the skill to the current conversation (no route change).
- Server action: set `skill_id` on the row, initialise `skill_state`, generate the skill's opening message via the runtime, persist it as the first assistant message.
- Client: optimistically clear the input, show a brief loader where the message stream is. On success, the opening message renders and the conversation list row updates (icon flips to `Brain`).

**Case B — current conversation has messages OR an existing skill:** confirm switching context.
- A `Modal` molecule (existing) appears: title `Start a new conversation?`, body `Skills can only run in a fresh conversation. Start a new one with [Skill Name]?`, primary action `Start new conversation` (creates the row server-side, routes to `/chat/[new-id]`), secondary action `Cancel` (returns to the current conversation, input cleared).
- The "one skill per conversation" rule lives here. No mid-conversation switching.

### Unknown skill ID

If `<skill-id>` doesn't match any registry entry: the input does NOT intercept — the message sends as a normal chat turn. The runtime decides what (if anything) to do with it (likely the LLM responds naturally that no such skill exists). No client-side error toast — keeps the parse path resilient and avoids modal interruptions for typos.

### Visual / state

No visible UI change when the input contains a slash command — the textarea looks identical until submit. No molecule extraction. The parse logic lives inside the existing `ChatInput` component.

---

## Surface 4: registry-miss banner

When `conversation.skill_id` is set but the runtime registry has no match (e.g. the skill was removed in a deploy):

```
┌─────────────────────────────────────────────────────────────────┐
│ ⚠ This conversation used a skill that's no longer available.   │  ← banner, single line
│   Messages remain readable; the skill cannot be resumed.       │
└─────────────────────────────────────────────────────────────────┘
[message stream renders below — read-only behaviour for input is NOT enforced
 in v1; the user can still send messages, the conversation just isn't skill-aware]
```

- Placement: top of the chat page area, above the message stream. Inside the page padding (not full-bleed).
- Surface: `bg-[var(--color-warning-bg)]`, text `text-[var(--color-warning-foreground)]`, `border border-[var(--color-warning)]`, `rounded-md`, `px-3 py-2`, `text-sm`.
- Icon: `AlertTriangle` left, 16px, in `--color-warning`.
- Two short lines, second line in `text-xs text-muted-foreground` (still inside the banner). Not dismissible — it's a state, not a notification.
- Component: `EmptyState` is the wrong fit (it's a centred placeholder for a whole region). This is a thin top-of-page banner — small enough that it doesn't need a new molecule for v1 if it's only ever used here. **However**, it's a reusable shape (warning bar above content), and OUT-01b's spec already calls for a similar pattern in its content panel ("State update failed at … "). I'm specifying it as a new molecule (`InlineWarningBanner`) so both consumers share the contract — see Molecule composition.

---

## Empty states

OUT-01a doesn't introduce new empty regions. The existing empty conversation list, the existing "no messages yet" chat empty state, etc. all carry over unchanged.

---

## Loading and error states

- **Skill attach (slash command, Case A):** message-stream area shows a thin centred loader (`Loader2` + `text-xs text-muted-foreground` `Starting [skill name]…`) while the server action runs. Replaces the existing empty-conversation prompt for that brief moment.
- **Continue click:** button shows inline spinner + `Advancing…` label (covered above).
- **Server failure on either:** toast (existing pattern). No banner.
- **Optimistic updates:**
  - Slash-command attach (Case A): optimistic icon flip on the conversation list row; revert on server failure.
  - Continue: NOT optimistic on the stage advance itself (the next assistant turn depends on the new stage's prompt addendum being authoritative — risk of mismatch). Button just shows `Advancing…` until the server confirms.

---

## Mobile considerations

Same as OUT-01: `ScreenSizeGate` blocks <990px. The icon slot in conversation list rows is small enough to not affect responsive trade-offs. The Continue button sits inline below assistant messages and reflows naturally with the message column. No new responsive rules.

---

## Keyboard interactions

OUT-01a doesn't introduce new shortcuts. The existing chat-input shortcuts (Enter to send, Shift+Enter for newline) work identically with slash commands — there's no special key path. The Continue button is keyboard-reachable via tab order from the latest assistant message; Enter activates it.

`Esc` in the slash-command Case-B Modal closes it (existing Modal behaviour).

---

## Molecule composition

### Existing molecules used

- `ActionButton` (registry: `components/action-button.tsx`, spec: `design-system.md § ActionButton`) — used for the Continue affordance (primary variant, `ArrowRight` trailing icon, supports disabled state).
- `Modal` (registry: `components/modal.tsx`, spec: `design-system.md § Modal`) — used for the slash-command Case-B confirm dialog ("Start a new conversation?").

### Existing molecules used but unspecced *(known gap — DS-03)*

(None.)

### New molecules required

- **`ConversationListRowIcon`** — the fixed-width icon slot rendered in front of every conversation list row's title. Encapsulates the freeform/skill/completed/registry-miss icon decision and adornment overlay so the conversation list itself doesn't get a four-branch render.
  - Props: `state` (`'freeform' | 'skill-active' | 'skill-completed' | 'registry-miss'`)
  - Visual: 24px-wide slot (16px glyph + 8px right gap), inline. Glyph is 16px (`h-4 w-4`), `text-muted-foreground`. `skill-completed` overlays a 10px `Check` bottom-right in `--color-success`. `registry-miss` overlays a 10px `AlertTriangle` bottom-right in `--color-warning`. No interaction — purely visual.
  - Replaces: net new — currently the conversation list row is bare; this molecule absorbs the upcoming branching cleanly and makes the row template the same for skill and freeform conversations.

- **`InlineWarningBanner`** — single-line warning bar that sits above content in a page region (not a toast, not a centred empty state). Used by OUT-01a's registry-miss banner and OUT-01b's "state update failed" warning row.
  - Props: `title` (string), `subtitle?` (string), `onDismiss?` (() => void) — when set, a close button renders on the right.
  - Visual: full-width within its parent, `bg-[var(--color-warning-bg)]`, text `text-[var(--color-warning-foreground)]`, `border border-[var(--color-warning)]`, `rounded-md`, `px-3 py-2`. Icon `AlertTriangle` 16px on the left in `--color-warning`. Title `text-sm`, subtitle `text-xs text-muted-foreground` on a second line (or omitted). Dismiss is `IconButton` ghost variant, only rendered when `onDismiss` provided.
  - Replaces: net new. OUT-01b's spec describes this shape inline ("State update failed at…") — extracting it now means OUT-01b's build can use the same molecule for free instead of inlining.

### Atoms used directly *(should be empty — every direct atom use is a missing molecule)*

(None expected. The two new molecules above plus `ActionButton` and `Modal` cover all introductions.)

### Notes on what was deliberately *not* extracted

- **`SkillLaunchButton`** (page-launched "Generate / Refresh" pattern) — deferred. The v1 example skill (`hello-world`) is launched via slash command only; DNA-02 will introduce the first real button when its build lands. Premature abstraction without a second consumer would lock the contract too early.
- **`SlashCommandInput`** — not needed. The slash-command parsing lives inside the existing `ChatInput` as a pre-submit guard. No visual change to the input means no molecule extraction.
- **`RegistryMissBanner`** as a dedicated molecule — folded into the more general `InlineWarningBanner` because OUT-01b has a near-identical shape coming up.

---

## Decisions log

- 2026-04-30: Layout approved. Continue button stays inline below the latest assistant message (per the brief's original behaviour, not auto-advance — staged skills require user confirmation). Conversation list row reserves a fixed icon slot for every row (skill or freeform) using `Brain` / `MessageCircle` so titles align. Slash command is parse-on-submit only — no popover/autocomplete in v1; revisit per the brief's open question. Page-launched `SkillLaunchButton` molecule deferred until DNA-02's build introduces the first real consumer. `InlineWarningBanner` is extracted now (despite being net new for v1) because OUT-01b has a second consumer already specced.
