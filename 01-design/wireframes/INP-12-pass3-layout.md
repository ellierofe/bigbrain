# INP-12 Pass 3 — Committed lens-report page + lens-reports list

**Feature:** INP-12 (Source × Lens processing model)
**Pass:** 3 of 3 — addressable, durable surface for committed `LensReport` artefacts
**Status:** draft, awaiting hard-gate approval
**Date:** 2026-05-05
**Pre-conditions read:**
- Brief: `01-design/briefs/INP-12-source-lens-processing.md` (approved 2026-04-30, updated 2026-05-04)
- Pass 1 spec: `01-design/wireframes/INP-12-pass1-layout.md` (approved 2026-05-04)
- Pass 2 spec: `01-design/wireframes/INP-12-pass2-layout.md` (approved 2026-05-04)
- Design system: `01-design/design-system.md`
- Component registry: `02-app/components/registry.ts`
- ADR-002a, ADR-009

---

## What Pass 3 covers

Two surfaces, plus three small extensions to the Pass 2 contract.

1. **Committed lens-report page** at `/inputs/lens-reports/[id]` — full-page, deep-linkable, read-mostly view of one committed `LensReport`. Reuses `<LensReportReview>` from Pass 2 in `mode='committed'`. Wraps it with provenance metadata (sources used, items committed, lens, dates), a status banner (for superseded reports), and inline-editable title + summary on the page itself (not inside the molecule).
2. **Lens-reports list page** at `/inputs/lens-reports` — card grid (3-up at desktop, 4-up on wide screens) of committed and superseded reports, filterable by lens type and status. Drafts are excluded (they live on the Pass 2 review surface at `/inputs/results`).
3. **Pass 2 contract extensions** — three small additions/clarifications to `<LensReportReview>` so `mode='committed'` is well-defined:
   - Footer suppression in committed mode (no commit/discard/save-draft buttons).
   - Per-item interactivity reduced to navigation-only (sourceRefs/anchors clickable; no checkboxes, no inline edit).
   - Title editing moves *out* of the molecule — molecule stays dumb-read-only; the page handles title and summary edits.

Re-run affordance is **deliberately not present in v1** — see Decision 3 below.

---

## Template-check result

`feature-template-check` returned **no match**. The closest registered templates are:

- `project-workspace-template.md` — workspace-as-lens, but assumes light editing across multiple linked-item sections; lens-report page is more "single-artefact viewer" than "workspace."
- `launch-picker-grid-template.md` — card grid as launchpad to a workspace; lens-reports are records you open to read, not launchpads.

Two unregistered candidate templates from earlier passes are structurally aligned but not yet formalised:
- `source-detail-pane` (candidate from Pass 1) — full-page route for one read-heavy item with metadata + InPageNav-driven sections + light inline editing. **The lens-report detail page should mirror this shape so the eventual registered template covers both.**
- `sources-inbox-list` (candidate from Pass 1) — list with NEW filter chip + side preview + bulk actions. **Not used here** — the lens-reports list is an archive index, not an inbox.

**Decision:** new-pattern path, designed in deliberate alignment with the Pass 1 `source-detail-pane` candidate so a single registered template can cover source detail + lens-report detail (and any future "single read-heavy artefact" page). The list page is a separate, simpler new pattern (`lens-reports-archive-list` candidate).

---

## Resolved decisions

These were resolved before drafting:

**Decision 1 — Page shape: source-detail mirror, not thin shell.**
The lens-report page is **not** just a wrapper around `<LensReportReview>`. The molecule renders the lens *output* (sections + items + unexpected). The page wraps it with provenance and metadata that don't belong inside the molecule: which sources contributed (`ANALYSED_FROM` edges), what items got committed to graph (`IDENTIFIED_IN` edges), supersession status, dates, the editable page-level title and one-paragraph summary. Putting these on the page rather than inside the molecule keeps `<LensReportReview>` focused (rendering the lens result, period) and lets us register `source-detail-pane` as a unified template.

**Decision 2 — `mode='committed'` is "visually identical to review, interactive only for navigation, not state changes."**
`<LensReportReview mode='committed'>`:
- Hides the sticky commit footer entirely (no Commit / Save draft / Discard / Re-run buttons).
- Hides per-item checkboxes, edit-pencil, reject-trash, "Add unexpected" affordances.
- Keeps `SourceChip` clicks (navigate to source detail), markdown anchors, internal navigation via `InPageNav`.
- Renders all sections including `unexpected[]` identically to review mode.
- Does NOT render the page-level title, lens-input echo, sources-summary card, or "Discard + re-run" link — these are review-mode chrome, all of which is replaced by the **page** in Pass 3.

Title and one-paragraph summary editing live on the **page** (in the Metadata section + inline-editable PageHeader), not inside the molecule. This means `LensReportReview` remains a pure renderer; the page owns metadata-edit state. Per-item edit of lens-output items is **v2 ergonomics per the brief** — Pass 3 doesn't add it.

**Decision 3 — No "Re-run" affordance on the page in v1. Backlogged.**
Re-running on identical inputs creates duplicate `Idea`/`Concept`/`Person` nodes via fresh `IDENTIFIED_IN` edges to the new report (old items not auto-removed per brief §Edge cases). Pure noise. The legitimate "regenerate before commit" need lives in Pass 2 (Discard + re-run). The legitimate "wider source set / new decision text" need is rare; v1 path is to start a fresh run from `/inputs/sources` lens picker — one extra navigation. Re-run on committed reports lands when item-cleanup-on-supersession lands. Logged in backlog under INP-12 vNext.

**Decision 4 — Card grid for the list page, 3-up desktop / 4-up wide. Not a table.**
Reports are durable, content-rich artefacts with a one-paragraph summary doing real scan-work. Volume is low (handful per week, dozens over time). Cards make the summary readable; tables would force truncation that defeats the point. 3-up at standard desktop (≥1024px), 4-up at wide (≥1440px), 1-up at tablet (<1024px). Requires one new molecule (`LensReportCard`).

**Decision 5 — Filters: lens type + status only for v1.**
Source filter is more useful from a source-detail page ("reports drawing on this source") than globally. Date range and free-text search are nice-to-have, deferred. Status filter scopes to `committed` (default) and `superseded`; `draft` reports never appear in this list — they live on `/inputs/results`.

**Decision 6 — Default sort: newest committed first.**
`committed_at desc`. Superseded reports use `committed_at` (the original commit time, not when they got superseded) so they sit in the timeline they were created in.

**Decision 7 — Superseded reports stay browsable.**
A superseded report is read-only history but still openable. Top-of-page banner (`InlineWarningBanner` `tone='info'`) reads "This report has been superseded → [link to latest version]". The latest version is reached via `superseded_by_id`. Browsing supersedes never collapses to "show latest only" — old reports are durable provenance.

**Decision 8 — No page-level archive/delete in v1.**
Lens reports are graph-mirrored artefacts with `IDENTIFIED_IN` edges from extracted items. Deleting cascades into a graph cleanup problem the brief doesn't solve for v1. Archive (soft-delete on `lens_reports.is_archived` — would require a schema addition) is also v2. Pass 3 has no archive button. Surfaced bugs go through the database directly until v2.

---

## Views needed

1. **Lens-reports list page** at `/inputs/lens-reports`
   Card grid + filter bar + page header. Entry from sidebar nav under `Inputs`.
2. **Committed lens-report page** at `/inputs/lens-reports/[id]`
   Full page with header + InPageNav + scrolling body. Sections: Metadata, Output (delegates to `<LensReportReview mode='committed'>`), Sources used, Items committed, History (versions). Banner above PageHeader if `status='superseded'`.

No modals. No drawers. Both views are full-page routes.

---

## Navigation and routing

### Sidebar nav (extension)

`Inputs` section in the left sidebar (already includes `Sources` per Pass 1; `Results` is a separate route reached from selection actions, not sidebar). Pass 3 adds:

```
Inputs
  Sources                    /inputs/sources
  Lens reports          ←    /inputs/lens-reports         (NEW)
  Results (in-flight)        /inputs/results              (Pass 2 — keeps URL, not a sidebar item; reached from Sources lens-run)
```

`Results` stays *out* of the sidebar — it's a transient surface for in-flight runs, not an artefact list. `Lens reports` sits in the sidebar because it's the durable archive.

### App Router paths

- `/inputs/lens-reports` — list page
- `/inputs/lens-reports?lens=pattern-spotting&status=committed` — list with filters (URL-state, shareable)
- `/inputs/lens-reports/[id]` — detail page
- Inbound from `/inputs/results?run=<runId>` after commit on an analysis lens (Pass 2 redirect target — confirmed in Pass 2 spec line 66).
- Inbound from `/inputs/sources/[id]` "Linked lens reports" section (Pass 1 spec) — each linked report tile/link goes to `/inputs/lens-reports/[id]`.
- Inbound from sidebar nav.

### Back navigation

- From detail page: `← All lens reports` link in subheader, returns to list page (preserves filter state via referrer or URL fallback to default).
- From list page: top-level page; no back link needed.

### Deep-linking

Both routes are deep-linkable. List page reads filters from URL search params. Detail page reads `[id]` from path.

---

## List view: `/inputs/lens-reports`

### Structure

```
PageChrome:
  PageHeader: [Lens reports] · [icon-only filter toggle on mobile]
    subtitle: "{N} reports · {M} sources covered"        ← optional v2; v1 omits
  Subheader slot: filter bar
    Lens: [All ▾] [surface-extraction] [pattern-spotting] [self-reflective] [project-synthesis] [catch-up] [decision-support] [content-ideas]   ← chip group
    Status: [Committed] [Superseded]   ← chip group; default = Committed only

ContentPane:
  Card grid:
    grid-cols-1 (mobile) → grid-cols-2 (≥768px) → grid-cols-3 (≥1024px) → grid-cols-4 (≥1440px)
    gap-4
    Each cell: <LensReportCard>
```

### Filter bar

Two chip groups, both URL-bound (`?lens=...&status=...`).

- **Lens** — 8 chips: `All` + 7 lens types. Single-select (lens-multi-filter is overkill at v1 volume). Default: `All`.
- **Status** — 2 chips: `Committed` (default-on) + `Superseded` (default-off). Toggle each independently. URL: `?status=committed,superseded` (CSV).

Filter bar uses existing chip styling (whatever Pass 1 settled — likely `Button` `variant='outline'` with active state). If the Pass 1 spec introduced a `FilterChipGroup` molecule, reuse it; if not, this is a candidate molecule (see "Molecule composition"). Falls back to atom composition only if no filter-chip-group molecule materialises.

Empty filter result: same `EmptyState` pattern, message tailored ("No reports match these filters. Clear filters →").

### Empty state

When no reports exist at all (zero rows in `lens_reports` table):

```
<EmptyState
  icon={Sparkles}
  heading="No committed lens reports yet"
  description="Run a lens on one or more sources to produce your first report."
  action={<ActionButton href="/inputs/sources">Go to sources</ActionButton>}
/>
```

When filters return zero but reports exist:

```
<EmptyState
  icon={SearchX}
  heading="No reports match these filters"
  description="Try clearing one or more filters to see more results."
  action={<ActionButton variant="outline" onClick={clearFilters}>Clear filters</ActionButton>}
/>
```

### Sort

Default: `committed_at desc`. No user-facing sort control in v1 (low volume; default is enough). Header text: implicit ("Reports").

### Pagination

None for v1. Lens reports accumulate slowly (a few per week at most). At 50+ rows we revisit. Render all rows.

### Item count

Visible count in PageHeader subtitle is **deferred to v2** — adds clutter without enabling action. The grid itself communicates volume.

### `LensReportCard` (new molecule — see Molecule composition)

Each card is one report. Click card body → navigate to detail page. Compact metadata row at top, summary excerpt in body, footer with secondary metadata.

```
+--------------------------------------------------------+
| [lens-icon] Pattern spotting          [● Committed]    |  ← top row: lens + status
| Title (bold, 2-line clamp)                             |  ← title (truncates after 2 lines)
| One-paragraph summary excerpt that gives             |  ← summary excerpt (3-line clamp)
| the reader the gist of what was found...             |
|                                                        |
| [● 7 sources] · 12 Apr 2026 · 23 items committed       |  ← footer meta line
+--------------------------------------------------------+
```

Card states:
- **default** — committed report, white card, `--border` on hover lifts to `--ring` (`Card` atom default).
- **superseded** — slightly muted background tint (`bg-muted/40`), status pill reads "Superseded" (neutral), still clickable.
- **hover** — standard `Card` hover state.
- **focus** — keyboard-focusable; ring on focus.

Click semantics:
- Body click → navigate to `/inputs/lens-reports/[id]`.
- Status pill not clickable (display-only).
- No Cmd-click distinction needed (the whole card is one target; standard browser Cmd-click opens in new tab).

---

## Detail view: `/inputs/lens-reports/[id]`

### Top-level structure

```
[InlineWarningBanner if status='superseded']    ← above PageHeader; "This report has been superseded → [View latest →]"

PageChrome:
  PageHeader:
    [lens-icon]
    Title (inline-editable via InlineField)
    actions slot: [⋯] (ActionMenu — see "Page-level actions" below)
    subtitle: lens-name · {N} sources · committed {date} · status pill
  Subheader slot:
    [← All lens reports]

ContentPane:
  InPageNav (w-44, sticky, left col):
    • Output                  ← anchor to LensReportReview (skips inline summary)
    • Metadata
    • Sources                 ← N
    • Committed items         ← M (count of items in graph)
    • History                 ← only shown if status='superseded' or superseded_by_id is set somewhere upstream
    • [Unexpected]            ← appears only if result.unexpected[].length > 0

  MAIN BODY (flex-1, max-w-3xl-ish, scrolls):
    1. <LensReportReview mode='committed' /> — full output rendering (sections + items + unexpected)
    2. SectionCard "Metadata" — editable summary, lens-input echo (if decision-support), one-line auto-suggested title hint (display-only)
    3. SectionCard "Sources" — list of contributing sources, link out to source detail
    4. SectionCard "Committed items" — graph-mirrored summary (count + sample), link out to graph view
    5. SectionCard "History" — versions and supersession (only if applicable)
```

Note the **section ordering**: `Output` is *first* in the page body. Reasoning: the output is what the user came for. Metadata and provenance come after. This is the inversion of the source-detail page (which leads with Metadata because the source's content is mostly the chunks, not interpretive). The `InPageNav` reflects this order.

`InPageNav` lives at `w-44` to match Pass 2's review surface (which uses `w-44` for `(N/M)` counter badges). Counter badges in Pass 3 are simpler — just `(N)` for sources count, `(M)` for committed-items count, `(K)` for unexpected count if present.

### Section 1: `<LensReportReview mode='committed'>`

Embedded directly in the page body. The molecule handles its own internal `InPageNav` for sub-sections (Summary / lens-specific sections / Unexpected) — but **wait**: this would create nested in-page nav (page-level nav + molecule-internal nav), which is confusing.

**Resolved:** the molecule's `mode='committed'` **collapses its own InPageNav into the page-level InPageNav**. Specifically, when `mode='committed'`, `<LensReportReview>` does *not* render its left-rail InPageNav (Pass 2's `InPageNav` lives inside the molecule). The page-level InPageNav adds nav items for each top-level section the molecule renders, derived from the same metadata. One nav, not two.

This means `<LensReportReview mode='committed'>` renders **only the body**: SectionCards stacked vertically, no internal sticky nav, no commit footer. The page provides the nav.

This is a small extension to the Pass 2 contract — added below in "Pass 2 contract extensions."

### Section 2: SectionCard "Metadata"

Read mode shows:
- **Lens type** — read-only label + lens-icon (e.g. `[icon] Pattern spotting`).
- **Title** — already editable in PageHeader; not duplicated here.
- **One-paragraph summary** — `MarkdownEditor` (Pass 2 molecule), inline-editable via `InlineField` autosave pattern. Pre-filled from `lens_reports.summary`. Editing this field updates the row; doesn't affect the lens output.
- **Lens input** (decision-support only) — read-only echo of the decision text the lens was run with. Subtle, italic, non-interactive.
- **Committed date** — `committed_at`, formatted "12 April 2026, 14:32".
- **Created date** — `created_at`. Same formatting. Distinguishes "when the run started" from "when it was committed" (often same day, sometimes a draft sits for review across sessions).

Pure inline editing for `title` and `summary` only. Other fields are read-only — they describe the run, not the report.

### Section 3: SectionCard "Sources"

List of sources that fed this lens (sourced from `lens_reports.source_ids[]` and `ANALYSED_FROM` edges).

```
SectionCard "Sources used" (subtitle: "{N} sources contributed to this report")
  <ListItem> rows, one per source:
    leading: [source-type-icon]
    content:
      [source title]
      [source-type · authority · date]
    trailing: [→]
    clickable → /inputs/sources/[source-id]
```

If a source has been deleted since the report was committed, render the row with:
- `<TypeBadge>` "deleted" warning style
- Title shown as "[deleted source]" + the original title in muted text
- No link (or link to a 404-friendly "this source no longer exists" page)

Pass 1 hasn't specced source deletion behaviour, so this is a forward-compat note: the deletion state needs to be detectable at query time. If `src_source_documents.is_archived` or a soft-delete flag exists, use that. Otherwise, missing rows surface as deleted.

### Section 4: SectionCard "Committed items"

Summary of what the lens produced and what's now in the graph.

For **analysis lenses** (pattern-spotting, self-reflective, project-synthesis, catch-up, decision-support, content-ideas), the items committed include:
- `Idea` nodes via `IDENTIFIED_IN` edges
- `Concept` nodes via `IDENTIFIED_IN` edges
- `Methodology` nodes via `IDENTIFIED_IN` edges (project-synthesis only)

For **surface-extraction**, this section is **not rendered** — surface-extraction commits items directly without producing a `LensReport` (per Pass 2 spec). If the user lands here from a `surface-extraction` run, the route would be invalid; the page should 404 or redirect to source detail. Add a guard: surface-extraction never produces a `lens_reports` row, so `/inputs/lens-reports/[id]` for that ID won't resolve. No-op.

```
SectionCard "Committed to graph"
  Summary line: "{M} items written to your knowledge graph from this report"
  Compact list, by type:
    Ideas (N) ─ first 3 by confidence/strength desc, with "View all in graph →" link
    Concepts (N) ─ same
    Methodologies (N) ─ project-synthesis only

  Each item row:
    leading: [type-icon — Lightbulb / Compass / Wrench]
    content: item.title (truncated)
    trailing: [<ConfidenceBadge>]
    clickable → graph view (deferred until graph view exists; for v1, link to `/graph/[node-id]` if route exists, else placeholder)
```

If graph-view routes don't exist yet (likely for v1), the trailing chevron either:
- Becomes a no-op (display-only summary), or
- Links to a static "Open in graph" placeholder route that explains the feature is coming.

I'd lean toward the first — display-only summary in v1, no pretend-link. The summary is informational; the user is on the report page to *read the report*, not to traverse the graph from here. Graph traversal can land in a later feature.

### Section 5: SectionCard "History"

Only shown when:
- `status='superseded'` (this report has been superseded by another), OR
- another lens report exists with `superseded_by_id = this.id` (this report superseded an older one).

Renders a tiny version timeline:

```
SectionCard "Version history"
  <ListItem> rows:
    [○] Earlier version — superseded by this — committed 1 Apr 2026 →   ← clickable
    [●] This version — committed 12 Apr 2026
    [○] Newer version — superseded this — committed 28 Apr 2026 →       ← clickable, only if this report was itself superseded
```

The dot indicator (`●` filled = current report being viewed; `○` empty = other versions). Click any other-version row to navigate to that report's page.

If history has zero entries (no supersedes in either direction), the section is hidden entirely; the InPageNav anchor for "History" does not render.

### Page-level actions

`PageHeader` actions slot: `[⋯]` `ActionMenu`. Items:

- **View raw output (JSON)** → opens a Modal with the `lens_reports.result` jsonb pretty-printed. Useful for debugging / verifying what the LLM produced before any inline edits. Read-only.
- **Copy link** → copies `/inputs/lens-reports/[id]` to clipboard.
- *(Re-run is deliberately absent — see Decision 3.)*
- *(Archive / Delete is deliberately absent — see Decision 8.)*

Two items only for v1. Keep it lean.

### Loading state

Use `PageSkeleton` while the report row + sources + committed items load. Section-level skeletons inside `<LensReportReview>` for the lens output (already part of Pass 2's molecule contract).

### Error states

- **Report not found** (404) — Next.js `not-found.tsx` for the route. Standard not-found page with link back to list.
- **Report fetch fails** — `<ErrorState>` (existing molecule) inside the page chrome with retry button.
- **Source list fetch fails** (rare; sources are co-fetched with the report) — section-level error inside the Sources SectionCard, retry button.

### Optimistic updates

- **Inline edit on title** — optimistic; on save failure, revert + toast.
- **Inline edit on summary** — same pattern.
- **No other actions in v1** — read-only page apart from those two fields.

---

## Pass 2 contract extensions

These are small additions to `<LensReportReview>` so `mode='committed'` is well-defined. Document in Pass 2's spec at feature-build time; flagging them here as **the seam between Pass 2 and Pass 3**.

### Extension 1: Footer suppression in committed mode

When `mode='committed'`:
- The sticky commit footer (Pass 2 spec lines ~700–740) is **not rendered**.
- The `onCommit`, `onDiscard`, `onSaveDraft` callback props become optional and are not invoked.
- The "{N/M} confirmed" counter, the "X unresolved People/Orgs" pre-flight prompt, and the lens-input echo bar all suppress.

### Extension 2: Per-item interactivity reduced to navigation-only

When `mode='committed'`:
- `LensReviewItemCard`'s checkbox, edit-pencil, reject-trash, "needs-attention" canonical-resolution affordance all suppress.
- The card is read-only: no expand-on-click-to-edit; clicking the body does nothing (or could expand to show full content if the card was truncated, but v1 keeps cards always-expanded — Pass 2 default).
- `SourceChip`s remain clickable (navigate to source detail).
- Markdown anchors and internal links remain functional.
- Confidence/strength badges render visually identically.

### Extension 3: Internal `InPageNav` collapses; page provides nav

When `mode='committed'`:
- The molecule does **not** render its own left-rail `InPageNav`.
- The molecule renders only the body — SectionCards stacked vertically, with anchor IDs intact (so an external nav can target them).
- The host page (Pass 3 detail page) provides its own `InPageNav` with anchor links matching the molecule's section IDs.

To support this, the molecule exposes a small helper / convention:
- Each section renders with `id={`lens-section-${section.field}`}` (or a stable equivalent).
- The host page reads the same `metadata.sections[]` array and generates `InPageNav` items pointing at those IDs.
- The page also adds its own non-molecule sections to the same nav (`Metadata`, `Sources`, `Committed items`, `History`).

This is the cleanest seam. The molecule still renders its own nav in `mode='review'` (Pass 2 contract); `mode='committed'` is the only mode that delegates nav to the host page.

---

## Mobile considerations

Both Pass 3 routes are explicitly desktop-first. Tablet (≥768px) is the floor; phone is unsupported.

- **List page on tablet (768–1023px):** card grid collapses to 2-up. Filter chips wrap. Acceptable.
- **List page on phone (<768px):** 1-up cards, full-width. Filter bar becomes a horizontal scroll or a "Filters" button opening a sheet. v1: just stack chips and let them wrap; phone usage is incidental.
- **Detail page on tablet:** InPageNav collapses to a top-of-content compact nav (existing `InPageNav` mobile behaviour, if implemented; otherwise hide entirely and rely on scroll).
- **Detail page on phone:** same. PageHeader becomes more vertical; actions menu stays visible.

Pass 3 doesn't introduce phone-specific behaviour. The minimum supported viewport is **≥768px**.

---

## Keyboard interactions

Modest set:

- **List page:**
  - `Tab` / `Shift+Tab` — moves focus through filter chips and cards in DOM order.
  - `Enter` / `Space` on a focused card — navigates to detail.
  - No special shortcuts.

- **Detail page:**
  - `Tab` / `Shift+Tab` — through PageHeader actions, InPageNav links, inline-editable fields, then through the molecule body.
  - `Cmd+S` — saves the currently-focused inline-editable field (handled by `InlineField` autosave; explicit Cmd+S is optional).
  - `Esc` — within `MarkdownEditor`, exits edit mode (revert if dirty).
  - InPageNav links — focus and `Enter` jumps to anchor. Smooth scroll preferred.
  - Page-level shortcut: none (no primary action like "Run" or "Submit"). The page is read-mostly, so dedicated shortcuts aren't warranted.

Standard accessibility floor applies: focus rings visible, all interactive elements reachable, semantic HTML (page header is `<header>`, main is `<main>`, sections use `<section>` with proper headings).

---

## Molecule composition

Critical section — feeds `feature-build` Step B "Molecules to use / molecules to create."

### Existing molecules used (already in registry, with specs)

- `PageChrome` (registry: `components/page-chrome.tsx`, spec: design-system.md § PageChrome) — standard page wrapper.
- `PageHeader` (registry: `components/page-header.tsx`, spec: design-system.md § PageHeader) — title + subtitle + actions slot. Used on both list and detail pages.
- `ContentPane` (registry: `components/content-pane.tsx`, spec: design-system.md § ContentPane) — scrolling working area.
- `InPageNav` (registry: `components/in-page-nav.tsx`, spec: design-system.md § InPageNav) — sticky left section nav. Used on detail page.
- `SectionCard` (registry: `components/section-card.tsx`, spec: design-system.md § SectionCard) — section wrapper. Used for Metadata, Sources, Committed items, History.
- `InlineField` (registry: `components/inline-field.tsx`, spec: design-system.md § InlineField) — inline-editable text/textarea with autosave 500ms debounce. Used for title in PageHeader.
- `StatusBadge` (registry: `components/status-badge.tsx`, spec: design-system.md § StatusBadge) — state pill. Used for `committed` / `superseded` indicator on cards and detail page.
- `TypeBadge` (registry: `components/type-badge.tsx`, spec: design-system.md § TypeBadge) — categorical pill, 8 hues. Used for lens-name pill and source-type pill.
- `ConfidenceBadge` (registry: `components/confidence-badge.tsx`, spec: design-system.md § ConfidenceBadge) — H/M/L pill. Used inside Committed items section. **Pass 2 already extended this** to accept state-driven values for analysis-lens `strength` — Pass 3 reuses the extended molecule unchanged.
- `MarkdownRenderer` (registry: `components/markdown-renderer.tsx`, spec: design-system.md § MarkdownRenderer) — render markdown. Used inside the LensReportReview molecule (Pass 2) — Pass 3 doesn't compose it directly.
- `ListItem` (registry: `components/list-item.tsx`, spec: design-system.md § ListItem) — list-row shell with leading/children/trailing slots. Used for source rows in Sources section, item rows in Committed items section, version rows in History section.
- `ActionButton` (registry: `components/action-button.tsx`, spec: design-system.md § ActionButton) — primary/outline/ghost button. Used for empty-state CTAs.
- `IconButton` (registry: `components/icon-button.tsx`, spec: design-system.md § IconButton) — icon-only button. Used for `[⋯]` actions trigger.
- `ActionMenu` (registry: `components/action-menu.tsx`, spec: design-system.md § ActionMenu) — context-action dropdown. Used for the page-level `[⋯]` menu.
- `Modal` (registry: `components/modal.tsx`, spec: design-system.md § Modal) — dialog with size variants. Used for "View raw output (JSON)" action.
- `EmptyState` (registry: `components/empty-state.tsx`, spec: design-system.md § EmptyState) — icon + heading + CTA. Used for both empty states on list page.
- `PageSkeleton` (registry: `components/page-skeleton.tsx`, spec: design-system.md § PageSkeleton) — loading shimmer.
- `InlineWarningBanner` (registry: `components/inline-warning-banner.tsx`, spec: design-system.md § InlineWarningBanner) — top-of-content banner. **Pass 1 added the `'info'` tone** — Pass 3 uses `tone='info'` for the superseded banner.

### Existing molecules used but unspecced *(none for Pass 3)*

None identified.

### Existing Pass 2 molecules used

- `LensReportReview` (registry: TBD via Pass 2 build, spec: Pass 2 spec + design-system.md update at build time) — **the central molecule**, used in `mode='committed'`. Pass 3 introduces three small contract extensions (footer suppression, per-item interactivity reduction, internal-nav collapse — see "Pass 2 contract extensions" above). All three are additions to existing prop behaviour, not new props.
- `SourceChip` (registry: TBD via Pass 2 build) — clickable source pill. Used in Pass 3 for source list rendering (alternative to `ListItem` if a denser visual is wanted; Pass 3 spec uses `ListItem` for the Sources section to match `source-detail-pane` shape, but `SourceChip` is reused inside `<LensReportReview>` for inline source references).
- `MarkdownEditor` (registry: TBD via Pass 2 build) — inline markdown editor. **Used in Pass 3** for the page-level `summary` field (Metadata SectionCard).

### New molecules required (Pass 3)

**1. `LensReportCard`** — single report tile in the list grid.

  - **Props:**
    - `report`: `{ id, lens, title, summary, sourceCount, committedAt, itemCount, status }`
    - `href`: string (target route)
    - `density?`: `'default'` (only one for v1; flagged so future dense variant can extend)
  - **Visual:**
    - `Card` atom wrapper, padding `p-4`, radius `rounded-md`, border `--border`, hover `--ring`.
    - Top row: `[lens-icon] {lens-label}` left + `<StatusBadge>` right.
    - Title: `font-semibold text-base text-foreground line-clamp-2`.
    - Summary excerpt: `text-sm text-muted-foreground line-clamp-3`.
    - Footer row: `[● {N} sources] · {formatted date} · {M} items committed` in `text-xs text-muted-foreground`.
    - Clickable card body via `<Link href={href}>` wrap; hover ring on `Card`.
    - Superseded variant: card background tints to `bg-muted/40`, status reads "Superseded".
  - **Replaces:** "first lens-report tile design" — net new pattern. No prior inline equivalent.

**2. `FilterChipGroup`** — labelled chip group for filter bars (URL-bound).

Wait — let me check whether Pass 1's filter bar produced one of these. Re-reading Pass 1: Pass 1's NEW filter chip is a single chip on the Sources page, not a group. The bulk-action bar uses inline elements. So no `FilterChipGroup` molecule exists yet.

**Hint detection check:** the filter bar above the lens-reports grid is a row of chips with a label. If implemented inline, the page would carry styling for chip selected/unselected states (`bg-primary text-primary-foreground` for selected, `bg-secondary` for unselected) — that's appearance classes on an organism, which violates DS-01. So this needs to be a molecule.

  - **Props:**
    - `label`: string (e.g. "Lens" or "Status")
    - `options`: `Array<{ value: string, label: string, icon?: ReactNode }>`
    - `value`: `string | string[]` (single-select or multi-select)
    - `mode`: `'single' | 'multi'` (default: single)
    - `onChange(value)`: callback
  - **Visual:**
    - Horizontal row: `[Label:] [chip] [chip] [chip] ...`
    - Label: `text-sm font-medium text-muted-foreground`.
    - Chip: based on `Button` atom, `variant='outline'` for unselected, `variant='default'` for selected. `size='sm'`. Icon support for lens chips.
    - Wraps on narrow viewports.
    - Optional: clear-all `[×]` at end if any non-default value is selected (deferred — v1 just shows chips).
  - **Replaces:** the inline filter-chip styling that would otherwise appear on the lens-reports list page (and likely on the future "lens reports linked to this source" view, the future lens-runs activity log, etc.). Reusable.

### Atoms used directly *(should be empty)*

I don't see any atom-direct usage required if `LensReportCard` and `FilterChipGroup` are introduced.

The `InlineWarningBanner` superseded banner uses an existing molecule with the existing `tone='info'` (Pass 1 extension). The "View latest →" link inside the banner is a markdown-style link rendered as a `Button` `variant='link'` — that's a single atom inside an existing molecule's content slot, not a direct atom in the page. Acceptable.

The "View raw output (JSON)" Modal contents — pretty-printed JSON inside a `<pre>` tag — is a one-off display. Wrapping in a new molecule for one use is over-engineering. Acceptable as inline organism content (the Modal is the molecule; the `<pre>` is unstyled content inside).

---

## Schema-driven specifics

### How `<LensReportReview mode='committed'>` consumes metadata

Pass 2's metadata format (one file per lens at `02-app/lib/lens-review/metadata/[lens-id].ts`) is consumed identically in `mode='committed'`. The page reads the same metadata to:

1. Generate `InPageNav` items — one per `metadata.sections[i]` plus the page-level Metadata/Sources/Committed/History.
2. Pass `metadata` into `<LensReportReview>` so it renders the body identically to review mode.

This means **adding a new lens does not require a Pass 3 code change**. The metadata file declares the sections; Pass 3 reads it; page renders. Matches ADR-009's "adding a lens is a 4-step operation" goal.

### `unexpected[]` rendering

The universal `unexpected[]` field renders as the final section inside `<LensReportReview>`, identically to review mode (per Pass 2 spec). In `mode='committed'`, individual unexpected items are read-only — no per-item edit/discard. Page-level `InPageNav` includes "Unexpected" as a nav item only if `result.unexpected.length > 0`.

---

## Edge cases

- **Report with zero items committed** (analysis lens that found nothing of substance): the LensReportReview body renders empty/minimal sections. The Committed items section reads "No items written to graph from this report" (sub-empty-state). Still a valid record; page renders.
- **Report with all sources subsequently deleted**: sources section shows all rows in deleted state (per "Section 3" above). The lens output remains valid history. No banner — the report is still the report.
- **Superseded report whose `superseded_by_id` points to a deleted report**: rare. Gracefully degrade — show "This report was superseded; the newer version no longer exists" banner. Same `InlineWarningBanner` tone='info', different message.
- **Direct nav to `/inputs/lens-reports/[id]` for a `surface-extraction` run**: per Decision 8 / Pass 2 contract, surface-extraction never produces a `lens_reports` row. Route 404s. No special handling needed beyond the standard not-found page.
- **Direct nav for `status='draft'`**: drafts live on `/inputs/results?run=<runId>`, not here. Two options:
  - (a) 404 — drafts aren't in the list, route shouldn't resolve from here.
  - (b) Redirect to `/inputs/results?run=<run_id>` for the corresponding run.
  - **Resolved: (b)**. A user pasting a lens-report URL expects to land somewhere useful. If the underlying report is still a draft, redirect to the active review surface. Status-based routing — clean.
- **Empty `result` jsonb (LLM returned nothing usable)**: at commit time, Pass 2's review surface should have flagged this. If somehow committed empty, render LensReportReview body with empty-section placeholders (same default behaviour). Defensive only.
- **`result` jsonb shape doesn't match the metadata** (e.g. lens prompt was changed since the report was committed): renders best-effort. Sections in metadata that have no result data render empty; result fields not in metadata go unrendered. Forward-compat. Backlog item: at viewing time, log a "schema drift" warning to console for debugging.
- **User edits `title` while another tab loads the same page**: standard last-write-wins with autosave debounce (500ms). No optimistic concurrency for v1.
- **Very long `summary` (e.g. 10k chars)**: `MarkdownEditor` handles arbitrary markdown; tall summary just makes the section tall. Page scrolls. No special handling.

---

## Mobile considerations

(Already covered above. No additional notes.)

---

## Out of scope (Pass 3)

Explicit deferrals so feature-build doesn't try to fold these in:

- **Re-run from the page** — backlogged. See Decision 3.
- **Archive / delete** — backlogged. See Decision 8.
- **Per-item edit of lens output items** — v2 ergonomics per the brief.
- **Item cleanup on supersession** — old report's `IDENTIFIED_IN` items remain in graph, flagged in UI (out of scope for both Pass 3 and Pass 2 — flagged in brief edge cases).
- **Graph traversal from Committed items section** — link is display-only in v1; routes to graph view land in a later feature.
- **Search across reports** — v1 has lens + status filters only.
- **Date range filter** — nice-to-have, deferred.
- **Source filter on list page** — more useful from source-detail page; deferred.
- **Pagination** — re-evaluate at 50+ rows.
- **Phone (<768px) optimisation** — desktop-first; tablet floor.
- **Comparison view** ("compare two superseded reports side-by-side") — would be a separate feature.
- **Export / share token** — deferred.
- **`is_archived` flag on `lens_reports`** — schema doesn't have it; not adding for v1.

---

## Self-improvement reflection (Step G)

### Did the feature brief have unanswered layout questions?

A few that surfaced during this pass:

1. **Re-run semantics on a committed report.** The brief described re-run as a feature ("openable later, re-runnable, editable") and described supersession behaviour ("when re-run with the same source set, the new report supersedes the old"), but didn't surface the noise problem (duplicate items in graph) until the layout-design conversation. **Proposed addition to feature-brief questionnaire:** "If this feature involves re-running, regenerating, or duplicating a previously-committed artefact, what is the cleanup story for the artefact's downstream effects? (Graph nodes, edges, derived items.)"

2. **What "edit a committed report" means.** The brief said "lens report editing after commit is v2 ergonomics" but didn't disambiguate page-level metadata edits (title, summary) from item-level edits. Pass 3 had to decide. **Proposed clarification in brief structure:** "If an artefact is editable post-commit, distinguish: editable page-level metadata (always-on inline editing) vs editable result data (gated, may require re-run)."

3. **Cards vs table for the list page.** The brief mentioned "lens report has its own page" but didn't sketch what a list-of-pages would look like. Pass 3 made the call. Not a brief gap per se — list-view shape is layout-design's job — but if briefs included a "list view density expectation" sentence ("low volume / browse-by-recognition" vs "high volume / dense scan"), it'd skip the discussion.

### Did the layout spec miss anything `feature-build` will need?

Things to flag at feature-build time:

- **Pass 2 contract extensions (3 of them)** — when building Pass 3, the developer will need to update the Pass 2 `<LensReportReview>` molecule to support `mode='committed'`'s reduced behaviour. This is genuinely a Pass 2 molecule update, just deferred to Pass 3 build because that's when committed mode actually gets exercised. Spec'd in this doc; should land as a single PR with Pass 3.
- **Schema-drift detection for old reports**: forward-compat note. If a lens prompt is updated and a report viewed afterward has a result shape that no longer matches the metadata, the page renders best-effort. Add console.warn for debugging. Not a blocker.
- **Surface-extraction-doesn't-produce-LensReport guard**: route should 404 for surface-extraction run IDs. Confirm at build that the route fetcher returns null for surface-extraction `processing_runs` (which have `lens_report_id = null`).
- **Status-based redirect for draft reports**: implement at the route level, not the page level. If `status='draft'`, server-side redirect to `/inputs/results?run=[run_id]`.

### Did the template adaptation reveal template gaps?

This was new-pattern path, not template adaptation. But it surfaces two registration recommendations:

1. **`source-detail-pane` candidate template** (flagged in Pass 1, reinforced in Pass 3) — should be registered after Pass 3 build proves the pattern. Will then formalise: full-page route for one read-heavy artefact, with InPageNav-driven sections, light inline editing on metadata, action menu in PageHeader, optional supersession banner. Source detail and lens-report detail are the first two instances; future "single read-heavy artefact" pages (Person profile? Organisation profile? Mission archive view?) will benefit.

2. **`lens-reports-archive-list` candidate template** — new, register after Pass 3 build proves the pattern. Card grid (3-up / 4-up) with chip-based filter bar, low-volume archive of read-heavy artefacts, deep-linkable filters. Distinct from `launch-picker-grid-template` (cards-as-launchpads to workspaces) and from `sources-inbox-list` (inbox-shaped with NEW filter and bulk actions).

3. **`FilterChipGroup` molecule** (new, Pass 3) — already broadly applicable. Reuse cases: lens-reports list (this pass), future lens-runs activity log, future "reports linked to this source" filtered view, sources page filter bar v2 (replacing the current ad hoc NEW chip with a generalised filter bar).

---

## Status

This spec is ready for hard-gate review. Three structural decisions (1, 2, 3) and five smaller decisions (4–8) are pre-resolved with rationale; the spec itself follows them. Pass 2 contract extensions (3 of them) are documented as the seam.

**Approve to proceed to feature-build planning. Push back on any decision or section to revise.**
