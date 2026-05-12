# Session log — 2026-05-12 — INP-12 Phase 1 ingest pipeline build
Session ID: 2026-05-12-inp12-phase1-ingest-pipeline-h8m

## What we worked on

- **INP-12** (Source × Lens processing model) — Phase 1 of the 5-phase feature build (Foundation → Ingest pipeline → Pass 1 → Pass 2 → Pass 3). Phase 0 closed earlier today (session log `2026-05-12-inp12-phase0-foundation-r7k.md`); this session built the ingest pipeline that turns a source's `extracted_text` into chunks + summary + embeddings + graph citizenship.

## What was done

### Phase 1 — Ingest pipeline

**New prompt fragment** — `01-design/schemas/extraction-schemas/_summary.md`:
- Ingest-time-only system prompt (not composed into lens-time prompts).
- Targets ~300 words, hard ceiling 400, prose only — no headings, no bullets, no preamble.
- Faithful compression of the source; explicit `must not` rules against editorialising, inventing dates/attributions, or adding consultant-vocabulary reframes.

**Chunker** — `02-app/lib/processing/ingest/chunk.ts`:
- Pure function, no LLM, deterministic. Same input → same chunks → same `position` ordinals (per `src-source-chunks.md`).
- Per-source-type dispatch:
  - Transcript family (client-interview, coaching-call, peer-conversation, supplier-conversation, accountability-checkin, meeting-notes) → `speaker-turn` chunks. Speaker-line detection handles `Speaker:`, `**Speaker**:`, `[Speaker]`, `Speaker (00:01:23):` forms.
  - `internal-notes`, `content-idea` → `paragraph` chunks. Short-fragment merge keeps single-line orphans attached to the previous paragraph.
  - `research-document`, `report` → `paragraph` chunks with `metadata.sectionHeading` carrying the nearest markdown heading; headings become their own `section` chunks. Short-paragraph merging is disabled in this strategy so headings never get absorbed into adjacent prose.
  - `pitch-deck` → `slide` chunks. Detects `Slide N:` / `## Slide N — title` / form-feed boundaries. Falls back to paragraph if no slide signal is found.
  - `dataset`, `collection` → no chunks (the kg-ingest-creator path handles those).
- Each chunk carries `position`, `text` (verbatim), `speaker` (nullable), `startOffset`/`endOffset` into parent's `extracted_text` (best-effort, null when whitespace got normalised), `tokenCount` (chars/4 approximation), and chunk-type-specific `metadata`.
- Speaker-line detection is intentionally conservative: 1–6-word name, must start with a capital, with a small blocklist of sentence-starter words (`Note:`, `Aside:`, `Tip:`, etc.) to avoid false-positive splits on intra-turn colons.

**Summariser** — `02-app/lib/processing/ingest/summarise.ts`:
- Wraps `generateText` (AI SDK) with `MODELS.fast` (Claude Haiku) → `MODELS.fallback` (Claude Opus 4.7) on failure. Haiku because the task is faithful compression, not reasoning.
- Loads the `_summary.md` system prompt at request time via the disk-loader (ADR-009 / Phase 0 infrastructure).
- 200k-char truncation cap on input — very long sources get a slightly-truncated summary rather than a model error.
- Returns `{ summary, generatedAt, usedFallback, truncated }`.

**Embed helper** — `02-app/lib/processing/ingest/embed.ts`:
- Concurrency-limited batch wrapper around `generateEmbedding` (gemini-embedding-2-preview → 1536-dim). Default concurrency 4 so a 200-chunk transcript doesn't fire 200 simultaneous embed calls.
- Per-item failures land in `failures[]` and the corresponding vector slot is `null`. Caller decides whether null blocks insert or leaves the chunk row with `embedding NULL` for backfill (the schema allows this — see `src-source-chunks.md` partial-index note).

**Orchestrator** — `02-app/lib/processing/ingest/run.ts`:
- One function: `ingestSource(sourceId)`. Loads the row, chunks, summarises (skipped for dataset/collection), embeds chunks + summary, persists in a single transaction, then writes graph nodes + edges.
- Idempotent at the chunk grain: re-running deletes the existing chunk set for the source and writes a fresh one (per `src-source-chunks.md` immutability rule — re-chunk means regenerate the whole set).
- Empty-text guard: writes a placeholder `SourceDocument` graph node with status `'skipped'` and reason "no extracted_text yet". This is the path Phase 1's POST `/api/sources` takes today, because INP-05 (the extraction pipeline) hasn't landed yet and uploads have null `extracted_text`. Establishes the wire-up; once INP-05 ships, the same orchestrator path produces real chunks.
- Bypasses `writeNode` for SourceChunk graph nodes — `writeNode` always regenerates a `name — description` embedding, which is wasteful for chunks whose embedding came from the chunk text itself. Helper writes the FalkorDB node + Neon mirror + sets the chunk's text-embedding directly into `graph_nodes.embedding`.
- Returns a structured `IngestResult` with chunk count, embedding success/fail counts, graph write counts, and an `errors[]`.

**Manual trigger endpoint** — `02-app/app/api/sources/[id]/ingest/route.ts`:
- POST endpoint, auth-gated (skipped in dev). Calls `ingestSource(id)` and returns the result body with status 200 (or 500 on hard failure).
- Used for re-ingest day, re-chunking after schema changes, and any future "Re-run ingest" button.

**Background trigger on upload** — `02-app/app/api/sources/route.ts`:
- POST endpoint now fires `void ingestSource(rows[0].id).catch(...)` after the row insert. Deliberately not awaited — HTTP response returns immediately, ingest runs in the background. Today this just writes the placeholder graph node (no extracted_text yet); when INP-05 lands and uploads carry text, the same wire produces real chunks without further changes.

**Build validator + loader extension** — `02-app/scripts/check-fragments.ts` + `02-app/lib/llm/prompts/load-fragment.ts`:
- Added `pathForSummaryPrompt()` + `loadSummaryPrompt()` to the disk-loader.
- `fragmentFileChecks()` now includes the summary path so `npm run check:fragments` fails the build if `_summary.md` goes missing. Validator output reads `21 fragments present` (up from 20 at end of Phase 0).

### Verification

- `npx tsc --noEmit` — 0 errors.
- `npm run check:fragments` — passes (21/21).
- `npm run build` — compiles cleanly; the `/` prerender failure is the pre-existing forwardRef issue called out in Phase 0's session log (BUG-01 forwardRef portion — separate from INP-12).
- Chunker smoke test (ad-hoc tsx script, removed after) confirmed all four strategies produce the expected shapes: speaker-turn for client-interview, paragraph for internal-notes, section + paragraph with `sectionHeading` carry-forward for research-document, slide with `slideNumber + slideTitle` for pitch-deck. Empty input + dataset + collection all return `[]` as expected.

## Decisions made

- **Re-chunk = delete-and-replace**, not in-place edit. Encoded in the orchestrator's transaction: delete all chunks where `sourceDocumentId = X`, insert fresh. Matches `src-source-chunks.md` "chunks are immutable; if chunking strategy changes, regenerate (cascade-deletes old chunks first)".

- **Summariser uses Haiku, not Sonnet/Opus.** Re-ingest day will summarise ~70 sources; cost matters and quality on "faithful compression of what's already in the source" is well within Haiku's range. Opus is the fallback, not the default. If summary quality turns out to be thin on re-ingest day, the model is one constant change in `summarise.ts`.

- **Chunk embedding bypasses `writeNode`.** SourceChunk graph nodes get their text-embedding written directly into `graph_nodes.embedding` rather than going through `writeNode`'s default `name — description` embedding. The chunk's `text` IS the meaningful content; embedding `"<source title> — chunk 3 [Maya]"` would just embed the label, not the substance. The `writeChunkGraphNode()` helper in `run.ts` handles this.

- **Empty-text guard writes the SourceDocument graph node anyway.** Without `extracted_text`, ingest skips chunk + summary but still writes the parent graph node with a placeholder description so the source is at least discoverable in the graph. Status returns `'skipped'` with reason. This is the path POST `/api/sources` takes today; once INP-05 populates `extracted_text` at upload time, the same code produces real chunks without further wiring.

- **Background-fire ingest on POST `/api/sources`.** Per brief §"User journey" step 2, ingest runs immediately after the row lands. Awaiting it would block the HTTP response for tens of seconds on a long transcript; firing it with `void ingestSource(id).catch(...)` returns the response now and runs ingest in the Node event loop. Failures get logged but don't surface to the user. For a single-user app on a dev server this is fine; for Vercel production a proper job queue (per Vercel cron / inngest / similar) is the right move — flagged but not landed in Phase 1.

- **Short-paragraph merge disabled in headed-paragraph strategy.** Initial smoke test caught a bug: the default merge logic was absorbing the `# Findings` heading into the preceding paragraph, then carrying the stale `sectionHeading: "Methodology"` metadata through the rest of the doc. Fix: `splitParagraphs()` now takes `{ mergeShort: boolean }`; `chunkByParagraphWithHeadings()` passes `false`. Other strategies keep the default (true) — orphan-line merging is genuinely useful for note-like inputs.

- **Tokens are approximated chars/4.** Per OpenAI/Anthropic rule of thumb. The `tokenCount` column is for retrieval budgeting, not billing accuracy; a real tokeniser would be over-engineering for the use case. If retrieval budgeting starts mattering precisely, swap to `js-tiktoken` here without changing the schema.

No new ADRs filed. All decisions are within the envelope of existing ADR-002a + ADR-009 + the INP-12 brief.

## What came up that wasn't planned

- **Speaker-line false positives.** Initial regex matched any `Word:` at line start, which captured intra-turn lines like `"Note: this is important"`. Fixed with a small `isLikelySpeakerName()` guard (≤6 words, first word starts with a capital, blocklist of common sentence-starter words). Verified against transcript test input.

- **`satisfies Chunk` + `.filter` type-guard interaction.** First version of the slide chunker used `slides.map(...).filter((c): c is Chunk => c !== null)` after `satisfies Chunk` — TS narrowed the post-`satisfies` type to the literal slide-only shape, and the predicate `c is Chunk` then failed because `Chunk.chunkType` is a union, not the literal `'slide'`. Fixed by switching to a `for-each + push` pattern with explicit `Chunk[]` accumulator. Pattern worth remembering: `satisfies + filter-type-guard` doesn't play well when the source array has narrower types than the predicate target.

- **`writeNode` always regenerates embeddings.** Reading the existing `lib/graph/write.ts` showed that `writeNode` unconditionally calls `generateEmbedding("name — description")` after writing to FalkorDB + Neon. For SourceChunks where we want the chunk's text embedding (already generated), this would be a wasted embedding call AND overwrite the right vector with a useless one. Resolved by writing chunk graph nodes via a local helper (`writeChunkGraphNode()` in `run.ts`) that mirrors `writeNode`'s structure minus the embedding regeneration. SourceDocument still goes through `writeNode` and then we override its `graph_nodes.embedding` with the summary embedding directly afterwards — same trick, just applied as an update rather than a fork.

- **Build still fails prerender on `/`.** Same forwardRef serialisation error Phase 0 left open (BUG-01 forwardRef portion). Phase 1 doesn't touch that surface and doesn't make it worse. Still needs its own ticket / fix.

## Backlog status changes

- **INP-12** — still `in-progress`. Phase 1 (ingest pipeline) complete. Phase 2 (Sources surface — Pass 1) is next.
- **BUG-01** — unchanged. Schema-rename portion remains closed (Phase 0); forwardRef portion remains open as a separate issue.

## What's next

**Phase 2 — Sources surface (Pass 1).** Spec: `01-design/wireframes/INP-12-pass1-layout.md`. Four surfaces:

1. Sources page (`/inputs/sources`) — NEW filter chip + side preview pane + selection bar + bulk actions.
2. Bulk-triage modal — hybrid set-all + per-row.
3. Source detail page (`/inputs/sources/[id]`) — PageChrome + InPageNav + sections (Metadata, Summary, Chunks, Processing history, Linked lens reports).
4. Lens picker modal — 7-tile grid with per-lens disabled states + decision-support input slot.

Plus: delete the old INP-11 routes (`/inputs/queue`, `/inputs/process`, `/inputs/results` — replaced wholesale per Phase 0 plan-gate decision 4).

**Pass 1 molecule plan** (must be ready at the plan-time hard gate per CLAUDE.md design-system rule):

- 5 new molecules: `SourceListRow`, `TagListEditor`, `ParticipantsPicker`, `DateField`, `LensPickerCard`.
- 1 extension: `InlineWarningBanner` gains an `'info'` tone.
- 1 lib helper (not a molecule): `lib/source-types.ts` — centralised sourceType → icon + label map.

**Open gate questions to resolve** (Pass 1 spec lines 829-838):

1. Default filter on Sources page entry — NEW when `inboxCount > 0`, else All. Brief says "filter defaults to NEW"; current code does NEW-when-non-zero. Confirm.
2. Tag chip hue — fixed hue 3 (custard, muted) is the recommendation. Confirm.
3. Single-source `Mark as triaged` button on detail page — just flips `inboxStatus`; metadata edits happen via the detail view's autosave. Confirm.
4. `description` vs `summary` — both kept on the detail page; show `description` only when non-empty. Confirm.
5. Unresolved-Person handling in bulk-triage `ParticipantsPicker` — proposal is to allow "Park as unresolved" creating a Person with `relationship_types: ['unresolved']`. Confirm.
6. Quick-preview vs detail click semantics — body click = preview, trailing chevron / Cmd-click = detail. Confirm.
7. Lens picker single vs multi-source UX — same modal, source-set summary degrades to "Across 1 source". Confirm.
8. `LensPickerCard` vs extending `ContentTypeCard` — new molecule recommended. Confirm.

**Recommended approach for next session:** run the `feature-build` skill end-to-end so the molecule-plan hard gate enforces. Start fresh chat — Phase 2 will load the Pass 1 spec (876 lines), design-system spec, registry, and grow through 5 molecule builds + 4 surfaces + delete-old-routes. Carrying this thread's context (brief + Phase 0/1 history) into Phase 2 risks compression mid-build.

## Context for future sessions

- **Background-fire ingest on POST `/api/sources` is dev-tier wiring.** Today it works because Next dev keeps the Node process alive while the ingest promise resolves. On Vercel production a hanging promise after the response returns is unreliable — when INP-05 lands and there's real text to ingest, this needs to become a Vercel cron job or a queue (inngest/similar). Track as a follow-up before going to prod with INP-12.
- **Re-summarise is a single function call**: `ingestSource(id)` is idempotent and replaces summary + chunks + embeddings + graph nodes. A "Re-summarise" button in Pass 1's detail page just POSTs to `/api/sources/[id]/ingest`.
- **`SOURCE_TYPES` const lives in `lib/types/lens.ts`.** Pass 1 wants a centralised `lib/source-types.ts` with sourceType → icon + label mappings on top. Build at Phase 2 start.
- **Chunking strategy per source type is the source of truth in `chunk.ts`**, not in `src-source-chunks.md`'s table. The doc table is descriptive; the code is operative. If a strategy needs tuning during re-ingest day, change `chunk.ts` and re-run ingest — the chunk table refreshes idempotently.
- **Summariser is Haiku-first.** If summary quality is thin during re-ingest day, swap `MODELS.fast` → `MODELS.primary` (Sonnet) in `summarise.ts`. One-line change.
- **Embedding concurrency is 4.** Conservative. Bumpable to ~10 before hitting Gemini rate limits; if re-ingest day feels slow, that's where to tune.
- **The OUT-02-P4b session is still in flight in a parallel window.** When committing Phase 1, stage ONLY the INP-12 files — leave every `library_*`, `pending_*`, `entity_writes`, `variant-*`, `column-*`, `rich-text-editor`, `tag-*`, `typed-tag-*`, `date-picker`, `inline-hint`, `markdown/`, and OUT-02-P4b-tagged file untouched for that window to commit. The orphan migrations 0037 + 0038 stay journal-pending for OUT-02-P4b too. Phase 0's session log called this out — same rule still applies.
- **`npm run check:fragments` is the canary** for fragment-disk drift. Wire into CI when CI is set up. Currently passes at 21 fragments (1 base + 1 summary + 12 source-types + 7 lenses; dataset intentionally absent).

## Self-improvement check

No skill changes proposed this session.

One light observation: the `feature-build` skill wasn't invoked for Phase 1 because Phase 1 is server-only (no UI, no new molecules) — the molecule-plan hard gate doesn't apply. Worked fine without the skill. Phase 2 is the inverse — heavy UI, 5 new molecules — and that's where `feature-build` actually earns its keep. Suggests the skill's value lands when there's UI work to gate, not as ceremony on every phase. No skill change needed; just a note that phase-by-phase judgement of when to invoke is the right call.
