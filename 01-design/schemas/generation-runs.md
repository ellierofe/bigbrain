---
status: approved
table: generation_runs
type: system (operational state, not DNA)
related_features: OUT-02, OUT-02a
adr: ADR-006
last_updated: 2026-04-28
---

# Schema: generation_runs

System table. The system-of-record for **in-flight and recently-generated**
content runs. A row is created the moment the user clicks Generate, persists
through streaming, holds the variants array post-completion, and is swept
30 days after completion if no variant has been saved to the library.

This is **transient draft state**, not the saved-content registry. Saved
content lives in `library_items`. Permanent analytics live in
`generation_logs`. See OUT-02 brief for the three-table separation
rationale.

## Lifecycle

1. **Submit:** User clicks Generate. Row inserted with `status = 'generating'`,
   `expiresAt = now() + 30 days`, `inputs` jsonb populated from the
   `GenerationInputs` shape (see `02-app/lib/llm/content/types.ts`),
   `assembledPrompt` populated, `fragmentVersions` populated.
2. **Stream in:** As the model returns variants, `variants` jsonb is updated
   in place. Status remains `generating`.
3. **Complete:** When all variants are returned, status → `complete`,
   `completedAt = now()`. The row is now editable from the UI.
4. **Edit in place:** User edits variant text on the page. `variants[].text`
   mutates. No history kept (regeneration is the "undo" path).
5. **Save:** User clicks Save on a variant. A `library_items` row is created
   with a snapshot of the variant text + auto-tags. The variant gets
   `status = 'saved'` and `libraryItemId` set. **The `generation_runs` row
   itself is not deleted** — it stays for 30 days from completion in case the
   user wants to save other variants too. Once any variant on the run is
   saved, the run is "kept" — TTL no longer applies (see `kept` flag below).
6. **Discard:** User discards a variant — `variants[].status = 'discarded'`.
   Row stays.
7. **Sweep (cron):** Daily Vercel cron `DELETE WHERE expires_at < now() AND
   kept = false`. Runs that errored or were never saved get cleaned up.
8. **Errored:** If the model call fails, status → `errored`, `errorText`
   populated. Same TTL applies.

## Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | |
| `contentTypeId` | uuid | not null, FK → `content_types.id` ON DELETE RESTRICT | The content type the run was generated against. RESTRICT — never cascade-delete content types when runs reference them; archive instead. |
| `stageId` | uuid | not null, FK → `prompt_stages.id` ON DELETE RESTRICT | Which stage of the content type produced this run. V1 single-step types always have one stage; V2 long-form runs have one row per stage. RESTRICT for the same reason as `contentTypeId`. |
| `parentRunId` | uuid | nullable, FK → `generation_runs.id` ON DELETE SET NULL | Self-FK. Set when this run is a regeneration (UC-3) or a downstream stage of a multi-step content type (V2 — `copy` stage references its `blueprint` run). SET NULL — losing the parent ref doesn't invalidate the run, just loses the lineage trail. |
| `status` | varchar(20) | not null, default `'generating'` | One of: `generating`, `complete`, `errored`, `cancelled`. State machine — see Lifecycle above. |
| `inputs` | jsonb | not null | Full structured snapshot of what the user submitted. Matches `GenerationInputs` from `02-app/lib/llm/content/types.ts`: `{ strategy, topic_chain, free_text_augments, settings }`. Frozen at submit — never mutates. |
| `assembledPrompt` | text | nullable | The final prompt sent to the model after eight-layer assembly + placeholder resolution. For audit, debug, and repro. Nullable because pre-assembly errors leave it unset. |
| `fragmentVersions` | jsonb | not null, default `{}` | Map of `{ fragment_slug: version }` for every fragment used in the assembled prompt. Lets us reproduce a specific past run even after fragments are edited (per-version append-only model). |
| `modelUsed` | varchar(100) | nullable | Resolved model slug (e.g. `claude-opus-4-7`). Resolved from settings override → stage default → runtime hierarchy. Nullable for pre-call failures. |
| `variants` | jsonb | not null, default `[]` | Array of `{ id, text, status, saved_at?, library_item_id? }`. See **variants shape** below. |
| `errorText` | text | nullable | Populated when status = `errored`. Captures the model error or assembly error. |
| `kept` | boolean | not null, default `false` | True once any variant on the run has been saved to the library. Disables the TTL sweep — the run stays as long as its library items reference it. Cleared if all saved variants are subsequently deleted (rare; library items are stable). |
| `expiresAt` | timestamp with tz | not null | TTL for the daily sweep. Set to `now() + 30 days` at submit. Sweep query: `DELETE WHERE expires_at < now() AND kept = false`. |
| `completedAt` | timestamp with tz | nullable | Set when status transitions to `complete` or `errored`. Null while generating. |
| `createdAt` | timestamp with tz | not null, defaultNow | |
| `updatedAt` | timestamp with tz | not null, defaultNow | |

## status state machine

```
                  ┌───────────────┐
        submit →  │  generating   │
                  └───────┬───────┘
                          │
                stream    │
                  ┌───────┴────────┬──────────────┐
                  ▼                ▼              ▼
              ┌────────┐      ┌─────────┐    ┌───────────┐
              │complete│      │ errored │    │ cancelled │
              └────────┘      └─────────┘    └───────────┘
```

`cancelled` is V1.5 — user kills an in-flight run. V1 doesn't surface a cancel
button; status enum carries it for forward compat (unused values cost
nothing in varchar; would cost a migration in pgEnum).

## variants shape

`generation_runs.variants` is a jsonb array. Each element:

```ts
type Variant = {
  /** Stable id within the run. Generated client-side at variant insertion (uuid v4). */
  id: string
  /** Live text. Edited in place by the user pre-save. Replaced by regeneration; not versioned. */
  text: string
  /** Variant lifecycle state. */
  status: 'draft' | 'saved' | 'discarded'
  /** Timestamp when status transitioned to 'saved'. Null otherwise. */
  saved_at?: string  // ISO 8601
  /** FK reference (string, not enforced) to library_items.id. Set when status = 'saved'. */
  library_item_id?: string
}
```

**Why string-ref to `library_items.id` instead of a real FK:** the variants
array is jsonb. Postgres doesn't support FK constraints into jsonb fields.
The app layer enforces consistency on save (creates the `library_items` row,
then updates the variant's `library_item_id` in the same transaction).

**Why no edit history:** per OUT-02 brief and ADR-006, drafts are transient.
Regeneration is the "undo" surface; library save snapshots the keeper state.
Edit history would add jsonb churn for a flow where users either save quickly
or regenerate.

**Cardinality:** runs typically hold 1–10 variants (default 5 for short-form,
1 for long-form, up to 10 for brainstorm). The jsonb stays small.

## inputs shape

Matches the `GenerationInputs` type in
[`02-app/lib/llm/content/types.ts`](../../02-app/lib/llm/content/types.ts):

```json
{
  "strategy": {
    "audience_segment": "uuid-of-segment",
    "offer": null,
    "customer_journey_stage": "awareness"
  },
  "topic_chain": {
    "category": "audience",
    "step1": "audience.segment",
    "step2": "uuid-of-segment",
    "step3": ["audience.segment.problems"],
    "step4": ["uuid-of-problem-1", "uuid-of-problem-2"],
    "prompt_template_resolved": "This is about an audience segment — Founders…"
  },
  "free_text_augments": ["specifically the cost objection"],
  "settings": {
    "variant_count": 5,
    "model_override": null,
    "tone_variation": null
  }
}
```

Frozen at submit. The runtime contract is in TypeScript; this jsonb stores the
raw shape for repro and audit.

## fragmentVersions shape

```json
{
  "persona_creator_v1": 3,
  "worldview_aida": 1,
  "craft_hooks_social": 5,
  "output_contract_json_array": 2
}
```

Used by the future fragment-history viewer ("show me what this fragment looked
like the last time we generated against it") and by repro tooling.

## Indexes

- `(status, expiresAt)` — covers the daily sweep query (`WHERE status IN
  (...) AND expires_at < now() AND kept = false`). The `status` filter is
  cheap; `expires_at` is the selective field.
- `(contentTypeId, createdAt DESC)` — covers "show me my recent runs of
  content type X" queries (used by the picker's "Recently used" surface and
  by debug/audit views).
- `(stageId)` — covers the stage-impact-analysis query ("which runs were
  produced by this stage version"). Cheap.
- `(parentRunId)` — for "show me regenerations of this run" + multi-step
  lineage queries. Sparse (most runs have null parent), but cheap.
- `(kept, expiresAt)` — alternative shape of the sweep query if Postgres'
  planner picks status-based first. Optional; can be added later if observed.

## Relationships

- **Parents:**
  - `contentTypeId` → `content_types` (RESTRICT)
  - `stageId` → `prompt_stages` (RESTRICT)
  - `parentRunId` → `generation_runs` (SET NULL, self)
- **Children (forward references):**
  - `library_items.generationRunId` → `generation_runs.id` (lands when that
    table ships in this batch)
  - `generation_logs.generationRunId` → `generation_runs.id` (same)
- **String-ref:** `variants[].library_item_id` references `library_items.id`
  but is not FK-enforced (jsonb limitation; app-layer transaction enforces).

## Notes

- This table is **not user-facing** as a list; users see runs as they happen
  in the picker UI and in the recently-generated section. The DB row is
  invisible to them by design.
- No `brandId`. Single-tenant V1; same forward-compat as `prompt_fragments`,
  `prompt_stages`, `content_types`, `topic_paths`.
- TTL sweep cron lives at `02-app/app/api/cron/sweep-generation-runs/route.ts`
  (future). Vercel cron config in `02-app/vercel.json`. Daily run at low
  traffic time.
- The `kept` flag is set to `true` by the app layer when a variant is saved
  (in the same transaction that creates the `library_items` row). Cleared
  back to `false` if the last referencing library item is deleted — handled
  by a trigger or app-layer cleanup; decided when `library_items` lands.
- `variants` jsonb is mutated frequently during streaming. At V1 scale this
  is fine. If/when streaming volume grows, splitting variants into a
  child table is the natural next step (and the `id` field on each variant
  pre-empts that migration).
- `assembledPrompt` is text not jsonb intentionally — it's a single rendered
  string, not structured data. Inspecting it is human-readable.
