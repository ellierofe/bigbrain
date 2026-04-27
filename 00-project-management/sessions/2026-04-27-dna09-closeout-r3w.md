# Session log — 2026-04-27 — DNA-09 closeout: sample-add UI + regeneration flow
Session ID: 2026-04-27-dna09-closeout-r3w

## What we worked on
- DNA-09 (final two parts: sample-add UI + regeneration with draft-review)

## What was done

### Sample-add UI — repurpose link-sources flow
- New `02-app/components/add-samples-modal.tsx` — two-step wrapper. Step 1 reuses `SourceDocPicker` (browse + upload, multi-select). Step 2 categorises each picked source with a `TovFormatType` select + optional subtype text input, then submits via the new server action.
- Server action `addSamplesFromSources` in `02-app/app/actions/tone-of-voice.ts` — fetches the picked sources via `getSourcesByIds`, copies `extractedText` into each new sample's `body`, falls back the source's `title` into `sourceContext`. Skips sources with no extracted text and reports the count actually created.
- Wired into the Samples tab as an "Add from sources" button on the right of the tab toolbar.
- Tracked as `AddSamplesModal` in registry with `spec: null` (feature-specific overlay, no DS molecule needed).

### Regeneration flow — draft-then-review
- Ported the prompt out of `scripts/generate-tov.mjs` into `02-app/lib/llm/prompts/tone-of-voice.ts` (system prompt + `buildTovGenerationUserMessage`). Adapted vocabulary section to the entries-format the UI uses.
- Added `tovGenerationSchema` (Zod) in `lib/types/generation.ts`.
- New `lib/generation/tone-of-voice.ts` — `generateToneOfVoiceFromSamples(brandId)` calls `generateObject` against `MODELS.primary` (Anthropic). Loads samples via `listSamples`, throws if empty.
- New actions: `regenerateToneOfVoice` (always inserts a fresh draft row, deleting any prior draft first), `approveDraftToneOfVoice` (`promoteDraftToActive` — transactional: archive current active + flip draft to active), `discardDraftToneOfVoice`.
- New queries: `getDraftToneOfVoice`, `getActiveToneOfVoice`, `createToneOfVoiceRecord`, `deleteToneOfVoiceRecord`, `promoteDraftToActive`. Existing `getToneOfVoice` now prefers draft → active → archived (so the page shows whatever's "in flight"); the retrieval-layer `getToneOfVoice` filters out drafts entirely.
- "Regenerate from samples" button placed next to "Active" pill in `PageChrome`. When a draft exists alongside an active row, header switches to **Approve draft** / **Discard draft**, and the subheader gains a "Reviewing regenerated draft" tag.

### Page wiring
- `loadTovData()` now returns `{ tov, draft, active, samples, applications }`. Page passes `brandId` through to the view so the picker has it for `/api/sources` calls. View toggles header chrome based on draft+active presence.

### Verification
- `npx tsc --noEmit` clean (one pre-existing DNA-05 `Trash2` error remains, untouched).
- `npm run check:design-system` — same warnings as before, none added by this build.
- Browser test (gstack browse): opened `/dna/tone-of-voice`, header shows "Regenerate from samples" + Active pill. Samples tab shows new "Add from sources" button. Picker → confirm → categorise step renders both rows with format auto-defaulted from source type (transcript → spoken). Submit gates correctly; Cancel/Back/Close all clean. No console errors.

## Decisions made

- **Categorise step is per-source, not bulk.** Layout option B (apply same format to all picks) was tempting; per-source matches reality where one batch can mix transcripts and emails. Cheap to retrofit a "Apply to all" affordance later if needed.
- **Don't track source-doc → sample link.** Sample's `sourceContext` stays a free-text field (populated with the source title). No FK column added. Re-using the same source for ToV is allowed; we don't dedupe at intake.
- **Skip embeddings on add.** `tonalTags` and `embedding` columns left untouched — already in the deferred-scope list against OUT-02 retrieval.
- **Regen as additional row, not in-place update.** Fits the existing `version` semantics and keeps "current" and "draft" cleanly separable. `deleteToneOfVoiceRecord` only deletes drafts in practice (the only place that calls it is `regenerateToneOfVoice` and `discardDraftToneOfVoice`).
- **MODELS.primary (Anthropic), not Gemini.** Per model-hierarchy memory: Anthropic primary, Gemini Pro fallback. The standalone seed script (`scripts/generate-tov.mjs`) still uses Gemini and stays as-is — useful for cold-start seeding when the in-app flow needs to bootstrap.
- **GEN-02 not rolled in.** Considered; declined to keep DNA-09 closeable. GEN-02 (applications-from-samples) needs samples-tab multi-select + new prompt + confirm modal — own brief.

## What came up that wasn't planned

- **Picker close race.** First test showed the categorise modal never opening. `SourceDocPicker.handleConfirm` calls `onSelect(ids)` then `onOpenChange(false)` synchronously — and our React state update from `onSelect` hasn't flushed by the time `onOpenChange` fires. Fix: dual-track step in `useState` AND a `useRef` mirror, with the close-handler reading the ref. Documented inline.
- **Metadata fetch race.** Categorise modal initially rendered "0 sources selected" because we waited for `/api/sources` before setting `pickedIds`. Fix: set `pickedIds` + empty drafts immediately so rows render with "Loading…" placeholders, then enrich with metadata + format defaults when the fetch resolves.
- **`getToneOfVoice` had to change behaviour.** Existing single-row-per-brand assumption (`limit(1)` no order) breaks once a draft sibling exists. Updated to prefer draft → active → archived via `CASE` ordering. The retrieval-layer copy in `lib/retrieval/structured.ts` was updated to *exclude* drafts (chat shouldn't see in-flight ToV).

## Backlog status changes

| Feature | From | To |
|---|---|---|
| DNA-09 | in-progress | done — closed 2026-04-27 |

## What's next
- **GEN-02** — applications-from-samples generation. Sibling to GEN-01 / DNA-09 regen.
- **DNA-05 `Trash2` import fix** — still blocking `next build`. One-line fix, separate from this session.
- **`idea_projects` cleanup migration** — flagged earlier, still pending.

## Context for future sessions
- **ToV record may now exist in two states simultaneously** — one non-draft (`active`/`archived`) and one `draft`. Anywhere that queries `dna_tone_of_voice` should decide whether it wants the live record or the draft. Two helpers: `getToneOfVoice` (live-or-fallback) and `getDraftToneOfVoice` (draft only). Retrieval layer skips drafts.
- **Same modal-stacking pattern**: when a parent modal hosts a child picker that auto-closes after select, the parent must intercept the child's `onOpenChange` and use a synchronous state mirror (ref) to decide whether the close belongs to the parent. Documented in `add-samples-modal.tsx`.
- **Regen prompt lives at `02-app/lib/llm/prompts/tone-of-voice.ts`.** The standalone `scripts/generate-tov.mjs` still has its own copy of the prompt — it stays for CLI-side cold-start seeding. If the prompt changes, both files need updating until/unless we converge them later.

## Decisions log
- 2026-04-27: Session complete. No ADR-worthy decisions.
