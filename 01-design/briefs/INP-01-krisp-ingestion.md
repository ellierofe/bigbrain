# Krisp Transcript Ingestion Brief
Feature ID: INP-01
Status: approved
Last updated: 2026-04-18

## Summary
Automated ingestion of Krisp meeting transcripts via the Krisp MCP API. Fetches new meetings (deduped against already-ingested IDs), resolves participants against the `contacts` table, auto-tags via `meeting_types`, and stores transcripts in `src_source_documents` with `inbox_status = 'new'`. **No auto-extraction** — processing is user-triggered via INP-11's multi-modal processing system.

This feature establishes the contacts table (`contacts`) for speaker identity resolution, used here for Krisp participant dedup against the canonical graph register and reusable across client work, interviewees, and other people-centric features.

## Scope note
INP-01 covers storage only: MCP fetch, contacts resolution, meeting type matching, and writing to `src_source_documents`. Processing happens later via INP-11 (user selects sources → chooses processing mode). INP-01 is complete when Krisp transcripts are landing in Sources with `inbox_status = 'new'`.

## Relationship to INP-11
INP-11 (multi-modal processing) supersedes the original auto-extract model. Under the new model:
- Krisp scrape stops at storage — transcripts land in `src_source_documents`, not `pending_inputs`
- No `extractFromText()` call during ingestion
- User decides when and how to process via the Inbox/Sources UI
- `pending_inputs` table is legacy — new runs use `processing_runs`

## Use cases
- Daily or on-demand runs: fetches meetings from Krisp added since last run, stores transcripts in Sources — Ellie processes at her own pace via INP-11
- First run: fetches recent meetings up to a configurable lookback window (e.g. last 30 days)
- Re-run after failure: idempotent — `krisp_meeting_id` dedup means already-ingested meetings are skipped

## User journey

### Automated (ingestion — no user action required)
1. `/krisp-ingest` skill runs (daily or on-demand)
2. Calls `search_meetings` via Krisp MCP to get meetings since last ingestion date
3. For each meeting returned:
   a. Check `src_source_documents.krisp_meeting_id` — skip if already ingested
   b. Call `get_multiple_documents` to fetch full transcript
   c. Parse transcript text + extract metadata (date, title, participants)
   d. Resolve participants against `contacts` table (fuzzy name match)
   e. Match meeting title against `meeting_types` for auto-tagging
   f. Write row to `src_source_documents`: title, type='transcript', extractedText=transcript, krisp_meeting_id, inbox_status='new', participant_ids, tags, document_date
4. Ingestion complete — transcripts appear in Inbox (Sources filtered by `inbox_status = 'new'`)

### User-facing (INP-11, separate feature)
5. Ellie opens Sources, sees Inbox badge with new transcript count
6. Selects transcripts → chooses processing mode (individual extraction, batch analysis, etc.)
7. Processing runs → results land in Results queue for review and commit

## Data model / fields

### New table: `contacts`
People encountered across inputs, client work, meetings, etc. Provides canonical identity resolution for the knowledge graph. Covers Krisp participants, client contacts, interviewees, podcast guests, etc.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | uuid PK | yes | |
| `brand_id` | uuid FK → brands | yes | scoped per brand |
| `name` | text | yes | display name |
| `email` | text | no | primary dedup key when available |
| `organisation` | text | no | company/affiliation |
| `role` | text | no | job title or role |
| `graph_node_id` | uuid | no | FK to `graph_nodes.id` — set when Person node created |
| `krisp_participant_id` | text | no | Krisp's internal participant identifier if returned by MCP |
| `contact_type` | text | no | broad category: `'client'` \| `'peer'` \| `'prospect'` \| `'podcast-guest'` \| `'interviewee'` \| `'other'` |
| `tags` | text[] | no | free-form tags for finer classification — e.g. `['mastermind']`, `['chairman']`, `['warm-lead']` |
| `notes` | text | no | free-form context |
| `created_at` | timestamptz | yes | default now() |
| `updated_at` | timestamptz | yes | default now() |

Unique constraint: `(brand_id, email)` where email is not null. Name-only dedup is fuzzy — flag for review rather than auto-merge.

### New table: `meeting_types`
Configurable recurring call types that auto-tag meetings on ingestion. Enables "daily accountability", "weekly mastermind" etc. to be recognised and tagged without manual effort.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | uuid PK | yes | |
| `brand_id` | uuid FK → brands | yes | |
| `name` | text | yes | e.g. "Daily accountability", "State Change Mastermind" |
| `match_patterns` | text[] | yes | strings to match against meeting title (case-insensitive substring) |
| `tags` | text[] | yes | tags to apply to `pending_inputs` when matched |
| `source_type_override` | text | no | override the default `sourceType` passed to `extractFromText()` |
| `created_at` | timestamptz | yes | default now() |

On ingestion, each meeting title is checked against all `meeting_types.match_patterns` for the brand. First match wins — its `tags` are added to the `pending_inputs` row and passed through to `InputMetadata.tags`. Client project tagging (e.g. `client:acme`) remains manual via the queue UI (INP-07).

Management UI for `meeting_types` is out of scope for INP-01 — seed via migration or direct DB insert initially. Build the UI as part of INP-07 or a settings screen.

### New table: `pending_inputs`
Stores extracted-but-not-yet-committed inputs awaiting user review.

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | uuid PK | yes | |
| `brand_id` | uuid FK → brands | yes | |
| `source_type` | text | yes | `'krisp-meeting'` for now; extensible for future input types |
| `title` | text | yes | meeting title from Krisp |
| `input_date` | date | no | meeting date from Krisp metadata |
| `krisp_meeting_id` | text | no | 32-char hex ID from Krisp MCP; unique per brand |
| `raw_text` | text | no | full transcript text as fetched |
| `extraction_result` | jsonb | yes | full `ExtractionResult` from `extractFromText()` |
| `participant_ids` | uuid[] | no | array of `contacts.id` for meeting participants |
| `tags` | text[] | no | auto-applied from `meeting_types` match + any manual tags added at review |
| `status` | text | yes | `'pending'` \| `'committed'` \| `'skipped'` |
| `committed_at` | timestamptz | no | set when user commits via INP-07 |
| `source_document_id` | uuid | no | FK to `src_source_documents.id` — set on commit |
| `created_at` | timestamptz | yes | default now() |

Unique constraint: `(brand_id, krisp_meeting_id)` — prevents duplicate ingestion.

### Modified table: `src_source_documents`
Add one column:

| Field | Type | Required | Notes |
|---|---|---|---|
| `krisp_meeting_id` | text | no | 32-char hex Krisp meeting ID; set when committed from INP-01 queue |

Unique constraint: `(brand_id, krisp_meeting_id)` where not null.

### New API route: `/api/cron/krisp-ingest`
- Method: GET (Vercel cron convention)
- Auth: Vercel cron secret header (`CRON_SECRET` env var)
- Calls Krisp MCP via OAuth bearer token (`KRISP_ACCESS_TOKEN` env var — set after OAuth flow)
- Returns: `{ processed: N, skipped: N, errors: string[] }`

### Vercel cron config (`vercel.json`)
```json
{
  "crons": [{
    "path": "/api/cron/krisp-ingest",
    "schedule": "0 6 * * *"
  }]
}
```

## Krisp MCP integration

### Connection
- Transport: Streamable HTTP → `https://mcp.krisp.ai/mcp`
- Auth: OAuth 2.0 with PKCE — one-time setup, token stored in env
- Tools used: `search_meetings` (get new meetings since last run), `get_document` (fetch full transcript by ID)

### Fetch strategy
- On each cron run: call `search_meetings` with a date filter for meetings since last ingestion
- Last ingestion date tracked via: most recent `pending_inputs.created_at` for this brand, or fallback to `KRISP_LOOKBACK_DAYS` env var (default 30) on first run
- `get_document` called per meeting to retrieve full transcript content
- **TBD:** exact response shape of `search_meetings` (fields, date format, participant structure) — resolve by inspecting a live response on first integration test

### Participant resolution
Resolution runs at ingestion time (not commit time) to populate `pending_inputs.participant_ids`. Final confirmation of fuzzy matches is surfaced at commit time in INP-07.

For each participant extracted from meeting metadata:

1. **Email lookup (definitive):** if email present, query `contacts` by `(brand_id, email)`. If found → use existing contact, update name/role/org if new info. If not found → proceed to step 2.
2. **Fuzzy name search:** use Postgres `pg_trgm` trigram similarity against `contacts.name` for this brand. If similarity ≥ 0.8 → flag as `possible_duplicate` in `pending_inputs` metadata (store candidate contact ID + score). If < 0.8 → treat as new.
3. **New contact:** create `contacts` row with name + email (if available). `graph_node_id` left null until commit.
4. Store resolved/new `contacts.id` array in `pending_inputs.participant_ids`.

**At commit time (INP-07):** any `possible_duplicate` flags are surfaced to the user — *"Stephen Balogh (no email) already exists — same person?"* Confirm → merge (copy `graph_node_id` to new contact, update email, delete duplicate). Reject → keep as separate contact.

**Requires:** `pg_trgm` extension enabled in Neon (add to migration if not already present).

## Update behaviour
- `pending_inputs` rows: status transitions only (`pending` → `committed` or `skipped`). Content (extraction result) is immutable after creation.
- `contacts` rows: freely editable. Properties update if new information arrives from a later meeting (e.g. role changes).
- `src_source_documents` rows: immutable after creation (existing behaviour).

## Relationships
### Knowledge graph (FalkorDB)
- No graph writes happen during INP-01 — all graph writes happen at commit time via `commitExtraction()` in INP-07
- Participant Person nodes created at commit time if `contacts.graph_node_id` is null

### Postgres
- `pending_inputs.brand_id` → `brands.id`
- `pending_inputs.source_document_id` → `src_source_documents.id` (set on commit)
- `contacts.brand_id` → `brands.id`
- `contacts.graph_node_id` → `graph_nodes.id` (nullable, set on first commit)
- `src_source_documents.krisp_meeting_id` — unique per brand, links back to Krisp

## Edge cases
- **Krisp MCP unavailable:** cron catches error, logs, returns without writing. Retried next day. No partial writes.
- **Extraction fails for one meeting:** log error, skip that meeting (don't write to `pending_inputs`), continue with remaining. Return error count in cron response.
- **Duplicate meeting (re-run):** `(brand_id, krisp_meeting_id)` unique constraint on `pending_inputs` prevents double-write. Skip silently.
- **Meeting already committed:** `(brand_id, krisp_meeting_id)` on `src_source_documents` also checked — skip if found there too.
- **No new meetings:** cron completes with `{ processed: 0, skipped: 0, errors: [] }`. Not an error.
- **Token expired:** Krisp OAuth token expiry — cron fails with auth error, logged. Resolution: manual re-auth via OAuth flow, update `KRISP_ACCESS_TOKEN`. Future: token refresh automation.
- **Very long transcript (>28k chars):** handled by existing INP-03 chunking in `extractFromText()`.
- **Participant name-only (no email):** create contact with `email` null. Run fuzzy name search — if possible duplicate found, flag in `pending_inputs` for user confirmation at commit time (INP-07). No auto-merge on name alone.
- **Fuzzy match conflict (multiple candidates):** if trigram search returns multiple contacts above threshold, flag all candidates — user picks the right one at commit time.
- **First run / empty queue:** use `KRISP_LOOKBACK_DAYS` (default 30) to seed initial batch.

## Out of scope (v1)
- Queue review UI — that's INP-07
- Manual zip upload — superseded by MCP approach
- Token refresh automation — manual re-auth for now
- Contacts management UI — contacts created and used, not yet browsable (add to dashboard backlog as DASH-* feature; should support editing name, email, org, role, tags, contact_type, and merging duplicates)
- `meeting_types` management UI — seed via migration initially; build UI as part of INP-07 or settings
- Re-processing an already-committed meeting
- Filtering by meeting type before extraction (INP-08 territory)
- Vercel Blob storage of raw transcript files — skip for now, `raw_text` in Postgres is sufficient
- Action items from Krisp (`list_action_items`) — separate concern, not knowledge extraction

## Open questions / TBDs
- **Krisp `search_meetings` response shape** — exact field names, date format, participant structure not confirmed. Resolve by running a live test call before build. Particularly: does it return participant emails or just names?
- **OAuth token management** — how is `KRISP_ACCESS_TOKEN` initially obtained and stored? One-time manual OAuth flow → copy token to Vercel env vars. Document the setup steps.
- **Brand ID in cron** — single-user/single-brand for now: hardcode `DEFAULT_BRAND_ID` env var in cron route, generalise later.

## Decisions log
- 2026-04-08: Briefed. MCP cron approach (not file upload). Daily at 06:00. Auto-extract on fetch, store full ExtractionResult in `pending_inputs`. User reviews via INP-07 queue (separate feature). `contacts` table created here — reusable across client work, interviewees, etc. `contact_type` + `tags` fields on contacts for classification (client, peer, podcast-guest etc.). `meeting_types` table for recurring call pattern matching (daily accountability, weekly mastermind etc.) — management UI deferred. Contact dedup: email-first (definitive), then pg_trgm fuzzy name search; possible duplicates flagged for user confirmation at INP-07 commit time. Vercel Blob storage deferred — raw text in Postgres sufficient for now. `krisp_meeting_id` on `src_source_documents` for dedup. Single brand via env var for now. Contacts editing UI deferred to a future DASH-* feature.
- 2026-04-18: Updated for INP-11. Auto-extraction removed — ingestion now stops at storage. Transcripts write to `src_source_documents` (not `pending_inputs`) with `inbox_status = 'new'`. Processing is user-triggered via INP-11's multi-modal system. `pending_inputs` queue cleared (9 items, all processed with wrong prompt). Schema migration 0011 applied: added `inbox_status`, `processing_history`, `participant_ids` to `src_source_documents`; created `processing_runs` table.
