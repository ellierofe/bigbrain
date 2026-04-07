# Session log — 2026-04-01 — INF-04/05/06 and schema review
Session ID: 2026-04-01-inf-schema-review-q3m

## What we worked on
- INF-04: File storage setup (Vercel Blob)
- INF-05: Auth and session management (Auth.js v5)
- INF-06: LLM integration layer (Vercel AI SDK + Claude)
- Schema review and edits: `dna-brand-intros`, `dna-competitors`, `dna-entity-outcomes`, `dna-offers`, `dna-platforms`, `dna-tone-of-voice`
- Backlog housekeeping: DNA-06, DNA-08 parked; GEN-PROMPTS-01 added

## What was done

**INF-04 — Vercel Blob:**
- Installed `@vercel/blob`
- Created `02-app/lib/storage/blob.ts` — `uploadBlob`, `deleteBlob`, `listBlobs`, `getBlobMetadata` wrappers
- Vercel Blob store connected via Vercel dashboard; `BLOB_READ_WRITE_TOKEN` set in `.env.local`

**INF-05 — Auth.js v5:**
- Installed `@auth/drizzle-adapter`
- Created `02-app/lib/db/schema/auth.ts` — Drizzle adapter tables: `users`, `accounts`, `sessions`, `verificationTokens`, `authenticators`
- Created `02-app/lib/auth.ts` — Auth.js config, magic link via Resend, access locked to `ALLOWED_EMAIL`
- Created `02-app/app/api/auth/[...nextauth]/route.ts` — route handler
- Created `02-app/app/login/page.tsx` — email magic link login form
- Created `02-app/middleware.ts` — protects all routes except `/login` and `/api/auth/*`
- Auth env vars set in `.env.local`: `AUTH_SECRET`, `ALLOWED_EMAIL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- Migration applied manually (drizzle-kit migrate silently exits with pg driver — see context below)

**INF-06 — LLM integration layer:**
- Installed `@ai-sdk/google`, `@ai-sdk/xai`
- Created `02-app/lib/llm/client.ts` — centralised clients for Anthropic, Google, xAI; `MODELS` constants covering `primary` (claude-sonnet-4-6), `fast` (claude-haiku-4-5-20251001), `powerful` (claude-opus-4-6), plus `geminiFlash`, `geminiPro`, `grok` as named alternatives
- Created `02-app/lib/llm/system-prompts.ts` — prompts for `chat`, `contentCreation`, `processing` contexts
- Created `02-app/lib/llm/index.ts` — clean re-exports
- Created `02-app/app/api/chat/route.ts` — auth-gated streaming chat stub (real implementation is OUT-01/M3)
- Env vars added to `.env.local`: `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`, `GEMINI_API_KEY`, `XAI_API_KEY`

**Migration fixes:**
- Added `dotenv-cli` to devDependencies; updated `db:generate` and `db:migrate` scripts to use `dotenv -e .env.local --`
- Updated `drizzle.config.ts` to use `DATABASE_URL_UNPOOLED` for migrations (direct pg connection, not serverless)
- `DATABASE_URL_UNPOOLED` added to `.env.local`
- Auth tables migration (0005_jazzy_magma.sql) applied manually via node/pg script due to drizzle-kit migrate silently exiting

**Schema edits:**
- `dna-brand-intros` — added `characterLimit` field (max for target context, separate from actual `characterCount`)
- `dna-competitors` — all numeric ratings changed from 1–5 to 1–10 throughout JSONB examples
- `dna-entity-outcomes` — replaced polymorphic `entityType`/`entityId` with explicit `offerId` + `knowledgeAssetId` FKs (either or both can be set); added `feature`, `bonus`, `faq` to kind; added `question`, `faqType`, `objectionAddressed`, `valueStatement` fields
- `dna-offers` — added offer types (`1_1_coaching`, `1_1_consulting`, `digital_product`, `subscription`, `newsletter`, `book`); removed `features`, `bonuses`, `faqs` fields (moved to entity-outcomes); added note re customer journey belonging in audience segments scope
- `dna-platforms` — added `customerJourneyStage`, `growthFunction`, `contentPillarThemes`, `subtopicIdeas`, `structureAndFeatures`, `performanceSummary`, `usp` from legacy platform prompt; added JSONB structures for new complex fields
- `dna-tone-of-voice` — removed `aiGenerated` flag (all ToV is AI-generated initially); added `lastEditedByHumanAt`; added Generation model section documenting the seed → generate → review → regenerate workflow

## Decisions made

- **Multi-model LLM support from day one** — Anthropic is primary but Google (Gemini) and xAI (Grok) keys are wired in since they're available. Useful for long-context doc processing (Gemini Flash) and future routing.
- **`dna_entity_outcomes` uses explicit FKs not polymorphic pattern** — two nullable FK fields (`offerId`, `knowledgeAssetId`) rather than `entityType`/`entityId`. Cleaner joins, proper FK constraints, and supports records shared between an offer and its knowledge asset.
- **Features, bonuses, FAQs moved out of `dna_offers` into `dna_entity_outcomes`** — avoids duplication where offer and knowledge asset share the same feature/outcome; enables cross-entity querying.
- **Customer journey funnel progression lives in audience segments, not offers** — the offer's `salesFunnelNotes` captures where it fits in the funnel; the full journey (what customers think/feel/do at each stage) belongs in DNA-03/audience segment scope.
- **ToV is always AI-generated initially** — removed `aiGenerated` flag as it's redundant. `lastEditedByHumanAt` tracks human review instead.

## What came up that wasn't planned

- `drizzle-kit migrate` silently exits when using the `pg` driver with Neon SSL — no success or error output. Workaround: apply migrations directly via node/pg script. Needs a proper fix or documented workaround before DNA-01/SRC-01.
- Ellie also has Gemini and xAI keys — wired these into the LLM layer opportunistically.
- DNA-06 (content pillars) and DNA-08 (lead magnets) parked — both need more thought before building.
- New backlog item GEN-PROMPTS-01 added — audit and redesign of all generation prompts, with ToV generation as priority.

## Backlog status changes

- INF-04: `planned` → `done`
- INF-05: `planned` → `done`
- INF-06: `planned` → `done`
- DNA-06: `planned` → `parked`
- DNA-08: `planned` → `parked`
- GEN-PROMPTS-01: new item added (`planned`)

## What's next

1. **DNA-01 + SRC-01** — implement all remaining DNA and source knowledge tables in Drizzle + migrate. Ellie is reviewing the remaining draft schemas in parallel.
2. **Fix `drizzle-kit migrate`** — investigate why it silently exits; either fix the config or write a proper migration script so we're not applying SQL manually.
3. **GEN-PROMPTS-01** — review legacy prompts in `04-documentation/reference/legacy_prompts/`, start with ToV generation prompt.
4. **`dna-tone-of-voice` schema review** — marked as reviewed this session; confirm status should move to `approved`.

## Context for future sessions

- **`drizzle-kit migrate` silent exit bug** — when using the `pg` driver with Neon's SSL connection string, `drizzle-kit migrate` prints "applying migrations…" and exits cleanly with no confirmation. Migrations are NOT applied. Workaround used this session: apply SQL directly via node/pg script. Root cause unclear — may be SSL handshake or driver detection issue. Must resolve before DNA-01/SRC-01 or migrations will pile up.
- **Auth tables need `brand_users → users` FK** — the `brand_users.userId` column exists but the FK to `users.id` was intentionally deferred (auth tables didn't exist when `brand_users` was created). This FK needs to be added in the next migration after auth tables are confirmed live.
- **ALLOWED_EMAIL in `.env.local`** — set to `ellie@nicelyput.co` (note: `.co` not `.com`). Verify this is the correct sign-in email before first auth test.
- **Blob store connected** — `BLOB_READ_WRITE_TOKEN` is set. Not used until INP-01/M2 but storage is live.
