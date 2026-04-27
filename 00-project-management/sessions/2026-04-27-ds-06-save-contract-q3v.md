# Session log — 2026-04-27 — DS-06 Save contract + migration
Session ID: 2026-04-27-ds-06-save-contract-q3v

## What we worked on
DS-06 (Save contract definition + migration). End-to-end run of `feature-brief` → `layout-design` → `feature-build`. Continuation of the foundation programme tracked in the previous session log (`2026-04-27-foundation-programme-k7p.md`); DS-07 remains as the only open foundation ticket.

## What was done

**Skill chain:**
- `feature-brief` — drafted and approved `01-design/briefs/DS-06-save-contract.md`. Skipped the full questionnaire (the foundation audit + handoff already covered most of it); jumped to 6 targeted questions on contract specifics.
- `layout-design` — produced `01-design/wireframes/DS-06-layout.md`. Light spec since the only visual artefact was `ListRowField` and the new "Save contract" section in `design-system.md`. No template registration — DS-06 is foundation/refactor, not a recurring feature pattern.
- `feature-build` — full implementation, drift check clean, all 12 manual test cases passed.

**Lib (new):**
- `02-app/lib/save-feedback.ts` — exports `SaveState` type, `debouncedSaveToast()` (singleton 800ms debounced toast), and `useDebouncedSave<T>()` hook (timer + state machine + `savedValueRef` short-circuit + unmount cleanup of both pending-save and idle-reset timers). Consumer keeps its own controlled `localValue`; calls `trigger(localValue)` from `onBlur`.

**Molecule (new):**
- `02-app/components/list-row-field.tsx` — `ListRowField` molecule, input + textarea variants. No envelope, no label (`aria-label` required instead), no icon. Reserved Saved/Failed indicator slot (`min-w-[3rem]` for input, `min-h-[14px]` for textarea) prevents layout shift. Hover/focus padding shift signals editability without a permanent border.
- Registry entry added.
- Spec landed in `design-system.md` under Molecule specifications.

**Refactor (no API change):**
- `02-app/components/inline-field.tsx` — refactored to consume `useDebouncedSave`. Removed inline `debouncedSaveToast` definition + inline `triggerSave` state machine. External API and visuals identical.
- `02-app/components/select-field.tsx` + `slider-field.tsx` — `debouncedSaveToast` import path swap (`@/components/inline-field` → `@/lib/save-feedback`).
- `02-app/components/ideas-list.tsx` — deleted duplicate `debouncedSaveToast` block (lines 10-17); now imports from `@/lib/save-feedback`. Both callers preserved.

**Migrations:**
- `02-app/app/(dashboard)/dna/value-proposition/value-proposition-view.tsx` — replaced 3 hand-rolled list-row controls (differentiator input, alternative title, alternative whyUs textarea) with `ListRowField`. Made `updateDifferentiator` and `updateAlternative` async-returning so the wrappers can flow `{ ok, error? }` to ListRowField's `onSave`.
- `02-app/app/(dashboard)/dna/brand-meaning/brand-meaning-view.tsx` — replaced 3 hand-rolled controls in `ValueCard` (name input, description textarea, behaviours textarea) with `ListRowField`. `updateValueField` made async-returning. Behaviours `\n`-split logic preserved (split at save, joined for display).

**Documentation:**
- New `## Save contract` section in `01-design/design-system.md` between Spacing and Component hierarchy. Contains the canonical 7-row contract table (text fields / sliders / selects+checkboxes / inline list rows / table cells / creation modals / bulk operations) + universal rule + lib note.
- New `### ListRowField` spec entry under Molecule specifications.
- "Save contract:" one-line references added to existing specs: InlineField, SelectField, InlineCellSelect, CheckboxField, SliderField (5 one-liners).
- InlineField's "Note" line about `debouncedSaveToast` re-export replaced by the Save contract reference (re-export removed entirely — no transitional path needed since DS-04 swaps in the same change).

**Verification:**
- `npm run check:design-system`: zero new warnings (carries 1 missing spec — `AddSamplesModal`, DS-03 territory — and 20 atom imports, all DS-07 territory).
- `npx tsc --noEmit`: zero new errors. Pre-existing `Trash2` import error in `knowledge-asset-detail-view.tsx:586` carries unchanged.
- Drift check on the two migrated organisms: clean for DS-06. Pre-existing organism-layer chrome (featured-statement section wrappers, header chrome) stays — out of scope for this ticket.
- All 12 user-facing test cases verified manually (1–7 differentiators/alternatives, 8 brand meaning, 9 InlineField regression, 10 DS-04 regression, 11 ideas list, 12 network failure simulation).

## Decisions made

- **`ListRowField` is a separate molecule, not a `compact` flag on InlineField.** Keeps InlineField's spec gate-able; ListRowField's visual role (list row, not field) is genuinely distinct. Three concrete consumers confirmed before molecule decision (Value Prop differentiators, Value Prop alternatives, Brand Meaning values).
- **`ListRowField` has no `icon` prop.** Leading icons (`ListChecks`, `Heart`, etc.) stay in the consumer's row composition, preserving each consumer's row layout flexibility (some might want delete-on-left, etc.). Molecule scope = editable cell only.
- **`SliderField` does NOT consume `useDebouncedSave`.** Commit-driven controls don't fit the debounce-on-trigger model — value already represents user intent on mouseUp. SliderField calls `debouncedSaveToast()` directly after commit. Hook is for keystroke-driven controls only (InlineField, ListRowField).
- **`useDebouncedSave` does not own `localValue`.** Consumer keeps its own controlled state. Matches InlineField's prior shape and was the simplest extraction; reconsider if a third pattern emerges.
- **Sliders show toast on save** (Q1a) — visible value change + debounced toast is sufficient; no inline pulse.
- **Table cells stay silent on success per cell** (Q1b) — table-level debounced toast covers the success signal; per-cell badges would be visually noisy.
- **`StringListEditor` migration deferred.** Its UX is intentionally explicit click-to-edit with Enter/Escape commit — that's a *different* contract row ("explicit Save/Cancel inline-edit mode"), not a behaviour drift. Migrating would be a UX change. Future ticket if alignment becomes desirable.
- **Save contract one-liners added to all 5 form-control molecule specs** (InlineField, SelectField, InlineCellSelect, CheckboxField, SliderField) — not just InlineField + ListRowField. Cross-references make the contract visible from any molecule entry point.
- **No transitional `debouncedSaveToast` re-export from `inline-field.tsx`.** DS-04 import sites swap in the same change; no external consumers exist.
- **No ADRs needed.** All decisions are UI behavioural conventions documented in `design-system.md`. ADRs in this project are reserved for tech-stack / data-model / architectural decisions — same pattern as DS-02..DS-05.

## What came up that wasn't planned

- **`ideas-list.tsx` had two callers of `debouncedSaveToast` locally** (lines 189, 363 originally), not zero. The dedup change preserved both via the new lib import — no behaviour change but worth noting.
- **Action-shape change required in both organism files.** The wrapper functions (`updateDifferentiator`, `updateAlternative`, `updateValueField`) needed to become async-returning (`Promise<{ ok, error? }>`) to feed ListRowField's `onSave`. Underlying server actions already returned the right shape; only the wrapper call sites needed adjusting.
- **Two appearance-class consumer overrides** in the migrations: `className="font-medium"` on the alternative title and `className="font-display font-semibold text-base"` on the brand value name. These preserve previous typography hierarchy and follow the same pattern InlineField already uses (see `value-proposition-view.tsx:114, 274`). Acceptable per existing convention; not a drift introduction.
- **Brief originally proposed extracting just `debouncedSaveToast` + `SaveState`.** Once the third consumer (ListRowField) was confirmed, extraction expanded to include `useDebouncedSave` hook so all three consumers (InlineField, ListRowField, plus future) reuse the lifecycle, not just the toast. Brief decisions log updated to reflect.

## Backlog status changes

- **DS-06** → done (2026-04-27)
- **UX-07** → closed (superseded by DS-06; canonical save contract now lives in `design-system.md § Save contract` and the lib at `02-app/lib/save-feedback.ts`)

## What's next

**Immediate next session:**
- **DS-07 — Modal/list/popover/ActionMenu/FilterPill molecules.** Last leg of the foundation programme. Closes the remaining 20 atom imports across 10 organism files. Includes:
  - `ActionMenu` molecule wrapping DropdownMenu (3 sites — `app/(dashboard)/page.tsx`, `mission-workspace`, `project-workspace` status pickers).
  - **Decision needed at brief time:** do mission-workspace and project-workspace status pickers migrate to `StatusBadge` instead of `ActionMenu`?
  - `ModalFooter` molecule (or extend `Modal`) for the 11 archive/create-modal footer rows.
  - `ListItem` / `RowItem` molecule for ~12 list-row inline styling patterns.
  - `FloatingMenu` molecule for ~6 popover/dropdown chrome patterns.
  - `FilterPill` molecule for filter-pill patterns in `ideas-list.tsx`, `voc-table.tsx`.

**Other open follow-ups (carry from previous session):**
- Pre-existing `Trash2` import error in `02-app/components/knowledge-asset-detail-view.tsx:586` — fix when next touching that file. Still untouched.
- `KnowledgeAssetDetailView` move to organism layer (parallels OfferDetailView).
- `ArchiveItemModal` unification (replace 4 archive modals with one configurable molecule).
- Multi-tag input molecule for verticals (CreateMissionModal).
- `AddSamplesModal` spec missing (DS-03 carryover, not DS-06's job).

## Context for future sessions

**State of the design system after DS-06:**
- 60 registry entries (was 57) — `ListRowField` added; design-system check returns 0 errors and the same 2 warnings as start (1 missing spec, 20 atom imports — all explicitly out of DS-06 scope).
- The save lifecycle is now centralised: `02-app/lib/save-feedback.ts` is the single source of truth for `debouncedSaveToast`, `SaveState`, and `useDebouncedSave`. Any future form molecule MUST consume from here — do not reimplement.
- Three consumers of `useDebouncedSave` today: `InlineField`, `ListRowField`. (SliderField uses just `debouncedSaveToast`.) The hook is keystroke-driven controls only.
- The "Save contract" section in `design-system.md` is now the contract. New form molecules cite their row.

**State of foundation programme:**
- DS-01..DS-06, DS-08, DS-09 → done.
- DS-07 → next, last leg.

**Things to watch:**
- The action-shape pattern from DS-06 (wrappers becoming async-returning to feed `onSave`) will recur in any future migration that swaps a hand-rolled list-row control for `ListRowField`. Cheap change but easy to miss.
- The `behaviours.join('\n')` pattern in `brand-meaning-view.tsx` ValueCard — round-trips through ListRowField via string ↔ array conversion in `updateValueField`. If a future feature needs a cleaner "string-array as multiline text" pattern, this is the prior art.
- DS-04 molecules migrated their `debouncedSaveToast` import path to `@/lib/save-feedback`. If a new control molecule is built outside this ticket and copies DS-04 patterns, make sure it uses the lib path, not the (no-longer-exported) `inline-field.tsx` route.
- ListRowField's `aria-label` is **required** — no visible label means accessibility name must come from the consumer. Type-enforced via the props interface.

**Things the user noted explicitly:**
- "Keep it light, as you say. No need to over-egg it." — applied throughout. Plan presentation came back as "seems quite long for a short brief"; clarified the length was the molecule spec + test list (required artefacts for the gate), not work output.
- DS-07 is next session, not this one.

## Self-improvement check

No skill changes needed. The brief → layout → build chain ran cleanly:
- `feature-brief` correctly skipped the full questionnaire (per the conversational-context shortcut) since the foundation audit + handoff had pre-filled most of it.
- `layout-design` correctly recognised this as foundation/refactor work and produced a light spec (no list/detail/create/delete/etc. sections), keeping the molecule composition section as the load-bearing artefact.
- `feature-build` plan-time gate held — the new molecule's full Mode A spec was drafted and presented before plan approval, exactly as DS-08 enforcement intended.

The skill chain's interaction with the design-system gate worked as designed. Nothing to flag.
