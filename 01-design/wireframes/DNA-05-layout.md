# Layout spec: DNA-05 Knowledge Assets
Pattern: `dna-plural-item` (template adaptation)
Established from: DNA-03 (Audience Segments), extended by DNA-04 (Offers)
Last updated: 2026-04-23

---

## Template match

**Template:** `01-design/wireframes/templates/dna-plural-item-template.md`

### What's identical to the template:
- Two-column detail view: left sticky panel (~220px) + tabbed content pane
- Routing: `/dna/knowledge-assets`, `/dna/knowledge-assets/[id]`, `/dna/knowledge-assets/cards`
- Switcher pills for item navigation (2+ active items)
- Autosave on blur, 500ms debounce, "Saved" indicator
- Archive flow with dependency check
- Draft behaviour (badge, not selectable as reference until active)
- Card grid (3-col wide, 2-col medium)
- Loading states (Skeleton), toast system (Sonner)
- Avatar/thumbnail (80px left panel, 48px cards — grey circle with initial)

---

## Layout delta

### Route slug
`knowledge-assets`

### Page title
"Knowledge Assets" / "Methodologies, frameworks, processes, tools, and templates."

### Header area (revised from template)

```
[Page title] [Status badge ●]              [⊞ cards] [+ New asset] [⊗ Archive]
────────────────────────────────────────────────────────────────────────────────
[Asset A pill] [Asset B pill] [Asset C pill]
```

**Status badge** renders inline with title text — not in the left panel. Clickable, opens dropdown to change status.
- Draft: amber bg (`bg-amber-100 text-amber-800`), "Draft"
- Active: green bg (`bg-emerald-100 text-emerald-800`), "Active"
- Archived: muted bg (`bg-muted text-muted-foreground`), "Archived"

This is a **template-level change** — applies to all `dna-plural-item` instances.

### Card grid — additional elements

- Kind filter: pill strip below header — All | Methodology | Process | Tool (future kinds added as pills)
- Each card shows: name (bold, truncated), kind badge (colour-coded per kind), status badge, proprietary indicator (small lock icon if true), summary (3 lines, truncated)
- Kind badge colours (semantic tokens):
  - Methodology: `bg-primary/20 text-primary-foreground` (sage)
  - Process: `bg-accent text-accent-foreground` (muted)
  - Tool: `bg-secondary text-secondary-foreground`

### Left sticky panel fields

- Avatar/thumbnail (80px, grey placeholder with initial)
- Asset name (inline editable, bold) — label: "Name"
- Kind badge (editable — Select dropdown: methodology, process, tool)
- Proprietary toggle
- Summary textarea (inline editable) — label: "Summary"
- Primary audience — displayed as link (name) to segment detail view, with "Change" action. Required for VOC mapping.
- Graph link (Methodology kind only) — "Linked to graph" with node ID badge, or "Link to graph" button. Hidden when kind ≠ methodology.

Status badge is NOT in the left panel — it's in the header area.
Source documents are NOT in the left panel — they have their own tab.

### Content pane — 5 tabs

| Tab | Slug | Content |
|---|---|---|
| Overview | `overview` | Text fields + kind-specific detail fields |
| Components & Flow | `components-flow` | Structured JSONB editing — ordered card lists |
| Audience & VOC | `audience-voc` | VOC mapping checklist (same as DNA-04 offers) |
| Value | `value` | Entity outcomes CRUD + asset-level FAQs |
| Sources | `sources` | SourceMaterialsTable — linked source documents |

### Tab 1: Overview

Mini-nav sections:
- *Foundations* — `principles` (textarea, icon: Lightbulb), `origin` (textarea, icon: History)
- *Purpose* — `objectives` (textarea, icon: Target), `problemsSolved` (textarea, icon: CircleHelp), `contexts` (textarea, icon: MapPin)
- *Requirements* — `priorKnowledge` (textarea, icon: GraduationCap), `resources` (textarea, icon: Wrench). Both hidden when kind = tool.
- *Details* — kind-specific fields from `detail` JSONB:
  - Methodology/process: `deliveryFormat` (text, icon: Presentation), `duration` (text, icon: Clock), `repeatability` (text, icon: RefreshCw), `certificationOffered` (toggle, icon: Award)
  - Framework: `dimensions` (tag list/chips, icon: Layers), `visualMetaphor` (text, icon: Eye), `applicationContext` (textarea, icon: Compass)
  - Tool/template: `format` (text, icon: FileType), `fileUrl` (text/URL, icon: Link), `fillTime` (text, icon: Clock), `outputFormat` (text, icon: FileOutput)

### Tab 2: Components & Flow

Two sections, each with ordered card lists:

**Key Components section:**
- Ordered list of cards. Each card: drag handle | title (bold, editable inline) | description (textarea, editable inline) | delete button (icon, confirm)
- "Add component" button at bottom → inserts new card with empty fields, in edit mode
- Reorder via drag (or up/down arrow buttons if drag is out of scope)
- Empty state: "No components yet. Add the core elements of this [kind]."

**Flow section:**
- Ordered list of cards. Each card: step number (auto) | title (bold, editable inline) | description (textarea) | client experience (textarea) | decision points (textarea) | delete button
- "Add step" button at bottom
- Same reorder pattern as components
- Empty state: "No flow steps yet. Describe how this [kind] works in practice."
- Entire section hidden when kind = tool

### Tab 3: Audience & VOC

- Same VOC mapping component as DNA-04 offers
- Header: audience segment name as section title, link to segment detail view
- Four grouped checklists: Problems, Desires, Objections, Beliefs
- Each statement shown with category badge, checkbox
- Check/uncheck saves immediately (no debounce)
- Empty state (no audience selected): "Select a primary audience in the left panel to map VOC statements."
- Empty state (audience has no VOC): "This audience segment has no VOC statements yet. Add them in the [segment name] detail view."

### Tab 4: Value (merged — entity outcomes + asset FAQs)

**Entity outcomes** grouped by kind with section headers:
- Outcomes (with optional category badge: resources/skills/mindset/relationships/status)
- Benefits (with optional category badge)
- Advantages
- Features
- Bonuses (shows objection addressed + value statement)
- FAQ outcomes (shows question + answer, with FAQ type badge)
- Each kind section: add button, inline edit, delete with confirm
- Count badges per section
- `sortOrder` managed by add order (new items at bottom)

**Asset FAQs** — below entity outcomes, separated by section divider:
- Section header: "Frequently Asked Questions"
- FAQs from `faqs` JSONB column
- Each: question (editable) + answer (editable) + type badge (select: differentiation, logistics, psychological, application)
- Add FAQ button, delete with confirm
- Label distinction from FAQ outcomes: entity outcome FAQs are value-proposition items; asset FAQs are general Q&A about the asset itself

### Tab 5: Sources

- `SourceMaterialsTable` molecule — table of linked source documents
- Columns: title, type badge, date, file size, actions (view, unlink)
- "Link source" button → opens `SourceDocPicker` (search existing + upload new)
- "Unlink" removes from `sourceDocumentIds` array (doesn't delete the source doc)
- Row click → expands to show extracted text preview (if available)
- Future: "Re-review with sources" action — triggers LLM to re-read linked sources and suggest updates. Out of scope for v1 but tab structure supports it.
- Empty state: "No source documents linked. Link existing sources or upload new ones to provide context for this asset."

### Creation modal — five-phase flow

**Phase 1 — Context path:**
- Two cards: "Add source documents" (icon: FileText, primary CTA) | "Just answer questions" (icon: MessageSquare, secondary)
- Footer: Cancel

**Phase 2 — Source document selection** (skip if chat-only):
- Searchable list of existing source documents, filterable by type
- Multi-select with checkboxes
- Selected docs shown as chips below search
- "Upload new" button → inline file upload (creates `src_source_documents` record)
- Footer: Back | Next (disabled until ≥1 doc selected)
- Step indicator: "Step 2 of 5"

**Phase 3 — Key metadata:**
- Name (required, text input)
- Kind (required, select: methodology, process, tool)
- Status (default: draft, select)
- Proprietary (default: true, toggle)
- Primary audience (required, select from existing audience segments)
- Footer: Back | Next

**Phase 4 — VOC mapping:**
- Loads selected audience's VOC statements
- Four grouped checklists (same as DNA-04 offers Phase 2)
- Soft warning if <1 problem and <1 desire checked
- Footer: Back | Next

**Phase 5 — Interlocutor generation:**
- Summary of what will be generated (name, kind, source docs count, audience, VOC count)
- "Generate" button (primary) — sends to LLM
- "Save as draft" (text link) — saves metadata + VOC mapping only, no generation
- Generating state: spinner + "Generating your [kind]... this may take a minute" + Cancel
- On complete: save all fields + entity outcomes → redirect to detail view

### Empty states

- List (no assets): "No knowledge assets yet. Document your first methodology, process, or tool to get started." + "New asset" CTA
- No audience segments: "Create an audience segment first — knowledge assets must target a specific audience." + link to `/dna/audience-segments`
- No source docs (in creation modal): "No source documents yet. Upload a file to get started." + upload button

### Archive dependency targets

- `dna_offers.knowledge_asset_id` — FK, direct reference
- `dna_offers.related_offer_ids` — soft ref array

### Status values

`draft | active | archived`

### Minimum viable content (soft validation on status → active)

- Methodology: name + kind + summary + ≥1 key component + ≥1 flow step
- Process: name + kind + summary + ≥1 flow step
- Tool: name + kind + summary + format (in detail JSONB)
- Shown as amber warning banner at top of detail view when conditions not met and status = active

---

## New molecules required

### 1. OrderedCardList
- **File:** `components/ordered-card-list.tsx`
- **Purpose:** Ordered list of cards with inline editing, add/delete, and reorder. Used for key components and flow steps in knowledge assets.
- **Props:** `items`, `onAdd`, `onUpdate`, `onDelete`, `onReorder`, `fields` (field definitions per card), `emptyMessage`
- **New pattern** — not in DNA-03 or DNA-04.

### 2. SourceMaterialsTable
- **File:** `components/source-materials-table.tsx`
- **Purpose:** Reusable table of source documents filtered by context. Used in knowledge assets Sources tab, and later in offers, research, missions, etc.
- **Props:** `sourceDocumentIds: string[]`, `brandId: string`, `onLink: (ids: string[]) => void`, `onUnlink: (id: string) => void`, `showLinkButton?: boolean`
- **Renders:** shadcn `Table` with type badges, date formatting, file size display
- **Includes:** inline "Link source" button that opens `SourceDocPicker`

### 3. SourceDocPicker
- **File:** `components/source-doc-picker.tsx`
- **Purpose:** Modal/popover for selecting existing source documents + uploading new ones.
- **Props:** `brandId`, `selected`, `onSelect`, `onUpload`, `excludeIds?`
- **Used by:** SourceMaterialsTable (link action), creation modal Phase 2

### 4. VOCMapping
- **File:** `components/voc-mapping.tsx`
- **Purpose:** Checklist component for audience VOC mapping. Shared between knowledge assets and offers.
- **Props:** `audienceSegment`, `mapping`, `onToggle`
- **If DNA-04 builds first**, this molecule already exists and we reuse it.

### 5. StatusBadge (header variant)
- **File:** update existing Badge usage or new `components/status-badge.tsx`
- **Purpose:** Clickable status indicator in page header. Colour-coded per status value.
- **Props:** `status`, `onChange`, `options`
- **Template-level component** — used by all `dna-plural-item` instances.
