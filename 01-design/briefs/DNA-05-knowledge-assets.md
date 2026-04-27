# Knowledge Assets Brief
Feature ID: DNA-05
Status: approved
Last updated: 2026-04-23

## Summary

Knowledge assets are "how you work" — methodologies, frameworks, processes, tools, and templates that represent Ellie's proprietary IP and approach. This feature provides full CRUD for knowledge asset records with source-document-driven creation, audience-VOC mapping as a strategic discipline tool, and LLM-powered generation. Each asset is a rich, structured record that feeds content creation, brainstorming, and strategy — and for methodology-kind assets, connects into the knowledge graph for relationship traversal.

---

## Use cases

- **Create a new knowledge asset** — via modal: choose context path (source docs or chat-only) → attach/select source documents → key metadata (name, kind, audience) → VOC mapping → interlocutor generation. Saves and redirects to detail view.
- **View all knowledge assets** — card grid view: name, kind badge, status badge, proprietary badge, summary snippet. All kinds shown together with kind filter. Click to open detail view.
- **View/edit a knowledge asset** — tabbed detail view with left sticky panel + content pane. Inline editing, autosave on blur. Universal layout across all kinds — irrelevant fields hidden/disabled per kind rather than separate layouts.
- **Archive a knowledge asset** — soft delete. Archived assets visible where referenced (in offers via `relatedOfferIds`, in entity outcomes) but not selectable for new work. Prompt if asset has dependents.
- **View archived assets** — toggle/filter on list view, muted state.
- **Add/edit/delete entity outcomes** — within the Value tab. Same pattern as DNA-04 offers: add button per kind, inline edit, delete with confirm. All 6 kinds: outcome, benefit, advantage, feature, bonus, faq.
- **Link to knowledge graph** — manual action (Methodology kind only). Creates a Methodology node in FalkorDB and populates `graphNodeId`. Not automatic — prevents seeding graph with incomplete/draft content.

---

## User journey

### List view (card grid)
1. User navigates to `/dna/knowledge-assets`
2. Card grid of all active assets — name, kind badge (colour-coded), status badge, proprietary indicator, summary snippet (first 2 lines)
3. Kind filter: pill strip across top — All | Methodology | Process | Tool (+ future kinds as added)
4. Top-right: "New asset" button → opens creation modal
5. Click any card → detail view
6. Archive toggle in card grid header

### Creation modal — five-phase flow

**Phase 1: Context path**
1. Two options: "Add source documents" (primary) | "Just answer questions" (skip to phase 3)
2. Source docs is the expected path — most knowledge assets will be created from existing material

**Phase 2: Source document selection** (if source docs chosen)
1. Searchable list of existing `src_source_documents` — filter by type, search by title
2. Multi-select: check documents to attach as context
3. Upload new: inline upload for new files (PDF, image, document) — creates a `src_source_documents` record and selects it
4. Selected documents shown as chips with remove option
5. "Next" to proceed — minimum 1 document selected

**Phase 3: Key metadata**
1. Asset name (required)
2. Kind (required — select: methodology, process, tool)
3. Status (default: draft)
4. Proprietary (default: true — toggle)
5. Primary audience (required — select from existing audience segments)

**Phase 4: VOC mapping**
1. System loads the selected audience segment's VOC statements: problems, desires, objections, beliefs
2. Displayed as four grouped checklists (same category badges as audience segment VOC tab — identical pattern to DNA-04 offers)
3. User checks which statements this knowledge asset addresses
4. "Next" to proceed — minimum 1 problem and 1 desire must be checked (soft warning, not hard block)

**Phase 5: Interlocutor generation**
1. LLM receives: asset name, kind, proprietary flag, primary audience profile, checked VOC statements, source document content (extracted text from selected docs)
2. Follows the intelligent interlocutor pattern (GEN-01): LLM may ask 1-3 follow-up questions to clarify principles, key differentiators, origin story, or application context
3. Generates: summary, principles, origin, key components, flow steps, objectives, problems solved, contexts, prior knowledge, resources, kind-specific detail fields, visual prompt, FAQs, and entity outcomes (outcomes, benefits, advantages)
4. "Generating..." state with progress indication (same pattern as GEN-01)
5. On complete: save knowledge asset + entity outcomes → redirect to detail view

### Detail view

**Left sticky panel** (always visible):
- Asset name (editable inline)
- Kind badge (editable — select dropdown)
- Status badge (editable — select dropdown: draft, active, archived)
- Proprietary toggle
- Summary textarea (editable inline)
- Primary audience — name displayed as link to segment detail view
- Linked source documents — list of attached source doc names as links, with "Link source" button to add more
- Graph link status (Methodology kind only) — "Linked to graph" with node ID, or "Link to graph" button

**Tabbed content pane:**

**Tab 1: Overview**
- Principles (editable inline textarea)
- Origin (editable inline textarea)
- Objectives (editable inline textarea)
- Problems solved (editable inline textarea)
- Contexts (editable inline textarea)
- Prior knowledge (editable inline textarea) — hidden for tool kind
- Resources (editable inline textarea) — hidden for tool kind
- Kind-specific detail fields (editable):
  - Methodology/process: delivery format, duration, repeatability, certification offered
  - Framework: dimensions (list), visual metaphor, application context
  - Tool/template: format, file URL, fill time, output format

**Tab 2: Components & Flow**
- Key components section:
  - Ordered list of component cards: title + description (rich, substantive — not bullet labels)
  - Add component button, inline edit, delete with confirm, drag to reorder (`sortOrder`)
  - Empty state: "No components yet. Add the core elements of this [kind]."
- Flow section:
  - Ordered list of flow step cards: step number + title + description + client experience + decision points
  - Add step button, inline edit, delete with confirm, drag to reorder
  - Empty state: "No flow steps yet. Describe how this [kind] works in practice."
  - Hidden for tool kind (tools don't have flow steps)

**Tab 3: Audience & VOC**
- Audience-VOC mapping display — shows which problems/desires/objections/beliefs this asset addresses, grouped by type, with audience segment name as header. Editable (can check/uncheck). Links back to audience segment.
- Same component/pattern as DNA-04 offers

**Tab 4: Value**
- Entity outcomes, grouped by kind with section headers (same pattern as DNA-04 offers Content tab):
  - Outcomes (with optional category badge: resources/skills/mindset/relationships/status)
  - Benefits (with optional category badge)
  - Advantages
  - Features
  - Bonuses (shows objection addressed + value statement)
  - FAQs (shows question + answer, with FAQ type badge)
- Each kind section: add button, inline edit on existing items, delete with confirm, drag to reorder (`sortOrder`)
- Count badges per section

**Tab 5: Extras**
- Visual prompt (editable inline textarea)
- FAQs from the `faqs` JSONB column (separate from entity outcome FAQs — these are asset-level FAQs, not value-proposition FAQs)
  - Add FAQ button, inline edit (question + answer + type badge), delete with confirm

### Autosave behaviour
Same pattern as DNA-03/DNA-04:
- All text fields: save on blur, 500ms debounce
- Subtle "Saved" indicator, fades after 2s
- Entity outcomes: saved immediately on add/edit. Deleted on confirm.
- JSONB fields (keyComponents, flow, detail, faqs): save the full array/object on any sub-field blur
- VOC mapping: save on check/uncheck

---

## Data model / fields

### `dna_knowledge_assets` table (exists — migration needed for new columns only)

All existing fields per schema in `01-design/schemas/dna-knowledge-assets.md`.

**New columns (migration required):**

| Field | Column | Type | Notes |
|---|---|---|---|
| VOC mapping | `voc_mapping` | jsonb, nullable | Same structure as DNA-04 offers — `{ audienceSegmentId, problems: [idx], desires: [idx], objections: [idx], beliefs: [idx] }` |
| Source document IDs | `source_document_ids` | uuid[], nullable | Soft refs to `src_source_documents.id` — documents used as context for creation/reference |

### `dna_entity_outcomes` table (exists — no changes needed)

All 6 kinds in scope: outcome, benefit, advantage, feature, bonus, faq. Linked via `knowledge_asset_id`. See entity-outcomes schema.

---

## Update behaviour

**Freely editable** — same as DNA-03/DNA-04. Fields editable at any time, `updated_at` refreshed on save. No version history.

---

## Relationships

### Knowledge graph (FalkorDB)
- **Methodology kind only** — manual "link to graph" creates a `Methodology` node with properties: `id`, `name`, `description` (from summary), `source: 'MANUAL'`, `postgresId` (links back), `kind`
- Relationships: `SUPPORTS` (Idea/Mission → Methodology), `INFORMED_BY` (Methodology → Idea/Mission/SourceDocument), `RELATES_TO` (Methodology ↔ Any)
- Other kinds do not get graph nodes in this build

### Postgres
- `dna_knowledge_assets.brand_id` → `brands.id` (cascade delete)
- `dna_knowledge_assets.target_audience_ids` → soft ref to `dna_audience_segments.id` (array, app-validated)
- `dna_knowledge_assets.related_offer_ids` → soft ref to `dna_offers.id` (array, app-validated)
- `dna_knowledge_assets.source_document_ids` → soft ref to `src_source_documents.id` (array, app-validated) — NEW
- `dna_knowledge_assets.voc_mapping` → indexes into primary audience segment's JSONB arrays — NEW
- `dna_entity_outcomes.knowledge_asset_id` → `dna_knowledge_assets.id` (cascade delete)
- Referenced by: `dna_offers.knowledge_asset_id` FK

---

## UI/UX notes

Template match: `dna-plural-item` pattern (template adaptation). Full layout spec: `01-design/wireframes/DNA-05-layout.md`

Key layout decisions:
- **Status badge in header** (template change) — inline with page title, colour-coded, clickable to change. Not in left panel. Propagates to all `dna-plural-item` instances.
- **Sources as a tab** — `SourceMaterialsTable` molecule in its own tab, not in left panel. Supports future "re-review with sources" action.
- **5 tabs:** Overview | Components & Flow | Audience & VOC | Value | Sources
- **Value tab merges entity outcomes + asset FAQs** — no separate Extras tab. Visual prompt field deferred (DB column exists, no UI).
- **Kind filter on card grid** — pill strip: All | Methodology | Process | Tool
- **Kind-conditional field visibility** — fields hidden/disabled per kind, not separate layouts

New molecules needed:
- `OrderedCardList` — ordered card lists with inline editing and reorder (Components & Flow tab)
- `SourceMaterialsTable` — reusable table of linked source documents
- `SourceDocPicker` — modal for selecting/uploading source documents
- `VOCMapping` — checklist for audience VOC mapping (shared with DNA-04)
- `StatusBadge` — clickable status indicator for page header (template-level)

Design system molecules to use: PageHeader, ContentPane, InlineField, SectionCard, SectionDivider, TabbedPane, plus existing shadcn components (Badge, Select, Checkbox, Button, Input, Textarea, Toggle).

---

## Edge cases

- **Empty state (no assets):** Full-page empty state — "No knowledge assets yet. Document your first methodology, process, or tool to get started." with "New asset" CTA.
- **No audience segments exist:** Creation modal's audience select is empty. Show message: "Create an audience segment first — knowledge assets must target a specific audience." Link to `/dna/audience-segments`.
- **No source documents exist:** Source doc selection phase shows empty state: "No source documents yet. Upload a file to get started." with inline upload option. User can also skip to chat-only path.
- **Primary audience archived after asset creation:** VOC mapping still displays (ghost reference pattern). Audience name shown with "(archived)" badge. VOC statements readable but mapping is read-only.
- **VOC statements change after mapping:** Same mitigation as DNA-04 — on load, validate indexes against current array lengths. Out-of-range indexes shown as "(statement removed)".
- **Archive with dependents:** Check if asset ID appears in `dna_offers.knowledge_asset_id` or `dna_offers.related_offer_ids`. If yes: warning modal listing affected offers. "Archive anyway" or "Cancel".
- **Cannot archive last active asset:** Disabled with tooltip if only one active asset exists. (Debatable — unlike segments, you might have zero assets. Review after first use.)
- **Long asset names:** Truncate in card view with ellipsis. Full name in sticky panel.
- **Entity outcomes ordering:** `sortOrder` on entity outcomes. New items get `max(sortOrder) + 1` within their kind group.
- **Kind change after creation:** Allow kind change via dropdown in sticky panel. On kind change: show/hide relevant fields. Don't delete existing data in kind-specific `detail` fields — just hide irrelevant ones. Warn if changing from methodology (may have graph node linked).
- **Graph link for non-methodology kinds:** "Link to graph" button only shown when kind = methodology. If kind changes away from methodology after linking, show warning but don't auto-unlink.
- **Minimum viable content validation:**
  - Methodology: name + kind + summary + ≥1 key component + ≥1 flow step
  - Process: name + kind + summary + ≥1 flow step
  - Tool: name + kind + summary + format (in detail JSONB)
  - Enforced as soft warning on status change to "active" — drafts can be incomplete.

---

## Out of scope (this build)

- Visual prompt → image generation (field exists, generation deferred)
- Offer comparison / side-by-side view of assets
- Asset duplication
- Multi-audience VOC mapping (only primary audience mapped)
- Drag-to-reorder for entity outcomes (use sequential add order; `sortOrder` field ready for future drag support)
- Graph node creation for non-methodology kinds
- Automatic graph linking (manual action only)
- Full-text search within source document content during creation (uses title/type filter only)

---

## Open questions / TBDs

None — all decisions resolved.

---

## Decisions log

- 2026-04-23: Brief written. Universal layout across all kinds — kind-irrelevant fields hidden/disabled rather than separate UX per kind. Keeps v1 simple and extensible.
- 2026-04-23: Five-phase creation flow: context path → source docs → metadata → VOC mapping → interlocutor. Source-doc-driven creation is the primary path; chat-only is the fallback.
- 2026-04-23: VOC mapping follows DNA-04 offers pattern exactly — `vocMapping` JSONB column with index-based refs into audience segment VOC arrays.
- 2026-04-23: Source document linking via `sourceDocumentIds` uuid[] soft ref column (same pattern as `targetAudienceIds`). No junction table.
- 2026-04-23: Graph linking is manual action, Methodology kind only (per ADR-002). Prevents seeding graph with incomplete/draft content.
- 2026-04-23: Minimum viable content varies by kind, enforced as soft warning on status change to "active" only — drafts can be incomplete.
- 2026-04-23: Entity outcomes (value gen) follows DNA-04 offers pattern — all 6 kinds, CRUD within a dedicated tab.
- 2026-04-23: "Cannot archive last active" rule flagged for review — unlike segments, zero active assets may be a valid state.
- 2026-04-23: Brief approved.
- 2026-04-23: Layout design approved. Status badge moved to header (template-level change). Sources moved from left panel to dedicated tab with SourceMaterialsTable molecule. Extras tab removed — visual prompt deferred, FAQs merged into Value tab. Five tabs: Overview, Components & Flow, Audience & VOC, Value, Sources. New molecules: OrderedCardList, SourceMaterialsTable, SourceDocPicker, VOCMapping, StatusBadge.
