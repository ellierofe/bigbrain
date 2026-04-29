# Session log — 2026-04-24 — DNA-05 Knowledge Assets full build
Session ID: 2026-04-24-dna05-knowledge-assets-build-q3p

## What we worked on

DNA-05: Plural DNA elements — Knowledge Assets. Full feature build end-to-end: brief → layout → implementation → testing → bug fixes → prompt refinement.

## What was done

### Brief and layout (approved)
- `01-design/briefs/DNA-05-knowledge-assets.md` — five-phase creation flow, source-doc-driven, VOC mapping, entity outcomes, kind-conditional UI
- `01-design/wireframes/DNA-05-layout.md` — full layout spec with 5 tabs (Overview, Components & Flow, Audience & VOC, Value, Sources)
- Template-level change captured: status badge moved from left panel to header (`01-design/wireframes/templates/dna-plural-item-template.md` updated)

### Database
- Migration `0016_wakeful_sleeper.sql` — added `voc_mapping` (jsonb) and `source_document_ids` (uuid[]) columns to `dna_knowledge_assets`
- Schema doc `01-design/schemas/dna-knowledge-assets.md` already approved; no changes needed

### Backend layer
- `02-app/lib/types/knowledge-assets.ts` — full type definitions (kinds, statuses, VocMapping, KeyComponent, FlowStep, AssetFaq, kind-specific detail types)
- `02-app/lib/types/generation-knowledge-asset.ts` — zod schemas for `generateObject` with `.min(8/8/6)` enforcement on outcomes/benefits/advantages
- `02-app/lib/db/queries/knowledge-assets.ts` — list, getById, count, getDependents, updateField, updateJsonField, create, archive, activate, findNext
- `02-app/lib/db/queries/entity-outcomes.ts` — shared CRUD for entity outcomes (used by knowledge assets and future DNA-04 offers)
- `02-app/app/actions/knowledge-assets.ts` — server actions for autosave, create, archive, generate-from-draft, link-to-graph
- `02-app/app/actions/entity-outcomes.ts` — shared server actions for outcomes CRUD

### Generation layer
- `02-app/lib/llm/prompts/knowledge-asset.ts` — system + user message builders adapted from legacy methodology prompt. Includes detailed guidance for outcomes (≥8), benefits (≥8), advantages (≥6) with consideration questions per type
- `02-app/lib/generation/knowledge-asset.ts` — evaluate + generate functions using Gemini Pro
- `02-app/app/api/generate/knowledge-asset/route.ts` — POST with evaluate/generate modes; resolves VOC indexes to statement text; loads source doc extracted text; saves all three outcome arrays back to `dna_entity_outcomes`

### New molecules (9 total — all registered + spec'd)
- `StatusBadge` — clickable colour-coded status pill in page header (template-level)
- `OrderedCardList` — ordered editable cards with add/delete/reorder (used for components and flow)
- `SourceMaterialsTable` — linked source docs table with unlink + expandable text preview
- `SourceDocPicker` — modal for searching/selecting/uploading source docs
- `VocMapping` — checklist for audience VOC mapping (shared with future DNA-04)
- `EntityOutcomesPanel` — grouped CRUD for 6 outcome kinds (shared with future DNA-04)
- `KnowledgeAssetSwitcher` — pill strip switcher (later replaced/refactored to use shared `ItemSwitcher`)
- `CreateAssetModal` — 5-phase creation flow (path → sources → metadata → VOC → generate)
- `ArchiveAssetModal` — archive confirmation with dependency check

### Page routes
- `02-app/app/(dashboard)/dna/knowledge-assets/page.tsx` — index page with `PageChrome` + `ContentPane` + `EmptyState` pattern (matching Client Projects)
- `02-app/app/(dashboard)/dna/knowledge-assets/[id]/page.tsx` — detail view server component
- `02-app/app/(dashboard)/dna/knowledge-assets/cards/page.tsx` — card grid with kind filter pills + archive toggle
- `02-app/components/knowledge-asset-detail-view.tsx` — main client component (left panel + 5 tabs + creation/archive modals)
- `02-app/app/(dashboard)/dna/knowledge-assets/create-asset-button-root.tsx` — wrapper for empty state CTA

### Source document upload (UX-09 partial — to unblock DNA-05 testing)
- `POST /api/sources` — file upload via Vercel Blob, creates `src_source_documents` record, infers type from mime
- Upload button + multi-file support added to `/inputs/sources` filter bar
- Same upload wired into `SourceDocPicker` ("Upload new" auto-selects after upload)

### Bug fixes during testing
1. **Empty state had no CTA** — added `CreateAssetButtonRoot` to render the create button on empty state
2. **Modal width too narrow** — bumped CreateAssetModal and SourceDocPicker from `lg` to `xl`
3. **No way to generate from draft** — added "Generate" button in header (Sparkles icon) that uses asset's existing metadata
4. **Source doc linking didn't update UI** — refactored `SourceMaterialsTable` to track local IDs instead of relying on prop revalidation
5. **OrderedCardList edits/deletes/reorder broken** — fixed render-time sync that was wiping local edits on every keystroke; replaced with `useEffect` + ref pattern
6. **VOC checkboxes couldn't uncheck** — `currentMapping` was derived from stale prop on every render; added local state with `useEffect` sync
7. **FAQ delete used `✕` instead of trash icon** — replaced with `Trash2` for consistency with other panels
8. **Generation prompt didn't enforce minimum outcomes** — split single `entityOutcomes` array into three separate zod arrays (`outcomes`, `benefits`, `advantages`) each with `.min()` enforcement; updated API route to map back into `dna_entity_outcomes` table
9. **Graph linking removed from UI** — server action retained for future use; deferred per session priorities

### Documentation
- DNA-03 backlog entry annotated: "Status badge needs moving from left panel to header (template-level change from DNA-05 layout design, 2026-04-23). Small refactor — next time this page is touched."

## Decisions made

- **Status badge inline with title (template-level)** — applies to all `dna-plural-item` instances. Replaces the previous left-panel placement. Rationale: status is a header-level concern, always visible, surfaces draft items at a glance.
- **5 tabs, not 4 or 6** — Sources moved out of left panel into its own tab to support a future "re-review with sources" action; Extras tab dropped (visual prompt deferred, asset FAQs merged into Value tab).
- **Universal kind layout** — kind-irrelevant fields hidden/disabled rather than separate UX per kind. Simpler to maintain; flow section hides for tools, requirements section hides for tools.
- **Source doc linking via uuid[] soft ref** — same pattern as `targetAudienceIds`, no junction table. Lightweight.
- **Graph linking is manual, methodology-only** — per ADR-002. Deferred from UI in this build.
- **Generation prompt: split outcomes into three separate arrays with zod min lengths** — single discriminated array with hint was too soft; LLM ignored "at least 8/8/6" guidance. Splitting forces structured output validation to enforce minimums.
- **Source doc upload added ad-hoc to unblock testing** — UX-09 raised in backlog to track proper consolidation later.
- **"Cannot archive last active" rule kept as-is** — flagged for review post-use; debatable for knowledge assets where zero active may be valid.

## What came up that wasn't planned

- **Source doc upload was a hard dependency** — current `/inputs/sources` page had no upload mechanism. Added quick file upload to unblock; raised UX-09 for proper consolidation pass.
- **Empty state needed PageChrome + ContentPane wrapper** — initial implementation rendered EmptyState bare on background; matched to Client Projects pattern for visual consistency.
- **Generate-from-draft was missing** — initial scope put generation only in the creation modal; added universal Generate button in detail view header (raised UX-10 to apply this pattern across all draft DNA items).
- **Tabs scrolling pattern from DNA-07 (Platforms) needs propagation** — raised UX-11.

## Backlog status changes

- **DNA-05: Knowledge Assets** — `planned` → `in-progress` → ready to mark `done` (full feature working end-to-end including generation)
- **UX-09: Inputs/Sources consolidation** — new entry added (medium priority)
- **UX-10: Universal "Generate" action for draft plural DNA items** — new entry added (small)
- **UX-11: Fixed tab headings and scrollable content pane** — new entry added (small)
- **DNA-03: Audience segments** — annotated with status-badge refactor note (no status change; refactor deferred to next touch)

## What's next

- **Mark DNA-05 done** — feature is functional end-to-end with all bugs fixed
- **DNA-04: Offers** — already has draft brief; can now reuse `VOCMapping`, `EntityOutcomesPanel`, `OrderedCardList`, `StatusBadge` molecules
- **UX-10** — apply universal generate-from-draft pattern to audience segments and other plural DNA types (small)
- **UX-11** — apply fixed-tab/scroll pattern across all DNA detail views (small)
- **DNA-03 status badge refactor** — when next touching audience segments, move status badge from left panel to header

## Context for future sessions

- Generation uses **Gemini Pro** (`MODELS.geminiPro`), consistent with audience segment generation. The session noted user added `generateObjectWithFallback` wrapper for resilience after this session — see updated `lib/generation/knowledge-asset.ts`.
- The `dna_entity_outcomes` table is shared between knowledge assets and offers via FKs. The `EntityOutcomesPanel` molecule is parameterised by `parentType: 'knowledgeAsset' | 'offer'` so DNA-04 can reuse it directly.
- VOC mapping uses **index-based references** into the audience segment's JSONB arrays. UX-07 in backlog covers the resilience upgrade (text snapshots) for when statements get reordered/deleted.
- The `SourceDocPicker` supports inline upload — used both in `/inputs/sources` filter bar and inside the picker modal during knowledge asset creation.
- Linter/co-author updates between turns introduced new shared molecules (`ActionButton`, `ActionMenu`, `FloatingMenu`, `CheckboxField`, `InlineCellSelect`, `SelectField`, `TypeBadge`, `ItemSwitcher`) — these are now used throughout the knowledge assets feature. The status badge implementation now uses semantic state tokens (`success-bg`, `warning-bg`, etc.) instead of hardcoded `amber-100/emerald-100` classes.
- The build had a **pre-existing error** in `create-mission-modal.tsx` (missing `@/components/ui/label` import) — not related to DNA-05; flagged but not fixed.
