# Session log — 2026-05-04 — INP-12 Track A prompts + layout architecture
Session ID: 2026-05-04-inp12-track-a-prompts-q9k

## What we worked on

- **INP-12** Track A: lens prompts + source-type fragments + universal `unexpected[]` field + layout architecture decisions
- **INP-05** backlog entry rewritten (multi-modal PDF extraction)
- **ADR-009** amended (`dataset` exception)

Continuation of `2026-05-02-inp12-source-lens-design-k7p` (which closed Track A's schema layer).

## What was done

### Lens prompts — 8 files in `01-design/schemas/lens-prompts/`

- `_README.md` — composition contract, file structure, universal `sourceRefs` rule (source ids only, never titles), how `unexpected[]` extends from base
- `surface-extraction.md` — refined from INP-11 `processing` prompt. Lifted brand identity to base; added explicit `sourceRefs` rule; added "no silent canonical resolution" rule; verbatim-quote rule for `sourceQuote`
- `pattern-spotting.md` — port of `batchAnalysis`. Schema unchanged; added `summary` requirement to flag thin/similar corpora loudly; gaps now ask for fill suggestions; authority context made explicit
- `self-reflective.md` — port of `reflectiveAnalysis`. Added explicit banned-coaching-jargon list; `emergingThemes.trajectory` typed as enum; `keyRealisations.session` changed to `sourceRefs[]` array; `metaAnalysis` framing strengthened with explicit allowance for skepticism of the practice; `energyAndMomentum.sourceRefs` added
- `project-synthesis.md` — port of `projectSynthesis`. Added `sourceRefs[]` to `whatDidntWork`, `reusablePatterns`, `methodology.steps`, `openThreads` (asymmetric provenance was a real INP-11 gap); methodology framing strengthened (descriptive, not prescriptive); voice-matching guidance for `caseStudyNarrative` made concrete
- `catch-up.md` — new lens. Takes `since` lens input (free-form). 5 result keys (summary, whatChanged, newDevelopments, whoSaidWhat, unresolvedFromLastTime)
- `decision-support.md` — new lens. Takes `decisionText` lens input. Adds explicit decision-framing detection (binary/multi-option/open) + pushback against fake-balanced output
- `content-ideas.md` — new lens. Hunts cross-source angles. Bans clichés, requires concrete audiences, flags `crossSource: true` for emergent angles

### Source-type fragments — 14 files in `01-design/schemas/extraction-schemas/`

- `_README.md` — composition contract, dataset exception, file structure
- `_base.md` — universal base prompt: business context (NicelyPut, defence/robotics/reshoring client bias, sources spanning research/personal/coaching), quality bar, corpus header format spec (`--- SOURCE: <id> | <title> | <date> | <source_type> | <authority> ---`), confidence vocab, universal `sourceRefs` contract, no-invent rule, **the universal `unexpected[]` output field**
- 12 source-type fragments — `client-interview`, `coaching-call`, `peer-conversation`, `supplier-conversation`, `accountability-checkin`, `meeting-notes`, `internal-notes`, `research-document`, `pitch-deck`, `report`, `collection`, `content-idea`. Each with default authority, chunking strategy, default surfaces, prompt fragment (under 300 words target), edge cases. Distinct extraction biases per type — e.g. client-interview biases toward client's contributions over Ellie's questions; peer-conversation extracts from both speakers as mutual sources
- **`dataset` intentionally absent** — datasets bypass the lens path; ingest via `kg-ingest-creator` (SKL-12) directly to graph, queried by traversal not lensed

### Universal `unexpected[]` field

A new structural primitive added across the system:

- Defined in `_base.md` as a top-level output field every lens emits. Bar: "genuinely worth surfacing", not "fill the field"; empty array is the typical right answer
- Cross-referenced from the 7 lens-prompt files (Output schema TypeScript blocks)
- Added to `lens-reports.md` schema doc (top-level `result` keys table updated for all 6 analysis lenses; surface-extraction's `unexpected[]` storage location flagged for INP-12 build pass — likely a `processing_runs.unexpected jsonb` column)
- Lens-prompts `_README.md` updated to document it as part of the composition contract
- Origin: user observation that the model should always be given room for left-field insights regardless of the lens's frame; cross-cutting application was the natural shape

### Schema doc and ADR updates

- `lens-reports.md` (`01-design/schemas/lens-reports.md`) — `result` shape table updated to include `unexpected[]` on every lens; `sourceRefs` clarified as ids only with the gaps-omit-refs exception called out
- `adr-009-source-lens-processing-model.md` — amended in two places: §"Source types" subsection added explaining `dataset` has no fragment + `LensNotApplicableError` runtime requirement + `ingestionLogId` field forward-flag; §"What was ruled out" gained a row for "lensing dataset sources"

### INP-05 backlog rewrite

Existing one-line stub ("Upload PDFs, CSVs, JSON, markdown. Type-specific extraction") expanded substantially in `00-project-management/backlog.md`:

- Distinguishes report-shaped (linear text + per-page images as supporting context for charts/diagrams) from deck-shaped (per-slide chunking with vision-LLM-generated descriptions combining text + visual)
- Names the constraint: naive PDF→text path is insufficient; vision-capable LLM is required for pitch decks especially
- Notes Ellie has prior work in a separate mini-project to port from
- Flags `src_source_chunks` schema follow-up (image-attachment field) as Track B INP-12 work
- Routes CSV/JSON datasets explicitly to `kg-ingest-creator` SKL-12, not this feature

### Brief updates — `01-design/briefs/INP-12-source-lens-processing.md`

- §"UI/UX notes" updated — added lens-picker disabled state for `dataset`, schema-driven review surface, canonical-resolution-as-slot framing
- **§"Layout architecture decision" added** — full rationale for the two structural calls (3-pass `layout-design` split + schema-driven `<LensReportReview>` molecule). Documents the architecture (1 main molecule + 3 extension slots + schema-metadata convention with layout hints), the ADR-009 alignment ("adding an 8th lens is a 4-step operation"), and the caveat about hint-bounds (when hints aren't enough, reach for a slot, not a fork)
- §"Implementation follow-ups" — 10-item list added for the INP-12 build pass. Covers `sourceRefs` additions across multiple TypeScript schemas, universal `unexpected[]` field rollout, `processing_runs.unexpected` jsonb column, type renames (`BatchAnalysis` → `PatternSpottingResult` etc.), `src_source_documents.ingestionLogId`, `LensNotApplicableError` for dataset sources, `src_source_chunks` image-attachment field (INP-05 forward compat), build-time fragment validator. Single coordinated pass — implementing piecemeal would leave schema + prompts misaligned
- §"Open questions / TBDs" — lens prompts and source-type fragments TBDs marked done; lens-review schema metadata format and `<LensReportReview>` molecule spec deferred to future passes
- §"Decisions log" — two new entries (2026-05-04) covering the prompt+fragment work and the layout architecture decisions

### Backlog INP-12 entry update

`00-project-management/backlog.md` INP-12 entry rewritten:

- Status updated: track A schema layer + lens prompts + source-type fragments done; layout-design remaining
- Track A done block expanded with the new artefacts
- Track A remaining block converted to the **3-pass `layout-design` plan** with each pass's scope listed
- "Implementation follow-ups" pointer added — references the brief's 10-item list with one-line summaries to make it visible at status-check time

## Decisions made

- **Universal `unexpected[]` output field on every lens.** Decision driven by the observation that lenses are intentionally narrow (pattern-spotting looks for patterns, decision-support looks for evidence) but real intelligence often shows up at the edges. Rather than per-lens "anything else?" framing, one structural channel across the system. Stored in `_base.md` because it's universal; surface-extraction's storage path is the open question (most likely a new `processing_runs.unexpected jsonb` column at build time, since surface-extraction doesn't write a `LensReport`).
- **Strip brand identity from per-lens prompts; centralise in `_base.md`.** The INP-11 prompts hardcoded the NicelyPut context in every prompt. Single edit point + cleaner per-lens prompts. The base now carries 2–3 sentences of business context (consultancy + client domain bias + work span) — kept tight to avoid datedness; can later be sourced from `dna_business_overview` at runtime.
- **Standardise `sourceRefs` on source ids (UUIDs), never titles or dates.** INP-11 said "by title or date"; titles drift, dates aren't unique. Commit-time edge writing depends on a stable key. Universal contract in `_base.md`.
- **`dataset` source-type stays in the controlled vocabulary but has no extraction-schema fragment.** Datasets are structured rows where analysis comes from graph traversal, not LLM reading. LLM lensing of a CSV would either summarise the schema (low value) or fabricate patterns from a row preview (negative value). The `src_source_documents` row still gets created so datasets are visible in the front-end, with a future `ingestionLogId` field bridging to `kg-ingest-creator`'s `ingestion_log` row. Captured in ADR-009 amendment + extraction-schemas `_README.md`.
- **Three-pass `layout-design` split**, not one mega-spec. Pass 1 = entry surfaces (Sources, bulk-triage, source detail, lens picker); Pass 2 = lens-review surface + canonical-resolution + contact-card; Pass 3 = committed lens report page. Driven by token-budget and review-fatigue concerns; the 10-surface mega-spec was looking like a multi-hour read with high rework risk. Each pass is its own `layout-design` invocation. Pass 1 deferred to fresh session at session close.
- **One schema-driven `<LensReportReview>` molecule, not seven per-lens panels.** UI shape (sections of items, edit/confirm/reject affordances, commit footer) is identical across lenses; differences are bounded (section names, field types, three special cases). One main molecule + three extension slots (prose-blob, single-object, canonical-resolution) + schema-metadata convention with layout hints (`displayWeight`, `pairWith`, `sortBy`). Adding an 8th lens becomes "write a schema-metadata file" not "build a panel". Caveat documented: if hints don't suffice, reach for a new slot, not fork the panel.
- **No new ADRs needed this session.** ADR-009 was amended (the right move — preserves audit trail without inflating ADR count). All other decisions are captured in load-bearing docs (brief sections, schema docs, prompt fragments) where they operate. The schema-driven `<LensReportReview>` decision is feature-scoped (lives in the brief), not system-wide architecture.

## What came up that wasn't planned

- **Mid-session orientation question**: Ellie asked for a refresher on the four input modalities (Krisp / documents / datasets / collections) and how their flows differ today vs after INP-12 ships. Surfaced that the dataset flow lives outside the app entirely (terminal-driven `kg-ingest-creator` skill) — fine for v1 but worth flagging as a future product question if she wants the dataset upload UX inside the Next.js app one day. Noted in conversation, not yet a backlog entry.
- **PDF extraction reality check.** Ellie flagged that text-only PDF extraction will miss visual content, especially for pitch decks. Triggered the INP-05 backlog rewrite — the existing entry was a one-line stub that buried this. Now substantively scopes the multi-modal extraction work, flags the vision-LLM dependency, and points to her prior mini-project as a porting candidate.
- **Dataset removal from the lens path.** During the source-type-fragment proposal, Ellie pushed back: "do we just need to remove `dataset` from the lens approach altogether?" Triggered an honest reassessment — yes, structured data is for graph traversal, not LLM reading. Resulted in: ADR-009 amendment, `dataset` absent from extraction-schemas, runtime `LensNotApplicableError` requirement, `ingestionLogId` field forward-flag, lens-picker disabled-state UI requirement.
- **One-pluggable-layout challenge during scoping.** Ellie asked: "Why do we need 7 different layouts rather than one pluggable/adaptable layout?" Triggered a re-think — the seven-panel framing conflated data shape with UI shape. Resulted in the schema-driven `<LensReportReview>` decision. Material outcome: Pass 2 of `layout-design` shrank from "design 7 panels + canonical resolution + contact card" to "design 1 molecule + 3 slots + schema-metadata convention". Substantial maintenance and extensibility win.

## Backlog status changes

- **INP-12** — status updated: Track A "schema layer + lens prompts + source-type fragments + universal unexpected[] field" all done; layout-design Pass 1 next. Track A remaining now scoped as 3 sequential passes. Implementation follow-ups (10-item list) added to brief, pointer in backlog.
- **INP-05** — entry rewritten substantially. Status remains `planned`. Now genuinely scopes the work needed (multi-modal PDF extraction, vision-LLM dependency, two-shape extraction for reports vs decks, port from prior mini-project).

No other backlog entries touched this session.

## What's next

**Track A remaining for INP-12:**

- **`/layout-design` Pass 1** (entry surfaces) — Sources page (NEW label + filter chip), bulk-triage flow, source detail view, lens picker (with disabled state for `dataset` sources). **Run in fresh session** to keep context clean. Suggested invocation prompt: `/layout-design INP-12 Pass 1 (entry surfaces only): Sources page NEW label + filter chip, bulk-triage flow, source detail view, lens picker. See brief §"Layout architecture decision" — this is Pass 1 of 3.`
- **`/layout-design` Pass 2** (lens-review surface) — schema-driven `<LensReportReview>` molecule + canonical-resolution slot + contact-card sub-form. Ideally runs after at least one real lens output exists for tuning, but not a hard prerequisite.
- **`/layout-design` Pass 3** (committed lens report page) — final UI surface; smaller than originally scoped because the review surface from Pass 2 supplies most of the rendering.

**BUG-01** still open — mechanical `type → sourceType` rename across ~8 files. Blocks `next build` and Vercel deploy. ~30 min focused fix. Not blocking Track A but blocking deploy. Worth doing before any further code lands.

**Track B (gated on KG-04):**

- Canonical-resolution UI lighting up properly (depends on politics nodes)
- Re-ingest day for fresh Krisp transcripts + new sources
- `feature-build` of the full Source × Lens flow end-to-end — must implement the **brief §"Implementation follow-ups" 10-item list as a single coordinated pass**

## Context for future sessions

- **The 10-item INP-12 implementation follow-up list is in the brief at §"Implementation follow-ups"**. This is the must-read for whoever picks up `feature-build`. Implementing piecemeal (e.g. doing the type renames without the `sourceRefs` additions, or adding `unexpected[]` to one lens result type without the others) leaves the schema and prompts misaligned in subtle ways. Treat the list as one atomic unit of work.
- **`dataset` is the only source-type without an extraction-schema fragment**. The runtime check (`LensNotApplicableError`) is currently a TODO — the lens prompt composer doesn't exist yet, but when it's built, the rejection of `sourceType === 'dataset'` must be in it from day one. The lens picker UI must also gate this state, per Pass 1 layout-design scope.
- **The universal `unexpected[]` field is structural, not optional**. Every lens result type must include it; the LLM is instructed to populate it (often empty) on every run. The per-item review UI must surface these alongside the regular extracted items for individual commit/discard.
- **The schema-driven `<LensReportReview>` molecule is the architecture decision for Pass 2**. Future sessions might be tempted to write per-lens panels because the data shapes look different. Read brief §"Layout architecture decision" before reaching for that — the differences are bounded and a schema-driven molecule with three extension slots is the agreed shape. Forking creates seven fragile codebases.
- **PDF extraction for INP-05 needs the vision-capable LLM path.** Pitch-deck and research-document fragments already assume per-chunk image attachments will be available; the `src_source_chunks` schema does not yet have that field. Adding it is in the INP-12 implementation follow-ups (item 9) for forward-compatibility.
- **The brief at `01-design/briefs/INP-12-source-lens-processing.md` is the load-bearing document** for everything INP-12. ADR-009 is the architecture audit trail. Schema docs (`src-source-documents.md`, `src-source-chunks.md`, `lens-reports.md`, `processing-runs.md`) are the data shape. Lens prompts and extraction-schema fragments are the prompt composition contract. Keep these consistent on every change.

## Skill updates this session (Step H)

No SKILL.md changes proposed this session. The skills used (`feature-build` was not invoked; `layout-design` was invoked but deferred to fresh session before reaching Step D; `session-log` is being invoked now) all behaved as expected. No friction encountered worth retrofitting.

One observation worth flagging without proposing a change: `layout-design` does not have a built-in concept of "this feature is too large for one pass; tier it". The pass-tiering decision was made conversationally during the skill's Step A. If multi-pass scoping turns out to be common (it might, for any feature with many UI surfaces), `layout-design` Step A could grow a "scope assessment" sub-step that flags when a feature should be tiered. Not proposing the change yet — one data point isn't a pattern. Reassess if a second multi-surface feature hits the same scoping constraint.
