# LLM Database Write Tool Brief
Feature ID: OUT-01c
Status: approved
Last updated: 2026-05-05
Related: OUT-01a (chat skills infrastructure — done), OUT-01b (adaptive context pane — done; small extension required), DNA-02 (first real consumer), DS-06 (save contract — behavioural counterpart), GEN-01 (audience segment generation pipeline — reused for create-via-generation), ADR-008 (skills as separate primitive — OUT-01c is skill infrastructure, not a content-creation pipeline tool)

## Summary

`db_update_bot` is the second sub-agent in the OUT-01a skills runtime. It exposes the application's writable Postgres surface (DNA tables + ideas) to the chat LLM as a small, schema-aware tool set. It enables three things v1 of chat cannot do today: skill terminal saves (the brand-meaning skill writing its result), in-skill mid-conversation field updates, and ad-hoc writes from freeform chat ("update my mission to say…").

The contract has three load-bearing properties: **schema awareness** (the LLM knows what fields exist on each entity, generated from Drizzle at build time so the brief never drifts from reality), **confirmation by default** (every ad-hoc write goes through a UI diff card in the OUT-01b context pane before it executes — confirmation is the security layer, not in-prose LLM hand-waving), and **auditability** (every write — LLM-driven or UI-driven — is logged to a minimal `entity_writes` table so the audit trail is the same regardless of source).

## Use cases

### UC-1: Skill terminal save (primary)
- **Who:** Ellie
- **When:** Has just completed a staged DNA-generation skill (e.g. brand meaning) — the final stage assembled a draft value, the user approved it conversationally
- **Trigger:** Skill's `onComplete(state, ctx)` runs; `onComplete` calls into `lib/db/writes/*` directly (not via `db_update_bot` LLM hop) using the `gathered` payload
- **System:** Writes to the relevant table (e.g. `dna_brand_meaning`), logs to `entity_writes` with `actor: 'skill:<skill-id>:conversation:<id>'`, surfaces a "Saved: brand meaning" confirmation message in chat, marks `skill_state.completedAt`
- **No re-confirmation:** the skill flow itself is the user's authorisation. Re-confirming after they've already approved each stage would be friction without payoff
- **Outcome:** DNA item populated; user can land back on the originating page with the values already in place

### UC-2: Ad-hoc chat write (LLM-driven, freeform conversation)
- **Who:** Ellie
- **When:** In any chat conversation (skill or freeform), says something like "update my mission to say X" or "the elevator pitch should be Y"
- **Trigger:** Main chat LLM detects a write intent, invokes `db_update_bot` as a tool with a task description
- **System:** `db_update_bot` runs as a focused LLM call against the schema-aware brief, picks the right entity tool (e.g. `update_dna_brand_meaning`), proposes the write with `dryRun: true`. The proposal lands in OUT-01b's context pane as a **pending-write card** showing field, before, after. User confirms or rejects in the pane
- **On confirm:** runtime calls the write a second time with `dryRun: false`; tool executes; result returns to main LLM ("Saved.") which surfaces a confirmation message in the chat stream
- **On reject:** runtime returns a "user rejected" tool result to main LLM, which continues the conversation (typically asking what the user wants instead)
- **Outcome:** User stays in control of every write; LLM cannot bypass the diff

### UC-3: In-skill mid-conversation write
- **Who:** Ellie
- **When:** Inside a staged skill, the LLM proposes a partial update before reaching the terminal save (e.g. mid-skill the user says "actually let me lock in the vision now, we can come back to mission")
- **Trigger:** Same as UC-2 — main LLM invokes `db_update_bot`. Falls out of the same tool surface
- **System:** Same as UC-2 — confirmation in pane, then write
- **Outcome:** Skill state continues; the underlying DNA row gets a partial update; the skill's final `onComplete` may overwrite the same field if the gathered draft differs (acceptable for v1)

### UC-4: Create-from-data (plural entities)
- **Who:** Ellie
- **When:** Has had a long conversation discussing a new audience segment (or idea, or offer in future) and the system has all required fields populated in `gathered`
- **Trigger:** LLM invokes the entity's `create_*_direct` tool with the full payload
- **System:** Tool validates required fields are present; if so, surfaces a pending-create card in OUT-01b pane (same pattern as UC-2 but showing all field values rather than a diff). User confirms; row is inserted; `entity_writes` logs `op: 'create'`
- **Outcome:** New segment exists; user can navigate to it

### UC-5: Create-via-generation (plural entities, async)
- **Who:** Ellie
- **When:** Has minimal info about a new audience segment and wants the existing GEN-01 pipeline to do the heavy lifting (generate full profile from seed inputs)
- **Trigger:** LLM invokes the entity's `request_*_generation` tool with seed inputs (name + minimum fields per the existing GEN-01 contract)
- **System:** Tool surfaces a pending-generate card in the pane (lightweight: "Generate audience segment for X?" + seed inputs). User confirms; tool kicks off the generation pipeline and returns immediately with a job reference. Generation runs async (existing GEN-01 path); on completion, a notification surfaces (toast / pane indicator) — *user does not have to keep the conversation open*
- **Outcome:** New segment is generated and inserted; user notified when ready

## User journey

### Ad-hoc chat write (canonical UC-2 flow)

1. User types "update my mission to say 'we make founders shippable'"
2. Main chat LLM responds with a brief acknowledgement and invokes `db_update_bot` as a tool with a task description ("Update brand meaning's mission to: 'we make founders shippable'")
3. `db_update_bot` runs an LLM call against its schema-aware brief; picks the `update_dna_brand_meaning` tool; calls it internally with `dryRun: true, field: 'mission', value: 'we make founders shippable'`
4. The internal tool resolves the current value (read), validates the field is in the allowlist + that the value is not malformed, and **does not write**. It returns a structured `PendingWrite` object: `{id, entity: 'dna_brand_meaning', op: 'update', field: 'mission', before: '<current>', after: 'we make founders shippable'}`
5. `db_update_bot` returns the `PendingWrite` to the main LLM as a tool result
6. Runtime detects the pending-write tool result and writes it to `conversations.context_pane_state.pendingWrites[]` (OUT-01b extension)
7. OUT-01b pane renders the pending-write card — field name, before/after diff, Confirm + Reject buttons. The pane auto-opens or pulses if collapsed (existing OUT-01b pulse pattern)
8. User clicks Confirm
9. `confirmPendingWriteAction` server action runs; reads the `PendingWrite` from `pending_writes` (or context pane state — see data model), calls the write a second time with `dryRun: false`; the inner write function executes; `entity_writes` logs the operation; the relevant Next.js path is revalidated
10. Pane removes the card and shows a transient "Saved" indicator (uses existing DS-06 save-feedback patterns)
11. Runtime injects a system message into the conversation: "Saved: mission updated." The main LLM picks this up on its next turn and confirms to the user in prose

### Skill terminal save (canonical UC-1 flow)

1. Final stage of skill is reached; LLM signals `readyToAdvance: true` on the last stage
2. User clicks Continue (existing OUT-01a behaviour) → runtime advances stage; since this is the final stage, runtime invokes `skill.onComplete(state, ctx)`
3. `onComplete` is implemented in the skill module; it reads `state.gathered` and calls `lib/db/writes/dna/brand-meaning.ts` directly — no `db_update_bot` LLM hop, no UI confirmation
4. Inner write function performs the upsert/update, logs to `entity_writes` with `actor: 'skill:dna-brand-meaning-generate:conversation:<id>'`, returns success
5. `onComplete` calls `revalidateForEntity('dna_brand_meaning')` (small helper) to revalidate the DNA page paths
6. Runtime sets `skill_state.completedAt`; pane updates to show completion; runtime injects "Saved: brand meaning. View on the brand meaning page." into the conversation
7. User can continue chatting freely (UC-5 from OUT-01a) or navigate to the DNA page

### Create-via-generation (canonical UC-5 flow)

1. User: "Add a new audience segment for early-stage technical founders raising their first round."
2. LLM invokes `db_update_bot` with task; sub-agent picks `request_dna_audience_segment_generation`
3. Tool validates seed inputs against the entity's generation-pipeline schema (must have at least name + a one-line description per GEN-01)
4. Tool returns `PendingGeneration` to main LLM; runtime stages it in pane
5. User confirms in pane; runtime calls `kickoffGenerationAction` which calls into the existing GEN-01 generation pipeline as a background job
6. Tool result back to main LLM: "Generation kicked off. You'll be notified when ready."; main LLM relays to user
7. When generation completes, GEN-01 writes the row; runtime emits a notification (toast in chat + pane indicator); user can click through to the new segment

## Data model / fields

### New table: `entity_writes` (audit log)

| Field | Type | Required | Constraints | Notes |
|---|---|---|---|---|
| `id` | uuid | yes | PK | |
| `brand_id` | uuid | yes | FK `brands.id` | scoped per brand |
| `entity_type` | text | yes | enum: `'dna_business_overview' \| 'dna_brand_meaning' \| 'dna_value_proposition' \| 'dna_audience_segment' \| 'dna_offer' \| 'dna_platform' \| 'dna_tone_of_voice' \| 'dna_knowledge_asset' \| 'idea' \| ...` | matches table-prefix naming |
| `entity_id` | uuid | yes | foreign-id, no FK constraint (entity_type determines target table) | |
| `op` | text | yes | enum: `'create' \| 'update'` | no `delete` in v1 |
| `field` | text | nullable | the field name for `update`; null for `create` | |
| `before` | jsonb | nullable | previous value for `update`; null for `create` | |
| `after` | jsonb | yes | new value for `update`; the full payload for `create` | |
| `actor` | text | yes | structured: `'ui:<path>'` for UI-driven; `'skill:<skill-id>:conversation:<id>'` for `onComplete`; `'chat:<conversation-id>'` for `db_update_bot` | |
| `at` | timestamptz | yes | `now()` default | |

Index on `(brand_id, entity_type, entity_id, at desc)` — supports per-entity history view (no UI in v1, but query is cheap to add).

**Why a single audit table not per-entity history tables:** uniform query surface; one place to add new entities; no per-entity migration when new types come online; small-row count concerns can be addressed later via partitioning if needed (single-user app, unlikely to matter).

### New table: `pending_writes` (LLM proposals awaiting confirmation)

| Field | Type | Required | Constraints | Notes |
|---|---|---|---|---|
| `id` | uuid | yes | PK | |
| `conversation_id` | uuid | yes | FK `conversations.id` cascade delete | |
| `entity_type` | text | yes | same enum as `entity_writes` | |
| `entity_id` | uuid | nullable | null for `create` ops | |
| `op` | text | yes | enum: `'update' \| 'create' \| 'generate'` | `generate` = create-via-generation request |
| `payload` | jsonb | yes | for update: `{field, value, before, after}`; for create-direct: full row payload + computed diff vs empty; for generate: seed inputs + target entity_type | |
| `status` | text | yes | enum: `'pending' \| 'confirmed' \| 'rejected'` | rows kept post-decision for the audit log; not deleted |
| `created_at` | timestamptz | yes | | |
| `decided_at` | timestamptz | nullable | set when status moves out of `pending` | |

Index on `(conversation_id, status)` — supports "list pending writes for this conversation" pane query.

**Why persist pending writes in a table not just `context_pane_state`:** survives page reload, decided rows are auditable, and OUT-01b's pane-state JSONB is for ephemeral UI state, not for write proposals. Confirmed `pending_writes` rows are written to `entity_writes` on confirmation and the `pending_writes` row's status flips — both rows preserved for the trail.

### Tool surface (inside `db_update_bot`)

The sub-agent has a tool per writable entity. Tool names follow `{op}_{entity_type}` pattern:

**Update tools (one per entity):**
- `update_dna_business_overview({field, value, dryRun})`
- `update_dna_brand_meaning({field, value, dryRun})`
- `update_dna_value_proposition({field, value, dryRun})`
- `update_dna_audience_segment({id, field, value, dryRun})`
- `update_dna_offer({id, field, value, dryRun})`
- `update_dna_platform({id, field, value, dryRun})`
- `update_dna_tone_of_voice({field, value, dryRun})`
- `update_dna_knowledge_asset({id, field, value, dryRun})`
- `update_idea({id, field, value, dryRun})`

**Create tools (plural entities only — singulars auto-create on first update):**
- `create_dna_audience_segment({payload, dryRun})` — direct create
- `request_dna_audience_segment_generation({seedInputs, dryRun})` — async via GEN-01
- `create_dna_knowledge_asset({payload, dryRun})` — direct create (single-form create pattern)
- `create_idea({payload, dryRun})` — direct create (the ideas IDEA-01 quick-capture pattern is already a single-call insert; reuse)

**Deliberately not direct-create in v1:** offers and platforms. Their existing creation flows (DNA-04 multi-stage VOC + interlocutor generation; DNA-07 platform-strategy generation) are too judgement-heavy to compress into a single tool call. The right primitive for these is a **skill** — the LLM, when asked to create one, surfaces "this is a skill — let me start it for you" and invokes the create skill via slash-command-style escalation. Until those skills exist, v1 only supports `update_dna_offer` / `update_dna_platform` (modify existing rows). `db_update_bot`'s brief is taught this rule explicitly.

**Tool argument shape:**
- `field`: must be in the entity's writable allowlist (Drizzle-generated, see below)
- `value`: typed per the field's Drizzle column type (string, number, jsonb, etc.)
- `id`: required for update on plural entities; ignored for singular updates (resolved from `brandId` in ctx)
- `dryRun`: boolean. `true` = return `PendingWrite`, do not execute. `false` = execute (only called by `confirmPendingWriteAction`, never by the LLM directly)

**Allowlist source of truth:** `lib/db/writes/<entity>.ts` exports a typed `WRITABLE_FIELDS` set per entity. The Drizzle schema is the source of column types; the writes lib filters to fields that are LLM-writable (excluding system fields like `id`, `brandId`, `createdAt`, `updatedAt`).

### Schema-aware brief generation (Q4.2 = (c))

The sub-agent's brief is partly hand-written (purpose, tone, decision rules) and partly generated. A build-time script reads the writes-lib `WRITABLE_FIELDS` exports + Drizzle column types and emits a `lib/skills/sub-agents/db_update_bot/SCHEMA.md` (committed; regenerated when schemas change). The runtime `loadBrief()` concatenates `brief.md + SCHEMA.md`.

**Generation script:** `scripts/generate-db-update-bot-schema.ts`. Run as part of `npm run check:design-system` family or as a standalone `npm run gen:write-schema`. Lint check: a CI/local check that compares the committed `SCHEMA.md` against a freshly generated one and fails if they differ — keeps the brief from drifting.

**Format of `SCHEMA.md`:** per entity, list `{field name, type, optional/required, description}` in compact Markdown. The LLM uses this to pick the right field name and shape values correctly.

## Update behaviour

- **Singular DNA writes** (business overview, brand meaning, value proposition, tone of voice): existing upsert pattern — first write auto-creates the row; subsequent writes update the field. LLM is unaware of the upsert mechanic; tool API is uniformly `update_dna_<entity>(field, value)`.
- **Plural entity writes**: update requires `id`; create produces a new row.
- **Audit log writes**: every write through `lib/db/writes/*` (LLM or UI) appends to `entity_writes`. No mutation/deletion of audit rows.
- **Pending write lifecycle**: `pending` → `confirmed` (executes write) | `rejected` (no write). Status transitions are one-way; rows persist for the trail.
- **Re-runs of skill `onComplete`** (e.g. user re-runs the brand meaning skill from scratch): the second run overwrites the same DNA row. `entity_writes` shows the full history. v1 does not warn the user that a previous skill run already populated the DNA row — accepted limitation, revisit if it surfaces.

## Relationships

### Knowledge graph (FalkorDB)
**No graph writes in v1.** All writes are Postgres-only. A new backlog item (`OUT-01c-graph` or similar) is added for graph-write support — different orchestration model, deferred to a later iteration. See "Out of scope".

### Postgres
- **Reads:** `lib/db/queries/*` for current values (used to compute `before` for the diff)
- **Writes:** new `lib/db/writes/*` modules — extracted from existing server actions, see Implementation notes
- **New tables:** `entity_writes`, `pending_writes`
- **Modified tables:** none (existing entity tables are unchanged)
- **FKs:** `pending_writes.conversation_id` → `conversations.id`; `entity_writes.brand_id` → `brands.id`

### Code dependencies
- Reuses `lib/llm/client.ts` (`generateObjectWithFallback`, `generateText`)
- Reuses `lib/skills/types.ts` (`SubAgent`, `SkillCtx`)
- Reuses OUT-01b's pane runtime — adds a new content type `pending-writes` to `lib/chat-context-pane/registry.ts`
- Reuses GEN-01's audience-segment generation pipeline for `request_dna_audience_segment_generation`
- Reuses DS-06's `lib/save-feedback.ts` patterns for the pane's confirm-write feedback (visual consistency with rest of app)

## UI/UX notes

**Template match:** Second consumer of the `chat-context-pane` pattern (OUT-01b). Pane shell, rail, tab plumbing, resize, persistence, and registry contract are fully templated; OUT-01c registers a new tab.

**Layout spec:** `01-design/wireframes/OUT-01c-layout.md` (approved 2026-05-05). Full spec covers the new `pending-writes` tab body, three op variants of the `PendingWriteCard` molecule, the in-chat `SystemMessageDivider` for post-write confirmation, the three-channel generation-complete notification, and two new pane behaviours (auto-open + tab-select on arrival; tab auto-hide on last decision).

Three new molecules: `PendingWriteCard`, `PendingWritesList`, `SystemMessageDivider`. See the molecule composition section of the layout spec for full props + visual contracts.

Existing molecules reused unchanged: `ContextPane`, `ContextPaneRail`, `RailIcon`, `PaneHighlightPulse`, `ActionButton`, `IconButton`, `EmptyState`, `StatusBadge`. The `StageCard` value-renderer logic is extracted to `lib/value-render.tsx` as a shared pure helper (tracked side-quest for OUT-01c build).

Reject-reason capture deferred (stretch — see Out of scope).

## Edge cases

### Tool tries to write a field not in the allowlist
The inner write function checks `WRITABLE_FIELDS` and returns `{ok: false, error: "Field 'X' is not editable"}`. `db_update_bot` returns this to main LLM; main LLM surfaces "I can't write X — ask Ellie if she wants to update a related field instead." No retry.

### LLM hallucinates a field or table that doesn't exist
The schema-aware brief should make this rare. If it happens, the inner write function rejects (same as above). Main LLM surfaces the error, often correcting itself on the next turn ("Sorry, I meant `mission`, not `mission_statement`").

### Validation failure on the value (e.g. empty string for a required field)
Inner function rejects with structured error `{ok: false, code: 'validation', message: '<field> cannot be empty'}`. Main LLM surfaces and asks the user for the actual value. Specific case from Q4.3 confirmed.

### User rejects a pending write
- For ad-hoc / standard writes (UC-2): runtime returns a "user rejected" tool result to main LLM; LLM continues the conversation, typically asking what the user wants instead. *(Q6.4 answer (a))*
- For in-skill writes (UC-3 inside a skill): runtime returns the rejection (and any captured reason) to main LLM AND injects a structured marker into `skill_state.gathered.rejections[]` so the skill can adapt. *(Q6.4 answer (c))*

The differentiator is whether `conversations.skill_id` is set on the active conversation.

### LLM emits a write proposal but the user closes the conversation before confirming
`pending_writes` row stays in `pending` status. On next conversation load, the pane re-renders pending writes from the table. No expiry in v1.

### Concurrent writes (user editing a DNA page in another tab while chat writes)
**v1: last-write-wins.** Existing UI inline-edit also has no concurrent-write protection. Documented limitation; revisit if it bites.

### Generation-via-create kickoff fails
Tool returns `{ok: false, error: '<msg>'}`. Pending-write row marked `rejected` automatically with reason. User notified.

### `entity_writes` write fails after the entity write succeeded
**Choice:** entity write happens inside a transaction with the audit log write. If audit fails, the whole transaction rolls back. Visibility-over-trust takes priority over write throughput.

### `revalidatePath` semantics in tool-call context
**Choice:** writes lib does not call `revalidatePath` directly. Inner write functions return `{pathsToRevalidate: string[]}`; the calling layer (server action for UI / runtime for `db_update_bot` / runtime for `onComplete`) handles revalidation. This makes the writes lib portable and removes the request-context dependency.

### Onboarding: user has no DNA yet
Singular DNA writes auto-create on first write. No special handling needed.

### Skill `onComplete` writes are not LLM-confirmed — what if the gathered draft has a typo?
The skill's UX is the confirmation surface. Each stage's user-approval-of-draft step (per DNA-02 brief) is where typos get caught. If the user approved a draft that has a typo, that's a usability concern for the skill, not a write-tool concern.

## Out of scope (v1)

- **Graph writes (FalkorDB).** Tracked in a new backlog item (`OUT-01c-graph` — added on brief approval). Different orchestration; defer.
- **Source knowledge writes** (the `sources` / `source_chunks` tables). Bound up with the input pipeline (INP-*); not a chat-driven flow yet.
- **Cross-entity transactions** (e.g. create an audience segment AND link it to an offer in one call). Each tool writes one entity. v2.
- **Bulk writes / batch operations**.
- **Delete operations** of any kind. No tool will delete; not in v1.
- **Undo / revert UI for past writes.** The `entity_writes` log makes it possible; no UI in v1.
- **Per-entity history viewer.** Audit table exists; no UI surface yet.
- **Reject-reason capture** (stretch — see UI/UX notes).
- **Pending-write expiry** — pending writes don't time out; user can confirm a day-old pending write. Revisit if pile-up becomes a UX issue.
- **Tool cost / sub-agent telemetry** — inherits OUT-01a's general chat telemetry; no per-write cost reporting.
- **Schema migrations triggered by the LLM** — never.

## Open questions / TBDs

- **`onComplete` direct-write vs LLM-driven write:** brief specifies `onComplete` calls `lib/db/writes/*` directly, bypassing `db_update_bot`. Rationale: skill terminal saves are pre-authorised; an LLM hop adds latency, cost, and a failure mode for what should be deterministic. **Confirm at approval.**

RESPONSE: OK, seems good.

- **Server-action-vs-writes-lib refactor scope:** brief specifies extracting inner write logic from `app/actions/*` into `lib/db/writes/*`. Affected files: `app/actions/dna-singular.ts`, `app/actions/audience-segments.ts`, `app/actions/offers.ts`, `app/actions/platforms.ts`, `app/actions/tone-of-voice.ts`, `app/actions/knowledge-assets.ts`, `app/actions/ideas.ts` (~7 files). Server actions become thin wrappers; existing UI behaviour is preserved. **Confirm at approval that this is in scope for the OUT-01c build, not split into a separate refactor ticket.**

RESPONSE: OK, this seems fine.


- **Audit-log retrofit of UI writes:** brief specifies that UI server actions also log to `entity_writes` after the refactor. **Confirm at approval.**

RESPONSE: Yep.


- **`SCHEMA.md` regeneration enforcement:** lint check vs runtime regeneration vs ignore. Brief leans toward a CI/local check (drift detection). **Confirm at approval.**

RESPONSE: OK, don't really know that this means but seems fine.


- **OUT-01b pane extension scope:** OUT-01b is `done`, but adding a `pending-writes` content type requires a small extension to its registry + a new tab/section. **Confirm at approval that this lands inside the OUT-01c build, not as an OUT-01b amendment.**

RESPONSE: Yes, that's fine. That's the point of how it's designed. That it can be added to.


- **DNA-04 / DNA-07 create reusability:** create_dna_offer / create_dna_platform tools depend on whether the existing creation logic can be extracted from the create-modals into pure write functions without state coupling. **Verify at plan-time during build; fall back to update-only for those entities if extraction is non-trivial.**

RESPONSE: OK. These might need to be skills that get invoked or something?

## Technical implementation notes

### Files to add

```
02-app/lib/db/writes/                       — extracted write layer (pure functions, no Next.js coupling)
  index.ts                                   — re-exports + WRITABLE_FIELDS aggregator
  audit.ts                                   — log to entity_writes, transactional helper
  dna/
    business-overview.ts                     — updateField + WRITABLE_FIELDS
    brand-meaning.ts
    value-proposition.ts
    audience-segment.ts                      — updateField, create, WRITABLE_FIELDS
    offer.ts
    platform.ts
    tone-of-voice.ts
    knowledge-asset.ts
  ideas.ts                                   — updateField, create

02-app/lib/db/schema/audit.ts                — entity_writes + pending_writes table defs
02-app/lib/db/queries/pending-writes.ts      — list/insert/update pending_writes

02-app/lib/skills/sub-agents/db_update_bot/
  brief.md                                   — purpose, decision rules, tone, examples
  SCHEMA.md                                  — generated from Drizzle; committed
  index.ts                                   — sub-agent definition (mirrors retrieval_bot shape)
  tools.ts                                   — exports the per-entity update/create tool builders consumed by the sub-agent

02-app/lib/chat-context-pane/pending-writes.ts   — context-pane content type for pending writes

02-app/components/chat/pending-write-card.tsx    — molecule — diff/payload card with Confirm/Reject
02-app/components/chat/generation-pending-card.tsx (or merged into above) — variant for `op: 'generate'`

02-app/app/actions/pending-writes.ts          — confirmPendingWriteAction, rejectPendingWriteAction

02-app/scripts/generate-db-update-bot-schema.ts — emits SCHEMA.md from Drizzle + writes lib
02-app/scripts/check-db-update-bot-schema.ts   — drift check
```

### Files to modify

- `02-app/lib/skills/types.ts` — `SubAgentId` already includes `'db_update_bot'`; no type change. `SkillCtx` may need `revalidatePath: (path: string) => void` injected (or the runtime handles revalidation centrally — decide at plan time).
- `02-app/lib/skills/sub-agents/index.ts` — register `dbUpdateBot`.
- `02-app/lib/skills/runtime.ts` — when a tool result includes a `PendingWrite`, persist it via `pending-writes.ts` and reflect into `context_pane_state`.
- `02-app/app/actions/dna-singular.ts`, `app/actions/audience-segments.ts`, `app/actions/offers.ts`, `app/actions/platforms.ts`, `app/actions/tone-of-voice.ts`, `app/actions/knowledge-assets.ts`, `app/actions/ideas.ts` — refactor to thin wrappers calling `lib/db/writes/*`. Server-action UI behaviour preserved exactly. Each wrapper emits `actor: 'ui:<path>'` to the audit log.
- `02-app/lib/db/schema/index.ts` — export `entity_writes`, `pending_writes` from `audit.ts`.
- `02-app/lib/chat-context-pane/registry.ts` — register `pending-writes` content type.
- `02-app/components/chat/chat-area.tsx` (or wherever the pane is mounted) — wire pending-writes content type.
- `02-app/package.json` — add `gen:write-schema` and `check:write-schema` scripts.

### Migrations

```sql
-- 0032: entity_writes audit log
CREATE TABLE entity_writes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  op text NOT NULL,
  field text,
  before jsonb,
  after jsonb NOT NULL,
  actor text NOT NULL,
  at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX entity_writes_lookup_idx ON entity_writes (brand_id, entity_type, entity_id, at DESC);

-- 0032: pending_writes
CREATE TABLE pending_writes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  entity_type text NOT NULL,
  entity_id uuid,
  op text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz
);
CREATE INDEX pending_writes_conversation_status_idx ON pending_writes (conversation_id, status);
```

Both lands in one migration via `schema-to-db` skill (small, well-bounded — no schema doc required, but this brief acts as the source of truth).

### v1 ship gate

`db_update_bot` must be exercisable end-to-end against:
1. **`update_dna_brand_meaning`** — proves the singular update path (the DNA-02 unblocker).
2. **`create_idea`** — proves the plural-create path with the simplest entity (ideas have minimal fields; no generation pipeline).
3. **`request_dna_audience_segment_generation`** — proves the async-generation path (the GEN-01 reuse).

These three exercises cover the three operation classes. Other tools (offers, platforms, tone of voice, knowledge assets, etc.) are added but smoke-tested only at integration time; full coverage tests for every entity is v1.1.

## Dependencies

| Dependency | Status | Blocking? |
|---|---|---|
| OUT-01a (skills runtime + sub-agent shape) | done | No — extending it |
| OUT-01b (context pane runtime) | done | No — small content-type extension required, lands inside OUT-01c |
| DNA-01 (DNA tables exist) | done | No |
| DS-06 (save contract) | done | No — pattern reuse |
| GEN-01 (audience segment generation pipeline) | done | No — reused for `request_*_generation` |
| INF-06 (LLM layer) | done | No |

All hard dependencies are met. This feature is unblocked.

## Decisions log

- 2026-05-05: Brief drafted. Single sub-agent `db_update_bot` (not split per entity) — tool decision tree stays one level deep; future graph writes land here as additional tools without restructuring.
- 2026-05-05: Confirmation contract (D from feature-brief Q3.1): no re-confirmation on skill `onComplete` saves (pre-authorised by completing the skill); UI diff confirmation in OUT-01b pane for ad-hoc writes (UC-2), in-skill mid-conversation writes (UC-3), and direct-create / generate (UC-4 / UC-5).
- 2026-05-05: Schema awareness via build-time generation from Drizzle (Q4.2 = (c)). `SCHEMA.md` committed; drift-detected by lint check.
- 2026-05-05: Audit log lives in a single `entity_writes` table covering UI-driven and LLM-driven writes both. Singular table, not per-entity. UI server actions retrofit to log via the new `lib/db/writes/*` layer.
- 2026-05-05: Server-action-vs-writes-lib extraction is in scope for the OUT-01c build (not split into a separate refactor ticket).
- 2026-05-05: Reject-handling differentiated by skill context — in-skill rejections feed into `gathered.rejections[]` so the skill can adapt; ad-hoc rejections just close the loop.
- 2026-05-05: No graph writes in v1. New backlog item (`OUT-01c-graph` or similar) tracked separately.
- 2026-05-05: Naming: `db_update_bot` retained — single sub-agent, not split per entity-class.
- 2026-05-05: Brief approved. All five open questions resolved: (1) `onComplete` direct-write confirmed, (2) writes-lib refactor in scope for OUT-01c build, (3) UI server actions retrofitted to log to `entity_writes`, (4) `SCHEMA.md` regeneration enforced via lint check (CI/local drift detection), (5) OUT-01b pane extension lands inside OUT-01c build (registry was designed for this).
- 2026-05-05: Offers and platforms removed from v1 direct-create surface. Their multi-stage creation flows (DNA-04 VOC + interlocutor generation; DNA-07 platform strategy) are skill-shaped, not tool-shaped. `db_update_bot` brief is taught to escalate "create an offer" / "create a platform" intents to the appropriate skill rather than attempt a direct create. Update tools for both entities remain in v1.
- 2026-05-10: Build code-complete. Status held at `approved` (not `complete`) pending end-to-end functional QA. Full test plan filed at `00-project-management/2026-05-10-out01c-deferred-testing.md` — to be run after the first save-bearing skill (DNA-02 brand-meaning skill) is registered, since `hello-world` has no `onComplete` and UC-1 is therefore untestable today. Build session log: `00-project-management/sessions/2026-05-05-out01c-build-d4m.md`.
- 2026-05-05: Layout approved (`01-design/wireframes/OUT-01c-layout.md`). Net-new design landed on three molecules: `PendingWriteCard` (one molecule, three op variants), `PendingWritesList` (list shell + arrival pulse + empty state), `SystemMessageDivider` (centred narrow line in the message stream for system-attributed messages — write confirmations, errors, generation completions). Two new pane behaviours extending OUT-01b: auto-open + tab-select on new pending write when pane is closed (no hijack of an open pane on a different tab — pulse + dot does the discovery work); tab auto-hide once the last pending write is decided, with previous-tab fallback. Generation-complete notification is three-channel (toast + in-chat divider + transient conversation-row dot). Confirm shortcut `Cmd+Enter` available when a `PendingWriteCard` is focused; Reject has no shortcut (deliberate click). Card auto-removes 300ms after success/rejected. `StageCard`'s gathered-value renderer extracted to `lib/value-render.tsx` as a shared pure helper.
