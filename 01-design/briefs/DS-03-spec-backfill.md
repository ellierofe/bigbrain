# DS-03: Spec backfill for unspecced molecules
Feature ID: DS-03
Status: complete
Last updated: 2026-04-27

## Summary

Write design-system specs for the 42 registered molecules currently lacking entries in `01-design/design-system.md`, and rewrite the 8 existing full specs (DS-01 era) in the DS-02-style format for consistency. After DS-03, every entry in `02-app/components/registry.ts` has either a spec anchor or is removed from the registry.

This is foundation work — the gate `design-system` Mode A enforces "no molecule without a spec", but for ~85% of registered molecules there's nothing to enforce against. DS-03 closes that gap so every future feature build can cleanly reference an existing spec or trigger Mode A for a genuinely-new molecule.

## Why this matters

- **Enforcement gap.** Audit (`00-project-management/foundation-audit-2026-04-25.md` § 3) found 44 of 51 entries without specs. After DS-02 (added StatusBadge + TypeBadge), DS-04 (added 4 form-control specs), and DS-09 (added ItemSwitcher spec, removed 4 switcher entries), the count is now 42 missing.
- **Spec format inconsistency.** The 8 existing full specs use the original DS-01 `**File:** / **Purpose:** / **Spec:** (bullets)` shape. DS-02/04/09-era specs use a more structured `**Anatomy:** / **Behavioural states:** / **Edge cases:** / **Props:** / **Do not:**` format. Mixed formats make the spec doc harder to scan.
- **Two structural fixes** caught during scope:
  - `OfferDetailView` lives at `02-app/components/` but is organism-shaped (700+ LOC detail view). Move to `02-app/app/(dashboard)/dna/offers/[id]/offer-detail-view.tsx` and remove from registry.
  - `ConfidenceBadge` lives at `02-app/app/(dashboard)/inputs/process/confidence-badge.tsx` (inside the app dir) — unusual for a registered molecule. Move to `02-app/components/confidence-badge.tsx`.

## Scope

### Spec headings to write or rewrite

**Rewrite to DS-02 format (8 existing full specs):**
PageHeader, ContentPane, InlineField, SectionCard, SectionDivider, TabbedPane, InPageNav, PageChrome.

**Write new full specs (19 entries):**

*Group A — Generic structural (8):* Modal, EmptyState, FormLayout, NavSidebar, TopToolbar, PageSkeleton, ScreenSizeGate, MarkdownRenderer.

*Group B — Editor primitives (5):* ExpandableCardList, StringListEditor, KeyValueEditor, OrderedCardList, ItemLinker.

*Group C — Chat molecules (6):* ToolCallIndicator, ChatMessage, ChatInput, PromptStarter, ConversationList, ChatDrawer.

**Write light specs (18 entries):**

*Group D — Feature-coupled molecules (8):* IdeaCaptureModal, IdeasList, IdeasPanel, VocTable, VocMapping, EntityOutcomesPanel, CustomerJourneyPanel, SourceMaterialsTable.

*Group E — Per-DNA-type create modals (7):* CreateSegmentModal, CreatePlatformModal, CreateAssetModal, CreateMissionModal, CreateProjectModal, CreateOfferModal, CreateApplicationModal.

*Group H — Other (3):* SourceDocPicker, ConfidenceBadge, ApplicationsTab.

**Write shared spec (1, covers 4 entries):**

*Group F — Archive modals:* `### Archive modal (shared pattern)` — covers ArchiveSegmentModal, ArchivePlatformModal, ArchiveAssetModal, ArchiveOfferModal.

**Move out of registry (1):**

*Group G — Move:* OfferDetailView → `02-app/app/(dashboard)/dna/offers/[id]/offer-detail-view.tsx` (organism layer). Remove from registry. Update one consumer import.

**Move within registry (1):**

ConfidenceBadge → `02-app/components/confidence-badge.tsx`. Update registry path. Update one consumer import.

### Total impact
- **38 spec headings** added to `01-design/design-system.md` (19 new full + 18 new light + 1 shared).
- **8 spec headings** rewritten in DS-02 format.
- **41 registry entries** gain spec anchors (was 42 missing; OfferDetailView is removed not specced).
- **1 entry removed** from registry (OfferDetailView).
- **2 files moved** (OfferDetailView, ConfidenceBadge).
- **2 consumer imports updated** (OfferDetailView's page.tsx, ConfidenceBadge's category-section.tsx).
- **`npm run check:design-system` after DS-03:** 0 missing-spec warnings (down from 42). Atom-import warnings unchanged (DS-05 territory).

## Format

**Full spec template** (DS-02 style):
```
### MoleculeName

**File:** `path/to/file.tsx`
**Purpose:** [One sentence + distinguishing notes vs. similar molecules.]

**Anatomy:**
- [Outer structure, layout class, key shape]
- [Inner parts in order]
- [Each part's class set]

**Behavioural states:**
- **Idle / hover / focus / active / disabled / loading** as relevant.

**Edge cases:**
- [Limit handling, empty handling, etc.]

**Props:**
```ts
interface MoleculeNameProps { ... }
```

**Do not:**
- [Specific constraints]
```

**Light spec template** (for feature-coupled and Create modal specs):
```
### MoleculeName

**File:** `path/to/file.tsx`
**Purpose:** [One sentence — what it does, where it's used.]

**Composes:** [Which existing molecules it's built on — e.g. "Wraps `Modal` at size=md, uses `InlineField` for text inputs, `SelectField` for dropdowns."]

**Spec:**
- [3-6 bullets covering anatomy + key behaviour]
- Save behaviour (if applicable)
- Phase / step structure (if multi-step)

**Props:** [one-line summary]

**Do not:** [1-3 bullets — only the most important constraints]
```

**Shared spec template** (for archive modals):
```
### Archive modal (shared pattern)

**Files:** `archive-segment-modal.tsx`, `archive-platform-modal.tsx`, `archive-asset-modal.tsx`, `archive-offer-modal.tsx`
**Purpose:** Confirmation modal for archiving a DNA item. Shared structural pattern, type-specific labels.

**Anatomy / Behaviour:**
- [Description that covers all four]

**Per-type variations:**
- [What differs per file — typically: dependent-checking logic, redirect target, label strings]

**Props (shared shape):** ...

**Do not:** ...
```

## Update behaviour

Not applicable — this is documentation work + 2 file moves. No data feature.

## Relationships

### Knowledge graph (FalkorDB)
None.

### Postgres
None.

## Edge cases

- **Anchor format:** lowercase, no spaces, no parentheticals (per DS-02 fix). The check script's anchor function handles the conversion. New headings: avoid `*(new)*` etc.
- **Existing anchors stay stable:** rewriting an existing spec's content doesn't change its heading or its anchor — registry entries already pointing at it keep working.
- **Drift annotations:** if I find a molecule's current behaviour clearly diverges from what the spec should say, I annotate the spec with `**Note:** current behaviour is X; intended is Y. Tracked separately.` and DO NOT change code in DS-03.
- **Generic vs feature-coupled judgement:** if I find a Group D entry that's actually more reusable than expected, upgrade it to a full spec on the fly (rare expected).

## Migration order

Sequenced to minimise re-touching files and to verify each chunk via the coherence check:

1. **2 file moves first** — OfferDetailView (move + registry remove + consumer update) and ConfidenceBadge (move + registry path update + consumer update). These change registry state, so do them before writing specs that point at the new paths.
2. **Modal full spec** — foundation for the create/archive specs. Done first so per-modal specs can reference it.
3. **Group A full specs** (7 remaining: EmptyState, FormLayout, NavSidebar, TopToolbar, PageSkeleton, ScreenSizeGate, MarkdownRenderer).
4. **Rewrite 8 DS-01 specs** in the new format. No new anchors — same heading text, same anchor; just the body changes. Registry doesn't need touching for these.
5. **Group B full specs** (5 editor primitives).
6. **Group C full specs** (6 chat molecules).
7. **Light specs Group D** (8 feature-coupled).
8. **Light specs Group E** (7 create modals — each references Modal + their unique field set).
9. **Shared spec Group F** (1 spec covers 4 archive modals).
10. **Light specs Group H** (SourceDocPicker, ConfidenceBadge, ApplicationsTab).
11. **Registry update** — every entry's `spec` field gets a real anchor (anchors all point at headings that now exist after steps 2-10).
12. **Verification** — `npm run check:design-system` should report 0 missing-spec warnings, 0 broken anchors, 0 orphan specs. `npx tsc --noEmit` for the file moves.

## Out of scope

- **Behavioural changes to any molecule.** DS-03 is documentation + 2 mechanical file moves. If I find drift, I annotate; I don't fix.
- **KnowledgeAssetDetailView move.** It's similarly organism-shaped to OfferDetailView but moving it is more invasive (more imports, more logic). Defer to a future ticket.
- **`InlineField` rewrite into split `Input` + `Textarea` molecules.** The current `variant` discriminated union is fine; spec rewrite preserves it.
- **Removing molecules that look unused.** If a registry entry has zero consumers, that's a separate cleanup; flag it during writing but don't remove.
- **Spec-driven refactors of internals.** E.g. if `Modal` doesn't currently support a footer slot but the spec says it should, the spec annotates the gap; the refactor is its own ticket.

## Open questions / TBDs

1. **Per-feature `KnowledgeAsset` create-modal already calls itself a multi-phase wizard (5 phases per the registry description).** Light spec captures phase structure or just notes the count? Decision at writing time.

2. **`IdeasPanel` vs. `IdeasList`** — IdeasPanel embeds IdeasList. Two specs or one combined? My instinct: two — they're different molecules with different consumers, just composed together. Confirm at writing.

3. **`ApplicationsTab` and `CreateApplicationModal`** are recent (DNA-09 era). Their use case is narrow (the Tone of Voice Applications tab). Spec depth: light. Confirm.

4. **`ScreenSizeGate`** is a utility wrapper that renders a "please use a larger screen" message below 990px. Is the message text part of the spec or a config detail? Decision: include the message in the spec as the canonical text — it's user-facing.

## Decisions log

- 2026-04-27: Brief drafted. Triggered by closing the design-system enforcement gap (foundation programme step 3). Decisions:
  - **Modal first** as the foundational spec — every Create/Archive modal references it, so per-modal specs stay light.
  - **Light specs for feature-coupled molecules** (Groups D, E, H) — they have single consumers; full spec ceremony not warranted.
  - **Rewrite the 8 DS-01 specs** into DS-02-style format for consistency across the doc. Anchors stay stable so registry doesn't need re-pointing for those entries.
  - **2 file moves: OfferDetailView (out of registry, becomes organism), ConfidenceBadge (into `components/`).** KnowledgeAssetDetailView deferred (more invasive).
  - **Mixed format approved:** DS-02 style for full specs (existing rewrites + 19 new), lighter format for 18 light specs + 1 shared spec.
  - **Big batch** — one commit unit (matches DS-02/04/09 precedent).
  - **Descriptive specs with annotations** — document what's there; if I find clear divergence, annotate with `**Note:**` and flag in the brief; don't change code.
  - **Flag-don't-fix** for issues surfaced during writing — single inline notes per spec, summary in this decisions log.
- 2026-04-27: Brief approved.
- 2026-04-27: Build complete.
  - 2 file moves: `OfferDetailView` → `02-app/app/(dashboard)/dna/offers/[id]/offer-detail-view.tsx` (out of registry); `ConfidenceBadge` → `02-app/components/confidence-badge.tsx` (path updated in registry).
  - 38 new specs written: 7 Group A full (EmptyState, FormLayout, NavSidebar, TopToolbar, PageSkeleton, ScreenSizeGate, MarkdownRenderer) + 1 foundation (Modal) + 5 Group B full (ExpandableCardList, StringListEditor, KeyValueEditor, OrderedCardList, ItemLinker) + 6 Group C full (ToolCallIndicator, ChatMessage, ChatInput, PromptStarter, ConversationList, ChatDrawer) + 8 Group D light (IdeaCaptureModal, IdeasList, IdeasPanel, VocTable, VocMapping, EntityOutcomesPanel, CustomerJourneyPanel, SourceMaterialsTable) + 7 Group E light (CreateSegmentModal, CreatePlatformModal, CreateAssetModal, CreateMissionModal, CreateProjectModal, CreateOfferModal, CreateApplicationModal) + 1 shared (Archive modal pattern, covers 4 entries) + 3 Group H light (SourceDocPicker, ConfidenceBadge, ApplicationsTab).
  - 8 DS-01 specs rewritten in DS-02 format: PageHeader, ContentPane, InlineField, SectionCard, SectionDivider, TabbedPane, InPageNav, PageChrome. Anchors stable.
  - Registry: 41 entries gained spec anchors; 1 entry removed (OfferDetailView). 56 entries total post-DS-03 (was 57).
  - Check script anchor function updated to handle italic-parenthetical suffixes (`*(light)*`, `*(DS-04)*`) and plain parentheticals (`(shared pattern)`).
  - `npm run check:design-system` 0 errors, 0 missing-spec warnings (was 42). Only DS-05 atom-import warnings remain (out of scope).
  - `npx tsc --noEmit` zero new errors.
  - Drift annotations made during writing: TopToolbar uses Button atom directly (DS-08 audit), ChatDrawer cross-imports an organism (chat-area), VocTable / IdeasList have inline filter pills (DS-07 territory), and the four archive modals could be unified into a single `ArchiveItemModal` (future ticket). All flagged in their respective specs as `**Note:**` paragraphs; no behaviour changes.
