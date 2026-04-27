# Session log — 2026-04-16/17 — Queue UX, dedup, graph embeddings, processing model redesign

Session ID: 2026-04-16-queue-ux-dedup-processing-model-h7r

## What we worked on
- INP-07: Queue review UX improvements (expanded display, inline editing, topic clustering, list density)
- INP-10: Dedup detection (graph node embeddings, similarity search, canonical matching, UI indicators)
- INP-03: Extraction prompt quality overhaul
- INP-11: Multi-modal processing (new feature — brief written and approved)

## What was done

### Queue review UX — Phase 1 (INP-07 improvements)

**Expanded item display** — `02-app/app/(dashboard)/inputs/process/category-section.tsx`
- Complete rewrite. Type-specific structured rendering replacing generic truncated text.
- Person: name (bold) + role at org + context. Concept/Technique: name (bold) + description. Story: title + narrative + hook/lesson. Ideas: full text with line-clamp-3 and click-to-expand.
- Source quotes shown in full, not truncated at 120 chars.
- Type guards (`isIdea`, `isPerson`, `isStory`, etc.) added for type-safe rendering.

**Inline editing** — same file + `02-app/app/(dashboard)/inputs/process/results-panel.tsx`
- Pencil icon per item opens type-specific edit form (inputs/textareas matching the extraction fields).
- `ResultsPanel` now holds `editedExtraction` in `useState`, initialised from `result.extraction`.
- Edits are client-side only — on commit, the edited JSON is sent to the existing `/api/process/commit` endpoint. No new server endpoints needed.
- All user-visible fields editable.

**Topic clustering** — `02-app/lib/processing/cluster.ts` (new) + `02-app/app/api/inputs/cluster/route.ts` (new)
- Fast Haiku LLM call groups extracted items by overarching topic.
- `TopicCluster` type: `{ topic: string, items: Array<{ id, category }> }`.
- Added `topicClusters` optional field to `ExtractionResult` type in `lib/types/processing.ts`.
- ResultsPanel restructured with topic-grouped view (default) and type-grouped view (toggle).
- `TopicSection` component wraps category sections within each topic, with per-cluster select-all/deselect-all.
- On-the-fly clustering via `/api/inputs/cluster` for existing pending items that don't have stored clusters. Cached in React state.

**Queue list density** — `02-app/app/(dashboard)/inputs/queue/queue-client.tsx`
- Per-category breakdown: "3 ideas · 2 people · 1 concept" replaces generic "8 items".
- Key entity names shown inline: "People: Dimitris, Sarah, James".
- Topic names shown when available: "Topics: AI-assisted dev, Electoral strategy".

### Graph node embeddings — Phase 2

**Schema** — `02-app/lib/db/schema/graph.ts`
- Added `embedding vector(1536)` column and HNSW index to `graphNodes` table.
- Migration 0010 generated and applied to Neon (`damp-boat-57321258`).

**Embed at commit time** — `02-app/lib/processing/commit.ts`
- Every confirmed graph node gets an embedding generated and stored after write.
- Embedding text composed per type: Ideas use full text, Concepts/Techniques use `name: description`, People use `name, role at org. context`, Organisations use `name. context`.
- `nodeEmbeddingTexts` Map tracks embedding text alongside node creation for clean lookup.
- SourceDocument graph nodes also embedded (title + first 2000 chars of text).

**Backfill** — `02-app/app/api/admin/backfill-embeddings/route.ts` (new)
- `POST /api/admin/backfill-embeddings` — selects all graph_nodes where embedding IS NULL and label NOT IN ('Date', 'Country').
- Composes embedding text using same rules as commit-time, generates and updates in batches of 5.
- **Not yet run** — needs to be triggered to embed existing nodes.

**Similarity search** — `02-app/lib/retrieval/similarity.ts`
- Added `'graph_nodes'` to `EmbeddableTable` type and `TABLE_MAP`.
- New `findSimilarNodes(embedding, options)` function with label filtering and ID exclusion.
- Returns `GraphSimilarityResult` with `nodeLabel` field in addition to standard similarity fields.

### Dedup detection — Phase 3 (INP-10)

**Dedup API** — `02-app/app/api/inputs/dedup/route.ts` (new)
- `POST /api/inputs/dedup` accepts items with id/text/label/category.
- Generates embeddings on-the-fly, searches graph nodes via `findSimilarNodes()` with threshold 0.75.
- Also checks canonical register for People/Orgs via `findCanonicalName()`.
- Returns `{ matches, canonicalMatches }`.

**Canonical name lookup** — `02-app/lib/graph/canonical.ts`
- Added `findCanonicalName(entityType, name)` — slug-based lookup returning the canonical name if registered.

**UI indicators** — `02-app/app/(dashboard)/inputs/process/category-section.tsx`
- `CategorySection` accepts `dedupMatches` and `canonicalMatches` props.
- Per-item badges: amber "Similar to: [name] (87%)" for >0.85, yellow "May overlap: [name] (76%)" for 0.75–0.85.
- "Known as: [canonical name]" for Person/Org canonical matches.
- Queue client fetches dedup data when an item is selected, cached in React state.

### Extraction prompt overhaul — INP-03

**File:** `02-app/lib/llm/system-prompts.ts` → `processing`
- Added quality bar: "Would this be useful in 6 months if I'd forgotten the original conversation?"
- Ideas rewritten: must include the insight, why it matters, and enough context. 2-4 sentences, not headlines. Skip generic observations and truisms.
- Techniques tightened: description must explain what/how/when. Skip passing mentions.
- Content angles tightened: must include the angle, not just a topic.
- People/Orgs: skip incidental mentions.
- Volume guidance: "A typical 30-minute conversation should yield 3-8 ideas, 0-3 concepts, 0-2 techniques."
- "Extract liberally" replaced with "extract selectively."

### INP-11: Multi-modal processing — brief written and approved

**Brief:** `01-design/briefs/INP-11-multi-modal-processing.md`

Fundamental redesign of the input processing model:
- **Core shift:** Input → store → user selects + chooses processing mode → process → review → commit. User decides when and how to process, not the system.
- **Three spaces:** Inbox (cue — filtered view of Sources with sidebar badge), Sources (permanent library), Results (review queue).
- **Four processing modes:** Individual extraction (current INP-03), Batch analysis (cross-cutting patterns across a corpus), Reflective analysis (longitudinal — what changed over time), Project synthesis (distil a body of work).
- **Modes 2-4 produce intermediate analysis documents** reviewed and selectively ingested.
- **Sources are permanent** — processing doesn't consume them. A transcript can be processed multiple times with different prompts.
- **Krisp auto-scrape stops at storage** — no auto-extraction.
- **Data model:** New `processing_runs` table (replaces `pending_inputs` for new runs). `src_source_documents` gets `inbox_status` and `processing_history` fields.
- **All four prompts drafted** with structured output schemas (batch: themes/convergences/divergences/insights/gaps; reflective: commitments/blockers/themes/shifts/energy/realisations; synthesis: methodology/what worked/what didn't/patterns/case study/content angles/open threads).
- Ellie reviewed and refined all prompts before approval.

## Decisions made

- **Extraction quality over quantity** — the extraction prompt was producing thin, headline-level ideas. Rewrote to produce fewer, more substantive items. "5 great ideas and one methodology" over "20 meh things." This is the single highest-leverage change for graph quality.
- **Topic clustering as default view** — ResultsPanel defaults to topic-grouped view when clusters are available, with toggle to type-grouped. One-click cluster deselect enables skipping off-topic sections.
- **Client-side editing, no new endpoints** — the commit API already trusts whatever JSON it receives. Editing modifies the extraction JSON in React state and sends the edited version on commit. Zero server changes.
- **Graph node embeddings on `graph_nodes` table** — added embedding column directly (not separate table). Same pattern as all other embeddable tables. HNSW index for fast ANN search.
- **`processing_runs` as new table** — not evolving `pending_inputs`. Cleaner separation for multi-source processing runs. `pending_inputs` retained as legacy for existing queued items.
- **Inbox = filtered view of Sources** — not a separate page. `inbox_status = 'new'` filter with sidebar badge. Same UI, less to build.
- **Processing model redesign (INP-11)** — the fundamental epistemological shift: different kinds of knowledge form in different ways. Auto-extraction with one prompt doesn't match reality. User-triggered, mode-selected processing does. Captured fully in the INP-11 brief.

## What came up that wasn't planned

- **Extraction quality was the root cause of queue paralysis** — Ellie wasn't processing her queue because the extracted items felt like "headlines, not anything substantive." This led to the prompt overhaul and then to the broader question of processing modes.
- **The epistemological question** — "what are the different ways knowledge forms?" surfaced as the real design challenge. Accountability calls ≠ strategy conversations ≠ project retrospectives. This drove the INP-11 brief.
- **Dedup is less urgent than processing model** — with selective extraction and user-controlled processing, the volume of near-duplicates drops significantly. Dedup is still useful but no longer the critical blocker.

## Backlog status changes

| Feature | Old status | New status |
|---|---|---|
| INP-10 | planned | partially implemented (graph embeddings + dedup API + UI indicators built; full scope includes cross-pending dedup, not yet done) |
| INP-11 | (new) | in-progress (brief approved) |

## What's next

### Immediate
- **Run the backfill** — `POST /api/admin/backfill-embeddings` to embed existing graph nodes. Dedup won't work until this is done.
- **Process the remaining queued transcripts** — use the improved review UI to work through the 10 pending items.
- **Test the new extraction prompt** — run a new Krisp ingest to see the quality difference.

### INP-11 build (next major work)
- Sources library UI (the foundation — browsable `src_source_documents` with inbox filter and badge)
- `processing_runs` table + migration
- `src_source_documents` changes (`inbox_status`, `processing_history`, create at ingestion time)
- Modify Krisp ingest to stop at storage (no auto-extraction)
- Processing mode selection UI (select sources → choose mode → trigger)
- Batch/reflective/synthesis processing endpoints
- Analysis results review UI (different from extraction review — structured document with selectable insights)

### Other ready items (from prior sessions, still valid)
- IDEA-01 implementation (ideas table + server action)
- ORG-01 (organisations table)
- `src_statistics` extension migration

## Context for future sessions

- **Pre-existing build error** — `lib/llm/embeddings.ts:10` type error (Google SDK signature). Not introduced by this session, not blocking dev server.
- **Backfill not yet run** — graph node embeddings exist in schema but most existing nodes don't have embeddings yet. Dedup badges won't appear until backfill completes.
- **Existing pending items have old-format extraction** — the 10 queued Krisp transcripts were extracted with the old "extract liberally" prompt. Re-extraction would improve quality but isn't blocking — they can be processed as-is with the improved review UI, or re-extracted later.
- **`pending_inputs` is legacy after INP-11** — new processing runs will use `processing_runs` table. Existing pending items stay in `pending_inputs` until processed or cleared. Don't add new features to `pending_inputs`.
- **Topic clusters generated on-the-fly** — existing pending items don't have stored clusters. The queue client fetches them via `/api/inputs/cluster` when an item is selected. New ingestions should store clusters in the JSON (but this isn't implemented yet — it'll be part of INP-11 where ingestion is reworked).
- **Four processing prompts are in the brief, not in code** — `lib/llm/system-prompts.ts` only has the extraction prompt (Mode 1). Modes 2-4 prompts are defined in the INP-11 brief and need to be added to the system prompts file when building those modes.
