---
status: approved
table: generation_logs
type: system (permanent analytics, not DNA)
related_features: OUT-02, OUT-02a
adr: ADR-006
last_updated: 2026-04-28
---

# Schema: generation_logs

System table. **Permanent analytics record** of every content generation run.
One row per `generation_run`. Created when a run completes (`status='complete'`
or `status='errored'`). Captures cost, tokens, latency, model, and error
classification.

This table is **never swept** — `generation_runs` is transient (30-day TTL
on unsaved drafts), `library_items` is opt-in (only saved keepers), and
`generation_logs` is the long-tail observability surface for every
generation that ever happened. Used for: "what did I spend this month",
"which content types are slow", "did fragment v3 improve the error rate vs
v2", "what's the cost per saved keeper".

The split rationale (three tables):
- `generation_runs` — operational state (in-flight, recently completed,
  variants editable). Transient.
- `generation_logs` — permanent metrics. Cheap to query, no large jsonb.
- `library_items` — opt-in saved keepers. User-curated.

Per OUT-02 brief and the conversation that produced this schema (2026-04-28):
the user explicitly wanted analytics on **all** generations, not just saved
ones, and the prior `creation_logs` precedent confirms the pattern.

## Granularity decision

**One row per `generation_run`** (not per variant). For V1 single-step types,
all variants are produced by a single model call (parallel-streamed or
batched), so per-run and per-variant collapse anyway. For V2 long-form
(blueprint → copy → synthesis = 3 model calls), the `stageId` column allows
adding one row per stage without schema change — the per-run granularity
naturally extends to per-stage as the V2 architecture lands.

## Capture mechanism

**Write-on-completion.** The app layer inserts a single row when the
generation run transitions from `generating` → `complete` or `errored`.
Failed runs still log (with `status='errored'` and `errorClass` populated).
If the app crashes between model-complete and log-insert, the log row is
lost — V1 accepts this trade-off for simplicity. V1.5 may switch to
insert-on-submit + update-on-complete if observed log loss matters.

## Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | |
| `generationRunId` | uuid | nullable, FK → `generation_runs.id` ON DELETE SET NULL | Link to the originating run. Becomes null when the run is swept by the TTL cron. Useful for the 30-day window where joining back to inputs/prompt is meaningful. |
| `contentTypeId` | uuid | not null, FK → `content_types.id` ON DELETE RESTRICT | Denormalised onto the log so analytics survive run sweeps. RESTRICT — never delete a content type with logs. |
| `stageId` | uuid | not null, FK → `prompt_stages.id` ON DELETE RESTRICT | Denormalised onto the log. V2 multi-stage extension point: long-form runs will produce multiple log rows, one per stage. |
| `modelUsed` | varchar(100) | not null | Resolved model slug (e.g. `claude-opus-4-7`, `gemini-2-5-pro`). Used for cost/perf attribution by model. |
| `status` | varchar(20) | not null | `'succeeded'` or `'errored'`. Cancelled runs (V1.5+) get `errored` with `errorClass='cancelled'`. |
| `errorClass` | varchar(50) | nullable | Rough categorisation for grouping. V1 vocabulary: `rate_limit`, `timeout`, `assembly_error`, `invalid_response`, `auth_error`, `unknown`. Free-form rather than enum so new classes don't need migrations. |
| `promptTokens` | integer | nullable | Input tokens. Null on errors before the model was called. |
| `completionTokens` | integer | nullable | Output tokens (sum across all variants). Null on errors before completion. |
| `totalTokens` | integer | nullable | `promptTokens + completionTokens`. Stored rather than computed for cheap aggregation queries. |
| `costUsd` | numeric(10, 6) | nullable | Computed at log time from `(prompt_tokens × prompt_rate + completion_tokens × completion_rate)` against the current model pricing table. Stored to 6 decimals (sub-cent precision). |
| `latencyMs` | integer | nullable | Wall-clock from `generation_runs.createdAt` to `completedAt`. Null on incomplete or pre-call errors. |
| `variantCount` | integer | not null | How many variants were requested. Carried forward even on errors so we can attribute "5-variant runs error 3% of the time vs 1-variant 0.5%". |
| `streamingMode` | varchar(20) | nullable | `'sequential'` / `'parallel'` / `'batched'`. Lets us A/B perf modes once parallel streaming lands. Null in V1 sequential default. |
| `notes` | text | nullable | Internal notes for one-off log annotations. Rare. |
| `createdAt` | timestamp with tz | not null, defaultNow | When the log row was inserted (= when the run completed/errored). |

## status vocabulary

| Value | Used for |
|---|---|
| `succeeded` | Run completed; ≥1 variant returned. |
| `errored` | Run failed at any phase. `errorClass` populated. |

V1 only writes these two. `cancelled` (when added in V1.5) is `errored` with
`errorClass='cancelled'` — keeps the analytics surface "succeeded vs not"
binary, which matches every dashboard query you'd want.

## errorClass vocabulary (V1)

| Class | Trigger |
|---|---|
| `rate_limit` | 429 from model provider. |
| `timeout` | Request exceeded `maxLatency` (config). |
| `assembly_error` | Eight-layer assembler failed (e.g. unresolved placeholder, missing fragment). |
| `invalid_response` | Model returned malformed output (e.g. failed Layer 8 contract). |
| `auth_error` | API key invalid / quota exceeded. |
| `unknown` | Anything else. Fallback. |

Free-form varchar (not pgEnum) so new classes can be added without
migration. Discipline: app layer enforces the vocabulary at write time.

## Indexes

- `(contentTypeId, createdAt DESC)` — covers "spend by content type over
  time" and "recent runs of content type X" queries. The most common
  analytics query.
- `(modelUsed, createdAt DESC)` — covers "spend by model" and "perf by
  model" queries.
- `(status, createdAt DESC)` — filtering errored runs for debugging.
  `WHERE status='errored' ORDER BY created_at DESC LIMIT 100`.
- `(createdAt DESC)` — bare time-range queries (monthly spend, daily
  volume) without other filters. Used for the dashboard summary tiles.
- `(generationRunId)` — for the 30-day-window join back to runs (sparse
  after sweeps; cheap regardless).

No index on `errorClass` — error analysis queries already filter by
`status='errored'` first, then aggregate on `errorClass` in-memory at low
cardinality.

## Relationships

- **Parents:**
  - `generationRunId` → `generation_runs` (SET NULL — survives run sweeps)
  - `contentTypeId` → `content_types` (RESTRICT — denormalised)
  - `stageId` → `prompt_stages` (RESTRICT — denormalised)
- **Children:** None.

## Notes

- This table grows monotonically. At V1 scale (Ellie, low volume) it's
  effectively unbounded but small. If/when growth matters (V3+), partition
  by month or archive to cold storage. Not a V1 concern.
- Cost is computed at log time, not at query time. If model pricing changes
  retroactively, historical `costUsd` values reflect the rate at the time
  of generation — which is correct for "what did I actually spend".
- `latencyMs` measures end-to-end wall clock, not just the model call. If
  the assembler took 200ms and the model 800ms, `latencyMs=1000`. For
  finer breakdown (assembly vs model time), add `assemblyLatencyMs` later
  — V1 doesn't need it.
- `streamingMode` is forward compat; V1 default is sequential single-call
  for short-form. Populated only when parallel/batched modes ship.
- Pricing table lives in code (`02-app/lib/llm/pricing.ts`, future). When
  a new model lands, update the pricing table — no schema change here.
- No `userId` (single-user V1). Add when multi-tenant lands; will sit
  alongside `brandId`.
