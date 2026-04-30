# BigBrain Feature Backlog

> Registry of all features. This is not a sprint plan — it's an inventory.
> Each feature has dependencies, layer, and which core problem(s) it addresses.
> Status: `planned` → `in-progress` → `done` | `parked` for future milestones
> Last updated: 2026-04-27 (KG-04 politics graph port + KG-05 external data sources working list added per ADR-007)

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
- **What:** Define and implement node types and relationship types per ADR-002. Node types: Idea, Concept, Mission, Vertical, Methodology, Person, Organisation, Event, SourceDocument, ContentItem, Project, FundingEvent, Policy, Country (seed), Date (seed). Relationship types: see ADR-002.
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

### KG-04: UK politics graph port
- **What:** Audit, clean, and port the existing UK politics knowledge graph (~75K nodes, ~347K edges across 20 node types and 44 edge types) into BigBrain's FalkorDB + Neon mirror. Reconcile the politics schema with ADR-002: direct merges for Person, Organisation, Country, Event; new label additions for PolicyPosition, Constituency, Poll, PollWave, Election, RegisteredInterest, DonationTransaction, LoanTransaction (or an agreed subset). Add high-value edge types (DONATION_TO, STOOD_IN, HOLDS_POSITION, SIGNED) to ADR-002; map the long tail to RELATES_TO with a `rel_subtype` property. All ingestion runs through canonical register so MPs/donors who reappear in Atomic Lounge research land on the same node.
- **Layer:** data
- **Problems:** P3, P4
- **Size:** L
- **Depends on:** KG-01, KG-02, GRF-01, GRF-02, SKL-09 (ingestion skill)
- **Enables:** KG-05 (politics graph is the spine the wider ecosystem hangs off), Atomic Lounge three-body analysis
- **Status:** in-progress (audit phase — schema and content review before port)
- **Notes:** External data sources strategy is captured in ADR-007. ADR-002 schema additions for new label/edge types to be drafted as a separate ADR amendment once audit completes. Companies House integration already exists in the source graph and ports with it.

### KG-05: External data sources working list
- **What:** Living document at `04-documentation/reference/external-data-sources.md` capturing the named data sources per category and jurisdiction, with ingestion priority, access method (free / paid / scraped), and current status. Categories per ADR-007: capital flows, regulatory and policy, people and influence, media and narrative, procurement and demand, technical and IP. Jurisdictions: UK, US, EU, Israel (Phase 2). Each source becomes its own ingestion script via SKL-09 when it reaches the front of the queue.
- **Layer:** data / docs
- **Problems:** P3, P4
- **Size:** S (initial document) + ongoing
- **Depends on:** ADR-007 (strategy ✓), KG-04 (politics port establishes the patterns)
- **Enables:** All future external ingestion work — each source is a child task off this list
- **Status:** planned
- **Strategy:** `00-project-management/decisions/adr-007-external-data-sources.md`
- **Notes:** Reports (Goldman, McKinsey, NAO, GAO, etc.) are ingested *on demand only* per ADR-007 §4 — not added to this list as scheduled ingestions. The list tracks structured/repeated sources.

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

### VEC-03: FalkorDB native vector search
- **What:** Store embedding vectors as properties on FalkorDB graph nodes alongside the Neon mirror. Create HNSW vector indexes in FalkorDB. Enables combined semantic + structural Cypher queries — e.g. "find nodes semantically similar to X within 2 hops of node Y" in a single query, which pgvector can't do (requires two separate calls). Every node already has a `description` property; embeddings generated from `name + description` enrich the graph data and make it more meaningful and queryable.
- **Layer:** data
- **Problems:** P3, P4
- **Size:** M
- **Depends on:** VEC-01 (embedding pipeline), KG-02 (graph write API), RET-01 (retrieval layer — validates the two-step pattern before deciding if native search is needed)
- **Enables:** Combined semantic+structural graph queries, faster retrieval at 30k+ nodes, richer graph data
- **Status:** planned
- **Priority:** v2 — evaluate after RET-01 v1 is running. If the two-step pattern (pgvector search → FalkorDB traversal) causes latency issues at scale, this becomes high priority.
- **Reference:** [FalkorDB skills library](https://github.com/FalkorDB/skills) — documents HNSW vector index creation and querying in Cypher.

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
- **Depends on:** DNA-01, DASH-01; AI generation flows additionally depend on OUT-01a, OUT-01b, OUT-01c, UX-14
- **Enables:** OUT-02, OUT-03
- **Status:** in-progress
- **Implementation:** Auto-saving edit views for business overview (two-column with summary card), brand meaning (featured statement blocks with accent border), value proposition (featured statements + SectionCard grouping). Query layer: `lib/db/queries/dna-singular.ts`. Server actions: `app/actions/dna-singular.ts`. Remaining: AI-driven generate/refresh flows — re-architected 2026-04-30 to run as chat skills (see `01-design/briefs/DNA-02-singular-dna-intake.md`). Now blocked on OUT-01a (chat skills infrastructure), OUT-01b (adaptive context pane), OUT-01c (LLM database write tool), and UX-14 (generation gating).

### DNA-03: Plural DNA elements — Audience segments
- **What:** CRUD for audience segments. Each segment: name, demographics, psychographics, voice-of-customer statements across problems, desires, objections, beliefs (VOCs), notes, overview, avatar.
- **Layer:** output
- **Problems:** P2, P5
- **Size:** M
- **Depends on:** DNA-01, DASH-01
- **Enables:** OUT-02
- **Status:** done
- **Note:** Status badge needs moving from left panel to header area (template-level change from DNA-05 layout design, 2026-04-23). Small refactor — next time this page is touched.

### DNA-04: Plural DNA elements — Offers
- **What:** CRUD for offers. Each offer: name, description, target audience, key VOCs met, USP, features, outcomes, benefits, pricing, FAQs, bonuses, guarantee, positioning, strategy. Three-phase creation: quick form → VOC mapping → interlocutor generation. Knowledge asset linking in scope. 5-tab detail view: Positioning, Commercial, Value Gen, Journey, Related Content. Customer journey is structured 5-stage JSONB generated on-demand.
- **Layer:** output
- **Problems:** P2, P5
- **Size:** M
- **Depends on:** DNA-01, DASH-01
- **Enables:** OUT-02
- **Status:** done
- **Brief:** `01-design/briefs/DNA-04-offers.md` (complete 2026-04-28)
- **Implementation:** Migration 0019 added `voc_mapping` + `customer_journey` JSONB, dropped `customer_journey_stage`. Reused VocMapping, EntityOutcomesPanel, StatusBadge from DNA-05. New molecules: `OfferDetailView`, `CreateOfferModal`, `ArchiveOfferModal`, `OfferSwitcher`, `CustomerJourneyPanel`. App-wide LLM resilience added during this build via `generateObjectWithFallback()` in `lib/llm/client.ts` — wraps every `generateObject` call across the app, falls back to `claude-opus-4-7` when primary fails, with auto-recovery for known response anomalies (single-key wrappers, stringified inner JSON).

### DNA-04a: Offers — design system polish
- **What:** UI/UX polish pass on offers — align offer surfaces with the canonical plural-DNA template (audience segments). Token-only styling, no appearance classes in organism layer, atom imports through the molecule layer, spacing and field treatment consistency with audience segments and knowledge assets.
- **Layer:** output
- **Problems:** All (visual consistency)
- **Size:** S
- **Depends on:** DNA-04 (done)
- **Enables:** Consistent DNA item experience
- **Status:** done — closed 2026-04-29
- **Implementation:** Code-comparison audit against `segment-detail-view.tsx` (canonical) produced an 11-item punch list. All shipped. Detail view: ContentPane wrap, `<aside>` + `w-64` + `px-6 py-6` left panel, status badge moved from action slot → subheader, Cards-view `<Link>` → `IconButton`, `SectionHeading` helper extracted, asset-picker rows → `ListItem` + neutral `TypeBadge`, `needsGeneration` banner uses `ActionButton loading` prop, linked-item labels aligned with InlineField. Create-offer-modal: 6 hand-rolled footers → `Modal footer` prop, native `<input>`/`<textarea>` → `Input`/`Textarea` atoms, hand-rolled type-badge fallback → `TypeBadge hue="neutral"`. Customer-journey-panel: Generate/Regenerate `Button` → `ActionButton`. **Value Gen tab refactor:** sticky `InPageNav` with live counts per kind + smooth scroll to anchored sections — addresses unwieldy stacked-sections problem (master-detail considered for future when feature gets heavier use). **TypeBadge molecule extension:** `hue: TagHue | 'neutral'` — absorbs the same hand-rolled fallback in `voc-mapping.tsx` (knowledge-asset detail also benefits via shared panel).

### DNA-05: Plural DNA elements — Knowledge Assets
- **What:** Full CRUD for knowledge assets (methodologies, frameworks, processes, tools, templates). Source-doc-driven creation with VOC mapping and interlocutor generation. Entity outcomes (value gen). Manual graph linking for methodology kind. Brief: `01-design/briefs/DNA-05-knowledge-assets.md`.
- **Layer:** output
- **Problems:** P2, P4
- **Size:** M
- **Depends on:** DNA-01, KG-02, DASH-01
- **Enables:** OUT-02, CLIENT-01, DNA-04
- **Status:** done
- **Implementation:** 5-phase creation modal, 5-tab detail view (Overview, Components & Flow, Audience & VOC, Value, Sources), generation via Gemini Pro with intelligent interlocutor (1-3 follow-up questions). Migration `0016` added `voc_mapping` jsonb + `source_document_ids` uuid[]. New molecules: StatusBadge, OrderedCardList, SourceMaterialsTable, SourceDocPicker, VocMapping, EntityOutcomesPanel, KnowledgeAssetSwitcher, CreateAssetModal, ArchiveAssetModal. Source upload added to `/inputs/sources` ad-hoc to unblock testing (UX-09 raised for proper consolidation). Graph linking deferred from UI; server action retained. Session: `2026-04-24-dna05-knowledge-assets-build-q3p`.

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
- **Status:** done
- **Brief:** `01-design/briefs/DNA-07-platforms.md` (approved 2026-04-23)
- **Implementation:** Five-tab detail view (Strategy, Formats & Output, Ideas, Performance, Sources, Related Content stub). Generation via Gemini Pro with Claude Sonnet fallback when capacity errors hit. Two-path creation modal: "Answer questions" or "Generate from source documents" (follows DNA-05 pattern, uses `SourceDocPicker` + `SourceMaterialsTable` molecules). Three new molecules built: `ExpandableCardList` (JSONB array editor), `StringListEditor` (string list with click-to-edit), `KeyValueEditor` (key-value object editor). Platform switcher pills + archive flow follow dna-plural-item template. Source doc support: new `source_document_ids` column (migration 0020), source doc text injected into generation prompt as primary authority.

### DNA-07b: Channel / ToV / content-type taxonomy consolidation
- **What:** Resolve the four overlapping format taxonomies that currently make channel-specific behaviour fragile: `dna_platforms.platform_type` (medium-grouped: `social`/`owned_content`/`email`/`video`/`audio`/`other`), `dna_tov_applications.format_type`, `dna_tov_samples.format_type`, and (incoming via OUT-02) `content_types.format_type`. Define a canonical three-level taxonomy — `category` → `channel` → `format (format_type + subtype)` — that handles publishing platforms, paid channels, earned channels, in-person, and relationship-based channels under one roof. Enables channel-specific prerequisite checks for content types — so "Podcast episode brainstorm" can require an actual configured podcast channel with strategy/audience/episode catalogue, not just any audio platform. Includes: schema refinement to `dna_platforms` (`category` + `channel` columns; `platform_type` deprecated), backfill of existing rows, alignment of ToV applications/samples format_type vocabulary, alignment of `dna_lead_magnets.kind` vocabulary, and documentation of the canonical vocabulary at `04-documentation/reference/channel-taxonomy.md`. Affects four OUT-02 callsites: picker locks (`prerequisites.channels` + `prerequisites.lead_magnets`), ToV cascade, Topic Engine "platform" category (now "channel"), and content-type prerequisite checks.
- **Layer:** data + cross
- **Problems:** P2, P5
- **Size:** M
- **Depends on:** DNA-07 (done), DNA-09 (done)
- **Enables:** OUT-02 (Phase 1 unblocked — `content_types.prerequisites.channels` can now gate against `dna_platforms.channel`), OUT-02a (long-form, heavily channel-specific), DNA-08 (lead magnet `kind` vocabulary aligned in same pass; UI build still parked)
- **Status:** done — closed 2026-04-27
- **Brief:** `01-design/briefs/DNA-07b-channel-taxonomy.md` (approved 2026-04-27)
- **Layout:** `01-design/wireframes/DNA-07b-layout.md` (approved 2026-04-27)
- **Reference:** `04-documentation/reference/channel-taxonomy.md` (canonical vocabulary — three-level model: `category` → `channel` → `format`)
- **Implementation:** Migration 0022 applied 2026-04-27 (added `dna_platforms.category` + `.channel` NOT NULL, made `platform_type` nullable; backfilled 2 Atomic Lounge rows + 6 ToV samples + 1 ToV application from `social` → `social_short`). TypeScript source-of-truth in `02-app/lib/types/channels.ts` (`Category`, `Channel`, `CATEGORY_HUES`, `CHANNELS_BY_CATEGORY`, `categoryHasField`, `validateCategoryChannelPair`). DS-02 tag tokens extended 6 → 8 (`--color-tag-7: #84D2D6` cool teal for `relationships`, `--color-tag-8: #D68497` dusty rose for `other`); `TypeBadge` hue range widened `1..6` → `1..8`. `ItemSwitcher` extended with optional `getGroup` + `getGroupLabel` props for category-grouped dropdowns (backwards-compatible). New `ChangeCategoryChannelModal` molecule for post-creation category/channel edits. `CreatePlatformModal` reworked: identity step now shows 4×2 grid of category cards on top, with channel select + name + handle revealed inline once a category is chosen. Cards page `/dna/platforms/cards` now category-grouped (canonical category order, empty categories omitted). Detail view: stacked category + channel badges in left panel, "Change category / channel" link, conditional field hiding via `categoryHasField()`, conditional tab visibility via `categoryHasIdeasTab()` / `categoryHasFormatsTab()`, per-category label tweaks (`postingFrequency` → "Cadence" for non-publishing categories, `engagementApproach` → "Follow-up approach" for `relationships`). Sidebar nav label "Platforms" → "Channels" (route stays `/dna/platforms`). Generation prompts updated to use `category` + `channel`. Tangential improvement: `SelectField` now renders option labels (not raw values) in the trigger — benefits every existing usage. **Decisions (2026-04-27):** `dna_platforms` table name intentionally kept (not renamed `dna_channels`) — column-driven semantics; table-name/concept gap is an accepted cost. Validation of `(category, channel)` is app-layer only, not DB-layer. `platform_type` column kept nullable for backwards compat — drop scheduled in DNA-07c follow-up.

### DNA-07c: Drop deprecated `platform_type` column
- **What:** Drop the now-unused `dna_platforms.platform_type` column (deprecated in DNA-07b but kept nullable as an additive-only escape hatch). Removes the legacy taxonomy from the schema entirely. Includes: confirming no app code reads `platform_type` (already true post-DNA-07b), Drizzle schema update to remove the field, migration with `ALTER TABLE ... DROP COLUMN`. Small follow-up housekeeping job — only touch when DNA-07b has baked.
- **Layer:** data
- **Problems:** P2
- **Size:** XS
- **Depends on:** DNA-07b (done), confirmation that DNA-07b has been live without regressions for at least one usage cycle
- **Enables:** Cleaner schema. No downstream features blocked on this.
- **Status:** planned
- **Note:** Intentionally not bundled into DNA-07b. Reasoning: DNA-07b is additive (new columns, new vocab); dropping the old column is the only destructive part of the change. Keeping them in separate migrations means a regression in the new code can be rolled back without losing the deprecated column's data. Once we're confident nothing reads `platform_type` anymore (search the codebase + production logs), this becomes a one-statement migration.

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
- **Status:** done — closed 2026-04-27
- **Implementation:** 3-table schema (base record, samples library, per-format applications) — tables exist since M1. Generation prompt built and tested (Gemini Flash, structured JSON output). 14 writing samples seeded (8 blog, 6 social). Base ToV record generated with dimensions, summary, linguistic notes, emotional resonance, vocabulary. Review/edit UI at `/dna/tone-of-voice` — two-column layout with left summary panel + tabbed right content (linguistics, dimensions, vocabulary, samples, applications). Applications tab built 2026-04-27 (manual create + edit, archive, dimension delta sliders with base→effective readout, do-not-use list). Establishes `tab-master-detail` pattern. **Closed 2026-04-27:** sample add UI shipped (two-step `AddSamplesModal` reusing `SourceDocPicker` for browse/upload then a per-source format/subtype categorise step; pulls `extractedText` into the sample row), and regeneration flow shipped (`Regenerate from samples` button next to Active pill — generates a fresh draft via `generateObject` against the current samples, inserts as `status='draft'` alongside the active row; `Approve draft` promotes draft → active and archives the previous active; `Discard draft` deletes the draft). Generate-from-samples for applications tracked separately as GEN-02.
- **Deferred from DNA-09 scope:** `tonalTags` editing UI on samples and applications, and sample `embedding` generation. Schema fields exist but no UI or write path. Both are used at generation time (per schema: filter samples by `formatType` then `tonalTags` overlap; `embedding` is fallback when tag filtering leaves too many candidates). Revisit when OUT-02 retrieval is wired — decide then whether to add editing UI here, AI-suggest at sample intake, or leave as seed-only curation.
- **Sample coverage gap (surfaced 2026-04-30 by OUT-02 Phase 2):** ToV sample library currently has 14 samples covering only `social_short` (6) and `blog` (8). The newsletter content type has no `newsletter`/`email` samples to cascade against, so `tov_frame` Layer 5 ships without sample writing for newsletter generations. Two options when picked up: (a) add `newsletter`/`email` samples to the library; (b) add `newsletter → blog` to `FORMAT_FALLBACKS` in `02-app/lib/llm/content/bundles.ts` if newsletter rhythm matches blog samples closely enough. Content judgement, not a code issue.

### GEN-PROMPTS-01: Generation prompt design and review
- **What:** Design, review, and refine the LLM prompts used to generate structured DNA records from raw inputs.
- **Layer:** cross
- **Problems:** P2, P5
- **Size:** M
- **Depends on:** INF-06, DNA-01
- **Status:** superseded — closed 2026-04-26
- **Resolution:** DNA generation prompts shipped during DNA-03 / DNA-04 / DNA-05 / DNA-07 / DNA-09 builds (live at `02-app/lib/llm/prompts/`). Output-direction prompt architecture is now scoped under OUT-02 with the eight-layer prompt model — see `01-design/content-creation-architecture.md`.

### GEN-01: Audience segment generation
- **What:** LLM-powered generation flow in the audience segment creation modal. User provides role context + optional biggest problem/desire through a guided conversation; system injects business context (DNA, existing segments), generates full segment profile (psychographics, VOC statements, demographics, summary, avatar), saves directly to detail view. Avatar image generated in parallel. Establishes the generation pattern for all future DNA types.
- **Layer:** output + cross
- **Problems:** P2, P5
- **Size:** M
- **Depends on:** DNA-03 (done), DNA-01 (done), INF-06 (done), INF-04 (done)
- **Enables:** GEN-PROMPTS-01 (first implementation), all future DNA generation features (pattern)
- **Status:** done
- **Brief:** `01-design/briefs/GEN-01-audience-segment-generation.md` (approved 2026-04-20, complete 2026-04-23)
- **Models:** Gemini Pro 3.1 (profile generation), Gemini 3.1 Flash Image Preview (avatar generation)
- **Planned companion:** UC-3 refresh/evolve existing segment — separate brief when ready

### GEN-02: Tone of voice application generation from samples
- **What:** From the Samples tab on the ToV page, select 1+ writing samples and generate a `dna_tov_applications` record from them. LLM compares the samples against the base ToV record (dimensions, summary, linguistic notes) and produces label suggestion + dimensionDeltas + notes + structuralGuidance + doNotUse list as a draft. User reviews and edits in the existing Applications detail pane. Coexists with manual creation — manual = full control, generate = fast first draft.
- **Layer:** output + cross
- **Problems:** P2, P5
- **Size:** M
- **Depends on:** DNA-09 (Applications manual UI — done 2026-04-27), GEN-PROMPTS-01 (in-progress — application-generation prompt pattern should be defined here), INF-06
- **Enables:** Realistic adoption of the Applications feature for non-experts; faster onboarding of per-format voice rules
- **Status:** planned
- **UX direction (needs proper layout pass at brief stage):**
  - Samples tab gains multi-select (checkboxes per row)
  - "Generate application" button appears in tab toolbar when 1+ selected
  - Modal: confirm label (auto-suggested from common subtype/formatType), confirm formatType (auto-suggested), run generation
  - On success, navigate to Applications tab with new draft selected
- **Note:** Sibling to GEN-01 (audience segment generation) — same generate-then-review pattern, different content type. The `tonalTags` + `embedding` fields currently deferred from DNA-09 scope become relevant here at generation time. Address when this is built, not before.

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
- **Status:** superseded — folded into OUT-02 as `library_items` (migration 0028, applied 2026-04-29). The OUT-02 architecture made REG-01's separate registry redundant: `library_items` holds the saved-content snapshot + tags + publish metadata that REG-01 was scoped to track. Schema doc at `01-design/schemas/library-items.md`.
- **Note:** Same supersession pattern as GEN-PROMPTS-01 (closed when OUT-02's eight-layer architecture replaced its scope). Performance/analytics data lives in the sibling `generation_logs` table (migration 0027) — also part of OUT-02.

### REG-02: Content registry UI
- **What:** Browse created content. Filter by platform, pillar, date. See provenance chain for each item.
- **Layer:** output
- **Problems:** P1 (also design rule 4: visibility)
- **Size:** M
- **Depends on:** OUT-02 (`library_items` schema; REG-01 superseded), DASH-01
- **Enables:** User understanding of output patterns
- **Status:** planned

---

## INPUTS

### INP-01: Krisp transcript ingestion
- **What:** Fetches new meetings via Krisp MCP (`search_meetings` + `get_multiple_documents`), resolves participants against `contacts` table, auto-tags via `meeting_types`, and stores transcripts in `src_source_documents` with `inbox_status = 'new'`. No auto-extraction — processing is user-triggered via INP-11.
- **Layer:** input
- **Problems:** P1, P3
- **Size:** M
- **Depends on:** INF-02, INF-06, SRC-01
- **Enables:** INP-11 (multi-modal processing), INP-08 (meeting classification)
- **Status:** done
- **Brief:** `01-design/briefs/INP-01-krisp-ingestion.md` (approved 2026-04-08, updated 2026-04-18 for INP-11)
- **Tables:** `contacts` (canonical people registry with dedup), `meeting_types` (pattern-matched recurring call types), `pending_inputs` (legacy — new flow uses `processing_runs`)
- **Contact dedup:** no emails available from Krisp MCP (names/usernames only); pg_trgm fuzzy name search
- **Trigger:** Claude Code skill `/krisp-ingest` (SKL-10) — runs locally with Krisp MCP auth. Supports daily mode and `backfill N` mode.
- **Data:** 58 transcripts ingested 2026-04-18, spanning 2026-03-03 to 2026-04-17.

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
- **Status:** superseded by IDEA-01
- **Note:** IDEA-01 covers the text capture path. IDEA-02 covers voice. This entry kept for reference.

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
- **Status:** done
- **Notes:** Built 2026-04-14. Queue list with review panel (reuses ResultsPanel from INP-03). Delete support added 2026-04-15. Dedup detection backlogged as INP-10.

### INP-10: Queue-time dedup detection
- **What:** When reviewing pending inputs in the queue, surface indicators showing which extracted items (ideas, concepts, etc.) are similar to items already committed to the graph or present in other pending inputs from the same time window. Helps avoid committing near-duplicate knowledge from repeated conversations on the same topic (e.g. discussing AI-assisted dev workflows with 3-4 different people in the same week). Uses embedding similarity to flag matches. User makes the final call — uncheck dupes before committing.
- **Layer:** input + output
- **Problems:** P3 (disconnected knowledge), P4 (research not compounding — dupes dilute rather than compound)
- **Size:** M
- **Depends on:** INP-07, RET-01 (needs vector similarity search), VEC-01
- **Enables:** Cleaner graph, lower review burden, better signal-to-noise as input volume grows
- **Status:** planned
- **Notes:** Complements INP-09 (context-aware extraction) which tackles dedup at extraction time. This tackles it at review time — belt and braces. First version: compare pending items against committed graph nodes. Second version: also compare pending items against each other within a configurable time window.

### INP-11: Multi-modal processing
- **What:** Redesign the input processing flow: separate storage from processing, let the user decide when and how to process source materials. Four processing modes: individual extraction (current INP-03), batch analysis (cross-cutting patterns across a set), reflective analysis (longitudinal patterns over time), project synthesis (distil learning from a body of work). Three-space UI model: Inbox (cue for new arrivals), Sources (permanent library), Results (review before commit). Krisp scrape stops at storage; processing is user-triggered.
- **Layer:** input + output + cross
- **Problems:** P1, P3, P4 (also design rules 2 and 3 — separate capture from processing; more content must improve signal not noise)
- **Size:** XL
- **Depends on:** INP-03 (done), INP-07 (done), INP-01 (done), SRC-01 (done)
- **Enables:** AUTO-03 (self-development analysis becomes scheduled Mode 3), SRC-02 (Sources section is the library UI), CLIENT-01 synthesis, MISSION-01 synthesis
- **Status:** done
- **Brief:** `01-design/briefs/INP-11-multi-modal-processing.md` (approved 2026-04-17)
- **Implementation:** Sources page at `/inputs/sources` (inbox filter, preview, delete, bulk select + process). Results page at `/inputs/results` (pending/completed split, analysis review panel). API routes: `/api/process/individual`, `/batch`, `/reflective`, `/synthesis`, `/commit-run`. Processing functions in `lib/processing/analyse.ts`. Analysis uses Gemini Pro (`gemini-3.1-pro-preview`).
- **Remaining:** Analysis → graph commit not yet wired (analysis documents stored in `processing_runs.analysis_result` but not written to graph nodes). Individual extraction commit through `processing_runs` needs adjustment (`commitExtraction()` creates new source doc row — needs to use existing one).

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
- **Status:** done
- **Brief:** `01-design/briefs/OUT-01-chat-interface.md` (approved 2026-04-21, complete 2026-04-22)
- **Implementation:** Custom React chat hook (AI SDK v6 has no useChat). Full page at `/chat` + `/chat/[id]` with conversation history panel. Slide-out drawer from top toolbar. Streaming with tool call indicators. Image attach via vision. Markdown rendering. Auto-title via fast model. DB: `conversations` + `messages` tables (migration 0013). Nav restructured: "Content" → "Ask BigBrain".

### OUT-01a: Chat skills infrastructure
- **What:** Skills as a first-class chat primitive. A skill = system prompt + brief + end-goal + structured output schemas (per stage) + optional tool access. Conversations gain `skillType` and `gatheredData` fields so any chat can be resumed in-skill with state intact. Skill registry + runtime that loads the skill brief into the system prompt. Replaces the legacy "specialists"/"recipes" concepts with a single primitive that subsumes both. First consumer: DNA-02 generation flows. Future consumers: DNA refresh flows, OUT-03 strategy generation, OUT-05 coherence check.
- **Layer:** cross
- **Problems:** P2, P5
- **Size:** L
- **Depends on:** OUT-01 (chat infra), INF-06
- **Enables:** OUT-01b (context pane), OUT-01c (DB-write tool), DNA-02 generation, OUT-03, OUT-05
- **Status:** in-progress
- **Brief:** `01-design/briefs/OUT-01a-chat-skills-infrastructure.md` (approved 2026-04-30)
- **Note:** ADR-008 (2026-04-30) confirms skills are a distinct primitive from OUT-02's content-creation prompt architecture. Independent runtime; shared LLM client only. Future bridge (skills calling content-creation pipelines as tools) is parked.

### OUT-01b: Adaptive chat context pane
- **What:** Right-side pane in the chat UI that holds adaptive content per conversation: e.g. a "captured so far" summary during a skill conversation, a referenced topic, content being discussed, etc. Pluggable contract — v1 ships with a single content type (skill state summary), the framework supports more without rewrites. Built so it's adaptive, not exhaustive.
- **Layer:** output
- **Problems:** P5 (also design rule 4: visibility — gathered state must be visible)
- **Size:** M
- **Depends on:** OUT-01a
- **Enables:** DNA-02 generation flows, OUT-03, OUT-02 (potentially — chat-mode variant picker context)
- **Status:** planned

### OUT-01c: LLM database write tool
- **What:** LLM-callable tool for writing to DNA tables (and later: ideas, source knowledge, etc.) with schema awareness — knows table shapes, validates inputs, surfaces required-field gaps. Reusable across chat: used by skills (e.g. brand meaning save) and by ad-hoc chat ("update my value proposition to say…"). Scopes: per-table allowlist + per-field write rules + user confirmation contract for each write.
- **Layer:** cross
- **Problems:** P2 (single source of truth), P5
- **Size:** M
- **Depends on:** OUT-01a, DNA-01
- **Enables:** DNA-02 generation, in-chat DNA editing, OUT-03 strategy update
- **Status:** planned
- **Note:** Security-sensitive — needs scoping rules and a confirmation contract worked out at brief time. Reuses the lessons from existing auto-save on edit views (DS-06 save contract).

### OUT-02: Content creator — single-step
- **What:** Parameter-driven content generation built on the eight-layer prompt model. User picks a content type (filterable catalogue), fills a content-type-specific Strategy panel, drills the Infinite Prompt Engine (1–4 step cascade with multi-select on item steps + free-text augment at any depth), tunes Settings (model, person override, tone variation, variant count), and generates N variants. Variants can be edited inline, saved to library (auto-tagged from selections + user tags), chatted with via inline modal, or regenerated. Saved items appear in `/chat` context picker. Architecture: `content_types` carry catalogue metadata + `topic_context_config`; `prompt_stages` (FK) carry per-stage prompt config across the eight layers; `prompt_fragments` is the unified library (six kinds: persona, worldview, craft, context, proofing, output_contract); `topic_paths` declares the 1–4 step cascade. `generation_runs` is the system-of-record for in-flight + recently-generated work; `library_items` is opt-in registry of explicitly-saved variants.
- **Layer:** output
- **Problems:** P5
- **Size:** XL
- **Depends on:** DNA-01 (all DNA types), DNA-07b (channel taxonomy — done 2026-04-27), DNA-09 (tone), SRC-01, INF-06, RET-01, OUT-01 (chat infra reuse)
- **Enables:** OUT-02a
- **Status:** in-progress — Phases 1 (storage), 2 (runtime), and 3 (seeds) all closed by 2026-04-30. Runtime stack is live and smoke-tested end-to-end against real DNA. Phase 4 (picker + variant editor + library UI) is the remaining workstream. Architecture doc approved 2026-04-26.
- **Architecture:** `01-design/content-creation-architecture.md` (approved 2026-04-26)
- **Reference:**
  - `04-documentation/reference/channel-taxonomy.md` — authoritative vocabulary for `content_types.platform_type` (channel) and `format_type`/`subtype` selection. TS source of truth: `02-app/lib/types/channels.ts`.
  - `04-documentation/reference/prompt-vocabulary.md` (added 2026-04-28) — canonical `${...}` placeholder vocabulary (3 groups, 21 placeholders) + bundle slug vocabulary (11 V1 slugs for `topic_context_config.dna_pulls`). TS source of truth lands at `02-app/lib/llm/content/types.ts` + `bundles.ts` (latter not yet created).
- **Note:** Supersedes GEN-PROMPTS-01 (dead — DNA generation prompts shipped via DNA-03/04/05/07/09 builds; content-output prompt work lands here in the new architecture).
  - **Phase 1 batch 1 (shipped 2026-04-27 → 2026-04-28):** `prompt_fragments` (migration 0021), `content_types` (0023), `prompt_stages` (0024). Eight-layer assembler sketch at `02-app/lib/llm/content/{types,assemble}.ts` validated all four jsonb shapes (`prerequisites`, `strategy_fields`, `topic_context_config`, `craft_fragment_config`) — no schema changes needed.
  - **Phase 1 batch 2 (shipped 2026-04-28 → 2026-04-29):** `topic_paths` (0025, tree table — `parent_id` self-FK + materialised `path` natural key), `generation_runs` (0026, transient state, `expires_at` + `kept` flag drive the 30-day TTL sweep), `generation_logs` (0027, **new table** added in batch — permanent analytics record per run; covers the role of legacy `creation_logs` so cost/token/latency stats live forever even after run sweeps), `library_items` (0028, supersedes REG-01 — markdown snapshot, structured tags jsonb with 8 V1 kinds, GIN index for tag-containment queries, first-class publish metadata).
  - **Phase 3 (shipped 2026-04-29):** seed data — 38 legacy `prompt_fragments` ported verbatim from `Centralised Prompt Data Live.csv` + 4 new fragments authored (2 personas, 2 worldviews); 3 V1 single-step `content_types` (`instagram-caption`, `newsletter-edition`, `brainstorm-blog-posts`) with their stages; 101 `topic_paths` rows covering all 12 step-1 categories from architecture doc Part 3. Blog post + sales page hook deferred to OUT-02a (long-form is multi-step). TS seeders at `02-app/lib/db/seed/seed-out02-{fragments,content-types,topic-paths}.ts`, all idempotent. Phase 2 placeholder-rename punchlist at `04-documentation/reference/legacy-fragment-placeholder-drift.md` (9 of 38 fragments use legacy `${...}` names not in new vocabulary; verbatim port per the brief).
  - **Phase 2 (shipped 2026-04-30):** runtime layer.
    - Real assembler at `02-app/lib/llm/content/assemble.ts` — 8-layer walk + parse→batch-fetch→2-pass-fragment-expand→placeholder pipeline, fail-closed.
    - Fragment registry at `02-app/lib/llm/content/fragments.ts` — by-id (FK pins) + by-slugs (latest active version), batched query.
    - Placeholder resolvers at `02-app/lib/llm/content/placeholders.ts` — 22 placeholders across vocab Groups A/B/C, per-call DNA cache, content-type meta on `AssemblerCtx`.
    - DNA bundle resolvers at `02-app/lib/llm/content/bundles.ts` — all 10 V1 slugs (offer_full/summary, audience_voc/summary, tov_frame, topic_intro, value_proposition, brand_meaning, knowledge_asset, recent_research). `tov_frame` does the channel-taxonomy cascade (subtype → format_type → cross-bucket fallback).
    - Topic engine at `02-app/lib/content/topic-engine.ts` — picker-facing API (`listCategories` / `listChildren` / `checkHasData` / `resolveChain` / `resolveFreeText`); executes all 5 dataQuery kinds; whitelisted filter parser (no SQL eval); per-table label/placeholder projections.
    - Cron sweep at `02-app/app/api/cron/sweep-generation-runs/route.ts` + `02-app/vercel.json` — daily 03:15 UTC delete of expired non-kept runs. Auth via `Authorization: Bearer ${CRON_SECRET}` (added to `.env.example`; must be set in Vercel project env before first scheduled run).
    - Smoke tests at `02-app/lib/llm/content/__smoke__/assemble-smoke.ts`, `02-app/lib/content/__smoke__/topic-engine-smoke.ts`, `02-app/lib/db/__smoke__/sweep-generation-runs-smoke.ts` — all passing. Final prompts: instagram-caption 25,573 / newsletter-edition 9,021 / brainstorm-blog-posts 5,030 chars.
    - Drift fixes shipped during build: `topic` + `topic_platform` fragments to v=2; newsletter skeleton placeholder rename; `${customer_journey_stage}` added to vocab Group A. Remaining drift in 5 unused fragments — see `04-documentation/reference/legacy-fragment-placeholder-drift.md`.
    - Phase 2 punchlist: OUT-02-PL1 (cascade smoke coverage), OUT-02-PL2 (StrategyFieldId vocab tightening), DNA-09 sample-coverage gap (newsletter/email).
  - **Phase 4 (next):** picker UI on top of `topic-engine.ts`, Strategy panel, variant editor, library. Architecture doc Part 4 covers the UX. Now unblocked by Phase 2.

### OUT-02a: Content creator — long-form / multi-step
- **What:** Two-step generation flow for long-form content (sales pages, web pages, proposals). Stage 1 produces a structured blueprint (`{purpose, rationale, messaging, provenance}` per section). User reviews and edits in a richer-than-legacy editor (reorder, per-section regenerate, lock sections, swap DNA per section). Stage 2 generates copy section-by-section. Stage 3 (optional, required for sales pages) is a synthesis pass that reconciles flow against the blueprint. Same eight-layer prompt model and `content_types`/`prompt_stages` schema as OUT-02 — this just enables `is_multi_step = true` and adds the editor + stage handoff. Also includes V2 smarts: AI suggestion from one-line goal in picker, project/mission-aware ranking, retrieval-aware step 4 ranking, cost guardrails.
- **Layer:** output
- **Problems:** P5
- **Size:** XL
- **Depends on:** OUT-02
- **Enables:** Complex content production
- **Status:** planned
- **Architecture:** `01-design/content-creation-architecture.md` (approved 2026-04-26)

### OUT-02-PL1: Topic engine cascade coverage tests
- **What:** Phase 2 punchlist — only the audience cascade has a smoke test (`02-app/lib/content/__smoke__/topic-engine-smoke.ts`). The offer / knowledge_asset / mission / own_research / source_material / brand_proof cascades use the same code paths but have not been verified against real data. Add cascade walkthrough tests for each step-1 category that has data, asserting `prompt_template_resolved` resolves cleanly and feeds the assembler without unresolved `${...}` tokens. Optional: parameterise the existing audience smoke to drive the other cascades.
- **Layer:** output
- **Problems:** P5
- **Size:** S
- **Depends on:** OUT-02 Phase 2 (done)
- **Enables:** Confidence when adding offer-driven / methodology-led content types in OUT-02 Phase 4 or beyond
- **Status:** planned
- **Origin:** OUT-02 Phase 2 session 2026-04-30 (`2026-04-30-out02-phase2-runtime-x4q`).

### OUT-02-PL2: StrategyFieldId vocabulary tightening
- **What:** Phase 2 punchlist — `02-app/lib/llm/content/types.ts`'s `StrategyFieldId` union is missing the `platform` value used by seed `content_types.strategy_fields` (newsletter-edition, brainstorm-blog-posts). The placeholder resolver for `${platform_name}` works around it via a type cast on `inputs.strategy`. Decide between: (a) extend the union to include `platform` (simplest); (b) rename to `platform_id` to match other `*_id` fields and update the seeds. Either way, drop the cast in `placeholders.ts`.
- **Layer:** output
- **Problems:** P5
- **Size:** XS
- **Depends on:** OUT-02 Phase 2 (done)
- **Enables:** Type-safe strategy field handling
- **Status:** planned
- **Origin:** OUT-02 Phase 2 session 2026-04-30 (`2026-04-30-out02-phase2-runtime-x4q`).

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
- **Status:** in-progress
- **Brief:** `01-design/briefs/DASH-01-dashboard-shell.md` (approved 2026-04-12)

### DS-01: Design system
- **What:** Establish the molecule component layer, token system, and design-system skill to ensure visual consistency before further feature builds. Refactor existing rough components (PageHeader, ContentPane, InlineField, SectionCard) and build missing molecules (SectionDivider, TabbedPane, InPageNav, PageChrome). Fix diagnosed visual issues (zone separation, field definition, sidebar dividers, button padding).
- **Layer:** cross
- **Problems:** All (visual consistency underpins every output)
- **Size:** L
- **Depends on:** DASH-01 (shell complete — components to refactor exist)
- **Enables:** DASH-01 → done, DNA-02 and all future features (consistent molecule layer)
- **Status:** in-progress
- **Brief:** `01-design/briefs/DS-01-design-system.md` (approved 2026-04-12)
- **Spec:** `01-design/design-system.md`
- **Skill:** `.claude/skills/design-system/SKILL.md`

### DS-02: Semantic colour tokens + status & type molecules
- **What:** Add **state tokens** (`--color-success`, `--color-warning`, `--color-error`, `--color-info` — each with `-bg` and `-foreground` variants, 12 total) and **tag tokens** (`--color-tag-1`..`-6` — desaturated palette sympathetic to sage, each with `-bg` and `-foreground` variants, 18 total). Finalise the existing `StatusBadge` molecule (currently violates the design system by hardcoding `bg-amber-100 text-amber-800` etc.) and introduce a new `TypeBadge` molecule for category differentiation. Migrate all 60 hardcoded named-Tailwind-colour instances (`green-*`, `amber-*`, `emerald-*`, `red-*`, `blue-*`, `purple-*`, `rose-*`, `orange-*`) across ~30 organism files. Drop all `dark:` overrides as part of migration (no dark-mode story exists for the rest of the app). All-in-one migration.
- **Layer:** cross
- **Problems:** All (visual consistency)
- **Size:** M
- **Depends on:** DS-01 (done)
- **Enables:** DS-04 (form controls consume tokens), DS-05 (button molecules consume state tokens for destructive variants), all future state styling. Highest leverage of foundation programme.
- **Status:** done (2026-04-25)
- **Brief:** `01-design/briefs/DS-02-semantic-tokens-status-and-type-molecules.md` (complete 2026-04-25)
- **Layout:** `01-design/wireframes/DS-02-layout.md`
- **Audit:** `00-project-management/foundation-audit-2026-04-25.md` § 1
- **Priority:** High — first foundation entry. Lowest risk, highest leverage. **Done.**

### DS-03: Spec backfill for unspecced molecules
- **What:** Write specs for the 42 registered molecules currently lacking design-system spec entries (after DS-02/04/09 closed some gaps). Tiered depth: 19 full specs (Modal + structural + editor primitives + chat); 18 light specs (feature-coupled + create modals + utility); 1 shared spec covering 4 archive modals. Rewrite the 8 existing DS-01-era full specs in DS-02-style format for consistency. Two file moves: `OfferDetailView` → `02-app/app/(dashboard)/dna/offers/[id]/offer-detail-view.tsx` (organism layer, removed from registry); `ConfidenceBadge` → `02-app/components/confidence-badge.tsx` (proper molecule home). After DS-03, `npm run check:design-system` reports 0 missing-spec warnings.
- **Layer:** cross
- **Problems:** All (the gate cannot enforce what isn't specified)
- **Size:** L
- **Depends on:** DS-02 (tokens), DS-04 (form-control molecules referenced in modal specs), DS-09 (ItemSwitcher; switcher entries already removed)
- **Enables:** Real enforcement of the design-system gate going forward. Foundation programme step 3.
- **Status:** done (2026-04-27)
- **Brief:** `01-design/briefs/DS-03-spec-backfill.md` (complete 2026-04-27)
- **Layout:** `01-design/wireframes/DS-03-layout.md`
- **Audit:** `00-project-management/foundation-audit-2026-04-25.md` § 3
- **Priority:** High — documentation work but unblocks all future drift prevention. **Done.**

### DS-04: Form controls standardisation
- **What:** Introduce field-control molecules covering selects, sliders, checkboxes, and (TBD) cell-context inputs. Migrate 9 native `<select>` uses, 2 inline shadcn `Select` uses, 4 `<input type=checkbox>` uses, and 2 (soon 6) `<input type=range>` uses to molecules. Audit-flagged 18 raw `<input>` and 14 raw `<textarea>` uses — many are legitimate cell contexts; brief decides per-file. Phase 1 unblocks DNA-09 Applications tab. Renamed from UX-10 (which was a collision; UX-10 is taken).
- **Layer:** cross
- **Problems:** All (visual + behavioural consistency)
- **Size:** L
- **Depends on:** DS-02 (semantic tokens), DS-01 (done)
- **Enables:** DNA-09 Applications (needs `SelectField` + zero-centred `SliderField`); consistent form behaviour across all editable surfaces
- **Status:** done (2026-04-27)
- **Brief:** `01-design/briefs/DS-04-form-controls-standardisation.md` (complete 2026-04-27)
- **Layout:** `01-design/wireframes/DS-04-layout.md`
- **Audit:** `00-project-management/foundation-audit-2026-04-25.md` § 1
- **Priority:** High — was blocking DNA-09. **Done.**

### DS-05: Button composition molecules
- **What:** Build `IconButton` (icon-only button with optional tooltip + optional Link rendering) and `ActionButton` (icon + label primary action with optional tooltip / Link / loading state). Migrate ~21 direct `Button` atom imports across organism files (worst offenders: platform-detail-view, segment-detail-view, mission-workspace, project-workspace). Eliminate 3 Tooltip-wrapping-Button imports (folded into IconButton). **Scoped to buttons only** — DropdownMenu (3 imports), Badge (4 imports), and DS-04-deferred form-control imports stay; tracked as known carrythrough.
- **Layer:** cross
- **Problems:** All (visual consistency)
- **Size:** M
- **Depends on:** DS-02 (tokens), DS-03 (specs precede new molecules per gate; existing molecule specs documented for cross-reference)
- **Enables:** Header / section / list-action buttons stop drifting. Atom-import warnings drop ~41 → ~10. Remaining warnings are explicitly out-of-scope (DropdownMenu/Badge/form-control deferrals).
- **Status:** done (2026-04-27)
- **Brief:** `01-design/briefs/DS-05-button-composition-molecules.md` (complete 2026-04-27)
- **Layout:** `01-design/wireframes/DS-05-layout.md`
- **Audit:** `00-project-management/foundation-audit-2026-04-25.md` § 3
- **Priority:** Medium — biggest atom-import offender by count. **Done.** Atom imports 41 → 20 (carrythrough: Badge × 4, DropdownMenu × 3 + render Buttons × 3, DS-04 deferrals).

### DS-06: Save contract definition + migration
- **What:** Document a canonical save contract in the design system: which trigger (onBlur+debounce / onMouseUp / form submit / explicit button) and which feedback (inline badge / debounced toast / spinner) for each surface type. Migrate the worst drift hotspots: Value Proposition differentiators (currently silent `onChange` — users can't tell saves persisted), Tone of Voice (4 patterns on one page), Brand Meaning value cards (silent textareas). Extract duplicate debounced-toast logic from `inline-field.tsx:11-17` and `ideas-list.tsx:10-17` into a shared utility. Adds new `ListRowField` molecule for inline-list-row text editing (Differentiators, Alternatives, Brand Meaning values).
- **Layer:** cross
- **Problems:** P1 (visibility — users must trust their edits saved)
- **Size:** M
- **Depends on:** DS-04 (so new form controls land with the contract baked in)
- **Enables:** Coherent save UX across the app; absorbs UX-07 (autosave feedback consistency) which is a subset of this work.
- **Status:** done (2026-04-27)
- **Brief:** `01-design/briefs/DS-06-save-contract.md` (approved 2026-04-27)
- **Layout:** `01-design/wireframes/DS-06-layout.md` (approved 2026-04-27)
- **Audit:** `00-project-management/foundation-audit-2026-04-25.md` § 2
- **Priority:** Medium — behavioural drift, less visible than appearance drift but more confusing in daily use. **Done.**
- **Note:** UX-07 (autosave feedback consistency) closed as superseded by this work.

### DS-07: Modal / list / popover molecules
- **What:** Build the structural molecules that absorb the remaining appearance drift. `ModalFooter` (or extend `Modal` with a `footer?` prop) — covers ~11 archive/create modal files each rolling their own `flex justify-end gap-2 pt-2`. `ListItem` / `RowItem` — covers ~12 files inlining row padding, hover states, dividers. `FloatingMenu` (or wrap shadcn Popover) — covers ~6 files hand-rolling `absolute right-0 top-8 z-50 ...shadow-[var(--shadow-raised)]` (ideas-list, entity-outcomes-panel, mission-workspace). Also: enforce `EmptyState` and `SectionDivider` usage everywhere.
- **Layer:** cross
- **Problems:** All (visual consistency)
- **Size:** L
- **Depends on:** DS-02, DS-03
- **Enables:** Closes out the remaining ~30 organism files with appearance-class drift. Last leg of the foundation programme.
- **Status:** done (2026-04-28)
- **Audit:** `00-project-management/foundation-audit-2026-04-25.md` § 1
- **Priority:** Medium — bulk migration; do after the higher-leverage DS-02/03/04/05 land.

### DS-08: Skill enforcement gap analysis
- **What:** Investigate why the design-system gate (skill `design-system` Mode A: "no molecule without a spec") was bypassed for 44 of 51 registered molecules. Review the `feature-build`, `layout-design`, `feature-template-check`, and `design-system` skills for: (a) where the gate should fire, (b) why it didn't, (c) whether the gate is advisory or hard, (d) what the recovery path is when a feature is mid-build and a missing molecule is discovered. Produce a remediation plan: skill changes, hook additions, or workflow changes that prevent the same drift returning after the foundation programme lands.
- **Layer:** cross / process
- **Problems:** Meta — the foundation programme is wasted effort if drift returns
- **Size:** S
- **Depends on:** None — can run in parallel with DS-02/03
- **Enables:** Lasting enforcement after foundation work lands.
- **Status:** in-progress (this conversation, 2026-04-25)
- **Priority:** High — must precede new feature builds that touch UI.

### DS-09: Page-chrome switcher unification
- **What:** Replace the four near-identical pill-strip switcher molecules (`AudienceSegmentSwitcher`, `PlatformSwitcher`, `KnowledgeAssetSwitcher`, `OfferSwitcher` — ~40 LOC each, ~163 LOC total) with a single generic `ItemSwitcher` molecule rendered as a compact dropdown. Long item names overflow the pill strip; a select-shaped switcher handles them cleanly via the dropdown. Sits in the PageChrome `subheader` slot (same place as the current pill strip — no PageChrome API change). Uses base-ui Select internally for keyboard nav and accessibility. Link-based navigation (consumer passes `getHref`). Consumer pre-filters items to "active" (the four switchers each had different active rules — that responsibility moves to the consumer). Removes 4 specs from DS-03's queue.
- **Layer:** cross
- **Problems:** All (visual + behavioural consistency); P5 (translation friction — long names readable in dropdown)
- **Size:** S
- **Depends on:** DS-04 (uses base-ui Select; not the SelectField molecule directly — ItemSwitcher is its own molecule with simpler internals since it's navigation, not value-editing)
- **Enables:** Unblocks DS-03 spec backfill (3 fewer null entries to write); cleaner subheader layout for all DNA detail views.
- **Status:** done (2026-04-27)
- **Brief:** `01-design/briefs/DS-09-page-chrome-switcher-unification.md` (complete 2026-04-27)
- **Layout:** `01-design/wireframes/DS-09-layout.md`
- **Priority:** Medium — sequence: DS-04 → DS-09 → DS-03. **Done.**

### DS-10: Compact status pill molecule
- **What:** Build a `StatusPill` (or extend `StatusBadge` with a `size` prop) for the smaller status-pill use case found on cards/list views, where the existing `StatusBadge` (`px-2.5 py-0.5 text-xs`) is too big and consumers hand-roll smaller `bg-warning-bg`/`bg-info-bg`/`bg-muted` pills with `px-1.5 py-0.5 text-[10px]`. Migrate hand-rolled pills on the offers cards page (Draft / Paused / Retired — `02-app/app/(dashboard)/dna/offers/cards/page.tsx:113-125`) and audit other cards/list pages for the same pattern.
- **Layer:** cross
- **Problems:** All (visual consistency)
- **Size:** XS
- **Depends on:** DS-02 (semantic state tokens — already in use by the hand-rolled pills, no new tokens needed)
- **Enables:** Consistent status-pill treatment across cards/list contexts. Closes a small drift surfaced during DNA-04a (2026-04-29).
- **Status:** planned
- **Note:** Surfaced during DNA-04a code audit. Not pulled into DNA-04a because StatusBadge's read-only mode renders at a noticeably different size — a proper smaller variant is the right call. Likely a small extension to StatusBadge (add `size?: 'sm' | 'xs'`) rather than a new molecule.

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
- **What:** Single retrieval interface that combines: vector search (semantic), graph traversal (relational), Postgres queries (structured). Returns ranked, deduplicated results with source references. Exposed to chat LLM as tools (`search_knowledge`, `get_brand_dna`, `get_source_knowledge`, `explore_graph`). Designed to scale to 30k+ nodes and adapt to schema changes (new node types, relationship types, data sources).
- **Layer:** cross
- **Problems:** P3, P4, P5
- **Size:** XL
- **Depends on:** KG-02, VEC-02, DNA-01, SRC-01
- **Enables:** OUT-01, OUT-02, INP-09, INP-10, OUT-05, quality of all generated output
- **Status:** in-progress
- **Brief:** `01-design/briefs/RET-01-unified-retrieval.md` (approved 2026-04-20)
- **Notes:** This is the second most critical feature after INP-03. The quality of every output depends on how well retrieval works. 8 use cases identified. Includes embedding generation at write time (change to `writeNode()`). FalkorDB native vector search deferred to VEC-03.

### PROV-01: Provenance tracking
- **What:** Every generated output records: which DNA elements, source knowledge items, graph nodes, and research documents informed it. Stored as relationships. Queryable both directions (what informed this output? where has this source been used?).
- **Layer:** cross
- **Problems:** P1
- **Size:** L
- **Depends on:** REG-01, SRC-01, KG-02
- **Enables:** REG-02, SRC-02 (usage views), audit trail
- **Status:** planned

---

## PROJECTS & MISSIONS

### ORG-01: Organisations table
- **What:** Postgres table for organisations (companies, institutions, government bodies). Clients link here. Contacts link here (future migration from free-text field). Graph Organisation nodes mirror here.
- **Layer:** data
- **Problems:** P4
- **Size:** S
- **Depends on:** INF-02
- **Enables:** CLIENT-01, MISSION-01
- **Status:** done
- **Brief:** not required (simple schema, defined in CLIENT-01 brief)
- **Implementation:** `lib/db/schema/projects.ts` — `organisations` table. Migration 0017 applied 2026-04-23.

### CLIENT-01: Client project workspace
- **What:** Knowledge container for client engagements. Links to client organisation, holds brief/scope, tracks status, connects to missions/inputs/content/graph. Not a project management tool — tasks and deliverables stay in Notion.
- **Layer:** output
- **Problems:** P4
- **Size:** L
- **Depends on:** DASH-01, KG-02, ORG-01
- **Enables:** CLIENT-02, MISSION-01 (optional link)
- **Status:** done
- **Brief:** `01-design/briefs/CLIENT-01-client-projects.md`
- **Layout:** `01-design/wireframes/CLIENT-01-layout.md`
- **Implementation:** Schema in `lib/db/schema/projects.ts` (7 tables). Queries in `lib/db/queries/client-projects.ts` + `organisations.ts`. Actions in `app/actions/client-projects.ts`. UI: list at `/projects/clients`, workspace at `/projects/clients/[id]`. New molecules: `ItemLinker`, `CreateProjectModal`. Dashboard "Current work" wired. Graph node creation deferred as enhancement.

### MISSION-01: Research missions
- **What:** Bounded research investigations with thesis, phase lifecycle, and linked knowledge. Clusters inputs, stats, ideas, and content around a specific question. Can be standalone or linked to a client project. Maps to `Mission` graph node type (ADR-002).
- **Layer:** output
- **Problems:** P4
- **Size:** L
- **Depends on:** DASH-01, KG-02, ORG-01
- **Enables:** Compound research, content production from investigations
- **Status:** done
- **Brief:** `01-design/briefs/MISSION-01-research-missions.md`
- **Layout:** `01-design/wireframes/MISSION-01-layout.md` (project-workspace template adaptation)
- **Implementation:** Migration 0014 (missions, verticals, 4 join tables, mission_phase enum). List at `/projects/missions` with phase filter pills. Workspace at `/projects/missions/[id]` — editable name, thesis (autosave), phase selector, verticals (chips + combobox with inline create), linked contacts/inputs/stats (search + link/unlink). Create modal. Dashboard "Current work" integration. Graph node auto-creation deferred to v2. Client project link deferred to CLIENT-01 UI build. Ideas & Content sections stubbed.

### IDEA-01: Ideas / quick capture
- **What:** System-wide capture for thoughts, questions, and sparks. Lightbulb button in top toolbar, always visible. Text-only, minimal fields, fast capture. Ideas list lives as a tab in Inputs section at `/inputs/ideas`. Separate from graph Idea nodes — lightweight placeholders, not processed inputs.
- **Layer:** cross
- **Problems:** P3, P4
- **Size:** M
- **Depends on:** DASH-01
- **Enables:** MISSION-01 (idea tagging), CLIENT-01 (idea tagging)
- **Status:** done
- **Brief:** `01-design/briefs/IDEA-01-quick-capture.md`
- **Layout:** `01-design/wireframes/IDEA-01-layout.md`
- **Implementation:** `ideas` table (migration 0015) + polymorphic `idea_tags` table (migration 0018) for tagging to any entity type (missions, client_projects, offers, knowledge_assets, audience_segments). Capture modal has idea/question type toggle + ⌘+Enter shortcut + optional `autoTag` for contextual capture. Ideas list page at `/inputs/ideas` with two-dimensional filters (status + type), inline editing, optimistic delete with undo toast, full tag picker. `IdeasPanel` molecule embeds the full experience in mission and client project workspaces with a "This [entity]" / "All ideas" tab split and one-click Link button for quick context tagging.

### IDEA-02: Voice capture for ideas
- **What:** In-app audio recording + transcription for voice ideas. Record a voice note, auto-transcribe, save as idea. Currently using SuperWhisper externally — this brings it in-app.
- **Layer:** cross
- **Problems:** P3
- **Size:** M
- **Depends on:** IDEA-01
- **Enables:** Frictionless voice capture from any device
- **Status:** parked

### IDEA-03: AI-surfaced ideas
- **What:** AI skills that traverse the graph or analyse data to auto-generate ideas. Ideas created with `source: ai_surfaced`. Includes: graph gap detection, synthesis suggestions, connection surfacing. Also: "select text in AI chat response → add as idea" UX.
- **Layer:** cross
- **Problems:** P3, P4
- **Size:** L
- **Depends on:** IDEA-01, RET-01 (unified retrieval)
- **Enables:** System-generated insights, spark feed
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
| Data (DNA) | 11 | 11 | 0 |
| Data (Source) | 2 | 2 | 0 |
| Data (Registry) | 2 | 2 | 0 |
| Input | 7 | 7 | 0 |
| Automation | 4 | 4 | 0 |
| Output | 10 | 8 | 2 |
| Dashboard | 2 | 2 | 0 |
| Cross-cutting | 3 | 3 | 0 |
| Client (future) | 2 | 0 | 2 |
| Development skills | 12 | 12 | 0 |
| **Total** | **68** | **64** | **4** |

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

### UX-06: Tab and panel design consistency
- **What:** Establish canonical tab variant and left-panel pattern before building more tabbed content. Three issues found during DNA-09 build: (1) ToV tabs render differently in style to audience segments tabs — need one canonical tab treatment, (2) left panels on both audience segments and ToV pages lack proper visual distinction from the main content area, (3) field label treatment is inconsistent between pages. Fix requires a DS-01 design system pass to define these patterns as molecules, then apply to both existing pages.
- **Layer:** output
- **Problems:** All (visual consistency underpins every output)
- **Size:** M
- **Depends on:** DS-01 (design system spec must define the canonical patterns)
- **Enables:** DNA-02 (remaining), DNA-04, DNA-05, DNA-07, and any future tabbed or panel-based views
- **Status:** done
- **Priority:** High — blocks all further DNA UI builds. Do before DNA-04/DNA-05.
- **Note:** DS-01 already lists TabbedPane as a missing molecule. This entry captures the specific inconsistencies found in practice so they're not lost. The fix is part of DS-01 execution, but the problems are concrete enough to track separately.
- **Implementation:** All three issues resolved: (1) TabbedPane molecule established as canonical tab treatment, applied to both audience segments and ToV pages. (2) Left panels use consistent `bg-muted/30` with `border-r border-border/40` for visual distinction. (3) InlineField label spacing fixed — floating label nudged down (`-top-2`), field spacing increased with `mt-2` on outer wrapper.

### UX-07: Autosave feedback consistency
- **What:** Autosave "Saved"/"Failed" indicators are rendered inconsistently across features. Three different patterns exist: (1) InlineField molecule — `text-[10px] text-emerald-600` inline with label text, top-left of field. (2) Client projects workspace — save text in top-right corner of the section card action slot. (3) Audience segments — debounced toast notification AND inline text next to the field label. Needs a single canonical pattern applied everywhere. Recommend: InlineField's inline-with-label approach as the default, since it's the most established molecule. Toast notifications for save feedback should be removed — they add noise without information that the inline indicator doesn't already provide.
- **Layer:** output
- **Problems:** All (visual consistency)
- **Size:** S
- **Depends on:** DS-01 (done)
- **Enables:** Consistent autosave UX across all editable views
- **Status:** closed — superseded by DS-06 (done 2026-04-27). The foundation audit found broader save-pattern drift; this entry was one slice. The canonical save contract is now documented in `01-design/design-system.md § Save contract` and the lib lives at `02-app/lib/save-feedback.ts`.
- **Priority:** P2 — cosmetic inconsistency, not blocking. Fix during next design polish pass.
- **Raised during:** MISSION-01 build (2026-04-23)

### UX-12: VOC mapping index resilience
- **What:** VOC mapping on offers (and potentially other DNA types) stores array indexes into audience segment VOC arrays. If VOC statements are reordered, edited, or deleted on the audience segment, the indexes can become stale. Improvement: store a snapshot of the statement text alongside the index as a comparator. On load, compare stored text against current text at that index — surface [updated] or [removed] flags with greyed-out styling. Enables the mapping to degrade gracefully as audience segments evolve.
- **Layer:** output
- **Problems:** P2
- **Size:** S
- **Depends on:** DNA-04
- **Enables:** Reliable long-term VOC mapping across DNA types
- **Status:** planned
- **Priority:** Low — v1 validates indexes on load and shows "(statement removed)" for out-of-range. This is the upgrade path.

### UX-08: Funnel Gen — sales funnel generation from offers
- **What:** Generate a sales funnel view from existing offers — how offers ladder together, entry points, upsell paths, gaps in the value ladder. Lightweight generation feature, not a full funnel builder. Could live as a dashboard view or a generation action from the offers list.
- **Layer:** output
- **Problems:** P2, P5
- **Size:** M
- **Depends on:** DNA-04 (offers must exist with customer journeys)
- **Enables:** Strategic visibility across the offer portfolio
- **Status:** planned
- **Priority:** Low — nice-to-have once multiple offers exist with customer journeys populated.

### UX-09: InPageNav consistency audit
- **What:** Audit all tabbed detail views to ensure every tab with 2+ sections uses the `InPageNav` molecule with the canonical sticky-nav + scrolling-content pattern. The molecule now includes its own positioning (`w-36 shrink-0 self-start sticky top-0`) — no wrapper div needed. Any view that manually positions InPageNav or uses a different scroll pattern must be migrated. Pattern documented in `dna-plural-item-template.md` and `design-system.md`.
- **Layer:** output
- **Problems:** All (visual and interaction consistency)
- **Size:** S
- **Depends on:** DS-01 (done)
- **Enables:** Consistent section navigation across all DNA detail views and any future tabbed content
- **Status:** done
- **Priority:** High — inconsistency here breaks the scroll UX.
- **Raised during:** DNA-07 build (2026-04-23)
- **Implementation:** InPageNav molecule updated to include sticky positioning. Wrapper divs removed from all three consumers (audience segments, knowledge assets, platforms). Template and design system spec updated. All future uses of InPageNav will get correct behaviour automatically.

### UX-13: Inputs/Sources consolidation
- **What:** The `/inputs/sources` page and the broader `/inputs` section need rethinking. Currently Sources is under Inputs but functions as a standalone source document library. File upload was added ad-hoc (DNA-05 unblock). Needs: (1) consolidate or clarify the relationship between Inputs (queue/process/results) and Sources (library), (2) proper upload UX with drag-and-drop, type detection, and text extraction pipeline, (3) decide whether Sources should be top-level nav or stay under Inputs.
- **Layer:** output
- **Problems:** P1 (outputs as overheads — uploading should be frictionless)
- **Size:** M
- **Depends on:** None
- **Enables:** Better source doc management across all DNA types that reference sources
- **Status:** planned
- **Priority:** Medium — functional but messy. Upload works for unblocking DNA-05; proper UX pass needed before more features depend on source doc upload.

### UX-10: Universal "Generate" action for draft plural DNA items
- **What:** DNA-05 introduced a "Generate" button in the header for draft knowledge assets — sends existing metadata to LLM and populates all fields. This pattern should be universal across all plural DNA items (audience segments, offers, platforms, etc.) so any draft can be generated from its detail view without re-running the creation modal.
- **Layer:** output
- **Problems:** P5 (translation friction — reduce steps to get from draft to complete)
- **Size:** S
- **Depends on:** DNA-05 (established the pattern)
- **Enables:** Smoother creation flow across all DNA types
- **Status:** planned

### UX-11: Fixed tab headings and scrollable content pane
- **What:** DNA-07 (Platforms) established a pattern where tab headings are fixed and the content area scrolls independently. This needs to be applied consistently across all tabbed DNA detail views (audience segments, knowledge assets, offers, etc.). Currently some views scroll the entire page including tabs.
- **Layer:** output
- **Problems:** P2 (consistency — same pattern everywhere)
- **Size:** S
- **Depends on:** None
- **Enables:** Consistent UX across all DNA detail views
- **Status:** planned

### UX-14: Generation gating (DNA prerequisites)
- **What:** App-level rules for which DNA items can be generated based on what upstream DNA already exists. v1 minimum graph: business overview + at least one audience segment + tone of voice required before generating downstream DNA (offers, value proposition, content, etc.). When blocked, the UI surfaces what's missing with a direct path to fill it. Cross-cutting — applies to every DNA generation entry point.
- **Layer:** cross
- **Problems:** P2, P5
- **Size:** S
- **Depends on:** DNA-01
- **Enables:** Every DNA generation flow — DNA-02 onward
- **Status:** planned
- **Note:** Pairs with UX-01 (dependency-aware empty states) — same underlying knowledge graph, different surfaces.
