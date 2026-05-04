# Adaptive Chat Context Pane Brief
Feature ID: OUT-01b
Status: complete
Last updated: 2026-05-01 (build complete)
Related: OUT-01 (chat — done), OUT-01a (chat skills infrastructure — in-progress, brief approved 2026-04-30), OUT-01c (LLM database write tool — planned), OUT-01d (skill creator skill — planned), DNA-02 (first real consumer of skill-state rendering)

## Summary

A right-side pane in the chat UI that makes "what's going on in this conversation" visible: skill checklists, gathered values, stage progression, completion state, and — over time — referenced items, topics, variants, and other conversation-scoped context. The pane is the rendering surface that OUT-01a deferred to this brief; it is also the architectural substrate for future context types without rewrites.

The pane is structured as a **vertical icon rail + content panel** (similar in shape to Claude.ai's right-hand pane or the legacy prototype at `04-documentation/reference/legacy_files/content_creation/chat.html` lines 1522–1602). Each icon = a context tab. Tabs are pluggable: each tab declares whether it applies to the current conversation, and renders its own content. v1 ships **one tab — `skill-state`** — to validate the contract end-to-end before adding more.

This is a direct expression of design rule 4 (visibility): gathered skill state must be inspectable in real time, or the user can't trust the system.

## Use cases

### UC-1: Watching skill state fill during a generation flow
- **Who:** Ellie
- **When:** Running a skill (e.g. DNA-02 brand meaning generate) and wants to see what's been captured so far without scrolling the conversation
- **Trigger:** Skill conversation is active; pane is open; skill-state tab is selected by default
- **System:** Renders the skill's checklist with filled/unfilled markers, gathered values, current stage, and stages completed; updates after each assistant message completes
- **Outcome:** User sees real-time visibility of the skill's progress; trusts the system because gathered state matches their conversational intent

### UC-2: Reviewing what was captured at an earlier stage
- **Who:** Ellie
- **When:** Mid-skill or after completion; wants to see what was captured at "stage 2: future state" specifically
- **Trigger:** Clicks the stage card in the skill-state tab to expand it
- **System:** Expands the stage card to show the gathered values associated with that stage (read-only)
- **Outcome:** User can audit captured state without scrolling the message history

### UC-3: Resuming a skill conversation
- **Who:** Ellie
- **When:** Reopens a conversation she left mid-skill yesterday
- **Trigger:** Opens conversation; pane rehydrates with the last-selected tab
- **System:** Pane shows the skill-state tab with checklist + gathered values + current stage as last persisted; tab selection persisted from previous session
- **Outcome:** User picks up exactly where she left off, including pane context

### UC-4: Skill completion
- **Who:** Ellie
- **When:** Final stage of a skill saves to the database (via `db_update_bot`)
- **Trigger:** `skill_state.completedAt` is set
- **System:** Skill-state tab shows a "Completed at [time]. Database updated. You can keep chatting." banner above the final state snapshot; the rail icon shifts to a completed state (different colour/check mark)
- **Outcome:** User has clear visual confirmation that the save succeeded and knows the conversation is now in continuation mode rather than skill mode

### UC-5: Starting a skill from freeform chat
- **Who:** Ellie
- **When:** In a freeform chat (no `skill_id`); wants to attach a skill
- **Trigger:** Clicks the skill-state tab in the pane
- **System:** Tab renders a skill picker (list of available skills from the registry). Selecting a skill follows the same path as `/skill <id>`: if the conversation is empty, the skill attaches; if it already has messages, prompts "Start a new conversation for this skill?"
- **Outcome:** Pane becomes a discoverable entry point for skills, not just a passive readout

### UC-6: Resizing the pane
- **Who:** Ellie
- **When:** Wants more chat room or more pane room
- **Trigger:** Drags the pane's left edge
- **System:** Resizes within bounds (min 280px, max 560px); persists width per-user
- **Outcome:** Pane width matches the user's preference next time she opens any chat

### UC-7: Collapsing the pane
- **Who:** Ellie
- **When:** Wants the pane out of the way for a while
- **Trigger:** Toggles pane closed via a button in the pane header (or in the chat toolbar)
- **System:** Pane fully collapses (rail + panel hidden); state persists per-user
- **Outcome:** Next chat opens with pane closed until user re-opens it

## User journey

### Canonical: skill conversation with pane open

1. User clicks "Generate" on a DNA page → conversation created with `skill_id` set (OUT-01a)
2. Routes to `/chat/<id>`; layout loads with chat area + right pane
3. Pane renders: vertical icon rail on the right edge + content panel to the left of the rail
4. Skill-state tab is `active` (skill_id is set, even if state is empty); rail shows its icon, selected by default
5. Content panel renders the skill-state view: skill name + description, checklist (all unfilled), stage list (current stage highlighted), no completion banner
6. User responds to the LLM's opening message; assistant streams a reply
7. **On assistant turn complete:** runtime re-reads `conversations.skill_state`; pane re-renders. Items that flipped from unfilled → filled get a subtle highlight pulse (300ms, no attention-grab)
8. **For staged skills:** when a stage completes, that stage's card collapses and the next stage's card highlights as `current`
9. **On final stage save:** `skill_state.completedAt` is set; skill-state tab's rail icon shifts to completed state; content panel shows the completion banner above the final state snapshot
10. User can keep chatting; pane state remains visible (no auto-hide)

### Resume

1. User opens a previously-active skill conversation
2. Layout loads with pane open per user preference; pane width per user preference
3. Selected tab rehydrated from `conversations.context_pane_state.selectedTabId`
4. Skill-state tab renders the persisted `skill_state`
5. User continues; pane updates as in canonical flow

### Freeform → attach skill

1. User opens a new freeform chat (no `skill_id`); pane is open
2. Skill-state tab is `active` (it always shows, just renders different content for freeform); selected by default
3. Content panel renders the skill picker: list of skills from `lib/skills/registry.ts` with name + description + icon
4. User clicks a skill
5. **If conversation has no messages:** skill attaches to current conversation (`skill_id` written, opening message generated)
6. **If conversation has messages:** confirmation prompt "Start a new conversation for this skill?" — confirm creates a new conversation, cancel returns to picker
7. After attach, content panel switches from picker to the skill-state view (state is empty until first turn)

### Tab switching (future, in v1 only one tab)

1. User clicks a different rail icon
2. Content panel swaps to that tab's render
3. Selected tab persisted to `conversations.context_pane_state`

## Data model / fields

### Schema additions

**`brands` table — brand-level pane preferences:**

| Field | Type | Required | Constraints | Default | Notes |
|---|---|---|---|---|---|
| `chat_pane_open` | boolean | no | not null with default | true | Whether the pane is open by default when opening any chat |
| `chat_pane_width` | integer | no | 280 ≤ x ≤ 560 | 360 | Pane width in pixels |

(Preferences live on `brands` rather than `users` because BigBrain is single-brand-per-user today and broader UI preferences should follow the brand context as the app grows. `users` has no UI-preference columns yet; introducing a generic preference column on `brands` keeps the surface predictable.)

**`conversations` table — per-conversation pane state:**

| Field | Type | Required | Constraints | Default | Notes |
|---|---|---|---|---|---|
| `context_pane_state` | jsonb | no | nullable | null | Shape: `{ selectedTabId: string }`. Null means default tab logic applies (highest-priority `active` tab) |

### Migration

```sql
ALTER TABLE brands
  ADD COLUMN chat_pane_open boolean NOT NULL DEFAULT true,
  ADD COLUMN chat_pane_width integer NOT NULL DEFAULT 360;

ALTER TABLE conversations
  ADD COLUMN context_pane_state jsonb;
```

No new tables. No FKs.

### Context tab contract (code-backed)

```ts
type ContextTabStatus = 'active' | 'empty' | 'hidden'

type ConversationCtx = {
  conversation: Conversation       // includes skill_id, skill_state, context_pane_state
  messages: Message[]              // for tabs that derive from message history
}

type ContextTab = {
  id: string                       // e.g. 'skill-state'
  label: string                    // tooltip on hover
  icon: LucideIcon                 // rail icon
  priority: number                 // default ordering in the rail; lower = earlier

  /**
   * Decides applicability and content presence.
   * 'active' = applicable AND has content (icon shown, badge dot, default-selectable)
   * 'empty'  = applicable but no content yet (icon shown, no dot, selectable)
   * 'hidden' = not applicable to this conversation (icon hidden)
   */
  status: (ctx: ConversationCtx) => ContextTabStatus

  /** Renders the content panel when this tab is selected. */
  render: (ctx: ConversationCtx) => ReactNode
}
```

### v1 tab: `skill-state`

- **Lives in:** `02-app/lib/skills/context-tab.tsx` (co-located with skill data)
- **status:** `active` if `conversation.skill_id` is set OR conversation has no messages (so freeform empty conversations render the skill picker); `empty` if `skill_id` is null but conversation has messages (renders an empty-state explainer); never `hidden`
- **render:**
  - If `skill_id` is null → renders the skill picker (or empty-state explainer if conversation has messages)
  - If `skill_id` is set → renders skill name + description, checklist with filled/unfilled markers, stage list (each stage card collapsible to show stage-scoped gathered values), completion banner if `completedAt` is set

### Registry

- **Lives in:** `02-app/lib/chat-context-pane/registry.ts`
- **Shape:** `Record<string, ContextTab>` — code-backed, versioned with the codebase, no DB table
- **Imports:** each tab module from its co-located home; v1 imports only `lib/skills/context-tab.tsx`

## Update behaviour

- **`brands.chat_pane_open` and `brands.chat_pane_width`:** freely editable; updated on toggle/resize via a new brand-preferences server action (no existing path)
- **`conversations.context_pane_state`:** freely editable; updated on tab switch
- **Tab content:** derived state — re-renders when its source data changes (e.g. `skill_state` updates after each assistant turn complete). No persistence beyond what the source already persists.
- **Tab registry:** code-backed; new tabs ship via deploy. No runtime registration.

## Relationships

### Knowledge graph (FalkorDB)
None directly. Future tabs (e.g. referenced item) may render data sourced from the graph, but each tab handles its own data access; the pane itself does not.

### Postgres
- `brands.chat_pane_open` (boolean) — brand-level preference
- `brands.chat_pane_width` (integer) — brand-level preference
- `conversations.context_pane_state` (jsonb) — per-conversation tab selection
- Reads `conversations.skill_id` and `conversations.skill_state` (added by OUT-01a) — no writes from this feature

### Code dependencies
- Reads from `lib/skills/types.ts` (skill state shape, defined in OUT-01a)
- Adds `lib/chat-context-pane/registry.ts`, `lib/chat-context-pane/types.ts`, `lib/chat-context-pane/pane.tsx` (the pane component itself), `lib/skills/context-tab.tsx` (the v1 tab)
- Modifies the chat layout (likely `02-app/app/(dashboard)/chat/[id]/page.tsx` or its layout file) to mount the pane

## UI/UX notes

**Layout spec:** `01-design/wireframes/OUT-01b-layout.md` (approved 2026-04-30). Establishes the `chat-context-pane` template at `01-design/wireframes/templates/chat-context-pane-template.md` for future tabs.

Headline decisions from the layout:
- **Pane structure:** 56px vertical icon rail on the right edge + scrollable content panel to its left, per-brand width (default 360px, range 280–560px), per-brand open/closed state, per-conversation selected-tab persistence.
- **Rail:** `RailIcon` (new molecule) — 40px hit area, deliberately larger than standard `IconButton` because it's a primary nav surface. Tooltip on hover. Active-with-content tabs show a 6px success dot top-right. Completion adornment supports a `Check` overlay bottom-right.
- **Stages:** `StageCard` (new molecule). Current stage marked by a 3px coloured left border in `--primary` (no inline status icon for current). Completed stages use a `Check` icon in `--color-success`. All collapsed by default, multiple can be expanded simultaneously.
- **Skill picker:** lives inside the skill-state tab when a freeform conversation is empty, allowing skills to be attached from the pane (same code path as `/skill <id>`). Locked explainer for freeform conversations that already have messages.
- **Completion banner:** sits above the skill summary card when `skill_state.completedAt` is set; rail icon gets `Check` adornment.
- **Defensive warning row:** if structured-output state extraction fails despite OUT-01a's amendment, a single dismissible warning row pins to the top of the content panel until the next successful state update.
- **Highlight pulse:** `PaneHighlightPulse` (new molecule) — 300ms low-intensity primary background flash on items that change after a turn-complete. Reusable for any future tab that wants update visibility.

New molecules introduced (specs to be authored via design-system Mode A at build plan time): `ContextPane`, `ContextPaneRail`, `RailIcon`, `StageCard`, `SkillChecklist`, `SkillPickerRow`, `PaneHighlightPulse`.

Pane contributes to the **organism layer** in the design system sense — composed of molecules. New molecules go through `design-system` Mode A at build plan time.

## Edge cases

### No tabs match (all return `hidden`)
Not possible in v1 because skill-state's `status` never returns `hidden`. For future-proofing: pane shows an empty rail and an empty-state explainer in the content panel ("No context for this conversation"). Pane stays visible per user preference.

### `skill_state` is empty (skill just attached, no turns yet)
Skill-state tab status is `active`; render shows the skill name, description, checklist (all unfilled), stages (current stage highlighted, none completed), no completion banner. Empty checklist = empty checklist, not an error state.

### `skill_state` is malformed
**Shouldn't happen** because OUT-01a is being amended (see "Cross-cutting decision" below) to use AI SDK structured output (Zod schema enforced) for state updates. If validation still fails defensively (e.g. DB corruption, code bug):
- Pane renders the last-known-good `skill_state` (or empty if there's no good state)
- A warning row appears at the top of the content panel: "State update failed at [time] — last successful update at [time]"
- User-facing prose response is still shown in the chat (no conversational interruption)

### `skill_id` references a skill not in the registry
OUT-01a's existing edge case ("Skill ID not in registry") handles this at the conversation level (offers freeform view). For the pane: skill-state tab renders an explainer "This conversation used a skill that's no longer available — view as freeform". No checklist, no picker. User can read but not resume.

### Conversation has no messages and no `skill_id`
Skill-state tab is `active`; render shows the skill picker. User can attach a skill from the pane (UC-5 path).

### Conversation has messages and no `skill_id` (freeform with history)
Skill-state tab status is `empty`; render shows: "This conversation is freeform. To use a skill, [start a new conversation]." Clicking the link opens a new conversation with the skill picker rendered. Matches OUT-01a's "one skill per conversation" rule.

### `selectedTabId` references a tab no longer in registry
Fall back to default-selection logic (highest-priority `active` tab). Update `conversations.context_pane_state.selectedTabId` to the new selection silently.

### Long gathered values (paragraphs of text in a single field)
Content panel scrolls vertically. No truncation by default — user came here for visibility.

### Pane width persistence vs. viewport width
Pane width is clamped to `min(width, viewport - 480px)` at render time so the chat area always has at least 480px. Stored width unchanged.

### Mobile / narrow viewports
**Out of scope.** App assumes ≥ 990px viewport. No responsive collapse logic.

### Resize during a turn
Resize is purely a layout operation; no effect on conversation state.

### Tab status flips mid-conversation
e.g. skill-state's `status` transitions from `empty` → `active` after first state extraction. The rail icon's badge dot appears with a subtle pulse; selected tab does not change. User stays where they are.

## Cross-cutting decision: structured output for state extraction

OUT-01a's brief specifies that malformed state updates from the LLM are silently skipped. This brief upgrades that contract:

- **Primary:** OUT-01a's runtime emits state updates via AI SDK structured output (`generateObject` with the skill's Zod `gatheredSchema`, or tool calls with schema), so malformed JSON is prevented at the LLM layer.
- **Defensive:** if validation still fails (rare), the pane surfaces a warning row rather than silently skipping. The user sees that an extraction failed, not just an absent update.

**Action:** OUT-01a's brief edge case "LLM emits malformed structured state output" needs amending to reflect this. Amendment to be made when this brief is approved.

## Out of scope (v1)

- **Tabs other than skill-state.** Referenced item, topic, current variant, source attachments, etc. — all parked. Contract supports them; tab modules ship in later iterations.
- **Manual checklist fill UI.** User wanting items marked filled manually can ask the LLM. Saves design effort in v1.
- **Tab reordering by user.** Priority is code-defined.
- **Multiple panes / split content.** One tab visible at a time. No drag-to-detach, no floating panes.
- **Real-time streaming updates within a turn.** Pane refreshes on assistant turn complete. Token-by-token state updates not in v1.
- **Mobile / responsive layouts.** ≥ 990px viewport assumed.
- **In-pane editing of arbitrary DNA / database content.** Pane is read-mostly in v1 (skill picker is the only write affordance, and it just sets `skill_id`).
- **Per-conversation pane open/closed.** Open/closed and width are per-brand only. Selected tab is per-conversation.
- **Auto-hide / auto-show heuristics.** Pane visibility is purely user-controlled.
- **Multi-skill conversations / utility-skill mode.** Long-term concept (per discussion: flow skills vs. utility skills, e.g. `/morning-review` then `/skill-creator` mid-conversation). Out of scope for v1; OUT-01a's "one skill per conversation" rule still holds.
- **Skill creator skill / context-tab creator skill** (OUT-01d, planned). Will be authored after OUT-01b ships and a few more tabs have been built manually.

## Open questions / TBDs

- **Brand preferences write path:** `brands` has no UI-preference write path today. Build adds the smallest possible server action (e.g. `app/actions/brand-preferences.ts`) writing to the active brand. To be confirmed at build plan time.
- **Resize handle visual treatment:** detailed at layout-design phase. Bound is set; affordance design is not.
- **Stage card expansion behaviour (resolved):** all stages collapsed by default; multiple cards can be expanded at once. User toggles each independently. Detailed visual treatment locked at layout-design.
- **OUT-01a brief amendment:** the structured-output upgrade described in "Cross-cutting decision" needs to be applied to OUT-01a's brief on approval of this one. Action item, not a blocker.

## Technical implementation notes

### Files to add

```
02-app/lib/chat-context-pane/
  types.ts                    // ContextTab, ContextTabStatus, ConversationCtx
  registry.ts                 // Record<string, ContextTab> — imports each tab module
  pane.tsx                    // <ChatContextPane /> — rail + content panel + resize + collapse
02-app/lib/skills/
  context-tab.tsx             // skill-state tab — co-located with skill data
```

### Files to modify

- `02-app/lib/db/schema/brands.ts` — add `chatPaneOpen`, `chatPaneWidth` to the `brands` table
- `02-app/lib/db/schema/chat.ts` — add `contextPaneState` to `conversations`
- `02-app/app/(dashboard)/chat/[id]/page.tsx` (or its layout) — mount `<ChatContextPane />` to the right of the chat area; thread `Conversation` and `Message[]` through as `ConversationCtx`
- `02-app/app/api/chat/route.ts` (or wherever skill state extraction lives) — switch state extraction to AI SDK structured output (`generateObject` with `skill.gatheredSchema`). This is the OUT-01a amendment landing in this build.
- `02-app/components/chat/*` — add the pane open/close toggle button to the chat toolbar

### Migration

```sql
ALTER TABLE users
  ADD COLUMN chat_pane_open boolean NOT NULL DEFAULT true,
  ADD COLUMN chat_pane_width integer NOT NULL DEFAULT 360;

ALTER TABLE conversations
  ADD COLUMN context_pane_state jsonb;
```

Via `schema-to-db` skill or directly via Drizzle (small extensions to existing tables, no new schema documents needed).

### Build order

1. Migration + Drizzle schema updates
2. `lib/chat-context-pane/types.ts` and `registry.ts` (empty registry)
3. `lib/chat-context-pane/pane.tsx` shell — rail + content panel + collapse + resize, no tabs yet (verify layout, persistence, resize)
4. `lib/skills/context-tab.tsx` — skill-state tab, register it
5. Wire up pane to chat layout
6. Apply OUT-01a structured-output amendment to skill state extraction
7. End-to-end test with the OUT-01a `hello-world` example skill

## Dependencies

| Dependency | Status | Blocking? |
|---|---|---|
| OUT-01 (chat infra) | done | No |
| OUT-01a (chat skills infrastructure) | in-progress (brief approved) | **Yes** — pane consumes `skill_id` + `skill_state`; OUT-01a build must land at least far enough that those fields exist and are populated by the runtime, before OUT-01b can be exercised end-to-end |
| INF-06 (LLM layer) | done | No |

OUT-01a needs to be far enough along that `conversations.skill_id` and `conversations.skill_state` exist and a test fixture (the `hello-world` skill) populates them. Brief and migration alone are sufficient for OUT-01b's design-time work; full end-to-end testing requires OUT-01a's runtime to be functional.

## Decisions log

- 2026-04-30: Brief approved. v1 ships with one tab (skill-state) only — referenced item, topic, etc. parked for future iterations once the contract is proven. Pane preferences live on `brands` (not `users`) to follow brand context. Stage cards default to collapsed with multi-expand allowed. OUT-01a brief amendment for structured-output state extraction is greenlit and will land in this build. OUT-01d (skill creator skill) added to backlog during this brief discussion as a future feature for authoring new skills and context tabs.
- 2026-04-30: Layout approved. `RailIcon` is a new molecule (40px hit area, larger than IconButton). `SkillPickerRow` ships focused; may generalise later. `PaneHighlightPulse` ships as a single-source pulse animation wrapper. Skill-state tab status stays `active` whenever applicable — always selectable, never falls through to `empty`. Current-stage marker is a 3px coloured left border. Completion banner sits above skill summary. New `chat-context-pane` template registered for future tabs.
- 2026-05-01: Build complete. Mid-build refactor: introduced a client-safe `SkillSummary` projection in `lib/chat-context-pane/types.ts` (`id`, `name`, `description`, `mode`, `checklistMeta`, `stagesMeta`) and a server-side `toSkillSummary` helper. The skill-state context tab now consumes summaries instead of importing `lib/skills/registry` directly, keeping the server-only registry (which transitively imports `node:fs` via `load-brief`) out of the client bundle. Production build blocked by **BUG-01** (baseline prerender regression in OUT-01a's tree); dev server confirms OUT-01b end-to-end (`/chat` returns 200 with the pane rendered). BUG-01 is filed as a separate cross-cutting fix to unblock deployment.
- 2026-05-01 (post-QA amendment): Pane behaviour changed after first dev-mode QA. **Rail is now always visible** (pinned to the right edge of the chat surface); `paneOpen` controls only whether the content panel is rendered next to the rail. Re-open is via clicking a rail icon — the external `PanelRightOpen` toggle in `chat-area.tsx` is removed. Default state for `brands.chat_pane_open` flipped from `true` to `false` (migration `0035_pane_open_default_false.sql` + `DEFAULT_PANE_PREFS` in `lib/db/queries/brands.ts`) so the chat content has full width by default and the user opts into the panel. Rail icon click semantics: open + select when closed; toggle-close when clicking the currently-selected icon; switch tabs when clicking a different icon. Empty-state container in `chat-area.tsx` widened from `max-w-lg` to `max-w-2xl w-full` so prompt starters use the available column. Resize handle reworked — handle now centred on the panel's left edge with a hover indicator; document-level cursor + user-select set during drag to prevent flicker.
