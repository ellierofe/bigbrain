# Session log — 2026-04-28 — DNA-04 Offers build + app-wide LLM fallback
Session ID: 2026-04-28-dna04-offers-build-w7n

## What we worked on
- **DNA-04** (Plural DNA elements — Offers): full feature build from brief through layout to implementation
- **GEN-01** (Audience segment generation): closed out (testing confirmed in this session)
- **App-wide LLM resilience**: centralised fallback wrapper for `generateObject` calls, plus auto-recovery for known response anomalies

## What was done

### GEN-01 close-out
- Marked status `done` in backlog after end-to-end testing confirmed the flow works (reported at top of session).

### DNA-04 — Brief (SKL-01)
- Wrote and approved `01-design/briefs/DNA-04-offers.md`. Key design insight: VOC mapping is a discipline tool, not just a reference — when defining an offer, you explicitly select which of your audience's problems/desires/objections/beliefs the offer addresses.
- Three-phase creation flow: quick form (name, type, audience) → VOC mapping (checkboxes) → interlocutor generation. VOC mapping is selection-based not conversational.
- Customer journey redesigned mid-discussion from a single `customer_journey_stage` varchar to a structured 5-stage JSONB (awareness → consideration → decision → service → advocacy), each with thinking/feeling/doing/pushToNext. Generated on-demand from its own tab after core offer is saved.
- 5 tabs total: Positioning, Commercial, Value Gen (renamed from "Content"), Journey, Related Content.
- Status badge moved to header per updated `dna-plural-item-template`, not left panel.

### DNA-04 — Layout (SKL-02)
- Template match: `dna-plural-item` from DNA-03. Wrote delta-only spec at `01-design/wireframes/DNA-04-layout.md`.
- Departures from template: status in header (per template update), 5 tabs instead of 3, three-phase creation modal, JSONB sub-field editing for pricing/guarantee/journey, knowledge asset link via picker in left panel.

### DNA-04 — Schema + migration (SKL-06 / SKL-09)
- Migration `0019_offers_voc_journey.sql` — added `voc_mapping` JSONB and `customer_journey` JSONB to `dna_offers`, dropped `customer_journey_stage` varchar (table was empty, no data risk).
- Applied via Neon MCP — verified columns present.
- Schema doc `01-design/schemas/dna-offers.md` updated with the new JSONB structures.

### DNA-04 — Build (SKL-04)
- **Types**: `lib/types/offers.ts` (Offer, OfferSummary, PricingData, GuaranteeData, CustomerJourneyStage), `lib/types/generation-offer.ts` (Zod schemas for generation, evaluation, journey).
- **Data layer**: `lib/db/queries/offers.ts` (list, get, create, update text + JSON, archive, activate, dependents check); `app/actions/offers.ts` (server actions for all CRUD).
- **Generation**: `lib/llm/prompts/offer.ts` (system prompts + user message builders for generation, evaluation, journey); `lib/generation/offer.ts` (`evaluateOfferInputs`, `generateOffer`, `generateCustomerJourney`); `app/api/generate/offer/route.ts` (POST with 3 actions: evaluate, generate, generateJourney).
- **UI components**: `offer-switcher.tsx`, `customer-journey-panel.tsx`, `create-offer-modal.tsx`. `archive-offer-modal.tsx` was created in this session but later deleted by the parallel refactor session that introduced a shared `ArchiveItemModal`.
- **Pages**: `(dashboard)/dna/offers/page.tsx` (index — redirect or empty state), `cards/page.tsx` (card grid), `[id]/page.tsx` (detail server page), `[id]/offer-detail-view.tsx` (the main client component — was originally in `02-app/components/` but moved by the refactor session), `create-offer-button-root.tsx`.
- **Reused without changes**: VocMapping, EntityOutcomesPanel, StatusBadge from DNA-05; InlineField, InPageNav, TabbedPane, PageChrome, etc.
- **Registry**: 5 new entries added to `components/registry.ts`.

### Resumable generation (added mid-session after Gemini overload caused an empty draft)
- Detected the failure mode: when LLM generation crashes after the offer row is created, the draft offer exists with name/type/audience/vocMapping saved but no LLM-populated content (overview, usp, etc. all empty). User had to delete and start over.
- Added "Generate offer" banner to detail view that appears when `status === 'draft'` AND `vocMapping` exists AND `overview`/`usp` are empty. Clicking re-runs generation against the existing offer ID using the saved inputs.
- API route now deletes pre-existing entity outcomes for the offerId before insert (idempotent retry — no duplicates).

### App-wide LLM resilience (`lib/llm/client.ts`)
- Added `MODELS.fallback = anthropic("claude-opus-4-7")` — Anthropic credits topped up; user has been hitting Gemini overload for 8 days.
- Added `generateObjectWithFallback<T>()` wrapper. Tries primary model; on any failure (overload, schema mismatch, etc.) falls back to Claude Opus 4.7. Logs primary/fallback model identity, error message, raw response text, Zod schema issues, and `lastError` for full diagnosability.
- **Auto-recovery for response anomalies**: schema-validated unwrapping for known model output bugs.
  - First case: Claude wrapped the entire offer object under a `$` top-level key.
  - Second case: Claude wrapped under `$PARAMETER_NAME` (literal placeholder leak from tool-use schema).
  - Third case (journey): Claude returned `{ stages: "{\"stages\":[...]}" }` — stringified inner JSON inside the correct outer key.
  - Solution: `tryRecoverWrappedObject` enumerates candidates via repeated single-key unwrap + JSON-parse-strings (up to depth 4), validates each against the schema, returns the first that matches. No false positives because validation is the gate, not the key name.
- Wired through every `generateObject` call site in the app: `lib/generation/{offer,audience-segment,knowledge-asset,platform,tone-of-voice}.ts` and `lib/processing/{extract,cluster,analyse}.ts`. Each call has a tag for log identification (e.g. `DNA-04 generate`, `INP-03 extract`).
- Removed older bespoke fallback in `platform.ts` in favour of the centralised wrapper.

### Hard-reload after generation
- `router.refresh()` doesn't reliably pick up DB changes made directly inside an API route (no `revalidatePath` triggers from raw `db.update` calls). Switched the create modal and detail-view retry button to `window.location.href = ...` and `window.location.reload()` respectively.

### Backlog additions
- **UX-07**: VOC mapping index resilience — store statement text as comparator alongside indexes, surface [updated]/[removed] flags. Low priority.
- **UX-08**: Funnel Gen — generate a sales funnel view from existing offers. Low priority.
- **DNA-04a**: Offers — design system polish. Native `<select>`/`<input>` elements in detail view + create modal should use molecule layer; general audit for token-only styling and consistency with audience segments / knowledge assets. Deferred to a fresh context.

## Decisions made
- **VOC mapping storage**: JSONB column on `dna_offers` with index references into the audience segment's VOC arrays (`{ audienceSegmentId, problems: [idx], desires: [idx], ... }`). Lightweight, no junction table. Index fragility acknowledged as UX-07.
- **Customer journey as structured JSONB**: 5-stage array with thinking/feeling/doing/pushToNext per stage. Dropped the original `customer_journey_stage` varchar — replaced entirely. Generated on-demand after core offer is saved (not part of initial generation).
- **Three-phase creation flow**: form-based selection for VOC mapping (faster + more accurate than conversation), interlocutor only for the generative parts (USP, positioning, etc.).
- **App-wide fallback model**: `claude-opus-4-7` chosen as the universal fallback for `generateObject` calls. No ADR — implementation detail, easily swappable.
- **Schema-validated unwrap for response recovery**: rather than allowlist of wrapper key names (which kept needing extension as new model bugs appeared), validate the inner candidate against the Zod schema. If it matches, the outer wrapper was an anomaly. Prevents false positives without requiring exhaustive key knowledge.

No ADRs warranted — all decisions are implementation-level and well-captured in the brief decisions log.

## What came up that wasn't planned
- **Gemini overloaded for 8+ days**: ongoing infrastructure issue at Google. Forced the app-wide fallback work that wasn't in the original DNA-04 build plan but is high-value for the whole app.
- **Two distinct Claude response anomalies on Opus 4.7**: `$PARAMETER_NAME` placeholder leak (tool-use schema not substituting), and stringified inner JSON in the journey schema. Both look like model bugs in Opus 4.7 — recovery now handles both.
- **`router.refresh()` not picking up direct DB writes from API routes**: known Next.js behaviour but caught us out for the first generation. Hard reload is the workaround; consider `revalidatePath` from a server-action wrapper later if it becomes a pattern.
- **Parallel refactor session** modified files we'd just created (`archive-offer-modal.tsx` deleted, replaced by shared `ArchiveItemModal`; `offer-detail-view.tsx` moved to `app/(dashboard)/dna/offers/[id]/`). Surfaced at commit time to keep this session's commit clean.

## Backlog status changes
| Feature | Before | After |
|---|---|---|
| GEN-01 | in-progress | done |
| DNA-04 | planned | done |
| DNA-04a | — | new (planned, P3) |
| UX-07 | — | new (planned, low) |
| UX-08 | — | new (planned, low) |

## What's next
- **DNA-04a** (design system polish on offers) — fresh context, audit + fix native `<select>`/`<input>` to use molecules, token-only styling, consistency pass.
- **DNA-05** is `done` per backlog — methodologies are built and were the source of the reusable VocMapping + EntityOutcomesPanel + StatusBadge molecules.
- **DNA-07** (Platforms) — already done.
- **M4 remaining**: DNA-02 still has AI-driven generate/refresh flows outstanding for singular DNA. Consider whether to tackle next or move to **M5** (OUT-02 content creator) which has Phase 1 batch 1 already shipped per the previous session log.
- **GEN-PROMPTS-01**: still `in-progress` — pattern is now established across DNA-03 (audience), DNA-05 (knowledge assets), DNA-04 (offers). Can be closed once the pattern is officially documented.

## Context for future sessions
- **`generateObjectWithFallback()` is now the standard for all structured generation** — new generation code should use it, not raw `generateObject`. It's in `lib/llm/client.ts`.
- **The fallback tag pattern**: pass `{ tag: '<feature> <action>' }` to make logs filterable (e.g. `DNA-04 generate`, `INP-03 cluster`).
- **The unwrap recovery is schema-driven**: if a future schema gets a similar wrap from any model, recovery should "just work" as long as the schema is valid Zod. If it doesn't recover, log the raw response and check whether the stringification pattern is something new — extend `enumerateCandidates` if so.
- **Hard reload pattern after API-route DB writes**: `window.location.href = ...` for navigation, `window.location.reload()` for in-place. `router.refresh()` is unreliable here.
- **Knowledge asset linking from offers** is wired (`knowledgeAssetId` FK + picker in left panel) but only tested with placeholder data — verify when next active KA is linked from a real offer.
- **Customer journey generation context**: uses offer overview + USP + audience profile + VOC mapping + outcome summary as input. Outcome summary is built by filtering entity outcomes to `kind === 'outcome'` only — the other kinds are not included in journey generation context, by design.
- **The `dna_offers.customer_journey_stage` column was dropped** — if you find any old code referencing it, that's a leftover. The replacement is the structured `customer_journey` JSONB.
- **`OFFER_STATUS_OPTIONS`** uses the new `state` field (`success`/`warning`/`info`/`neutral`) added by the parallel refactor session, not the old `className` shape from DNA-05. Worth noting if you write more StatusBadge code.
