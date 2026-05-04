# ADR-009 — Source × Lens processing model

Status: accepted
Date: 2026-05-01
Related: ADR-002 (Knowledge Graph Schema), ADR-002a (Graph schema amendment for INP-12), ADR-006 (Content creation prompt architecture), ADR-008 (Skills vs content-creation), INP-11 (Multi-modal processing — superseded by INP-12), INP-12 (Source × Lens Processing brief)

---

## Context

INP-11 (multi-modal processing, shipped April 2026) introduced four hardcoded processing modes — *individual extraction*, *batch analysis*, *reflective analysis*, *project synthesis*. Each was a separate code path, separate prompt, separate response shape, separate UI flow. Adding a fifth mode meant new files, new types, new commit handler.

Two structural problems surfaced in use:

1. **The four modes conflated two independent decisions.** "What kind of thing is this source?" (a client interview vs a McKinsey report vs a coaching call vs scraped tweets) and "What lens am I applying?" (surface extraction vs pattern spotting vs decision support) are orthogonal, but INP-11 collapsed them into one dial. The same client interview legitimately wants surface extraction *or* pattern spotting *or* decision support depending on what the user is doing that day.

2. **The system didn't compose.** N hardcoded modes = N independent code paths. Adding a new source type or a new processing intent required touching everything. There was no extension point.

INP-12 (Source × Lens Processing, brief approved 2026-04-30) replaces the four modes with a composable two-axis model. This ADR records that decision as a first-class architectural primitive — separate from ADR-002a, which only covers the graph schema additions the new model needs.

This ADR is about *how processing is structured as code and prompts*, not *what shape the resulting graph takes*.

---

## Decision

**Processing is the composition of two independent inputs: a Source type and a Lens.**

A processing run is defined by:

```
ProcessingRun = {
  sources[]: SourceDocument | SourceCollection,
  source_type: SourceType,        // shapes the extraction prompt fragment
  lens: Lens,                     // shapes the output frame
  lens_input?: string,            // free-form context (e.g. decision text for decision-support)
}
```

The system prompt sent to the LLM is composed at runtime from three pieces:

```
[base extraction prompt]
+ [source-type schema fragment]
+ [lens fragment]
```

**N source types × M lenses = N×M behaviours from N+M editable fragments.** Adding a source type lights up all existing lenses for it. Adding a lens lights up all existing source types.

### Source types (13)

A controlled vocabulary captured on every source at ingest time. Defines *what we expect to extract* and *what node types to bias toward*. Editable property; manual assignment for v1 (auto-classification per INP-08 deferred).

`client-interview`, `coaching-call`, `peer-conversation`, `supplier-conversation`, `accountability-checkin`, `meeting-notes`, `internal-notes`, `research-document`, `dataset`, `pitch-deck`, `report`, `collection`, `content-idea`.

Full definitions and surfaces in INP-12 brief.

**`dataset` is in the source-type vocabulary but has no extraction-schema fragment.** Datasets are structured data (CSVs, parquet, JSON exports, schema'd row data) where analysis comes from graph traversal, not from LLM reading. They ingest via `kg-ingest-creator` (SKL-12) directly into FalkorDB + Neon as nodes/edges/properties; they are queried by Cypher hops, not lensed. The lens prompt composer raises a `LensNotApplicableError` when `sourceType === 'dataset'`, and the lens picker UI surfaces the dataset's graph view instead of a lens choice. A row in `src_source_documents` still gets created so the dataset is visible and findable in the front-end; the row links to its `ingestion_log` entry via a future `ingestionLogId` field (added in INP-12 implementation pass alongside the `sourceRefs` and `unexpected[]` follow-ups). All other 12 source types have a fragment file in `01-design/schemas/extraction-schemas/`.

### Lenses (7)

A controlled vocabulary defining *what frame to apply* and *what output structure to produce*.

`surface-extraction`, `self-reflective`, `project-synthesis`, `pattern-spotting`, `catch-up`, `decision-support`, `content-ideas`.

`surface-extraction` is the default and produces discrete extracted items written directly to the graph. The other six produce `LensReport` artefacts (per ADR-002a) with structured per-lens output schemas. Items the lens identifies link to the report via `IDENTIFIED_IN` edges and to the underlying sources via `DERIVED_FROM`.

### Authority property

Independent of source type. Captures stance and evidence weight. Four values: `own`, `peer`, `external-authoritative`, `external-sample`. Defaults are pre-populated by source type but always editable. Authority shapes how retrieval weights the source — e.g. content generation prefers `own` and `peer` for voice, `external-authoritative` for cited claims, never `external-sample` for either.

### Prompt composition

Fragments live as schema documents on disk, not as code constants:

- `01-design/schemas/extraction-schemas/{source-type}.md` — one file per source type. Holds the prompt fragment describing expected node/edge shape for that type.
- `01-design/schemas/lens-prompts/{lens}.md` — one file per lens. Holds the lens prompt describing what to produce, how to ground it in sources, and the output schema (typed via `lib/types/processing.ts`).
- `01-design/schemas/extraction-schemas/_base.md` — the shared base extraction prompt all runs include.

The application layer reads these at request time (with a build-time validator that asserts every source-type and lens has a registered fragment file). User can edit fragments without code changes.

### Per-item review/edit before commit (universal)

Every item the LLM produces is editable inline and individually confirmable in the UI before commit. **This applies equally to all lenses, including `surface-extraction`.** No lens writes anything to the graph without the user reviewing each proposed item.

- For `surface-extraction`: each proposed Idea, Concept, Person, Organisation, Methodology, Story, etc. is presented for review with inline edit and per-item confirm.
- For analysis lenses: each section's items (themes, insights, realisations, shifts, etc.) within the draft LensReport is reviewable with inline edit and per-item confirm before the report is committed.

Canonical resolution for Person and Organisation runs as a UI step within review (not silently in code). Match suggestions surface against existing graph nodes; user confirms link, creates new (with contact card), or rejects.

### Lens reports as first-class objects

Analysis lenses (everything except `surface-extraction`) write a `LensReport` graph node + Postgres row (per ADR-002a + INP-12 schema doc). The report has:

- A page (addressable URL, openable later)
- A status: `draft` (pre-commit), `committed` (items written to graph), `superseded` (replaced by a re-run)
- Re-runnability — running the same lens on the same sources creates a new report and supersedes the old via `superseded_by_id`
- Edit-then-recommit semantics in v2 (out of scope for v1; v1 commit is one-way)

`processing_runs` becomes a transient compute record. Durable analysis output lives on `lens_reports`.

---

## What was ruled out

| Option | Why rejected |
|---|---|
| Extend INP-11's four modes to five or six | Doesn't fix the underlying problem. Each new mode is still a new code path. The composition problem only gets worse. |
| Hardcode source types as labels in code (`switch source.type { case "client_interview": ... }`) | Forces redeploy for every prompt tweak. Schema fragments as on-disk markdown match how DNA prompts already work and let the user iterate without engineering involvement. |
| Single dimension: collapse source types into lenses ("client-interview-extraction" as one lens) | Combinatorial explosion. 13×7 = 91 hardcoded lenses. Loses the orthogonality insight that makes the model work. |
| Single dimension: collapse lenses into source types | Same problem inverted. Doesn't reflect how the user actually thinks about processing — same source, different lens depending on the day. |
| Auto-pick the lens based on source type | Fights the orthogonality. The whole point is the user chooses the lens at processing time. Source type is set at ingest; lens is chosen at processing. Different decisions, different moments. |
| Make the `surface-extraction` lens write a LensReport like the others | LensReports are useful as a layer above source items. For surface extraction, the items themselves *are* the output — adding a wrapper report would be ceremony. The asymmetry is intentional: "this lens identified things directly" vs "this lens wrote an analysis that identified things." **Note:** this is only about whether a *durable LensReport artefact* is created. Surface extraction still goes through full per-item review, edit, and canonical resolution before any commit — same as analysis lenses. The asymmetry is in the output shape, not the review path. |
| Skip the `authority` property — bake it into source type | Authority is genuinely orthogonal: a client-interview can be `peer` (collaborative session) or `external-authoritative` (formal expert interview). Encoding it in source type would either expand the source-type list to 30+ or lose information. |
| Implement schema fragments as code constants now, move to disk later | "Later" never comes. The point of the model is composability with low friction; disk-based fragments enforce that from day one. |
| Treat `lens_input` as a structured object (problem statement, options, criteria for `decision-support`) | Free-form textarea is simpler and matches user's stated preference. Structuring it limits the lens prompt's flexibility. Revisit if free-form output quality is poor. |
| Lensing `dataset` sources via the LLM | Datasets are structured rows where the analysis is graph traversal, not language reading. LLM lensing of a CSV would either summarise the schema (low value, the user already knows it) or fabricate patterns from a row preview (negative value, misleading). Datasets ingest via `kg-ingest-creator` directly to the graph and are queried by Cypher hops. `dataset` keeps its place in the source-type vocabulary so the dataset is visible/findable in the app, but has no fragment file; the lens picker disables for it and the prompt composer raises `LensNotApplicableError`. |

---

## Consequences

- **Two new on-disk schema directories** (`01-design/schemas/extraction-schemas/` and `01-design/schemas/lens-prompts/`) become source-of-truth for prompt content. Build-time validator asserts coverage.
- **`processing_runs` schema gets reshaped** (per INP-12 schema doc): `mode` renamed to `lens`, `analysis_result` removed (moves to `lens_reports.result`), `lens_report_id` FK added.
- **`lens_reports` is a new table + graph node** (per ADR-002a + INP-12 schema doc).
- **The 4 INP-11 modes map to 3 lenses + 1 unchanged:**
  - `individual` → `surface-extraction` (renamed, otherwise unchanged)
  - `batch` → `pattern-spotting` (prompt ported with minor updates)
  - `reflective` → `self-reflective` (prompt ported)
  - `synthesis` → `project-synthesis` (prompt ported)
  - 4 new lenses to draft: `catch-up`, `decision-support`, `content-ideas` (and a refined `surface-extraction` reading from disk)
- **The existing 3 `processing_runs` rows are wiped** as part of INP-12's wipe-and-re-ingest. No backwards compatibility layer needed.
- **INP-08 (Krisp meeting auto-classification) becomes a clean fit** — it's the future implementation of source-type assignment at ingest. Manual for v1.
- **Retrieval (RET-01)** benefits from the `authority` property: queries weighting `own` vs `external-sample` become straightforward filters.
- **Content creation (OUT-02)** becomes a consumer of the same model: source quality and lens are explicit inputs to "find me 3 quotes from external-authoritative sources about X."
- **Skills (OUT-01a, ADR-008)** can invoke processing as a tool (skill calls "run pattern-spotting lens on these sources"); the Source × Lens model gives the API a clean surface to expose.
- **Adding a new lens or source type post-v1** is a 4-step operation: write the schema fragment, add to the controlled vocabulary, draft the output type (for analysis lenses) in `lib/types/processing.ts`, write a per-lens review panel (UI). No commit-pipeline changes, no graph-write changes.
- **The model is auditable.** Every committed lens report records the source type, lens, sources, prompt fragments used (by file ref + git hash), authority of inputs, and output. Re-running a lens on different prompts is a new report, not an in-place edit.
- **Tests** — INP-12 implementation should add `__smoke__` coverage for prompt composition (every source-type × lens pair produces a valid prompt) and lens-report write/read round-trip.
