# krisp-ingest (SKL-10)

Fetch new Krisp meetings and store transcripts in `src_source_documents` with `inbox_status = 'new'`. **No extraction** — processing happens later via INP-11 (user selects sources and chooses a processing mode).

Runs in two modes:
- **Daily mode** (default): fetches meetings since the most recent `src_source_documents.document_date` for krisp transcripts, or the last 7 days if none exist
- **Backfill mode** (`backfill`): fetches up to `limit` meetings (default 10) going as far back as Krisp has data, oldest-first, skipping already-ingested meetings. Safe to re-run — dedup prevents double-writes.

Invoke as: `/krisp-ingest` or `/krisp-ingest backfill` or `/krisp-ingest backfill 20`

## What this skill does

1. Determines the fetch window (daily: since last run; backfill: oldest available, bounded by limit)
2. Calls `search_meetings` via Krisp MCP to get meetings in that window
3. Deduplicates against `src_source_documents.krisp_meeting_id`
4. For each new meeting: calls `get_multiple_documents` to fetch the full transcript
5. Resolves participants against the `contacts` table (fuzzy name match via pg_trgm; creates new contacts for unrecognised names)
6. Matches meeting title against `meeting_types.match_patterns` to auto-apply tags
7. Writes a `src_source_documents` row per meeting: title, type='transcript', extractedText=transcript, krisp_meeting_id, inbox_status='new', participant_ids, tags, document_date
8. Reports: stored N, skipped N (already ingested), errors []

## Steps

### Step 1: Determine mode and parameters

Parse the invocation arguments:
- No args → daily mode
- `backfill` → backfill mode, limit=10
- `backfill N` → backfill mode, limit=N

### Step 2: Get brand ID and last run date

Query Neon for the brand and last ingestion date:

```sql
SELECT id FROM brands WHERE slug = 'nicelyput' LIMIT 1;
```

For daily mode — get the most recent document date for krisp transcripts:
```sql
SELECT MAX(document_date) as last_date FROM src_source_documents
WHERE brand_id = $brandId AND krisp_meeting_id IS NOT NULL;
```
If null → use 7 days ago as the fetch window start.

For backfill mode — get all already-ingested Krisp meeting IDs to skip:
```sql
SELECT krisp_meeting_id FROM src_source_documents
WHERE brand_id = $brandId AND krisp_meeting_id IS NOT NULL;
```

### Step 3: Fetch meetings from Krisp MCP

**Daily mode:** call `search_meetings` with `after` = last run date, `fields` = `["name", "date", "attendees", "transcript"]`, `limit` = 50.

**Backfill mode:** call `search_meetings` with no date filter, `limit` = limit param (default 10), `offset` = count of already-ingested meetings (to paginate through history). Sort is newest-first from Krisp — for backfill we want to work through the full history, so paginate with offset = number of already-ingested meetings.

Filter out any meetings where `transcript.status` ≠ `"uploaded"` — skip meetings with no transcript.

### Step 4: Deduplicate

For each meeting returned, check its `meeting_id` against the already-ingested set from Step 2. Skip and count any already present.

If no new meetings remain after dedup → report "No new meetings to ingest" and stop.

### Step 5: Fetch transcripts

Call `get_multiple_documents` with the array of new `meeting_id`s (max 10 per call — batch if more).

Parse transcript text from the markdown document. The transcript section starts after `## Transcript` headers. Extract just the speaker lines: lines matching `**Speaker | MM:SS**\nText`.

If a document comes back null (transcript not yet available) → skip that meeting, log it.

### Step 6: Resolve contacts

For each meeting, extract participant names from the `attendees` array in `search_meetings` results.

For each participant name:
1. **Exact name match** — query contacts:
   ```sql
   SELECT id, name FROM contacts
   WHERE brand_id = $brandId AND LOWER(name) = LOWER($name)
   LIMIT 1;
   ```
2. **Fuzzy match (pg_trgm)** if no exact match:
   ```sql
   SELECT id, name, similarity(name, $name) as score
   FROM contacts
   WHERE brand_id = $brandId AND similarity(name, $name) > 0.6
   ORDER BY score DESC LIMIT 1;
   ```
   - Score ≥ 0.8 → treat as match (use existing contact ID)
   - Score 0.6–0.8 → create new contact, note the near-match candidate
   - No match → create new contact

3. **Create new contact** if needed:
   ```sql
   INSERT INTO contacts (brand_id, name, contact_type, created_at, updated_at)
   VALUES ($brandId, $name, 'other', NOW(), NOW())
   RETURNING id;
   ```

Collect the resolved `contact_id` array for `participant_ids`.

Skip "Ellie Rofe" / self — don't create a contact for the brand owner. Check by name match against `'Ellie Rofe'`.

### Step 7: Match meeting type

Query `meeting_types` for the brand:
```sql
SELECT id, name, match_patterns, tags, source_type_override
FROM meeting_types WHERE brand_id = $brandId;
```

For each meeting, check its title against all `match_patterns` (case-insensitive substring). First match wins — use its `tags`. If no match → empty tags array.

### Step 8: Store in src_source_documents

For each meeting, insert via Neon MCP:

```sql
INSERT INTO src_source_documents (
  brand_id, title, type, extracted_text, krisp_meeting_id,
  inbox_status, participant_ids, tags, document_date, created_at, updated_at
) VALUES (
  $brandId, $title, 'transcript', $transcriptText, $krispMeetingId,
  'new', $participantIds::uuid[], $tags, $documentDate, NOW(), NOW()
)
ON CONFLICT (brand_id, krisp_meeting_id) DO NOTHING;
```

The `ON CONFLICT DO NOTHING` is a final safety net against double-writes.

### Step 9: Report

Output a summary:
```
Krisp ingest complete
---------------------
Stored:    N transcripts
Skipped:   N (already ingested)
Errors:    N

New contacts created: N
  - [name list]

Transcripts added to Inbox:
  - [title] ([date]) — [participants]
  ...
```

If any errors occurred, list them with the meeting title and error message.

## Error handling

- Meeting fetch fails → log, skip that meeting, continue
- Transcript null → skip, log
- Contact insert fails → log, use null for that participant, continue
- `src_source_documents` insert fails due to conflict → skip silently (already ingested)
- Any unrecoverable error → stop, report what was stored before the failure

Never leave partial rows. Either write a complete row or nothing.

## Context notes

- Brand: NicelyPut (`slug = 'nicelyput'`, UUID in Neon)
- Neon project ID: `damp-boat-57321258`
- Krisp MCP: available via `mcp__krisp__search_meetings` and `mcp__krisp__get_multiple_documents`
- Neon MCP: available via `mcp__Neon__run_sql` and `mcp__Neon__run_sql_transaction`
- Self (skip as contact): `Ellie Rofe`
