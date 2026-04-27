# Session log — 2026-04-24 — DNA-07 Platforms build complete

Session ID: 2026-04-24-dna07-platforms-build-r7p

## What we worked on
DNA-07 (Plural DNA elements — Platforms) — full build from brief through to completion, including three new reusable molecules and a source-document generation path.

## What was done

### Pipeline (SKL-01 → SKL-02 → SKL-04)
- Brief: `01-design/briefs/DNA-07-platforms.md` — written, approved, and completed this session
- Layout: `01-design/wireframes/DNA-07-layout.md` — template adaptation from `dna-plural-item`
- Build: full end-to-end implementation

### Database
- Schema: added `source_document_ids uuid[]` to `dna_platforms` (migration 0020)
- Migration applied via Neon MCP

### Types + data layer
- `lib/types/platforms.ts` — PlatformType, ContentFormat, SubtopicIdea, StructureAndFeatures, CharacterLimits, Platform, PlatformSummary, CreatePlatformInput
- `lib/types/generation.ts` — added platformEvaluationSchema + platformGenerationSchema + GeneratePlatformInput + PlatformGenerationOutput
- `lib/db/queries/platforms.ts` — list/listAll/getById/countActive/getDependents/updateField/archive/activate
- `app/actions/platforms.ts` — create, saveGenerated, saveField, saveJsonField, toggleActive, checkAndArchive/confirmArchive, markActive

### Generation
- `lib/llm/prompts/platform.ts` — system prompts + user message builders, source doc injection, "source docs as primary authority" instruction
- `lib/generation/platform.ts` — evaluate uses Gemini Flash (fast yes/no check), generate tries Gemini Pro first with automatic fallback to Claude Sonnet on capacity errors
- `app/api/generate/platform/route.ts` — evaluate/generate endpoint, loads source doc content via `getSourcesByIds()`

### Three new molecules (added to `components/registry.ts` under new `editor` category)
- `components/expandable-card-list.tsx` — generic expandable card list editor for JSONB arrays
- `components/string-list-editor.tsx` — add/remove/edit string list (click-to-edit on existing items)
- `components/key-value-editor.tsx` — key-value pair editor for flat JSONB objects

### Platform-specific components
- `components/create-platform-modal.tsx` — multi-step modal with two-path entry (source docs vs answer questions)
- `components/archive-platform-modal.tsx` — archive confirmation
- `components/platform-switcher.tsx` — pill strip navigation

### Pages
- `app/(dashboard)/dna/platforms/page.tsx` — root redirect, empty state (PageChrome + ContentPane)
- `app/(dashboard)/dna/platforms/cards/page.tsx` — card grid with type badges
- `app/(dashboard)/dna/platforms/[id]/page.tsx` — server component
- `app/(dashboard)/dna/platforms/[id]/platform-detail-view.tsx` — 6 tabs: Strategy, Formats & Output, Ideas, Performance, Sources, Related Content (stub)

### Molecule improvements (benefits all consumers)
- `components/modal.tsx` — fixed size override bug. Changed `max-w-*` to `sm:max-w-*` so sizes actually apply (the base Dialog has `sm:max-w-sm` which was winning by specificity). Added `"2xl"` size. Fix applies app-wide.
- `components/in-page-nav.tsx` — baked the `w-36 shrink-0 self-start sticky top-0` wrapper into the molecule. Consumers no longer need to wrap it manually. Removed wrapper divs from three existing consumers (audience segments, knowledge assets, platforms).
- `01-design/wireframes/templates/dna-plural-item-template.md` — added mandatory InPageNav pattern for any tab with 2+ sections
- `01-design/design-system.md` — updated InPageNav spec with positioning details and usage pattern

### Backlog
- UX-09 filed and marked done: "InPageNav consistency audit" — raised during this session, all three existing consumers migrated

## Decisions made

- **Gemini Pro generation with Claude Sonnet fallback** — Gemini Pro hit capacity limits during testing (3-retry default = 5-minute hang, "high demand" errors). Switched to `maxRetries: 1` on Gemini Pro with automatic fallback to Claude Sonnet on any error. Logged so the model used is visible. Pragmatic fix, not an ADR-worthy pattern — revisit when we add proper provider observability / retry strategy.
- **Evaluation uses Gemini Flash, not Gemini Pro** — evaluate call is a trivial yes/no readiness check. Flash is near-instant and doesn't burn Pro capacity unnecessarily.
- **InPageNav positioning baked into molecule** — the sticky wrapper was being manually duplicated in three places with subtle variations (one missing `self-start`). Moved it into the molecule so it's always correct. Consumers just drop `<InPageNav>` as a flex-row sibling.
- **Modal size bug fixed at the molecule level, not per-consumer** — the `sm:max-w-sm` in the base Dialog was overriding any `max-w-*` passed in. Fixed by using `sm:max-w-*` in the Modal size map. Now all Modal consumers get correct sizing.
- **Source doc generation follows DNA-05 pattern exactly** — reused `SourceDocPicker` and `SourceMaterialsTable` molecules. No new source-doc-picker work needed.
- **6 tabs instead of 5** — Sources tab added to the detail view. Related Content stub kept as the final tab (will become live when REG-01 is built).
- **hashtagStrategy conditionally hidden** — only shown for social platforms. Character limit labels adapt for audio/video ("Duration limit" vs "Character limit").
- **Status model: `isActive` boolean, not `status` varchar** — platforms use the simpler boolean, but the UI follows the same "Mark as active" / "Archive" header button pattern as segments. The platform type badge replaces the avatar in the left panel.

## What came up that wasn't planned

- **Gemini capacity issues** — the Gemini 3.1 Pro preview model was returning "high demand" errors repeatedly during the session. Not a code bug but required the fallback pattern above.
- **Scroll behaviour bug** — initial build had the InPageNav scrolling with the content because the wrapper div was missing `self-start sticky top-0`. Discovered mid-test, led to the InPageNav molecule refactor + UX-09 backlog entry.
- **Modal width bug** — the `sm:max-w-sm` issue was a pre-existing bug in the Modal molecule that surfaced when trying to use `size="xl"`. Fix is app-wide.
- **Source doc path** — originally scoped as "out of scope" in the brief. Built this session once Ellie confirmed Knowledge Assets pattern was in place to replicate.

## Backlog status changes

- **DNA-07** (Platforms): `in-progress` → `done`
- **UX-09** (InPageNav consistency audit): new entry, filed and marked `done` same session

## What's next

Enables OUT-02 (content creator — single-step). Remaining DNA plural types: DNA-04 (offers) is in-progress in a separate session; DNA-05 (knowledge assets) is also in-progress. M4 (Dashboard and DNA editing) remains the current milestone. Content pillars (DNA-06) still parked.

For the next session on platforms specifically: nothing pending. Could raise a backlog entry for ToV application linking (each platform should have a ToV application record — currently not linked in UI) if it comes up during content creation build.

## Context for future sessions

- **Gemini fallback pattern** exists in `lib/generation/platform.ts` — consider applying to other generation functions (audience-segment, knowledge-asset) if they hit the same capacity issues. Not worth pre-emptively refactoring.
- **Modal `size="2xl"` is now available** — use it for any modal with multiple form fields / textareas / select dropdowns that was getting cramped at `xl`.
- **Three new molecules (ExpandableCardList, StringListEditor, KeyValueEditor)** are generic and reusable for DNA-04 (Offers), DNA-06 (Content Pillars), and any other JSONB-heavy type.
- **InPageNav usage** — no more wrapper divs. Parent is `flex gap-6`, children are `<InPageNav>` + `<div className="flex-1 min-w-0 flex flex-col gap-8 pb-16">`. Pattern documented in the template.
- **Pre-existing issue:** `components/knowledge-asset-detail-view.tsx` has a missing `Trash2` import causing a TS error. Not related to this session but worth fixing when next touching that file.
