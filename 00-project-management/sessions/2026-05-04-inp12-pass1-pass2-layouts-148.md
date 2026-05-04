# Session log — 2026-05-04 — INP-12 Pass 1 + Pass 2 layouts
Session ID: 2026-05-04-inp12-pass1-pass2-layouts-148

## What we worked on

- **INP-12** Track A: `layout-design` Pass 1 (entry surfaces) + Pass 2 (lens-review surface)

Continuation of `2026-05-04-inp12-track-a-prompts-q9k` (which closed lens prompts + source-type fragments and made the layout architecture decisions). That earlier session set up: 3-pass split, single schema-driven `<LensReportReview>` molecule for all 7 lenses, 3 extension slots — Pass 2 was scoped against that commitment.

## What was done

### Pass 1 layout — entry surfaces (`01-design/wireframes/INP-12-pass1-layout.md`)

Covers four surfaces:

- **Sources page** at `/inputs/sources` — list with NEW/All/Triaged filter pills, source-type and authority filters, search input, side preview pane (480px). Selection bar with Triage / Run lens / Delete. URL-state-persisted filters.
- **Quick-preview pane** — 480px right-side panel for in-place scanning. Title + meta + summary + first 5 chunks + footer with Open full view / Run lens.
- **Source detail page** at `/inputs/sources/[id]` — full-page route with PageChrome (subheader: ← All sources + NEW indicator + Mark as triaged), InPageNav (w-36) + 5 sections (Metadata · Summary · Chunks · Processing history · Linked lens reports). Special-case layout for `dataset` source type (no lens, no chunks list, "Open in graph" instead of "Run lens").
- **Bulk-triage modal** — `2xl` Modal with hybrid set-all bar (source-type + authority only) + per-source list (each row gets its own type/authority/tags/participants controls).
- **Lens picker modal** — `lg` Modal with 3-col grid of `LensPickerCard` tiles. Per-lens disabled states (e.g. `pattern-spotting` needs ≥2 sources). Lens-input slot for `decision-support`. Whole grid disabled when source set is dataset-only.

Five new molecules required at build:

- `SourceListRow`
- `TagListEditor` (reusable beyond INP-12)
- `ParticipantsPicker` (reusable; v1 supports park-as-unresolved Persons via `relationship_types: ['unresolved']`)
- `DateField` (reusable — InlineField-parity date input)
- `LensPickerCard`

Plus `InlineWarningBanner` `info`-tone extension.

Two candidate templates flagged for post-build registration: `sources-inbox-list`, `source-detail-pane`.

### Pass 2 layout — lens-review surface (`01-design/wireframes/INP-12-pass2-layout.md`)

Covers three pieces, all served by one schema-driven molecule:

- **`<LensReportReview>`** — schema-driven review surface at `/inputs/results?run=<runId>`. Single page (no wizard) with InPageNav (w-44) + sticky commit footer. Section renderers switched by metadata: `array` (most common) / `object` (decisionFraming, energyAndMomentum) / `prose` (summaries, caseStudyNarrative) / `object-with-array` (methodology hybrid). `unexpected[]` always last.
- **Canonical-resolution micro-UI** — inline-on-row inside surface-extraction's Person/Org rows. Lazy fuzzy-match with pre-fetched count badges (`[Resolve · 2 strong matches]`). Click expands the row to show match candidates + "+ Create new" + "Park as unresolved". One-click shortcut for unique-strong-match-of-1 case.
- **Contact-card sub-form** — `lg` Modal opened from canonical-resolution slot. Person + Organisation forms with multi-select relationship types + contact-card fields. **Stages-not-writes**: graph commit happens at overall review commit, not contact-card save.

Per-section `(N/M)` confirmed-of-total counters in the InPageNav. Item-card states: unreviewed / confirmed / rejected / needs-attention. `pairWith` metadata hint renders two array sections side-by-side at ≥1280px (e.g. `evidenceFor`/`evidenceAgainst`).

Pre-flight commit prompt is three-way when unresolved People/Orgs exist: park & commit all / commit resolved only / cancel.

Surface-extraction commits to graph directly; analysis lenses commit to `lens_reports` row + IDENTIFIED_IN/ANALYSED_FROM edges.

Eight new molecules required at build:

- `LensReportReview` (root render tree)
- `LensReviewSection` (internal — single-section renderer)
- `LensReviewItemCard` (internal — single item card)
- `SourceChip` (reusable — chat citations, lens-report cards, retrieval results)
- `MultiSelectField` (reusable — form-context multi-select with envelope)
- `MarkdownEditor` (reusable — session log, content drafts, narrative fields)
- `MatchCandidateCard` (reusable — future People/Org admin)
- `ContactCardForm` (reusable — future People/Org admin)

Plus `ConfidenceBadge` extended to accept state-driven values (so analysis-lens `strength: strong|moderate|weak` reuses the same molecule as surface-extraction's `confidence: high|medium|low`).

`CommitFooter` was considered but inlined for v1 (promote on second consumer).

Schema-metadata format: one file per lens at `02-app/lib/lens-review/metadata/[lens-id].ts`. Drives the schema-driven panel. Format sketched in the spec; full TypeScript types finalised at feature-build.

One candidate template flagged: `lens-report-review`.

### Brief + backlog updates

- Brief (`01-design/briefs/INP-12-source-lens-processing.md`) — added "Pass 1 layout — approved" and "Pass 2 layout — approved" sub-sections under UI/UX notes; both passes added to the decisions log; Track A's "Done" list extended to include Pass 1 + Pass 2; Track A's "Remaining" line now reads only Pass 3.
- Backlog (`00-project-management/backlog.md`) — INP-12 entry's Track A remaining list updated to mark Pass 1 + Pass 2 done with their respective molecule lists and template candidates. Pass 3 noted as smaller in scope (reuses Pass 2's `LensReportReview` in `mode='committed'`).

## Decisions made

Pre-drafting question-and-answer rounds were used in both passes (3 questions for Pass 1, 4 for Pass 2). Resolutions captured in the spec files; key ones:

**Pass 1:**

- Source detail = full-page route at `/inputs/sources/[id]`, not a drawer or in-place pane. Deep-linkable; back link to filtered list.
- Row click semantics: body click opens 480px quick-preview; trailing chevron / Cmd-click navigates to detail. Two affordances preserve the inbox-scan rhythm.
- Bulk-triage = hybrid set-all bar (source-type + authority only) + per-row controls in one `2xl` modal.
- Tag chip styling = single fixed `TypeBadge` hue 3 (custard) for visual quiet.
- `description` field on detail shown only when non-empty + "Add description" affordance otherwise.

**Pass 2:**

- One run per page with conditional sibling switcher when `pendingRunCount > 1` (option c). Avoids master-detail overhead when most reviews are singletons.
- Single scrollable pane (option a), not stepped wizard. Matches non-linear review behaviour.
- Canonical resolution is inline-on-row (option a), not popover or side-pane. Keeps surrounding context visible during the resolution decision.
- Match results are lazy-loaded with a pre-fetched count (option b), not eagerly rendered. Balances cost/latency against discoverability.
- `ConfidenceBadge` extended to accept state-driven values (rather than introducing a new `ItemQualityBadge` molecule).
- Contact-card modal **stages-not-writes**: new Person/Org goes to local state and the graph write happens only at overall review commit. Important UX-and-architecture call — affects implementation by requiring a "staged new entities" registry the canonical-resolution slot reads from alongside graph entities for the lifetime of the review.

No decisions met the ADR bar — all are layout/UX-level. Architecture-level decisions (Source × Lens model, 3-pass layout split, single schema-driven panel) were captured earlier in ADR-009 and the brief.

## What came up that wasn't planned

- **Two `atomic_lounge` reference files** in the working tree (`AL_angle_candidates_2026-05-04.md`, `AL_file1_thesis_2026-05-04.md`) are not from this session. They appear to be reference docs from another window's work. Surfaced here per session-log Step I; left unstaged.
- **Templates not yet registered.** Three candidate templates emerged across Pass 1 + Pass 2 (`sources-inbox-list`, `source-detail-pane`, `lens-report-review`). Per skill convention they're flagged for post-build registration once the patterns prove themselves on real usage — not registered pre-emptively.
- **Schema-metadata format will need re-tuning during re-ingest day.** Pass 2 designs the metadata-driven panel without seeing real LLM output. Surfaced in the spec as a known caveat. The format sketched is the contract; layout-hint shape may evolve once actual lens output reveals failure modes.

## Backlog status changes

- **INP-12** — Track A: Pass 1 + Pass 2 layout-design moved to done. Track A remaining is now just Pass 3 (smaller in scope). Track B still gated on KG-04.

No other features touched this session.

## What's next

Three layout passes complete (Pass 3 outstanding). Pass 3 covers:

- Committed lens-report page at `/inputs/lens-reports/[id]` — reuses `LensReportReview` in `mode='committed'`. Mostly designs the surrounding page chrome (PageChrome / supersession affordances / re-run from committed).
- Lens-report list page at `/inputs/lens-reports` — minor surface; likely reuses `sources-inbox-list` template if registered.

Pass 3 is materially smaller than 1 or 2 because the rendering is supplied by Pass 2's molecule. Best run in a fresh session per the brief's note about token budget.

After Pass 3:

- `feature-build` for INP-12 unlocks once KG-04 (politics graph port) lands. Build will consume 13+ new molecules across Passes 1+2+3 plus the `InlineWarningBanner` and `ConfidenceBadge` extensions. Schema-metadata format files (`02-app/lib/lens-review/metadata/[lens-id].ts`, one per lens) need to land before the `<LensReportReview>` molecule itself, since they're the contract it reads.
- Re-ingest day comes after `feature-build`. That's where the schema-metadata format gets pressure-tested against real LLM output.

Open structural follow-ups (recorded in the specs):

- Pre-fetch endpoint for canonical-match counts should be batched (single endpoint taking `[{name, entityType}, ...]` returning per-row counts) rather than N small queries. Implementation detail for feature-build.
- Staged-new-entities concurrent-review edge case (two windows committing same-name Persons): not handled at v1; documented in the spec.

## Context for future sessions

- **Brief is approved; layout work is the only Track A item still open.** Pass 3 closes Track A. After that, all of Track A is locked and feature-build can be planned (gated on KG-04).
- **Templates not yet registered, but flagged.** When `feature-build` ships and the patterns prove themselves, Pass 1's `sources-inbox-list` and `source-detail-pane`, plus Pass 2's `lens-report-review`, should be registered as templates. Multiple sources-style features in the backlog will benefit (ideas backlog, future Krisp queue, lens-reports list).
- **Molecule count for INP-12 build is high.** 13+ new molecules across the passes. Building them as a batch (with proper specs landing in `design-system.md` before any organism imports them) is the right approach. Per the design-system gate, no organism imports an unspecced molecule. Sketches in the layout specs are sufficient for the gate at plan time; full specs are written during build.
- **Schema-metadata format is contract-only at this stage.** Format shape sketched in Pass 2 spec but final TypeScript types live in feature-build. The contract is: one file per lens at `02-app/lib/lens-review/metadata/[lens-id].ts`, sections array with `renderer` switch, layout hints (`primaryField`, `sortBy`, `pairWith`, `displayWeight`), and a registry index that maps lens id → metadata.
- **Conversational pre-drafting question rounds worked well** in both passes. Surfacing 3–4 structural questions to the user before drafting the spec saved time and avoided drafting against guesses. Worth retaining as a habit when running `layout-design` against complex multi-surface passes.

## Self-improvement notes

No skill changes proposed this session. Two minor observations recorded in the Pass 2 spec's Step G section but not actioned:

1. `feature-brief` skill could prompt for "any sub-form / nested-form patterns?" — Pass 2's contact-card-inside-canonical-resolution-inside-row pattern was structurally novel and earlier flagging would have helped scoping. Low-priority.
2. `layout-design` skill could include an optional "metadata format" spec sub-section when the feature is genuinely metadata-driven. Pass 2 carried this in-line; making it explicit in the skill would help future schema-driven surfaces. Also low-priority.

Neither rises to "action this session". Left as observations for the next time the relevant skills are touched.
