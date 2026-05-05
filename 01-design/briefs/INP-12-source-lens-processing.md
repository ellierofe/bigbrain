# Source × Lens Processing Model + Richer Graph Representation
Feature ID: INP-12
Status: in-progress — Track A schema layer complete; lens prompts + source-type fragments + layout-design remaining; feature-build still blocked on KG-04
Last updated: 2026-05-02

## Summary

Replace INP-11's hardcoded 4-mode processing with a composable two-axis model: **Source type** (what is being ingested — what we *expect* to extract) × **Lens** (what frame the user is applying — what to *output*). Source documents become first-class graph citizens with LLM-generated summaries, per-speaker-turn semantic chunks, and tags applied at ingest time. Person and Organisation extraction runs through canonical resolution against the existing graph (including the imported politics graph), with a contact-card flow for new entrants and multi-select relationship typing. Both individual extraction and lens reports are reviewed item-by-item with inline edit before commit. The existing 67 transcripts get wiped and re-ingested under the new model alongside fresh Krisp data, reports, and pitch decks — using the work itself as a forcing function to surface edge cases.

This brief supersedes the "Remaining" items on INP-11 (analysis-commit wiring, individual-extraction commit fix). Those are folded into INP-12 because the right fix isn't to wire what's there — it's to redesign the data shape underneath.

## The problem with the current model

INP-11 shipped a working 3-space UI (Inbox, Sources, Results) and 4 hardcoded processing modes. Two structural gaps showed up in use:

1. **The graph representation of a source is hollow.** The `SourceDocument` graph node currently stores `name + type + fileRef + a templated description`. The full text lives in Postgres. There is no summary, no semantic chunking, no per-passage embedding. A 100k-character fundraising interview becomes one node with one embedding generated from the first ~500 words. Retrieval against it is lossy.
2. **The processing modes conflate two independent decisions.** "What kind of thing is this?" (a client interview vs a McKinsey report vs a coaching call) and "What lens am I applying?" (surface extraction vs pattern spotting vs project synthesis) are orthogonal — but INP-11 treated them as a single dial. This blocks composition: adding a 5th mode means a new file, new types, new UI, new commit handler. It also doesn't match how the user actually works: the same client interview legitimately wants surface-extraction *or* pattern-spotting *or* decision-support depending on the day.

Three further issues compound:
- **No real review on analysis output.** The "Save analysis" button writes everything in the LLM output to the graph as-is. No per-item edit, no rejection, no review. Risk of seeding the graph with junk the user doesn't agree with.
- **No canonical resolution UI for People/Orgs.** Extraction proposes a Person; if the canonical lookup misses the existing node, a duplicate is created silently. With the politics graph importing ~75K nodes, this becomes critical.
- **No first-class home for analysis output.** Lens reports (batch, reflective, synthesis) are stored on `processing_runs` rows but have no page, no permalink, no versioning. They're transient compute records, not durable artefacts.

## Core design shifts

1. **Source type and Lens are separate, composable axes.** `N source types × M lenses = N×M behaviours from N+M prompt fragments`. Adding a source type lights up all existing lenses for it. Adding a lens lights up all existing source types.
2. **Source documents are graph citizens with internal structure.** A `SourceDocument` node owns child `SourceChunk` nodes (per-speaker-turn for transcripts, paragraph/section for documents). Each chunk has its own embedding. The summary lives on the parent node as a real LLM-generated description, not a template.
3. **Canonical resolution is a UI step, not silent code.** When extraction proposes a Person, the review panel shows a fuzzy-match against existing People nodes; the user confirms link, creates new (with contact card), or rejects.
4. **Per-item review/edit before commit, for both extraction and lens reports.** Every item the LLM produces is editable inline and individually confirmable.
5. **Lens reports are first-class objects.** New `lens_reports` table; `processing_runs` reverts to being a transient compute record. A lens report has a page, a status, and can be re-run, edited, or superseded.

## The two-axis model

### Source types (13)

Manual assignment at ingest for v1. Auto-classification (INP-08) is a future enhancement.

| Type | Examples | Default surfaces |
|---|---|---|
| `client-interview` | Counsel calls, fundraising research, customer research, podcast interviews | quotes, objections, decision-criteria, pain-points, people, orgs |
| `coaching-call` | You being coached / coaching others | realisations, shifts, blockers, commitments |
| `peer-conversation` | Ross, Ray, William strategy calls | ideas, decisions, mutual references, content angles |
| `supplier-conversation` | Dimitris (Ellie's Project), other vendors | technical decisions, scope, deliverables, methodology, people |
| `accountability-checkin` | Justyna daily, morning calls | status, blockers, commitments, energy patterns |
| `meeting-notes` | Multi-party project meetings | decisions, action items, attendees |
| `internal-notes` | Your voice notes, memos, jotted thoughts | ideas, content angles, plans |
| `research-document` | McKinsey, articles, reports, papers (external) | claims, statistics, trends, cited orgs, methodologies |
| `dataset` | Crunchbase exports, election results, structured data | sibling SourceItem children — each row is its own thing |
| `pitch-deck` | Yours, client originals, online samples | claims, structure, narrative arcs, design patterns |
| `report` | Your published outputs | own arguments, claims, recommendations |
| `collection` | Scraped tweets from one influencer, competitor reviews | sibling SourceItem children — each item is its own thing |
| `content-idea` | Quick capture of a content seed | content angles, formats, hooks |

**Structural note on `dataset` and `collection`:** these are containers, not single documents. A Crunchbase export = one ingestion → many sibling `SourceItem` children. Same for 200 scraped tweets. Modelled as a parent `SourceCollection` node with child `SourceItem` nodes linked via `PART_OF`. Each child gets its own embedding.

### Authority property (4 values)

A separate property on every source — captures stance and evidence weight independently of source type.

| Value | Meaning | Default applied to |
|---|---|---|
| `own` | Your own thinking, voice, output | `internal-notes`, `report`, `content-idea`, your own `pitch-deck` |
| `peer` | Conversations with collaborators or peers, mutual authorship | `peer-conversation`, `accountability-checkin`, `coaching-call` |
| `external-authoritative` | Authored by a credible external party — citable as evidence | `research-document`, McKinsey-style reports, expert interviews |
| `external-sample` | External material useful as pattern-only, not as claim-evidence | online sample pitch decks, scraped tweets, competitor reviews |

Defaults are pre-populated by source type but always editable. Authority shapes how retrieval weights the source: e.g. content generation prefers `own` and `peer` for voice, `external-authoritative` for cited claims, never `external-sample` for either.

### Lenses (7)

| Lens | What it produces | When to use |
|---|---|---|
| `surface-extraction` | Discrete items: ideas, concepts, people, orgs, quotes, statistics, methodologies, content angles | Default for any source where specific things were said |
| `self-reflective` | Realisations, shifts in thinking, recurring blockers, commitments, energy patterns | Coaching calls, accountability over time, internal notes |
| `project-synthesis` | Methodology, what worked, what didn't, reusable patterns, case-study narrative, content angles | Project close, periodic mid-project review |
| `pattern-spotting` | Recurring themes, convergences, divergences, synthesised insights, gaps | 2+ sources on a related topic |
| `catch-up` | What's new since last time? What changed? Who said what? | Returning to a project or a person after a gap |
| `decision-support` | What does this mean for [decision X]? Which evidence supports/challenges it? | When a specific decision is open and the user wants the corpus interrogated against it |
| `content-ideas` | Hooks, angles, formats, audience hypotheses | When mining for what could become content |

### Composition

Each processing run is a `{ sources[], lens, source_type_filter? }`. The system prompt is composed from three fragments: `[base extraction prompt] + [source-type schema fragment] + [lens fragment]`. Schema fragments live as documents in `01-design/schemas/extraction-schemas/` so they can be edited without code changes. Lens fragments live in `01-design/schemas/lens-prompts/`.

## Use cases

- **Weekly triage of new transcripts.** Open Sources, filter to "NEW", see N new items, manually assign source type + authority + tags + participants in bulk, run `surface-extraction` on each.
- **End-of-month accountability reflection.** Filter Sources by `source_type:accountability-checkin` + last 30 days, run `self-reflective` lens. Land in Results, review per-item, commit selected realisations and shifts to graph.
- **Cross-corpus pattern spotting.** Filter Sources by tag `fundraising-research`, run `pattern-spotting` lens across 7 client interviews. Lens report becomes a first-class object — can be opened later, edited, re-run with updated source set.
- **Project synthesis at close.** Open SDP project page, "Synthesise project" → runs `project-synthesis` lens across all linked sources → lens report appears with methodology, narrative, content angles. Per-item review and commit.
- **New person on a call.** William Clouston appears in a fundraising interview. Already exists in politics graph as a candidate. Canonical resolution surfaces match → user confirms link → all extracted nodes attach to the existing William Clouston node, not a duplicate.
- **First-time supplier introduction.** Dimitris Goudis appears in a transcript. No existing node. Canonical resolution finds nothing → user fills contact card (name + role + org + relationship types `[supplier, peer]` + notes) → new Person node created with contact-card properties.
- **Decision support.** User has an open decision: "should I run a defence-tech investor roundtable in Q3?" Selects relevant sources (3 fundraising interviews + 2 strategy calls), runs `decision-support` lens with the decision text as input. Lens report surfaces evidence for/against, gaps, suggested next steps.
- **Re-ingest day.** User wipes existing transcripts, re-uploads from Krisp + adds new reports/pitch decks/datasets, runs through full pipeline to surface edge cases.

## User journey

### Ingestion (Krisp transcript example)

1. Krisp scrape lands a transcript in `src_source_documents`. `inbox_status='new'`. No source type assigned. No summary. No chunks. No embedding.
2. **Background ingestion job** (Vercel cron, queued per-source) does:
   - Generate semantic chunks (per-speaker-turn for transcripts; paragraph for documents). Each chunk gets its own row + embedding.
   - Generate LLM summary (~300 words) → stored on `src_source_documents.summary` and on the SourceDocument graph node `description`.
   - Embed the summary → stored on the SourceDocument graph node and on `src_source_documents.embedding`.
   - Write the SourceDocument graph node + child SourceChunk nodes + `PART_OF` edges. (No DERIVED_FROM, no MENTIONS yet — those come from a processing run.)
3. User opens Sources (filter defaults to "NEW"), sees N new sources with summary + chunk count + tags (none yet) + a "NEW" label. Bulk-selects, applies source type + authority + tags + participant suggestions. (Tag suggestion comes from the summary; participant suggestion comes from speaker-turn analysis.)
4. User confirms triage → `inbox_status='triaged'` (the "NEW" label disappears). Source is now a fully-formed graph citizen even before any lens is applied.

### Processing (lens application)

5. From Sources, user selects 1+ sources, picks a lens (lens picker is the same regardless of source type), confirms run.
6. System composes prompt from `[base] + [source-type schema] + [lens]`, sends to LLM, stores result in `processing_runs.result` with `status='pending'`.
7. User opens Results. For `surface-extraction` lens, the per-item editor shows ideas/concepts/people/orgs etc. with inline edit and per-item confirm. For analysis lenses (`pattern-spotting`, `self-reflective`, `project-synthesis`, `catch-up`, `decision-support`, `content-ideas`), the editor shows the lens report's structured sections with per-item edit and confirm.
8. **Canonical resolution step.** For every Person/Org item, the editor runs a fuzzy match against existing graph nodes and shows: `Match: William Clouston (politician, Reform UK candidate)? [Confirm link / New person / Edit details]`. If new, opens contact-card sub-form (name, role, org, relationship types multi-select, notes, optional photo). Same for Orgs (with org relationship types).
9. User confirms commit. System writes confirmed items to graph + lens report to `lens_reports` (for analysis lenses) + DERIVED_FROM edges to source(s) + canonical-register entries.
10. `processing_runs.status='committed'`. Lens report has its own page, openable later, re-runnable, editable.

### Migration of existing 67

Wipe-and-re-ingest. The existing transcripts will be deleted, fresh ones pulled from Krisp (including new ones and a backfill before March 2026), plus reports/pitch decks/datasets added. The user spends a day walking the full pipeline, surfacing edge cases.

## Data model / fields

### Modified: `src_source_documents`

| Field | Type | Required | Constraints | Notes |
|---|---|---|---|---|
| `source_type` | text | yes | enum (13 values above) | Replaces free-form `type`. Migration converts existing `type` values to nearest match (`transcript` → `client-interview` or `peer-conversation` based on title heuristic, but expected to be wiped). |
| `authority` | text | yes | enum (`own`, `peer`, `external-authoritative`, `external-sample`) | Default by source type, editable. |
| `summary` | text | no | nullable, ~300 words | LLM-generated at ingest. Source for the SourceDocument graph node `description`. |
| `summary_generated_at` | timestamptz | no | nullable | When the summary was generated; supports re-summarisation. |
| `chunk_count` | integer | yes | default 0 | Convenience count. |
| `tags` | text[] | yes | default `'{}'` | At-ingest tag suggestions stored here, editable. |
| `participant_ids` | uuid[] | yes | default `'{}'` | Existing field, used more aggressively. |
| `inbox_status` | text | no | nullable, enum (`new`, `triaged`) | Existing field. |
| `processing_history` | jsonb | yes | default `'[]'::jsonb` | Existing field. |

Existing fields kept as-is: `id`, `brand_id`, `title`, `description`, `file_url`, `file_size`, `mime_type`, `extracted_text`, `external_source`, `is_archived`, `document_date`, `created_at`, `updated_at`, `embedding`, `krisp_meeting_id`.

### New: `src_source_chunks`

One row per semantic chunk. Mirrored as `SourceChunk` graph nodes for traversal.

| Field | Type | Required | Constraints | Notes |
|---|---|---|---|---|
| `id` | uuid | yes | PK | Same UUID used as the graph node id (same pattern as SourceDocument). |
| `source_document_id` | uuid | yes | FK → `src_source_documents.id`, on delete cascade | |
| `brand_id` | uuid | yes | FK → `brands.id` | |
| `position` | integer | yes | | Ordinal position within the source. |
| `chunk_type` | text | yes | enum (`speaker-turn`, `paragraph`, `section`, `row`, `item`) | `row` for `dataset`, `item` for `collection`. |
| `speaker` | text | no | nullable | For `speaker-turn` chunks. |
| `start_offset` | integer | no | nullable | Char offset into `extracted_text` for traceability. |
| `end_offset` | integer | no | nullable | |
| `text` | text | yes | | The chunk content. |
| `embedding` | vector(1536) | no | nullable | OpenAI `text-embedding-3-small`. |
| `created_at` | timestamptz | yes | default now | |

HNSW index on `embedding` for similarity search.

### New: `lens_reports`

First-class durable artefact for analysis-lens output. Distinct from `processing_runs` (transient compute records).

| Field | Type | Required | Constraints | Notes |
|---|---|---|---|---|
| `id` | uuid | yes | PK | Reused as the LensReport graph node id. |
| `brand_id` | uuid | yes | FK → `brands.id` | |
| `lens` | text | yes | enum (7 lens values) | |
| `title` | varchar(300) | yes | | Editable. Auto-suggested from sources + lens. |
| `summary` | text | no | nullable | One-paragraph summary of the report. |
| `result` | jsonb | yes | | Lens-specific structured output (themes, insights, methodology, etc.). Schema varies by lens. |
| `source_ids` | uuid[] | yes | | Sources the lens was applied to. |
| `processing_run_id` | uuid | yes | FK → `processing_runs.id` | The run that produced this report. |
| `status` | text | yes | enum (`draft`, `committed`, `superseded`) | Draft = lens output, no items written to graph yet. Committed = items written. Superseded = a later re-run replaced this. |
| `committed_at` | timestamptz | no | nullable | |
| `superseded_by_id` | uuid | no | nullable, FK → `lens_reports.id` | When re-run with the same source set, the new report supersedes the old. |
| `embedding` | vector(1536) | no | nullable | Embedding of `title + summary` for retrieval. |
| `created_at` | timestamptz | yes | default now | |
| `updated_at` | timestamptz | yes | default now | |

Mirrored in `graph_nodes` as label `LensReport`. New edge type `IDENTIFIED_IN` (Idea/Concept/Methodology → LensReport) + `ANALYSED_FROM` (LensReport → SourceDocument). Both require ADR-002 amendment.

### Modified: `processing_runs`

Reverts to a transient compute record. Drop `analysis_result` (moves to `lens_reports.result`). Keep `extraction_result` for individual extraction (no separate report — items go straight to graph).

| Field | Type | Required | Notes |
|---|---|---|---|
| `lens` | text | yes | Replaces `mode`. Enum (7 lens values). |
| `extraction_result` | jsonb | no | nullable, only populated for `lens='surface-extraction'` |
| `lens_report_id` | uuid | no | nullable, FK → `lens_reports.id`. Populated for analysis lenses on commit. |

`source_ids`, `status`, `committed_at`, `created_at`, `embedding` retained.

### Modified: `graph_nodes` (Postgres mirror) and FalkorDB

New labels: `SourceChunk`, `SourceCollection`, `SourceItem`, `LensReport`. Existing `Person` and `Organisation` nodes get expanded properties for contact cards.

**Person node properties (expanded):**
- `roles` (existing) — keeps current usage
- `relationship_types` (new) — text[] from a controlled vocabulary: `client`, `prospective-client`, `supplier`, `peer`, `mentor`, `mentee`, `friend`, `family`, `colleague`, `candidate`, `politician`, `media-contact`, `expert`, `interviewee`, `research-subject`, `other`. Multi-select.
- `contact_card` (new) — jsonb: `{ email?, phone?, links?, notes?, photo_url?, last_contacted? }`
- `primary_organisation_id` (new) — uuid, soft ref to an Organisation node

**Organisation node properties (expanded):**
- `types` (existing)
- `relationship_types` (new) — text[]: `client-org`, `partner`, `competitor`, `vendor`, `funder`, `regulator`, `media`, `political-org`, `other`. Multi-select.
- `contact_card` (new) — jsonb: `{ website?, notes?, photo_url? }`

### Schema docs to add or update

- New: `01-design/schemas/src-source-chunks.md`
- New: `01-design/schemas/lens-reports.md`
- Updated: `01-design/schemas/src-source-documents.md` (new fields, new vocabulary)
- Updated: `01-design/schemas/processing-runs.md` (drop `analysis_result`, rename `mode` → `lens`)
- New: `01-design/schemas/extraction-schemas/` directory — one file per source type, holds the prompt fragment and expected node/edge shape
- New: `01-design/schemas/lens-prompts/` directory — one file per lens

### ADR amendments required

- **ADR-002 §1 (node types):** Add `SourceChunk`, `SourceCollection`, `SourceItem`, `LensReport`. Document parent/child relationship between SourceDocument and SourceChunk.
- **ADR-002 §2 (relationship types):** Add `PART_OF` (SourceChunk → SourceDocument; SourceItem → SourceCollection), `IDENTIFIED_IN` (Idea/Concept/Methodology → LensReport), `ANALYSED_FROM` (LensReport → SourceDocument).
- **ADR-002 §3 (no AI inference rule):** Soften for SourceDocument summaries and SourceChunk descriptions specifically. The rule's intent — don't fabricate facts about real-world entities — is preserved. LLM-generated summaries of the source's own content are not inference about external facts; they are compression of what's already there.
- **ADR-002 §6 (canonical register):** Add `relationship_types` and `contact_card` columns to the underlying graph node properties (no schema change to canonical register itself, just usage).
- New ADR (ADR-009 — proposed): Document the Source × Lens model itself as a first-class architectural decision.

## Update behaviour

- **Source documents:** freely editable on metadata (title, source_type, authority, tags, participants, summary). `extracted_text` is immutable post-ingest. Re-summarisation is allowed and tracked via `summary_generated_at`.
- **Source chunks:** immutable. If chunking strategy changes, regenerate (cascade-deletes old chunks first).
- **Lens reports:** versioned via `superseded_by_id`. Editing a committed report creates a new draft that can be committed to supersede the original. The original stays in the graph for provenance.
- **Person/Org nodes:** freely editable on contact card and relationship types. Canonical name changes go through the canonical register (existing pattern).
- **Processing runs:** immutable once `status` flips off `pending`.

## Relationships

### Knowledge graph (FalkorDB)

**New nodes:** `SourceChunk`, `SourceCollection`, `SourceItem`, `LensReport`.

**New edges:**
- `PART_OF`: `SourceChunk → SourceDocument`, `SourceItem → SourceCollection`
- `IDENTIFIED_IN`: `Idea → LensReport`, `Concept → LensReport`, `Methodology → LensReport` (when an item came from a lens report rather than direct extraction)
- `ANALYSED_FROM`: `LensReport → SourceDocument` (which sources the report drew on)

**Reused edges:**
- `DERIVED_FROM`: items continue to link back to SourceDocument (extraction lens) or SourceChunk (when the item is sourced from a specific chunk/quote — a finer provenance grain than current)
- `MENTIONS`: SourceDocument → Person/Organisation, written at ingest from speaker-turn analysis (not at processing time)

### Postgres

- `src_source_documents` → `src_source_chunks` (1:N, cascade)
- `src_source_documents` → `lens_reports` (N:M via `lens_reports.source_ids` array, soft ref — sources persist if reports deleted)
- `processing_runs` → `lens_reports` (1:1 for analysis lenses, soft ref via `lens_report_id`)
- `graph_nodes` mirrors all new graph nodes (existing pattern)
- `canonical_register` extended in usage (no schema change)

## UI/UX notes

Surfaces that need design work:
- Sources page "NEW" label/badge + filter chip (no separate Inbox page; navigation collapses to Sources + Results)
- Bulk-triage flow on Sources (assign source type + authority + tags + participants to selected items in one pass)
- Source detail view (summary + chunks + processing history + linked lens reports)
- Lens picker (separate from source-type picker, applies to selected sources; **disabled state for `dataset` sources** with link to graph view)
- Schema-driven lens-result review surface (handles all 7 lenses; see "Layout architecture decision" below)
- Canonical resolution micro-UI (match suggestion + confirm/new/edit) — slot inside the review surface, only triggered by surface-extraction Person/Organisation items
- Contact-card sub-form (Person and Organisation, multi-select relationship types) — sub-form invoked from canonical-resolution slot
- Lens report page (first-class artefact view of a committed `LensReport`, editable in v2, re-runnable)
- Source × Lens compatibility hints (e.g. "self-reflective lens needs 2+ sources of same type" warnings)

The Sources page filter/search/sort improvements are explicitly out of scope for this brief — the existing list UI is acknowledged as needing work but that's a separate next pass.

### Pass 3 layout — approved 2026-05-05

Full spec: `01-design/wireframes/INP-12-pass3-layout.md`. Covers the committed lens-report page at `/inputs/lens-reports/[id]` (full-page route mirroring Pass 1's `source-detail-pane` candidate; PageHeader with editable title + InPageNav + sections: Output → Metadata → Sources → Committed items → History) and the lens-reports list page at `/inputs/lens-reports` (responsive card grid 1/2/3/4-up with chip-based filter bar for lens type + status). Pass 3 also locks in three small Pass 2 contract extensions to define `mode='committed'` cleanly (footer suppression, per-item interactivity reduced to navigation-only, internal `InPageNav` collapses so the page provides nav).

Key resolved decisions:
- **Page shape = source-detail mirror, not thin shell** — the page wraps `<LensReportReview mode='committed'>` with provenance metadata (sources, committed items, supersession, dates) that doesn't belong inside the molecule. Reinforces the unregistered Pass 1 `source-detail-pane` candidate template.
- **`mode='committed'` is "visually identical to review, interactive only for navigation, not state changes"** — title and summary edit on the page (not inside the molecule); per-item edit of lens-output items is v2.
- **No Re-run affordance on the page in v1** — backlogged. Re-running on identical inputs creates duplicate `IDENTIFIED_IN` items with no item-cleanup-on-supersession yet (pure noise). Legitimate "regenerate before commit" lives on Pass 2 (Discard + re-run); legitimate "wider source set" path is from `/inputs/sources` lens picker. Re-running on a committed report lands when item-cleanup-on-supersession lands.
- **Card grid for the list page** (3-up desktop, 4-up wide, 2-up tablet, 1-up phone) — reports are content-rich artefacts whose summary excerpt does real scan-work; a table would force truncation that defeats it. Volume is low (handful per week).
- **Filters: lens type + status only for v1** — single-select lens chip group + multi-toggle status (committed default-on, superseded default-off). Drafts excluded from this list — they live on `/inputs/results`.
- **Default sort = `committed_at desc`** — newest committed first; superseded reports sit in their original timeline.
- **Superseded reports stay browsable** — `InlineWarningBanner` `tone='info'` above PageHeader links to latest version. Old reports are durable provenance, not collapsed away.
- **No archive/delete in v1** — graph-mirrored artefacts with `IDENTIFIED_IN` provenance edges; cleanup is a graph problem the brief defers.
- **Page-level `[⋯]` menu** — two items only: "View raw output (JSON)" + "Copy link". Lean.
- **Committed items section = display-only** in v1 — graph traversal routes don't exist yet; the section informs but doesn't pretend-link.
- **Status-based redirect for draft reports** — server-side redirect from `/inputs/lens-reports/[id]` to `/inputs/results?run=[run_id]` when `status='draft'`. URL-pasting lands somewhere useful regardless of state.
- **`surface-extraction` runs 404 the route** — they don't produce a `lens_reports` row by Pass 2 contract; the route is invalid for them.

Two new molecules required by Pass 3:
- `LensReportCard` (single report tile in the list grid — INP-12-specific shape)
- `FilterChipGroup` (labelled chip group, URL-bound, single or multi-select — broadly reusable)

Pass 2 contract extensions to land at Pass 3 build time (not new molecules — additions to existing prop behaviour on `<LensReportReview>`):
- Footer suppression in `mode='committed'`.
- Per-item interactivity reduced to navigation-only in `mode='committed'`.
- Internal `InPageNav` collapses in `mode='committed'`; host page provides nav (matches `metadata.sections[]` IDs + adds page-level Metadata/Sources/Committed/History anchors).

Two candidate templates flagged for post-build registration:
- `source-detail-pane` — full-page route for one read-heavy artefact with InPageNav-driven sections + light inline editing on metadata + optional supersession banner. Reinforced by Pass 3 (second instance after source detail). Future "single read-heavy artefact" pages (Person, Organisation, Mission archive view) will benefit.
- `lens-reports-archive-list` — card grid with chip-based filter bar, low-volume archive of read-heavy artefacts, deep-linkable filters. Distinct from `launch-picker-grid` (cards-as-launchpads to workspaces) and from `sources-inbox-list` (inbox-shaped with NEW filter and bulk actions).

### Pass 2 layout — approved 2026-05-04

Full spec: `01-design/wireframes/INP-12-pass2-layout.md`. Covers the schema-driven `<LensReportReview>` molecule (one component renders all 7 lens outputs via metadata + 3 extension slots: prose-blob / single-object / canonical-resolution, plus a fourth `object-with-array` hybrid for `project-synthesis.methodology`), the canonical-resolution micro-UI (inline-on-row + lazy fuzzy-match with pre-fetched counts), and the contact-card modal sub-form (Person + Organisation, stages-not-writes — graph commit happens at review commit, not contact-card save).

Key resolved decisions:
- **Single review page** at `/inputs/results?run=<runId>` — single-run focus with conditional sibling switcher when `pendingRunCount > 1`.
- **Single scrollable pane** with `InPageNav` (w-44) + sticky commit footer. No stepped wizard. Per-section `(N/M)` confirmed-of-total counters in the nav.
- **Section renderers** switched by schema metadata: `array` (most common), `object` (decisionFraming, energyAndMomentum), `prose` (summaries, caseStudyNarrative), `object-with-array` (methodology hybrid). `unexpected[]` always rendered last.
- **`pairWith` metadata hint** renders two array sections side-by-side in one SectionCard at ≥1280px (e.g. evidenceFor / evidenceAgainst). Falls back to vertical at narrower widths.
- **Item-card states**: unreviewed / confirmed / rejected / needs-attention (canonical-resolution-specific). Click body to expand editor; checkbox to confirm; trash to reject.
- **Canonical-resolution = inline-on-row** (Q3=a). Each Person/Org row shows extracted name + lazy-fetched count badge `[Resolve · 2 strong matches]`. Click expands inline with match candidates + "+ Create new" + "Park as unresolved". Quick-link shortcut for the unique-strong-match-of-1 case.
- **Contact-card sub-form** opens as Modal size `lg` from the resolution slot. Stages new entities locally; graph write happens only on overall review commit.
- **Pre-flight commit prompt** when unresolved Person/Org rows exist: three-way (park & commit all / commit resolved only / cancel).
- **Surface-extraction commits to graph** (no LensReport); analysis lenses commit to `lens_reports` row. Both redirect on success — surface-extraction → source detail; analysis lenses → Pass 3 committed-report page.
- **`unexpected[]`** universal field rendered as the final section across every lens, identical shape, muted distinct styling.
- **Confidence/strength badge** — `ConfidenceBadge` extended to accept a state-driven value (so analysis-lens `strength` and surface-extraction `confidence` use the same molecule).

Eight new molecules required by Pass 2:
- `LensReportReview` (root render tree)
- `LensReviewSection` (single section renderer — internal)
- `LensReviewItemCard` (single item card — internal)
- `SourceChip` (clickable source-reference pill — broadly reusable)
- `MultiSelectField` (form-context multi-select with envelope — broadly reusable)
- `MarkdownEditor` (prose editor with live preview — reusable for session log, content drafts)
- `MatchCandidateCard` (canonical-match candidate row — reusable for future People/Org admin)
- `ContactCardForm` (Person/Org contact-card form — reusable for future People/Org admin)

Plus existing-molecule extension: `ConfidenceBadge` accepts state-driven values (extension to spec, not a new molecule).

`CommitFooter` was considered but is inlined for v1 (promote on second consumer).

Non-molecule: `02-app/lib/lens-review/metadata/[lens-id].ts` — one metadata file per lens declaring sections + renderers + layout hints. Drives the schema-driven panel. Format sketched in the spec; full TypeScript types finalised at feature-build.

Schema-metadata format extension points: future lenses that need UX a metadata hint can't express add a new slot (and document it), not fork the panel.

Pass 2 establishes the `lens-report-review` candidate template. Register after build proves the pattern.

### Pass 1 layout — approved 2026-05-04

Full spec: `01-design/wireframes/INP-12-pass1-layout.md`. Covers Sources page (NEW filter chip + side preview pane + selection bar), bulk-triage modal (hybrid set-all + per-row), full-page source detail at `/inputs/sources/[id]` (InPageNav + 5 sections), and lens picker modal (3-col grid + per-lens disabled states + lens-input slot for decision-support).

Key resolved decisions:
- **Source detail = full page route** (not drawer / not in-place). Deep-linkable; back link to filtered list.
- **Click semantics** on source rows: body click opens in-place 480px quick-preview; trailing chevron / Cmd-click navigates to detail. Two affordances preserve the inbox-scan rhythm.
- **Bulk-triage = hybrid**: a set-all bar (source-type + authority only) plus per-row controls for tags/participants/overrides — all in one modal at `2xl` size.
- **Lens picker** is one modal serving both bulk and single-source invocation. Source-set summary degrades gracefully. Per-lens disabled states gate by source-count and source-type.
- **`dataset` source type** has a distinct detail layout (no chunks list, no lens, "Open in graph" instead of "Run lens") and is disabled across the lens picker grid.
- **Tag chip styling** standardised to a single fixed muted hue (`TypeBadge` hue 3 — custard) across all source tags for visual quiet. Hash-of-string left for category-meaning contexts elsewhere.
- **`description` field on detail** is shown only when non-empty; otherwise an "Add description" affordance.
- **`ParticipantsPicker` v1** lets users park unresolved People (`relationship_types: ['unresolved']`) per the brief's edge-case path. Full canonical resolution + contact card lives in Pass 2.
- **Default filter on entry** is NEW when `inboxCount > 0`, else All.
- **"Mark as triaged" on detail** is a single-button action — flips `inboxStatus` only; metadata is filled inline via the autosave fields above.

New molecules required by Pass 1 (specs sketched in the layout doc — full specs land at `feature-build` plan time):
- `SourceListRow` (Sources list row composition)
- `TagListEditor` (inline tag list with chips + suggestions; reusable)
- `ParticipantsPicker` (inline person-list with chips + search + suggestions; reusable; v1 supports park-as-unresolved)
- `DateField` (InlineField-parity date input; reusable)
- `LensPickerCard` (lens grid tile; lighter than ContentTypeCard)

Plus an extension: `InlineWarningBanner` gains a `'info'` tone.

Centralised non-molecule: `lib/source-types.ts` — `sourceType` → icon + label mapping, used in 5+ places.

Two candidate templates emerge from Pass 1 (register after build proves the patterns):
- `sources-inbox-list-template.md` — list with NEW filter chip + side preview + bulk-action footer. Reusable for ideas backlog, future Krisp queue, lens-reports list.
- `source-detail-pane-template.md` — full-page route for one read-heavy item with metadata + InPageNav-driven sections + light inline editing. Reusable for the Pass 3 lens-report page.

### Layout architecture decision (2026-05-04)

Two structural decisions were made before any layout-design pass began, to scope the work realistically:

**Decision 1 — `layout-design` runs in three sequential passes, not one mega-spec.**

The 10 surfaces above are too large for a single layout-design invocation; the hard-gate review would be a multi-hour read and the result would need significant rework as edge cases surface mid-design. Tiering by dependency:

- **Pass 1: Entry surfaces** — Sources page (NEW label + filter chip), bulk-triage flow, source detail view, lens picker. These are the navigation spine; without them no other surface is reachable. Designing them first locks in the routing and IA before deeper surfaces commit to it.
- **Pass 2: Lens review surface** — the schema-driven `<LensReportReview>` molecule (see Decision 2) + canonical-resolution slot + contact-card sub-form. One coherent pass, not seven per-lens panels.
- **Pass 3: Committed lens report page** — the addressable, long-lived view of a committed `LensReport`, plus the transition from "review" to "committed page". Smaller than originally scoped because the review surface from Pass 2 supplies most of the rendering.

Each pass is its own `layout-design` skill invocation with its own hard gate. Pass 2 should ideally see at least one real lens output before the panel is finalised — the schema is enough to design against, but tuning happens during re-ingest day (Track B).

**Decision 2 — One schema-driven lens-review surface, not seven per-lens panels.**

The initial framing assumed one review panel per lens (surface-extraction, pattern-spotting, self-reflective, project-synthesis, catch-up, decision-support, content-ideas — 7 panels). On reflection, this conflates *data shape* with *UI shape*. The visual structure across all lenses is the same: collapsible sections of items, per-item edit/confirm/reject affordances, a commit footer. The differences across lenses are bounded:

1. Section names — derivable from schema field names (`whatWorked` → "What Worked").
2. Item field set — derivable from the JSON schema (text fields → text input, enums → dropdown, `sourceRefs` → source-chip selector).
3. Per-item editor type — covered by shadcn/ui primitives.
4. Three special cases handled by extension slots:
   - Long-form prose blobs (`project-synthesis.caseStudyNarrative`, every lens's `summary`) — full-width markdown editor slot.
   - Single-object fields (`decision-support.decisionFraming`, `self-reflective.energyAndMomentum`) — labelled-card slot rather than a section of items.
   - Canonical-resolution slot — only triggered by surface-extraction's Person/Organisation items.

The universal `unexpected[]` array (per `extraction-schemas/_base.md`) renders as one consistent section across every lens, always last, always with the same item shape.

**Architecture:**
- **One main molecule:** `<LensReportReview>` — takes a lens `result` object + a TypeScript-typed schema description, renders sections + items + commit footer.
- **Two extension slots:** prose-blob renderer, single-object renderer.
- **One conditional slot:** canonical-resolution (only injected by surface-extraction's Person/Organisation rows).
- **One sub-form:** contact-card (invoked from canonical-resolution slot).
- **Schema-metadata convention** drives per-lens behaviour. Metadata can include layout hints (`displayWeight: primary`, `pairWith: evidenceAgainst`, `sortBy: chronological`) so lens-specific nuance — e.g. `decision-support` rendering `evidenceFor` and `evidenceAgainst` side-by-side — is achievable without forking the panel.

**Caveat — when hints aren't enough:** schema-metadata hints are bounded. If a lens needs UX that hints can't express, the right move is to reach for a new slot (and document it in this section), not to fork the main panel. Forking creates seven fragile codebases; slots keep the surface to one. Tune during re-ingest day.

**Adding an 8th lens** post-v1 then becomes: write a new schema-metadata file + draft a lens-prompts file. No new panel, no new code path. Matches ADR-009's "adding a lens or source type post-v1 is a 4-step operation" goal.

**Why this matters now:** the `feature-build` plan for the lens review surface depends on this architecture being settled. Without it, feature-build would scope as "build seven panels" — high cost, high maintenance burden, fragile under lens additions. With it, feature-build scopes as "build one molecule + slots + metadata format" — much smaller, much more reusable.

**Pass 1 is unaffected by Decision 2** — it covers Sources page, bulk-triage, source detail, lens picker, none of which touch the per-lens review shape.

## Edge cases

- **Source ingestion with no extracted text** (image, voice not yet transcribed): chunking + summary skipped, source marked `inbox_status='new'` with a warning indicator. Cannot run any lens until text is available.
- **Source uploaded in a language other than English:** chunking works, summary works, but extraction quality degrades. Out of scope for v1 — surface a warning, allow the user to proceed.
- **Very long source (>200k chars):** chunking proceeds, but lens application may exceed token limits. For analysis lenses, we use the chunk embeddings to retrieve relevant chunks rather than passing the whole text — matches RET-01 retrieval pattern. For surface-extraction, we run per-chunk extraction and merge results.
- **Canonical resolution finds multiple candidate matches:** show all, ranked by similarity, with disambiguation properties (org, role, recent activity). Default to "new person" if user is uncertain.
- **User commits a lens report, then re-runs the same lens on the same sources:** new report created with `superseded_by_id` set on the old. Old items in the graph remain (no auto-delete) but are flagged in the UI as "from superseded report — review."
- **`dataset` or `collection` source with 1000s of children:** ingest creates a SourceCollection node + chunks/items in batches. Lens application operates on the collection as a whole — items are addressable but the lens reads them collectively. Surface-extraction on a `collection` produces extracted items per-child where appropriate.
- **Person extracted but not in graph and user can't decide:** allow "park as unresolved" — Person node created with `relationship_types: ['unresolved']` and a flag for later cleanup.
- **Re-summarisation of an existing source:** triggered by user action ("re-summarise" button). Replaces summary, updates `summary_generated_at`. Old summary not retained (out of scope; could be a future enhancement).
- **A source already has lens reports when its source type is changed:** flag the lens reports as potentially stale (since extraction-schema for the new type may differ). User can re-run.
- **Canonical resolution against the politics graph before politics import is complete:** matching returns no results from politics nodes; user creates a new Person node. When politics imports later, the canonical register reconciles — same `dedup_key` collisions trigger a merge prompt. (This is the KG-04 dependency: build the matching infra now, light it up properly when politics is in.)

## Migration plan for existing data

1. **Wipe phase** (one-time, with user confirmation):
   - Delete all rows from `src_source_documents` (cascades to processing runs and graph nodes via FK + canonical-register cleanup)
   - Drop all FalkorDB nodes with label in `(SourceDocument, SourceChunk, Idea, Concept, Person, Organisation, Methodology, ContentItem, LensReport)` *except* nodes from the politics import (preserved by `source` property filter)
   - Reset canonical register entries except politics
2. **Re-ingest phase** (manual, user-driven across one or more sessions):
   - Re-run Krisp scrape covering the full date range (extending back before March 2026 and forward to current)
   - Manually upload reports, pitch decks, datasets the user wants in the system
   - Each item flows through the new ingest pipeline (chunking + summary + embeddings + tag suggestions)
3. **Validate phase:**
   - Sample 5 sources of different types, verify summary quality, chunk boundaries, tag suggestions
   - Run one of each lens, verify per-item review flow + canonical resolution
   - Commit a representative report, verify graph + retrieval

## Out of scope

- **Sources page filter/search/sort UI improvements** — needed but next-pass work.
- **Auto-classification of source type** (INP-08) — manual for v1.
- **Voice note transcription** (INP-02) — separate feature.
- **Web/social scraping ingestion** (INP-06) — separate feature.
- **Custom lens creation UI** — 7 lenses are hardcoded for v1. Lens prompts live as schema docs and are editable, but adding a brand-new lens requires a code change (registering it in the lens registry) for v1.
- **Lens report editing after commit** — for v1, commit is one-way; re-running is the path to update. Editing committed reports is a v2 ergonomics improvement.
- **Multi-language extraction** — English only for v1.
- **`dataset` row-level extraction prompts** — for v1, datasets are stored and queryable but not lensed (no clear use case yet).
- **Cost/timing instrumentation per processing run** — useful but not essential for v1; existing `processing_runs.created_at` + `committed_at` give rough timing.
- **Contact-card edit history / versioning** — single current state for v1.
- **Re-summarisation history retention** — only the current summary kept for v1.
- **Backfill of `IDENTIFIED_IN` / `ANALYSED_FROM` edges for the 3 existing processing_runs** — not needed; those runs are wiped along with everything else.

## Resolved decisions (from brief approval)

- **Chunking rules:** `transcript` → per-speaker-turn. `document`/`research-document`/`report` → per-paragraph (with per-section-heading as a logical group above). `pitch-deck` → per-slide. `dataset` → no chunking (rows go in as nodes/edges/properties via the relevant ingestion script, not as `src_source_chunks`). `collection` → "chunks" are simply the `SourceItem` children, one embedding per item, no further sub-chunking. `internal-notes`/`voice-note`/`content-idea` → per-paragraph.
- **Inbox UI:** No separate Inbox page. A "NEW" label/badge on Sources that haven't been processed or reviewed. All sources stay in one place since they're repeatedly processable. Drops the three-space navigation model from INP-11; collapses to two (Sources + Results).
- **Canonical-resolution threshold (starting values):** cosine similarity ≥ 0.75 → "suggest as possible match" (shown but not pre-selected). ≥ 0.92 → "strong match" (visually emphasised, pre-selected for confirmation). Tune during re-ingest day.
- **Decision-support lens input:** Free-form textarea for the decision text. Lens prompt instructs the LLM to interrogate the corpus against the decision.
- **Embedding cost:** $5–$15 ceiling accepted. Stays on OpenAI `text-embedding-3-small` for v1; Gemini embedding evaluation deferred (separate decision at re-ingest day if cost or latency bites).

## Open questions / TBDs

- **[done 2026-05-04] Lens prompts:** 7 lens-prompt files in `01-design/schemas/lens-prompts/` — 3 ports from INP-11 with critical-pass refinements + 4 new lenses (`surface-extraction` refined, `catch-up`, `decision-support`, `content-ideas`).
- **[done 2026-05-04] Source-type schema fragments:** `_README.md` + `_base.md` + 12 source-type fragments in `01-design/schemas/extraction-schemas/`. `dataset` intentionally absent (per ADR-009 amendment).
- **[deferred to layout-design Pass 2]** Lens-review schema metadata format — fields, types, layout hints (`displayWeight`, `pairWith`, `sortBy`). Drafted during Pass 2 of layout-design.
- **[deferred to feature-build]** `<LensReportReview>` molecule spec finalisation (props, slots, schema-metadata interface). Sketch in Pass 2 layout spec; full spec at feature-build time when the renderer is being built.

## Decisions log

- 2026-04-30: Brief drafted. Source × Lens model adopted. 13 source types, 4 authorities, 7 lenses confirmed. `lens_reports` as new first-class table. Semantic chunking via `src_source_chunks` with FalkorDB mirror. Canonical resolution as UI step with multi-select relationship types and contact-card flow. Wipe-and-re-ingest decided over in-place migration. Brief blocked on KG-04 (politics graph port) — used as forcing function to complete that work first.
- 2026-04-30: Brief approved (still blocked on KG-04). Inline TBDs resolved: chunking rules per source type set; Inbox dropped in favour of "NEW" label on Sources (collapses navigation from 3 spaces to 2); canonical-resolution thresholds set to 0.75 suggest / 0.92 strong-match starting values; decision-support lens takes free-form textarea input; embedding stays on OpenAI `text-embedding-3-small` for v1 with Gemini evaluation deferred to re-ingest day if cost bites.
- 2026-04-30: Gate split clarified. KG-04 only blocks `feature-build` end-to-end and re-ingest day. ADRs, schema docs, migrations, lens prompts, source-type fragments, and `layout-design` are all ungated and proceed in parallel with KG-04.
- 2026-04-30 → 2026-05-02: Schema layer landed. ADR-002a + ADR-009 accepted. 4 schema docs approved. 4 Drizzle migrations generated + applied. `src_source_documents` and `processing_runs` wiped (70 + 3 rows; graph was already empty) before applying migrations to avoid backfill complications. End state: tables match schema docs exactly (verified via `information_schema` queries). Track A schema work done.
- 2026-05-02: One small migration-generation note for future reference — Drizzle's interactive prompt for `mode → lens` rename was answered as "create" (drop + add) rather than "rename" because the table was empty either way. End state is identical, but the snapshot now records `mode` as deleted and `lens` as a fresh column. Acceptable per ADR-009 (the columns are semantically distinct under the new vocabulary). If a future similar rename happens on a populated table, answer "rename" instead.
- 2026-05-04: Lens prompts (7) and source-type fragments (`_base.md` + `_README.md` + 12 source types) drafted. `dataset` intentionally absent from extraction-schemas — bypasses the lens path entirely (ingests via `kg-ingest-creator` SKL-12 to graph; queried by traversal, not lensed). ADR-009 amended to record `dataset` exception. Universal `unexpected[]` output field introduced in `_base.md` and added to all lens result schemas — gives the LLM a structured place to surface left-field observations the lens's frame couldn't see. `lens-reports.md` schema doc + 7 lens-prompt files updated to reflect this. INP-05 backlog entry rewritten to capture multi-modal PDF extraction requirements (text + visual; pitch-deck vs report-shape; vision-LLM dependency for INP-05 build).
- 2026-05-04: Layout architecture decisions made before any layout-design pass began (see "Layout architecture decision" section above). Two structural calls: (1) `layout-design` runs in three sequential passes — entry surfaces (Pass 1) → schema-driven lens-review surface (Pass 2) → committed lens report page (Pass 3); (2) one schema-driven `<LensReportReview>` molecule serves all 7 lenses, not seven per-lens panels — per-lens differences live in schema metadata (field types, layout hints) plus three bounded extension slots (prose-blob renderer, single-object renderer, canonical-resolution slot). Reduces panel-count from 7 to 1 with bounded extensibility, matches ADR-009's "adding a lens is a 4-step operation" goal. Pass 1 unaffected; the three-pass split was made to keep each `layout-design` invocation tractable and review-able. Decision driven by token-budget and review-fatigue concerns during this session — the 10-surface mega-spec was looking like multiple-hour read with high rework risk.
- 2026-05-04: Pass 2 layout approved. Spec at `01-design/wireframes/INP-12-pass2-layout.md`. Resolved: single review page at `/inputs/results?run=<id>` with conditional sibling switcher; single scrollable pane (no wizard) + InPageNav + sticky commit footer; section renderers switched by schema metadata (array / object / prose / object-with-array hybrid); `pairWith` metadata hint renders two array sections side-by-side at ≥1280px; canonical-resolution inline-on-row with lazy fuzzy-match and pre-fetched count badges, plus a one-click shortcut for the unique-strong-match-of-1 case; contact-card sub-form is Modal size `lg` and stages-not-writes (graph commit happens at review commit, not contact-card save); pre-flight commit prompt is three-way when unresolved People/Orgs exist (park & commit all / commit resolved only / cancel); `ConfidenceBadge` extended to accept state-driven values for analysis-lens `strength` vocabulary alongside surface-extraction `confidence`. Eight new molecules required: `LensReportReview`, `LensReviewSection`, `LensReviewItemCard`, `SourceChip`, `MultiSelectField`, `MarkdownEditor`, `MatchCandidateCard`, `ContactCardForm`. Five of those (`SourceChip`, `MultiSelectField`, `MarkdownEditor`, `MatchCandidateCard`, `ContactCardForm`) have reuse beyond INP-12. `CommitFooter` considered but inlined for v1. Schema-metadata format lives at `02-app/lib/lens-review/metadata/[lens-id].ts` (one file per lens). One candidate template flagged for post-build registration: `lens-report-review`.
- 2026-05-04: Pass 1 layout approved. Spec at `01-design/wireframes/INP-12-pass1-layout.md`. Resolved: source detail = full-page route at `/inputs/sources/[id]`; row click semantics = preview-on-body / detail-on-trailing-chevron-or-Cmd-click; bulk-triage = hybrid set-all bar + per-row in one `2xl` modal; lens picker = single modal serving bulk and single-source; `dataset` source type = distinct detail layout + disabled across the lens grid; tag chip styling = single fixed `TypeBadge` hue 3 (custard); description vs summary = description shown only when non-empty with "Add description" affordance; participants v1 = park-as-unresolved (`relationship_types: ['unresolved']`) until Pass 2's contact-card flow lands; default filter on entry = NEW when count > 0 else All. Five new molecules required (`SourceListRow`, `TagListEditor`, `ParticipantsPicker`, `DateField`, `LensPickerCard`) plus an `InlineWarningBanner` `info` tone extension; `TagListEditor` / `ParticipantsPicker` / `DateField` are reusable beyond INP-12. Two candidate templates flagged for post-build registration: `sources-inbox-list` and `source-detail-pane`.
- 2026-05-05: Pass 3 layout approved. Spec at `01-design/wireframes/INP-12-pass3-layout.md`. Resolved: page shape mirrors Pass 1's `source-detail-pane` candidate (PageHeader + InPageNav + sections Output → Metadata → Sources → Committed items → History) — page wraps the molecule with provenance metadata, not a thin shell; `mode='committed'` is "visually identical to review, interactive only for navigation, not state changes" with title and summary editing on the page (not inside the molecule) and per-item edit deferred to v2; **no Re-run affordance on the committed page in v1** (backlogged under INP-12 vNext — re-running on identical inputs creates duplicate `IDENTIFIED_IN` items with no item-cleanup-on-supersession yet; legitimate "regenerate before commit" lives on Pass 2, legitimate "wider source set" path is from `/inputs/sources` lens picker); list page = card grid (1/2/3/4-up responsive) with chip-based filter bar (lens + status only for v1, drafts excluded — they live on `/inputs/results`); default sort `committed_at desc`; superseded reports stay browsable with `InlineWarningBanner tone='info'` linking to latest; no archive/delete in v1 (graph-cleanup problem); page-level `[⋯]` menu has two items only ("View raw output (JSON)" + "Copy link"); Committed items section is display-only in v1 (graph-traversal routes don't exist yet); status-based redirect — `status='draft'` redirects from `/inputs/lens-reports/[id]` to `/inputs/results?run=[run_id]`; `surface-extraction` runs 404 the route (no `lens_reports` row by Pass 2 contract); auto-suggested-title display dropped (added clutter without enabling action). Two new molecules required: `LensReportCard` (INP-12-specific) and `FilterChipGroup` (broadly reusable). Three Pass 2 contract extensions to land at Pass 3 build time: footer suppression + per-item interactivity reduced to navigation-only + internal `InPageNav` collapses with host page providing nav. Two candidate templates flagged for post-build registration: `source-detail-pane` (now reinforced — Pass 3 is its second instance) and `lens-reports-archive-list` (new).

## Status / gate items

The work splits into two tracks. Track A's schema layer is now complete; remaining Track A items (prompts + layout) can be done in parallel with KG-04. Only re-ingest day and end-to-end `feature-build` are gated on KG-04.

### Track A — ungated (in progress)

**✅ Done (2026-04-30 → 2026-05-02):**
- ADR-002a: graph schema amendment for new node/edge types + soften no-AI-inference rule for source summaries/chunks (`00-project-management/decisions/adr-002a-graph-schema-amendment-source-lens.md`)
- ADR-009: Source × Lens model as a first-class architectural decision (`00-project-management/decisions/adr-009-source-lens-processing-model.md`)
- 4 schema docs approved: `src-source-chunks.md`, `lens-reports.md`, `src-source-documents.md` (v3), `processing-runs.md`
- 4 Drizzle schema files written/updated: `02-app/lib/db/schema/source.ts` (v3), `source-chunks.ts` (new), `lens-reports.ts` (new), `inputs/processing-runs.ts` (v3)
- 4 migrations generated and applied to dev DB:
  - `0032_inp12_source_docs_v3.sql`
  - `0033_inp12_source_chunks.sql`
  - `0034_inp12_lens_reports.sql`
  - `0036_inp12_processing_runs_v3.sql`
- `src_source_documents` and `processing_runs` wiped (70 docs + 3 runs deleted) so migrations could run cleanly without backfill complications. Graph was already empty (no nodes had been committed).

**✅ Done (2026-05-04):**
- Lens prompts: 7 lens-prompt files + `_README.md` written and approved-as-draft in `01-design/schemas/lens-prompts/`. 3 ports from INP-11 (`pattern-spotting`, `self-reflective`, `project-synthesis`) with critical-pass refinements; 4 new lenses drafted (`surface-extraction`, `catch-up`, `decision-support`, `content-ideas`).
- Source-type schema fragments: `_README.md` + `_base.md` + 12 source-type fragments in `01-design/schemas/extraction-schemas/`. `dataset` is intentionally absent — has no extraction-schema fragment because datasets bypass the lens path entirely (see ADR-009 amendment).
- `_base.md` introduces the universal `unexpected[]` output field that every lens emits (left-field-observation channel). `lens-reports.md` schema doc updated to reflect this. The 7 lens-prompt files cross-reference it.
- ADR-009 amended to record `dataset` exception and the `LensNotApplicableError` runtime requirement.
- INP-05 backlog entry rewritten to capture the multi-modal PDF extraction requirement (text + visual content; report-shaped vs deck-shaped extraction; vision-LLM dependency for pitch decks).

**✅ Done (2026-05-04):**
- `layout-design` Pass 1 — entry surfaces (Sources page NEW filter chip + side preview, bulk-triage modal, source detail page at `/inputs/sources/[id]`, lens picker modal with `dataset` disabled state). Spec at `01-design/wireframes/INP-12-pass1-layout.md`. Five new molecules identified for build: `SourceListRow`, `TagListEditor`, `ParticipantsPicker`, `DateField`, `LensPickerCard`. Plus `InlineWarningBanner` `info`-tone extension. Two candidate templates flagged for post-build registration: `sources-inbox-list`, `source-detail-pane`.

**✅ Done (2026-05-04, second pass):**
- `layout-design` Pass 2 — schema-driven `<LensReportReview>` molecule (one component for all 7 lenses via metadata + 4 renderers including `object-with-array` hybrid), canonical-resolution micro-UI (inline-on-row + lazy fuzzy-match + pre-fetched counts), contact-card modal (Person + Organisation, stages-not-writes). Spec at `01-design/wireframes/INP-12-pass2-layout.md`. Eight new molecules required at build time. One candidate template flagged: `lens-report-review`.

**✅ Done (2026-05-05):**
- `layout-design` Pass 3 — committed lens-report page at `/inputs/lens-reports/[id]` (full-page mirroring Pass 1's `source-detail-pane` candidate; PageHeader with editable title + InPageNav + sections Output → Metadata → Sources → Committed items → History) + lens-reports list page at `/inputs/lens-reports` (responsive 1/2/3/4-up card grid + chip-based filter bar for lens type + status). Spec at `01-design/wireframes/INP-12-pass3-layout.md`. Two new molecules required at build time: `LensReportCard`, `FilterChipGroup` (the latter broadly reusable). Three Pass 2 contract extensions to land at Pass 3 build time (additions to existing `mode` prop behaviour, not new molecules): footer suppression, per-item interactivity reduced to navigation-only, internal `InPageNav` collapses with the host page providing nav. Two candidate templates flagged for post-build registration: `source-detail-pane` (now reinforced — Pass 3 is its second instance after Pass 1's source detail) and `lens-reports-archive-list` (new). Re-run-on-committed-report deliberately deferred and backlogged under INP-12 vNext.

**⏳ Remaining:**
- Optional: build the new ingest pipeline (chunking + summary + embeddings) so new Krisp transcripts arriving incrementally get the new shape, even before KG-04 lands. Lens layer stays dormant until canonical resolution can run against politics.

**Track A complete** for prose + design (ADRs, schema docs, migrations, prompts, fragments, all three layout passes). Remaining work is feature-build, gated on KG-04.

### Implementation follow-ups (for the INP-12 build pass)

These are gaps and additions surfaced during Track A prompt-and-fragment work that need to land together when feature-build picks up. Sequencing inside this list is flexible; doing them as a single coordinated pass is the point — partial application leaves the schema and prompts misaligned.

1. **Add `sourceRefs: string[]` to every extracted item type in `extractionResultSchema`** at `02-app/lib/types/processing.ts:111-119`. Each of `ExtractedIdea`, `ExtractedConcept`, `ExtractedPerson`, `ExtractedOrganisation`, `ExtractedStory`, `ExtractedTechnique`, `ExtractedContentAngle` needs the field. Required by `surface-extraction` lens prompt's universal contract.

2. **Add missing `sourceRefs[]` to `projectSynthesisSchema`** at `02-app/lib/types/processing.ts`. Currently missing on: `whatDidntWork`, `reusablePatterns`, `methodology.steps`, `openThreads`. Asymmetric provenance (only `whatWorked` had refs) was a real INP-11 gap; ports surfaced it.

3. **Add missing `sourceRefs[]` to `reflectiveAnalysisSchema`**:
   - `energyAndMomentum` — add `sourceRefs: string[]` to support the energy reading's source-text anchors
   - `keyRealisations.session` — change from single `string` to `sourceRefs: string[]` array, supports realisations that surface across multiple sessions

4. **Add the universal `unexpected` field to every lens result type** as the last field:
   ```ts
   unexpected: Array<{
     observation: string,
     why: string,
     sourceRefs: string[],
   }>
   ```
   Applies to: the new `PatternSpottingResult`, `SelfReflectiveResult`, `ProjectSynthesisResult`, plus the new `CatchUpResult`, `DecisionSupportResult`, `ContentIdeasResult` types. Defined in `01-design/schemas/extraction-schemas/_base.md`.

5. **Surface-extraction unexpected-items storage**. Surface-extraction does not produce a `LensReport`, so its `unexpected[]` array can't attach there. Add a `unexpected jsonb` column to `processing_runs` (default `'[]'::jsonb`), populated only when `lens='surface-extraction'`. Per-item review UI surfaces these alongside the regular extracted items for individual commit/discard.

6. **TypeScript type renames** per ADR-009 §Consequences:
   - `BatchAnalysis` → `PatternSpottingResult`
   - `ReflectiveAnalysis` → `SelfReflectiveResult`
   - `ProjectSynthesis` → `ProjectSynthesisResult` (already roughly aligned; confirm)
   Update all importers across the codebase.

7. **Add `ingestionLogId` field to `src_source_documents`**. New nullable uuid FK → `ingestion_log.id`. Populated for `dataset` sources only — the bridge between the front-end source row (a dataset is visible/findable in the app) and the technical record of how it became kg nodes/edges (`kg-ingest-creator` SKL-12 output). Generate a new Drizzle migration; `ingestion_log` table already exists per kg-ingest-creator skill.

8. **Lens prompt composer must raise `LensNotApplicableError`** when called with `sourceType === 'dataset'`. Fail loud, not silent. Lens picker UI surfaces the error/disabled state with a link to the source's graph view (per layout-design).

9. **`src_source_chunks` image-attachment field** (forward compatibility for INP-05). Add either `imageRefs: text[]` (Vercel Blob URLs of attached images per chunk) or `imageDescription: text` (vision-LLM-generated text description as the chunk's effective text content) or both. Decision deferred to INP-05 design pass — flagging here so the schema change happens at the same time as the rest, not later. Pitch-deck and research-document fragments already assume this is coming.

10. **Build-time fragment validator**. Per ADR-009, the runtime asserts every source type in the controlled vocabulary (except `dataset`) has a registered fragment file in `01-design/schemas/extraction-schemas/`, and every lens has a registered file in `01-design/schemas/lens-prompts/`. Implement as a script run at app startup or in CI; missing fragment files are deployment errors, not runtime errors.

Cross-reference: this list is summarised in the INP-12 backlog entry pointing back here.

### Track B — gated on KG-04

- Canonical-resolution UI lighting up properly (depends on politics nodes being in the graph)
- Re-ingest day for fresh Krisp transcripts + new sources (reports, pitch decks, datasets) under the new shape
- `feature-build` of the full Source × Lens flow end-to-end

### Other prerequisites

- Backlog dependencies confirmed (this work doesn't block anything currently active in M4)
