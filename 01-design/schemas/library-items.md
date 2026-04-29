---
status: approved
table: library_items
type: system (saved-content registry)
related_features: OUT-02, OUT-02a (supersedes REG-01)
adr: ADR-006
last_updated: 2026-04-28
---

# Schema: library_items

System table. The **opt-in registry of saved content variants**. A row exists
only when the user explicitly hits Save on a variant in the generation page.
Replaces the previously planned REG-01 (content registry) — same purpose,
folded into OUT-02 because the architecture made the separation redundant.

This is the **saved keepers** surface. The other two related tables:

- `generation_runs` — transient operational state for in-flight + recently
  completed runs (30-day TTL on unsaved drafts).
- `generation_logs` — permanent analytics record (cost, tokens, latency)
  for every run.
- `library_items` — **this table** — explicit promotions only.

When the user clicks Save on a `generation_runs.variants[]` element, the app
layer:
1. Inserts a new `library_items` row with a snapshot of the variant text +
   tags pre-filled from the run's context.
2. Updates `generation_runs.variants[].status = 'saved'` and
   `library_item_id` for that variant element.
3. Sets `generation_runs.kept = true` so the run is no longer sweep-eligible.

## Lifecycle

1. **Save:** Row inserted. `text` is a markdown snapshot. `tags` pre-filled
   from generation context (see **Tag pre-fill** below). `publishStatus`
   defaults to `'draft'`.
2. **Edit:** User edits in the library UI. `text` mutates in place. No
   version history (per architecture doc — saved is the snapshot, edits
   overwrite). User can also edit tags freely.
3. **Publish (manual):** User flips `publishStatus` to `'published'` and
   sets `publishDate` + `publishedUrl` + `platform` (or future calendar /
   integration sets these automatically).
4. **Delete:** User removes the item. App layer recounts referencing
   library items per `generationRunId`; if zero remain, flips
   `generation_runs.kept` back to `false` so the parent run becomes
   sweep-eligible again. (Decision per 2026-04-28 conversation: app-layer
   maintained, no Postgres trigger.)

## Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | |
| `generationRunId` | uuid | nullable, FK → `generation_runs.id` ON DELETE SET NULL | The run that produced this variant. SET NULL when the run is eventually swept (after `kept = false` flip). The library item survives. |
| `variantId` | varchar(50) | nullable | The `id` of the variant within `generation_runs.variants` jsonb at save time. Lets us trace "this library item came from variant X of run Y". Nullable because runs are sweepable. |
| `contentTypeId` | uuid | not null, FK → `content_types.id` ON DELETE RESTRICT | Denormalised onto the library item so listings + filters survive run sweeps. RESTRICT — never delete a content type with library items. |
| `text` | text | not null | Markdown snapshot of the variant at save time. Edits to this row mutate in place; no version history. |
| `structuredContent` | jsonb | nullable | V2 long-form structured content (e.g. `[{section, copy, blueprint_ref}]`). Null in V1 short-form. Lets per-section editing land without a migration. |
| `tags` | jsonb | not null, default `[]` | Array of typed tag objects. See **Tag shape** below. Pre-filled at save time from generation context; freely edited thereafter. |
| `publishStatus` | varchar(20) | not null, default `'draft'` | `'draft'`, `'scheduled'`, `'published'`, `'archived'`. |
| `publishDate` | timestamp with tz | nullable | When the content was/will be published. Drives future calendar views. Null while draft. |
| `publishedUrl` | text | nullable | The live URL once published. |
| `platform` | varchar(50) | nullable | Channel key (channel-taxonomy.md): `linkedin`, `instagram`, `podcast`, `blog`, `newsletter`, etc. Falls back to `content_types.platform_type` on read; explicit when overridden (e.g. cross-posted to a different channel than the type's default). |
| `notes` | text | nullable | Internal notes — performance observations, related items, history. |
| `createdAt` | timestamp with tz | not null, defaultNow | Save time. |
| `updatedAt` | timestamp with tz | not null, defaultNow | Bumps on edits. |

## Tag shape

`tags` is a jsonb array of structured tag objects. Each tag carries a
`kind` discriminator, an identifier (where applicable), and a denormalised
`label` for display.

```ts
type Tag =
  | { kind: 'audience_segment'; id: string; label: string }
  | { kind: 'offer'; id: string; label: string }
  | { kind: 'knowledge_asset'; id: string; label: string }
  | { kind: 'topic_path'; id: string; label: string }      // path string from topic_paths
  | { kind: 'topic_item'; id: string; label: string; entity_kind: string }  // step-4 record uuid
  | { kind: 'source_document'; id: string; label: string }
  | { kind: 'statistic'; id: string; label: string }
  | { kind: 'free_text'; value: string }
```

**`label` is denormalised** — captured at tag-creation time so a renamed
audience segment doesn't break the library view. A V1.5 refresh job can
re-sync labels against the underlying entities.

**`id` semantics by kind:**
- `audience_segment` / `offer` / `knowledge_asset` / `source_document` /
  `statistic` — uuid of the DNA / source row.
- `topic_path` — the dotted path string from `topic_paths.path`.
- `topic_item` — uuid of the underlying record selected at step 4 (a VOC
  problem, an entity outcome, a testimonial, etc.). `entity_kind` carries
  the source table name so the UI can render correctly.
- `free_text` — no id; the `value` field carries the user's string.

## Tag pre-fill (at save time)

The save handler walks the parent `generation_runs.inputs` and builds the
initial tags array:

| Source | Tag kind | When created |
|---|---|---|
| `inputs.strategy.audience_segment` | `audience_segment` | If non-null. Label = segment name. |
| `inputs.strategy.offer` | `offer` | If non-null. Label = offer name. |
| `inputs.strategy.knowledge_asset` | `knowledge_asset` | If non-null. Label = asset name. |
| `inputs.topic_chain.category` + leaf path | `topic_path` | One tag per traversed leaf. Label = leaf row's `label`. |
| `inputs.topic_chain.step4[]` | `topic_item` | One tag per selected item. Label resolved from the item's source row. |

Source documents, statistics, and stories are not pre-filled in V1 (the
generation flow doesn't put them in `inputs` directly — they reach the
prompt via the topic engine's `topic_item` tag). User can add them
post-save.

User-added tags use the same shape with `kind = 'free_text'` for arbitrary
strings.

## publishStatus vocabulary

| Value | Meaning |
|---|---|
| `draft` | Default. Saved but not yet published. |
| `scheduled` | `publishDate` is in the future and the user has committed to publishing then. UI shows it on a calendar (V1.5+). |
| `published` | Live. `publishDate` + `publishedUrl` populated. |
| `archived` | Removed from active library views but retained for history. |

`varchar(20)` not pgEnum so adding new states (e.g. `failed_publish`,
`unpublished`) is migration-free.

## Indexes

- `(contentTypeId, createdAt DESC)` — covers "show me all my saved
  LinkedIn posts" listings and recency queries.
- `(publishStatus, publishDate)` — covers calendar views ("what's
  scheduled this week") and published-content reports.
- `(platform, publishStatus, publishDate DESC)` — covers
  per-channel published feed views.
- `(generationRunId)` — for the reverse query "what library items came
  from this run" (used by the `kept` flip on delete).
- `(createdAt DESC)` — bare time-range library listing.
- **GIN on `tags`** — covers tag-filter queries
  (`WHERE tags @> '[{"kind":"audience_segment","id":"<uuid>"}]'`). The
  primary library-search surface.

## Relationships

- **Parents:**
  - `generationRunId` → `generation_runs` (SET NULL — survives run sweeps)
  - `contentTypeId` → `content_types` (RESTRICT — denormalised)
- **Children:** None at this layer. Future REG-02 (content registry UI)
  reads from this table.
- **Soft refs:**
  - `tags[].id` references uuids in `dna_audience_segments`,
    `dna_offers`, `dna_knowledge_assets`, `src_source_documents`,
    `src_statistics`, etc. Not FK-enforced (jsonb limitation; app-layer
    builds tags consistently).
  - `tags[].id` for `topic_path` kind references `topic_paths.path` (string).

## Notes

- This table **supersedes the previously planned REG-01**. Per the
  2026-04-28 conversation, REG-01 was a placeholder for "the saved-content
  table" before OUT-02 gave it a proper home. The brief and architecture
  doc both signalled the fold-in. Backlog updates: REG-01 marked
  superseded by OUT-02; REG-02's dependency switches from REG-01 to
  OUT-02.
- **Markdown is the canonical text format**, even for short-form. The UI
  renders to formatted HTML for display + copy-to-clipboard, but the
  source-of-truth is markdown text.
- **No version history on edits.** Mutating `text` overwrites; users
  re-generate (creating a new run + library item) if they want a fresh
  draft. V1.5+ may add a `library_item_versions` audit table.
- **`kept` reverse-flip on delete is app-layer** (per 2026-04-28
  decision). The delete handler runs:
  ```
  DELETE FROM library_items WHERE id = $1 RETURNING generation_run_id;
  -- If returned generation_run_id is non-null:
  UPDATE generation_runs SET kept = false
   WHERE id = $1
     AND NOT EXISTS (SELECT 1 FROM library_items WHERE generation_run_id = $1);
  ```
  Same transaction. No trigger.
- No `brandId`. Single-tenant V1; same forward-compat as the rest of
  Phase 1.
- `publishedUrl` is `text` (not `varchar(2048)`) because URLs can be long
  and we never query against them — text is fine.
- Future calendar view (V1.5+) reads `(publishStatus, publishDate)` for
  scheduled / published items. Posting-software integration (also future)
  populates `publishedUrl` and flips `publishStatus` automatically.
- Tag-search UX (filter by audience / offer / topic / etc.) drives the
  GIN index on `tags`. JSONB containment (`@>`) is the canonical pattern.
- The `variantId` reference is a string (varchar) not a UUID column
  because variant ids inside `generation_runs.variants[]` jsonb are
  client-generated uuid v4 strings, not Postgres uuid type. Storing
  varchar avoids a cast on the rare debug query that joins back.
