# OUT-01c — Deferred functional testing
Filed: 2026-05-10
Owner: Ellie
Trigger: Run this test plan after the first save-bearing chat skill ships (DNA-02 brand-meaning skill is the expected first consumer).

## Why this is deferred

OUT-01c (LLM database write tool) shipped code-complete on 2026-05-10. The core mechanics — `db_update_bot` sub-agent, `entity_writes` audit log, `pending_writes` table, server actions, three pane molecules, system-message divider, auto-open behaviour — all typecheck, lint, and individually compile.

What's missing is end-to-end runtime confirmation: a real LLM-driven turn that calls `db_update_bot`, lands a pending row in the pane, gets confirmed by the user, and writes to the DB.

The blocker: there is no save-bearing skill in the registry yet. `hello-world` is discursive with no `onComplete`, so UC-1 (skill terminal save) is untestable today. UC-2 (ad-hoc chat write from a freeform conversation) *could* technically be tested now if the main chat LLM voluntarily calls `db_update_bot`, but that's an indirect test that doesn't validate the skill→onComplete path the build was structured around.

DNA-02 (singular DNA intake) is the natural test fixture: brand-meaning generation skill written as a real `Skill` with `onComplete: () => writes.brandMeaning.updateField(...)`. When DNA-02 lands, the full loop becomes testable.

## What needs testing

Run these in order. Each uses the live dev server (`npm run dev`) and a real Anthropic / Gemini API call.

### Pre-checks before each test

- `entity_writes` table exists and is empty (or note pre-existing rows)
- `pending_writes` table exists and is empty
- Hardcoded brand id `ea444c72-d332-4765-afd5-8dda97f5cf6f` resolves correctly in `app/actions/pending-writes.ts`
- `messages` table has the `metadata` jsonb column (added in migration 0037)

### UC-1 — Skill terminal save (the deferred path)

**Setup:** brand-meaning skill from DNA-02 must be registered with an `onComplete` that calls `lib/db/writes/dna/brand-meaning.ts` directly.

1. From the brand-meaning DNA page, click Generate / Refresh — should route to a new chat conversation with `skill_id = '<brand-meaning-skill-id>'`.
2. Walk through the staged skill conversationally to the terminal stage.
3. Click Continue to advance from the terminal stage. The runtime should invoke `skill.onComplete(state, ctx)`.
4. **Verify:**
   - `dna_brand_meaning` row updated for the brand (vision, mission, purpose, etc.)
   - `entity_writes` row inserted with `actor: 'skill:<skill-id>:conversation:<id>'`
   - `skill_state.completedAt` set on `conversations.skill_state`
   - In-chat `SystemMessageDivider` renders with success tone + `Saved: brand meaning`
   - Pane completion state visible in skill-state tab
5. Click back to the brand-meaning DNA page → values are populated.

### UC-2 — Ad-hoc chat write (canonical happy path)

1. Open a freeform conversation (no skill attached). Pane closed by default.
2. Type: `update my mission to "we make founders shippable"`.
3. **Expected, in this order:**
   - Main LLM responds in prose with a brief acknowledgement.
   - Main LLM calls `db_update_bot` as a tool (visible in `tool_calls` jsonb on the assistant message, or in console logs).
   - `db_update_bot` runs, picks `update_dna_brand_meaning`, persists a `pending_writes` row with `op: 'update'`, `field: 'mission'`, `before: '<current>'`, `after: 'we make founders shippable'`.
   - On the next page-data refresh (router.refresh after onFinish), the pane auto-opens.
   - `pending-writes` rail icon appears with success dot + pulse animation.
   - Selected tab is `pending-writes`.
   - Card shows: `DNA › Brand meaning` breadcrumb, `Update mission` summary, before/after diff (After block has primary left-edge accent), Reject + Confirm buttons.
4. Click Confirm → card flips to `saving` (Saving… pill, spinner on Confirm) → server action runs → card flips to `success` (Saved pill) → 300ms later card removes.
5. Page refreshes → `dna_brand_meaning.mission` is updated; `entity_writes` row inserted with `actor: 'chat:<conversationId>'`; `pending_writes` row flipped to `confirmed`; in-chat `SystemMessageDivider` renders with `Saved: mission updated`.

### UC-2 reject path

1. Same setup as UC-2, but click Reject instead.
2. Card flips to `rejected` (Rejected pill, neutral tone) → 300ms later card removes.
3. **Verify:**
   - `pending_writes` row flipped to `rejected`.
   - **No** `entity_writes` row inserted.
   - **No** in-chat divider.
   - Conversation continues; LLM's next turn should acknowledge the rejection (it'll see the rejection on the next route round-trip via the conversation context).

### Auto-open guard (the no-hijack rule)

1. Open a skill conversation with the skill-state tab visible (pane already open).
2. From inside the skill, ask the LLM to update something (or have it propose a write mid-skill).
3. **Expected:**
   - The pending-writes rail icon appears (status `'active'`) with success dot + pulse.
   - Selected tab does **NOT** switch to pending-writes — user stays on skill-state.
   - User clicks the rail icon to switch tabs manually.

This validates the "don't yank the user mid-read" rule from the layout decisions log.

### Multi-card pane

1. In one assistant turn, the LLM proposes two writes (e.g. update mission AND update vision).
2. Both cards render in the pending-writes tab. Each gets its own `PaneHighlightPulse` on mount (one pulse, not chained).
3. Confirm one card. The other stays mounted. Tab stays visible until both are decided.
4. Confirm the second. Tab auto-hides; selected tab falls back (to skill-state if applicable, else default).

### Tab auto-hide (the `previousTabId` fallback)

1. Pane open on skill-state tab (selected). LLM proposes a write.
2. Per the auto-open guard, pending-writes rail icon appears but skill-state stays selected. User clicks the rail icon to switch to pending-writes.
3. Confirm/reject the only card. Tab status returns to `'hidden'`.
4. **Verify:**
   - The selected tab falls back to skill-state (since the conversation has a skill).
   - Pane stays open (we don't auto-close — user explicitly opened it).

### Cmd+Enter shortcut

1. With a pending-writes card visible, click anywhere inside the card (focus enters via `tabIndex={-1}`).
2. Press Cmd+Enter (or Ctrl+Enter on non-Mac).
3. **Expected:** Confirm action fires. Same outcome as a Confirm button click.
4. **Verify the tooltip on the primary button reads `⌘↵`** (or platform equivalent).

### UC-4 — Direct create (idea is the simplest)

1. From a freeform conversation, ask: `add a new idea: "test the audit log retrofit"`.
2. Main LLM calls `db_update_bot` → sub-agent picks `create_idea`.
3. Card appears with op `create`, `Plus` icon, `Create idea` summary, body shows the payload as a `<dl>` of label/value pairs (text: "test the audit log retrofit", type: "idea").
4. Click Create → server action runs `ideaWrites.create(...)`.
5. **Verify:**
   - New row in `ideas` table with `text`, `type: 'idea'`, `status: 'captured'`.
   - `entity_writes` row inserted with `op: 'create'`, `field: null`, `after: <full payload>`, `actor: 'chat:<conversationId>'`.
   - In-chat divider: `Created: idea`.

### UC-5 — Generate kickoff (the long-running path)

1. From a freeform conversation, ask: `generate a new audience segment for early-stage technical founders raising their first round`.
2. Main LLM calls `db_update_bot` → sub-agent picks `request_dna_audience_segment_generation`.
3. Card appears with op `generate`, `Sparkles` icon, `Generate audience segment` summary. Body shows the seed as a `<blockquote>` with primary left-edge accent. Trailing two-line explainer: "Generation runs in the background. You'll be notified when ready."
4. Click Generate → primary button label flips to `Starting…`, spinner replaces leading position. **Card stays in `saving` state for ~30s** (sync wait inside `confirmPendingWriteAction` calling `kickoffGeneration`). The chat input is **not** blocked during this wait — user can keep typing.
5. Action completes → card flips to `success` with pill `Started` (note: not `Saved`, because op was `generate` — verify the special-case label logic).
6. **Verify:**
   - New row in `dna_audience_segments` with status `'active'`, populated profile fields (segmentName, summary, demographics, problems, etc.) from the GEN-01 pipeline.
   - `entity_writes` row inserted with `op: 'create'`, `actor: 'chat:<conversationId>'`, `after` carries the full generated profile.
   - In-chat divider: `Created: audience segment "<segmentName>"`.
   - Toast: `Saved` (the generic toast in `pending-writes-tab.tsx`).

### Error path — server-side write failure

This is harder to trigger naturally. Two manual ways:

- **Force a writable-fields mismatch:** temporarily edit `lib/db/writes/dna/brand-meaning.ts` to remove `'mission'` from `WRITABLE_FIELDS`. Then ask the LLM to update mission via chat. The tool call will return a structured error (`field 'mission' is not writable`) which the main LLM will surface in prose. **No pending card appears.**

- **Force a confirm-time failure:** add a `pending_writes` row manually via SQL with a malformed payload, navigate to the conversation, and click Confirm. The server action's `getEntityWrites` lookup will resolve, but the inner `updateField` will hit the validation branch.

**Expected when confirm fails:**
- Card flips to `error` state. Reject becomes re-enabled. Primary button re-enabled with the original label.
- `Failed` pill in the header. Error message renders as a single line below the footer in `text-destructive`.
- `pending_writes` row stays at `pending` (the action returns before the status flip). User can retry or reject.
- No in-chat divider.
- No `entity_writes` row.

### UI write audit (the retrofit)

Confirms the partial server-action retrofit works.

1. Navigate to `/dna/brand-meaning`. Edit the mission field inline (any change). On blur, autosave fires.
2. **Verify** an `entity_writes` row inserted with `actor: 'ui:/dna/brand-meaning'`.
3. Repeat for `/dna/business-overview` (any field) → `actor: 'ui:/dna/business-overview'`.
4. Repeat for `/dna/value-proposition` (any field) → `actor: 'ui:/dna/value-proposition'`.
5. Repeat for `/dna/audience-segments/<id>` (segmentName / personaName / summary / roleContext / avatarPrompt / avatarUrl) → `actor: 'ui:/dna/audience-segments/<id>'`.
6. Repeat for ideas list updates (text / status / type) → `actor: 'ui:/inputs/ideas'`.

**Known not-retrofitted (write-via-UI does NOT log):** offers, platforms, tone-of-voice, knowledge-assets. UI edits to these will write to the entity table but not to `entity_writes`. This is the side-quest carried in the OUT-01c brief decisions log. Confirm the gap is still real or, if the side-quest has been done in the meantime, extend the verification to those entities too.

### Concurrent-edit case (deferred)

Open `/dna/brand-meaning` in one tab and edit the mission inline. Simultaneously, ask the LLM in another tab to update the mission. **Expected:** last-write-wins (the brief documented this as a v1 limitation; no concurrent-write protection). No corruption, but the user-visible mission may flicker depending on tab refresh order.

## What "OUT-01c done" looks like after this pass

When all UC-1 through UC-5 + the auto-open guard + multi-card + tab auto-hide + Cmd+Enter + UI-audit checks pass:

1. Update `01-design/briefs/OUT-01c-llm-database-write-tool.md`:
   - Status: `approved` → `complete`
   - Decisions log: append `2026-XX-XX: Functional QA pass complete via DNA-02 build. All UC-1 through UC-5 verified end-to-end.`
2. Update `00-project-management/backlog.md`:
   - OUT-01c: `in-progress` → `done`
3. Optionally tackle the deferred side-quest: complete UI server-action audit retrofit for offers / platforms / tone-of-voice / knowledge-assets (4 files). Not blocking for OUT-01c done-ness, but the audit log isn't the source of truth until those land.

## Cross-references

- Brief: [01-design/briefs/OUT-01c-llm-database-write-tool.md](../01-design/briefs/OUT-01c-llm-database-write-tool.md)
- Layout: [01-design/wireframes/OUT-01c-layout.md](../01-design/wireframes/OUT-01c-layout.md)
- Build session log: [00-project-management/sessions/2026-05-05-out01c-build-d4m.md](sessions/2026-05-05-out01c-build-d4m.md)
- DNA-02 brief (the test consumer): [01-design/briefs/DNA-02-singular-dna-intake.md](../01-design/briefs/DNA-02-singular-dna-intake.md)
