# Session log — 2026-04-16 — Input queue build

Session ID: 2026-04-16-queue-build-w5k

## What we worked on
- INP-07: Input queue and triage UI
- INP-10: Queue-time dedup detection (new backlog item)

## What was done

### Input queue page (INP-07) — built end-to-end

Replaced the stub at `/inputs/queue` with a working page:

- **Server page** — `02-app/app/(dashboard)/inputs/queue/page.tsx` — fetches all pending inputs via new `getAllPendingInputs` query
- **Client component** — `02-app/app/(dashboard)/inputs/queue/queue-client.tsx` — list view with source type icons, dates, tags, extraction item counts. Click any item to open the review panel.
- **Review panel** — reuses the existing `ResultsPanel` from the Process page (`inputs/process/results-panel.tsx`). Full review + commit flow works from the queue.
- **Delete support** — trash icon per row, calls `DELETE /api/inputs/[id]`. Optimistic removal from list + toast confirmation.
- **API route** — `02-app/app/api/inputs/[id]/route.ts` — deletes a pending input by ID.
- **Query** — added `getAllPendingInputs()` to `02-app/lib/db/queries/dashboard.ts`.

### Data shape mismatch fix

Krisp ingestion stores `extractionResult` as bare `ExtractionOutput` (top-level `ideas`, `concepts`, etc.), but the Process page stores it wrapped as `ExtractionResult` (`{ metadata, text, extraction }`). Added a `toExtractionResult()` normalizer in the queue client that handles both shapes.

### Backlog item: INP-10 (Queue-time dedup detection)

Added to `00-project-management/backlog.md`. At review time, surface which extracted items are similar to already-committed graph nodes or other pending inputs in the same time window. Depends on RET-01 (vector similarity search). Complements INP-09 (dedup at extraction time).

### Backlog status update

Updated INP-07 status from `planned` to `done` with notes on what was built.

## Decisions made

- **Reuse ResultsPanel from Process page** — rather than building a separate review UI for the queue. Same review/commit workflow, same component. The queue just provides a different entry point (list of stored items vs. paste-and-extract).
- **Normalize extraction data on the client** — the DB stores two different shapes depending on whether the input came from Krisp ingestion or the Process page. Rather than migrating old data, the queue client normalizes both into `ExtractionResult` at render time.
- **Dedup at review time, not extraction time** — INP-09 handles smarter extraction; the new INP-10 handles dedup at the point where the user is reviewing items. Belt and braces. INP-10 depends on RET-01 (M3).

## What came up that wasn't planned

- **Kitchen reno in the queue** — first real test of the queue surfaced a personal conversation that had been ingested. Prompted the need for delete functionality.
- **Duplicate knowledge from repeated conversations** — Ellie raised the pattern of discussing the same topic (e.g. AI-assisted dev) with 3-4 people in a week, producing near-duplicate extractions. This led to INP-10.
- **RET-01 may need to come before finishing the inputs workflow** — the dedup problem means the queue is less useful without similarity search. Ellie flagged this as a potential sequencing change.

## Backlog status changes

| Feature | Old status | New status |
|---|---|---|
| INP-07 | planned | done |
| INP-10 | (new) | planned |

## What's next

### Sequencing question
- **Should RET-01 (unified retrieval) move ahead of remaining M4 work?** Ellie flagged that the queue is less useful without dedup, and dedup needs vector similarity. This could shift M3 priorities.

### Remaining M2 item
- **INP-01: Krisp transcript ingestion** — still the one open item blocking M2 completion.

### Ready to build (from prior session)
- IDEA-01 implementation (ideas table + server action)
- ORG-01 (organisations table)
- `src_statistics` extension migration

## Context for future sessions

- **Extraction data shape inconsistency** — Krisp ingestion stores bare `ExtractionOutput`, Process page stores wrapped `ExtractionResult`. The queue client normalizes this. If a third ingestion path is added, it should store the wrapped format to avoid more normalization.
- **Pre-existing build error** — `lib/llm/embeddings.ts:10` type error (Google SDK signature). Not introduced by this session, not blocking dev server.
- **Pre-existing Base UI warning** — Button components on the home page using `render={<Link>}` trigger a `nativeButton` console warning. Not blocking.
