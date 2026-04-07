# BigBrain Feature Backlog

> Registry of all features. This is not a sprint plan — it's an inventory.
> Each feature has dependencies, layer, and which core problem(s) it addresses.
> Status: `planned` → `in-progress` → `done` | `parked` for future milestones
> Last updated: 2026-03-30

---

## How to read this

- **Layer:** infra (infrastructure/plumbing), data (storage/schema), input (ingestion), output (UI/generation), cross (system-wide)
- **Problems addressed:** P1 (outputs as overheads), P2 (strategy drift), P3 (disconnected knowledge), P4 (research not compounding), P5 (translation friction)
- **Size:** S (hours), M (days), L (a week+), XL (multi-week)
- **Depends on:** features that must exist first
- **Enables:** features that need this to exist

---

## INFRASTRUCTURE

### INF-00: Brands and users root schema
- **What:** `brands` table (root entity) and `brand_users` junction table (many-to-many between brands and users). Every DNA table carries a `brandId` FK. Enables multi-brand and multi-user architecture from day one.
- **Layer:** infra / data
- **Problems:** All (scoping foundation for everything)
- **Size:** S
- **Depends on:** INF-02 (Postgres), INF-05 (Auth.js creates the `users` table)
- **Enables:** DNA-01 and all other data features (they all carry `brandId`)
- **Status:** done
- **Schema:** `01-design/schemas/brands.md`

### INF-01: App scaffold and project structure
- **What:** Set up the app framework, folder structure, dev environment, deployment target
- **Layer:** infra
- **Problems:** All (nothing works without this)
- **Size:** M
- **Depends on:** Tech stack decision (ADR-001)
- **Enables:** Everything
- **Status:** done
- **Note:** Vercel `rootDirectory` must be set to `02-app` (dashboard or vercel.json) since the Next.js app is nested, not at repo root. Do this during setup or first deploy will fail.

### INF-02: Database setup — Postgres
- **What:** Neon Postgres instance with initial schema, connection config, migrations framework
- **Layer:** infra
- **Problems:** P2, P3
- **Size:** M
- **Depends on:** INF-01
- **Enables:** DNA-01, SRC-01, REG-01, VEC-01
- **Status:** done
- **Known issue:** `drizzle-kit` has 4 moderate vulnerabilities in its `esbuild` dependency (dev-only, not runtime). Fix would require a breaking downgrade. Leave until upstream patch is released.

### INF-03: Database setup — Knowledge graph
- **What:** Graph DB instance (likely FalkorDB), connection config, initial schema with node/relationship types
- **Layer:** infra
- **Problems:** P3, P4
- **Size:** M
- **Depends on:** INF-01, graph schema decision (ADR-002)
- **Enables:** KG-01, KG-02, INP-03
- **Status:** done

### INF-04: File storage setup
- **What:** Storage for original files, generated outputs, brand assets. Could be S3, local, or hybrid.
- **Layer:** infra
- **Problems:** P1
- **Size:** S
- **Depends on:** INF-01
- **Enables:** INP-01, INP-02, INP-05, OUT-04
- **Status:** done
- **Implementation:** Vercel Blob. `lib/storage/blob.ts` — `uploadBlob`, `deleteBlob`, `listBlobs`, `getBlobMetadata`. `BLOB_READ_WRITE_TOKEN` env var required (auto-set by Vercel when Blob store is connected; copy from Vercel dashboard for local dev).

### INF-05: Auth and session management
- **What:** Single-user auth. Simple but present — don't ship without it.
- **Layer:** infra
- **Problems:** None directly (hygiene)
- **Size:** S
- **Depends on:** INF-01
- **Enables:** All output features (gating)
- **Status:** done
- **Implementation:** Auth.js v5, email magic link via Resend. `lib/auth.ts` — config + `signIn`/`signOut`/`auth` exports. `lib/db/schema/auth.ts` — Drizzle adapter tables (`users`, `accounts`, `sessions`, `verificationTokens`). Route handler at `app/api/auth/[...nextauth]/route.ts`. Login page at `app/login/page.tsx`. Middleware gates all routes except `/login` and `/api/auth/*`. Access locked to `ALLOWED_EMAIL` env var. Requires: `AUTH_SECRET` (generate with `openssl rand -base64 32`), `RESEND_API_KEY`, `ALLOWED_EMAIL`, `RESEND_FROM_EMAIL`. Note: `brand_users.userId → users.id` FK not yet added — needs a migration after auth tables are created in Neon.

### INF-06: LLM integration layer
- **What:** API connection to Claude (or other), shared config for model, system prompts, cost tracking. Central so every feature that uses LLM goes through one place.
- **Layer:** infra
- **Problems:** P3, P5
- **Size:** M
- **Depends on:** INF-01
- **Enables:** INP-03, INP-04, OUT-01, OUT-02, OUT-03
- **Status:** done
- **Implementation:** `lib/llm/client.ts` — `anthropic` client + `MODELS` constants (primary: `claude-sonnet-4-6`, fast: `claude-haiku-4-5-20251001`, powerful: `claude-opus-4-6`). `lib/llm/system-prompts.ts` — prompts for `chat`, `contentCreation`, `processing` contexts. Stub chat route at `app/api/chat/route.ts` using `streamText`. `ANTHROPIC_API_KEY` env var required.

---

## STORAGE — KNOWLEDGE GRAPH

### KG-01: Core graph schema
- **What:** Define and implement node types and relationship types per ADR-002. Node types: Idea, Concept, CaseStudy, Vertical, Methodology, Person, Organisation, Event, SourceDocument, ContentItem, Project, FundingEvent, Policy, Country (seed), Date (seed). Relationship types: see ADR-002.
- **Layer:** data
- **Problems:** P3, P4
- **Size:** M
- **Depends on:** INF-03, ADR-002 (schema defined ✓)
- **Enables:** KG-02, KG-03, INP-03
- **Status:** done
- **Schema:** `00-project-management/decisions/adr-002-graph-schema.md`
- **Implementation:** Combined with KG-02. `NodeLabel` + `RelationshipType` union types enforce ADR-002 schema at compile time. See `lib/graph/types.ts`.

### GRF-01: Graph seed data
- **What:** Pre-seed the graph before any ingestion can run: (1) 249 Country nodes from ISO 3166-1 via `pycountry` or equivalent, (2) Date nodes day/month/year hierarchy 2010-01-01 to 2030-12-31, (3) Atomic Lounge Organisation node, (4) canonical register table in Neon for entity resolution. Nothing can be written to the graph without these in place.
- **Layer:** infra / data
- **Problems:** P3, P4
- **Size:** S
- **Depends on:** INF-03 (FalkorDB connection), INF-02 (Neon for canonical register)
- **Enables:** KG-01, KG-02, INP-03 — all graph writes depend on seed data existing
- **Status:** done
- **Notes:** 247 Country nodes, 7,670 day nodes (+ 252 month + 21 year), Atomic Lounge + NicelyPut org nodes. canonical_register table in Neon. Scripts in `02-app/lib/graph/seed/`.

### GRF-02: Graph index mirror in Neon
- **What:** Flat index of all graph nodes and relationships mirrored in Postgres. Two tables: `graph_nodes` (id, label, name, description, source, file_ref, created_at, properties JSONB) and `graph_edges` (id, from_node_id, to_node_id, relationship_type, description, source, created_at, properties JSONB). Written to on every graph write. Enables fast filtering, joining with DNA/source tables, and reporting without graph traversal.
- **Layer:** data
- **Problems:** P3, P4 (also design rule 4: visibility — graph must be inspectable via flat queries)
- **Size:** S
- **Depends on:** INF-02 (Neon), INF-03 (FalkorDB) — mirror is written alongside every FalkorDB write
- **Enables:** KG-02 (query API can use either layer), RET-01 (retrieval can query mirror for speed), PROV-01
- **Status:** done
- **Notes:** `graph_nodes` and `graph_edges` tables live in Neon with indexes and cascade deletes. Drizzle schema in `lib/db/schema/graph.ts`.

### KG-02: Graph query API
- **What:** Backend functions for common graph operations: add node, link nodes, traverse, find connections, search by topic. Used by other features, not directly by the user.
- **Layer:** data
- **Problems:** P3, P4
- **Size:** S
- **Depends on:** KG-01
- **Enables:** OUT-01, DASH-03, INP-03
- **Status:** done (write API) — read/traversal/search deferred to KG-02b
- **Implementation:** `lib/graph/write.ts` — `writeNode()`, `writeEdge()`, `writeBatch()`. `lib/graph/canonical.ts` — `resolveCanonical()`, `registerCanonical()`. `lib/graph/types.ts` — all types. `lib/graph/index.ts` — re-exports. Brief: `01-design/briefs/KG-01-02-graph-write-api.md`.
- **Note:** Read/traversal/search functions (`findConnections`, `traverseFrom`, `searchByTopic`) explicitly deferred — build as KG-02b once INP-03 has populated the graph with real data.

### KG-03: Graph explorer UI
- **What:** Visual or list-based browsing of the knowledge graph. See nodes, relationships, clusters. Click through to detail.
- **Layer:** output
- **Problems:** P3, P4 (also design rule 4: visibility)
- **Size:** L
- **Depends on:** KG-02, DASH-01
- **Enables:** User trust in the system
- **Status:** planned

---

## STORAGE — VECTOR SEARCH

### VEC-01: Vector store setup
- **What:** pgvector extension in Neon (or dedicated store). Embedding pipeline: text in → vector out → stored with reference to source.
- **Layer:** data
- **Problems:** P3, P4
- **Size:** M
- **Depends on:** INF-02, INF-06
- **Enables:** VEC-02
- **Status:** done
- **Brief:** `01-design/briefs/VEC-01-vector-store-setup.md` (approved 2026-04-01)
- **Implementation:** OpenAI `text-embedding-3-small` (1536 dims). `embedding vector(1536)` columns on 10 tables (migration 0007). `lib/llm/embeddings.ts` — `generateEmbedding()`. `lib/retrieval/similarity.ts` — `findSimilar()`. `OPENAI_API_KEY` env var required.

### VEC-02: Semantic search API
- **What:** "Find things similar to X" across all stored text. Returns ranked results with source references.
- **Layer:** data
- **Problems:** P3
- **Size:** M
- **Depends on:** VEC-01
- **Enables:** OUT-01, OUT-02, RET-01
- **Status:** planned

---

## STORAGE — BRAND DNA

> **Prerequisite:** Before any DNA infrastructure is built, we must fully define the data structure/schema for every DNA element. The summaries in the domain model (and the field lists in each feature below) are a starting point, not the final schema. This schema definition step is the first thing to do — it determines the database tables, the form fields, the graph connections, and the skills that create/update these items. Each DNA type will need a dedicated **creation skill** (structured intake) and a separate **update/amend skill** (preserving version history).

### DNA-01: DNA schema and CRUD
- **What:** Postgres tables for all DNA elements (singular + plural). Create, read, update, delete. Versioning so you can see what changed and when.
- **Layer:** data
- **Problems:** P2
- **Size:** M
- **Depends on:** INF-02, INF-00 (brands root schema), **completed schema definitions for all DNA types**
- **Enables:** DNA-02, DNA-03, OUT-02
- **Status:** done
- **Schemas:** `01-design/schemas/` — all `dna-*.md` files now complete (draft)
- **Implementation:** `lib/db/schema/dna/` — one file per type. Migration 0006 applied 2026-04-01. Tables: `dna_brand_intros`, `dna_tone_of_voice`, `dna_tov_samples`, `dna_tov_applications`, `dna_competitor_analyses`, `dna_competitors`, `dna_knowledge_assets`, `dna_offers`, `dna_entity_outcomes`, `dna_platforms`, `prompt_components` (plus earlier: `dna_business_overview`, `dna_brand_meaning`, `dna_value_proposition`, `dna_brand_identity`, `dna_audience_segments`).

### DNA-02: Singular DNA elements
- **What:** UI to view and edit: vision, mission, purpose, values, value proposition, positioning, tone of voice. Rich text with version history.
- **Layer:** output
- **Problems:** P2 (also design rule 4: visibility)
- **Size:** M
- **Depends on:** DNA-01, DASH-01
- **Enables:** OUT-02, OUT-03
- **Status:** planned

### DNA-03: Plural DNA elements — Audience segments
- **What:** CRUD for audience segments. Each segment: name, demographics, psychographics, voice-of-customer statements across problems, desires, objections, beliefs (VOCs), notes, overview, avatar.
- **Layer:** output
- **Problems:** P2, P5
- **Size:** M
- **Depends on:** DNA-01, DASH-01
- **Enables:** OUT-02
- **Status:** done

### DNA-04: Plural DNA elements — Offers
- **What:** CRUD for offers. Each offer: name, description, target audience, key VOCs met, USP, features, outcomes, benefits, pricing, FAQs, bonuses, guarantee, positioning, strategy.
- **Layer:** output
- **Problems:** P2, P5
- **Size:** M
- **Depends on:** DNA-01, DASH-01
- **Enables:** OUT-02
- **Status:** planned

### DNA-05: Plural DNA elements — Methodologies
- **What:** CRUD for methodology summaries. Name, type, description, origin, target audience segment(s), key VOCs met, process, competitors etc. Links to detailed methodology nodes in the knowledge graph.
- **Layer:** output
- **Problems:** P2, P4
- **Size:** M
- **Depends on:** DNA-01, KG-02, DASH-01
- **Enables:** OUT-02, CLIENT-01
- **Status:** planned

### DNA-06: Plural DNA elements — Content pillars
- **What:** CRUD for content pillars. Each: topic, framing, formats, media types, angles, approach, how-you're-different.
- **Layer:** output
- **Problems:** P2, P5
- **Size:** M
- **Depends on:** DNA-01, DASH-01
- **Enables:** OUT-02
- **Status:** parked
- **Note:** Moved to P1 (post-M1). Too large and too interconnected with platforms and ToV to rush. Revisit before M4/M5.

### DNA-07: Plural DNA elements — Platforms
- **What:** CRUD for platform strategies. Each: platform, content formats, constraints, posting strategy.
- **Layer:** output
- **Problems:** P2, P5
- **Size:** S
- **Depends on:** DNA-01, DASH-01
- **Enables:** OUT-02
- **Status:** planned

### DNA-08: Plural DNA elements — Lead magnets
- **What:** CRUD for lead magnets. Each: content summary, structure, strategy, conversion path.
- **Layer:** output
- **Problems:** P2, P5
- **Size:** S
- **Depends on:** DNA-01, DASH-01
- **Enables:** OUT-02
- **Status:** parked
- **Note:** Schema needs more thought before building. Deferred to post-M1. Revisit before M4/M5.

### DNA-09: Tone of voice system
- **What:** Structured tone of voice: rules, parameters (formal↔casual spectrum, etc.), sample texts, contextual variations. Not just a text field — a system that the LLM can consume.
- **Layer:** data + output
- **Problems:** P2, P5
- **Size:** L
- **Depends on:** DNA-01, INF-06, GEN-PROMPTS-01
- **Enables:** OUT-02, OUT-03
- **Status:** planned

### GEN-PROMPTS-01: Generation prompt design and review
- **What:** Design, review, and refine the LLM prompts used to generate structured DNA records from raw inputs. We have legacy prompts to draw on but they need auditing and rewriting to: (a) produce structured JSON output matching current schemas, (b) work within the BigBrain context rather than the old standalone tool context, (c) handle the ToV generation case specifically — which must output dimension scores + descriptions + vocabulary lists, not just prose guidelines.
- **Layer:** cross
- **Problems:** P2, P5
- **Size:** M
- **Depends on:** INF-06, DNA-01
- **Enables:** DNA-09, OUT-01, OUT-02, INP-03
- **Status:** planned
- **Priority note:** The ToV generation prompt is the most complex and highest priority within this — it must produce structured multi-field output. Review existing prompts in `04-documentation/reference/legacy_prompts/` as starting point. The intake/creation prompts for other DNA types (audience segments, offers, etc.) are also in scope here.

### DNA-10: Brand identity storage
- **What:** Store visual identity parameters: colours (with values), fonts, motifs, core assets, logos. File references for assets.
- **Layer:** data
- **Problems:** P2
- **Size:** S
- **Depends on:** DNA-01, INF-04
- **Enables:** OUT-04 (design generation, future)
- **Status:** planned

---

## STORAGE — SOURCE KNOWLEDGE

> **Prerequisite:** As with Brand DNA, the full data schema for each source knowledge type (testimonials, research, statistics, stories, source documents) must be defined before building. Each type needs a **creation skill** for structured intake. Source items are generally immutable once created (unlike DNA which evolves), so the update model is different — additions rather than amendments.

### SRC-01: Source knowledge schema and CRUD
- **What:** Postgres tables for testimonials, own research papers or outputs, statistics, stories, source documents. Items here generally don't change in the same way that strategy does. Tagged, searchable, usable in content.
- **Layer:** data
- **Problems:** P1, P5
- **Size:** M
- **Depends on:** INF-02, **completed schema definitions for all source knowledge types**
- **Enables:** SRC-02, OUT-02
- **Status:** done
- **Implementation:** `lib/db/schema/source.ts`. Migration 0006 applied 2026-04-01. Tables: `src_source_documents`, `src_statistics`, `src_testimonials`, `src_stories`, `src_own_research`.

### SRC-02: Source knowledge library UI
- **What:** Browse, search, filter source knowledge. See where each item has been used (usage tracking).
- **Layer:** output
- **Problems:** P1, P5 (also design rule 4: visibility)
- **Size:** M
- **Depends on:** SRC-01, DASH-01
- **Enables:** OUT-02
- **Status:** planned

---

## STORAGE — CONTENT REGISTRY

### REG-01: Content registry schema
- **What:** Track every piece of content created: what it is, when, which platform, which DNA elements/source knowledge it used, performance data (optional).
- **Layer:** data
- **Problems:** P1
- **Size:** M
- **Depends on:** INF-02
- **Enables:** REG-02, PROV-01
- **Status:** planned

### REG-02: Content registry UI
- **What:** Browse created content. Filter by platform, pillar, date. See provenance chain for each item.
- **Layer:** output
- **Problems:** P1 (also design rule 4: visibility)
- **Size:** M
- **Depends on:** REG-01, DASH-01
- **Enables:** User understanding of output patterns
- **Status:** planned

---

## INPUTS

### INP-01: Krisp transcript ingestion
- **What:** Import Krisp transcripts (file upload or folder watch). Store original, extract metadata (date, participants if detectable).
- **Layer:** input
- **Problems:** P1, P3
- **Size:** M
- **Depends on:** INF-04
- **Enables:** INP-03
- **Status:** planned

### INP-02: Voice note capture
- **What:** Record or upload voice notes. Transcribe (Whisper API or similar). Store original audio + transcript.
- **Layer:** input
- **Problems:** P3 (also design rule 2: capture must be frictionless)
- **Size:** M
- **Depends on:** INF-04, INF-06
- **Enables:** INP-03
- **Status:** planned

### INP-03: Input processing pipeline (LLM)
- **What:** Take raw input (transcript, voice note, document, research) and extract: ideas, topics, key concepts, action items, entities. Link extracted items into the graph. Generate embeddings for vector search.
- **Layer:** input + cross
- **Problems:** P1, P3, P4
- **Size:** XL
- **Depends on:** INF-06, KG-01, VEC-01
- **Enables:** Everything downstream — this is the core engine
- **Status:** done
- **Brief:** `01-design/briefs/INP-03-input-processing-pipeline.md` (approved)
- **Layout:** `01-design/wireframes/INP-03-layout.md` (approved)
- **Notes:** Plain text v1. Two-phase extract/commit. 7 extraction types. Route: `/dashboard/inputs/process`. `extractFromText()` in `lib/processing/extract.ts`, `commitExtraction()` in `lib/processing/commit.ts`. Tags on source documents. Temporal edges always written (document date or commit date). Story subject editable pre-commit.
- **Planned enhancement (A):** LLM-suggested title and tags — after text is pasted, run a fast pre-extraction pass to suggest a title and relevant tags. Pre-populate the metadata fields as editable defaults. Size: S. Depends on: nothing new.
- **Planned enhancement (B):** Inline editing of extracted items before commit — allow text correction directly in the results panel (e.g. fixing "Falcore" → "FalkorDB"). Accept/reject only was a v1 deferral; first real extraction session confirmed this is needed earlier. Size: S–M.
- **Planned enhancement (C):** Topic-clustered results panel — instead of type-first grouping (IDEAS / CONCEPTS / etc.), group by overarching topic first (e.g. "AI Security", "Knowledge Graph Project", "Messy Middle") with type as a secondary grouping within each cluster. One-click cluster deselect so irrelevant sections (e.g. a tangential chat that opened the call) can be excluded at once. Orphan cluster for items that don't fit a topic. Requires LLM to assign a topic label to each item during extraction. Size: M. Depends on: nothing new.
- **Planned enhancement (D):** Extraction performance — time the full extraction request server-side and log it. If consistently >60s, evaluate: (1) parallel extraction by type (7 concurrent smaller requests vs one large structured one), (2) streaming the results panel open as types complete rather than waiting for all 7, (3) switching to a faster model for extraction. First step is instrumentation — measure before optimising.
- **Planned enhancement (E):** Batched FalkorDB commit writes — replace per-node/per-edge queries with UNWIND batches (same pattern as seed scripts). Reduces ~280 sequential round trips to ~10 for a typical transcript. Also needs: commit resumability — if a commit is interrupted mid-way, record what was written so it can be retried without duplicating completed nodes. Size: M.

### INP-04: Quick idea capture
- **What:** Minimal-friction input: text box, voice button, paste. Idea goes straight into the system. Triage happens later.
- **Layer:** input + output
- **Problems:** P3 (also design rule 2: capture ≠ organisation)
- **Size:** M
- **Depends on:** INP-03 (lightweight version), DASH-01
- **Enables:** Reduced ADHD friction
- **Status:** planned

### INP-05: Research document ingestion
- **What:** Upload PDFs, CSVs, JSON, markdown. Type-specific extraction (PDF text extraction, CSV parsing, etc.). Feeds into INP-03 for processing.
- **Layer:** input
- **Problems:** P4
- **Size:** L
- **Depends on:** INF-04, INP-03
- **Enables:** Research compounding
- **Status:** planned

### INP-06: Social media / web content ingestion
- **What:** Save or scrape content from LinkedIn, X, newsletters. Basic metadata (source, date, author). Feeds into INP-03.
- **Layer:** input
- **Problems:** P3, P4
- **Size:** M
- **Depends on:** INF-04, INP-03
- **Enables:** Broader knowledge capture
- **Status:** planned

### INP-07: Input queue and triage UI
- **What:** Dashboard view of incoming items that need processing or review. Ability to tag, prioritise, discard, or promote items. Shows processing status.
- **Layer:** output
- **Problems:** P1 (also design rule 2: organisation happens separately from capture)
- **Size:** M
- **Depends on:** INP-03, DASH-01
- **Enables:** Prevents inbox overwhelm
- **Status:** planned

### INP-08: Krisp meeting auto-classification
- **What:** Maintain a list of recurring meeting patterns (name, participants, schedule, tag conventions). When a Krisp transcript is ingested via INP-01, auto-match it against known patterns and pre-populate title and tags accordingly. Example: transcripts with Demetrius on Mondays → title "Mastermind hotseat — [date]", tags ["mastermind", "coaching"]. Patterns stored as a simple config (JSON or DB table). User can review/correct before processing.
- **Layer:** input
- **Problems:** P1, P3
- **Size:** M
- **Depends on:** INP-01, INP-03
- **Enables:** Hands-off transcript classification; consistent tagging across a meeting series
- **Status:** planned
- **Notes:** Pairs with INP-03's planned title/tag suggestion enhancement. Pattern matching runs first (deterministic); LLM suggestion is the fallback for unrecognised meetings.

---

## AUTOMATION / SCHEDULED JOBS

### AUTO-01: Cron / scheduling infrastructure
- **What:** Job scheduler that can run tasks on a schedule (daily, weekly, custom). Job registry, execution logs, failure alerts. Could be a lightweight internal scheduler or an external service (e.g. cron, cloud scheduler, or app-level like BullMQ/Agenda).
- **Layer:** infra
- **Problems:** P1 (reduces manual overhead), P4 (keeps knowledge flowing without manual triggers)
- **Size:** M
- **Depends on:** INF-01
- **Enables:** AUTO-02, AUTO-03, AUTO-04
- **Status:** planned

### AUTO-02: Krisp transcript batch ingestion
- **What:** Scheduled job (e.g. weekly) to gather new Krisp transcripts from a watched folder or API, run them through INP-03, and surface results in the input queue.
- **Layer:** input + automation
- **Problems:** P1, P3
- **Size:** S
- **Depends on:** AUTO-01, INP-01, INP-03
- **Enables:** Hands-off transcript processing
- **Status:** planned

### AUTO-03: Self-development analysis
- **What:** Scheduled analysis (e.g. weekly) across accountability logs and coaching transcripts. Extracts themes, progress, recurring blockers, patterns. Surfaces insights in dashboard or chat.
- **Layer:** automation + cross
- **Problems:** P3, P4
- **Size:** M
- **Depends on:** AUTO-01, INP-03, RET-01
- **Enables:** Personal development compounding (not just business knowledge)
- **Status:** planned
- **Notes:** Example of a "cron + LLM" pattern that could be replicated for other periodic analyses — e.g. weekly content performance review, monthly strategy health check, research gap detection.

### AUTO-04: Extensible scheduled jobs
- **What:** Framework for adding new scheduled jobs without rebuilding infrastructure. Define a job as: trigger (schedule), input (data source / query), processor (LLM prompt or pipeline), output (where results land). Reusable pattern.
- **Layer:** automation
- **Problems:** All (this is the generalised version)
- **Size:** M
- **Depends on:** AUTO-01, INP-03
- **Enables:** Any future periodic automation
- **Status:** planned

---

## OUTPUTS

### OUT-01: Chat interface
- **What:** Conversational UI with full system access. Text input (voice and image as stretch). Can query knowledge, discuss strategy, generate ad hoc content, run recipes/skills.
- **Layer:** output
- **Problems:** P3, P5
- **Size:** L
- **Depends on:** INF-06, KG-02, VEC-02, RET-01
- **Enables:** OUT-01a, flexible interaction with everything
- **Status:** planned

### OUT-01a: Chat recipes / skills
- **What:** Predefined operations runnable from chat. E.g. "generate a LinkedIn post about [topic] for [audience]", "update my value proposition", "what do I know about [X]?"
- **Layer:** output
- **Problems:** P5
- **Size:** M
- **Depends on:** OUT-01, DNA-01
- **Enables:** Structured use of the chat beyond freeform
- **Status:** planned

### OUT-02: Content creator — single-step
- **What:** Parameter-driven content generation. Select: audience segment, content pillar, offer element, platform, format. Generates one piece of content with tone of voice applied and source knowledge available. Uses template and centralised prompt injections to help with e.g. copywriting, proofing, tone or layout skills.
- **Layer:** output
- **Problems:** P5
- **Size:** L
- **Depends on:** DNA-01 (all DNA types), DNA-09 (tone), SRC-01, INF-06, RET-01
- **Enables:** OUT-02a
- **Status:** planned

### OUT-02a: Content creator — long-form / multi-step
- **What:** Generate sales pages, web pages, proposals, documents. Compositions of DNA elements turned into copy. Template-driven or freeform. Review/edit workflow.
- **Layer:** output
- **Problems:** P5
- **Size:** XL
- **Depends on:** OUT-02
- **Enables:** Complex content production
- **Status:** planned

### OUT-03: Strategy generation and update
- **What:** Generate or refine DNA elements. Multiple trigger paths: (a) via chat — "help me rethink my positioning for [audience]", (b) via forms/dashboard — structured input, (c) **retrieval-informed** — system pulls relevant source knowledge, research, and graph context to suggest or draft strategy updates. E.g. new research on a topic could surface a prompt to revisit a methodology or content pillar. All paths: generates a draft → you approve → DNA updates with version history.
- **Layer:** output
- **Problems:** P2
- **Size:** M
- **Depends on:** OUT-01, DNA-01, DNA-09, RET-01
- **Enables:** Strategy stays alive instead of static
- **Status:** planned

### OUT-04: Design generation (future)
- **What:** Generate graphics, social media visuals using brand identity parameters. Canva MCP, Affinity, or AI image generation.
- **Layer:** output
- **Problems:** P5
- **Size:** XL
- **Depends on:** DNA-10, INF-06
- **Enables:** Visual content production
- **Status:** parked

### OUT-05: Strategy coherence check
- **What:** On-demand (and optionally scheduled) analysis that loads related DNA records and surfaces disconnects and alignment opportunities across the strategy layer. Examples: value prop claims a differentiator not reflected in any offer descriptions; offer outcomes not captured in value prop; positioning claim matched by a competitor in the competitor analysis; content pillars not aligned with defined audience segments. Output: structured report with specific findings and suggested resolutions, surfaced in the dashboard.
- **Layer:** output / cross
- **Problems:** P2 (strategy drift — this is the mechanism that catches it)
- **Size:** M
- **Depends on:** DNA-01, OUT-03, DASH-01
- **Enables:** Strategic confidence — a way to verify the DNA is internally consistent before generating content or updating strategy
- **Status:** planned
- **Note:** Fits naturally as a "Strategy health" view in the dashboard, triggerable on demand. Could also run on a schedule (AUTO pattern). LLM loads relevant DNA records and returns structured JSON findings — no new storage needed beyond what DNA-01 provides.

---

## DASHBOARD

### DASH-01: Dashboard shell
- **What:** App layout, navigation, routing. The container that all dashboard views live in.
- **Layer:** output
- **Problems:** Design rule 4 (visibility)
- **Size:** M
- **Depends on:** INF-01, INF-05
- **Enables:** All dashboard sub-views (DNA-02 through DNA-08, SRC-02, REG-02, KG-03, INP-07)
- **Status:** planned

### DASH-02: Brand DNA overview
- **What:** Single view showing all DNA elements at a glance. Status indicators (complete/draft/empty). Drill-in to edit.
- **Layer:** output
- **Problems:** P2
- **Size:** M
- **Depends on:** DASH-01, DNA-01
- **Enables:** Quick orientation — "where am I strategically?"
- **Status:** planned

---

## CROSS-CUTTING

### INP-09: Context-aware extraction (business-grounded processing)
- **What:** Before running extraction, inject Ellie's Brand DNA (business overview, knowledge assets, audience segments, content pillars) and a summary of previously extracted topics into the extraction system prompt. This lets the LLM make better signal/noise judgements — e.g. recognising that an AI security discussion at the start of a call is tangential to Ellie's work and flagging it as low-relevance rather than extracting it at full confidence. Over time, as more knowledge accumulates, extraction quality improves automatically. Also enables the LLM to merge new extractions with existing graph nodes rather than creating near-duplicates (e.g. recognising "the Messy Middle" has been extracted before).
- **Layer:** input + cross
- **Problems:** P1, P3, P4
- **Size:** M
- **Depends on:** INP-03 (done), RET-01 (for existing knowledge retrieval), DNA-01
- **Enables:** Extraction that gets smarter over time; fewer irrelevant items; better dedup against existing graph; lower review burden
- **Status:** planned
- **Notes:** This is the "learning" behaviour — not ML, just progressively richer context injection. First version can inject DNA only (no retrieval needed). Second version adds a retrieval step to pull relevant existing nodes before extraction.

### RET-01: Unified retrieval layer
- **What:** Single retrieval interface that combines: vector search (semantic), graph traversal (relational), Postgres queries (structured). Returns ranked, deduplicated results with source references. Used by chat, content creator, and anything that needs context.
- **Layer:** cross
- **Problems:** P3, P4, P5
- **Size:** XL
- **Depends on:** KG-02, VEC-02, DNA-01, SRC-01
- **Enables:** OUT-01, OUT-02, quality of all generated output
- **Status:** planned
- **Notes:** This is the second most critical feature after INP-03. The quality of every output depends on how well retrieval works.

### PROV-01: Provenance tracking
- **What:** Every generated output records: which DNA elements, source knowledge items, graph nodes, and research documents informed it. Stored as relationships. Queryable both directions (what informed this output? where has this source been used?).
- **Layer:** cross
- **Problems:** P1
- **Size:** L
- **Depends on:** REG-01, SRC-01, KG-02
- **Enables:** REG-02, SRC-02 (usage views), audit trail
- **Status:** planned

---

## CLIENT PROJECTS (FUTURE)

### CLIENT-01: Client project workspace
- **What:** Scoped project view per client. Own deliverables, research, notes — but connected to the wider graph.
- **Layer:** output
- **Problems:** P4
- **Size:** XL
- **Depends on:** DASH-01, KG-02, DNA-05
- **Enables:** CLIENT-02
- **Status:** parked

### CLIENT-02: Post-project knowledge extraction
- **What:** Structured step after project completion: harvest testimonials, methodology learnings, validated patterns back into main system.
- **Layer:** cross
- **Problems:** P4
- **Size:** L
- **Depends on:** CLIENT-01, SRC-01, KG-02
- **Enables:** Compound learning from client work
- **Status:** parked

---

## DEVELOPMENT SKILLS

> These are Claude Code skills for building the app — not in-app features.
> Full specs in `03-skills/skills-plan.md`. In-app skills (recipes) are in `04-documentation/in-app-skills.md`.
> Skills are listed here so they appear in dependency tracking and milestone planning.

### SKL-01: `feature-brief`
- **What:** Collaborative skill to produce a complete feature brief before any design or build work. Model asks structured questions, human answers, output filed in `01-design/briefs/`.
- **Layer:** meta / process
- **Gate type:** Heavy human-in-the-loop — model asks, human drives
- **Size:** S (to write the skill file)
- **Depends on:** Nothing — first skill to build
- **Enables:** SKL-02, SKL-04 (nothing gets designed or built without a brief)
- **Status:** done

### SKL-02: `layout-design`
- **What:** Design UI/UX for a feature. First instance of a new pattern = full design. Subsequent instances = delta from established template. Output filed in `01-design/wireframes/`.
- **Layer:** meta / process
- **Gate type:** Heavy gate for new patterns; light gate for template adaptations
- **Size:** S (to write the skill file)
- **Depends on:** SKL-01, SKL-03
- **Enables:** SKL-04 (nothing gets built without a layout spec)
- **Status:** done

### SKL-03: `feature-template-check`
- **What:** Before designing, check whether a pattern already exists in `01-design/wireframes/templates/`. Returns match or confirms new pattern needed. Called automatically by `layout-design`.
- **Layer:** meta / process
- **Gate type:** Autonomous with summary
- **Size:** S
- **Depends on:** Nothing
- **Enables:** SKL-02
- **Status:** done

### SKL-04: `feature-build`
- **What:** Implement a feature end-to-end. Reads brief + layout spec + ADRs + existing code, proposes implementation plan, waits for approval, then builds.
- **Layer:** meta / process
- **Gate type:** Hard gate on plan before any code; soft gate on review after
- **Size:** S (to write the skill file — individual build sessions are sized per feature)
- **Depends on:** SKL-01, SKL-02
- **Enables:** All app features
- **Status:** done

### SKL-05: `dna-item-build`
- **What:** Specialised version of `feature-build` for plural DNA item types. Handles first-instance (builds the full pattern + template) vs subsequent instances (adapts template, only fields/labels change).
- **Layer:** meta / process
- **Gate type:** Hard plan gate + soft review gate. First instance gate is heavier.
- **Size:** S (to write the skill file)
- **Depends on:** SKL-04
- **Enables:** DNA-03 through DNA-08 (makes them fast once DNA-03 is done)
- **Status:** planned

### SKL-06: `schema-to-db`
- **What:** Turn an approved schema definition doc from `01-design/schemas/` into Drizzle table definition + migration file. Shows TypeScript and SQL before writing anything.
- **Layer:** meta / process
- **Gate type:** Hard gate — SQL reviewed before any files are written
- **Size:** S
- **Depends on:** Schema definitions in `01-design/schemas/` (prerequisite)
- **Enables:** DNA-01, SRC-01, and any other feature requiring DB tables
- **Status:** done

### SKL-07: `feature-update`
- **What:** Update an existing feature with full context loaded first — brief, layout spec, ADRs, session logs, current code. Prevents changes that violate earlier decisions. Hard gate before and after.
- **Layer:** meta / process
- **Gate type:** Hard gate throughout — context summary reviewed before proposing changes
- **Size:** S
- **Depends on:** SKL-01 (brief must exist for the feature being updated)
- **Enables:** Safe iteration on anything already built
- **Status:** planned
- **Note:** Must include the component registry rule from `feature-build` (ADR-004) — check `components/registry.ts` before creating or modifying any shared component.

### SKL-08: `global-change`
- **What:** Cross-cutting change affecting multiple features. Mandatory blast radius analysis before any execution. Works feature by feature in approved order.
- **Layer:** meta / process
- **Gate type:** Hard gate on blast radius, hard gate on execution order, pause between each feature
- **Size:** S
- **Depends on:** Nothing specific
- **Enables:** Design system updates, API contract changes, naming changes, etc.
- **Status:** planned

### SKL-09: `db-migrate`
- **What:** Run a Drizzle migration against Neon. Shows SQL again (even if already approved in `schema-to-db`), flags destructive operations, recommends Neon branch for risky migrations.
- **Layer:** meta / process
- **Gate type:** Hard gate — no migration without explicit approval
- **Size:** S
- **Depends on:** SKL-06 (migration must be generated first)
- **Enables:** Any DB change
- **Status:** done

### SKL-10: `session-log`
- **What:** Draft a session log at the end of a working session. Covers: what was built, decisions made, what's next, context for future sessions. Saved to `00-project-management/sessions/`.
- **Layer:** meta / process
- **Gate type:** Soft gate — model drafts, human confirms
- **Size:** S
- **Depends on:** Nothing
- **Enables:** Continuity between sessions
- **Status:** done

### SKL-12: `kg-ingest-creator`
- **What:** Skill for generating graph ingestion scripts. Adapted from the SDP project's ingestion skill creator (`04-documentation/reference/kg-ingest-creator/SKILL.md`). Conversational process: receives a data source brief, reviews the file, asks targeted questions, generates a Python ingestion script that writes to both FalkorDB and Neon mirror. Enforces all 12 ingestion rules (ADR-002 / `04-documentation/reference/kg-rules/`): MERGE not CREATE, canonical register lookup, source+file_ref on every node/edge, natural language descriptions, UNWIND batching, validation queries, ingestion log.
- **Layer:** meta / process
- **Gate type:** Human-in-the-loop at brief review and dry-run stages; autonomous for script generation
- **Size:** M (adapting the SDP skill to BigBrain's schema and node types)
- **Depends on:** GRF-01 (seed data must exist), GRF-02 (mirror tables must exist), ADR-002 (node/relationship types)
- **Enables:** INP-03 and all input processing — nothing gets into the graph without an ingestion script
- **Status:** done
- **Notes:** Written from scratch for BigBrain (Node.js + falkordb npm, not Python + REST API). Incorporates FalkorDB Cloud gotchas (no TLS flag, `{ params: {...} }` syntax, UNWIND batching, reconnect pattern). Skill at `03-skills/kg-ingest-creator/SKILL.md`.

### SKL-11: `feature-request`
- **What:** Structure an ad hoc idea into a proper backlog entry. Formats it, checks for conflicts, presents for confirmation, adds to backlog. The ADHD pressure valve — capture without derailing.
- **Layer:** meta / process
- **Gate type:** Light gate — human confirms entry before it's added
- **Size:** S
- **Depends on:** Nothing
- **Enables:** Backlog stays accurate without interrupting flow
- **Status:** done

---

## Summary: Feature count by layer

| Layer | Count | Planned | Parked |
|---|---|---|---|
| Infrastructure | 6 | 6 | 0 |
| Data (KG) | 5 | 5 | 0 |
| Data (Vector) | 2 | 2 | 0 |
| Data (DNA) | 10 | 10 | 0 |
| Data (Source) | 2 | 2 | 0 |
| Data (Registry) | 2 | 2 | 0 |
| Input | 7 | 7 | 0 |
| Automation | 4 | 4 | 0 |
| Output | 8 | 6 | 2 |
| Dashboard | 2 | 2 | 0 |
| Cross-cutting | 2 | 2 | 0 |
| Client (future) | 2 | 0 | 2 |
| Development skills | 12 | 12 | 0 |
| **Total** | **64** | **60** | **4** |

---

## Dependency chain: critical path to MVP

The longest dependency chain (and therefore the thing that determines how quickly you can get something usable) is:

```
Tech stack decision (ADR-001)
  → INF-01 (scaffold)
    → INF-02 (Postgres) + INF-03 (graph) + INF-04 (files) + INF-06 (LLM)
      → INF-00 (brands root schema) + INF-05 (auth/users)
        → KG-01 (graph schema) + VEC-01 (vector setup) + DNA-01 (DNA schema)
          → INP-03 (processing pipeline) + KG-02 (graph API) + VEC-02 (semantic search)
            → RET-01 (unified retrieval)
              → OUT-01 (chat)
```

That's the thinnest vertical slice: infra → storage → processing → retrieval → chat. Everything else branches off from there.

---

## UX POLISH (raised during DNA-03 build)

### UX-01: Dependency-aware empty states
- **What:** Empty states that explain what the current DNA item unlocks and what depends on it. E.g. on audience segments empty state: "Create a segment to be able to create offers and generate targeted content." Contextual — also triggered when arriving at an empty DNA type from a dependent feature (e.g. "To create an offer, you need at least one audience segment — create one first").
- **Layer:** output
- **Problems:** P2, P5
- **Size:** S
- **Depends on:** DASH-01, DNA-01
- **Enables:** Clearer onboarding flow; reduces confusion when DNA types have unfilled dependencies
- **Status:** planned
- **Priority:** P2 — nice to have once core DNA features are built

### UX-02: Creation modal — document upload path
- **What:** Second path in the DNA item creation modal — paste or upload a source document, system infers field values, asks for any missing required fields, then generates. Currently stubbed as "coming soon" in all DNA creation modals.
- **Layer:** input + output
- **Problems:** P1, P2
- **Size:** M
- **Depends on:** SRC-01 (source knowledge schema), INF-06 (LLM integration)
- **Enables:** Faster DNA population from existing documents
- **Status:** planned — blocked on SRC-01 + INF-06

### UX-03: Generation progress UX in creation modal
- **What:** When the LLM generation job is triggered from a DNA creation modal, the modal transitions to a "generating" state — spinner, "This takes about 30 seconds", "Don't close this tab", Cancel button. Currently stubbed.
- **Layer:** output
- **Problems:** P1
- **Size:** S
- **Depends on:** INF-06 (LLM integration)
- **Enables:** Polished generation flow for all DNA types
- **Status:** planned — blocked on INF-06

### UX-04: Segment switcher — select dropdown fallback
- **What:** The segment switcher in DNA plural item detail views is currently a pill strip. If segment names consistently overflow (>24 chars), replace with a `Select` dropdown. Watch item — implement only if the pill strip proves unworkable in practice.
- **Layer:** output
- **Problems:** —
- **Size:** S
- **Depends on:** DNA-03 (audience segments built)
- **Enables:** Better UX with long item names
- **Status:** watch — implement if needed

### UX-05: Input processing panel — review UX
- **What:** The extraction results panel (INP-03) is currently functional but time-consuming to process: items require hovering to evaluate, there's no quick way to scan the shape of what was found, and excluding irrelevant sections requires item-by-item deselection. Improvements needed: (1) topic-clustered layout (see INP-03 enhancement C), (2) better information density — show enough of each item to evaluate without hovering, (3) keyboard shortcuts for fast accept/reject, (4) a "relevance" summary at the top ("3 topics found — 1 may not be relevant to your work"). This is a UX design task before it's a build task — needs a brief and wireframe pass first.
- **Layer:** output
- **Problems:** P1, P3
- **Size:** L
- **Depends on:** INP-03 (done)
- **Enables:** Processing transcripts in under 2 minutes rather than 10+; reduces cognitive load enough to make regular use realistic
- **Status:** planned
- **Priority:** High — the pipeline is only useful if reviewing extractions isn't painful. Current UX works for testing but not for regular use.
