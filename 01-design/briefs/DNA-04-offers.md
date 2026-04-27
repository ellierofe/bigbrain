# Offers Brief
Feature ID: DNA-04
Status: approved
Last updated: 2026-04-23

## Summary

Offers are "what you sell" — the full strategy record for each product, service, or programme. This feature provides CRUD for offer records with LLM-powered creation, audience-VOC mapping as a strategic discipline tool, and inline editing. The audience-VOC mapping is the key design insight: when defining an offer, you explicitly select which of your audience's problems, desires, objections, and beliefs this offer addresses — forcing the question "does this offer actually solve something my audience cares about?"

---

## Use cases

- **Create a new offer** — via modal: quick form (name, type, status, primary audience) → VOC mapping (check which of that audience's statements this offer addresses) → interlocutor generation (LLM uses basics + VOC mapping to generate remaining fields). Saves and redirects to detail view.
- **View all offers** — card grid view: offer name, type badge, status badge, primary audience name, overview snippet. Click to open detail view.
- **View/edit an offer** — tabbed detail view with left sticky panel + content pane. Inline editing, autosave on blur.
- **Archive an offer** — soft delete. Archived offers visible where referenced but not selectable for new work. Prompt if offer has dependents (referenced in knowledge assets via `relatedOfferIds`).
- **View archived offers** — toggle/filter on list view, muted state.
- **Add/edit/delete entity outcomes** — within the Content tab. Add button per kind, inline edit, delete with confirm. All 6 kinds: outcome, benefit, advantage, feature, bonus, faq.

---

## User journey

### List view (card grid)
1. User navigates to `/dna/offers`
2. Card grid of all active offers — name, type badge, status badge, primary audience name, overview snippet (first 2 lines)
3. Top-right: "New offer" button → opens creation modal
4. Click any card → detail view
5. Archive toggle in card grid header

### Creation modal — three-phase flow
**Phase 1: Quick form**
1. Offer name (required)
2. Offer type (required — select from known types: productised service, retainer, intensive, 1:1 coaching, 1:1 consulting, course, group programme, digital product, subscription, newsletter, book, template, tool, event, other)
3. Status (default: draft)
4. Primary audience (required — select from existing audience segments)

**Phase 2: VOC mapping**
1. System loads the selected audience segment's VOC statements: problems, desires, objections, beliefs
2. Displayed as four grouped checklists (same category badges as audience segment VOC tab)
3. User checks which statements this offer addresses
4. "Next" to proceed — minimum 1 problem and 1 desire must be checked (soft warning, not hard block)

**Phase 3: Interlocutor generation**
1. LLM receives: offer name, type, status, primary audience profile, checked VOC statements
2. Follows the intelligent interlocutor pattern (established in GEN-01): LLM may ask 1-2 follow-up questions to clarify positioning intent, key differentiator, or pricing approach
3. Generates: overview, USP, USP explanation, CTA, pricing structure, guarantee, scarcity, sales funnel notes, and entity outcomes (outcomes, benefits, advantages, features, bonuses, FAQs). Customer journey is generated separately after core offer is confirmed (see Journey tab below).
4. "Generating..." state with progress indication (same pattern as GEN-01)
5. On complete: save offer + entity outcomes → redirect to detail view

### Detail view

**Left sticky panel** (always visible):
- Offer name (editable inline)
- Type badge (editable — select dropdown)
- Overview textarea (editable inline)
- Primary audience — name displayed as link to segment detail view
- Knowledge asset — name displayed as link (if linked), or "Link IP" button (opens picker)

**Status badge** — inline with page title in header area (not in left panel). Clickable dropdown to change status. Colour-coded per template: draft (amber), active (green), retired/paused (muted). See template for spec.

**Tabbed content pane (5 tabs):**

**Tab 1: Positioning**
- USP (editable inline textarea)
- USP explanation (editable inline textarea)
- CTA (editable inline)
- Visual prompt (editable inline textarea)
- Audience-VOC mapping display — shows which problems/desires/objections/beliefs this offer addresses, grouped by type, with audience segment name as header. Editable (can check/uncheck). Links back to audience segment.

**Tab 2: Commercial**
- Pricing section:
  - Currency (editable)
  - Main price (editable)
  - Display price (editable)
  - Payment plans (list — add/edit/remove)
  - Pricing notes (editable textarea)
  - Reframing note (editable textarea)
- Guarantee section:
  - Type (editable)
  - Headline (editable)
  - Description (editable textarea)
  - Terms (editable textarea)
  - Business risk note (editable textarea)
- Scarcity (editable textarea)
- Sales funnel notes (editable textarea)

**Tab 3: Value Gen**
- Entity outcomes, grouped by kind with section headers:
  - Outcomes (with optional category badge: resources/skills/mindset/relationships/status)
  - Benefits (with optional category badge)
  - Advantages
  - Features
  - Bonuses (shows objection addressed + value statement)
  - FAQs (shows question + answer, with faq type badge)
- Each kind section: add button, inline edit on existing items, delete with confirm, sequential add-order (`sortOrder`)
- Count badges per section

**Tab 4: Journey**
- Customer journey — the full journey a customer takes from first awareness through to advocacy for this offer.
- Five stages: Awareness → Consideration → Decision → Service → Advocacy
- Each stage displays:
  - **Thinking** — what the customer is thinking at this stage
  - **Feeling** — emotional state
  - **Doing** — actions they're taking
  - **Push to next** — what moves them to the next stage (not shown for Advocacy)
- All fields editable inline (textarea, autosave on blur)
- Displayed as a vertical sequence of stage cards, each with the four fields
- **Generation:** "Generate journey" button at top of tab. LLM generates the full journey based on audience profile + offer details + VOC mapping. Overwrites existing journey with confirmation ("This will replace the current journey — proceed?"). Can also regenerate individual stages.
- **Empty state:** "No customer journey yet. Generate one based on your audience and offer details." + "Generate journey" CTA.
- **When generated during creation:** Not generated in the initial creation flow. Generated on-demand from the Journey tab after the core offer is saved and reviewed.

**Tab 5: Related Content**
- Stub: "Content created using this offer will appear here once the content registry is built."

**No separate Knowledge Asset tab** — the link lives in the left panel as a reference/link. Full knowledge asset editing happens on its own page (DNA-05).

### Autosave behaviour
Same pattern as DNA-03:
- All text fields: save on blur, 500ms debounce
- Subtle "Saved" indicator, fades after 2s
- Entity outcomes: saved immediately on add/edit. Deleted on confirm.
- JSONB fields (pricing, guarantee): save the full object on any sub-field blur
- VOC mapping: save on check/uncheck

---

## Data model / fields

### `dna_offers` table (exists — no migration needed for existing columns)

All fields per schema in `01-design/schemas/dna-offers.md`. Key fields:

| Field | DB column | Required | Notes |
|---|---|---|---|
| Name | `name` | Yes | varchar(200) |
| Offer type | `offer_type` | Yes | varchar(100) |
| Status | `status` | Yes | default 'active' |
| Overview | `overview` | No | text |
| USP | `usp` | No | text |
| USP explanation | `usp_explanation` | No | text |
| Target audience IDs | `target_audience_ids` | No | uuid[] — soft ref to audience segments |
| Knowledge asset ID | `knowledge_asset_id` | No | FK → dna_knowledge_assets |
| Pricing | `pricing` | No | JSONB — see schema for structure |
| Guarantee | `guarantee` | No | JSONB — see schema for structure |
| Scarcity | `scarcity` | No | text |
| Sales funnel notes | `sales_funnel_notes` | No | text |
| Customer journey | `customer_journey` | No | JSONB — see structure below |
| CTA | `cta` | No | text |
| Visual prompt | `visual_prompt` | No | text |
| Internal notes | `internal_notes` | No | text |

### New column needed: `vocMapping`

**New JSONB column on `dna_offers`:**

```
vocMapping jsonb nullable
```

Structure:
```json
{
  "audienceSegmentId": "uuid",
  "problems": [0, 3, 7],
  "desires": [1, 4],
  "objections": [2],
  "beliefs": [0, 5]
}
```

Values are indexes into the primary audience segment's JSONB arrays (`problems`, `desires`, `objections`, `shared_beliefs`). This is a lightweight mapping — no new table needed.

### New column needed: `customerJourney`

**New JSONB column on `dna_offers`:**

```
customerJourney jsonb nullable
```

Structure:
```json
[
  {
    "stage": "awareness",
    "thinking": "They're starting to realise their positioning isn't landing...",
    "feeling": "Frustrated, uncertain",
    "doing": "Googling, asking peers, reading content",
    "pushToNext": "Sees a post or case study that names their exact problem"
  },
  { "stage": "consideration", "thinking": "...", "feeling": "...", "doing": "...", "pushToNext": "..." },
  { "stage": "decision", "thinking": "...", "feeling": "...", "doing": "...", "pushToNext": "..." },
  { "stage": "service", "thinking": "...", "feeling": "...", "doing": "...", "pushToNext": "..." },
  { "stage": "advocacy", "thinking": "...", "feeling": "...", "doing": "..." }
]
```

Five fixed stages. Advocacy has no `pushToNext`. Generated on-demand from the Journey tab after core offer is confirmed.

**Migration required:** Add `voc_mapping` JSONB column and `customer_journey` JSONB column to `dna_offers`. Drop `customer_journey_stage` varchar column (replaced by the structured journey).

### `dna_entity_outcomes` table (exists — no changes needed)

All 6 kinds in scope: outcome, benefit, advantage, feature, bonus, faq. Linked via `offer_id`. See `01-design/schemas/dna-entity-outcomes.md` for full field list.

---

## Update behaviour

**Freely editable** — same as DNA-03. Fields editable at any time, `updated_at` refreshed on save. No version history.

---

## Relationships

### Knowledge graph (FalkorDB)
Not directly — offers live in Postgres only. No Offer node type in ADR-002. Knowledge assets have graph nodes; the offer's `knowledgeAssetId` FK is the bridge to the graph.

### Postgres
- `dna_offers.brand_id` → `brands.id` (cascade delete)
- `dna_offers.knowledge_asset_id` → `dna_knowledge_assets.id` (set null on delete)
- `dna_offers.target_audience_ids` → soft ref to `dna_audience_segments.id` (array, app-validated)
- `dna_offers.voc_mapping` → indexes into primary audience segment's JSONB arrays
- `dna_entity_outcomes.offer_id` → `dna_offers.id` (cascade delete)
- Referenced by: `dna_knowledge_assets.related_offer_ids` (soft ref array)

---

## UI/UX notes

Template match: `dna-plural-item` pattern (adaptation from DNA-03).
Full layout spec: `01-design/wireframes/DNA-04-layout.md`

Key differences from template:
- **Status badge in header** (per updated template), not left panel
- **5 tabs** instead of 3: Positioning, Commercial, Value Gen, Journey, Related Content
- **Three-phase creation modal** (quick form → VOC mapping → interlocutor) vs template's 3-step form
- **Customer journey tab** — structured 5-stage journey, generated on-demand after core offer is saved
- **JSONB sub-field editing** (pricing, guarantee, customer journey) — structured form sections within tabs
- **Entity outcomes management** (add/edit/delete per kind, 6 kinds) — adapts template's sub-items table pattern
- **VOC mapping display** — checkbox-based mapping in Positioning tab
- **Knowledge asset picker** — popover/modal in left panel

Design system molecules: PageHeader, ContentPane, InlineField, SectionCard, SectionDivider, TabbedPane, plus shadcn (Badge, Select, Checkbox, Button, Input, Textarea).

---

## Edge cases

- **Empty state (no offers):** Full-page empty state — "No offers yet. Create your first offer to define what you sell." with "New offer" CTA.
- **No audience segments exist:** Creation modal's audience select is empty. Show message: "Create an audience segment first — offers must target a specific audience." Link to `/dna/audience-segments`.
- **Primary audience archived after offer creation:** VOC mapping still displays (ghost reference pattern from DNA-03). Audience name shown with "(archived)" badge. VOC statements still readable but mapping is read-only (can't check new ones against an archived segment).
- **VOC statements change after mapping:** If the audience segment's VOC arrays are reordered or items deleted, the index-based mapping could point to wrong statements. Mitigation: on load, validate indexes against current array lengths. Out-of-range indexes shown as "(statement removed)" rather than crashing.
- **Archive with dependents:** Check if offer ID appears in `dna_knowledge_assets.related_offer_ids`. If yes: warning modal listing affected knowledge assets. "Archive anyway" or "Cancel".
- **Cannot archive last active offer:** Same pattern as segments — disabled with tooltip if only one active offer exists.
- **Long offer names:** Truncate in card view with ellipsis. Full name in sticky panel.
- **Entity outcomes ordering:** `sortOrder` on entity outcomes. New items get `max(sortOrder) + 1` within their kind group.
- **Pricing/guarantee empty state:** Show structured form with empty fields, not a blank space. Fields are optional but the structure is always visible.

---

## Out of scope (this build)

- Document upload path in creation modal — stubbed as "coming soon" (same as DNA-03)
- Offer comparison view (side-by-side)
- Offer duplication
- Multi-audience VOC mapping (only primary audience mapped; secondary audiences stored in `targetAudienceIds` but without VOC mapping)
- Offer performance tracking / analytics
- Visual prompt → image generation
- Drag-to-reorder entity outcomes (use `sortOrder` field, manual reorder via up/down buttons or just sequential add order)

---

## Open questions / TBDs

None — all decisions resolved.

---

## Decisions log

- 2026-04-23: Brief written. VOC mapping established as core discipline tool — selecting which audience statements an offer addresses forces strategic alignment. Index-based JSONB mapping on `dna_offers.voc_mapping` chosen over junction table (lightweight, no new table).
- 2026-04-23: Three-phase creation flow: quick form → VOC mapping → interlocutor generation. VOC mapping is selection-based (checkboxes), not conversational — faster and more accurate for this task.
- 2026-04-23: Knowledge asset linking in scope — displayed as reference/link in left panel, not a separate tab. Full knowledge asset editing on its own page (DNA-05).
- 2026-04-23: LLM generation in scope — follows GEN-01 intelligent interlocutor pattern. Gemini Pro for generation (same as GEN-01).
- 2026-04-23: All 6 entity outcome kinds in scope for v1.
- 2026-04-23: Primary audience only for VOC mapping. `targetAudienceIds` array stores all audiences (including primary), but only primary gets the VOC mapping exercise.
- 2026-04-23: Entity outcome reorder: sequential add-order for v1 (new items go to bottom). Drag-to-reorder deferred — review after first use.
- 2026-04-23: VOC mapping index fragility acknowledged. Future improvement: store statement text as comparator alongside indexes, enabling [updated]/[removed] flags when the audience segment's VOC arrays change. For v1: validate indexes on load, show "(statement removed)" for out-of-range. Added as low-priority backlog item.
- 2026-04-23: Brief approved.
- 2026-04-23: Layout design — status badge moved to header (inline with title) per updated template, not left panel.
- 2026-04-23: Customer journey redesigned from single `customer_journey_stage` varchar to structured JSONB with 5 stages (awareness → consideration → decision → service → advocacy), each with thinking/feeling/doing/pushToNext. Gets its own tab (Journey). Generated on-demand after core offer is saved, not during initial creation.
- 2026-04-23: "Content" tab renamed to "Value Gen". Related Content tab added back as 5th tab (stub).
- 2026-04-23: `customer_journey_stage` column to be dropped — replaced by `customer_journey` JSONB.
