# Session log — 2026-04-27 — DNA-09 Applications tab + pattern scaffolding
Session ID: 2026-04-27-dna09-applications-build-q4w

## What we worked on
- DNA-09 (Applications tab — built end-to-end)
- Pattern/template scaffolding: registered `tab-master-detail` and `tab-table-expand` templates, ran a pattern audit
- UX-10 (Form controls standardisation — brief written, separate window did the build)
- GEN-02 (filed as follow-up for generate-from-samples)

## What was done

### Pattern/template scaffolding (early session)
- Designed the Applications tab as a new pattern (`tab-master-detail`) — collection inside a tab with narrow master list (fixed top/bottom chrome + scrolling middle) + detail pane (fixed identifier chrome + scrolling body). First instance of the pattern.
- Saved layout spec at `01-design/wireframes/DNA-09-applications-tab-layout.md` (approved 2026-04-24).
- Registered new template `01-design/wireframes/templates/tab-master-detail-template.md`.
- Retroactively registered the existing DNA-09 Samples tab as `tab-table-expand-template.md` — captures the simpler "table-with-expand" pattern for browsable collections. Established 2026-04-20 (Samples tab), formalised 2026-04-24.
- Updated registry entries in `feature-template-check` skill to include both new templates.
- Triggered a pattern audit: subagent ran Explore over the whole `02-app/`, produced `00-project-management/pattern-audit-report.md`. 5 patterns reviewed, 3 proposed for templating: `dna-singular-item` (high priority, 4 instances), `ideas-list-triage` (medium), `input-process-extract` (medium). Audit also surfaced the form-controls drift that triggered UX-10.

### UX-10: Form controls standardisation (mid-session pivot)
- Mid-build, discovered the spec needed a SelectField molecule that didn't exist. Investigation revealed wider drift: 9 native `<select>`s with ad-hoc styling, 2 inline shadcn Selects, 18+ raw inputs/textareas, 4 raw checkboxes, 2 raw range sliders.
- Wrote brief at `01-design/briefs/UX-10-form-controls-standardisation.md`. Inventory listed every offending file. Proposed molecules: SelectField, InlineCellSelect, SliderField (with zero-centred variant), CheckboxField. Three-phase migration sketched.
- Build of UX-10 happened in another window. Returned to find: `select-field.tsx`, `slider-field.tsx`, `inline-cell-select.tsx`, `checkbox-field.tsx`, `type-badge.tsx` all present. Registry updated with new entries. `inline-field.tsx` now exports `debouncedSaveToast` for the new molecules to share. The shared `text-success` token replaced `text-emerald-600` across the codebase.
- DNA-09 Applications build resumed using the shipped molecules.

### DNA-09 Applications tab — build
- Created `02-app/lib/types/tone-of-voice.ts` — `TOV_FORMAT_TYPES` constant + `TovFormatType` literal union + `TOV_FORMAT_LABELS` + `TOV_FORMAT_OPTIONS` + dimension types + `TovDimensionDeltas` interface. Single source of truth for format types across samples and applications.
- Extended `02-app/lib/db/queries/tone-of-voice.ts`: added `getApplicationById`, `createApplication`, `updateApplicationField`, `archiveApplication`, `restoreApplication`. Updated `listApplications(brandId, opts?: { includeArchived?: boolean })` with sort `isCurrent desc, updatedAt desc`.
- Extended `02-app/app/actions/tone-of-voice.ts`: server actions `addApplication`, `saveApplicationField`, `saveApplicationDeltas`, `saveApplicationDoNotUse`, `archiveApplicationAction`, `restoreApplicationAction`. Updated `loadTovData()` to fetch applications with archived included.
- Created `02-app/components/applications-tab.tsx` — organism. MasterPane (w-52, fixed chrome top/bottom, scrolling list with sort/filter, archive toggle hidden when no archived items) + DetailPane (fixed identifier chrome with label/format/subtype/archive icon, scrolling body) + DimensionDeltaRow (uses SliderField with `zeroCentred` prop, shows `Base N → With delta: M` live readout below). Optimistic local state mutations for label/format/delta changes so master list reflects edits without server roundtrip.
- Created `02-app/components/create-application-modal.tsx` — 3-field create modal (label, formatType select, optional subtype). Returns the create payload to the parent so the master list can render the new row immediately with correct data.
- Wired into `02-app/app/(dashboard)/dna/tone-of-voice/page.tsx` and `tone-of-voice-view.tsx` as the 5th tab. Tab content uses `h-full overflow-hidden` to override TabbedPane's default `overflow-y-auto` — inner panes own their scroll.
- Reused existing `StringListEditor` for the "Do not use" list instead of building the bespoke single-column table from the layout spec. Spec deviation documented at plan time.
- Registry updated: added `ApplicationsTab` and `CreateApplicationModal` entries with `spec: null` (organism + feature-specific overlay, no design-system spec). Updated `StringListEditor.usedIn` to include DNA-09. Per the new registry comment block, `spec: null` is valid only as a known gap — these are feature-specific so are documented as such.

### Bug found in testing and fixed
- Test 4 (manual create): the label and formatType chosen in the create modal weren't persisting. Master row showed empty label and "other" formatType after Create.
- Root cause: the optimistic placeholder in `handleCreated` was hardcoded with `label: ''` and `formatType: 'other'`, overwriting the real values until `revalidatePath` settled.
- Fix: pass the create payload through `onCreated(id, payload)` so the placeholder is seeded from the actual user input. Server already had the right values; the optimistic UI was simply discarding them.
- Verified clean via `npx tsc --noEmit`. Pre-existing DNA-05 `Trash2` import error remains untouched (out of scope).

## Decisions made

- **Spec deviation: `StringListEditor` for `doNotUse`** instead of the layout spec's single-column table with header. Existing molecule, proven in DNA-07, simpler call site. Documented at plan-gate time.
- **Tab-local state for selection** in ApplicationsTab. Selection resets when leaving the tab. Cheap to upgrade to `?application=[id]` URL state if usage shows it matters; v1 follows the convention of other ToV tabs.
- **Optimistic local state mutations** in the organism. Patches are applied client-side on save success so the master list updates without waiting for `revalidatePath`. Pattern: `onPatch(id, partialFields)` from DetailPane to ApplicationsTab.
- **No focus-after-create.** Layout spec called for focus on the label field after creating a new application. Decided in plan gate to skip for v1 (option C). Came up that the existing InlineField doesn't expose a focus contract, and the cleanest fix would be a small InlineField change. Not worth it for v1.
- **`tonalTags` and `embedding` editing UI deferred to OUT-02 retrieval wiring.** Footnote in DetailPane explains. Schema fields exist; no UI or write path. Captured separately in DNA-09 backlog entry.

## What came up that wasn't planned

- **UX-10 spawned mid-build.** Discovered no SelectField molecule existed; investigation revealed wider drift. Wrote brief, paused DNA-09, separate window built molecules, resumed.
- **Pattern audit triggered.** The cluster of new templates this session prompted Ellie to commission a wider audit. Subagent produced report at `00-project-management/pattern-audit-report.md`. Three patterns proposed for future templating, processed in a separate window.
- **GEN-02 filed.** Mid-test, Ellie flagged that manual delta-tuning is a power-user surface — non-experts won't be able to author voice rules from scratch. Filed `GEN-02: Tone of voice application generation from samples` as a follow-up enhancement. Sibling pattern to GEN-01.
- **Backlog ID collision discovered.** When writing the form-controls brief, found duplicate UX-07 entries (autosave feedback + VOC mapping) and UX-08 already used (Funnel Gen). Renamed the new brief to UX-10. Duplicate UX-07 still uncleaned — flagged for later, out of scope this session.

## Backlog status changes

| Feature | From | To |
|---|---|---|
| DNA-09 | in-progress | in-progress (Applications sub-feature done; sample add UI + regeneration flow remain) |
| GEN-02 | — | planned (new — generate ToV application from samples) |
| UX-10 | — | planned (new — form controls standardisation; Phase 1 molecules built in parallel window) |

## What's next

- **DNA-09 remaining:** sample add UI (currently seed-only), regeneration flow (re-run base ToV generation when samples change). Both small.
- **DNA-05 `Trash2` import fix** — still blocking `next build`. One-line fix, separate from this session's work.
- **`idea_projects` cleanup migration** — flagged at end of 2026-04-24 IDEA-01 session, still pending.
- **Pattern audit follow-up:** decide which of the 3 proposed templates to write next. `dna-singular-item` is high-priority per the audit.
- **UX-07 duplicate cleanup** in backlog (autosave feedback + VOC mapping share an ID).

## Context for future sessions

- **`tab-master-detail` is a registered template now.** Future plural-collection-inside-a-tab features should match against it via `feature-template-check`. The Applications tab is the canonical reference implementation.
- **`tab-table-expand` is also registered** — simpler sibling pattern for browsable collections. Note in the template clarifies when to upgrade from `tab-table-expand` → `tab-master-detail` (when fields exceed ~5 or items get heavily edited).
- **Optimistic-create payload pattern.** When the optimistic placeholder needs to display the user's input before server revalidation lands, pass the payload back through the `onCreated` callback. Avoid hardcoding placeholder values — they will overwrite real ones during the eventual-consistency window.
- **TabbedPane scroll override pattern.** For tabs that need to manage their own scroll (master-detail, etc.), set `h-full overflow-hidden` on the tab's content root. TabbedPane's default `overflow-y-auto min-h-0` becomes a no-op. Documented in `tab-master-detail-template.md`.
- **`TOV_FORMAT_TYPES` is the single source of truth** for ToV format values across samples + applications. `lib/types/tone-of-voice.ts`. Same set used at retrieval time per the schema. If a new format is added, this is the only file that needs to change.
- **Registry's `spec` field is required.** Every entry must have a spec anchor in `01-design/design-system.md`, OR be marked `spec: null` as a known gap (DS-03 backfill). New molecule entries with `spec: null` need explicit justification. Feature-specific organisms and overlays (like ApplicationsTab, CreateApplicationModal) are legitimately spec-less.
- **Form controls molecules exist now.** `select-field`, `slider-field` (with `zeroCentred` for delta sliders), `inline-cell-select`, `checkbox-field`. Use them — don't write more raw `<select>`s or `<input type="range">` in features.

## Decisions log
- 2026-04-27: Session complete. No ADR-worthy decisions.
