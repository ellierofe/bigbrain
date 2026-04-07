# Layout Spec: DNA-03 Audience Segments
Status: approved
Last updated: 2026-03-31
Template: establishes `dna-plural-item` pattern

---

## Template note

This is the **first instance** of the plural DNA item pattern. Every structural decision here becomes the template for all subsequent plural DNA types (offers, knowledge assets, content pillars, etc.). Variable parts are explicitly called out at the end of this document.

---

## Views

| View | Purpose | When it appears |
|---|---|---|
| Detail view | View + edit a single segment | Default landing when segments exist — loads first segment directly |
| Card grid | Browse all segments | Via view toggle in header |
| Creation modal | Create a new segment | "New segment" button |
| Archive confirmation modal | Confirm archive + warn about dependents | Archive button in header |

**Default route behaviour:** If segments exist, `/dna/audience-segments` redirects to `/dna/audience-segments/[first-segment-id]`. If no segments, shows empty state with create CTA.

---

## Navigation and routing

- **Entry:** "Audience Segments" in sidebar → `/dna/audience-segments`
- **Routes:**
  - `/dna/audience-segments` — redirects to first segment or empty state
  - `/dna/audience-segments/[id]` — detail view, Persona tab default
  - `/dna/audience-segments/[id]?tab=voc` — detail view, VOC tab active
  - `/dna/audience-segments/[id]?tab=related` — detail view, Related Content tab
  - `/dna/audience-segments/cards` — card grid view
- **Tab state:** Preserved via `?tab=` search param. Deep-linkable.
- **Back to cards:** View toggle icon in header area.
- **Breadcrumb:** Page header subtitle shows "Audience Segments" as context.

---

## Header area (detail view)

Sits above the three-column layout. Contains:

```
Audience Segments                              [⊞ cards] [+ New segment] [⊗ Archive]
──────────────────────────────────────────────────────────────────────────────────────
[Segment A pill] [Segment B pill] [Segment C pill]   ← segment switcher
```

- **Title:** "Audience Segments" — `PageHeader` component, no subtitle in detail view
- **Actions (right-aligned, inline with title):**
  - View toggle: card grid icon — navigates to `/dna/audience-segments/cards`
  - "New segment" button — primary, opens creation modal
  - "Archive" button — secondary/destructive variant, icon `Archive`
- **Segment switcher:** Pill strip below the header. Each pill = segment name. Active pill highlighted. Pills truncate at ~24 chars with ellipsis. **Watch item:** if names consistently overflow, replace pill strip with a `Select` dropdown.
- Switcher only shown when 2+ active segments exist.
- Archive button disabled (with tooltip "You must have at least one active audience segment") when only one active segment exists.

---

## Card grid view

**Route:** `/dna/audience-segments/cards`

**Header:** Same `PageHeader` — title "Audience Segments", subtitle "Define who you're talking to.", action: "New segment" button. View toggle shows detail-view icon (to go back to last viewed segment or first segment).

**Layout:** 3-col grid on wide, 2-col on medium (~768px+).

**Card:**
- Avatar: 48px circle, grey with segment name initial as fallback
- Segment name: bold, 1 line, ellipsis truncation
- Summary: 3 lines max, muted foreground, truncated

**Empty state:** `EmptyState` component — icon `Users`, heading "No audience segments yet", description "Create your first segment to start building targeted content and offers.", CTA "Create your first segment" → opens creation modal.

**Active vs archived:** Active segments only by default. "Show archived" toggle top-left — off by default. When on, archived segments appear at end of grid, muted with "Archived" badge.

**Draft segments:** Shown in the card grid with a "Draft" badge. Visually distinct (slightly muted) but clickable and editable. Not selectable as targets for offers/content/pillars until status is `active`.

**No sort controls, no pagination.**

---

## Detail view — three-column layout

```
┌──────────────────────────────────────────────────────────────────┐
│  Header area (segment switcher + actions)                        │
├─────────────────┬──────────────────────────────┬─────────────────┤
│  LEFT PANEL     │  CONTENT PANE                │  (no right col) │
│  ~220px sticky  │  flex-1                      │                 │
│                 │  [Persona][VOC][Related]      │                 │
│  Avatar 80px    │  ──────────────────────────  │                 │
│  Segment name   │  Persona tab:                │                 │
│  Persona name   │   ┌──────────┬─────────────┐ │                 │
│                 │   │ Mini-nav │ Fields       │ │                 │
│                 │   │ Overview │ (anchored,   │ │                 │
│                 │   │ Identity │  scrollable) │ │                 │
│                 │   │ Life C.  │              │ │                 │
│                 │   │ Business │              │ │                 │
│                 │   │ Psycho.. │              │ │                 │
│                 │   └──────────┴─────────────┘ │                 │
└─────────────────┴──────────────────────────────┴─────────────────┘
```

No right column — actions live in the header area.

### Left sticky panel (~220px)

Scrolls with page but sticks to top once header scrolls out of view.

- **Avatar:** 80px circle. Grey placeholder with segment name initial (white text). Centred. (Image upload: out of scope — INF-04 dependency.)
- **Segment name:** Inline editable `input`, bold, autosave on blur
- **Persona name:** Inline editable `input`, muted label "Persona name" above, autosave on blur
- **Save indicator:** Tiny "Saved ✓" text below the field that just saved, fades after 2s. "Save failed" in red, persists until next successful save.

### Content pane (flex-1)

#### Tabs: Persona | VOC | Related Content

Tab state via `?tab=` search param.

---

#### Persona tab

Two sub-columns inside the content pane:

**Mini-nav** (~160px, sticky within tab, vertical):
Anchor links to each section:
- Overview
- Identity
- Life Circs
- Business
- Psychographics

Clicking a link smooth-scrolls to the section. Active section highlighted as user scrolls.

**Fields area** (flex-1, scrollable):

Each section has a small heading (uppercase, muted, tracking-wide) and a group of inline-editable fields. All autosave on blur. All use floating labels.

**Overview**
- Summary — textarea, full width, icon `FileText`, label "Overview / summary", placeholder "50–80 word overview starting 'This audience...'"
- Role context — textarea, full width, icon `Users`, label "Role", placeholder "Who are they for your business? e.g. A founder who needs to define their positioning before their next funding round"
- Biggest problem — textarea, full width, icon `AlertCircle`, label "Core problem", placeholder "In their own words, what's their biggest struggle related to what you do?"
- Biggest desire — textarea, full width, icon `Sparkles`, label "Core desire", placeholder "What do they most want to achieve or feel?"

**Identity**
- Age range — input, icon `Calendar`, label "Age range"
- Sex — input, icon `User`, label "Sex"
- Ethnicity — input, icon `Globe`, label "Ethnicity"
- Sexual orientation — input, icon `User2`, label "Sexual orientation"

**Life Circs**
- Location — input, icon `MapPin`, label "Location"
- Personal income — input, icon `Banknote`, label "Personal income"
- Household income — input, icon `Banknote`, label "Household income"
- Family situation — input, icon `Home`, label "Family situation"
- Education — input, icon `GraduationCap`, label "Education"
- Occupation — input, icon `Briefcase`, label "Occupation"

**Business**
- Industry / vertical — input, icon `Building2`, label "Industry"
- Business stage — input, icon `TrendingUp`, label "Stage"
- Business model — input, icon `LayoutGrid`, label "Business model"

**Psychographics**
- Personality traits — textarea, icon `Brain`, label "Personality traits"
- Motivations — textarea, icon `Target`, label "Motivations"
- Identity / self-perception — textarea, icon `Fingerprint`, label "Identity & self-perception"
- Values & worldview — textarea, icon `Heart`, label "Values & worldview"
- Lifestyle (psychographic) — textarea, icon `Coffee`, label "Lifestyle"

---

#### VOC tab

**Filter pills row:**
`All` | `Problems (n)` | `Desires (n)` | `Objections (n)` | `Beliefs (n)`

Count badge turns amber when below minimum:
- Problems: < 10
- Desires: < 10
- Objections: < 5
- Beliefs: < 5

**Toolbar (above table, right-aligned):**
- "Add ▾" dropdown → options: Problem / Desire / Objection / Belief
- "Delete selected" button — appears only when 1+ rows checked, destructive variant

**Table columns:**
- Checkbox (multi-select)
- Type — `Badge`, colour-coded: Problems (blue) / Desires (green) / Objections (amber) / Beliefs (purple)
- Category — small muted badge: practical / emotional / psychological / social. Hidden when Objections filter active.
- Statement — click to edit inline. Single-line truncated, expands to textarea on click.
- Objection answer — only visible when Objections filter is active. Click to edit inline.

**Inline editing in table:** Click a cell → becomes an editable textarea in place. Save on blur. Escape to cancel. No modal required.

**Adding a statement:** Selecting a type from "Add ▾" inserts a new empty row at the top of the table, immediately in edit mode. For Objections: two cells open (statement + answer). Category defaults to "practical", editable inline. Save on blur or explicit ✓ button at end of row.

**Deletion:** Optimistic — row removed from UI immediately. Restored with toast on failure.

**Empty state (per filtered type):** "No [type] yet — add your first one via the Add button above."

---

#### Related Content tab

`EmptyState` stub — icon `FileText`, heading "Related content coming soon", description "Content created for this segment will appear here once the content registry is built."

---

## Creation modal

**Trigger:** "New segment" button anywhere in the view.
**Component:** `Modal` (size `lg`).
**On cancel:** Dismiss modal, no data saved.
**On success (Save fields only):** Close modal, navigate to new segment's detail view.

### Page 1 — Path + Identity

**Path selection (top):**
Two option cards side by side:
- "Answer questions" — active, teal/primary border
- "Generate from document" — muted, "Requires sources setup" badge, non-clickable. **Dependency:** unblock when SRC-01 is complete. Add to backlog.

**Fields:**
- Segment name — input, optional, placeholder "e.g. Scaling Founder — leave blank to auto-generate"
- Role — textarea, **required**, label "Who are they for your business?"

**Progress indicator:** "Step 1 of 3" top-right of modal body.
**Footer:** Cancel | Next →

### Page 2 — Core VOC

- Biggest problem — textarea, **required**, label "Core problem", placeholder "In their own words, what's their biggest struggle related to what you do?"
- Biggest desire — textarea, **required**, label "Core desire", placeholder "What do they most want to achieve or feel?"
- Note below fields: "These two inputs shape the entire generated profile. Be specific."

**Progress:** "Step 2 of 3"
**Footer:** ← Back | Next →

### Page 3 — Demographics

**Guidance note:** "Only add what's genuinely signal for this audience — not all fields, only the ones that matter."

Fields (all optional, 2-col grid where space allows):
- Sex, Ethnicity, Sexual orientation, Age range
- Location, Personal income, Household income, Family situation, Education, Occupation
- Business industry, Business stage, Business model

**Progress:** "Step 3 of 3"

**Footer:** ← Back | two CTAs:
- **"Generate segment"** — primary button. For this build: disabled appearance after click + toast "LLM integration coming soon — check back after INF-06". Once LLM is live: triggers generation job, modal transitions to generating state (see below).
- **"Save as draft"** — text link/subtle secondary. Saves entered fields as a `draft` status segment without generation. For seed data / manual entry. Can be removed post-INF-06 once generation is reliable.

### Generating state (stub — wire up post-INF-06)

When Generate is clicked and LLM is live, modal transitions to:
- Spinner / progress indicator
- "Generating your segment — this takes about 30 seconds"
- "Don't close this tab"
- Cancel button (cancels job if possible, marks segment as draft)

---

## Draft segment behaviour

Segments created via "Save as draft" have `status = 'draft'`.

- Shown in card grid with "Draft" badge, slightly muted
- Fully editable in detail view
- **Not selectable** as audience targets in offers, knowledge assets, content pillars, lead magnets until status = `active`
- Manual promotion to active: "Mark as active" button in the header area (replaces Archive when viewing a draft)
- No auto-promotion — draft → active is always a deliberate action

---

## Archive flow

**Pre-check:** Server action queries `target_audience_ids` arrays across offers, knowledge assets, content pillars, lead magnets for this segment's ID.

**No dependents:** Modal — "Archive [Segment Name]? This segment will no longer appear in new content or offer creation. It will remain visible where already referenced." Buttons: Cancel | Archive.

**Dependents exist:** Modal — "Archive [Segment Name]? This segment is used by: [bullet list of affected item names + types]. These references will remain but show the segment as archived. You can reassign them later." Buttons: Cancel | Archive anyway.

**Cannot archive last active segment:** Archive button in header is disabled. Tooltip on hover: "You must have at least one active audience segment."

**On archive:** `is_active = false`. Redirect to next active segment (if any) or empty state.

---

## Avatar handling

- Default: grey circle, segment name initial in white
- Size: 80px in left sticky panel, 48px in card grid
- Upload: out of scope (INF-04 dependency)

---

## Loading and error states

- **Page load:** shadcn `Skeleton` — card skeletons in grid, field skeletons in detail view left panel + content pane
- **Autosave success:** "Saved ✓" near field, fades 2s. No toast.
- **Autosave failure:** "Save failed" in red near field, persists until next save.
- **Archive failure:** Toast (error) — "Couldn't archive. Please try again."
- **VOC delete failure:** Toast (error) + row restored.
- **Toast system:** Install shadcn `Sonner`. One global installation in root layout. Used for: errors, coming-soon stubs, generation status. **This establishes the global toast pattern for all features.**

---

## Viewport

Designed for ~768px+ (tablet and desktop). No mobile support. Below 768px: layout will degrade — acceptable, single-user app on desktop.

---

## Backlog items to add

1. **Dependency-aware empty states** (P2) — empty states that explain what the current item unlocks (e.g. "Create a segment to be able to create offers and generate content"). Triggered contextually when arriving at an empty DNA type from a dependent feature.
2. **"Generate from document" path in creation modal** — unblock when SRC-01 is complete.
3. **Generating UX** — progress state in creation modal — unblock when INF-06 is complete.
4. **Segment switcher → select dropdown** — convert pill strip to `Select` if segment names consistently overflow.

---

## Template: variable parts for future DNA plural types

Everything structural is fixed. Per future instance, only these parts change:

| Variable | Audience Segments value | Changes to |
|---|---|---|
| Route slug | `audience-segments` | `offers`, `knowledge-assets`, etc. |
| Page title + subtitle | "Audience Segments" | Per type |
| Left panel fields | Segment name, Persona name | Offer name + type + status; Asset name + kind, etc. |
| Tab names | Persona / VOC / Related Content | e.g. Offer / Details / Related Content |
| Content pane sections | Overview, Identity, Life Circs, Business, Psychographics | Per type's field groups |
| Mini-nav labels | As above | Per type |
| VOC table / sub-table | Problems, Desires, Objections, Beliefs | Features, Bonuses, FAQs (for offers); Components, Flow steps (for knowledge assets) |
| Empty state copy | Segments-specific | Per type |
| Archive dependency targets | offers, knowledge_assets, content_pillars, lead_magnets | Per type's dependents |
| Creation modal fields | Role, biggest problem/desire, demographics | Per type's intake fields |
| Status values | draft / active / archived | May vary (e.g. offers: draft / active / retired / paused) |
