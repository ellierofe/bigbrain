# Session log — 2026-04-28 — DS-07 Modal/list/popover/status molecules + foundation programme close
Session ID: 2026-04-28-ds-07-foundation-final-leg-h4t

## What we worked on
DS-07 (last leg of the foundation programme). End-to-end run of `feature-brief` → `layout-design` → `feature-build`. Continuation of the foundation programme tracked in `2026-04-27-ds-06-save-contract-q3v.md`. After DS-07: DS-01..DS-09 are all complete and the foundation programme closes.

## What was done

**Skill chain:**
- `feature-brief` — drafted and approved `01-design/briefs/DS-07-modal-list-popover-molecules.md`. Skipped the full questionnaire (foundation audit + DS-06 handoff pre-filled most of it); jumped to 9 targeted questions on scope, molecule granularity, and migration completeness.
- `layout-design` — produced `01-design/wireframes/DS-07-layout.md`. Light spec mode (foundation/refactor pattern, same as DS-06). Resolved the 6 brief TBDs and added two decisions beyond the brief: (a) mission phases use `TypeBadge`'s tag hue palette via a new `StatusBadge` `'tag'` option variant (categorical, not status), (b) `SectionDivider` enforcement narrowed — `divide-y divide-border` on list containers stays.
- `feature-build` — full implementation, drift check clean, all 12 manual test cases passed (after fixing two real issues mid-test — see "What came up that wasn't planned").

**New molecules (6):**
- `02-app/components/floating-menu.tsx` — popover container (positioning, click-outside, Escape). Owns the chrome that 5+ organism files were hand-rolling.
- `02-app/components/action-menu.tsx` — generic context-action dropdown wrapping FloatingMenu. Sealed unit — owns its own open state. Discriminated `ActionMenuItem` union: action / link / disabled / divider. Single consumer at ship time (`NewInputDropdown`); locks the pattern for future overflow menus.
- `02-app/components/list-item.tsx` — opinionated row shell. `leading` / `children` / `trailing` slots. `as` prop (div/link/button) with discriminated union for type-safe `onClick` vs `href`. `density` (default | compact). `divider` (default true). No appearance overrides accepted by API.
- `02-app/components/filter-pill.tsx` — visual filter pill atom. Active/inactive via `bg-primary` / `bg-secondary`. Optional icon + count.
- `02-app/components/filter-pill-group.tsx` — single-select state container for FilterPill. Optional left label.
- `02-app/components/archive-item-modal.tsx` — configurable archive confirmation modal (replaces 3 archive-*-modal files). `phase` state machine (checking → confirm → archiving). Templated copy with `{itemType}` substitution; consumers can override via `dependentsCopy`.

**Existing molecule changes (2):**
- `02-app/components/modal.tsx` — added `footer?: React.ReactNode` slot. When provided, renders inside `<div className="mt-6 flex justify-end gap-2">` after children. Backward-compatible (existing consumers without `footer` work unchanged). No `border-t` separator — match existing convention.
- `02-app/components/status-badge.tsx` — three changes: (a) refactored to compose `FloatingMenu` (deletes inline click-outside `useEffect` and absolute-positioned panel — ~25 lines removed); (b) added tag-hue option variant — `{ value, label, hue: 1-8 }` alongside the existing `{ value, label, state }`. Discriminated by option shape; mixing within one `options` array forbidden by the type system; (c) made `onChange` optional — when omitted, renders as static read-only pill (no chevron, no dropdown). Same molecule covers interactive pickers AND decorative status badges. Replaces the previous Badge-atom usage in 6 sites.

**Migrations (~17 files):**
- Status pickers → `StatusBadge`: `app/(dashboard)/projects/missions/[id]/mission-workspace.tsx` (tag-hue variant — 5 phases mapped to hues 1-5); `app/(dashboard)/projects/clients/[id]/project-workspace.tsx` (state variant — Active/Paused/Complete/Archived → success/warning/info/neutral).
- Dashboard `app/(dashboard)/page.tsx` — `NewInputDropdown` → `ActionMenu`; mission/project rows + recent activity rows + input queue rows → `ListItem`. Status pills inside rows render as read-only `StatusBadge`.
- `components/ideas-list.tsx` — status + type filter pill blocks (~40 lines duplicated markup) → `FilterPillGroup` × 2.
- Modal `footer` slot adopted in: `customer-journey-panel.tsx` (regenerate-modal), `project-workspace.tsx` (archive + unlink modals), `create-application-modal.tsx`. Multi-step / form-wrapped modals (`create-segment`, `create-mission`, `create-offer`, `create-project`, `create-platform`) intentionally left inline — `footer` slot doesn't fit inside `<form onSubmit>` for `type="submit"` semantics, and per-step phase footers don't fit cleanly either.
- 3 archive flows → `ArchiveItemModal`: segment-detail-view, platform-detail-view, offer-detail-view. Offer's `archiveOfferAction` returns `{ data: { redirectTo } }`; consumer wraps with a tiny adapter to convert to `{ data: { nextId } }`. Action-side change avoided.
- 6 Badge sites → read-only `StatusBadge`: `segment-detail-view` (Draft), `audience-segments/cards/page` (Draft + Archived), `platform-detail-view` (Inactive), `platforms/cards/page` (Inactive).
- `components/entity-outcomes-panel.tsx` — Add-outcome dropdown → `ActionMenu`. Removed inline `useEffect` click-outside, `useState` for `addDropdownOpen`, and `setAddDropdownOpen(false)` call — ActionMenu owns all of that internally.

**Files deleted (3):**
- `02-app/components/archive-platform-modal.tsx`
- `02-app/components/archive-offer-modal.tsx`
- `02-app/components/archive-segment-modal.tsx`

**Boundary fix (mid-test):**
- `app/(dashboard)/page.tsx` is a server component. `NewInputDropdown` (originally inline) passed `<ActionButton icon={Plus}>` as the `trigger` prop of `<ActionMenu>`. Lucide `Plus` is a function reference; React 19 / Next 16 (Turbopack) reject non-serialisable props at the server→client boundary. Fix: extracted `NewInputDropdown` to its own client component file `02-app/app/(dashboard)/new-input-dropdown.tsx`.

**DS-07 exception comments:**
- 7 files have explicit `// DS-07 exception:` comments above their atom imports naming the reason. Coverage: `mission-workspace.tsx` (typeahead Inputs + thesis Textarea), `project-workspace.tsx` (brief Textarea), `app/(dashboard)/page.tsx` (Tooltip on disabled QuickAction), `platform-detail-view.tsx` (ExpandableCardList renderExpanded form fields), `process-input-client.tsx` (explicit-submit form), `category-section.tsx` + `results-panel.tsx` (bulk-selection checkboxes).

**State-token retune (DS-02 maintenance):**
- Edited `02-app/app/globals.css` only. Old Tailwind-default pale pastels replaced with sage/dusty-saturated palette to match brand. Success: `#6B9A7E` / `#D6E5DC` / `#2D4A38`. Warning: `#C59B6C` / `#F0DFC8` / `#6B4A20`. Error: `#AF1B1B` / `#F2D1D1` / `#5A0E0E`. Info: `#A1BED6` (matches `--tag-1` dusty blue) / `#D5E2EC` / `#2A4A63`. Required `rm -rf 02-app/.next` to clear Turbopack's compiled CSS cache before the new tokens took effect — full dev-server restart wasn't enough.

**Documentation:**
- `01-design/design-system.md` — 6 new molecule spec sections added under Molecule specifications (FloatingMenu, ActionMenu, ListItem, FilterPill, FilterPillGroup, ArchiveItemModal). `### StatusBadge` rewritten with the two-variant model (state vs tag-hue) and read-only mode. `### Modal` updated: `footer` prop added to props block, "Footer convention" code block updated to use the slot, "Do not — add a footer prop" line replaced with "Do not — render a manual `flex justify-end gap-2` footer inside `children` for new modals — pass via `footer` prop instead."
- `02-app/components/registry.ts` — 6 new entries added (FloatingMenu, ActionMenu, ListItem, FilterPill, FilterPillGroup); `Modal` props string updated; `StatusBadge` description + props updated; `ArchiveSegmentModal` entry replaced with `ArchiveItemModal` (more general).
- Brief decisions log updated through approval → build complete.
- Layout spec status → approved.

**Verification:**
- `npx tsc --noEmit`: zero new errors. Pre-existing `Trash2` import error in `knowledge-asset-detail-view.tsx:586` carries unchanged.
- `npm run check:design-system`: 66 registry entries (was 60), 63 specs anchored, 0 broken anchors. Warnings: 1 missing spec (`AddSamplesModal`, DS-03 carryover), 10 atom imports across 7 files (down from 21 / 11 — all 10 with explicit `// DS-07 exception:` comments).
- 12/12 manual test cases verified after the boundary fix and palette retune.

## Decisions made

- **Form-control migrations partially expanded, not fully.** Expanded scope (Option 2 from the plan) was: migrate Badges + thesis/brief Textareas; document the rest with exception comments. The thesis/brief Textareas turned out to need a `SectionField`-style molecule (since the SectionCard already provides the title — InlineField would double-label). Deferred those without changing the API. The remaining 10 acknowledged exceptions all have written reasons; closing them properly is follow-up work.
- **`StatusBadge.onChange` optional rather than a separate `Pill` molecule or a `readOnly` prop.** Smallest API change, avoids a parallel decorative-pill molecule, and the type system enforces "no callbacks fire on a static pill" (since there's no callback). Same molecule now covers interactive pickers and decorative status badges.
- **`FloatingMenu` adoption sites narrowed.** The brief listed `create-mission-modal` typeahead (a `w-full` search dropdown bound to an Input field) and `ideas-list` tag-picker (a `w-64` panel with search + grouped list) as candidates. On inspection both are different patterns — typeahead and rich-overlay respectively — and FloatingMenu's anatomy doesn't fit. Dropped from DS-07; future molecules likely (`TypeaheadDropdown`, perhaps).
- **Multi-step / form-wrapped Modal footers stay inline.** Modal's `footer` slot renders outside `children`; `<form onSubmit>` needs `type="submit"` buttons inside it. Five create modals (segment, mission, offer, project, platform) keep inline footers. The slot still covers 4 modals (3 confirmation modals + create-application-modal), which is the cleanest sweet spot.
- **Mission phases use tag-hue palette, not state palette.** Phases are categorical lifecycle stages (which kind of activity), not health signals (is this OK?). Mapped to hues 1-5 sequentially — verified visually after build, all five read distinctly without competing with status pills elsewhere.
- **State tokens retuned in DS-02 territory, not DS-07 scope creep.** The pastel tokens shipped in DS-02 used Tailwind defaults that clashed with the brand's sage/dusty palette. Retune is a one-file maintenance change in `globals.css`; every StatusBadge picks up the new palette automatically. No code changes anywhere else.
- **Offer archive action shape preserved with consumer-side adapter.** `archiveOfferAction` returns `{ data: { redirectTo: '/dna/offers/abc' } }`; ArchiveItemModal expects `{ data: { nextId } }`. Consumer adapts in 4 lines at the call site rather than changing the action signature. Future cleanup if all archive actions land on a canonical shape.

No ADRs needed — UI behavioural / molecule-API decisions documented in `design-system.md` and the brief's decisions log.

## What came up that wasn't planned

- **Server→client boundary error on dashboard.** The `<ActionButton icon={Plus}>` trigger inside `<ActionMenu trigger={...}>` rendered fine in dev until first manual test. Lucide `Plus` is a function reference — React 19 / Next 16 / Turbopack reject non-serialisable props at the server→client boundary. Same shape worked previously because the old code used `<DropdownMenuTrigger render={<Button>...<Plus />...</Button>} />` which inlined Plus as a JSX child. Fix: extracted `NewInputDropdown` to its own `'use client'` file. Worth flagging for any future migration where a server component needs a client dropdown trigger that uses Lucide icons via a prop.
- **Turbopack CSS-token cache requires `.next` deletion.** Editing `globals.css` token values, hard-reloading the browser, AND restarting the dev server were *all* insufficient. Inspected the compiled output at `.next/dev/static/chunks/app_globals_css_*.css` — old token values were baked in. Required `rm -rf 02-app/.next` to force a full Turbopack rebuild. Worth noting for any future palette / token tweaks.
- **`platform-detail-view.tsx` ExpandableCardList form fields.** The 7 Input/Textarea atom imports in this file are inside `renderExpanded` callbacks where the parent owns the save lifecycle. Not an InlineField fit (parent saves the whole list, not per-field). The right molecule is something like `FormField` (labelled input/textarea, no autosave, just `value` + `onChange`). Added DS-07 exception comment; flagged as candidate for follow-up ticket.
- **Thesis / brief Textareas need a different molecule.** Both sit inside SectionCards titled "Thesis" / "Brief". Wrapping them in InlineField would double-label. Probable molecule: `SectionField` — bare textarea with onBlur+save+feedback, no envelope, no own label. Out of DS-07 scope.

## Backlog status changes

- **DS-07** → done (2026-04-28). Brief and layout spec both `complete`.
- **Foundation programme:** complete. DS-01 through DS-09 all done.

## What's next

**Immediate next session:**
- No specific next ticket. Foundation programme is closed; next session can pick up feature work without design-system blockers.

**Follow-up items for whoever picks up form-control coverage next:**
- `FormField` molecule (labelled input/textarea + value/onChange, parent owns saving) — covers `platform-detail-view.tsx` ExpandableCardList renderExpanded patterns.
- `SectionField` molecule (bare textarea inside a SectionCard, with the contract row 1 save behaviour) — covers `mission-workspace.tsx` thesis + `project-workspace.tsx` brief.
- `DisabledHint` molecule (Tooltip wrapping a disabled element) — covers the dashboard QuickActionDisabled pattern.
- `TypeaheadDropdown` molecule — covers `create-mission-modal` verticals search and `mission-workspace.tsx` linker dropdowns. Distinct from ActionMenu (input-bound, full-width, different chrome).
- These four would close the remaining 10 acknowledged atom-import exceptions.

**Other open follow-ups (carry from previous session):**
- Pre-existing `Trash2` import error in `02-app/components/knowledge-asset-detail-view.tsx:586` — unchanged. Fix when next touching that file.
- `KnowledgeAssetDetailView` move to organism layer (parallels OfferDetailView).
- Multi-tag input molecule for verticals (CreateMissionModal).
- `AddSamplesModal` spec missing (DS-03 carryover, not DS-07's job).

## Context for future sessions

**State of the design system after DS-07:**
- 66 registry entries (was 60 at end of DS-06). All 6 new molecules anchored to specs in `01-design/design-system.md`.
- `npm run check:design-system`: 0 errors, 2 warnings (1 missing spec — AddSamplesModal carryover; 10 atom imports across 7 files — all with explicit DS-07 exception comments).
- StatusBadge is now the canonical "coloured pill" molecule — interactive (with `onChange`) and decorative (without). Use the state variant for health-style status, the tag-hue variant for categorical lifecycle.
- FloatingMenu is the in-DOM popover building block. ActionMenu is the sealed dropdown built on top. Future popover surfaces should compose FloatingMenu rather than reinventing.
- Modal now has a `footer` slot. New modals should use it; existing ones migrate when next touched (multi-step / form-wrapped modals are exceptions — see decisions log).

**State of state tokens:**
- `--success` / `--warning` / `--error` / `--info` (and their `-bg` / `-foreground` pairs) retuned to brand palette in `globals.css`. Sage / gold / deep-red / dusty-blue. Any future brand-palette changes should land here; every StatusBadge picks up automatically.

**Things to watch:**
- The server→client boundary issue with Lucide icons via props will recur if a future migration passes a Lucide component as a prop value (not as JSX child) across a server→client boundary. Move the consuming component to its own `'use client'` file rather than fighting it.
- Turbopack CSS-token cache: `rm -rf .next` is the only reliable way to pick up `globals.css` token-value changes. Document for future palette tweaks.
- The action-shape adapter pattern (offer's `redirectTo` → `nextId` at the consumer) will stay until offer's archive action is normalised to the canonical shape. Tiny code-cost; not blocking.
- DS-07 exception comments should be respected by future sessions: each one names a real reason. If a comment becomes stale (the underlying pattern is properly molecule-ised), delete the comment along with the exception.
- Multi-step modal footers staying inline is intentional. Don't migrate them to `footer` slot without first solving the per-phase footer or `<form>` semantic problem.

**Things the user noted explicitly:**
- Wanted "expand" on the form-control scope; we negotiated to Option 2 (pragmatic expansion) once it became clear the platform-detail-view ExpandableCardList pattern needed a separate molecule.
- Confirmed mission phases should use tag-hue (categorical) not status-state palette.
- Confirmed `StatusBadge` `onChange` optional shape over a separate `Pill` molecule.
- Picked the dusty-blue `#A1BED6` (matches `--tag-1`) for info over warm-info terracotta — keeps info distinct from warning/error semantically.
- Tweaked the success colour towards "sage variant" rather than my initial "deeper sage" — verified post-deploy.

## Self-improvement check

Two minor process notes from this session:

1. **`feature-build` Step D could explicitly flag the server→client serialisation gotcha.** When migrating organism code that crosses a server-component boundary into client components (e.g. ActionMenu / FloatingMenu / StatusBadge with function-reference props like Lucide icons), the right move is to extract the consuming component into its own `'use client'` file. Worth a one-line note in the React/TS conventions block. Optional addition.
2. **`feature-build` Step D+ (drift check) could include a dev-server cache note for `globals.css` token edits.** When state/colour tokens are retuned, the script-level `npm run check:design-system` won't catch a stale Turbopack cache. The user-facing visual won't update until `.next` is cleared. Worth a one-line note in the troubleshooting/edge-cases block. Optional addition.

Both are minor and discoverable via the symptoms (boundary error / "tokens not picking up"). No urgent action — happy to add to `feature-build` SKILL.md if you want.
