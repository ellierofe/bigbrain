# Session log — 2026-04-23 — GEN-01 Audience Segment Generation
Session ID: 2026-04-23-gen01-audience-generation-f5r

## What we worked on
GEN-01 (Audience segment generation), GEN-PROMPTS-01 (first implementation of the DNA generation pattern)

## What was done

### Feature brief (SKL-01)
- Wrote and approved brief: `01-design/briefs/GEN-01-audience-segment-generation.md`
- Extensive design discussion before brief — established the "intelligent interlocutor" pattern: structured steps with LLM-driven follow-ups, not a rigid form or a full chat interface
- Key decisions: no regeneration button (edit in detail view instead), demographics are contextual not universal, biggest problem/desire as optional anchors, Gemini Pro 3.1 for profile generation, Gemini 3.1 Flash Image Preview for avatar generation
- Scoped UC-3 (refresh/evolve existing segment) as a future companion feature

### Build (SKL-04)

**New files created:**
- `02-app/lib/types/generation.ts` — Zod schemas for generation output (segment profile, evaluation result) + TypeScript types. Establishes the schema pattern for all future DNA generation.
- `02-app/lib/llm/prompts/audience-segment.ts` — System prompts (generation + evaluation) and user message builders. Adapts legacy prompt with psychographics, contextual demographics, doppelganger beliefs, category tagging. Business context injection from DNA tables.
- `02-app/lib/generation/audience-segment.ts` — `evaluateSegmentInputs()` (follow-up question check) and `generateAudienceSegment()` (full profile generation via Gemini Pro)
- `02-app/lib/generation/avatar.ts` — `generateAvatar()` using Gemini 3.1 Flash Image Preview → Vercel Blob upload
- `02-app/app/api/generate/audience-segment/route.ts` — POST endpoint with two actions: `evaluate` (lightweight LLM call) and `generate` (full profile + DB save + avatar generation)

**Modified files:**
- `02-app/components/create-segment-modal.tsx` — Complete rewrite: old 3-step form (role → problem/desire → demographics grid → stubbed generate) replaced with generation flow (role → problem → desire → LLM evaluation → optional follow-ups → generating state → redirect to detail view)
- `02-app/app/actions/audience-segments.ts` — Added `saveGeneratedSegment()` and `saveSegmentAvatarUrl()` actions, added `eq` import from drizzle-orm
- `02-app/app/(dashboard)/dna/audience-segments/cards/page.tsx` — Avatar image display (was letter placeholder only)
- `02-app/app/(dashboard)/dna/audience-segments/[id]/segment-detail-view.tsx` — Avatar image display in detail view left panel
- `02-app/lib/db/queries/audience-segments.ts` — Added `avatarUrl` to `listSegments` and `listAllSegments` select queries
- `02-app/lib/types/audience-segments.ts` — Added `avatarUrl` to `AudienceSegmentSummary` type
- `02-app/lib/llm/client.ts` — No net change (briefly added then removed `geminiFlashImage` — image model accessed via `google.image()` directly)

### Bugs fixed during session
1. **Avatar not generating:** Fire-and-forget async pattern was killed by serverless runtime after response sent. Fixed: avatar generation now runs in `Promise.all` alongside DB save, awaited before response.
2. **Avatar `size` parameter:** Gemini image model doesn't support `size`, uses `aspectRatio` instead. Changed to `aspectRatio: '1:1'`.
3. **Avatar not displaying:** Card grid and detail view only rendered letter placeholders — never checked for `avatarUrl`. Fixed both views + added `avatarUrl` to summary queries and type.
4. **"Checking" spinner hanging:** Evaluation step called `runGeneration()` inside its async body, but `isEvaluating` didn't clear until generation completed (~30s). Fixed: clear `isEvaluating` before calling `runGeneration()`, let generation handle its own step transition.
5. **Orphaned "Generating..." rows:** If generation failed after placeholder row creation, the row stayed in the DB. Fixed: catch block now deletes the orphaned row.
6. **Duplicate persona names:** Both generated segments got the name "Gideon". Fixed: existing segment persona names now included in differentiation context, prompt strengthened.
7. **First name only:** Prompt only asked for first name. Updated to request full name (first + last).

## Decisions made
- **No evaluation step removal** — briefly removed the LLM evaluation step to debug a hang, then restored it. The intelligent interlocutor pattern is the core design principle, not optional.
- **Avatar generation awaited, not fire-and-forget** — serverless constraint means we can't fire-and-forget. Adds ~5-10s to generation but ensures the avatar actually gets created.
- **Detailed server-side logging** — Added `[GEN-01]` prefixed console logs throughout the generation pipeline for debugging. Can be removed or converted to structured logging later.
- **Orphan cleanup on failure** — placeholder rows are deleted if generation fails, preventing "Generating..." ghost segments.
- **Gemini 3.1 Flash Image Preview for avatars** — tested and confirmed working (782KB images at 1:1 aspect ratio). DALL-E 3 noted as fallback if portrait quality proves insufficient.

## What came up that wasn't planned
- The `.next/dev/static/chunks/` folder contains dozens of build artifacts matching `audience` — these are Next.js dev server chunks, not source files. Safe to ignore.
- `CreateSegmentInput` type and `createSegment` server action are now unused by the modal (which uses the API route directly) but still exist for potential future use. Could be cleaned up.

## Backlog status changes
- **GEN-01:** Added to backlog as new entry, status `in-progress`
- **GEN-PROMPTS-01:** Updated status from `planned` to `in-progress`, noted GEN-01 as first implementation

## What's next
- **Test the full flow end-to-end** with a fresh generation to confirm all fixes (avatar display, persona name differentiation, evaluation step)
- **GEN-01 close-out:** Once confirmed working, update brief status to `complete` and backlog to `done`
- **Prompt refinement** — the generation prompt may need iteration based on output quality across different segment types. Watch for: generic VOC statements, demographics that don't match the role context, psychographics that are too clinical
- **UC-3 (refresh/evolve segment)** — brief needed when ready. Different from generation: takes existing segment as starting point, overlap with original is expected
- **GEN pattern reuse** — the `lib/generation/`, `lib/llm/prompts/`, `lib/types/generation.ts` structure is ready to be replicated for other DNA types (offers, methodologies, etc.)
- **Evaluation follow-up questions** — currently working but untested in production. Try with a deliberately vague role context to verify the LLM asks useful follow-ups

## Context for future sessions
- The generation uses Gemini Pro 3.1 (`MODELS.geminiPro`) not Anthropic — deliberate choice to save Anthropic credits during testing
- `BRAND_ID` is hardcoded in the API route (`ea444c72-d332-4765-afd5-8dda97f5cf6f`) — same pattern as all other server actions. Needs updating when multi-brand auth is live.
- The `lib/llm/prompts/` directory is new — first prompt file lives here. `system-prompts.ts` still holds the older prompts (chat, processing, analysis). Future DNA generation prompts should follow the `audience-segment.ts` pattern (separate file per type, exported system prompt + user message builder).
- The `lib/generation/` directory is new — houses generation logic separate from `lib/processing/` (which is for extraction/analysis of inputs). Generation = creating DNA records from user input. Processing = extracting knowledge from source documents.
- Avatar images are stored in Vercel Blob at `avatars/segments/{segmentId}.png`. The blob store is the same one used for other uploads (`BLOB_READ_WRITE_TOKEN` env var).
