# Audience Segments Brief
Feature ID: DNA-03
Status: complete
Last updated: 2026-03-31

## Summary

Audience segments are the core "who" of the brand strategy layer. Every piece of content, every offer, every methodology is written for a specific segment. This feature provides full CRUD for segment records including psychographic profiles and voice-of-customer (VOC) statement libraries. For this build: UI structure + manual data entry + seed data. Generation modal (LLM-powered creation flow) is deferred to post-INF-06.

---

## Use cases

- **Create a new segment** — via modal: either answer a short structured questionnaire (multi-step, 3 pages) or paste/upload a source document. For this build: questionnaire path only, document path stubbed as "coming soon".
- **View all segments** — card grid view: avatar, segment name, summary. Click a card to open detail view.
- **View/edit a segment** — three-tab detail view: Persona (identity + psychographics fields), VOC (statements table filtered by type), Related Content (stub for now).
- **Edit a segment** — inline editing, autosave on field blur. No explicit save session.
- **Archive a segment** — soft delete. Archived segments become "ghosts" — visible where referenced (in offers, methodologies, content) but not selectable for new work. Prompt on archive if segment has dependents: reassign or leave as ghost reference.
- **View archived segments** — accessible via toggle/filter on the list view, shown in a muted/greyed state.
- **Add/edit/delete VOC statements** — within the VOC tab. Add button per type, multi-select delete. Statements are displayed in a filterable table.

---

## User journey

### List view (card grid)
1. User navigates to `/dna/audience-segments`
2. Sees card grid of all active segments — avatar placeholder, segment name, summary snippet
3. Top-right: "New segment" button → opens creation modal
4. Click any card → opens detail view for that segment
5. View toggle (top-right): card grid ↔ (future: list view — out of scope for this build)

### Creation modal — questionnaire path (this build)
1. Modal opens to path selection: "Answer questions" (active) | "Generate from document" (disabled, coming soon badge)
2. Page 1 — Identity: segment name (optional — model will generate if blank), persona role (required — "who are they for your business?"), optional persona first name (model generates if blank)
3. Page 2 — Core VOC: biggest problem (required), biggest desire (required)
4. Page 3 — Demographics (all optional): identity (sex, ethnicity, orientation), lifestyle (family situation, location, income type + amount, education, occupation), firmographics (business industry, business stage, business model)
5. "Generate segment" button — **stubbed for this build**: shows a "LLM integration coming soon" toast, does not submit. Form data is preserved so it can be wired up later.
6. For seed data purposes: a manual "Save without generating" escape hatch — saves the entered fields directly to the DB without generation. Hidden/subtle — not a primary CTA. This can be removed once generation is live.

### Detail view
**Layout — three columns:**

**Left sticky panel** (always visible across all tabs):
- Segment name (editable inline)
- Avatar image (placeholder for now — INF-04 out of scope)
- Persona name (editable inline)
- Overview/summary textarea (editable inline)

**Centre — tabbed content:**
- **Persona tab** — left mini-nav with anchor links: Key psychographics, Identity, Lifestyle, Business. Each section is a group of inline-editable fields with icons. Scrolls with anchor-linked sections. Fields per section:
  - *Key psychographics*: `roleContext`, `psychographics.personalityTraits`, `psychographics.motivations`, `psychographics.identity`, `psychographics.valuesAndWorldview`, `psychographics.lifestyle`
  - *Identity*: `demographics.gender`, `demographics.ethnicity`, `demographics.orientation`, `demographics.ageRange`
  - *Lifestyle*: `demographics.location`, `demographics.income`, `demographics.familySituation`, `demographics.education`, `demographics.occupation`
  - *Business*: `demographics.businessIndustry`, `demographics.businessStage`, `demographics.businessModel`
- **VOC tab** — filterable table of all VOC statements for this segment. Quick filters: All | Problems | Desires | Objections | Beliefs. Columns: Type, Statement, (Objection Answer — only shown when type = Objection). Add new button (dropdown: select type). Multi-select delete. Category tag (practical/emotional/psychological/social) shown as a small badge on each row.
- **Related Content tab** — stub: "Coming soon — content created for this segment will appear here."

**Right action panel** (sticky):
- Archive segment button
- (Future: delete — out of scope)
- View toggle: detail ↔ card grid

### Autosave behaviour
- All fields in the left sticky panel and Persona tab: save on field blur (focus leaves the field)
- Debounce: 500ms after blur before write (protects against accidental tab-outs)
- Subtle save indicator: "Saved" text near the field, fades after 2s. On error: "Save failed — try again" in red.
- VOC statements: saved immediately on add. Deleted on confirm.

---

## Data model / fields

All fields map directly to `dna_audience_segments` table (already migrated). No new DB changes needed.

**Left panel fields:**
| Field | DB column | Required | Notes |
|---|---|---|---|
| Segment name | `segment_name` | Yes | varchar(200) |
| Persona name | `persona_name` | No | varchar(100) |
| Summary/overview | `summary` | No | text |

**Persona tab — Key psychographics:**
| Field | DB column (path) | Notes |
|---|---|---|
| Role context | `role_context` | text — who they are for this business |
| Personality traits | `psychographics.personalityTraits` | JSONB sub-field |
| Motivations | `psychographics.motivations` | JSONB sub-field |
| Identity (self-perception) | `psychographics.identity` | JSONB sub-field |
| Values & worldview | `psychographics.valuesAndWorldview` | JSONB sub-field |
| Lifestyle (psychographic) | `psychographics.lifestyle` | JSONB sub-field |

**Persona tab — Identity/Lifestyle/Business (all in `demographics` JSONB):**
sex, ethnicity, orientation, ageRange, location, income, familySituation, education, occupation, businessIndustry, businessStage, businessModel

**VOC tab — stored in four JSONB columns:**
- `problems`: `[{ text, category }]` — category: practical | emotional | psychological | social
- `desires`: `[{ text, category }]`
- `objections`: `[{ objection, answer }]` — answer is the response field
- `shared_beliefs`: `[{ text, notes? }]`

---

## Update behaviour

**Freely editable** — fields can be edited at any time without versioning. `updated_at` is refreshed on every save. No history table. Rationale: these records are living, evolving documents — version history would add friction without clear value at this stage.

---

## Relationships

### Knowledge graph (FalkorDB)
Not in scope for this build. When INP-03 is built, segments may get corresponding graph nodes. `graphNodeId` is not on this table — the connection will be via the canonical register when needed.

### Postgres
- `dna_audience_segments.brand_id` → `brands.id` (cascade delete)
- Future FK targets: `dna_offers.target_audience_ids`, `dna_knowledge_assets.target_audience_ids`, `dna_content_pillars.target_audience_ids`, `dna_lead_magnets.target_audience_ids` — these are UUID array columns on the other tables, not FK constraints. Validated at application level.
- Content registry (future): content records will reference segment ID via a `target_audience_id` column

---

## UI/UX notes

Template match: none — this is the first instance. Establishes `dna-plural-item` pattern.
Full layout spec: `01-design/wireframes/DNA-03-layout.md`
Template file: `01-design/wireframes/templates/dna-plural-item-template.md`

**shadcn/ui components to use:**
- `Tabs` — for Persona / VOC / Related Content tabs (install)
- `Table` — for VOC statements (install)
- `Badge` — for VOC category tags (install)
- `Separator` — already installed
- `Input`, `Textarea` — already installed
- `Button` — already installed
- Existing primitives: `PageHeader`, `EmptyState`, `Modal`, `SectionCard`

---

## Edge cases

- **Empty state (no segments):** Full-page empty state using `EmptyState` component — "No audience segments yet. Create your first segment to get started." with "New segment" CTA.
- **Single segment — no switcher shown:** Segment switcher pill strip only appears when 2+ active segments exist.
- **Archive with dependents:** When archiving, check if segment ID appears in any `target_audience_ids` arrays across offers, knowledge assets, content pillars, lead magnets. If yes: show a warning modal listing affected items. Two options: "Archive anyway" (leaves ghost references) | "Cancel". No reassign flow in this build — that's a future concern.
- **Cannot archive last active segment:** If only one active segment exists, archive button is disabled with tooltip: "You must have at least one active audience segment."
- **VOC statement limits:** No hard DB limit. UI should warn (not block) if problems or desires fall below the schema minimums (10 for problems/desires, 5 for objections/beliefs) — show a count badge that turns amber below minimum.
- **Long segment names:** Truncate in card view and switcher pill with ellipsis. Full name always shown in sticky panel.
- **Autosave failure:** Show inline error near the field. Do not block editing. Retry on next blur.

---

## Out of scope (this build)

- LLM generation (both questionnaire path → generate and document upload path) — deferred to post-INF-06
- Document upload path in creation modal — stubbed as "coming soon"
- Avatar image upload — deferred to post-INF-04
- Related Content tab content — stub only
- List view (non-card) toggle — card grid only
- Segment reordering (`sort_order`) — deferred
- Graph node creation for segments — deferred to INP-03
- Reassign flow on archive — deferred

---

## Open questions / TBDs

None — all decisions resolved.

---

## Decisions log

- 2026-03-30: Brief written. Autosave on blur (500ms debounce) chosen over explicit save button — reduces friction for ADHD-aware editing flow. Source: voice note session.
- 2026-03-30: Generation modal deferred to post-INF-06. Questionnaire path UI built as skeleton; "Generate" CTA shows toast. "Save without generating" escape hatch added for seed data entry during this build.
- 2026-03-30: Versioning explicitly rejected — freely editable, `updated_at` only. Source: voice note session.
- 2026-03-30: Archive = soft delete only. Ghost references preserved. Hard constraint: cannot archive last active segment.
- 2026-03-30: VOC categories kept as four types: problems, desires, objections, beliefs. Beliefs retained as right-fit filter mechanism.
- 2026-03-30: Avatar URL out of scope pending INF-04.
- 2026-03-31: Layout design approved. Two-column layout (left sticky panel + content pane), no right column — actions in header area. Five-tab content pane: Persona (with mini-nav: Overview / Identity / Life Circs / Business / Psychographics) | VOC | Related Content. Establishes dna-plural-item template. Backlog items raised: dependency-aware empty states (P2), document upload path (post-SRC-01), generating UX (post-INF-06), switcher → select dropdown (watch item).
- 2026-03-31: Feature built. Added `status` column (`draft|active|archived`) in migration 0004, dropping `is_active` boolean. Seeded 2 active + 1 draft test segments (NicelyPut brand). Base UI `render` prop pattern used throughout (not `asChild`). `InlineField`, `VocTable`, `CreateSegmentModal`, `ArchiveSegmentModal`, `AudienceSegmentSwitcher` components established. Global toast system (Sonner) installed in root layout.
