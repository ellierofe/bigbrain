# Session log — 2026-04-27 — Foundation programme: DS-02..DS-09 build-out
Session ID: 2026-04-27-foundation-programme-k7p

## What we worked on
Major build-out of the design-system foundation programme: DS-02 (state + tag tokens, StatusBadge, TypeBadge), DS-04 (form-control molecules), DS-09 (ItemSwitcher), DS-03 (spec backfill), DS-05 (button molecules). DS-08 plumbing (skill enforcement gates) landed alongside. Started from the foundation audit (2026-04-25) and the skill enforcement gap analysis. Day spanned 2026-04-25 to 2026-04-27.

## What was done

**Skill enforcement (DS-08):**
- Updated `layout-design` skill: added mandatory "Molecule composition" section to layout specs (drives feature-build plan gate).
- Updated `feature-build` skill: Step B Molecule plan + Step C plan-time hard gate. Mode A now invoked at plan time, not build time.
- Updated `design-system` skill: Mode A timing note; Mode B drift-check scope widened from `app/(dashboard)/` only to all organism-layer files.
- Updated `CLAUDE.md` to match.
- Added `spec` field to `02-app/components/registry.ts` `ComponentEntry` type.
- Wrote coherence check script `02-app/scripts/check-design-system.ts` + `npm run check:design-system`.
- Wired the script into `design-system` Mode B Step B0.

**DS-02 — Semantic colour tokens + status & type molecules:**
- 12 state tokens + 6 tag tokens added to `02-app/app/globals.css` (`:root` + `@theme inline`).
- StatusBadge refactored — option API changed from `className` to `state` keyword.
- TypeBadge molecule added (decorative category pill, hue 1–6).
- 60+ hardcoded named-Tailwind-colour instances migrated.
- All `dark:` overrides on hardcoded hues dropped.
- Two shared util files: `lib/voc-mapping-hues.ts`, `lib/platform-type-hues.ts`.

**DS-04 — Form controls standardisation:**
- New shadcn-style atom `02-app/components/ui/slider.tsx` (base-ui Slider).
- 4 new molecules: `SelectField`, `InlineCellSelect`, `CheckboxField`, `SliderField` (incl. zero-centred variant for DNA-09 deltas).
- InlineField gains `disabled` prop.
- `debouncedSaveToast` exported from `inline-field.tsx` for shared use; DS-06 will extract to lib.
- ~22 native control sites migrated; 3 toolbar-row + picker-row sites documented as deferred.
- Cell-context input/textarea pattern documented as a convention (not a molecule).

**DS-09 — Page-chrome switcher unification:**
- New `ItemSwitcher` molecule (compact dropdown, generic over `T`, Link-based navigation, optional `getFlag` for warning pills).
- 4 detail views migrated.
- 4 old switcher molecules deleted (AudienceSegmentSwitcher, PlatformSwitcher, KnowledgeAssetSwitcher, OfferSwitcher).
- Template doc `dna-plural-item-template.md` updated.
- Follow-up: added `getFlag` prop after user noted the knowledge-asset draft indicator was lost in migration.

**DS-03 — Spec backfill:**
- 38 new specs written in `01-design/design-system.md`: 19 full + 18 light + 1 shared archive-modal.
- 8 existing DS-01 specs rewritten in DS-02 format for consistency (anchors stable).
- 2 file moves: `OfferDetailView` → `02-app/app/(dashboard)/dna/offers/[id]/` (out of registry, becomes organism); `ConfidenceBadge` → `02-app/components/`.
- Coherence check script anchor function updated to handle `*(light)*` and `(shared pattern)` suffixes.
- Registry: 41 entries gained spec anchors; 1 entry removed.

**DS-05 — Button composition molecules:**
- 2 new molecules: `IconButton` (default-on tooltip, optional `href` Link rendering), `ActionButton` (icon + label, optional `href`, optional `loading`).
- ~21 organism files migrated; 3 Tooltip-wrapping-Button patterns folded into IconButton.
- Atom-import warnings dropped 41 → 20.
- 3 DropdownMenuTrigger Buttons kept (commented as DS-05-deferred carrythrough for future ActionMenu work).

**Documentation:**
- Foundation audit consolidated at `00-project-management/foundation-audit-2026-04-25.md`.
- Skill enforcement gap analysis at `00-project-management/skill-enforcement-gap-analysis-2026-04-25.md`.
- 5 briefs + 5 layout specs written for DS-02 / DS-03 / DS-04 / DS-05 / DS-09.
- Backlog updated for DS-02..DS-09 status changes; DS-08 marked done; UX-07/UX-09/UX-10 ID collisions resolved (renamed to UX-12, UX-13, DS-04).

## Decisions made

- **Foundation programme split**: DS-02..DS-08 created in backlog as separate entries rather than one mega-feature. Each has distinct scope and verifiable completion.
- **`feature-build` plan-time hard gate** moved from build-time to plan-time. Skill enforcement gap was the upstream cause of 85% molecule spec coverage gap. Full reasoning in `skill-enforcement-gap-analysis-2026-04-25.md`.
- **Spec depth tiered** in DS-03: full DS-02-style for genuinely-reusable molecules (19 + 8 rewrites); light spec for feature-coupled / single-consumer molecules (18); 1 shared spec for the 4 archive modals.
- **Tag tokens are single-role backgrounds** (DS-02): user-supplied palette is desaturated enough that the existing dark `--foreground` text reads on all 6 — saved 12 token definitions vs the originally proposed 18.
- **DS-09 placement**: subheader slot rather than action-slot (initially considered). Lower-risk, simpler.
- **DS-05 scope deliberately narrow**: buttons only. DropdownMenu, Badge, and DS-04-deferred form-control sites stay; documented as carrythrough for future tickets.
- **`Modal` foundation spec**: written first so per-Create/Archive modal specs stay light + reference Modal for shared chrome.
- **2 file moves in DS-03**: `OfferDetailView` (organism) and `ConfidenceBadge` (correct molecule home). `KnowledgeAssetDetailView` deferred (more invasive).

No ADRs needed — all decisions are documented in their respective brief decisions logs + audit reports. ADRs in this project are reserved for tech-stack / data-model / architectural decisions.

## What came up that wasn't planned

- **Trash2 import error in `knowledge-asset-detail-view.tsx:586`** — pre-existing TypeScript error (carried since before this session). Not addressed; flagged in every verification step. Should be fixed when next touching that file.
- **Unused `FormLayout` molecule** — flagged during DS-03 spec writing (no current consumers). Candidate for removal if no consumer emerges.
- **4 archive modals share so much code they should probably unify** into a single `ArchiveItemModal` with type config — flagged in DS-03 spec note. Future ticket.
- **`ChatDrawer` cross-imports an organism** (`ChatArea` from `app/(dashboard)/chat/chat-area`). Chat-area likely should move to `components/`. Flagged in DS-03 spec note.
- **`KnowledgeAssetDetailView` should also become an organism** (parallel to OfferDetailView migration). Deferred from DS-03 — more invasive.
- **DS-09 `getFlag` follow-up**: added in same session after user feedback that the draft indicator from KnowledgeAssetSwitcher was lost in migration.
- **`source-doc-picker.tsx` toolbar-row select + checkbox-rows** — documented DS-04 deferrals; remain as native form controls.
- **Verticals multi-tag input in CreateMissionModal** — flagged as candidate for future `MultiTagInput` molecule.

## Backlog status changes

- **DS-02** → done (2026-04-25)
- **DS-03** → done (2026-04-27)
- **DS-04** → done (2026-04-27)
- **DS-05** → done (2026-04-27)
- **DS-08** → done (this session — skill plumbing landed)
- **DS-09** → done (2026-04-27) — new entry added this session

ID collision cleanup:
- UX-07 (autosave consistency) → marked superseded by DS-06.
- UX-07 (VOC mapping resilience) → renamed to UX-12.
- UX-09 (Inputs/Sources consolidation) → renamed to UX-13.
- UX-10 (form controls brief) → renamed to DS-04.

## What's next

**Immediate next session:**
- **Visual review** of recent molecule work in dev server — IconButton tooltip placement, ActionButton loading spinner, ItemSwitcher in subheader, SliderField envelope, SelectField vs InlineField visual parity. User noted they've been doing reviews and that the whole point of this work is that visual changes now cascade cleanly through molecules.

**Foundation programme remaining:**
- **DS-06 — Save contract**: define canonical save-pattern contract (onBlur+debounce / onMouseUp / form-submit / explicit button), migrate Value Proposition + Tone of Voice, extract `debouncedSaveToast` from `inline-field.tsx` to `02-app/lib/save-feedback.ts` (and the duplicate copy in `ideas-list.tsx`).
- **DS-07 — Modal/list/popover/filter-pill/ActionMenu molecules**: closes the remaining 20 atom imports. Includes:
  - `ActionMenu` molecule wrapping DropdownMenu (3 sites — `page.tsx`, `mission-workspace`, `project-workspace` status pickers).
  - **Decision needed**: do mission-workspace and project-workspace status pickers migrate to `StatusBadge` instead of `ActionMenu`?
  - `ModalFooter` molecule (or extend `Modal`) for the 11 archive/create-modal footer rows.
  - `ListItem` / `RowItem` molecule for ~12 list-row inline styling patterns.
  - `FloatingMenu` molecule for ~6 popover/dropdown chrome patterns.
  - `FilterPill` molecule for filter-pill patterns in `ideas-list.tsx`, `voc-table.tsx`.

**Other open follow-ups:**
- **Pre-existing `Trash2` import error** in `02-app/components/knowledge-asset-detail-view.tsx:586` — fix when next touching that file.
- **`KnowledgeAssetDetailView` move** to organism layer (parallels OfferDetailView).
- **`ArchiveItemModal` unification** (replace 4 archive modals with one configurable molecule).
- **Multi-tag input molecule** for verticals (CreateMissionModal).

## Context for future sessions

**State of the design system:**
- Every registered molecule has a real spec anchor. `npm run check:design-system` returns 0 errors.
- 56 registry entries; all token-driven.
- Atom-import warnings down to 20 — all explicitly out-of-scope and tracked.
- The plan-time hard gate is now load-bearing: no new molecule can ship without a spec being drafted at plan time. Drift prevention lives in skills + script, not just discipline.

**State of foundation programme:**
- DS-01, DS-02, DS-03, DS-04, DS-05, DS-08, DS-09 → done.
- DS-06, DS-07 → next.
- The remaining work covers behaviour (save patterns) + trickier composite molecules (ActionMenu, ModalFooter, ListItem, FilterPill).

**Things the user noted explicitly:**
- Visual reviews are happening; molecule changes cascade cleanly to all consumers — that's the intentional benefit of this work.
- Wants to switch to a new chat window after this session.

**Specific things to watch:**
- The design-system check script's anchor function is sensitive to heading suffixes (`*(light)*`, `(shared pattern)`). When adding new spec headings, verify the script generates the anchor you expect.
- The `feature-build` plan-time gate now requires every new molecule to have a draft spec sketch in the layout spec's "Molecule composition" section. Don't skip the layout-design step on UI features.
- `debouncedSaveToast` is a cross-import from `inline-field.tsx` to DS-04 molecules — temporary. Extract to `lib/` in DS-06.
- The 20 remaining atom imports are all *justified* carrythrough: 3 Buttons inside DropdownMenuTrigger render slots (deferred to ActionMenu work in DS-07), 4 Badges (decorative pills, possibly fine as-is), 3 DropdownMenu, plus DS-04-deferred form-control sites. Each non-trivial case has a comment in the source file explaining why it stays.

**Handoff to next chat window:**
> DS-01 through DS-09 of the foundation programme are complete except DS-06 and DS-07. Foundation audit at `00-project-management/foundation-audit-2026-04-25.md`. Most recent session log is `2026-04-27-foundation-programme-k7p.md`. Next priorities: either DS-06 (save contract) or DS-07 (modal/list/popover molecules incl. ActionMenu and FilterPill — closes remaining 20 atom imports).
