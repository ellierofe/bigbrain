# Chat Skills Infrastructure Brief
Feature ID: OUT-01a
Status: complete
Last updated: 2026-05-01 (build complete)
Related: OUT-01 (chat — done), OUT-01b (adaptive context pane — brief approved 2026-04-30), OUT-01c (LLM database write tool — depends on this), DNA-02 (first consumer), ADR-008 (skills as separate primitive from content-creation pipelines)

## Summary

Skills are a first-class chat primitive: a system prompt + brief + checklist of goals + structured output schemas + access to a declared set of sub-agents. A conversation can run any skill in the registry, persisting its progress (`skill_id` + `skill_state`) so the user can leave and resume. This brief covers the runtime — registry, state, system prompt assembly, sub-agents — not any specific skill on top of it.

This is the foundation that turns chat from freeform conversation into a substrate for structured, goal-directed work: brand meaning generation, strategy refinement, coherence checks, in-chat DNA edits. The skill replaces what was previously called "specialists" and "recipes" with a single, expandable primitive.

## Use cases

### UC-1: Page-launched skill (primary)
- **Who:** Ellie
- **When:** On a DNA page (e.g. brand meaning), wants to generate or refresh that DNA item
- **Trigger:** Clicks a "Generate / Refresh" button on the page → a new conversation opens with the relevant skill set
- **System:** Routes to `/chat/<id>` with `skill_id` set; the skill's brief becomes the system prompt; the conversation begins with the skill's opening message
- **Outcome:** User progresses through the skill (staged or discursive); on completion, results are saved (via `db_update_bot` sub-agent) and the user lands back on the originating page

### UC-2: Slash-command skill launch
- **Who:** Ellie
- **When:** Already in chat, wants to invoke a structured skill rather than continue freeform
- **Trigger:** Types `/skill <id>` or `/<id>` in the chat input
- **System:** Starts a new skill conversation (skills are not switchable mid-conversation — see edge cases). Either creates a new conversation with the skill set, or prompts the user to confirm switching context
- **Outcome:** Same as UC-1, just initiated from within chat

### UC-3: Resume an in-progress skill
- **Who:** Ellie
- **When:** Started a skill earlier, didn't finish, returns later
- **Trigger:** Opens conversation list → picks the conversation (marked as in-skill via badge/colour) → "Resume" affordance
- **System:** Loads the conversation, replays messages (existing chat behaviour), re-injects the skill brief + current state into the system prompt; the LLM picks up where it left off
- **Outcome:** Conversation continues from the same point with state intact

### UC-4: Discursive skill conversation
- **Who:** Ellie
- **When:** Wants to think out loud with the system about a goal that doesn't have hard stages — e.g. "discuss positioning for the upcoming year"
- **Trigger:** Same as UC-1 or UC-2, but the skill is defined as discursive
- **System:** No advancement gates. The checklist tracks progress as guidance for the LLM and the user; the user decides when the conversation is done
- **Outcome:** User exits the skill (closes the conversation or marks it done); any captured items are saved if the skill defines a save action

### UC-5: Skill completion with continued chat
- **Who:** Ellie
- **When:** Has just finished a skill (final stage saved or discursive end), wants to keep chatting freely
- **Trigger:** Skill marks complete → conversation continues
- **System:** `skill_id` stays set (for history), `skill_state` records completion; conversation continues as freeform, with sub-agent access preserved
- **Outcome:** User can keep talking — useful for "I just generated brand meaning, now help me refine the mission wording"

## User journey

### Page-launched skill (canonical flow)

1. User clicks a "Generate" button on a DNA page (e.g. brand meaning)
2. System creates a new `conversations` row with `skill_id = 'dna-brand-meaning-generate'` and initial `skill_state`
3. Routes to `/chat/<id>` — chat UI loads with a visible skill marker (badge/colour shift)
4. The LLM's first message is the skill's opening — defined in the skill's brief
5. User responds; conversation continues
6. **Per turn:** the LLM responds in prose AND emits a structured state update describing what's been gathered (per the skill's checklist schema). The runtime extracts and merges this into `skill_state.gathered`
7. **For staged skills:** when the LLM signals readiness for the next stage (`readyToAdvance: true` in its structured output), the chat surfaces a Continue button. User clicks; runtime validates the current stage's checklist items are filled; if valid, advances `currentStage`; the new stage's system prompt addendum becomes active
8. **For discursive skills:** no advancement gates. Checklist updates appear in the context pane (OUT-01b) as guidance. User decides when the conversation is done
9. **Final stage completion:** the skill defines what happens — typically a save action via `db_update_bot` sub-agent. Save runs, success is confirmed in chat, `skill_state.completedAt` is recorded
10. User can continue chatting freely or leave

### Resume flow

1. User opens conversation list, sees a conversation marked as "in skill: brand meaning"
2. Clicks → conversation loads, all messages replay (existing chat behaviour)
3. The runtime reads `conversations.skill_id` and `skill_state` — assembles the same system prompt the conversation had at its last point (using the pinned `briefVersion`)
4. User can resume typing; the LLM has its context back via the message history and re-injected state

### New skill from slash command

1. User in any chat types `/skill dna-brand-meaning-generate` (or `/dna-brand-meaning-generate` shorthand)
2. If current conversation has `skill_id = null` and no messages, the skill attaches to the current conversation
3. If current conversation has messages or an existing skill, system prompts to confirm starting a new conversation (one skill per conversation rule)
4. From here, identical to UC-1 step 4 onward

## Data model / fields

### Schema additions to existing `conversations` table

| Field | Type | Required | Constraints | Notes |
|---|---|---|---|---|
| `skill_id` | text | no | nullable | Validated at runtime against the code-backed skill registry. Null = freeform chat (existing OUT-01 behaviour). |
| `skill_state` | jsonb | no | nullable | Holds the in-flight state for the active skill. Shape below. Null = no skill active. |

**Migration:** `ALTER TABLE conversations ADD COLUMN skill_id text, ADD COLUMN skill_state jsonb;` plus an index on `skill_id` for "list conversations by skill" queries.

**Why a string `skill_id`, not a FK to a `skills` table:** v1 has no `skills` table — skills are code-backed (TS modules in `lib/skills/<id>/`). Runtime validates `skill_id` against the registry. A future DB-backed `skills` table (for user-authored skills) would replace the validation, not the column type.

### `skill_state` shape

```ts
type SkillState = {
  /** Pinned at conversation creation so prompt updates don't break in-flight skills */
  briefVersion: string

  /** Free-form bag of structured data the skill has gathered. Per-skill shape. */
  gathered: Record<string, unknown>

  /** Items the skill is trying to fill. Universal across modes. */
  checklist: Array<{
    id: string
    label: string
    filled: boolean
    /** Reference into `gathered` — what value satisfies this item */
    valueRef?: string
  }>

  /** Staged mode only — undefined for discursive skills */
  currentStage?: string
  stagesCompleted?: string[]

  /** Set when the skill reaches its end state */
  completedAt?: string  // ISO timestamp
}
```

**Per-skill `gathered` shape:** the skill defines its own typed shape via Zod. The runtime treats it as opaque jsonb at the storage layer; type safety lives in the skill module.

### Skill definition (code-backed)

Each skill lives in `lib/skills/<skill-id>/`:

```
lib/skills/
  registry.ts                    // Record<string, Skill> export
  types.ts                       // shared Skill type definition
  runtime.ts                     // system prompt assembly, state extraction, advancement validation
  dna-brand-meaning-generate/    // example future skill
    brief.md                     // the prompt content (goal, rules, personality)
    index.ts                     // typed adapter — schemas, stages, sub-agents, exports Skill
    stages/                      // optional, staged skills only
      problem.md
      future.md
      values.md
      draft.md
```

**`Skill` type (TypeScript):**

```ts
type Skill = {
  id: string                              // matches directory name
  name: string                            // display name
  description: string                     // one-liner for skill picker
  briefVersion: string                    // semver-ish, bumped when brief.md changes
  brief: string                           // imported from brief.md
  mode: 'discursive' | 'staged'
  checklist: ChecklistItem[]              // universal — items the skill aims to fill
  stages?: Stage[]                        // staged mode only
  subAgents: SubAgentId[]                 // which sub-agents this skill can invoke
  gatheredSchema: ZodSchema               // shape of `skill_state.gathered`
  openingMessage: (ctx: SkillCtx) => string  // the LLM's first message — supports context interpolation
  onComplete?: (state: SkillState, ctx: SkillCtx) => Promise<void>  // save action, if any
}

type Stage = {
  id: string
  systemPromptAddendum: string            // imported from stages/<id>.md
  checklistItemIds: string[]              // which checklist items must be filled to advance from this stage
}

type ChecklistItem = {
  id: string
  label: string
  schema: ZodSchema                        // what "filled" looks like
}
```

### Sub-agent definitions

A sub-agent is a focused LLM call with its own system prompt and a small tool surface. The main chat LLM invokes a sub-agent as a tool; the sub-agent runs as a separate LLM call and returns a result.

**Sub-agents in v1:**

| Sub-agent ID | Purpose | Tools | Owner |
|---|---|---|---|
| `retrieval_bot` | Fetch context from DNA, source knowledge, graph | The 4 retrieval tools (`search_knowledge`, `get_brand_dna`, `get_source_knowledge`, `explore_graph`) | OUT-01a (this brief) |
| `db_update_bot` | Schema-aware writes to DNA tables and other entities | OUT-01c tools (TBD by OUT-01c brief) | OUT-01c (separate brief) |

Sub-agents live in `lib/skills/sub-agents/<id>/` with the same shape as a skill (brief.md + index.ts). They are not skills themselves — they don't run as conversations and don't have `skill_state`. They are stateless LLM-call functions with a focused system prompt and tool set.

**Skill → sub-agent invocation:**
- Each sub-agent registered in the skill's `subAgents` array becomes a tool available to the main chat LLM
- Tool name: the sub-agent ID (e.g. `retrieval_bot`)
- Tool input: a single string `task` describing what's needed
- Tool output: a string result the main LLM can use in its response
- Internally: the runtime makes an LLM call with the sub-agent's system prompt, the task, and the sub-agent's tools available

**Why this shape:** keeps the main chat LLM's system prompt clean (no 20-tool list); lets sub-agents specialise with focused prompts; matches your "specialist" mental model. Cost: one extra LLM call per delegation, but each is shorter and more reliable than a parent LLM juggling all tools at once.

## Update behaviour

- **`conversations` rows with `skill_id` set:** the skill_id and briefVersion are pinned at creation. Mid-conversation prompt updates do not affect in-flight skills (reproducibility). Skill_state is updated freely on each turn.
- **Skill registry (code):** versioned with the codebase. To update a skill's brief, the developer bumps `briefVersion` and ships a deploy. New conversations use the new version; in-flight conversations keep their pinned version.
- **One skill per conversation:** skill_id set at conversation creation cannot be changed. To run a different skill, the user starts a new conversation.
- **Sub-agent definitions:** also code-backed and versioned with the codebase. Stateless, no per-conversation pinning.

## Relationships

### Knowledge graph (FalkorDB)
No direct interaction. Skills can invoke `retrieval_bot` which queries the graph, and the future `db_update_bot` (OUT-01c) can write to graph tables, but OUT-01a itself adds no graph reads or writes.

### Postgres
- `conversations.skill_id` (text, nullable) — references skill registry by string ID, no FK
- `conversations.skill_state` (jsonb, nullable) — holds in-flight state
- All sub-agent reads/writes go through the existing query layer; OUT-01a adds no new tables

### Code dependencies
- Reuses `lib/llm/client.ts` (`generateObjectWithFallback`)
- Reuses existing `lib/db/queries/*` for context loading
- Adds `lib/skills/runtime.ts`, `lib/skills/registry.ts`, `lib/skills/types.ts`, `lib/skills/sub-agents/retrieval_bot/`
- Extends `/api/chat/route.ts` to detect `skill_id` and assemble the skill-aware system prompt

## UI/UX notes

**Template match:** none. New pattern (small) — chat surface extensions + skill-launch button. Layout spec at `01-design/wireframes/OUT-01a-layout.md`.

(Filled in detail at layout-design phase. The build needs at minimum:)

- **Skill marker** on conversations: visual indicator (badge, colour shift, or icon in the conversation list) so skill conversations are distinguishable from freeform
- **Continue button**: appears in the chat (somewhere near the latest assistant message) when a staged skill's LLM signals `readyToAdvance: true`
- **Slash command UI**: input parses `/skill <id>` or `/<id>`; autocomplete shows available skills
- **Page-launched entry point**: pattern for "Generate / Refresh" buttons on DNA pages that create a skill conversation. Build one example (referenced by DNA-02's brief for the brand meaning button)
- **Skill state visibility**: defers to OUT-01b (adaptive context pane) — that's where the checklist and gathered state are rendered. OUT-01a builds the data; OUT-01b renders it. v1 of OUT-01a can ship with checklist data accessible via API but no in-chat rendering until OUT-01b lands.

## Edge cases

### Skill ID not in registry
A conversation row exists with `skill_id = 'foo'` but the registry has no `foo` (e.g. a removed skill). On load: surface "This conversation used a skill that's no longer available — view as freeform?" with the conversation messages still readable. No system prompt assembly attempted; user can read the history but not continue.

### Staged skill: user clicks Continue but checklist isn't filled
Block advancement. Surface what's missing inline ("The system hasn't captured X yet — keep talking, or fill it manually"). Validation runs against the current stage's `checklistItemIds`. v1: block-and-surface only; no manual-fill UI (deferred to OUT-01b).

### LLM emits malformed structured state output
**Primary defence:** state extraction uses AI SDK structured output (`generateObject` with the skill's `gatheredSchema`, or tool calls with the same Zod schema). The LLM cannot emit free-form JSON for state — the API enforces the schema, so malformed-JSON is prevented at the LLM layer rather than parsed-by-vibe at the runtime layer. (Amendment 2026-04-30; see OUT-01b brief for the rationale.)

**Defensive fallback:** if validation still fails (rare — e.g. provider regression, schema mismatch after a code change): skip the state update for that turn and surface a visible warning row in the OUT-01b context pane ("State update failed at [time] — last successful update at [time]"). Don't silent-skip; the user must see that an extraction failed. The user-facing prose response is still shown; the conversation is not blocked.

### LLM doesn't emit a state update at all
Treated the same as the defensive-fallback case above: no state change recorded, warning surfaced in the pane, conversation continues. The next turn may emit one.

### One skill per conversation — user tries to start another
If user types `/skill <id>` in a conversation that already has a skill: prompt "Start a new conversation for this skill?" with confirm/cancel. No mid-conversation switching.

### Brief version mismatch on resume
Conversation pinned to `briefVersion: 1.0.0`; latest registry has `1.1.0`. Resume uses the pinned version (file accessible by version tag in code, or via a versioned export). v1: assume code keeps the latest only — pinned version is informational. If a brief is materially changed, accept that in-flight conversations may behave slightly differently; production hygiene is to deprecate-then-replace rather than mutate.

### Sub-agent call fails (LLM error, timeout, malformed output)
Surface to the main LLM as a tool error. The main LLM can retry, ask the user, or continue without the sub-agent's input. No conversation-level failure mode.

### Long conversations
Existing OUT-01 behaviour applies — `stepCountIs(5)` limits tool call rounds per turn (and now sub-agent rounds, since they're tools). Context window pressure handled at v1.1 (compaction).

### User abandons a skill mid-flow
No explicit abandon action. The conversation persists with `skill_state` intact. User can resume any time, or simply leave it. After 90 days inactive, conversation could be auto-archived (out of scope for v1).

### Resume after a sub-agent's tool surface changes
A sub-agent's tools can change between deploys (e.g. new retrieval tool added). On resume, the new sub-agent definition is used (sub-agents are not version-pinned, only skills are). This is acceptable — sub-agents are infrastructure, skills are content.

## Out of scope (v1)

- **Adaptive context pane** (OUT-01b — separate feature). v1 of OUT-01a exposes skill state via API but does not render it in chat.
- **DB-write sub-agent** (`db_update_bot`, OUT-01c — separate feature). The sub-agent registry supports it; the actual implementation is in OUT-01c's brief and build.
- **Specific skills** (DNA-02 brand meaning, DNA refresh flows, OUT-03, OUT-05). v1 ships with one example skill — see Technical Notes.
- **Multi-skill chaining** — skills cannot invoke other skills as sub-agents in v1. (Sub-agents are first-class; skills are not.)
- **Branching within a skill conversation** — out of scope; uses existing OUT-01 v2 branching plan when that lands.
- **Voice input** — text only.
- **In-app skill builder** — skills are authored in code in v1. Future DB-backed `skills` table for user-authored skills is parked.
- **Skill marketplace / sharing** — not relevant for single-user app.
- **Cost tracking per skill / sub-agent** — sub-agent calls inherit existing chat cost tracking via `messages.token_count`. Per-sub-agent breakdown is v2.
- **Brief version migration tools** — if a brief changes incompatibly, in-flight conversations keep their pinned version (or fail gracefully). No migration UI.

## Open questions / TBDs

- **Brief version pinning mechanics:** v1 keeps only the latest brief version in code. `briefVersion` is informational. If we ever need true reproducibility (in-flight conversations using the original brief verbatim), we'll need a versioned brief store (DB or git tags). Defer until a real incident motivates it.
- **Sub-agent retry policy:** if `retrieval_bot` returns a result the main LLM can't use, does it retry, ask the user, or fall through? v1: behaviour decided by the main LLM's prompt — no runtime retry logic. Revisit if it surfaces as a problem.
- **Slash command discovery:** v1 ships `/skill <id>`. Autocomplete and skill picker UX may need iteration. Marked for v1.1.

## Technical implementation notes

### Files to add

```
02-app/lib/skills/
  types.ts                            // Skill, Stage, ChecklistItem, SubAgent types
  registry.ts                         // Record<string, Skill> + Record<string, SubAgent>
  runtime.ts                          // assemble system prompt, extract state from LLM output, advance stage
  state.ts                            // load/save skill_state via Drizzle
  sub-agents/
    retrieval_bot/
      brief.md
      index.ts                        // wraps the 4 existing retrieval tools as a sub-agent
  hello-world/                        // example skill for v1 ship
    brief.md
    index.ts
    stages/                           // (only if hello-world is staged — likely keep it discursive for simplicity)
```

### Files to modify

- `02-app/lib/db/schema/chat.ts` — add `skillId` and `skillState` to `conversations`
- `02-app/app/api/chat/route.ts` — branch on `skill_id`: if set, assemble skill system prompt instead of the freeform chat one; expose skill's sub-agents as tools; extract state updates from LLM output on each turn
- `02-app/components/chat/*` — add skill marker to conversation list rows; add Continue button affordance for staged skills

### v1 example skill

Ship with one example skill — `hello-world` or similar — that exercises the runtime end-to-end without needing OUT-01b or OUT-01c. Discursive mode, no `db_update_bot`, just `retrieval_bot` access. Goal: validate that the runtime works (state extraction, sub-agent invocation, resume) before any real skill is built on top.

**Deliberately not brand meaning:** brand meaning is the first real consumer (DNA-02), not the v1 test fixture. Keeping the test fixture trivial means OUT-01a's build can ship and be validated independently of DNA-02.

### Migration

```sql
ALTER TABLE conversations
  ADD COLUMN skill_id text,
  ADD COLUMN skill_state jsonb;

CREATE INDEX conversations_skill_id_idx ON conversations(skill_id);
```

Migration via `schema-to-db` skill (no schema doc needed — this is a small extension to an existing table) or directly via Drizzle.

## Dependencies

| Dependency | Status | Blocking? |
|---|---|---|
| OUT-01 (chat infra) | done | No — extending it |
| INF-06 (LLM layer) | done | No |
| ADR-008 (skills as separate primitive) | accepted | No — this brief follows from it |
| OUT-01b (adaptive context pane) | planned | No — OUT-01a v1 ships without rendering, OUT-01b consumes the data later |
| OUT-01c (DB-write sub-agent) | planned | No — OUT-01a v1 ships without it; the sub-agent registry supports adding it without OUT-01a changes |

All hard dependencies are met. This feature is unblocked.

## Decisions log

- 2026-04-30: Brief approved. v1 test fixture is `hello-world` (discursive, no `db_update_bot` dependency) — keeps OUT-01a's blast radius bounded; brand meaning lands as a real skill once OUT-01b and OUT-01c ship.
- 2026-04-30: Edge case "LLM emits malformed structured state output" amended on approval of OUT-01b. State extraction now uses AI SDK structured output (Zod-enforced) as the primary defence; defensive fallback surfaces a visible warning in the context pane rather than silently skipping. Implementation lands as part of OUT-01b's build.
- 2026-04-30: Layout approved (`01-design/wireframes/OUT-01a-layout.md`). Four small UI surfaces: conversation-list row icon slot, inline Continue button below latest assistant message, slash-command parse-on-submit (no popover), and a registry-miss warning banner. Two new molecules: `ConversationListRowIcon` and `InlineWarningBanner` (the latter is also picked up by OUT-01b's "state update failed" warning row, so it's extracted now). Page-launched `SkillLaunchButton` deferred until DNA-02's build introduces the first real consumer. Continue stays user-confirmed per the brief's original journey (not auto-advance).
- 2026-05-01: Build complete. Migration 0030 added `skill_id` + `skill_state` to `conversations`. Skills runtime + registry + `retrieval_bot` sub-agent shipped under `lib/skills/`. `hello-world` example skill validates the runtime end-to-end. Slash-command parsing (`/<id>` and `/skill <id>`) intercepts in `ChatInput`; Case A attaches in place, Case B opens a `Modal` confirm and routes to a new conversation. Three new molecules landed: `ConversationListRowIcon`, `InlineWarningBanner`, and a third surfaced at plan time — `SkillContinueBar` (encapsulates the staged-skill advance affordance + missing-items hint to keep the chat-area organism free of appearance classes). `ActionButton` extended with optional `trailingIcon` prop. State extraction runs as a second `generateObject` call (Claude Haiku 4.5) after each assistant turn; defensive fallback warns to console without blocking the conversation. Skill conversations titled `<Skill name> · <date>` at creation, no auto-titling. State-extraction prompt explicitly lists checklist IDs and tells the LLM to mark items filled if their underlying value is present in `gathered` (caught during smoke testing — without this, the checklist was decoupled from the gathered field).
