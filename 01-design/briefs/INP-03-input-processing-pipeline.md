# Input Processing Pipeline Brief
Feature ID: INP-03
Status: complete
Last updated: 2026-04-02

## Summary
The core engine that turns raw text into linked knowledge. Takes plain text input (transcripts, notes, session write-ups), runs an LLM extraction pass to identify Ideas, Concepts, People, Organisations, Stories, Techniques/Methodologies, and Content Angles, then presents the results in a side panel for review before committing anything to storage. On confirmation, writes nodes to FalkorDB + Neon mirror, stores structured items in Postgres source tables, and generates embeddings. Nothing is saved until the user confirms — data quality over convenience.

This build scopes to plain text only. PDF, audio, and other formats are handled by INP-01/INP-05 which call this pipeline after extracting text.

## Use cases
- Ellie uploads or pastes a Krisp transcript → pipeline extracts all knowledge → she reviews in side panel → confirms → everything lands in the right place
- Ellie processes a mastermind session write-up → ideas and techniques surface → she confirms → they're in the graph and searchable
- INP-01 (Krisp ingestion) calls `extractFromText()` after storing the raw file, passes the text for processing
- Future: INP-05 (research docs) passes extracted text through the same pipeline
- Future: INP-07 (input queue) triggers processing on queued items

## User journey

### Extract phase (nothing written yet)
1. User provides text input — paste into a textarea, or triggered programmatically from INP-01
2. System calls `extractFromText(text, metadata)` — LLM extraction pass, returns `ExtractionResult`
3. Side panel opens showing clustered results: Ideas, Concepts, People & Organisations, Stories, Techniques, Content Angles
4. Each extracted item shown with: its text/name, type label, confidence indicator (high/medium/low based on LLM), a checkbox (checked by default)
5. User can: uncheck items to exclude, scan headings/clusters to get the shape of what was found
6. User clicks "Save to BigBrain" — confirms the checked items

### Commit phase (writes happen)
7. System calls `commitExtraction(result, confirmedIds)` with the approved item IDs
8. For each confirmed item:
   - Graph nodes written via `writeNode()` (FalkorDB + Neon mirror)
   - Structured items (Stories, Statistics) written to relevant `src_*` table
   - `SourceDocument` row created/updated in `src_source_documents` with `extractedText`
   - Embeddings generated via `generateEmbedding()` and written back to relevant rows
9. Side panel updates to show commit summary: "Saved — 8 ideas, 3 people, 1 story"
10. Panel dismisses or user navigates away

## Extraction schema — what gets extracted

The LLM returns a structured JSON object. All fields are arrays (may be empty).

### `ideas: Idea[]`
Atomic thoughts, observations, insights from the text. The most common output type.
```ts
{ id: string, text: string, confidence: 'high' | 'medium' | 'low', sourceQuote?: string }
```

### `concepts: Concept[]`
Abstract principles, theories, framings — more stable and general than ideas.
```ts
{ id: string, name: string, description: string, confidence: 'high' | 'medium' | 'low', sourceQuote?: string }
```

### `people: Person[]`
Named individuals mentioned. Enough to create a Person node.
```ts
{ id: string, name: string, role?: string, organisation?: string, context: string, confidence: 'high' | 'medium' | 'low' }
```

### `organisations: Organisation[]`
Named companies, institutions, publications, bodies.
```ts
{ id: string, name: string, types?: string[], context: string, confidence: 'high' | 'medium' | 'low' }
```

### `stories: Story[]`
Narratives worth capturing — personal stories, client wins, metaphors used. Maps to `src_stories`.
```ts
{ id: string, title: string, narrative: string, hook?: string, lesson?: string, type: string, confidence: 'high' | 'medium' | 'low' }
```
`src_stories.subject` (`'self' | 'client' | 'business' | 'project'`) defaults to `'self'` at commit time. It can be edited in the results panel before confirming — the subject is often ambiguous from transcript context alone.

### `techniques: Technique[]`
Methodologies, frameworks, approaches, tools mentioned — either Ellie's own or others'. Creates a graph node; may also link to `dna_knowledge_assets` if it's one of Ellie's.
```ts
{ id: string, name: string, description: string, origin?: string, confidence: 'high' | 'medium' | 'low', sourceQuote?: string }
```

### `contentAngles: ContentAngle[]`
Ideas that have direct content potential — a specific framing, argument, or story that could become a post, article, or talk. Distinct from raw Ideas in that they have a communicative intent.
```ts
{ id: string, angle: string, format?: string, audienceHint?: string, confidence: 'high' | 'medium' | 'low' }
```

## Commit mapping — what each type writes to

| Extracted type | Graph node label | Postgres table | Embedding |
|---|---|---|---|
| `Idea` | `Idea` | — (graph only) | via `graph_nodes.embedding` (KG-02b) |
| `Concept` | `Concept` | — (graph only) | via `graph_nodes.embedding` (KG-02b) |
| `Person` | `Person` | — (graph only) | — |
| `Organisation` | `Organisation` | — (graph only) | — |
| `Story` | — (Postgres only for now) | `src_stories` | `src_stories.embedding` |
| `Technique` | `Methodology` | — (graph only) | — |
| `ContentAngle` | `Idea` (subtype) | — (graph only) | via `graph_nodes.embedding` (KG-02b) |

**SourceDocument row:** Created once per processed input in `src_source_documents`. `extractedText` populated. Embedding generated for the document as a whole (`src_source_documents.embedding`).

**Edges written on commit:**
- All extracted nodes → `DERIVED_FROM` → SourceDocument node
- People/Organisations → `MENTIONS` relationship from SourceDocument node
- All extracted nodes → `ON_DATE`/`IN_MONTH`/`IN_YEAR` → Date node. Date used: `metadata.date` if present, otherwise today's commit date. Date nodes are pre-seeded (GRF-01, 2010–2030) so a matching node always exists.

## Pipeline architecture

Two functions, cleanly separated:

### `extractFromText(text: string, metadata: InputMetadata): Promise<ExtractionResult>`
- Takes text + metadata (title, date, source type, file ref)
- Builds the extraction prompt (system prompt + structured JSON schema instruction)
- Calls LLM (`MODELS.primary` — claude-sonnet-4-6) with `generateObject` from Vercel AI SDK
- Returns `ExtractionResult` — the structured extraction + metadata, nothing written yet
- Lives in: `lib/processing/extract.ts`

### `commitExtraction(result: ExtractionResult, confirmedIds: string[]): Promise<CommitResult>`
- Takes the full extraction result + the IDs the user confirmed
- Filters to confirmed items only
- Writes in order: SourceDocument row → graph nodes → `src_*` rows → embeddings
- Returns `CommitResult` — counts of what was written + any errors
- Lives in: `lib/processing/commit.ts`

### `InputMetadata`
```ts
interface InputMetadata {
  title: string
  sourceType: 'transcript' | 'session-note' | 'research' | 'voice-note' | 'image' | 'email' | 'document' | 'other'
  date?: string        // ISO date string if known — used for temporal graph edges. Falls back to commit date if absent.
  fileRef?: string     // Vercel Blob URL if stored. Null for paste-only inputs.
  tags?: string[]      // Free-form context tags, e.g. ["coaching", "client:acme"]. Stored on src_source_documents.
  brandId: string
}
```

## UI — side panel

- Triggered after `extractFromText()` resolves
- Shows clustered sections per extraction type (Ideas, Concepts, etc.) — empty sections hidden
- Each item: checkbox (default checked) + text + confidence badge
- "Select all / deselect all" per section
- Total count shown: "23 items found"
- CTA: "Save X to BigBrain" (X updates as checkboxes are toggled)
- After commit: success state with summary counts, then auto-dismiss or manual close
- No editing of extracted content in v1 — accept or reject only

## API route
`POST /api/process` — auth-gated. Accepts `{ text, metadata }`. Calls `extractFromText()`, returns `ExtractionResult`. Used by the UI to trigger extraction without a page reload.

`POST /api/process/commit` — auth-gated. Accepts `{ result, confirmedIds }`. Calls `commitExtraction()`, returns `CommitResult`.

## Update behaviour
Source documents: one row per input, immutable after creation (`src_source_documents`).
Graph nodes: MERGE — if a Person or Concept already exists (via canonical register), properties updated, no duplicate created.
Embeddings: generated once at commit time. Regenerated if source text changes (not automated in v1 — manual retrigger).

## Relationships
### Knowledge graph (FalkorDB)
Creates: `Idea`, `Concept`, `Person`, `Organisation`, `Methodology`, `SourceDocument` nodes.
Creates edges: `DERIVED_FROM`, `MENTIONS`, `IN_YEAR`/`IN_MONTH`/`ON_DATE`.
Uses `writeNode()`, `writeEdge()` from `lib/graph/write.ts`.
Uses `resolveCanonical()` for Person/Organisation/Project before writing.

### Postgres
- `src_source_documents` — one row per processed input
- `src_stories` — one row per confirmed Story extraction
- `graph_nodes` / `graph_edges` — mirror written via `writeNode()` / `writeEdge()`
- `canonical_register` — read + written via canonical functions

## Edge cases
- **LLM returns malformed JSON:** `generateObject` with a Zod schema handles this — invalid responses are rejected, error surfaced to UI as "extraction failed, try again"
- **Empty extraction (nothing found):** Show panel with "Nothing significant found in this text" — still creates the SourceDocument row on confirm so provenance is tracked
- **Very long text (>100k chars):** Chunk into overlapping segments, run extraction on each, merge results (dedup by name/text similarity). Flag in UI if chunking occurred.
- **Person already in canonical register:** `resolveCanonical()` returns existing node ID — `writeNode()` MERGEs, updates properties, no duplicate
- **Commit partially fails:** Write as much as possible, return error list in `CommitResult`. UI shows "Saved with errors — X items failed"
- **User closes panel before committing:** Nothing is written. Extraction result is discarded. No orphaned data.
- **`src_stories` embedding:** Generated at commit time via `generateEmbedding(narrative)`. Null if narrative is empty.

## Out of scope (v1)
- PDF, audio, CSV, web scrape inputs — those are INP-01/INP-05 concerns
- Editing extracted items before saving — accept/reject only
- Action items / task management
- Automatic processing without user confirmation
- Re-processing an already-processed document (dedup logic at document level — v2)
- `graph_nodes.embedding` — deferred to KG-02b
- Batch processing multiple documents at once
- Statistics extraction — `src_statistics` table not written to in v1 (overlap with manual entry; add in a later pass)

## Open questions / TBDs
None — all decisions made in briefing.

## Decisions log
- 2026-04-01: Briefed. Plain text only for v1. Opinionated extraction: 7 types. Action items excluded (not knowledge management). Two-phase extract/commit pattern — nothing written until user confirms. Side panel UI with checkboxes per item. `generateObject` with Zod schema for LLM extraction. Statistics deferred to later pass.
- 2026-04-02: `InputMetadata.sourceType` canonicalised to `transcript | session-note | research | voice-note | image | email | document | other` (content/intent type, not file format). `fileUrl` made nullable on `src_source_documents` — paste inputs have no file. Tags added to `InputMetadata` for context filtering within a type. Date node edges always written on commit — using `metadata.date` if present, else today's commit date. `src_stories.subject` defaults to `'self'` but is editable in the results panel before commit.
