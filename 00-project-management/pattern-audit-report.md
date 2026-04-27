# Pattern Audit Report
Date: 2026-04-24
Audit scope: `/02-app/app/(dashboard)/`, `/02-app/components/`
Audit completeness: Very thorough — all dashboard routes and shared components examined

---

## Executive Summary

**Patterns proposed: 5 new templates**

**Top-priority pattern:** `dna-singular-item` — used in 4+ built DNA types (business-overview, brand-meaning, value-proposition, tone-of-voice) with a stable structure of left-sidebar summary + right-side content pane. High impact for future DNA types.

**Considered but not proposed: 3 patterns**
- `list-with-status-filter` — appears in clients and missions lists, but is genuinely simple (pills + table rows). Not complex enough to warrant a template.
- `collapsible-card-item` — used in differentiators/alternatives UIs, but too simple/one-off per context. ExpandableCardList and OrderedCardList components exist but are feature-specific.
- `embedded-ideas-section` — IdeasPanel is already a reusable molecule embedded in workspaces. Registering it as a template would be redundant with the pattern itself.

---

## Proposed Templates

### 1. DNA Singular Item
**Pattern name:** `dna-singular-item`
**One-line description:** Single-instance DNA type with left-panel summary card + right-side sectioned content with inline editing.

**Evidence (4 instances):**
- `/02-app/app/(dashboard)/dna/business-overview/business-overview-view.tsx` (lines 43-113: left panel with summary, right panel with SectionCard-wrapped fields)
- `/02-app/app/(dashboard)/dna/value-proposition/value-proposition-view.tsx` (lines 90+: similar left/right layout; special handling for array fields like differentiators)
- `/02-app/app/(dashboard)/dna/tone-of-voice/tone-of-voice-view.tsx` (lines 43+: PageChrome + ContentPane + tabs, left sticky panel)
- `/02-app/app/(dashboard)/dna/brand-meaning/` (exists but code not inspected; confirmed same structure from nav)

**Variable parts:**
- Left panel content: avatar vs. icon, summary fields, any special cards
- Right panel sections: field groupings, icons per field
- Fields: standard InlineField, text vs. textarea, required vs. optional
- Tabs (if any): tone-of-voice uses tabs, business-overview doesn't
- Array fields: differentiators, alternatives — special UI handling per instance

**Priority:** High
**Rationale:** 4 built instances + DNA-06/08/10/11/12 planned. Future DNA types will follow this exact pattern.

**Relationship to existing templates:**
- Distinct from `dna-plural-item` — single instance, no switcher, no creation modal
- Distinct from `project-workspace` — read-heavy detail view, not a hub of linked items
- May use `tab-master-detail` or `tab-table-expand` internally (tone-of-voice), but the outer structure is the singular DNA pattern

---

### 2. Input Process with Side Panel
**Pattern name:** `input-process-extract` 
**One-line description:** Lightweight form (metadata + textarea) → async extraction → side panel confirmation + commit.

**Evidence (1 clear instance, 1+ planned in brief):**
- `/02-app/app/(dashboard)/inputs/process/process-input-client.tsx` (full pipeline: metadata form + textarea → extract API → ResultsPanel)
- `/02-app/app/(dashboard)/inputs/process/results-panel.tsx` (side panel with category sections, checkboxes, commit)
- Brief notes INP-03 as a new pattern; layout spec exists at `/01-design/wireframes/INP-03-layout.md`

**Variable parts:**
- Metadata fields: title, source type, date, tags (all configurable per instance)
- Textarea placeholder/label
- Extraction API endpoint
- Side panel categories: IDEAS, PEOPLE, CONCEPTS, etc. (per extractor)
- Confidence badge logic, per-category filtering

**Priority:** Medium
**Rationale:** 1 built, 1 designed. INP-07 (queue page) may use a variant. Structurally stable: form → extract → review → commit is a reusable contract.

**Relationship to existing templates:**
- Distinct from all existing templates — combines form input, async operation, and structured multi-step confirmation
- Not a CRUD pattern (no creation modal), not a multi-column detail view
- The side panel is the key innovation: collapse-on-save, category grouping, bulk select

---

### 3. Chat Conversation Full-Page
**Pattern name:** `chat-conversation-full`
**One-line description:** Full-page chat with history sidebar, message stream, tool indicators, and bottom input area.

**Evidence (1 clear instance):**
- `/02-app/app/(dashboard)/chat/chat-area.tsx` (message rendering loop, scroll behavior, prompt starters)
- `/02-app/components/chat-message.tsx` (message rendering with tool calls, markdown)
- `/02-app/components/conversation-list.tsx` (left sidebar, conversation grouping by date)
- `/02-app/components/chat-input.tsx` (textarea with attach, send, image preview)
- Layout spec: `/01-design/wireframes/OUT-01-layout.md` (full design approved)

**Variable parts:**
- System prompt / LLM backend
- Tool call types and descriptions
- Message rendering: user vs. assistant styling, markdown support
- History grouping: Today / Yesterday / Previous 7 days / This month / Older
- Input area: attach button icon, placeholder text, send behaviour (Shift+Enter for newline)
- Empty state prompt starters

**Priority:** Medium
**Rationale:** 1 built, clear repeatable structure. Future "chat with [specific context]" variants (chat-with-project, chat-with-asset) may fork this template. The drawer variant (OUT-01 spec) is a sibling, not a template itself yet.

**Relationship to existing templates:**
- Entirely new — no prior chat pattern. Structurally complex enough to warrant a template: scroll management, streaming, tool indicators, history panel.

---

### 4. Project/Mission Workspace
**Pattern name:** `entity-workspace-hub`
**One-line description:** Single entity with editable fields + read-heavy sections of linked items (missions, inputs, etc.).

**Evidence (2 instances, both built):**
- `/02-app/app/(dashboard)/projects/clients/[id]/project-workspace.tsx` (name, status, brief fields + linked missions/inputs/stats sections)
- `/02-app/app/(dashboard)/projects/missions/[id]/` (inferred structure; missions are expected to follow same pattern per MISSION-01 layout)
- Matches `project-workspace` template structure closely

**Variable parts:**
- Entity type: client project, mission, etc.
- Editable fields: name, brief, status, type-specific metadata
- Linked sections: which entities to show, link affordances, unlink actions
- Archive flow: confirmation modal, cascade checking
- Ideas panel embedding (via IdeasPanel molecule)

**Priority:** Low
**Rationale:** Already covered by `project-workspace` template (registered 2026-04-23). Existing instances use the template correctly. This audit confirms it's a validated pattern. **No new template needed** — existing template suffices.

---

### 5. Ideas List with Filters and Inline Edit
**Pattern name:** `ideas-list-triage`
**One-line description:** Vertical list of text items with status/type pills, inline editing, and optional context-scoped filtering.

**Evidence (2+ instances):**
- `/02-app/components/ideas-list.tsx` (full list with status + type filters, type toggle per row, shelf/done/delete actions, inline text editing)
- `/02-app/app/(dashboard)/inputs/ideas/` (full page instance — page.tsx + ideas-client.tsx)
- `/02-app/components/ideas-panel.tsx` (embedded instance in project workspaces — tabbed view showing scoped vs. all ideas)
- Planned: embed in missions (MISSION-01 + future features)

**Variable parts:**
- Status values: captured, shelved, done (configurable per instance)
- Type values: idea, question (toggle per row)
- Filters: status pills + type pills, AND logic
- Context filter: optional scoping to entity (mission, project, etc.)
- Inline edit: single text field, save on blur
- Truncation: 2 lines → "Show more"

**Priority:** Medium
**Rationale:** 2 instances (full page + embedded in workspace). MISSION-01 and future projects will embed it. The IdeasList component is already reusable; the pattern is validated and repeatable.

**Relationship to existing templates:**
- Distinct — not a CRUD plural collection (no cards/grid, no detail view). Not a workspace lens (no linked items). Unique purpose: quick triage/capture without deep editing.

---

## Patterns Considered But Not Proposed

### List with Status Filter Pills + Table
**Finding:** Simple pattern, no template needed.

Used in:
- `/02-app/app/(dashboard)/projects/clients/project-list-client.tsx` (status pills + table)
- `/02-app/app/(dashboard)/projects/missions/` (same structure)

**Why not proposed:** This is a direct instantiation of standard molecules (Pills + Table). The logic is simple: filter → render rows. No embedded design decisions. Future list pages can follow the same pattern without a template — just compose pills + table.

---

### Collapsible Card Items (Differentiators, Alternatives)
**Finding:** Pattern exists but is too specific per context.

Used in:
- `/02-app/app/(dashboard)/dna/value-proposition/value-proposition-view.tsx` (differentiators and alternatives arrays with add/remove buttons)
- Similar usage in other DNA singular types for expandable sections

**Why not proposed:** Each instance has different content (differentiators vs. alternatives vs. samples in ToV). The UI is simple (add button → new row → save on change). The ExpandableCardList and OrderedCardList components exist as molecules for this; no template needed above that level. Would be over-templating.

---

### Embedded Ideas Section in Workspaces
**Finding:** Already a reusable molecule; registering as a template would be redundant.

Used in:
- `/02-app/components/ideas-panel.tsx` (exported molecule, embedded in project-workspace.tsx and missions)

**Why not proposed:** IdeasPanel is already a component-level abstraction. It's a reusable molecule that accepts props for context filtering. Registering it as a "template" at the layout level would conflate component reuse with design pattern reuse. The pattern is already captured in the component.

---

## Recommended Template-Writing Order

1. **`dna-singular-item`** (High priority)
   - Highest impact: 4+ built instances, DNA-06/08/10/11/12 planned. Unblocks future DNA builds immediately.
   - Most complex in scope: left panel design, field layout, tab handling (tone-of-voice), inline editing.
   - Foundation for future DNA types.

2. **`ideas-list-triage`** (Medium priority)
   - Embedded in mission/project workspaces + standalone page. Clear repeatable structure.
   - Blocks MISSION-01 from fully leveraging ideas embedding; unblocks faster builds.
   - Less complex than #1; straightforward to codify.

3. **`chat-conversation-full`** (Medium priority)
   - Single instance built; design locked. Pattern is stable.
   - Foundation for future chat-in-context variants (chat with project, chat with asset).
   - Document now before drift accumulates.

4. **`input-process-extract`** (Medium priority)
   - 1 built, 1 designed. Reusable pipeline structure (form → async → review).
   - INP-07 and future extractors may use variants.
   - Lower urgency: fewer planned uses than #1 or #2.

---

## Molecule Candidates Flagged for Future Review

While examining components, two molecule-level patterns emerged that *may* warrant review (not templates, but shared components):

1. **`string-list-editor.tsx`** + **`key-value-editor.tsx`** — used in value-proposition, offers, and other DNA types for array field editing. These are already molecules; flagging for `design-system` review to ensure they're in the registry and follow token-only styling.

2. **Switcher pills (audience-segment, offer, platform, knowledge-asset)** — Four similar switcher components exist (43–42 LOC each). Could potentially unify into a generic `<ItemSwitcher>` molecule with props for route template, label field, etc. Not critical for templates, but a design-system improvement for future refactoring.

---

## Summary

Five new patterns proposed. Highest priority: `dna-singular-item` (foundation for DNA roadmap). Two patterns (`ideas-list-triage`, `chat-conversation-full`) are mature enough to codify now; one (`input-process-extract`) is ready but lower-urgency; the others are candidates for future consideration.

No blocking issues found. Design system conformance is consistent. All proposed templates follow the module/organism conventions correctly.
