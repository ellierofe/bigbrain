# Session log — 2026-03-29 — DNA schema design
Session ID: 2026-03-29-dna-schemas-k7r

## What we worked on
- M0 milestone: DNA schema definitions (prerequisite for DNA-01)
- SKL-11 (feature-request): filed OUT-05 mid-session

## What was done
- Discussed and finalised the full DNA schema structure — revised the original domain model list into a more considered set of types
- Wrote 15 schema files covering 18 tables to `01-design/schemas/`:
  - `brands.md` — `brands` + `brand_users` (root entity, added after initial pass)
  - `dna-business-overview.md`
  - `dna-brand-meaning.md`
  - `dna-value-proposition.md`
  - `dna-brand-identity.md`
  - `dna-tone-of-voice.md` — covers `dna_tone_of_voice`, `dna_tov_samples`, `dna_tov_applications`
  - `dna-audience-segments.md`
  - `dna-offers.md`
  - `dna-knowledge-assets.md`
  - `dna-content-pillars.md`
  - `dna-platforms.md`
  - `dna-lead-magnets.md`
  - `dna-brand-intros.md`
  - `dna-competitors.md` — covers `dna_competitor_analyses` + `dna_competitors`
  - `dna-entity-outcomes.md`
  - `prompt-components.md`
- Added `brandId` FK to all 18 tables after realising brand should be the root entity
- Added `INF-00` (brands root schema) to backlog as a new infrastructure feature
- Updated `DNA-01` backlog entry to reference `INF-00` as a dependency
- Updated critical path in backlog to include `INF-00`
- Updated `milestones.md` to track DNA schema progress (5 approved, remainder in review)
- Filed `OUT-05` (strategy coherence check) via feature-request skill; backlog updated to 61 features
- Reviewed legacy prompt system (`Content Creation Live Data.csv`, `Centralised Prompt Data Live.csv`, legacy prompt MDs) to inform ToV and prompt_components schemas
- Mid-session schema refinements:
  - ToV: added `tonalTags` to `dna_tov_samples` and `dna_tov_applications`; updated retrieval logic to tag-first / embedding-fallback
  - Audience segments: replaced free-text `psychographics` with structured JSONB (5 sub-fields); removed `customerJourneyStages`
  - Value proposition: decided against bidirectional FK with offers — coherence checking handled by OUT-05 instead

## Decisions made
- **Value prop + positioning combined** into one singular DNA item — they're always co-dependent, separating them creates drift risk
- **Tone of voice = one base + applications** — singular base voice, plural per-context deltas (what shifts for LinkedIn vs sales page vs client email)
- **Knowledge assets** use `kind` enum (`methodology | framework | process | tool | template`) with kind-specific fields in a `detail` JSONB column — avoids a wide sparse table
- **Competitor analysis** scoped to brand-level only (NicelyPut's competitive landscape). Client-specific competitor analysis is a future skill in the client project system (M6+)
- **`prompt_components`** is a system table, not DNA — holds reusable instruction snippets composed into generation prompts at runtime. `brandId` nullable: null = global, set = brand-specific override
- **`customerJourneyStages`** removed from audience segments — a segment isn't *at* a stage, it *can be reached* at different stages. Stage lives on offers, content pillars, and as a content creator parameter
- **`tov_samples` retrieval**: tag-first (`formatType` hard filter → `tonalTags` soft filter) with embedding as tiebreaker, not primary mechanism
- **`dna_entity_outcomes`** is a shared polymorphic junction table for outcomes/benefits/advantages across both offers and knowledge assets — reflects the real relationship between a methodology and the offer that delivers it
- **Brands as root entity**: every DNA table carries `brandId FK → brands.id`. `prompt_components.brandId` nullable for brand override pattern. Multi-brand/multi-user architecture from day one.

## What came up that wasn't planned
- The need for a `brands` root entity only became apparent after the initial schema pass — added `brands.md` and retrofitted all schemas with `brandId`
- `OUT-05` (strategy coherence check) surfaced during discussion of whether value proposition and offers should have a bidirectional FK — filed via feature-request skill

## Backlog status changes
- `INF-00` — new entry added (planned)
- `OUT-05` — new entry added (planned)
- `DNA-01` — dependency updated to include `INF-00`; schema file references added
- Output layer count updated: 7 → 8 features, 56 → 57 planned, total 60 → 61

## What's next
- Continue reviewing remaining schema files — still in draft: `brands.md`, `dna-tone-of-voice.md`, `dna-offers.md`, `dna-knowledge-assets.md`, `dna-content-pillars.md`, `dna-platforms.md`, `dna-lead-magnets.md`, `dna-brand-intros.md`, `dna-competitors.md`, `dna-entity-outcomes.md`, `prompt-components.md`
- Once all DNA schemas approved → define source knowledge schemas (`01-design/schemas/`)
- Once all schemas approved → graph schema (ADR-002)
- Then M0 exit criteria are met → M1 (storage layer) can begin

## Context for future sessions
- Schema docs in `01-design/schemas/` are the source of truth — Drizzle tables implement them, not the other way around
- `schema-to-db` (SKL-06) should be run per schema file once approved — generates Drizzle table definition + migration
- `brands` and `brand_users` must be migrated before any DNA tables (FK dependency)
- Auth.js (`users` table) must be initialised before `brand_users` migration runs — `brand_users.userId` FK depends on it
- `prompt_components` slug uniqueness is `(brandId, slug)` composite — null brandId rows are global/system
- ToV tonal tag set: `authoritative | conversational | warm | direct | playful | reflective | persuasive | educational | personal | formal` — AI-applies at intake, human-correctable
