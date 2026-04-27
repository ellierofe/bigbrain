# BigBrain Milestones

> What we're working towards and in what order.
> Last updated: 2026-04-01

---

## M0 — Project setup and schema design ✓ COMPLETE

**Goal:** Get the project structure in place, define all data schemas, and scaffold the app so we're ready to build.

**What's in scope:**
- [x] Domain model (v0.2)
- [x] Feature backlog (v1, 61 features — updated this session)
- [x] Tech stack decision (ADR-001)
- [x] Skills plan (dev skills + in-app skills documented)
- [x] Move project to its own directory (`~/bigbrain/`)
- [x] Git init + GitHub repo
- [x] Vercel connection (remember: set rootDirectory to `02-app`)
- [x] Next.js scaffold in `02-app/`
- [x] Define DNA schemas (all types, field by field) → `01-design/schemas/` — 15 files covering 18 tables. Approved: `dna_business_overview`, `dna_brand_meaning`, `dna_value_proposition`, `dna_brand_identity`, `dna_audience_segments`. Remaining in review.
- [x] Define source knowledge schemas → `01-design/schemas/` (ADR-003, 2026-03-29)
- [x] Define graph schema (node types, relationship types) → ADR-002 (2026-03-30)
- [x] Build initial skills: `feature-request` (SKL-11), `session-log` (SKL-10), `feature-brief` (SKL-01)
- [x] Build schema and DB skills: `schema-to-db` (SKL-06), `db-migrate` (SKL-09)
- [x] Build build pipeline skills: `feature-build` (SKL-04), `layout-design` (SKL-02), `feature-template-check` (SKL-03)
- [ ] Remaining skills: `feature-update` (SKL-07), `global-change` (SKL-08), `dna-item-build` (SKL-05) — build as needed during M1+

**Exit criteria:** Deployable hello-world app, all schemas defined, initial skills functional, backlog updated.

**Status: COMPLETE** — All schemas defined (DNA, source knowledge, graph). M1 is next.

---

---

## Current milestone: M1 — Storage layer

**Goal:** All storage backends live and populated with initial data. DNA and source knowledge tables exist. Graph is seeded and ready for ingestion.

**What's in scope:**
- [x] INF-01: Confirm app scaffold wired to Vercel (rootDirectory = `02-app`)
- [x] INF-00: Brands root schema (`brands`, `brand_users` tables) via SKL-06 + SKL-09
- [x] INF-02: Neon Postgres full setup — Drizzle config, migrations framework, pgvector extension
- [x] INF-03: FalkorDB connection + BigBrain instance configured
- [x] GRF-01: Graph seed data — Country nodes (249), Date nodes (2010–2030), Atomic Lounge org node, canonical register table in Neon
- [x] GRF-02: Graph index mirror tables in Neon (`graph_nodes`, `graph_edges`)
- [x] INF-04: File storage setup (Vercel Blob)
- [x] INF-05: Auth setup (Auth.js v5)
- [x] INF-06: LLM integration layer (Vercel AI SDK + Claude)
- [x] DNA-01: All DNA tables via SKL-06 + SKL-09
- [x] SRC-01: All source knowledge tables via SKL-06 + SKL-09

**Exit criteria:** Every table defined in `01-design/schemas/` exists in Neon. FalkorDB is connected and seeded. A record can be written to and read from every storage layer.

**Recommended build order:**
1. INF-01 → INF-02 → INF-00
2. INF-03 → GRF-01 → GRF-02
3. DNA-01 + SRC-01 (via SKL-06 + SKL-09)
4. INF-04, INF-05, INF-06 (can run in parallel with 3)

## M2 — Input processing pipeline ✓ COMPLETE

**Goal:** First inputs flowing through to storage. Processing pipeline live. Krisp transcripts ingestable.

**What's in scope:**
- [x] VEC-01: Vector store setup — pgvector columns + HNSW indexes + embedding pipeline
- [x] KG-01: Graph node/relationship types enforced via TypeScript
- [x] KG-02: Graph write API — `writeNode()`, `writeEdge()`, `writeBatch()`, canonical register
- [x] INP-03: Input processing pipeline — done (confirmed working end-to-end 2026-04-08)
- [x] INP-01: Krisp transcript ingestion — done (updated for INP-11 model, 58 transcripts ingested 2026-04-18)
- [x] INP-11: Multi-modal processing — done (4 modes, Sources + Results UI, 2026-04-18)

**Exit criteria:** A Krisp transcript can be uploaded, processed, and result in graph nodes + embeddings in storage.

**Status: COMPLETE** — Transcripts flow from Krisp → Sources → user-triggered processing → Results. Individual extraction → graph commit works via existing pipeline. Analysis modes (batch/reflective/synthesis) produce structured documents stored in `processing_runs`. Analysis → graph commit now built (`commitAnalysis()` in `lib/processing/commit-analysis.ts`, API at `/api/process/commit-analysis`). Embeddings generated at write time via `writeNode()`. Backfill script at `scripts/backfill-embeddings.ts`.

**Last updated:** 2026-04-20

## Current milestone: M3 — Retrieval and chat ✓ COMPLETE
RET-01 (unified retrieval), OUT-01 (chat interface). First end-to-end: input → storage → retrieval → conversation.

**Completed:**
- [x] RET-01: Unified retrieval layer — 3 modes (semantic, structured, graph traversal), 4 LLM tools, embedding at write time.
- [x] OUT-01: Chat interface — full page + slide-out drawer. Custom React hook (AI SDK v6). Streaming with tool call indicators, image attach, conversation history, auto-titling. Nav restructured to "Ask BigBrain".

**Exit criteria met:** User can ask questions in chat → LLM calls retrieval tools → response with source attribution streams back. Conversations persist with history.

**Last updated:** 2026-04-22

### M4 — Dashboard and DNA editing
DASH-01 (shell — in progress, sidebar + home page reworked 2026-04-14), DASH-02 (DNA overview), DNA-02 through DNA-08. See and edit your strategy. Also includes: CLIENT-01, MISSION-01 (done 2026-04-23), IDEA-01 (done 2026-04-24 with polymorphic tagging + embeddable IdeasPanel across workspaces).

### M5 — Content creation
OUT-02 (single-step content creator), DNA-09 (tone of voice system). Generate content using the full system.

### M6+ — Automation, long-form, post-project extraction, design generation
AUTO-01–04, OUT-02a, CLIENT-02, OUT-04. Later milestones, sequence determined by need.
