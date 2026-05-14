# Session log — 2026-05-13 — INP-12 Phase 2 Pass 1 build
Session ID: `2026-05-13-inp12-phase2-pass1-build-q4n`

## What we worked on

- **INP-12** Phase 2 (Pass 1 — Sources surface UI build). Continuation of `2026-05-12-inp12-phase1-ingest-pipeline-h8m` (Phase 1 ingest pipeline) and `2026-05-12-inp12-phase0-foundation-r7k` (foundation). Spec: `01-design/wireframes/INP-12-pass1-layout.md`.

## What was done

### Foundation (D1)

- `02-app/lib/types/source-list.ts` — client-safe types: `SourceListRowData`, `SourceDetailData`, `ProcessingHistoryEntry`, `ChunkRowData`, `LinkedLensReportSummary`, `PersonSummary`, `SourceListFilters`. Added `ingestStatus` discriminated union (`'awaiting-text' | 'processing' | 'ready' | 'skipped'`) during the iteration round to drive a per-row badge.
- `02-app/lib/source-types.ts` — `SOURCE_TYPE_META` (13 source types → label + Lucide icon + default authority), `AUTHORITY_LABEL`, `sourceTypeOptions()`, `authorityOptions()`. Title-case labels per gate decision Q10.
- `02-app/lib/tag-hue.ts` — `tagHue(label)` djb2 hash → 1..8 for the DS-02 tag palette. Stable per-string. Per gate decision Q2: free-form tags get hash-hue (not the originally-proposed fixed hue 3) for visual variety.
- `02-app/lib/lens-meta.ts` — `LENS_META` (7 lenses → name + description + caveat + optional `inputForm`), `LENS_ORDER`, `isLensAvailable()` encoding the per-lens disabled rules from the spec, `allSourcesNonLensable()`.

### Queries + actions (D2–D3)

- Major rewrite of `02-app/lib/db/queries/sources.ts`. New: `listSources`, `getSourceDetail`, `getChunksForSource`, `getLinkedLensReports`, `getPeopleByIds`, `searchPeople` (ILIKE on label for case-insensitive Person match), `updateSourceFields`, `triageSources`, `markSingleTriaged`, `deleteSource`, `parkPersonAsUnresolved`. Kept the legacy `getInboxCount`, `getSourceDocuments` (compat shim for DNA-05 generation routes), `getSourcesByIds`. Removed the stale `updateSourceProcessingHistory` and `markSourcesTriaged`. Added `extractedTextLength` SQL projection + ingest-status derivation in `listSources` projection step.
- `02-app/lib/db/queries/lens-runs.ts` — new. `createLensRun({brandId, sourceIds, lens, lensInput?})` writes a `processing_runs` row with `status='pending'`; raises `LensNotApplicableError` if any picked source is `dataset` (per ADR-009). Phase 3 wires the actual LLM dispatch.
- `02-app/app/actions/sources.ts` — new. `updateSourceAction`, `triageSourcesAction`, `markSingleTriagedAction`, `deleteSourceAction`, `searchPeopleAction`, `parkPersonAction`, `resummariseSourceAction`, `dispatchLensRunAction`, `loadSourcePreviewAction`, and (added in the iteration round) `createSourceFromTextAction` for the paste-text flow.

### Molecules (D5 + iteration round)

11 new molecules + 1 extension landed this session. By order built:

1. **`InlineWarningBanner` extension** — `'info'` tone added (token-driven `--color-info*`, glyph `Info`). Spec line 2882 ("Don't add tone speculatively") gate satisfied: real consumers are the dataset notices on lens picker + source detail.
2. **`DateField`** (`02-app/components/date-field.tsx`) — InlineField-parity envelope wrapping the existing `DatePicker` molecule for the calendar engine. Initially used `onFocusCapture`/`onBlurCapture` for active-state tracking; iteration round switched to Tailwind `focus-within` + `group-focus-within` after the popover wasn't firing `onSelect` cleanly under the capture handlers.
3. **`TagListEditor`** — free-form `string[]` chip editor with hash-hued `TypeBadge` chips, free-text add, optional suggestion chips. Distinct from P4b's `TagChipEditor` (which edits a `LibraryTag` discriminated union).
4. **`LensPickerCard`** — single tile in the lens picker grid. Selected / hover / disabled states with disabled-reason tooltip.
5. **`ChunkPreviewRow`** — promoted from layout-spec's "atom-direct" caveat to a 6th molecule once it was confirmed two consumers needed it (preview pane + source detail Chunks section). Read-only chunk renderer.
6. **`SourceListRow`** — sources list row with dual click-affordance (body = preview, trailing chevron / Cmd-click = detail), NEW indicator, hash-hued tag row.
7. **`ParticipantsPicker`** — Person chip editor with type-ahead search + park-as-unresolved (per Q5 gate).
8. **`LensInputForm`** — *mid-build deviation*. Layout spec line 608 promised this as a registry slot but my Step B plan filed it as a future extension point. Discovered at organism build time when a raw textarea was about to land in the lens-picker-modal organism. Promoted to a molecule with v1 supporting only `decision-support` (decision-text textarea).
9. **`SectionLabel`** — *D+ refactor*. Promoted after the first pass of organisms carried `text-[10px] font-semibold uppercase tracking-wide text-muted-foreground` five-plus times inline.
10. **`LinkButton`** — *D+ refactor*. Tone-driven (`primary` / `muted` / `destructive`) inline text-link affordance. Consolidates 5+ inline `text-primary hover:text-primary/80` button patterns across organisms.
11. **`PlainTextField`** — *iteration round*. Controlled non-autosave text input/textarea for modals and explicit-submit forms. Composes `SectionLabel`. Used by the paste-text modal.

### Organism surfaces (D6–D7 + iteration round)

- `02-app/app/(dashboard)/inputs/sources/page.tsx` — server page with URL-driven filters.
- `02-app/app/(dashboard)/inputs/sources/sources-page-client.tsx` — orchestrator. Filter strip, selection bar, source list, preview pane mounting, modal hosting, file upload, paste-text modal trigger, delete confirms.
- `02-app/app/(dashboard)/inputs/sources/source-preview-pane.tsx` — 480px right-side preview pane. Composes `SectionCard`, `MarkdownRenderer`, `ChunkPreviewRow`, `TypeBadge`. Loads its data via `loadSourcePreviewAction`.
- `02-app/app/(dashboard)/inputs/sources/bulk-triage-modal.tsx` — set-all + per-row triage modal. Uses `InlineCellSelect` for per-row drops (autosave contract repurposed for "stage locally; commit on submit").
- `02-app/app/(dashboard)/inputs/sources/lens-picker-modal.tsx` — 7-tile grid with per-lens disabled states, dataset bypass banner, `LensInputForm` slot, dispatch toast.
- `02-app/app/(dashboard)/inputs/sources/paste-text-modal.tsx` — *iteration round*. Title + source-type + text, creates a source row + fires ingest. Replaces the deleted `/inputs/process` text-paste flow.
- `02-app/app/(dashboard)/inputs/sources/[id]/page.tsx` + `source-detail-client.tsx` — full-page detail with `PageChrome`, `InPageNav` (scrolls to anchors), 5 sections (4 for dataset), inline-edit metadata, re-summarise / delete sub-modals.

### Nav + deletions (D8)

- `02-app/lib/nav-config.ts` — removed `Process` from Inputs group; kept `Sources`, `Results`, `Ideas`.
- `02-app/app/(dashboard)/page.tsx` + `new-input-dropdown.tsx` — redirected old `/inputs/process` / `/inputs/queue` links to `/inputs/sources` (and `/inputs/sources?inbox=new` for the "Review all" affordance).
- Deleted: `02-app/app/(dashboard)/inputs/queue/`, `02-app/app/(dashboard)/inputs/process/`, `02-app/app/api/process/{individual,batch,reflective,synthesis}/`, `02-app/app/api/sources/triage/`, `02-app/app/(dashboard)/inputs/sources/sources-client.tsx`.
- Rescued from git history to keep `/inputs/results` (legacy INP-11) compiling until Phase 3 replaces it: `results-panel.tsx`, `category-section.tsx` — now living under `inputs/results/`. Updated the import path in `results-client.tsx`.

### Bug-fix round (after user manual test)

User tested through 30 scenarios. 9 issues found, all addressed:

| # | Bug | Fix |
|---|---|---|
| 1 | `All` tab dropped triaged rows when NEW items existed | Client always writes `?inbox=<value>` explicitly; server-side "default to NEW" only fires on first landing (no param at all). |
| 2 | Filter pills had no pointer cursor | Added `cursor-pointer` to `FilterPill`. |
| 3 | Bulk-delete button used `Library` Lucide icon | Swapped to `Trash2`. |
| 4 | Lens dispatch felt slow with no feedback | Added success toast `"<Lens name> queued — taking you to the run"` before navigation. |
| 5 | Ingest status invisible on the source row | Derived `ingestStatus` in `listSources`; surfaced as `StatusBadge` on line 1 + meta-line segment in `SourceListRow`. |
| 6 | `InPageNav` didn't scroll on click | Added `scrollIntoView({behavior:'smooth'})` in detail page's `onSelect`. |
| 7 | DateField calendar opened but selection didn't save | Removed `onFocusCapture`/`onBlurCapture` (interfered with base-ui popover focus); switched to `focus-within`/`group-focus-within` Tailwind variants. |
| 8 | `ParticipantsPicker` found no matches | Loosened `eq(label, 'Person')` to `ILIKE 'person'` so case variants from different importers all match. (Root cause was likely empty data — KG-04 politics import incomplete.) |
| 9 | Text-paste ingest was gone after `/inputs/process` deletion | Built `PasteTextModal` + `createSourceFromTextAction` (writes `extractedText` directly + fires `ingestSource`). Wired behind a new "New source" `ActionMenu` dropdown ("Upload file…" / "Paste text…"). Promoted `PlainTextField` molecule to absorb the inputs cleanly. |

User confirmed all 9 bugs resolved on retest.

### Registry + spec (continuous through build)

- `02-app/components/registry.ts` — 11 new entries (DateField, TagListEditor, LensPickerCard, ChunkPreviewRow, SourceListRow, ParticipantsPicker, LensInputForm, SectionLabel, LinkButton, PlainTextField, plus updated InlineWarningBanner). Final count: 118 registry entries (up from 107 at session start), 115 with spec anchors.
- `01-design/design-system.md` — 11 new spec entries + 1 amendment (InlineWarningBanner info tone). All anchors validate via `npm run check:design-system`.

### Backlog

- `00-project-management/backlog.md` — INP-12 "Feature-build progress" line updated. Phase 0 + Phase 1 done 2026-05-12; Phase 2 (Pass 1 UI) in progress 2026-05-13 → done 2026-05-14; Phase 3 + Phase 4 remaining. P4b overlap notes captured (DateField vs DatePicker, TagListEditor vs TagChipEditor distinct molecules).

### Verification at session end

- `npx tsc --noEmit` — 0 errors.
- `npm run check:fragments` — 21/21 (unchanged from Phase 1).
- `npm run check:design-system` — 0 INP-12 entries in either warning list. The 1 missing-spec + 6 atom-import warnings are all pre-existing (AddSamplesModal, platform/project/mission workspaces, page.tsx tooltip, the rescued INP-11 `results-panel.tsx` + `category-section.tsx`).
- `npm run build` — compiles cleanly (~10s). The `/` prerender failure is unchanged: same BUG-01 forwardRef issue called out in Phase 0 + Phase 1 logs.

## Decisions made

- **9 gate questions resolved at plan time** (line numbers from Pass 1 layout spec 829–838):
  1. Default filter on Sources page entry → "NEW when `inboxCount > 0`, else All". Kept current behaviour.
  2. Tag chip hue → **hash-based per-string** (changed from initial recommendation of fixed hue 3 after user input — visual variety, low cost).
  3. `Mark as triaged` on detail page → just flips `inboxStatus`. Metadata edits autosave separately.
  4. `description` vs `summary` → both kept on detail page; description only shown when non-empty.
  5. Park-as-unresolved supported in `ParticipantsPicker`. Pass 2 owns full canonical resolution.
  6. Quick-preview vs detail click → body click = preview; trailing chevron / Cmd-click = detail. Kept as proposed.
  7. Lens picker single vs multi-source → same modal; source-set summary degrades gracefully.
  8. `LensPickerCard` is a new molecule (not an extension of `ContentTypeCard`).
  9. *(new at plan time)* Keep `/inputs/results` (legacy INP-11) until Phase 3 replaces it. Lens picker dispatches into a real route rather than a toast-only stub.

- **Mid-build deviation #1: `LensInputForm` promoted.** Layout spec line 608 already named it as a registry slot; my Step B plan filed it as a "future extension point" rather than a Pass-1 molecule. Discovered at organism build time when a raw textarea was about to land inside `lens-picker-modal` (organism). Promoted to a 7th molecule with v1 supporting only `decision-support`. Spec added.

- **Mid-build deviation #2: D+ refactor for appearance classes.** The first pass of organism files carried `text-*` / `border-*` / `bg-*` classes for muted-microcopy, dividers, set-all-region chrome, and inline link buttons. Per CLAUDE.md the organism layer must compose molecules, not style atoms. The `check:design-system` script doesn't automate this scan (it only checks atom imports, not class strings) — surfaced manually via grep. **Fixed via two new molecules:** `SectionLabel` (consolidates the 10px uppercase label pattern) + `LinkButton` (consolidates inline `text-primary` link buttons, tone-driven: primary / muted / destructive). Also swapped per-row dividers to `SectionDivider`, swapped linked-lens-report cards to `ListItem`.

- **Mid-build deviation #3: `PlainTextField` molecule (iteration round).** The `PasteTextModal` initially had a raw `<input>` and `<textarea>` inside an organism. Same DS violation pattern. Promoted to a controlled-text-field molecule (variant `'input'` | `'textarea'`). Distinct from `InlineField` (autosave) and `ListRowField` (bare-chrome list rows). Composes `SectionLabel`.

- **`InlineWarningBanner` `'info'` tone** — added per the "extend tone only when a real consumer needs it" rule. Two consumers in INP-12: dataset bypass notice on lens picker + source detail page banner for `sourceType='dataset'`.

- **`updateSourceProcessingHistory` JSONB shape migration** — the old INP-11 `{date, mode, runId}` shape is gone. New shape is `{date, lens, processingRunId, lensReportId?, status, itemCount?, errorMessage?}`. The `normaliseHistory()` reader accepts both old and new shapes defensively so existing JSONB rows survive the rename. Phase 3's lens dispatch will write the new shape.

- **Person mirror writes stay Neon-only in Pass 1.** `parkPersonAsUnresolved` writes a row to `graph_nodes` with `properties.relationship_types=['unresolved']` but does NOT write to FalkorDB. Pass 2's contact-card flow lands the graph write. Parked unresolved people are Neon rows that aren't yet graph citizens — flagged for Pass 2.

- **`ParticipantsPicker` label query loosened to `ILIKE 'person'`** — case-insensitive across data sources to absorb whatever the politics importer produces (when KG-04 lands). Root cause of empty search results today is that the brand has no Person rows yet, which is correct given KG-04 is still in progress.

- **`/inputs/results` legacy is kept until Phase 3.** The lens picker dispatches there; Phase 3 replaces the page wholesale. Rescued `results-panel.tsx` + `category-section.tsx` from git history into `inputs/results/` to keep it compiling, since they were originally under the now-deleted `/inputs/process/`.

- **`feature-build` SKL-04 improved (self-improvement check).** Added an explicit appearance-class grep step to Step D+ to catch DS-01 organism-layer violations that the `check:design-system` script doesn't currently scan for. Will save the next feature-build a mid-build refactor.

No ADRs filed. All decisions sit within ADR-002a + ADR-009 + the Pass 1 layout spec envelope.

## What came up that wasn't planned

- **Backlog Pass 1/2/3 ticks were misleading.** At session start the backlog read "✅ Pass 1 done 2026-05-04" / "✅ Pass 2 done 2026-05-04" / "✅ Pass 3 done 2026-05-05" — those ticks marked *spec approval*, not build. Surfaced the conflict at the pre-condition gate; user clarified, and the parallel chat updated the backlog wording mid-session before I continued. After confirmation, the backlog's "Feature-build progress" line is now the authoritative state.

- **OUT-02-P4b is an active parallel session** in another window. Coordination rule per backlog: stage only Phase 2 INP-12 files at commit time. Leave every `library_*`, `pending_*`, `variant-*`, `column-*`, `rich-text-editor`, `tag-chip-editor`, `typed-tag-picker`, `date-picker`, `inline-hint`, `markdown/`, OUT-02-P4b session log / brief / wireframe untouched for that window. Migration `0038_milky_karen_page.sql` + its snapshot belong to OUT-02-P4b. I never modified any of those files.

- **DNA-02 (brand-meaning skill) is an active third parallel session.** Working tree shows untracked `01-design/briefs/DNA-02-brand-meaning-skill.md`, `01-design/wireframes/DNA-02-brand-meaning-skill-layout.md`, `02-app/components/skill-launch-button.tsx`, `02-app/lib/db/queries/skills.ts`, `02-app/lib/skills/dna-brand-meaning-generate/*`, plus modifications to `chat-area.tsx`, `chat-drawer.tsx`, `context-pane.tsx`, `top-toolbar.tsx`, `layout.tsx`, `lib/chat-drawer-context.tsx`, `lib/skills/registry.ts`, `lib/skills/types.ts`, `app/actions/skills.ts`, `lib/db/writes/dna/brand-meaning.ts`, `dna/brand-meaning/{page,brand-meaning-view}.tsx`, and the new session log `2026-05-12-out02-p4b-build-and-iteration-k3p.md`. None touched by this session — leave for that window's commit.

- **Atomic Lounge research files in the tree** — `04-documentation/reference/atomic_lounge/AL_*` + `reindustrialisation_reading/`, plus `politics_kg_schema.sql` and `secondeary colours.af` — these are user-curated reference material, not session output. Leave unstaged.

- **DateField bug under base-ui Popover focus management** was a real architectural learning: `onFocusCapture`/`onBlurCapture` on a wrapper interfere with portal-rendered popover content. Future molecules wrapping popover-based primitives should use `focus-within` / `group-focus-within` Tailwind variants rather than capture handlers. Worth flagging as a feature-build convention next time it bites.

## Backlog status changes

- **INP-12** — still `in-progress`. Phase 2 (Pass 1 UI) **done 2026-05-14**. Phase 3 (Pass 2 lens-review surface) is the next workstream. Updated `00-project-management/backlog.md` Feature-build progress line accordingly.

No other features touched.

## What's next

**Phase 3 — Pass 2 lens-review surface.** Spec: `01-design/wireframes/INP-12-pass2-layout.md`. Major components:

1. Schema-driven `<LensReportReview>` molecule + section renderers (array / object / prose / object-with-array hybrid) at `/inputs/results?run=<runId>`.
2. Canonical-resolution micro-UI (inline-on-row + lazy fuzzy-match + pre-fetched counts).
3. Contact-card modal (Person + Organisation, stages-not-writes).
4. Pre-flight commit prompt for unresolved Person/Org rows (three-way: park & commit all / commit resolved only / cancel).
5. Wires the actual LLM dispatch path that Phase 2's `createLensRun` only stubs with `status='pending'`. The composed prompt (`base + source-type + lens fragments`) + structured-output schema from `lib/types/lens.ts` is the input; output populates `processing_runs.extractionResult` or `lens_reports.result`.

**8 new molecules planned for Pass 2** (per backlog line 604):
`LensReportReview`, `LensReviewSection`, `LensReviewItemCard`, `SourceChip`, `MultiSelectField`, `MarkdownEditor`, `MatchCandidateCard`, `ContactCardForm`. Plus `ConfidenceBadge` extension for state-driven values.

**Open follow-ups from Pass 1 build:**

1. **Pass 2 spec audit before Phase 3 build.** Confirm whether the schema-metadata format at `lib/lens-review/metadata/[lens-id].ts` needs each of the 6 analysis lenses' metadata files written up-front, or whether they can land incrementally per-lens.
2. **The `/` route prerender failure (BUG-01 forwardRef) is still open.** Not Phase 2's surface; lives in `app/(dashboard)/page.tsx` or one of the home composition pieces. Worth tackling in a focused chat before Phase 3 lands, so prod deploy isn't gated on it.
3. **Ingest error surfacing.** Today if `ingestSource` throws in the background, the source stays "AWAITING TEXT" or "PROCESSING" forever. Phase 3 should add an `'error'` ingestStatus + a per-row `InlineWarningBanner` or click-through "View ingest error" affordance.
4. **`searchPeople` empty results today** because no Person rows exist for the brand (KG-04 politics import in progress). Phase 3's ParticipantsPicker reuse will need to handle non-empty graphs once KG-04d lands.
5. **`processing_history` JSONB shape migration backfill.** Existing rows still carry the old `{date, mode, runId}` shape. `normaliseHistory()` reads both, but a one-shot migration to rewrite old rows into the new shape would be cleaner. Low priority — only matters once Phase 3 starts producing real history entries.
6. **Templates flagged for registration** (post-Pass 1 ship): `sources-inbox-list` (Sources page) and `source-detail-pane` (source detail page). Register after Phase 3 reinforces the source-detail-pane shape with the lens-report page.

**Recommended approach for Phase 3:**
- Start a fresh chat per the same rationale as Phase 2 (context preservation; Pass 2 spec is dense + adds 8 molecules + canonical-resolution + contact-card).
- Invoke `feature-build` skill end-to-end so the molecule-plan hard gate enforces.
- The updated Step D+ in `feature-build` now includes the appearance-class grep — should catch the DS-01 drift trap that bit this session before refactor.

## Context for future sessions

- **The Pass 1 organisms are clean of appearance classes**, but the rule was enforced by manual grep, not script. The `check:design-system` script only audits direct atom imports, missing-spec entries, broken anchors, and orphan specs. CLAUDE.md's "no appearance classes in organisms" rule is a written convention, not an automated check. Future feature-build sessions: the updated SKL-04 Step D+ now mandates the grep. A future DS task should extend `02-app/scripts/check-design-system.ts` to automate it.

- **The 11 new molecules + 1 extension** brought the registry from 107 → 118 entries. Spec coverage is at 115/118 (97%). The 1 remaining gap is `AddSamplesModal` (pre-existing DS-03 backfill).

- **`PlainTextField` is the right molecule for explicit-submit modal text inputs.** Future modals that gather values without autosaving (creation modals, gated submits) should compose it. Distinct from `InlineField` (autosave) and `ListRowField` (bare list-row chrome).

- **`LinkButton` is the right molecule for inline text links.** Anywhere `text-primary hover:text-primary/80` was previously inlined ("Show more", "View all N →", "Re-summarise", "Open report →"), use `<LinkButton>` instead. Tones: `primary` / `muted` / `destructive`. Promote a `success` tone only when a real consumer requires it.

- **`SectionLabel` is the right molecule for the 10px uppercase mini-label.** Anywhere the `text-[10px] font-semibold uppercase tracking-wide text-muted-foreground` pattern was used to title a sub-block (chip rows, input clusters, micro-sections), use `<SectionLabel>` instead.

- **Base-ui Popover + capture-phase focus handlers don't mix.** Wrapping a popover-based primitive (`DatePicker`, `FloatingMenu` callers, base-ui `Select`) in a div with `onFocusCapture`/`onBlurCapture` interferes with the portal's focus management; the popover may open but events inside it won't propagate correctly to the wrapping component. Use Tailwind's `focus-within` and `group-focus-within` variants instead.

- **The `/inputs/results` page is legacy INP-11.** Phase 3 replaces it with the Pass 2 lens-review surface. The lens picker on Sources page dispatches to `/inputs/results?run=<runId>` today, which lands on stale chrome — known and accepted per Q9 gate decision. Rescued legacy components (`results-panel.tsx`, `category-section.tsx`) keep the page compiling; they go away when Phase 3 lands.

- **`createLensRun` only inserts a `processing_runs` row with `status='pending'`** — no actual LLM call happens in Phase 2. Phase 3 wires the dispatch. Users who run a lens today will see a "queued" toast and a stale results page; no analysis is produced.

- **Person canonical-resolution is a Pass 2 problem.** Pass 1's `ParticipantsPicker` only supports link-existing + park-as-unresolved (no creation flow). Parked unresolved people land in `graph_nodes` (Neon mirror) but NOT in FalkorDB. Pass 2's contact-card flow needs to handle promoting parked entries when the user later resolves them. Backlog item to track at Phase 3 plan time.

- **OUT-02-P4b coordination still holds.** When Phase 3 lands and Pass 2 introduces `MarkdownEditor`, confirm with the OUT-02-P4b window whether its `RichTextEditor` (TipTap-based) can be the foundation or whether they're distinct molecules.

- **The session ran across two days** (2026-05-13 plan + most of build, 2026-05-14 iteration round + commit). User retested all 9 bug fixes on 2026-05-14 and confirmed working. No outstanding bug reports.

## Self-improvement check

One light observation: the appearance-class drift trap that caused the D+ refactor mid-build was avoidable with one extra Step B check. **Improvement applied to `feature-build` SKL-04:** added an explicit grep step to Step D+ ("Design system drift check") that scans organism-layer files for inline `text-*` / `bg-*` / `border-*` / `shadow-*` Tailwind classes, in addition to running `check:design-system`. The script-level fix is to extend `02-app/scripts/check-design-system.ts` itself to do this scan — that's the more durable answer and worth tackling as a future DS task.
