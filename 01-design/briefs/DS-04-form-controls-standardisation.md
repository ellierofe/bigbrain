# DS-04: Form controls standardisation
Feature ID: DS-04
Status: complete
Last updated: 2026-04-27
Renamed: from UX-10 to DS-04 on 2026-04-25 — this is foundation work in the DS series, not UX polish. UX-10 in the backlog is taken (Universal Generate).

## Summary

Audit and standardise form controls (selects, inputs, textareas, checkboxes, sliders) across the BigBrain app. Currently, only `InlineField` (input + textarea variants) is governed by the design system — every other control is composed inline in organisms with ad-hoc Tailwind styling. The result is visible inconsistency across DNA pages, modals, and tables: ~9 files have hand-styled native `<select>` elements, multiple modals use shadcn Select with bespoke trigger styling, sliders are styled inline, checkboxes are written by hand. This brief scopes the work to introduce field-control molecules covering each gap and migrate existing usages to them.

Triggered by the DNA-09 Applications tab build (2026-04-25), which needed a `formatType` select field that matched InlineField's visual treatment. No molecule existed; investigation revealed the broader pattern.

## Why this matters

- **Visual consistency** is design rule #1 in `01-design/design-system.md` — every form has fields, but every form looks slightly different
- **Behavioural consistency** — `InlineField` has a debounced autosave contract that select/checkbox/slider uses don't follow. This means the user sees three different save patterns within one page (e.g. ToV: text fields autosave silently, sliders save on mouseUp, vocabulary table saves on blur, no select fields yet)
- **Velocity** — every new feature reinvents the same controls. The DNA-09 build was paused mid-stream because no SelectField existed; that pattern will repeat for every future feature

## Use cases

Each control molecule covers two contexts:
- **Field context** (form-style): floating label patch, icon prefix, always-visible border, focus-state colour shift, autosave feedback. Sized for forms and detail views. Matches `InlineField` visual contract.
- **Cell context** (table-row inline editor): compact, no floating label, fits inside a table cell. Used by VocTable, EntityOutcomesPanel, etc.

Not every control needs both — but the brief should call out which contexts each control needs.

## User journey

Not user-facing. This is internal consistency work. Net effect for the user: every form control across the app looks and behaves the same way; saves feel identical regardless of control type.

## Inventory of current usage

Audit performed 2026-04-25. Counts approximate — full audit during implementation.

### Select / dropdown controls

**Native `<select>` with hand-styled Tailwind:**
- `02-app/components/voc-table.tsx:279` — category dropdown in VOC cell editor
- `02-app/components/entity-outcomes-panel.tsx:143` — faqType dropdown
- `02-app/components/entity-outcomes-panel.tsx:207` — category dropdown
- `02-app/components/create-asset-modal.tsx` — kind / audience selects in modal
- `02-app/components/create-offer-modal.tsx` — type / audience selects in modal
- `02-app/components/offer-detail-view.tsx` — likely type/audience selects (verify)
- `02-app/components/knowledge-asset-detail-view.tsx` — likely kind/audience selects (verify)
- `02-app/components/source-doc-picker.tsx` — type filter
- `02-app/app/(dashboard)/inputs/process/process-input-client.tsx` — category select
- `02-app/app/(dashboard)/inputs/process/category-section.tsx` — category cell select

**shadcn `Select` composed inline:**
- `02-app/app/(dashboard)/dna/platforms/[id]/platform-detail-view.tsx:180` — JOURNEY_STAGES select (field context)
- `02-app/components/create-platform-modal.tsx:285` — PLATFORM_TYPES select (modal field context)

### Text inputs

**Native `<input type="text">` outside InlineField:**
- `02-app/components/voc-mapping.tsx`
- `02-app/components/create-asset-modal.tsx`
- `02-app/components/ordered-card-list.tsx`
- `02-app/components/entity-outcomes-panel.tsx`
- `02-app/components/create-offer-modal.tsx`
- `02-app/components/knowledge-asset-detail-view.tsx`
- `02-app/components/ideas-list.tsx`
- `02-app/components/chat-input.tsx` — large autosizing textarea, special case
- `02-app/components/source-doc-picker.tsx`
- `02-app/app/(dashboard)/projects/clients/[id]/project-workspace.tsx`
- `02-app/app/(dashboard)/projects/missions/[id]/mission-workspace.tsx`
- `02-app/app/(dashboard)/dna/brand-meaning/brand-meaning-view.tsx`
- `02-app/app/(dashboard)/dna/value-proposition/value-proposition-view.tsx`
- `02-app/app/(dashboard)/dna/tone-of-voice/tone-of-voice-view.tsx` — vocabulary table cells, dimension descriptions
- `02-app/app/(dashboard)/inputs/sources/sources-client.tsx`
- `02-app/app/(dashboard)/inputs/process/process-input-client.tsx`
- `02-app/app/(dashboard)/inputs/process/category-section.tsx`

Many of these are legitimate cell-level inputs (table rows, inline editors). Some are likely InlineField-eligible. Audit needed per file.

### Textareas

**Native `<textarea>` outside InlineField:**
- `02-app/components/voc-table.tsx`
- `02-app/components/create-asset-modal.tsx`
- `02-app/components/ordered-card-list.tsx`
- `02-app/components/entity-outcomes-panel.tsx`
- `02-app/components/ideas-list.tsx`
- `02-app/components/create-offer-modal.tsx`
- `02-app/components/knowledge-asset-detail-view.tsx`
- `02-app/components/chat-input.tsx`
- `02-app/app/(dashboard)/dna/brand-meaning/brand-meaning-view.tsx`
- `02-app/app/(dashboard)/dna/value-proposition/value-proposition-view.tsx`
- `02-app/app/(dashboard)/dna/tone-of-voice/tone-of-voice-view.tsx`
- `02-app/app/(dashboard)/inputs/process/category-section.tsx`

### Checkboxes

**Native `<input type="checkbox">`:**
- `02-app/components/voc-mapping.tsx` — VOC checklists
- `02-app/components/create-asset-modal.tsx` — VOC mapping in creation flow
- `02-app/components/create-offer-modal.tsx` — VOC mapping in creation flow
- `02-app/components/source-doc-picker.tsx` — multi-select doc list

shadcn `Checkbox` exists at `components/ui/checkbox.tsx` but isn't used.

### Sliders

**Native `<input type="range">`:**
- `02-app/app/(dashboard)/dna/tone-of-voice/tone-of-voice-view.tsx` — base ToV dimension scores (4 sliders)
- DNA-09 Applications tab will add 4 more (delta sliders, range -50 to +50)

shadcn doesn't ship a Slider by default in this project (verify during build). May need to add it.

## Proposed molecules

Names tentative — finalise during build.

### `SelectField` — field-context select
- Visual parity with `InlineField` (always-visible border, floating label patch, icon prefix, focus-state colour shift)
- Built on shadcn `Select` atom
- Saves immediately on change
- Props: `label`, `icon`, `value`, `options: { value: string; label: string }[]`, `onSave`, `placeholder?`, `labelBg?`, `className?`
- **Used by:** DNA-09 Applications detail (formatType), platform-detail-view (journey stage), create-platform-modal, all DNA modals where a dropdown sits in a labelled form

### `InlineCellSelect` — cell-context select
- Compact, no floating label, fits in table rows
- Built on shadcn `Select` or styled native — TBD which gives better cell density
- Saves on change
- Props: `value`, `options`, `onSave`, `size? ('xs' | 'sm')`, `placeholder?`
- **Used by:** voc-table category cells, entity-outcomes-panel faqType/category cells, process category cells

### `CheckboxField` — labelled checkbox (or just standard `Checkbox` use)
- Wraps shadcn `Checkbox` with consistent label and spacing
- Use the existing shadcn `Checkbox` directly if no extra wrapping is needed — defer the molecule decision until first migration
- **Used by:** voc-mapping checklists, source-doc-picker multi-select

### `SliderField` — field-context slider
- Visual parity with InlineField envelope (border, label patch, icon)
- Track + thumb + numeric readout + optional min/max labels
- Saves on `mouseUp` / `touchEnd` (not onChange — too chatty)
- Props: `label`, `icon`, `value`, `min`, `max`, `step?`, `onSave`, `lowLabel?`, `highLabel?`, `valueFormatter?`, `description?`
- **Variant:** zero-centred mode for delta sliders (DNA-09 Applications) — adds tick at 0, formats values with sign
- **Used by:** ToV base dimensions (4), ToV Applications dimension deltas (4 per application)

### `InlineCellInput` and `InlineCellTextarea` — cell-context text controls
- Lower priority — most uses are legitimately context-specific
- Document the canonical pattern even if no molecule is created (a CSS class + spacing convention)
- **Decision needed:** is the cost of standardising worth it for these, given how much context-specific styling cell-level inputs need?

## Update behaviour

Not applicable — this is a refactor, not a data feature.

## Relationships

### Knowledge graph (FalkorDB)
None. UI work only.

### Postgres
None. UI work only.

## UI/UX notes

Defer to layout-design skill once this brief is approved. Each molecule will need a spec entry in `01-design/design-system.md` before implementation (per DS-01 hard gate).

Likely visual reference: the existing `InlineField` molecule. Match its envelope (border colour, label patch positioning, focus state colour, transitions) so the new molecules sit visually alongside it without re-litigation.

## Edge cases

- **Empty options list** for a select — disabled trigger with placeholder "No options available"
- **Long option labels** in cell-context selects — truncate with ellipsis, full text in tooltip
- **Slider min == max** — disabled, displays the single value
- **Checkbox mid-state (indeterminate)** — needed for VOC mapping when some-but-not-all are checked? Verify use case during build
- **Save errors** — same treatment as InlineField (inline "Failed" badge + toast)
- **Disabled state** — every control molecule needs a disabled variant from day one

## Migration strategy

The audit lists 20+ files. Migrating all in one PR would be a wall of changes. Proposal:

**Phase 1 — Create molecules and migrate one reference site each:**
- `SelectField` → migrate `platform-detail-view.tsx` journey stage (1 site, low risk)
- `InlineCellSelect` → migrate `voc-table.tsx` category (1 site)
- `SliderField` → migrate ToV base dimensions (1 site)
- `CheckboxField` decision → migrate `voc-mapping.tsx` (1 site)

**Phase 2 — Bulk migrate remaining sites in priority order:**
- DNA detail views (offer, knowledge-asset, audience-segments — visible in daily use)
- Creation modals (create-platform, create-offer, create-asset)
- Process flow (process-input-client, category-section)
- Sources / pickers

**Phase 3 — Add to design system spec, update component registry, drift-check all migrated organisms.**

Each phase is independently shippable. Phase 1 unblocks DNA-09 Applications (which needs SelectField + zero-centred SliderField).

## Out of scope

- Refactoring `InlineField` itself — it's the canonical reference. Do not change its API or visuals as part of this work; only consume it for migrations.
- `chat-input.tsx` — purpose-built autosizing textarea with image attach; not a candidate for standardisation. Document and leave.
- File upload controls — separate concern, not a "form control" in this sense.
- Date/time pickers — not currently used in the app; out of scope until needed.
- The `SourceDocPicker` — it's a modal-based picker, not a select. Different pattern.
- New control types not currently in use (combo box, multi-select tag input, etc.) — only standardise what already exists.

## Open questions / TBDs

1. **`InlineCellInput` / `InlineCellTextarea`** — molecule or convention? The existing cell-level inputs are quite context-specific (different paddings, different border treatments per table). A documented CSS-class convention may be better than a wrapper component. Resolve during layout-design.
2. **Slider implementation** — does shadcn ship a Slider in this project, or do we add `@radix-ui/react-slider` as a dependency? Check during build.
3. **`CheckboxField` necessity** — if shadcn `Checkbox` covers the use cases with consistent labelling at the call site, we may not need a wrapper. Resolve during first migration.
4. **InlineCellSelect — base layer.** Should it use shadcn `Select` (consistent with SelectField) or a styled native `<select>` (denser, simpler, better for high-row-count tables)? Test both during Phase 1.
5. **Phase boundaries** — is the proposed three-phase split right, or should each molecule be its own PR? Decide during plan gate.

## Decisions log
- 2026-04-25: Brief drafted. Triggered by DNA-09 Applications tab build needing SelectField. Inventory expanded to all form controls after `<select>` audit revealed equivalent gaps in inputs/textareas/checkboxes/sliders.
- 2026-04-26: Brief approved. Decisions:
  - **`InlineCellInput` / `InlineCellTextarea` are conventions, not molecules.** Documented as a Tailwind-class pattern in `design-system.md`. Cell editors are too tightly coupled to their host table layouts to share a wrapper.
  - **`CheckboxField` IS a molecule.** Wraps base-ui Checkbox + label + optional description with consistent layout. Replaces 4 native `<input type="checkbox">` sites.
  - **`InlineCellSelect` uses base-ui Select** (consistency over native density). Cell-context tables in this app are short — density isn't a real concern.
  - **`SliderField` uses `@base-ui/react/slider`** — already in `node_modules`, no new dependency. Adds a thin `components/ui/slider.tsx` shadcn-style atom.
  - **All-in-one migration** confirmed (DS-02 precedent). The original three-phase plan is dropped.
  - **Save behaviour:** SelectField + CheckboxField + InlineCellSelect save immediately on change. SliderField saves on `mouseUp` / `touchEnd` (too chatty otherwise).
  - **Save feedback:** all four molecules use the same inline pattern as InlineField — `text-success` "Saved", `text-destructive` "Failed". Tokens from DS-02.
  - **Disabled state:** all four accept a `disabled` prop. Pattern: `opacity-50 cursor-not-allowed`, all interactions blocked, save callbacks not invoked. (Will also add a one-line note to the InlineField spec for parity.)
  - **`text-yellow-600`-style threshold colour distinction** — N/A here; that was DS-02. Just confirming nothing snuck in.
- 2026-04-27: Build complete.
  - Built: `components/ui/slider.tsx` (base-ui Slider atom), `SelectField`, `InlineCellSelect`, `CheckboxField`, `SliderField`. InlineField gained `disabled` prop. `debouncedSaveToast` exported from `inline-field.tsx` so DS-04 molecules share it (DS-06 will extract to `lib/save-feedback.ts`).
  - Migrated: 11 select sites (9 native + 2 inline shadcn Select), 7 checkbox-list sites in 3 files, 4 ToV slider instances. Total ~22 sites migrated.
  - Deferred (documented in code with `DS-04: deferred` comments): 2 toolbar-row select sites (`process-input-client.tsx`, `source-doc-picker.tsx` type filter) — these sit alongside unlabelled bare inputs/dates so SelectField's envelope doesn't fit the row pattern. 1 source-doc-picker checkbox-row site — picker row chrome (icon + title + metadata) doesn't align cleanly with CheckboxField's vertical alignment.
  - `npm run check:design-system` zero errors. 14 anchored specs (was 10), 44 still missing (DS-03 territory). Direct-atom warnings: 24 organisms × 40 imports (was 41 — 1 dropped). 
  - `npx tsc --noEmit` zero new errors (the pre-existing `Trash2` import error in `knowledge-asset-detail-view.tsx` is untouched and unrelated).
  - No `<input type="range">` remaining anywhere outside `components/ui/`. Native `<select>` only at the 2 documented toolbar sites. Native `<input type="checkbox">` only at the 1 documented picker-row site.
