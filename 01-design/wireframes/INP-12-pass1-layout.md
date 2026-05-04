# Layout Spec: INP-12 Pass 1 — Sources entry surfaces
Feature ID: INP-12 (Pass 1 of 3)
Status: draft — pending hard-gate review
Last updated: 2026-05-04
Template: no match (establishes `sources-inbox-list` and `source-detail-pane` candidate templates — register after build)

---

## Pass scope

Pass 1 covers the navigation spine of the new Source × Lens UI — the surfaces a user touches before any per-lens review happens. Four surfaces in total:

1. **Sources page** — list of all sources with `NEW` filter chip, search, type/authority filters, side preview pane.
2. **Bulk-triage flow** — multi-source assignment of source-type / authority / tags / participants, hybrid (set-all + per-row).
3. **Source detail view** — full-page route at `/inputs/sources/[id]`. Summary, chunks, processing history, linked lens reports.
4. **Lens picker** — modal launched from Sources page (or source detail) that runs a chosen lens against selected sources, with `dataset` disabled-state.

Out of scope for Pass 1: the lens-result review surface (Pass 2), the committed lens-report page (Pass 3), filter/search/sort polish on Sources (acknowledged out of scope in the brief), canonical-resolution and contact-card flows (Pass 2).

---

## Views needed

| View | Purpose | When it appears |
|---|---|---|
| **Sources page** | Browse, filter, multi-select, dispatch to lens | `/inputs/sources` |
| **Source quick-preview pane** | 480px right-side panel with summary + first chunks | Click a row's title (in-list) — does NOT navigate |
| **Source detail page** | Full read-heavy view of one source | `/inputs/sources/[id]` (deep-linkable) |
| **Bulk-triage modal** | Assign source-type/authority/tags/participants to N selected | Trigger: "Triage" button in selection bar (visible when ≥1 NEW source selected) |
| **Lens picker modal** | Pick a lens and run it against selected sources | Trigger: "Run lens" button in selection bar (visible when ≥1 source selected) |
| **Re-summarise confirm** | Confirm regeneration of source summary | Trigger: "Re-summarise" button in source detail header |
| **Delete confirm** | Confirm hard-delete of a source | Trigger: trash icon in row or detail header |

---

## Navigation and routing

- **Entry to Sources:** sidebar `Inputs` section → `Sources` sub-item → `/inputs/sources`
  - Drops the previous Inbox sidebar item per brief (the NEW label collapses Inbox into Sources).
  - Default landing: list filtered to "All" (not NEW) — most workflows start with a known source rather than from the inbox. **Open question: should default be NEW when `inboxCount > 0`?** Current implementation does that; the brief states "filter defaults to NEW" — going with NEW-when-non-zero.
- **Routes:**
  - `/inputs/sources` — list (this page)
  - `/inputs/sources/[id]` — detail view (full page, replaces list in viewport)
  - `/inputs/results` — already exists, kept (Pass 2 lens-review surface lands here)
- **From list to detail:** click the source row's chevron / "Open" affordance OR cmd-click the row to deep-link. Clicking the title body opens the side preview, NOT the detail. (Two affordances — keeps the inbox-scan rhythm.)
- **From detail back to list:** breadcrumb / back link in PageChrome subheader: `← All sources`. Browser back also works.
- **Deep-linking:** `/inputs/sources/[id]` is share-safe — sources cited by chat or lens reports link directly. Includes a "View in list" affordance to jump back to the parent list with the source highlighted.

---

## 1. Sources page layout

### Page structure

Uses `PageChrome` + `ContentPane` per the established convention. No tabs at the page level — filtering happens via filter chips inside the content pane.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ PageHeader: "Sources"  · subtitle: "Everything you've fed BigBrain"              │
│                                                       [⬆ Upload]                 │
├──────────────────────────────────────────────────────────────────────────────────┤
│ ContentPane                                                                      │
│ ┌────────────────────────────────────────────┐  ┌───────────────────────────┐  │
│ │ MAIN LIST PANE (flex-1 min-w-0)            │  │ QUICK-PREVIEW PANE        │  │
│ │                                            │  │ (w-[480px] shrink-0)      │  │
│ │ Filter strip                               │  │ — only when row selected  │  │
│ │ ┌──────────────────────────────────────┐   │  │   for preview             │  │
│ │ │ [● NEW (12)] [All] [Triaged]         │   │  │                           │  │
│ │ │ [Source type ▾] [Authority ▾]        │   │  │   ┌────────────────────┐ │  │
│ │ │ [🔍 search ............]             │   │  │   │ Title         [✕]  │ │  │
│ │ └──────────────────────────────────────┘   │  │   │ meta line          │ │  │
│ │                                            │  │   ├────────────────────┤ │  │
│ │ Selection bar (when ≥1 selected)           │  │   │ Summary            │ │  │
│ │ ┌──────────────────────────────────────┐   │  │   │ (300 words)        │ │  │
│ │ │ [☑] 3 selected                        │   │  │   │                    │ │  │
│ │ │   [Triage] [Run lens] [Delete]       │   │  │   │ — first 5 chunks   │ │  │
│ │ │   [Clear selection]                   │   │  │   │ (collapsed)        │ │  │
│ │ └──────────────────────────────────────┘   │  │   │                    │ │  │
│ │                                            │  │   │ [Open full view →] │ │  │
│ │ Source list                                │  │   └────────────────────┘ │  │
│ │ ┌──────────────────────────────────────┐   │  │                           │  │
│ │ │ [☐] [icon]  Title           [● NEW]  │   │  │                           │  │
│ │ │     type · authority · 2 mins · ↗   │   │  │                           │  │
│ │ │     tag · tag · tag                  │   │  │                           │  │
│ │ ├──────────────────────────────────────┤   │  │                           │  │
│ │ │ [☐] [icon]  Title                    │   │  │                           │  │
│ │ │     type · authority · processed 3×  │   │  │                           │  │
│ │ │     tag · tag                        │   │  │                           │  │
│ │ └──────────────────────────────────────┘   │  │                           │  │
│ │                                            │  │                           │  │
│ │ N sources · M new                          │  │                           │  │
│ └────────────────────────────────────────────┘  └───────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Header (PageHeader + action slot)

- **Title:** "Sources"
- **Subtitle:** "Everything you've fed BigBrain"
- **Right action:** `<ActionButton icon={Upload}>Upload</ActionButton>` — opens native file picker (multiple files). Uploading file triggers ingest (chunking, summary, embedding) per brief; new sources land with `inboxStatus = 'new'`.

### Filter strip

Sits at the top of `ContentPane`, in a `flex flex-col gap-3 border-b pb-4 mb-4` container — same shape as `PickerFilterBar` but with different controls. Hint at re-using `PickerFilterBar`? **No** — picker filter bar is shaped for category+channel multi-select on a content-type picker; here we have a tri-state single-select chip group plus two single-selects. Different molecule.

Three rows of controls:

**Row 1 — inbox-status pills** (single-select via `FilterPillGroup`):
- `[● NEW (12)]` — primary-tinted when active. Count badge = sources where `inboxStatus = 'new'`. The leading dot is the same `●` used as the per-row NEW indicator (visual continuity).
- `[All]` — neutral default. No count.
- `[Triaged]` — sources where `inboxStatus = 'triaged'` (i.e. previously NEW but reviewed).

**Row 2 — type + authority single-selects** (compact `Select` atoms, not `SelectField` — these are filters, not labelled form fields):
- Source type — 13 options + "All types". Default "All types".
- Authority — 4 options + "All authorities". Default "All authorities".
- Both sit side-by-side, w-44 each, with a small leading icon (`Tag` for source type, `Shield` for authority).

**Row 3 — search** (full-width `SearchInput`):
- Placeholder: `Search by title, summary, or tag…`. 350ms debounce. Searches `title`, `summary`, and `tags`.

State sync: filter state persisted in URL query params (`?inbox=new&type=client-interview&q=…`). Deep-linkable filtered views.

### Selection bar (only when ≥1 selected)

Sits between filter strip and source list. `flex items-center gap-3 mb-3 text-sm`.

```
[☑ Deselect all] · 3 selected   [Triage] [Run lens]   [Delete]   [Clear]
```

- **Select-all checkbox** — toggles all *currently visible* (post-filter) rows.
- **Counter** — `N selected` text-muted-foreground.
- **Triage** — primary `ActionButton`. Disabled (with tooltip "Triage applies to NEW sources only") when none of the selected sources are `inboxStatus = 'new'`.
- **Run lens** — secondary `ActionButton`. Always enabled when ≥1 selected.
- **Delete** — `IconButton` with `Trash2`, destructive variant. Tooltip "Delete N sources".
- **Clear** — text link, deselects all.

When `selected = 0`, the bar collapses entirely (no empty 40px strip).

### Source list

Vertical list, divided rows. Uses `ListItem` molecule (density `default`).

**Each row:**

```
┌────────────────────────────────────────────────────────────────┐
│ [☐ checkbox]  [type icon]  Title text                  [● NEW] │
│              type · authority · 4 chunks · processed 2× · 3d   │
│              [tag] [tag] [tag] +2                              │
└────────────────────────────────────────────────────────────────┘
```

- **Leading slot** of `ListItem`: checkbox + 4×4 type icon (Lucide, varies by source-type — `FileAudio` for transcripts, `FileText` for documents, `Image` for images, etc.).
- **Body** (children slot):
  - Line 1: `Title` (`text-sm font-medium truncate`) + trailing `NEW` indicator (a small `StatusBadge` state-shaped, value=`new`, label=`NEW`, no `onChange` — read-only). Hidden when `inboxStatus !== 'new'`.
  - Line 2: meta line (`text-xs text-muted-foreground`) — pipe-separated: `source_type label` · `authority label` · `N chunks` · `processed Nx` (only if processing history non-empty) · relative date.
  - Line 3: tags. First 3 rendered as `TypeBadge` (size xs, hue from a stable hash of the tag string OR a fixed hue=3 muted custard — see "Open questions"). `+N more` overflow indicator. Hidden when no tags.
- **Trailing slot:**
  - On hover: `IconButton` with `ArrowRight` ("Open detail") + `IconButton` with `Trash2` ("Delete").
  - Always visible: a 16px overall right-padding so trailing icons don't crowd the title on hover.

**Row click semantics:**
- **Click on row body (anywhere except trailing icons or checkbox):** opens the **quick-preview pane** on the right (or closes it if already open for this row). Sets `previewId` state. NO navigation.
- **Click on trailing `→ Open detail`:** navigates to `/inputs/sources/[id]` (full page).
- **Cmd/Ctrl + click anywhere on the body:** opens detail in new tab.
- **Click on checkbox:** toggles selection only. Doesn't open preview.

This dual affordance (preview vs open) was the intent in Q1 — preview lets you scan, "Open" commits to a deep view. Single click = preview keeps the current INP-11 muscle memory.

**Active-state styling:**
- Currently being previewed: `bg-muted/60`.
- Selected (checkbox checked): `bg-primary/5`.
- Both: muted wins (preview takes visual priority).

### Footer counter

Below the list: `text-xs text-muted-foreground` — `N sources · M new`. Updates live with filters.

### Empty states (Sources page)

| Filter state | Heading | Description | CTA |
|---|---|---|---|
| `NEW` filter, no NEW sources | "Inbox is clear" | "Nothing waiting for triage. New transcripts from Krisp will appear here automatically." | none |
| `All` filter, zero sources | "No sources yet" | "Upload a transcript, document, or paste text to get started." | "Upload" (opens file picker) |
| Filter applied, no matches | "No matches" | "Try a different filter or search term." | "Clear filters" |

All use the `EmptyState` molecule.

### Loading state (Sources page)

`PageSkeleton` for first load. Filter/search updates use a thin `[Loader2 spinner]` indicator inline with the filter strip's right edge while in flight (no full-list flicker).

---

## 2. Quick-preview pane

Right-side panel inside `ContentPane`, w-[480px] shrink-0. Slides in when a row is preview-clicked. **Not** a separate route — purely client state.

### Header

```
┌──────────────────────────────────────────┐
│ Title (truncates at 2 lines)         [✕] │
│ source-type · authority · date           │
│ [tag] [tag] [tag]                        │
└──────────────────────────────────────────┘
```

- Title: `text-sm font-display font-semibold`, 2-line clamp.
- Meta line: `text-xs text-muted-foreground`.
- Tags: small `TypeBadge` row (max 5, then `+N`).
- Close button: `IconButton` with `X`, no tooltip needed (universal pattern).

### Body (scrollable)

- **Summary section** (`SectionCard`-style label "SUMMARY"): renders the LLM-generated summary as plain text, ~300 words. If summary is null (still being generated): show skeleton + "Summary generating…" with `[Loader2]`. If summary failed to generate: warning banner via `InlineWarningBanner`.
- **First chunks section** (label "FIRST CHUNKS"): scrollable list of the first 5 chunks rendered compactly:
  - Speaker name (if `chunk_type = 'speaker-turn'`) in `text-xs font-medium uppercase`.
  - Chunk text in `text-sm whitespace-pre-wrap` (truncated at ~250 chars per chunk with `…show more`).
  - For non-speaker chunk types (paragraph, section, row, item): just the text.
- "View all N chunks →" link below — navigates to detail view scrolled to chunks section.

### Footer (sticky)

```
┌──────────────────────────────────────────┐
│ [Open full view →] [Run lens]            │
└──────────────────────────────────────────┘
```

Two actions:
- **Open full view** — `ActionButton` outline, navigates to `/inputs/sources/[id]`.
- **Run lens** — `ActionButton` primary, opens lens picker scoped to this single source.

### Mobile / narrow viewport

If main list pane width < 600px when preview is open: overlay rather than push (absolute over the list with semi-transparent scrim). Below `min-w-[1024px]` the dashboard is gated by `ScreenSizeGate` — assume desktop.

---

## 3. Source detail page

Full-page route at `/inputs/sources/[id]`. The list is replaced by this view in the viewport — Sources page navigation IS the history (browser back returns to filtered list).

Uses the `source-detail-pane` shape — establishes a candidate template for Pass 3's `LensReport` page.

### Page structure

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ PageChrome:                                                                       │
│   PageHeader: [icon] Title (inline-editable)  · [Run lens] [⋯]                   │
│     subtitle: source-type · authority · date · krisp ID (if any)                 │
│   Subheader slot:                                                                 │
│     [← All sources]  ·  [● NEW indicator if applicable]  ·  [Mark as triaged]    │
├──────────────────────────────────────────────────────────────────────────────────┤
│ ContentPane (padding=true)                                                       │
│ ┌──────────────────────────────────────────────────────────────────────────────┐ │
│ │ flex gap-6                                                                    │ │
│ │ ┌────────┐  ┌────────────────────────────────────────────────────────────┐  │ │
│ │ │InPageNav│  │ MAIN BODY (flex-1 min-w-0 flex flex-col gap-8 pb-16)      │  │ │
│ │ │ w-36    │  │                                                            │  │ │
│ │ │ • Meta  │  │ ## Metadata                                                │  │ │
│ │ │ • Summ. │  │ [InlineField title]                                        │  │ │
│ │ │ • Chunks│  │ [SelectField source-type] [SelectField authority]          │  │ │
│ │ │ • Hist  │  │ [InlineField description (textarea)]                       │  │ │
│ │ │ • Reps. │  │ [tags editor] [participants picker]                        │  │ │
│ │ │         │  │ [date picker]                                              │  │ │
│ │ │         │  │                                                            │  │ │
│ │ │         │  │ ## Summary                                                 │  │ │
│ │ │         │  │ {LLM-generated summary in MarkdownRenderer}                │  │ │
│ │ │         │  │ Generated: 4 May 2026 · [Re-summarise]                     │  │ │
│ │ │         │  │                                                            │  │ │
│ │ │         │  │ ## Chunks (24)                                             │  │ │
│ │ │         │  │ Each chunk in a card / divider list. Speaker turn-by-turn. │  │ │
│ │ │         │  │                                                            │  │ │
│ │ │         │  │ ## Processing history (3)                                  │  │ │
│ │ │         │  │ Timeline: which lenses ran, when, status.                  │  │ │
│ │ │         │  │                                                            │  │ │
│ │ │         │  │ ## Linked lens reports (1)                                 │  │ │
│ │ │         │  │ Cards linking to committed reports drawing on this source. │  │ │
│ │ └────────┘  └────────────────────────────────────────────────────────────┘  │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Header chrome

**PageHeader title slot:**
- The title is **inline-editable** via `InlineField` (variant: input). Saves on blur with debounce (Save contract).
- Leading icon: source-type icon (FileAudio, FileText, Image, etc.).

**PageHeader action slot:**
- `ActionButton` primary "Run lens" — opens lens picker scoped to `[this source]`. **Disabled** for `sourceType = 'dataset'` (with tooltip "Lenses don't apply to datasets — view in graph").
- `ActionMenu` with `MoreHorizontal` icon, items:
  - "Re-summarise" — opens confirm modal, then triggers regeneration.
  - "Re-extract chunks" — disabled with tooltip "Coming soon" (out of scope per brief).
  - "Open in graph" — for `dataset` sources, links to the graph view of the SourceCollection node. **For `dataset` sources, this becomes a primary `ActionButton` instead of a menu item.**
  - Divider.
  - "Delete" — destructive, opens confirm modal.

**Subheader slot (PageChrome):**
- `← All sources` — back link to `/inputs/sources` (preserves any active filters via URL state).
- `●` NEW indicator (small) when `inboxStatus = 'new'`.
- "Mark as triaged" button — small `ActionButton` outline, only visible when `inboxStatus = 'new'`. Flips to "Triaged ✓" briefly on click then disappears.

**Subtitle:** computed string — `<source-type label> · <authority label> · <document_date> · krisp:<id-short>` (if krisp). Krisp ID badge clickable to copy.

### Content layout

`InPageNav` molecule on the left (sticky, w-36) with five anchor sections:
1. **Metadata** (default scroll target)
2. **Summary**
3. **Chunks** (`(N)` count badge)
4. **Processing history** (`(N)` count badge)
5. **Linked lens reports** (`(N)` count badge)

#### Section: Metadata

`SectionCard` titled "Metadata". Inline-editable fields. Save contract per molecule.

Fields:
- `Title` — `InlineField` input variant, label "Title", icon `Type`. (Already in PageHeader — flag this duplication. **Decision:** keep title only in PageHeader, NOT here. Use this section for the rest of metadata.)
- `Source type` — `SelectField` with 13 options.
- `Authority` — `SelectField` with 4 options.
- `Description` — `InlineField` textarea variant (rows=3), label "Description", icon `AlignLeft`. Optional, free-form. Distinct from `summary` (which is LLM-generated).
- `Tags` — needs a **new molecule** (`TagListEditor`) — see Molecule composition.
- `Participants` — needs a **new molecule** (`ParticipantsPicker`) — see Molecule composition.
- `Document date` — `InlineField` input type=date OR a `DateField` molecule if one exists. **None exists** — use plain `Input type="date"` directly is a DS-01 violation. **Add new molecule `DateField`** OR defer date editing to v2 with a footnote. **Decision:** add `DateField` (it'll be reused on lens-reports and likely missions/projects).

Layout: 2-column grid (`grid grid-cols-2 gap-4`) for SelectFields and date; full-width for InlineFields and the editors.

#### Section: Summary

`SectionCard` titled "Summary". Body:
- The LLM-generated summary rendered via `MarkdownRenderer` (compact=false).
- If `summary === null`: empty state with `[Loader2]` "Summary generating…" or `EmptyState` "No summary yet" + "Generate summary" button.
- Below summary: muted footer line — `Generated: <relative time>` + `[Re-summarise]` text-link button.

For `dataset` and `collection` source types: summary section becomes "Overview" — describes the structure (count of items/rows, schema if known) rather than a narrative summary.

#### Section: Chunks

`SectionCard` titled `Chunks (N)`. Body:

For transcripts (`chunk_type = 'speaker-turn'`):
```
┌────────────────────────────────────────────────────────────┐
│ ELLIE  ·  00:02:14                                         │
│ I think the thing about defence-tech is that we keep       │
│ talking about it as if it's one market…                    │
├────────────────────────────────────────────────────────────┤
│ JUSTYNA  ·  00:02:51                                       │
│ Right, but the procurement cycles are completely…          │
└────────────────────────────────────────────────────────────┘
```

Each chunk is a row: speaker name (uppercase, font-medium, primary colour or muted) + position/timestamp meta + text (whitespace-pre-wrap). Divider between rows. No edit affordances (chunks are immutable per brief).

For documents (`chunk_type = 'paragraph'` or `'section'`):
```
§3.2 — Risk assessment
Lorem ipsum dolor sit amet, consectetur adipiscing elit…
```
Section heading (if present) + chunk text. Divider between.

For datasets and collections: no chunks list — instead a link "View N items in graph →" pointing to the SourceCollection's graph view.

For sources with extracted_text but no chunks (e.g. ingest still processing): "Chunking in progress…" with `[Loader2]`.

**Long chunks:** truncate after ~30 lines with "Show more" expand affordance. No edit. No selection. (Future v2: chunk-level highlighting/annotation.)

#### Section: Processing history

`SectionCard` titled `Processing history (N)`. Body: a timeline. Each entry:

```
┌────────────────────────────────────────────────────────────┐
│ ● 12 Apr 2026 · surface-extraction · committed             │
│   23 items extracted → committed to graph                  │
│   [View results →]                                         │
├────────────────────────────────────────────────────────────┤
│ ● 28 Mar 2026 · pattern-spotting · committed               │
│   5 themes identified · linked to lens report              │
│   [Open report →]                                          │
└────────────────────────────────────────────────────────────┘
```

- Each entry shows: dot indicator (status colour), date, lens label, status pill (`StatusBadge` state-shaped, value mapped from status).
- Result line: `N items extracted` / `N themes identified` / `failed: error`.
- Link: for surface-extraction → `/inputs/results?run=<id>` (Pass 2). For analysis lenses → `/inputs/lens-reports/[id]` (Pass 3).

Empty state: "No processing yet. Run a lens above to extract knowledge or analyse this source."

#### Section: Linked lens reports

`SectionCard` titled `Linked lens reports (N)`. Body: cards (or list rows) showing each committed lens report drawing on this source via `ANALYSED_FROM` edges.

```
┌──────────────────────────────────────────────────────────┐
│ Pattern-spotting across 7 fundraising interviews         │
│ pattern-spotting · committed 2 May 2026 · 5 themes       │
│ This source contributed to: theme #2, theme #4           │
│ [Open report →]                                          │
└──────────────────────────────────────────────────────────┘
```

This is a different list from Processing history (history shows runs *originating* from this source; linked reports shows reports *drawing on* this source — including reports run on a multi-source set that included this source).

Empty state: "No lens reports include this source yet."

### Layout for `dataset` source type (special case)

Per brief: `dataset` sources can't have lenses run against them. Detail view differences:
- "Run lens" replaced with "Open in graph" primary action.
- Chunks section replaced with "Items (N) — view in graph →" stub.
- Summary section becomes "Overview" with structural description.
- Processing history empty (datasets bypass the lens path entirely).
- Linked lens reports section hidden.
- A muted info banner at top: "Datasets are queried by graph traversal. Lenses don't apply." Use `InlineWarningBanner` with `tone='success'` … actually that's wrong; the existing molecule has `'warning' | 'success'`. **Add a `'neutral'` tone** OR use `EmptyState` style inline. **Decision:** extend `InlineWarningBanner` with a third tone `'info'` — see Molecule composition.

### Edit / save behaviour

- All metadata fields autosave per the standard contract (InlineField, SelectField).
- Title edit: same contract.
- Description, tags, participants: standard contract.
- Re-summarise: explicit confirm modal, then async; show inline `[Loader2] Summary regenerating…` until done.
- No "edit mode" — everything inline, always.

### Delete

`Modal` size `md`, title "Delete source?". Body: "This will permanently delete '{title}', its N chunks, and break any lens-report references. This cannot be undone." Footer: Cancel / Delete (destructive). On confirm: delete via API, redirect to `/inputs/sources` with a toast "Deleted '{title}'".

For sources with linked lens reports: warning prompt — "This source is referenced by N lens reports. Deleting will mark those reports as having a missing source. Continue?" — same Archive-like dependency check (consider re-using `ArchiveItemModal` shape with an "Are you sure?" mode).

---

## 4. Bulk-triage flow (modal)

Triggered from selection bar `Triage` button. Available only when ≥1 selected source has `inboxStatus = 'new'`.

`Modal` size `2xl` (largest standard size — fits the per-row table). Title: `Triage N sources`.

### Modal layout

```
┌──────────────────────────────────────────────────────────────────┐
│  Triage 4 sources                                            [✕] │
├──────────────────────────────────────────────────────────────────┤
│  Apply to all                                                    │
│  [Source type ▾]  [Authority ▾]   [Apply →]                      │
│  Tip: per-row overrides happen below.                            │
├──────────────────────────────────────────────────────────────────┤
│  Per-source                                                      │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │ Title                Type        Authority   Tags  People  │  │
│  ├────────────────────────────────────────────────────────────┤  │
│  │ Counsel call ... 4   [client-…▾] [own ▾]    [+]   [+]    │  │
│  │   ↳ summary teaser line                                   │  │
│  │ ─────────────────────────────────────────────────────── │  │
│  │ Justyna check-in     [accoun-…▾] [peer ▾]   [+]   [+]    │  │
│  │   ↳ summary teaser line                                   │  │
│  │ ─────────────────────────────────────────────────────── │  │
│  │ … (scrollable, max 6 rows visible, list scrolls)          │  │
│  └────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────┤
│                                  [Cancel]  [Triage 4 sources ✓] │
└──────────────────────────────────────────────────────────────────┘
```

### Set-all bar (top)

A `flex items-end gap-3` row inside a `bg-muted/40 rounded-md p-3` block. Contains:
- `Source type` — `SelectField` (with placeholder "Apply to all") width=200.
- `Authority` — `SelectField` (with placeholder "Apply to all") width=160.
- `Apply →` — small `ActionButton` outline. Pressing it sets the selected values across every per-source row below. The set-all selectors then reset to placeholder.
- Tip line: `text-xs text-muted-foreground` — "Per-source overrides happen below."

**No tags / participants in set-all.** These genuinely vary per source, and tag suggestions come from the per-source summary.

### Per-source list

A scrollable list (`max-h-[400px] overflow-y-auto`). Each row uses a custom layout (not `ListItem` — needs more affordances per row).

Each row:
- Title (truncated) + below it, a 1-line summary teaser (first 100 chars of summary, italic, muted).
- `InlineCellSelect` for source type (compact).
- `InlineCellSelect` for authority.
- `[+ tag]` button — opens a small popover with current tags as removable chips + input to add. Tag suggestions (from summary) shown as preset chips that can be one-click added.
- `[+ person]` button — opens a popover with participants list + search to add (uses canonical-resolution-light: search existing People, "no match" route disabled in Pass 1 per brief — Person creation lives in Pass 2's contact-card flow). Participants suggestions (from speaker-turn analysis) shown as preset chips.

**Initial values per row:** populated from existing source data — so if a source already has source-type assigned (because it came in from upload with manual assignment), that's the starting value. Tags pre-populated with at-ingest suggestions.

### Modal footer

- `Cancel` outline button.
- `Triage N sources ✓` primary button. Validation: every row needs source-type and authority set (no nulls). Disabled while async in flight; spinner + "Triaging…" during.

### On commit

- Writes all values per-source.
- Sets `inboxStatus = 'triaged'` on every row.
- Closes modal.
- Toast: "Triaged N sources".
- List refreshes; `NEW` filter chip count drops.

### Edge case: triaging across many sources (>20)

For now no special handling — the list scrolls. If it becomes a problem in re-ingest day, we add pagination or "Continue with N more" affordance.

### Edge case: validation error mid-list

If any row fails validation: highlight the offending row(s) with `border-destructive`, scroll to first, focus the first invalid field. Modal stays open.

---

## 5. Lens picker (modal)

Triggered by:
- Selection bar `Run lens` button on Sources page (with N selected sources).
- `Run lens` button in source detail PageHeader (single source).
- `Run lens` button in quick-preview footer (single source).

`Modal` size `lg`. Title: `Run a lens`.

### Modal layout

```
┌────────────────────────────────────────────────────────────────────┐
│  Run a lens                                                    [✕] │
│  Across 3 sources: Counsel call · Justyna check-in · McKinsey...   │
├────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐  ┌──────────────────────┐                │
│  │ ⓘ surface-extraction │  │ ⓘ pattern-spotting   │                │
│  │ Discrete items —     │  │ Recurring themes,    │                │
│  │ ideas, people, orgs… │  │ convergences…        │                │
│  │ Default extraction.  │  │ Needs 2+ sources.    │                │
│  └──────────────────────┘  └──────────────────────┘                │
│  ┌──────────────────────┐  ┌──────────────────────┐                │
│  │ ⓘ self-reflective    │  │ ⓘ project-synthesis  │                │
│  │ Realisations,        │  │ Methodology, what    │                │
│  │ shifts, blockers…    │  │ worked, narrative…   │                │
│  └──────────────────────┘  └──────────────────────┘                │
│  ┌──────────────────────┐  ┌──────────────────────┐                │
│  │ ⓘ catch-up           │  │ ⓘ decision-support   │                │
│  │ What's new since     │  │ Interrogate corpus   │                │
│  │ last time…           │  │ against a decision   │                │
│  └──────────────────────┘  └──────────────────────┘                │
│  ┌──────────────────────┐                                          │
│  │ ⓘ content-ideas      │                                          │
│  │ Hooks, angles,       │                                          │
│  │ formats…             │                                          │
│  └──────────────────────┘                                          │
├────────────────────────────────────────────────────────────────────┤
│  [Selected: decision-support]                                      │
│                                                                    │
│  Decision text                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ What does this corpus say about Q3 defence-tech roundtable?  │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  Required for decision-support.                                    │
├────────────────────────────────────────────────────────────────────┤
│                                          [Cancel]  [Run lens →]   │
└────────────────────────────────────────────────────────────────────┘
```

### Source-set summary (top of modal)

Below the title, a meta line: `Across N sources: <Title 1> · <Title 2> · <Title 3 if N=3, else "and N-2 more">`. Truncated. Click to expand the full list (toggles a small inline list).

If sources include a `dataset`: warning row (`InlineWarningBanner` tone='warning'): "1 dataset source can't be lensed — it'll be skipped. [View in graph →]".

If sources include a mix of source-types: muted note: `Sources span N source types — lens runs once per source.` (Per the brief, lens application takes a `source_type_filter?` for batched runs but v1 runs one big composite call.)

### Lens grid

3-column grid (or 2-column if width allows) of lens tiles. Each tile is a card-shaped picker, similar in spirit to `ContentTypeCard` but **simpler** (no favourite, no lock, no thumbnail) — needs a new molecule `LensPickerCard` or we extend `ContentTypeCard` to support this lighter variant. **Decision:** new molecule `LensPickerCard` — see Molecule composition.

Each tile:
- Top: lens name (`text-sm font-display font-semibold`) — e.g. "Surface extraction".
- Below: one-line description from a const map.
- Bottom: optional caveat text — `Needs 2+ sources` (muted, `text-[11px]`) when applicable.
- Hover: `border-primary/40 bg-muted/30`.
- Selected: `border-primary bg-primary/5`. Single-select; click another to switch.
- Disabled (when source set fails the lens's requirements): `opacity-60 cursor-not-allowed` with tooltip explaining why.

**Per-lens tile state:**
| Lens | Disabled when |
|---|---|
| `surface-extraction` | never (always available; runs per-source) |
| `pattern-spotting` | <2 sources OR all sources are `dataset` |
| `self-reflective` | <1 source (always usable but works best with 2+; soft warning, not disabled) |
| `project-synthesis` | <1 source (usable on a single project's set) |
| `catch-up` | <2 sources |
| `decision-support` | <1 source |
| `content-ideas` | <1 source |

If ALL sources are `dataset`: every tile is disabled with a single banner saying "Datasets bypass lens processing".

### Lens-specific input slot

When the user selects a lens that requires input (currently only `decision-support`), an additional input area appears below the grid:
- `decision-support` → labelled textarea ("Decision text") with placeholder "e.g. Should I run a defence-tech investor roundtable in Q3?"
- Other lenses → no input required; this slot is empty.

This is an extension point: future lenses (e.g. `catch-up` could grow a "since when?" date input) can add input fields per-lens. Layout-side: we render a `<LensInputForm lens={selectedLens} />` slot — its registry maps each lens id to an optional input form. v1 has only `decision-support` populated.

### Footer

- `Cancel` outline.
- `Run lens →` primary. Disabled until: (a) a lens is selected AND (b) any required input is filled. On click: posts run, closes modal, navigates to `/inputs/results?run=<runId>` (Pass 2 surface).

### Loading state

While the run is being created (POST to API): footer button shows spinner + "Starting…". Modal locked; Cancel disabled.

### Error state

If the API rejects (e.g. `LensNotApplicableError` for dataset-only set): inline error toast + modal stays open with the error reflected in the affected tile. If it's a generic failure: error toast + "Try again" affordance.

---

## 6. Re-summarise / Delete confirms

Both `Modal` size `md` with standard `[Cancel] [Confirm]` footer. Standard pattern; nothing novel.

- **Re-summarise:** "This will replace the current summary with a freshly generated one. The previous summary is not retained." Cancel / Re-summarise (primary).
- **Delete:** "Permanently delete '{title}'? This will also delete N chunks. Lens reports referencing this source will break." Cancel / Delete (destructive). For sources with non-zero linked-lens-report count, the destructive variant is gated behind a typed-confirmation ("Type DELETE to confirm").

---

## Empty states (per major view, summary)

| View | Condition | Heading | Description | CTA |
|---|---|---|---|---|
| Sources list | filter=NEW, count=0 | "Inbox is clear" | "Nothing waiting for triage." | none |
| Sources list | filter=All, count=0 | "No sources yet" | "Upload a transcript or document to get started." | "Upload" |
| Sources list | filter applied, no matches | "No matches" | "Try a different filter or search term." | "Clear filters" |
| Quick-preview | summary still generating | inline skeleton | "Summary generating…" | none |
| Quick-preview | summary failed | inline `InlineWarningBanner` warning | "Summary failed to generate." | "Retry" link |
| Source detail | no chunks | inline message | "Chunking in progress…" | none |
| Source detail | no processing history | inline message | "No processing yet." | "Run a lens" inline link |
| Source detail | no linked lens reports | inline message | "No lens reports include this source yet." | none |
| Lens picker | source set is dataset-only | banner | "Datasets bypass lens processing." | "View in graph →" |

---

## Loading and error states

- **Sources list:** `PageSkeleton` for first load. Filter/search debounce shows inline `[Loader2]` in filter strip's right edge.
- **Source detail:** `PageSkeleton` for first load. Per-section skeletons for chunks (during ingest) and summary.
- **Quick-preview:** opens immediately with skeleton; replaces with content when fetched.
- **Save errors:** inline "Failed" indicator per the Save contract; `debouncedSaveToast` for success.
- **Triage commit error:** modal stays open; banner inside modal "Failed to triage — please retry. Some sources may have already been written."
- **Lens-run start error:** toast + modal stays open.

Optimistic updates:
- Selection / clear selection — instant.
- Tag add/remove — optimistic; revert on failure.
- Mark as triaged (single source from detail) — optimistic.

NOT optimistic:
- Bulk triage commit — waits for server (multi-row write, want to know it succeeded).
- Lens-run dispatch — waits for the run row to be created.
- Re-summarise — explicit async with visible progress.

---

## Mobile considerations

Desktop-only per the existing app pattern (`ScreenSizeGate` ≥990px). No specific responsive work.

If a future user opens this on a tablet:
- Quick-preview pane overlays rather than pushes (already noted).
- Source detail full-page route already responsive within content pane (InPageNav at w-36 + flex-1 scales fine).
- Modals (triage, lens picker) — `2xl` modal at w<1024 needs verifying, may need `xl` fallback.

Out of scope for Pass 1.

---

## Keyboard interactions

The Sources page is the high-traffic surface where keyboard support matters. Detail and modals follow standard patterns.

**Sources list:**
- `↑` / `↓` — navigate row focus.
- `Space` — toggle checkbox on focused row.
- `Enter` — open quick-preview on focused row.
- `Cmd/Ctrl+Enter` on focused row — open detail.
- `Cmd/Ctrl+A` — select all visible rows. (Override default browser behaviour when list has focus.)
- `Esc` — clear selection / close quick-preview.
- `/` (slash) — focus search input.

**Source detail:**
- `Esc` — back to list (when no input focused).
- `Cmd/Ctrl+Enter` — open lens picker.

**Bulk-triage modal:**
- `Tab` cycles set-all → first row → row fields → footer.
- `Enter` on focused per-row select opens the dropdown.
- `Esc` cancels (with confirm if any changes made).

**Lens picker modal:**
- `↑` / `↓` / `←` / `→` — move tile focus through the grid.
- `Enter` / `Space` — select focused tile.
- `Cmd/Ctrl+Enter` — run the selected lens.
- `Esc` — cancel.

**Focus management:**
- On detail page entry: focus lands on the back link.
- On modal open: focus lands on first interactive (set-all source-type select for triage; first lens tile for picker).
- On modal close: focus returns to the trigger button.

**Discoverability:**
- Tooltips on selection-bar buttons mention `Cmd+Enter` for primary actions where applicable.
- The `/` slash hint is shown subtly in the search input placeholder ("Search sources… (/)").

**Accessibility floor:** all interactive elements reachable; focus rings token-driven (`--ring`); ARIA labels on icon-only buttons via `IconButton.label` prop.

---

## Molecule composition

This section is the upstream input for `feature-build`'s plan-time gate. New molecules listed here MUST have spec sketches before plan approval per design-system rule.

### Existing molecules used (reuse unchanged)

- **PageHeader** (registry: `components/page-header.tsx`, spec: `design-system.md § PageHeader`) — Sources page title + Upload action; Source detail page title + Run lens action.
- **PageChrome** (registry: `components/page-chrome.tsx`, spec: `design-system.md § PageChrome`) — Source detail page (subheader slot for back link + status row).
- **ContentPane** (registry: `components/content-pane.tsx`, spec: `design-system.md § ContentPane`) — Sources page main area + quick-preview pane; Source detail body.
- **InPageNav** (registry: `components/in-page-nav.tsx`, spec: `design-system.md § InPageNav`) — Source detail's section navigation.
- **SectionCard** (registry: `components/section-card.tsx`, spec: `design-system.md § SectionCard`) — Source detail sections.
- **SectionDivider** (registry: `components/section-divider.tsx`, spec: `design-system.md § SectionDivider`) — within sections.
- **InlineField** (registry: `components/inline-field.tsx`, spec: `design-system.md § InlineField`) — title (detail page), description, free-text metadata.
- **SelectField** (registry: `components/select-field.tsx`, spec: `design-system.md § SelectField`) — source-type and authority on the detail page.
- **InlineCellSelect** (registry: `components/inline-cell-select.tsx`, spec: `design-system.md § InlineCellSelect`) — per-row source-type/authority selects in the bulk-triage modal.
- **ActionButton** (registry: `components/action-button.tsx`, spec: `design-system.md § ActionButton`) — Upload, Run lens, Triage, Apply, Open detail, etc.
- **IconButton** (registry: `components/icon-button.tsx`, spec: `design-system.md § IconButton`) — close (✕), trash, more-options trigger, hover row actions.
- **ActionMenu** (registry: `components/action-menu.tsx`, spec: `design-system.md § ActionMenu`) — Source detail header `⋯` menu.
- **Modal** (registry: `components/modal.tsx`, spec: `design-system.md § Modal`) — bulk-triage, lens picker, re-summarise/delete confirms.
- **EmptyState** (registry: `components/empty-state.tsx`, spec: `design-system.md § EmptyState`) — Sources empty states; section-level empty states.
- **PageSkeleton** (registry: `components/page-skeleton.tsx`, spec: `design-system.md § PageSkeleton`) — first-load skeletons.
- **MarkdownRenderer** (registry: `components/markdown-renderer.tsx`, spec: `design-system.md § MarkdownRenderer`) — summary rendering.
- **TypeBadge** (registry: `components/type-badge.tsx`, spec: `design-system.md § TypeBadge`) — tag pills, source-type meta (line 2).
- **StatusBadge** (registry: `components/status-badge.tsx`, spec: `design-system.md § StatusBadge`) — `NEW` indicator, processing-history status pills.
- **ListItem** (registry: `components/list-item.tsx`, spec: `design-system.md § ListItem`) — source list rows, processing-history rows, linked lens-report rows, lens-input chunk rows.
- **FilterPill** (registry: `components/filter-pill.tsx`, spec: `design-system.md § FilterPill`) — inbox-status pills (NEW / All / Triaged).
- **FilterPillGroup** (registry: `components/filter-pill-group.tsx`, spec: `design-system.md § FilterPillGroup`) — single-select group for inbox-status pills.
- **SearchInput** (registry: `components/search-input.tsx`, spec: `design-system.md § SearchInput`) — Sources page search.
- **InlineWarningBanner** (registry: `components/inline-warning-banner.tsx`, spec: `design-system.md § InlineWarningBanner`) — dataset notice in lens picker, summary-failed indicator. **Needs extension** — see new molecules.

### Existing molecules used but unspecced *(known gap — DS-03)*

- **AddSamplesModal** style of multi-step modal in `Modal` — N/A here, all uses are single-step. None to flag.

### New molecules required

1. **`SourceListRow`** — single row of the Sources list (composed from `ListItem` but with a domain-specific shape).
   - **Why a molecule, not inline:** the row is composed in two places — Sources page list and the source-set summary in the lens picker — and the styling rules (NEW indicator placement, dual-affordance click semantics) need to be consistent.
   - **Props:** `source` (SourceWithMeta), `selected` (bool), `previewing` (bool), `onToggleSelect`, `onPreview`, `onOpenDetail`, `onDelete`.
   - **Visual:** `ListItem` density default; leading = checkbox + type icon; body = title + meta-line + tag row; trailing = hover-revealed action icons. Active-state styling per the rules above.
   - **Replaces:** the inline rendering currently in `02-app/app/(dashboard)/inputs/sources/sources-client.tsx:316-398`.

2. **`TagListEditor`** — inline-editable tag list with chip removal + free-text add + suggestion chips (greyed out, click-to-add).
   - **Props:** `value: string[]`, `onSave: (next: string[]) => Promise<void>`, `suggestions?: string[]`, `placeholder?`, `label?`.
   - **Visual:** chip row of current tags (each = `TypeBadge` with hover-`✕` to remove); below chips, a free-text input with Enter-to-add; below input (when suggestions exist), muted "Suggested:" row with click-to-add ghost chips.
   - **Save contract:** save full array on every change (per Save contract). Optimistic with revert.
   - **Replaces:** ad-hoc tag editing inline. Reusable across DNA tag fields, source tags, lens-report tags.

3. **`ParticipantsPicker`** — inline-editable participant list with chip removal + search-existing-People + suggestion chips.
   - **Props:** `value: string[]` (Person ids), `onSave: (next: string[]) => Promise<void>`, `suggestions?: { id: string, name: string }[]`, `searchPeople: (q: string) => Promise<{ id: string, name: string }[]>`.
   - **Visual:** similar to TagListEditor but chips show person name + (optional) role; search-input with type-ahead dropdown; suggestions row below.
   - **v1 scope (Pass 1):** no Person creation — only link existing. Person creation lives in Pass 2's contact-card flow. Pass 1 surfaces "Can't find them? They'll appear here once you triage another source that mentions them" as a footer hint OR disables creation entirely.
   - **Save contract:** save full array on every change.

4. **`DateField`** — InlineField-parity date input. Currently no spec'd date picker.
   - **Props:** `value: string | null` (ISO date), `onSave: (value: string | null) => Promise<void>`, `label`, `icon?`, `description?`, `disabled?`.
   - **Visual:** matches `InlineField` chrome (always-visible border, floating label, focus state). Inner input type=date.
   - **Save contract:** standard text-field contract.
   - **Replaces:** inline `<input type="date">` violations elsewhere.
   - **Reused in:** lens-reports (Pass 3), missions, projects (whoever needs document_date or similar).

5. **`LensPickerCard`** — single tile in the lens picker grid.
   - **Props:** `lens: { id: LensId, name: string, description: string, caveat?: string }`, `selected: bool`, `disabled: bool`, `disabledReason?: string` (tooltip), `onSelect`.
   - **Visual:** card-shape `border bg-card rounded-lg p-4 cursor-pointer transition-colors`. Lens name (`text-sm font-display font-semibold`), description (`text-xs text-muted-foreground line-clamp-3`), caveat row at bottom (`text-[11px] text-muted-foreground`). Selected: `border-primary bg-primary/5`. Disabled: `opacity-60 cursor-not-allowed`.
   - **Replaces:** net new — no existing card primitive matches (ContentTypeCard has favourites and locks, too heavy).

6. **`SourceTypeIcon`** — renders the right Lucide icon for a given `sourceType` value.
   - **Props:** `sourceType: SourceType`, `size?: number`, `className?`.
   - **Visual:** maps each of the 13 source-type values to a Lucide icon (FileAudio, FileText, Mic, etc.). Centralises the mapping.
   - **Why a molecule:** used in 5+ places (list rows, detail header, quick-preview, lens picker source summary, processing history). Centralising prevents the icon-mapping table from drifting.
   - **Note:** this is on the lighter end — could be a lib helper instead (`getSourceTypeIcon(sourceType)` returning a `LucideIcon`). **Decision:** lib helper, NOT a molecule. The atomic icon use is fine; what matters is that the mapping is centralised. So strike from "new molecules" — listed here for visibility but lives at `lib/source-types.ts`.

7. **`StickySelectionBar`** — selection-bar pattern at the top of a list (reusable for any multi-select list view).
   - **Props:** `selectedCount: number`, `actions: ReactNode`, `onClear`, `selectAllChecked: boolean`, `onSelectAll`.
   - **Visual:** thin `flex items-center gap-3 mb-3` strip; primary text + counter + action slots + clear link. Hidden when `selectedCount === 0`.
   - **Note:** very thin. Could be inline. **Decision:** inline this in the Sources page organism in Pass 1; if a second list reaches for the same shape, promote to a molecule. Strike from "new molecules required".

### New molecules — extensions to existing

1. **`InlineWarningBanner` — add `tone='info'`** (currently only `'warning'` and `'success'`). Used for the dataset notice in lens picker and source detail. Light-blue / info palette per `--color-info` / `--color-info-bg`. Updates the existing spec `design-system.md § InlineWarningBanner`.

### Atoms used directly *(should be empty)*

For Pass 1 layout, no atoms need direct use in organisms IF the new molecules above are built. Exceptions:
- The native `<input type="date">` is wrapped in the new `DateField` molecule.
- The lens picker's "Decision text" textarea uses `InlineField` variant=textarea — already a molecule. Good.
- The source-set summary in lens picker may compose `ListItem` directly (acceptable — `ListItem` is a molecule).

### Net new molecule list (final)

| Name | Purpose | Reusable? |
|---|---|---|
| `SourceListRow` | Sources list row | No — domain-specific to Pass 1, but shape is reusable for any future "source-like list" |
| `TagListEditor` | Inline tag list editor with suggestions | Yes — reusable across DNA, lens reports, missions |
| `ParticipantsPicker` | Inline person-list editor | Yes — reusable for any feature linking to People nodes |
| `DateField` | InlineField-parity date input | Yes — broadly reusable |
| `LensPickerCard` | Single lens tile | No — Pass 1-specific, but Pass 3's report-action picker may reuse |

Plus one extension: `InlineWarningBanner` gains an `'info'` tone.

The `lib/source-types.ts` helper (centralised source-type → icon + label mapping) is a non-molecule but flagged for the build.

---

## Open questions / TBDs

1. **Default filter on Sources page entry:** brief says "filter defaults to NEW". Current code defaults to NEW *when inboxCount > 0*, otherwise All. Going with that. Confirm at gate.
2. **Tag chip hue:** current implementation uses muted styling ignoring `TypeBadge` hue tokens. Options: (a) muted `bg-muted` for all tags (current — drift from DS-02), (b) stable hue from a hash of the tag string (visual variety, but could be loud), (c) a single fixed hue (e.g. hue 3 custard) for all source tags. **Recommendation: (c) fixed hue 3** — visually quiet, DS-aligned, reserves hash-hue for cases where category meaning is conveyed (e.g. content-type categories). Confirm at gate.
3. **`Mark as triaged` from detail page:** the brief implies triage is a bulk operation, but a single-source triage button on the detail page is useful when the user opens a source one-by-one. **Question:** does single-source triage include the source-type/authority/tags/participants flow OR is it just the inboxStatus flip? **Proposal:** the detail-page metadata fields are the editing surface; the "Mark as triaged" button on the subheader simply flips `inboxStatus = 'triaged'` (the assumption being you've already filled in metadata via the detail view's autosave).
4. **`Description` vs `Summary` separation:** current schema has both `description` (free-form, user-editable) and `summary` (LLM-generated). Both fields are kept distinct in the detail view per the spec above. Confirm: do we need both fields visible? Or could we hide `description` until populated? **Recommendation:** show `description` only when non-empty; provide an "Add description" affordance when empty.
5. **Person creation (canonical-resolution-light) in bulk-triage:** Pass 1 disables person creation in `ParticipantsPicker` per the brief (Pass 2 owns the contact-card flow). But a user triaging a new transcript may genuinely need to add a participant who doesn't exist yet. **Proposal:** at triage time, allow "Park as unresolved" (per the brief's edge case "Person extracted but not in graph and user can't decide") — creates a Person with `relationship_types: ['unresolved']`. Confirm.
6. **Quick-preview vs detail navigation rule:** the spec uses "click body = preview, click trailing chevron / Cmd-click = detail". Alternative: "click body = detail (full page), preview is a hover affordance / dedicated icon." **Recommendation:** keep as proposed — preview-on-click matches the inbox-scan rhythm. Confirm at gate.
7. **Lens picker single vs multi-source UX:** when invoked from the source-detail page (single source), the modal could render simpler ("Run a lens on '{title}'"). For now, the same modal handles both with the source-set summary degrading gracefully ("Across 1 source: '{title}'"). Confirm.
8. **`LensPickerCard` vs leveraging `ContentTypeCard`:** could extend `ContentTypeCard` with a "lens" variant that strips out favourites and locks. Cost: more conditionals in an already-busy molecule. Benefit: single source of truth for "picker tile". **Recommendation:** new molecule `LensPickerCard` (lighter contract); revisit if a third "picker tile" use case appears.

---

## Backlog items to add

1. **Pass 2 dependency:** lens picker needs `LensInputForm` registry — defined here but lives in Pass 2's lens-review surface.
2. **Pass 3 dependency:** "Open report →" links in source detail's processing history and linked lens reports point to `/inputs/lens-reports/[id]` — that route is owned by Pass 3.
3. **`DateField` molecule** has reuse outside INP-12 (missions, projects). Add to backlog as `DS-XX: DateField molecule`.
4. **`InlineWarningBanner` info-tone extension** — small DS task.
5. **Person creation flow timing:** bulk-triage `ParticipantsPicker` parks unresolved People in Pass 1; Pass 2's contact-card flow lets the user resolve them later. Note in INP-12 implementation follow-ups.
6. **Filter URL persistence:** Sources page filter state in URL — confirm acceptable (deep-linkable filtered views vs simpler client state). New backlog item `INP-XX: URL-sync Sources filters` if it's contentious.

---

## Template registration (post-build)

If Pass 1 ships in the proposed shape, two candidate templates emerge:

1. **`sources-inbox-list-template.md`** — list with NEW filter chip + side preview + bulk-action footer. Reusable for: ideas backlog (IDEA-01), future Krisp queue (INP-01), lens reports list (Pass 3), any inbox-pattern feature.
   - Variable parts: filter chip values, bulk actions, row sub-metadata, type icons.
2. **`source-detail-pane-template.md`** — full-page route for one read-heavy item with metadata + sections via InPageNav, light inline editing on metadata, content sections that include some immutable + some addressable. Reusable for: lens reports (Pass 3), potentially research-document deep views.
   - Variable parts: section names, section bodies, action menu items.

Register after Pass 1 ships and the patterns prove themselves on real usage.

---

## Pass 1 hard gate

This spec has not been filed yet. Approve to proceed.

The right places to push back:
- The dual click-affordance for preview vs detail (Q6 above).
- The bulk-triage hybrid shape (set-all bar + per-row, all in one modal).
- The lens picker grid layout (3-col vs 2-col, tile content).
- The ~5 new molecules (especially `LensPickerCard` and `DateField` — both have reuse potential beyond Pass 1, worth confirming).
- Whether `description` and `summary` both belong on the detail page (Q4).
- Whether Pass 1's `ParticipantsPicker` should support "park as unresolved" (Q5).
