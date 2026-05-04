# Layout Spec: INP-12 Pass 2 — Lens-review surface
Feature ID: INP-12 (Pass 2 of 3)
Status: draft — pending hard-gate review
Last updated: 2026-05-04
Template: no match (establishes `lens-report-review` candidate template — register after build)

---

## Pass scope

Pass 2 covers the surface where a lens's structured LLM output is reviewed, edited, and committed. Three pieces:

1. **`<LensReportReview>` molecule** — schema-driven review surface that renders all 7 lens outputs from one component using metadata + 3 extension slots (prose-blob, single-object, canonical-resolution).
2. **Canonical-resolution micro-UI** — inline slot inside the review surface for surface-extraction's Person and Organisation rows.
3. **Contact-card sub-form** — modal invoked from the canonical-resolution slot when the user creates a new Person or Organisation.

Hosting page: `/inputs/results?run=<runId>` (route established in Pass 1's lens picker dispatch). Single-run focus with sibling navigation for the rare multi-pending-runs case.

Not in scope:
- Sources page / bulk-triage / source detail / lens picker (Pass 1, done).
- Committed lens-report page at `/inputs/lens-reports/[id]` (Pass 3 — the report's *post-commit, addressable* view).
- Re-running, re-summarising, or editing a committed lens report (v2 ergonomics per the brief).
- Lens-report list at `/inputs/lens-reports` (Pass 3 — minor surface).

---

## Architecture commitment (recap)

Per brief §"Layout architecture decision" Decision 2: **one molecule serves all 7 lenses**. Per-lens differences live in:

1. **Schema metadata** — field types (text/enum/sourceRefs/sub-array), section names derived from field-name → human-name mapping, layout hints (`displayWeight: primary`, `pairWith: evidenceAgainst`, `sortBy: chronological`).
2. **Three extension slots:**
   - **Prose-blob renderer** — for full-width markdown fields (`project-synthesis.caseStudyNarrative`, every lens's `summary`).
   - **Single-object renderer** — for non-array structured fields (`decision-support.decisionFraming`, `self-reflective.energyAndMomentum`).
   - **Canonical-resolution slot** — only triggered by surface-extraction's `Person` and `Organisation` items.
4. **Universal `unexpected[]`** — always last, always identical shape, rendered as one consistent section across every lens.

If a lens needs UX a metadata hint can't express, the rule is: add a new slot (and document it here), not fork the panel.

---

## Views needed

| View | Purpose | When it appears |
|---|---|---|
| **Review page** | Renders `<LensReportReview>` for one run/report | `/inputs/results?run=<runId>` |
| **Sibling switcher** | Prev/next nav when multiple runs are pending | Subheader of review page when `pendingRunCount > 1` |
| **Canonical-resolution row expand** | Inline expansion of a Person/Org row showing match candidates + actions | Triggered by clicking "Resolve" on a row |
| **Contact-card modal** | Form for creating a new Person or Organisation (or editing one) | Invoked from canonical-resolution slot's "New" or "Edit details" action |
| **Commit confirm modal** | Final confirmation before write-to-graph | Triggered by Commit footer button when the review has unresolved items the user wants to commit anyway |
| **Discard draft confirm** | Confirmation before throwing away a draft (no commit) | Triggered by "Discard" menu action |

---

## Navigation and routing

- **Entry:** lens picker dispatches a run, navigates to `/inputs/results?run=<runId>`. Also reachable from source detail's processing-history "Open run →" affordance and (later) from any cited-source link.
- **Routes:**
  - `/inputs/results?run=<runId>` — review surface (this page).
  - `/inputs/results` (no `run` param) — fallback: shows the most recent pending run, or the empty state.
  - `/inputs/lens-reports/[id]` — Pass 3 committed-report page (link target after commit for analysis lenses).
- **Multi-run handling:** when `pendingRunCount > 1`, the subheader shows `[← prev]  Run N of M  [next →]`. Browser back works as expected. Querystring `?run=` is the canonical state.
- **Back to Sources:** subheader includes `← All sources` link, same pattern as source detail.
- **After commit:**
  - Surface-extraction → graph items written, redirect to source detail (the source the run drew from) with toast "Committed N items to graph".
  - Analysis lenses → redirect to `/inputs/lens-reports/[id]` (Pass 3 page) with toast "Committed lens report".
- **After discard:** redirect to `/inputs/sources` with toast "Discarded".

---

## Page structure

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│ PageChrome:                                                                       │
│   PageHeader: [icon] "Review: <lens-name>" [status pill]   [Discard] [⋯]         │
│     subtitle: "<lens> across N sources · started Xm ago · M items"               │
│   Subheader slot:                                                                 │
│     [← All sources]   ·   [← prev]  Run 2 of 3  [next →]   (only when M>1)       │
├──────────────────────────────────────────────────────────────────────────────────┤
│ ContentPane (padding=true)                                                       │
│ ┌──────────────────────────────────────────────────────────────────────────────┐ │
│ │ flex gap-6                                                                    │ │
│ │ ┌────────┐  ┌────────────────────────────────────────────────────────────┐  │ │
│ │ │InPageNav│  │ MAIN BODY (flex-1 min-w-0 flex flex-col gap-8 pb-32)      │  │ │
│ │ │ w-44    │  │                                                            │  │ │
│ │ │ Source  │  │ # Source set                                               │  │ │
│ │ │   set   │  │ Sources used in this run + lens input (if any).            │  │ │
│ │ │         │  │                                                            │  │ │
│ │ │ Summary │  │ # Summary                                                  │  │ │
│ │ │ 1       │  │ {prose-blob renderer: lens summary, editable}              │  │ │
│ │ │ Frame   │  │                                                            │  │ │
│ │ │ 1/1     │  │ # Decision framing                       (single-object)   │  │ │
│ │ │ Evid.For│  │ {single-object renderer: type, statedQ, impliedQ}          │  │ │
│ │ │ 4/5     │  │                                                            │  │ │
│ │ │ Evid.   │  │ # Evidence for (4 of 5 confirmed)                          │  │ │
│ │ │ Against │  │ ▶ Item 1 [confirm/reject controls]                         │  │ │
│ │ │ 2/3     │  │ ▶ Item 2                                                   │  │ │
│ │ │ Gaps    │  │ ▶ Item 3                                                   │  │ │
│ │ │ Steps   │  │ ▶ Item 4                                                   │  │ │
│ │ │ Unexp.  │  │ ▶ Item 5                                                   │  │ │
│ │ │         │  │                                                            │  │ │
│ │ │         │  │ # Evidence against (2 of 3 confirmed)                      │  │ │
│ │ │         │  │ …                                                          │  │ │
│ │ │         │  │                                                            │  │ │
│ │ │         │  │ # Gaps                                                     │  │ │
│ │ │         │  │ # Suggested next steps                                     │  │ │
│ │ │         │  │ # Unexpected (3)            <— always last, always present │  │ │
│ │ └────────┘  └────────────────────────────────────────────────────────────┘  │ │
│ └──────────────────────────────────────────────────────────────────────────────┘ │
│ Sticky commit footer (overlays bottom of ContentPane, full width):              │
│ [N items confirmed · M unresolved · O rejected]    [Save draft]  [Commit ✓]    │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### PageHeader

- **Title:** `Review: <lens-name>` where lens-name is the human-readable form (e.g. "Decision support", "Surface extraction"). Title is non-editable on this page — the editable title lives on the committed report page (Pass 3).
- **Status pill:** `StatusBadge` state-shaped, value=`pending` (info-tone) or `failed` (error-tone). For surface-extraction (no LensReport) the pill says "extraction pending"; for analysis lenses it says "draft".
- **Action slot:**
  - `Discard` outline `ActionButton` — opens "Discard draft?" confirm.
  - `ActionMenu` (`MoreHorizontal`):
    - "Re-run lens" — opens lens picker pre-populated with this run's source set + lens (re-run flow). Lives in Pass 1's lens picker; the "Run again" entry is the only Pass 2 addition needed there.
    - "Copy run id" — utility, copies the UUID for debugging.

### Subtitle line

Computed: `<lens> across N sources · started Xm ago · M items` where `M items` is the total count of items across all sections (excluding `summary` and single-object fields). For failed runs: replaces with the error message in `--color-error`.

### Subheader slot

- `← All sources` — back to the Sources page with the previous filter state (URL state preserved per Pass 1).
- Sibling switcher: `[← prev]  Run K of N  [next →]` — only rendered when more than one pending run exists for the same brand. Prev/next navigate to siblings by `created_at` ordering. The "Run K of N" text is `text-xs text-muted-foreground` — clarifies position without dominating.

### InPageNav (left rail)

w-44 (slightly wider than Pass 1's w-36 to fit the per-section count badges). Sticky, full height.

Each item:
- Section name from schema-metadata (e.g. `evidenceFor` → "Evidence for").
- Per-section progress counter — `(N/M)` showing confirmed-of-total. Updates as the user confirms / rejects items. For sections with no per-item review (`summary`, single-object): no counter — just the section name.
- Sub-fade on sections that contain unresolved canonical-resolution rows (when in the section, the user must resolve before commit) — small `●` warning indicator left of the section name.

The first item is always **Source set** (computed, not from schema). The last item is always **Unexpected** (the universal field).

Click → smooth-scroll to anchor.

### Main body — section composition

The body is a `flex flex-col gap-8` column. Each section comes from schema metadata. Sections render in this order:

1. **Source set** (always — computed from `processingRuns.sourceIds` + `lensInput`).
2. **Summary** (always — prose-blob).
3. **Lens-specific sections** in schema-defined order (each a section of items, single-object, or prose-blob).
4. **Unexpected** (always — universal `unexpected[]` field).

### Sticky commit footer

Always pinned to the bottom of `ContentPane` (full width, slight border-top). On mobile / narrow viewports it stays sticky.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ N confirmed · M unresolved · O rejected · P unreviewed                     │
│                                              [Save draft]  [Commit ✓]      │
└────────────────────────────────────────────────────────────────────────────┘
```

- Counters are live-updating.
- `Save draft` outline `ActionButton`. Persists the per-item confirm/reject/edit state without committing to graph. Survives page refresh (state stored on `processing_runs.extractionResult` for surface-extraction or on a draft `lens_reports.result` for analysis lenses — schema already supports). Relevant when the user pauses mid-review.
- `Commit ✓` primary `ActionButton`. Disabled when `confirmed === 0` (nothing to commit). When `unresolved > 0`: opens "Commit with unresolved?" confirm modal. Otherwise commits directly.
- Loading state: button becomes "Committing…" + spinner; both disabled.

---

## Section types

The molecule renders three kinds of sections, switched by schema metadata:

### A. Item-array section (most common)

Schema metadata example (`decision-support.evidenceFor`):

```ts
{
  type: 'array',
  itemSchema: {
    evidence: { type: 'text', label: 'Evidence', editor: 'textarea' },
    option: { type: 'text', label: 'Option', editor: 'input', optional: true },
    strength: { type: 'enum', label: 'Strength', values: ['strong','moderate','weak'] },
    sourceRefs: { type: 'sourceRefs', label: 'Source references' },
  },
  layoutHints: { primaryField: 'evidence', sortBy: 'strength' },
}
```

Renders as a `SectionCard` containing a vertical list of cards.

#### Item card layout

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [☑] [strength: strong]    Evidence text (primary, editable on click)…   │
│                                                                          │
│ ▼ (collapsed by default)                                                 │
│   Option        [editable]                                               │
│   Strength      [strong | moderate | weak ▾]                             │
│   Source refs   [SourceChip] [SourceChip] [+ add]                       │
│                                                                          │
│   [Reject] [Edit fields] (when collapsed) → expands to show fields      │
└──────────────────────────────────────────────────────────────────────────┘
```

States per item: **unreviewed** (default — slight muted background), **confirmed** (border-l-2 in `--color-success`, checkbox filled), **rejected** (opacity-60, strikethrough on primary text), **needs-attention** (only for canonical-resolution rows — see Person/Org section).

**Interactions:**
- Click anywhere on the row body → expands the editor pane (editable fields below the primary line).
- Click checkbox → toggles confirmed/unreviewed.
- Click "Reject" → moves to rejected state (visual + commit semantics).
- Click "Edit fields" → expands.
- Edit a field inline → autosave per the standard Save contract.

**Save contract:** every field uses `useDebouncedSave` per design-system rule. Item-level confirm/reject is immediate (no debounce — single click).

**Sort:** by `layoutHints.sortBy` if specified — `strength` sorts strong→weak; `chronological` sorts by date if a date field exists; `confidence` sorts high→low. Default: schema-order. Sort is **stable** — re-sorts only on first render and on explicit re-sort action. Editing an item doesn't reorder it (would be disorienting).

**Pair-with hint:** when two sections have `pairWith` mutually pointing at each other (e.g. `evidenceFor.pairWith: 'evidenceAgainst'`), the molecule renders them **side-by-side in a 2-column grid** within a single SectionCard at viewport width ≥1280px. Below that, they fall back to vertical stacked. This is the only metadata-driven layout variant. Pair sections share a single row in InPageNav with `(N/M · K/L)` for both.

### B. Single-object section

Schema metadata example (`decision-support.decisionFraming`):

```ts
{
  type: 'object',
  fieldSchema: {
    type: { type: 'enum', label: 'Decision type', values: [...] },
    statedQuestion: { type: 'text', label: 'Stated question', editor: 'input' },
    impliedQuestion: { type: 'text', label: 'Implied question', editor: 'input', optional: true },
    options: { type: 'string-array', label: 'Options', editor: 'string-list' },
  },
}
```

Renders as a `SectionCard` containing a labelled-card body — fields rendered with `InlineField` / `SelectField` / `StringListEditor` as appropriate.

No checkbox, no reject — single objects are always part of the commit (or the whole report is rejected). Editing autosaves.

Examples:
- `decision-support.decisionFraming`
- `self-reflective.energyAndMomentum`
- `project-synthesis.methodology` (this is a hybrid — `overview` is single-text + `steps[]` is an item-array. Schema metadata expresses this as `type: 'object-with-array'`, see edge case below.)

### C. Prose-blob section

Schema metadata example (`project-synthesis.caseStudyNarrative` or every lens's `summary`):

```ts
{
  type: 'prose',
  editor: 'markdown',
  layoutHints: { wordCountTarget: '200-400' },
}
```

Renders as a `SectionCard` containing a full-width markdown editor (textarea with markdown live-preview). Word-count counter at bottom-right. Toolbar: minimal — `B`, `i`, link, list, blockquote.

No per-item commit — prose is part of the report or the report is discarded. Edit autosaves.

For surface-extraction, there's no `summary` field at the lens-output level (each item has its own description). So the only universal prose section across all lenses is the lens's top-level summary in analysis lenses.

### D. Hybrid: object-with-array

Special case for `project-synthesis.methodology` which is `{ overview: prose, steps: array }`. Schema metadata:

```ts
{
  type: 'object-with-array',
  topField: { name: 'overview', renderer: 'prose' },
  arrayField: { name: 'steps', itemSchema: {...}, layoutHints: {...} },
}
```

Renders as one SectionCard with the prose-blob at the top and the item-array below, separated by a `SectionDivider`. InPageNav shows one entry "Methodology (N/M)" with the count from the array part.

### E. Universal `unexpected[]`

Always last. Always identical shape (`observation`, `why`, `sourceRefs`). Renders as an item-array section but visually distinct: muted background tint, label "UNEXPECTED" (uppercase meta-style), description below the header: "Things the lens noticed that didn't fit its frame. Review and confirm individually."

Each item is independently committable / rejectable per the standard item-array semantics.

---

## Source set section (top of body)

Computed, not from schema. Shape:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Source set                                                               │
│ ┌────────────────────────────────────────────────────────────────────┐  │
│ │ [icon] Counsel call — May 2026         client-interview · own       │  │
│ │ [icon] Justyna check-in                accountability · peer        │  │
│ │ [icon] McKinsey defence note           research · external-auth     │  │
│ └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│ Lens input  (only if takes_lens_input):                                  │
│ "Should I run a Q3 defence-tech investor roundtable?"                    │
└──────────────────────────────────────────────────────────────────────────┘
```

Each source is a `ListItem` (read-only) with leading source-type icon, body = title + source-type/authority, trailing = `IconButton` "Open source →" linking to source detail. Title is also linkable.

`Lens input` (when present) is rendered as plain text, italicised, in a small `bg-muted/30 rounded-md p-3` block. Read-only — re-running with edited input is the path to change it.

---

## Surface-extraction (special case)

Surface-extraction does NOT produce a `LensReport`. The result lives on `processing_runs.extractionResult` and items go straight to graph nodes on commit (no report wrapper).

Within the review surface, this manifests as:
- No top-level `summary` section (the field doesn't exist in the schema).
- Sections are the seven extraction categories: ideas, concepts, people, organisations, stories, techniques, contentAngles.
- Plus the universal `unexpected[]` section (sourced from `processing_runs.unexpected` — implementation follow-up #5 in the brief).
- Each item carries an additional `confidence` field (high/medium/low) — rendered as a `ConfidenceBadge` molecule (already in registry) leading the item.
- People and Organisation sections trigger the canonical-resolution slot (next).

The InPageNav for surface-extraction has 8 entries: Ideas, Concepts, People, Organisations, Stories, Techniques, ContentAngles, Unexpected. No Source set heading? — yes there is, same as analysis lenses (always rendered).

---

## Canonical-resolution slot

Triggered only by surface-extraction's **People** and **Organisations** rows. Renders inside the item-array section's row, in the expanded editor pane (below the primary editable fields).

### Row state machine

Each Person / Org item has a `resolutionState`:
- `unresolved` (default) — has the extracted name + context only. Row carries an amber `●` indicator.
- `match-pending` — fuzzy-match results loaded but no decision made. Row carries a `Resolve` action.
- `linked-to-existing` — confirmed link to an existing graph node. Row shows the canonical name + small "linked to existing" badge.
- `created-new` — user filled in contact card; new node will be written on commit. Row shows the entered name + small "new" badge.
- `parked-unresolved` — user couldn't decide. Will be created on commit with `relationship_types: ['unresolved']`. Row shows amber "parked" badge.
- `rejected` — item won't be committed at all. Standard rejected state.

### Lazy fuzzy-match (Q4 confirmed)

Each Person/Org row, on initial render, shows the extracted name + a `Resolve` button with a pre-fetched count badge (`[2 strong matches]` / `[no match]`). The pre-fetch is a single API call that returns counts per row — cheap. Full match-list loads on click.

Pre-fetch counts: `(strongMatches: count of canonical_register entries with cosine ≥ 0.92, suggestedMatches: count with 0.75 ≤ cosine < 0.92)`.

Row before resolve:
```
┌──────────────────────────────────────────────────────────────────────────┐
│ [☐]  William Clouston                                                    │
│      "appears in fundraising interview as Reform UK candidate"           │
│      [Resolve · 2 strong matches]    [Reject]                            │
└──────────────────────────────────────────────────────────────────────────┘
```

### On click "Resolve"

The row expands. The expansion includes the standard editable fields (name, context, sourceQuote, sourceRefs) AND the canonical-resolution slot:

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [☐]  William Clouston                                                    │
│      "appears in fundraising interview as Reform UK candidate"           │
│      [Resolve ▾]    [Reject]                                             │
│                                                                          │
│   ── Editable fields ──                                                  │
│   Name           [William Clouston]                                      │
│   Context        [textarea, 2 rows]                                      │
│   Source quote   [textarea, 1 row]                                       │
│   Source refs    [chip] [chip]                                           │
│                                                                          │
│   ── Canonical resolution ──                                             │
│   Strong matches (0.92+):                                                │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ ●●●●  William Clouston (politician)                             │   │
│   │       Reform UK candidate · graph:abc123 · 2 sources cite       │   │
│   │       [Link to this →]                                          │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   Suggested matches (0.75-0.92):                                         │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ ●●●○  William Clouston Sr. (businessman)   · 0.81  [Link]      │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   [+ Create new]    [Park as unresolved]                                 │
└──────────────────────────────────────────────────────────────────────────┘
```

#### Match candidate row

Each candidate is an inline card / list-item:
- Leading: similarity dot indicator (`●●●●` 4 = strong / `●●●○` 3 = suggested / `●●○○` 2 = weak — using filled vs hollow). Or a more straightforward `0.92` decimal score on hover. Decision: visual dots for at-a-glance scanning, score on hover for nerdier confirmation.
- Body: canonical name + role in parens + secondary line with disambiguation (graph node id snippet, organisation, recent activity).
- Trailing: `[Link to this →]` — primary `ActionButton` size sm.

Strong matches (≥0.92) auto-rendered with a default-selected state (subtle highlight) — pre-selected for confirmation. Suggested matches (0.75–0.92) rendered as candidates but not pre-selected.

#### Bottom actions

- `+ Create new` — opens contact-card modal. On modal save, item state flips to `created-new`.
- `Park as unresolved` — flips state to `parked-unresolved`. Useful for the "I can't decide right now" case.

#### After link/create/park

Row collapses back to the compact form with the new state badge:
- `linked-to-existing` — name in canonical form + small `[linked]` badge. Click "Change" affordance to re-open the resolution.
- `created-new` — entered name + small `[new]` badge. Click "Edit" to re-open the contact-card modal.
- `parked-unresolved` — extracted name + amber `[parked]` badge. Click "Resolve" to re-open the resolution slot.

#### Quick-link affordance for strong-match-of-1

When pre-fetch shows exactly **one strong match (cosine ≥ 0.92) and no suggested matches**, the row offers a one-click affordance without expanding: `[✓ Link to "William Clouston (politician)"]`. Saves a click for the common case. The user can still expand the row to see the full candidate list if they want.

---

## Contact-card sub-form (modal)

Triggered from the canonical-resolution slot's "+ Create new" or from "Edit details" on an existing `created-new` row.

`Modal` size `lg`. Title: `New person` or `New organisation` or `Edit person/organisation`.

### Person form

```
┌──────────────────────────────────────────────────────────────────────────┐
│  New person                                                          [✕] │
├──────────────────────────────────────────────────────────────────────────┤
│  Name                [text input]                                        │
│                                                                          │
│  Role                [text input]                  e.g. "founder, CEO"   │
│                                                                          │
│  Primary org         [org search/picker]           link or +new          │
│                                                                          │
│  Relationship types  [multi-select: client, peer, supplier, …]           │
│                                                                          │
│  ┌─ Contact card ──────────────────────────────────────────────────┐   │
│  │ Email      [text input]                                          │   │
│  │ Phone      [text input]                                          │   │
│  │ Links      [string-list editor]                                  │   │
│  │ Notes      [textarea]                                            │   │
│  │ Photo URL  [text input]                                          │   │
│  └──────────────────────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────────────────────────┤
│                                          [Cancel]  [Save]                │
└──────────────────────────────────────────────────────────────────────────┘
```

Required fields: **Name** only. Everything else optional. Save-disabled when name is blank.

`Relationship types` uses a multi-select dropdown bound to the controlled vocabulary (`client`, `prospective-client`, `supplier`, `peer`, `mentor`, `mentee`, `friend`, `family`, `colleague`, `candidate`, `politician`, `media-contact`, `expert`, `interviewee`, `research-subject`, `other`).

`Primary org` is a text-search picker — searches existing Organisation graph nodes; if no match, "+ Create new organisation" opens a nested contact-card modal (the org form, below). On save, the new org is created and linked.

### Organisation form

Same shape but with org-specific fields:
- Name (required)
- Types (existing — controlled vocab from the existing graph node properties)
- Relationship types (multi-select: `client-org`, `partner`, `competitor`, `vendor`, `funder`, `regulator`, `media`, `political-org`, `other`)
- Contact card: website, notes, photo URL

### Save semantics

Save **does not write to graph immediately** — it stages the new Person/Org in the review surface's local state. The graph write happens on commit of the whole review. This is important: a half-finished review with parked-new persons shouldn't pollute the graph.

(Implementation note: this means the review surface needs a local "staged new entities" registry that the canonical-resolution slot reads from in addition to existing graph nodes when showing "linked-to-existing" status. Surface this implementation detail to feature-build.)

### Edit semantics

Clicking "Edit details" on a `created-new` row reopens the same modal pre-filled. Saving overwrites the staged entity. Cancel discards changes (modal-local state).

For `linked-to-existing` rows: the user is editing the *staged new entity* connection, not the existing graph node. Editing an existing graph node from this surface is out of scope — that's the People/Org management feature (future).

---

## SourceChip molecule (referenced by item editor)

Rows in item-array sections include `sourceRefs` — these render as `SourceChip` instances.

```
[📄 Counsel call — May 2026]     · click → opens source detail in new tab
```

Compact pill: leading source-type icon + truncated title. Click navigates to source detail. In the editor expansion, includes a removable `[✕]` to delete the ref + a `[+]` button to add another source from the run's source set.

A `SourceChip` is a new molecule (see Molecule composition) — distinct from `TypeBadge` (decorative) and `LinkChip` (would be too generic). It's specifically a source reference.

---

## Empty / loading / error states

| Condition | What appears |
|---|---|
| Run is `pending` and result hasn't streamed in yet | `PageSkeleton`-style skeleton matching the section structure (computed from the lens's metadata so the skeleton has the right number of section blocks); inline spinner with "Lens is processing — this typically takes 20–60 seconds." |
| Run failed (`status='failed'`) | Full-page error state with the error message + "Try again" `ActionButton` (re-runs same source set + lens) + "Discard" link. No section bodies rendered. |
| Run committed already (user navigated to a stale URL) | "This run has already been committed." + link to the lens-report page (Pass 3) for analysis lenses, or to the source detail (where committed items live) for surface-extraction. |
| Lens output is empty (every section returns []) | "The lens didn't find anything significant." + commit footer becomes "Discard" only — `Commit` disabled. Often valid output (per the lens prompts' "empty array is correct sometimes" instruction). |
| Source set has been deleted between run dispatch and review | Inline warning at top: "One or more sources used in this run have been deleted. Review may be incomplete." Allow proceeding. |
| Pre-fetch of canonical-match counts fails | Row shows "Resolve" without count badge; on click, retry the full match query. |

Loading states inside sections:
- Item-array section while user is committing: each item shows inline saving indicator; section disabled.
- Contact-card modal save: inline spinner on Save button + button disabled.
- Match-list lazy-load on Resolve click: skeleton candidate row with shimmer until loaded.

---

## Commit flow

Two paths depending on lens type:

### Surface-extraction commit

User clicks `Commit ✓`. Flow:

1. Pre-flight check: if any unresolved Person/Org rows exist, modal opens: "N people / orgs aren't resolved yet. Park them as unresolved or commit only the resolved items?" with three actions:
   - **Park & commit all** — flips unresolved to `parked-unresolved`, commits everything.
   - **Commit resolved only** — skips unresolved rows; they stay in the draft for later.
   - **Cancel** — back to review.
2. Optimistic UI: footer shows "Committing… N items" + spinner.
3. Server: writes graph nodes + DERIVED_FROM edges + canonical_register entries for new entities + `processing_runs.status = 'committed'`.
4. On success: redirect to source detail (the source the run drew from) with toast `"Committed N items to graph"`. Source detail's Processing history section now shows the committed run.
5. On error: stays on review surface, error toast, footer re-enabled. State preserved.

### Analysis-lens commit

1. Pre-flight: same check on canonical-resolution rows (only relevant if extension slots populate them; for v1 analysis lenses don't, but the framework supports it).
2. Optimistic UI: footer "Committing… N items" + spinner.
3. Server: creates the `lens_reports` row with `status='committed'`, writes IDENTIFIED_IN edges + ANALYSED_FROM edges + any extracted graph items, `processing_runs.status='committed'`.
4. On success: redirect to `/inputs/lens-reports/[id]` (Pass 3) with toast `"Committed report"`.
5. On error: stays on review surface with state preserved.

### Discard flow

User clicks `Discard` in PageHeader → "Discard draft?" confirm modal. Body: "This will throw away the draft and any per-item edits you've made. The run record stays for audit, but no items will be written." Cancel / Discard (destructive). On confirm: `processing_runs.status = 'skipped'`, redirect to `/inputs/sources` with toast.

For analysis lenses, draft `lens_reports` row is also deleted on discard.

---

## Save / autosave behaviour

Per the standard Save contract:

- **Per-item field edits** (text fields, selects, source refs): autosave with 500ms debounce. Inline "Saved" indicator + debounced toast.
- **Confirm/reject toggle**: instant save, no debounce. Visual state flips immediately.
- **Section-level edit cascade**: editing a section item doesn't affect other sections.
- **Whole-review draft state**: persisted on `processing_runs.extractionResult` (surface-extraction) or `lens_reports.result` (analysis lenses) — same shape as the lens output, with per-item commit-state metadata stored alongside (e.g. `result.evidenceFor[0]._reviewState = 'confirmed'`). This is a non-breaking schema usage — the LLM never sees these meta fields, just the user-edited content.
- **`Save draft` button**: explicit "checkpoint" — same data, but writes a snapshot timestamp so the user has a "last saved at" visible. Useful psychologically; technically just an updated_at bump.

Optimistic updates:
- Confirm/reject: instant.
- Field edit: optimistic with revert-on-error.
- Resolve action (link/create/park): optimistic.
- Commit: NOT optimistic (waits for server).

---

## Schema-metadata shape

The metadata format that drives everything above. Lives in `02-app/lib/lens-review/metadata/[lens-id].ts` (one file per lens), or one big map. **Decision: one file per lens, exported from a registry index** — easier to evolve per-lens without merge conflicts.

```ts
// Example: decision-support metadata
import type { LensReviewMetadata } from './types'

export const decisionSupportMetadata: LensReviewMetadata = {
  lens: 'decision-support',
  sections: [
    { field: 'summary', renderer: 'prose', label: 'Summary' },
    {
      field: 'decisionFraming',
      renderer: 'object',
      label: 'Decision framing',
      fieldSchema: {
        type: { kind: 'enum', label: 'Decision type', values: ['binary','multi-option','open'] },
        statedQuestion: { kind: 'text', label: 'Stated question', editor: 'input' },
        impliedQuestion: { kind: 'text', label: 'Implied question', editor: 'input', optional: true },
        options: { kind: 'string-array', label: 'Options', editor: 'string-list', optional: true },
      },
    },
    {
      field: 'evidenceFor',
      renderer: 'array',
      label: 'Evidence for',
      itemSchema: {
        evidence: { kind: 'text', label: 'Evidence', editor: 'textarea' },
        option: { kind: 'text', label: 'Option', editor: 'input', optional: true },
        strength: { kind: 'enum', label: 'Strength', values: ['strong','moderate','weak'] },
        sourceRefs: { kind: 'sourceRefs', label: 'Source references' },
      },
      layoutHints: {
        primaryField: 'evidence',
        sortBy: { field: 'strength', order: ['strong','moderate','weak'] },
        pairWith: 'evidenceAgainst',
      },
    },
    {
      field: 'evidenceAgainst',
      renderer: 'array',
      label: 'Evidence against',
      itemSchema: { /* same shape as evidenceFor */ },
      layoutHints: { primaryField: 'evidence', pairWith: 'evidenceFor' },
    },
    {
      field: 'gaps',
      renderer: 'array',
      label: 'Gaps',
      itemSchema: {
        gap: { kind: 'text', label: 'Gap', editor: 'textarea' },
        whyItMatters: { kind: 'text', label: 'Why it matters', editor: 'textarea' },
        fillSuggestion: { kind: 'text', label: 'How to fill it', editor: 'textarea' },
      },
      layoutHints: { primaryField: 'gap' },
    },
    {
      field: 'suggestedNextSteps',
      renderer: 'array',
      label: 'Suggested next steps',
      itemSchema: {
        step: { kind: 'text', label: 'Step', editor: 'textarea' },
        rationale: { kind: 'text', label: 'Rationale', editor: 'textarea' },
        sourceRefs: { kind: 'sourceRefs', label: 'Source references', optional: true },
      },
      layoutHints: { primaryField: 'step' },
    },
    // unexpected[] is always appended automatically — not declared in metadata
  ],
}
```

The `LensReviewMetadata` type lives in `02-app/lib/lens-review/metadata/types.ts`. The full type definition is part of feature-build, not this layout spec — but the shape above is the contract.

---

## Mobile considerations

Desktop-first. ScreenSizeGate (≥990px) gates the dashboard. Specific Pass 2 notes:

- **Pair-with side-by-side** (e.g. evidenceFor / evidenceAgainst) breaks gracefully to vertical at <1280px.
- **Sticky commit footer** can crowd the viewport at narrow widths — InPageNav stays sticky too, so the commit row gets cramped. Live with it for v1; revisit at re-ingest day if it bites.
- **Contact-card modal** at `lg` size (640px) is fine on tablet/desktop; on narrower screens shadcn Dialog handles overflow.

---

## Keyboard interactions

This surface is editing-heavy so keyboard support matters.

**Page-level:**
- `Esc` (when no input focused) — opens "Discard draft?" confirm.
- `Cmd/Ctrl+Enter` (when no input focused) — opens "Commit?" confirm. Skips pre-flight if no unresolved.
- `Cmd/Ctrl+S` — explicit Save draft (overrides browser save dialog).
- `↓` / `↑` (when no input focused) — navigate row focus through current section.
- `Tab` — standard focus traversal; respects InPageNav → header → first section.

**Within an item row (focused, not expanded):**
- `Space` — toggle confirm/unreviewed.
- `R` — reject.
- `E` or `Enter` — expand editor pane.

**Within an expanded item:**
- `Esc` — collapse editor.
- `Tab` cycles through the expanded fields.
- For Person/Org rows: `L` after expand and pre-fetch — link to the top strong match (one-click affordance via keyboard).

**Within InPageNav:**
- `↑` / `↓` — scroll focus through sections.
- `Enter` — smooth-scroll to section.

**Within contact-card modal:**
- `Tab` cycles; `Enter` on focused Save submits.
- `Esc` cancels (with confirm if any field changed).

**Discoverability:** keyboard hints shown subtly in footer text on first open ("⌘⏎ to commit · ⌘S to save draft"). Tooltips on action buttons mention shortcuts.

---

## Molecule composition

This section feeds the `feature-build` plan-time gate. New molecules need spec sketches before plan approval.

### Existing molecules used (reuse unchanged)

- **PageHeader** (registry: `components/page-header.tsx`, spec: `design-system.md § PageHeader`) — top of review page.
- **PageChrome** (registry: `components/page-chrome.tsx`, spec: `design-system.md § PageChrome`) — wraps header + subheader.
- **ContentPane** (registry: `components/content-pane.tsx`, spec: `design-system.md § ContentPane`) — body container.
- **InPageNav** (registry: `components/in-page-nav.tsx`, spec: `design-system.md § InPageNav`) — section navigation. Used with extended item rendering — item content includes a count suffix `(N/M)`. The molecule already supports custom item children, so no extension needed.
- **SectionCard** (registry, spec) — every section's outer wrapper.
- **SectionDivider** (registry, spec) — between hybrid-section parts (object-with-array case).
- **ListItem** (registry, spec) — Source set entries, candidate match rows, contact-card primary-org picker results.
- **InlineField** (registry, spec) — text-field editors in expanded item editors and contact-card form.
- **SelectField** (registry, spec) — enum dropdowns (e.g. strength, decision type, relationship types).
- **InlineCellSelect** (registry, spec) — compact selects when used in dense item rows.
- **CheckboxField** (registry, spec) — confirm checkbox per item.
- **StringListEditor** (registry, spec) — `decisionFraming.options`, contact-card `links`.
- **ActionButton** (registry, spec) — Discard, Commit, Save draft, "+ Create new", "Link to this".
- **IconButton** (registry, spec) — close (✕), source-link, expand chevron, etc.
- **ActionMenu** (registry, spec) — PageHeader `⋯` menu.
- **Modal** (registry, spec) — contact-card sub-form, all confirm modals (commit, discard).
- **EmptyState** (registry, spec) — empty lens output.
- **PageSkeleton** (registry, spec) — pending-run skeleton.
- **MarkdownRenderer** (registry, spec) — read-only summaries (e.g. once committed, switching to read mode); used in prose-blob editor preview.
- **TypeBadge** (registry, spec) — source-type meta in source set rows.
- **StatusBadge** (registry, spec) — pending/draft/failed/committed pill.
- **ConfidenceBadge** (registry, spec) — surface-extraction items' high/medium/low.
- **InlineWarningBanner** (registry, spec) — source-deleted warnings, info-tone for system messages (info-tone is added in Pass 1).
- **SourceListRow** (Pass 1 new molecule) — reused in Source set section's source list (small adaptation: read-only mode without checkbox/actions). Either SourceListRow gains a `readOnly` prop variant, or we use plain `ListItem` for this case. **Decision:** plain `ListItem` here — `SourceListRow`'s richness (selection, hover actions) isn't needed in the Source set section.

### Existing molecules used but unspecced *(known gap — DS-03)*

None new for Pass 2.

### New molecules required

1. **`LensReportReview`** — the main schema-driven review surface.
   - **Why a molecule, not an organism?** It's used in two places: (a) `/inputs/results?run=<id>` page, and (b) eventually inside the Pass 3 committed-report page (in read-only mode). Centralising the rendering logic prevents drift.
   - **Props:** `metadata: LensReviewMetadata`, `result: LensResult` (typed by lens), `runId`, `sourceIds`, `lensInput?`, `onItemUpdate(path, value)`, `onItemConfirm(path)`, `onItemReject(path)`, `onCommit()`, `onDiscard()`, `onSaveDraft()`, `mode: 'review' | 'committed'`.
   - **Visual:** flex column with InPageNav + scrolling body + sticky commit footer. Sections rendered via switching on `metadata.sections[i].renderer`.
   - **Replaces:** `02-app/app/(dashboard)/inputs/results/results-client.tsx` and `analysis-review-panel.tsx` (the INP-11 review surfaces, which are mode-specific and need full replacement).

2. **`LensReviewSection`** — single section within `LensReportReview`. Composes one of (item-array / single-object / prose-blob / hybrid).
   - **Why separate from LensReportReview?** Section is the natural reuse boundary: hybrid case reuses both prose and array sub-renderers; pair-with case renders two array sections in one card. Splitting them avoids the parent molecule getting a 1000-line render switch.
   - **Props:** `section: LensReviewSection` (metadata), `value: unknown` (lens output for this section), `onUpdate(field, value)`, `onItemConfirm(index)`, `onItemReject(index)`, `runSourceIds: string[]`, `mode`.
   - **Visual:** SectionCard wrapping the content; renderer switched on `section.renderer`.

3. **`LensReviewItemCard`** — single item within an item-array section.
   - **Props:** `itemSchema`, `value`, `state: 'unreviewed' | 'confirmed' | 'rejected' | 'needs-attention'`, `primaryField`, `onUpdate(field, value)`, `onConfirm()`, `onReject()`, `runSourceIds`, `expandedSlot?: ReactNode` (the canonical-resolution slot for Person/Org).
   - **Visual:** card with collapsed/expanded states; per-state styling. Primary field shown in the collapsed view.
   - **Replaces:** the inline category row composition in INP-11's results-client.

4. **`SourceChip`** — clickable source reference pill.
   - **Props:** `source: { id, title, sourceType }`, `removable?: boolean`, `onRemove?: () => void`. Or a separate `SourceChipPicker` for editor mode.
   - **Visual:** inline pill with leading source-type icon, truncated title, click navigates to source detail in new tab. Removable variant has trailing `[✕]`.
   - **Replaces:** ad-hoc source-ref chips inline.

5. **`MultiSelectField`** — for `relationship_types` and similar multi-select needs.
   - **Why net new?** No multi-select form-context molecule exists. `MultiFilterPillGroup` is filter-context (chip-and-active styling), not form-context (label-and-envelope). Adding a form-context multi-select avoids reuse drift.
   - **Props:** `label`, `value: string[]`, `onSave: (next: string[]) => Promise<{ ok, error? }>`, `options: { value, label }[]`, `icon?`, `description?`, `disabled?`, `labelBg?`.
   - **Visual:** matches `SelectField` envelope (always-visible border, floating label, focus state). Inner control is a multi-select dropdown; selected values shown as removable chips inside the field.
   - **Replaces:** ad-hoc multi-select for relationship types in contact-card form.
   - **Reusable beyond Pass 2:** future segment audience taggers, multi-tag fields elsewhere.

6. **`MarkdownEditor`** — prose-blob editor with markdown live-preview.
   - **Props:** `value: string`, `onSave: (value: string) => Promise<{ ok, error? }>`, `wordCountTarget?: string`, `placeholder?`, `aria-label`.
   - **Visual:** large textarea with toolbar (B / i / link / list / blockquote), live markdown preview pane (or single-pane with ⌘P toggle), word-count counter. Reuses `MarkdownRenderer` for the preview.
   - **Replaces:** plain textarea use for case-study narratives, lens summaries, and any future long-form prose field.
   - **Reusable beyond Pass 2:** session-log composition, future blog draft surfaces, content-creator long-form output.
   - **Save contract:** standard text-field debounce (500ms onBlur).

7. **`MatchCandidateCard`** — single fuzzy-match candidate row in the canonical-resolution slot.
   - **Props:** `candidate: { id, canonicalName, role?, dedupKey, properties?, similarityScore }`, `onLink: () => void`, `state: 'available' | 'pre-selected' | 'linked'`.
   - **Visual:** ListItem-shape with similarity dot indicator, name + role, secondary disambiguation line, trailing "Link to this →" action. Pre-selected state has subtle highlight border.
   - **Replaces:** net new — no prior canonical-resolution UI exists.

8. **`ContactCardForm`** — internal form composition used inside the Person/Organisation contact-card modal.
   - **Why a molecule?** The form has 8+ fields and is reused across new-Person and new-Organisation invocations (with field variation). Centralising avoids two near-duplicate inline forms.
   - **Props:** `entityType: 'person' | 'organisation'`, `value: ContactCardValue`, `onChange(value)`, `onSubmit()`, `submitting: boolean`.
   - **Visual:** vertical form layout with required/optional grouping; the contact-card subgroup rendered inside a labelled `SectionCard` (or `bg-muted/30` block — lighter chrome). Composes InlineField, SelectField, MultiSelectField, StringListEditor.
   - **Replaces:** net new — no contact-card concept exists yet.

9. **`CommitFooter`** — sticky commit footer with counters.
   - **Why separate?** It's a widget with its own state (counter computation from review state) plus action buttons + keyboard discoverability. Inlining it in `LensReportReview` is fine but pulling it out keeps the parent thin.
   - **Note:** thin enough that this could be inline initially. **Decision:** inline this in `LensReportReview` for v1; promote if a second consumer appears.

### New molecules — extensions to existing

None for Pass 2 (Pass 1's `InlineWarningBanner` info-tone extension is reused here).

### Atoms used directly *(should be empty)*

None — every atomic use goes through a molecule.

### Net new molecule list (final)

| Name | Purpose | Reusable? |
|---|---|---|
| `LensReportReview` | Schema-driven review surface (root) | Yes — Pass 3 reuses in committed mode |
| `LensReviewSection` | Single section renderer | No — internal to LensReportReview |
| `LensReviewItemCard` | Single item card | No — internal to LensReportReview |
| `SourceChip` | Source-reference pill | Yes — chat citations, lens-report cards, retrieval results |
| `MultiSelectField` | Form-context multi-select with envelope | Yes — broadly reusable |
| `MarkdownEditor` | Prose editor with live preview | Yes — session log, content drafts, narrative fields |
| `MatchCandidateCard` | Canonical-match candidate row | Yes — future People/Org admin surfaces, dedup tools |
| `ContactCardForm` | Person/Org contact-card form | Yes — future People/Org admin |

Inlined for now (promote on second consumer): `CommitFooter`.

---

## Open questions / TBDs

1. **Schema-metadata format finalisation.** The shape sketched above (sections[] with renderer enum + per-renderer config) is the target. The exact TypeScript types are deferred to feature-build per the brief. Confirm the shape directionally at gate.

2. **Confidence badge for analysis-lens items.** Surface-extraction items have `confidence: high | medium | low`. Analysis-lens items (e.g. `evidenceFor.strength: strong | moderate | weak`) have lens-specific equivalents but not a confidence field. **Decision:** schema metadata can declare a `confidenceField` (the path to a confidence-equivalent field, e.g. `strength` for `decision-support.evidenceFor`), and the `LensReviewItemCard` renders a `ConfidenceBadge`-style chip. ConfidenceBadge would need a variant or hue mapping for the new vocabulary. **Cleaner:** new molecule `ItemQualityBadge` (state badge mapped from any controlled vocab) — but that's adding a molecule for one variant. **Recommend:** extend `ConfidenceBadge` to accept either the existing high/medium/low vocab OR a `state: 'success' | 'warning' | 'muted'` mapping that the metadata supplies. Confirm at gate.

3. **What happens when the lens output has fields not in metadata?** Defensive: render unknown fields as a "DEBUG: unknown field" section at the bottom (only in dev). In prod, log + skip. Confirm.

4. **What happens when metadata declares a section the LLM didn't fill?** Render the section header + an empty-state body ("The lens didn't surface anything for this section"). Counter shows `0/0`.

5. **`pairWith` edge cases.** What if `evidenceFor.pairWith = 'evidenceAgainst'` but `evidenceAgainst` is empty? **Decision:** render side-by-side anyway, with the empty side showing the empty state. Keeps the visual symmetry the lens-author intended.

6. **`object-with-array` in InPageNav.** `project-synthesis.methodology` is one section with one InPageNav entry, but the count `(N/M)` only reflects the array part (steps), not the prose part (overview). **Decision:** that's fine — the prose part has no per-item review, so the counter naturally only tracks steps.

7. **Re-running a lens from this surface.** "Re-run lens" in the action menu re-invokes the Pass 1 lens picker pre-populated. But if the user has unsaved review state on the current run — discard or save? **Decision:** prompt: "You have unsaved review state. Save draft first? · [Save draft and re-run] [Discard and re-run] [Cancel]".

8. **Keyboard `R` for reject** vs the natural reading of `R` as "Resolve" for canonical-resolution rows. **Decision:** `R` is reject globally; canonical resolution actions use `L` (link), `N` (new), `P` (park) — verbs distinct enough to map.

9. **Pre-fetch endpoint cost.** The match-count pre-fetch runs N small queries on render (one per Person/Org row). For a surface-extraction with 20 people, that's 20 queries. **Recommendation:** batch — single endpoint `POST /api/canonical-match/counts` taking `[{name, entityType}, ...]` returning the counts per row. Implementation detail surfaced for feature-build.

10. **Staged-new entities and concurrent reviews.** If the user is mid-review and a different review (in another tab) commits a new Person with the same name, what does the canonical-resolution slot show on next match-list load? **Decision:** the new entity appears as a "strong match" in subsequent loads. Worst case is a duplicate that the user resolves with a re-link. Out of scope to handle at v1.

---

## Self-improvement notes (Step G)

- **Schema-metadata format** could have benefited from drafting against at least two real lens outputs before this layout pass — the design carries some abstraction debt because it's metadata-driven without seeing actual filled-in values. Re-ingest day will be the first time this is tested with real LLM output and is the natural place to refine. Surface as a known caveat in the brief, not as a layout-design improvement.
- **`feature-brief` improvement (proposing):** add a "Are there any sub-form / nested-form patterns?" question to the questionnaire — Pass 2's contact-card-inside-canonical-resolution-inside-row pattern was structurally novel and a question for the brief would have prompted earlier scoping. Low-priority addition.
- **`layout-design` improvement (proposing):** when designing schema-driven render surfaces, the spec format should include a "metadata format" section (which Pass 2 has). Proposing as an optional spec sub-section; only triggered when the feature is genuinely metadata-driven. Confirm with user at gate.

---

## Pass 2 hard gate

This spec has not been filed yet. Approve to proceed.

The right places to push back:

- **Sticky commit footer placement** — sits at the bottom of ContentPane, full-width, with a border-top. Alternative: anchored to the page bottom outside ContentPane. Confirm.
- **Pair-with side-by-side layout** at ≥1280px — opinionated. May be too dense; alternative is always-stacked with a visual link between paired sections.
- **The 8 new molecules** — `LensReportReview` / `LensReviewSection` / `LensReviewItemCard` is the "render tree" for the surface; pulling them apart is the right call architecturally but you could push for a single fatter molecule. Other candidates: `MultiSelectField`, `MarkdownEditor`, `MatchCandidateCard`, `ContactCardForm`, `SourceChip`. Each has reuse potential beyond Pass 2.
- **Save-draft semantics** — explicit Save-draft button saves the same data as autosave but bumps a visible "last saved at". Push back if you'd rather just have autosave with no explicit checkpoint affordance.
- **Pre-flight commit confirm with unresolved Persons/Orgs** — three-way prompt (park & commit / commit only resolved / cancel). Confirm.
- **Confidence-badge extension vs new `ItemQualityBadge`** (Q2). Recommendation is to extend ConfidenceBadge.
- **The `ContactCardForm` modal stages-not-writes semantics** — the new Person/Org doesn't go to graph until the whole review commits. Important to confirm because it means the canonical-resolution slot needs to read "staged" entities alongside graph entities for the lifetime of the review. Confirm.
- **InPageNav width w-44** — slightly wider than Pass 1's w-36 to fit per-section count badges. Push back if that's drift.
- **Sibling switcher visibility** — only when `pendingRunCount > 1`. Could always be visible (showing "Run 1 of 1") for consistency. Recommendation: keep conditional.
