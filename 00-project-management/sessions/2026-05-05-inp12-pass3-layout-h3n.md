# Session log — 2026-05-05 — INP-12 Pass 3 layout

Session ID: 2026-05-05-inp12-pass3-layout-h3n

## What we worked on

- INP-12 Pass 3 layout-design (committed lens-report page + lens-reports list)
- SKL-01 (`feature-brief`) — three additions to the questionnaire surfaced by Pass 3

## What was done

### INP-12 Pass 3 layout spec — approved

Drafted, hard-gated, and filed at `01-design/wireframes/INP-12-pass3-layout.md`. Covers two surfaces plus three Pass 2 contract extensions:

1. **Committed lens-report page** at `/inputs/lens-reports/[id]` — full-page route mirroring Pass 1's unregistered `source-detail-pane` candidate. PageHeader with editable title + InPageNav (w-44) + sections in order: Output → Metadata → Sources → Committed items → History. Output section embeds `<LensReportReview mode='committed'>`.
2. **Lens-reports list page** at `/inputs/lens-reports` — responsive 1/2/3/4-up card grid with chip-based filter bar (lens type single-select + status multi-toggle). Default sort `committed_at desc`. Drafts excluded — they live on `/inputs/results`.
3. **Pass 2 contract extensions** — three additions to `<LensReportReview>`'s `mode='committed'` behaviour to land at Pass 3 build time: footer suppression, per-item interactivity reduced to navigation-only, internal `InPageNav` collapses with the host page providing nav.

### Eight resolved decisions captured in the spec

1. **Page shape = source-detail mirror, not thin shell** — provenance metadata wraps the molecule, not lives inside it.
2. **`mode='committed'` is "visually identical to review, interactive only for navigation, not state changes"** — title and summary edit on the page; per-item edit deferred to v2.
3. **No Re-run affordance on the page in v1** — backlogged. Re-running on identical inputs duplicates `IDENTIFIED_IN` items with no item-cleanup-on-supersession yet (pure noise). Legitimate "regenerate before commit" lives on Pass 2; legitimate "wider source set" path is from `/inputs/sources` lens picker.
4. **Card grid for the list page**, 3-up desktop / 4-up wide / 2-up tablet / 1-up phone — content-rich artefacts where summary excerpt does scan-work.
5. **Filters: lens type + status only for v1** — source filter, date range, free-text search all deferred.
6. **Default sort `committed_at desc`** — superseded reports sit in their original timeline.
7. **Superseded reports stay browsable** — `InlineWarningBanner tone='info'` above PageHeader links to latest.
8. **No archive/delete in v1** — graph-cleanup problem the brief defers.

### Two new molecules required at Pass 3 build time

- `LensReportCard` — single report tile in the list grid (INP-12-specific shape).
- `FilterChipGroup` — labelled chip group, URL-bound, single-or-multi select. Broadly reusable beyond INP-12.

### Two candidate templates flagged for post-build registration

- `source-detail-pane` — now reinforced. Pass 3 is its second instance after Pass 1's source detail. Template covers full-page route for one read-heavy artefact with InPageNav-driven sections + light inline editing on metadata + optional supersession banner.
- `lens-reports-archive-list` — new. Card grid with chip-based filter bar, low-volume archive of read-heavy artefacts, deep-linkable filters. Distinct from `launch-picker-grid` and `sources-inbox-list`.

### Brief updated

`01-design/briefs/INP-12-source-lens-processing.md` updated: Pass 3 summary section added under UI/UX notes, decisions log entry added, Track A status block flipped Pass 3 to ✅ Done, Track A marked complete.

### Backlog updated

`00-project-management/backlog.md`:
- INP-12 status updated to "Track A complete — schema layer + lens prompts + source-type fragments + all three layout passes done; feature-build blocked on KG-04".
- Pass 3 line filled in under Track A layout-design.
- New INP-12 vNext bullet added: "Re-run affordance on the committed lens-report page" — deferred with rationale (duplicate-item noise; no item-cleanup-on-supersession).

### feature-brief skill updated

`.claude/skills/feature-brief/SKILL.md` gained three additions surfaced by Pass 3:

1. **List-view density expectation** under Data/fields — recognition (low-volume, content-rich → cards) vs density (high-volume, uniform rows → table). Skips cards-vs-table debate at layout time.
2. **Edit-after-commit disambiguation** under Update behaviour — distinguish page-level metadata edit (always-on) from result-data edit (gated, may require re-run).
3. **Re-run / regenerate cleanup story** under Update behaviour — what happens to downstream nodes/edges/items on re-run? If reconciliation is deferred, brief should state re-run on a *committed* artefact is v2.

Each addition cites INP-12 Pass 3 as the originating context.

## Decisions made

- Pass 3 page shape mirrors Pass 1's `source-detail-pane` candidate rather than living as a thin shell around `<LensReportReview>`. Reasoning: provenance metadata (sources, committed items, supersession) doesn't belong inside the rendering molecule; keeping it on the page lets the molecule stay focused and lets the eventual registered template cover both surfaces.
- `mode='committed'` boundary drawn at "interactive only for navigation, not state changes" — three Pass 2 contract extensions formalise the behaviour. Title and summary editing live on the page (outside the molecule), keeping `LensReportReview` as a pure renderer.
- Re-run on a committed report deferred to vNext rather than included in v1. Driven by the noise problem: re-running on identical inputs creates duplicate `IDENTIFIED_IN` items in the graph because old items aren't cleaned up on supersession (per brief edge cases). The legitimate "regenerate before commit" need lives on Pass 2's review surface; the legitimate "wider source set / new decision text" need is rare in v1 and the workaround (start fresh from sources lens picker) is one extra navigation. Re-run lands once item-cleanup-on-supersession lands.
- Card grid not table for the list page. Reports are durable, content-rich artefacts whose summary excerpt does real scan-work. Tables would force truncation.
- No archive/delete affordance on the page in v1. Graph-mirrored artefacts with `IDENTIFIED_IN` provenance edges; deletion is a graph-cleanup problem the brief defers.
- Auto-suggested-title display dropped after human review — added clutter without enabling action. Title is editable in PageHeader; the system-suggested original isn't worth surfacing.

No decision met the ADR bar this session — Pass 3 decisions are layout-level (live in the spec), the re-run deferral is operational (lives in backlog), and the Pass 2 contract extensions are molecule-level. ADR-009 already covers the lens model architecture.

## What came up that wasn't planned

- **INP-12 vNext entry added** to backlog: re-run affordance on the committed lens-report page, deferred with rationale. Surfaced when the user pushed back on the Q3 "Re-run semantics" question — the right call wasn't picking one of the offered options, it was deferring the affordance entirely until the cleanup story is solved.
- **Three feature-brief skill additions** filed. None of them existed before Pass 3; all three would have skipped real Pass 3 deliberation if the brief had answered them upfront. Captured back into SKL-01 so future briefs surface the answers earlier.

## Backlog status changes

- **INP-12** — status updated from "in-progress (track A schema layer + lens prompts + source-type fragments done; layout-design remaining; feature-build blocked on KG-04)" to "in-progress (Track A complete — schema layer + lens prompts + source-type fragments + all three layout passes done; feature-build blocked on KG-04)". Pass 3 line filled in under Track A. New vNext entry added for the deferred re-run affordance.

No other features touched this session.

## What's next

INP-12 next moves are blocked on KG-04 (politics graph port). Once KG-04 lands:

- Run `feature-build` for INP-12 end-to-end. Inputs are now complete: brief approved + 3 layout specs approved + ADR-002a + ADR-009 + 4 schema docs + 4 migrations applied + 7 lens prompts + 12 extraction-schema fragments.
- The 10-item implementation follow-ups list in the brief (§ "Implementation follow-ups (for the INP-12 build pass)") is the build-pass input. Three Pass 2 contract extensions stack on top (footer suppression / per-item nav-only / internal InPageNav collapse).
- Two new molecules to spec at build-plan time: `LensReportCard`, `FilterChipGroup`. Plus the Pass 1 (5) and Pass 2 (8) molecules already flagged.
- Two candidate templates to register after build proves the patterns: `source-detail-pane` (Pass 1 + Pass 3 instances) and `lens-reports-archive-list` (Pass 3 only).

Independent of KG-04, the *optional* incremental ingest pipeline (chunking + summary + embeddings) flagged in the brief's Track A "Remaining" section can ship anytime — it's source-side, doesn't touch the lens layer.

## Context for future sessions

- **Track A is complete.** All design + schema + prose work for INP-12 is done. Feature-build is the next move once KG-04 unblocks.
- **Pass 3 spec lives at `01-design/wireframes/INP-12-pass3-layout.md`** — full standalone spec (~520 lines). Read it first when picking up Pass 3 build work; the brief's Pass 3 summary is condensed and points to the spec.
- **Three Pass 2 contract extensions are documented at the seam between Pass 2 and Pass 3** — at build time, the developer must update the `<LensReportReview>` molecule (Pass 2 work, not Pass 3) to support `mode='committed'`'s reduced behaviour. Single PR with Pass 3.
- **Direct nav to `/inputs/lens-reports/[id]` for `status='draft'`** must redirect server-side to `/inputs/results?run=[run_id]`. Status-based routing — not a page-level concern.
- **`surface-extraction` runs never produce a `lens_reports` row** by Pass 2 contract — `/inputs/lens-reports/[id]` 404s for those run IDs. Standard not-found page is fine.
- **Item-cleanup-on-supersession is a known unsolved problem** carried in the brief edge cases. The vNext re-run entry depends on solving it. When tackling cleanup, options include: hard-delete superseded items, dedup new vs old `IDENTIFIED_IN` edges, or flag-and-leave with a reconciliation UI. Brief leans toward flag-and-leave; revisit at vNext time.
- **The `feature-brief` skill is now slightly more opinionated about plural-list features and post-commit editability.** Briefs written after this session should answer the three new questions for any feature where they apply; older briefs (DNA-*, OUT-*, INP-12) are grandfathered.

## Self-improvement check

Three additions to `feature-brief` (SKL-01) filed and confirmed by the user mid-session:

1. List-view density expectation (Data / fields)
2. Edit-after-commit disambiguation (Update behaviour)
3. Re-run / regenerate cleanup story (Update behaviour)

All three trace back to specific Pass 3 deliberation that wouldn't have happened with a more thorough upfront brief.

No other skills behaved unexpectedly. `feature-template-check` correctly returned no-match (the closest candidates — `source-detail-pane` from Pass 1 and `lens-reports-archive-list` — aren't yet registered, per the convention of post-build registration).

`layout-design`'s "Hint, label, or indicator detection" rule (DS-01) caught the filter-bar styling one — would have been an inline organism violation if not promoted to `FilterChipGroup`. Working as intended.
