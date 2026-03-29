# BigBrain Feature Backlog

> Registry of all features. This is not a sprint plan — it's an inventory.
> Each feature has dependencies, layer, and which core problem(s) it addresses.
> Status: `planned` → `in-progress` → `done` | `parked` for future milestones
> Last updated: 2026-03-28

---

## How to read this

- **Layer:** infra (infrastructure/plumbing), data (storage/schema), input (ingestion), output (UI/generation), cross (system-wide)
- **Problems addressed:** P1 (outputs as overheads), P2 (strategy drift), P3 (disconnected knowledge), P4 (research not compounding), P5 (translation friction)
- **Size:** S (hours), M (days), L (a week+), XL (multi-week)
- **Depends on:** features that must exist first
- **Enables:** features that need this to exist

---

## INFRASTRUCTURE

### INF-01: App scaffold and project structure
- **What:** Set up the app framework, folder structure, dev environment, deployment target
- **Layer:** infra
- **Problems:** All (nothing works without this)
- **Size:** M
- **Depends on:** Tech stack decision (ADR-001)
- **Enables:** Everything
- **Status:** planned
- **Note:** Vercel `rootDirectory` must be set to `02-app` (dashboard or vercel.json) since the Next.js app is nested, not at repo root. Do this during setup or first deploy will fail.

### INF-02: Database setup — Postgres
- **What:** Neon Postgres instance with initial schema, connection config, migrations framework
- **Layer:** infra
- **Problems:** P2, P3
- **Size:** M
- **Depends on:** INF-01
- **Enables:** DNA-01, SRC-01, REG-01, VEC-01
- **Status:** planned

### INF-03: Database setup — Knowledge graph
- **What:** Graph DB instance (likely FalkorDB), connection config, initial schema with node/relationship types
- **Layer:** infra
- **Problems:** P3, P4
- **Size:** M
- **Depends on:** INF-01, graph schema decision (ADR-002)
- **Enables:** KG-01, KG-02, INP-03
- **Status:** planned

### INF-04: File storage setup
- **What:** Storage for original files, generated outputs, brand assets. Could be S3, local, or hybrid.
- **Layer:** infra
- **Problems:** P1
- **Size:** S
- **Depends on:** INF-01
- **Enables:** INP-01, INP-02, INP-05, OUT-04
- **Status:** planned

### INF-05: Auth and session management
- **What:** Single-user auth. Simple but present — don't ship without it.
- **Layer:** infra
- **Problems:** None directly (hygiene)
- **Size:** S
- **Depends on:** INF-01
- **Enables:** All output features (gating)
- **Status:** planned

### INF-06: LLM integration layer
- **What:** API connection to Claude (or other), shared config for model, system prompts, cost tracking. Central so every feature that uses LLM goes through one place.
- **Layer:** infra
- **Problems:** P3, P5
- **Size:** M
- **Depends on:** INF-01
- **Enables:** INP-03, INP-04, OUT-01, OUT-02, OUT-03
- **Status:** planned

---

## STORAGE — KNOWLEDGE GRAPH

### KG-01: Core graph schema
- **What:** Define and implement node types (Idea, Topic, Person, Organisation, Concept, Framework, Methodology, Project, Source) and relationship types (RELATES_TO, DERIVED_FROM, USED_IN, INFORMS, etc.)
- **Layer:** data
- **Problems:** P3, P4
- **Size:** M
- **Depends on:** INF-03
- **Enables:** KG-02, KG-03, INP-03
- **Status:** planned

### KG-02: Graph query API
- **What:** Backend functions for common graph operations: add node, link nodes, traverse, find connections, search by topic. Used by other features, not directly by the user.
- **Layer:** data
- **Problems:** P3, P4
- **Size:** S
- **Depends on:** KG-01
- **Enables:** OUT-01, DASH-03, INP-03
- **Status:** planned

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
- **Status:** planned

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
- **Depends on:** INF-02, **completed schema definitions for all DNA types**
- **Enables:** DNA-02, DNA-03, OUT-02
- **Status:** planned

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
- **Status:** planned

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
- **Status:** planned

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
- **Status:** planned

### DNA-09: Tone of voice system
- **What:** Structured tone of voice: rules, parameters (formal↔casual spectrum, etc.), sample texts, contextual variations. Not just a text field — a system that the LLM can consume.
- **Layer:** data + output
- **Problems:** P2, P5
- **Size:** L
- **Depends on:** DNA-01, INF-06
- **Enables:** OUT-02, OUT-03
- **Status:** planned

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
- **Status:** planned

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
- **Status:** planned
- **Notes:** This is the most critical feature. Without it, inputs are just files. With it, they become knowledge. Should be designed to handle different input types with type-specific extraction logic.

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
- **Status:** planned

### SKL-02: `layout-design`
- **What:** Design UI/UX for a feature. First instance of a new pattern = full design. Subsequent instances = delta from established template. Output filed in `01-design/wireframes/`.
- **Layer:** meta / process
- **Gate type:** Heavy gate for new patterns; light gate for template adaptations
- **Size:** S (to write the skill file)
- **Depends on:** SKL-01, SKL-03
- **Enables:** SKL-04 (nothing gets built without a layout spec)
- **Status:** planned

### SKL-03: `feature-template-check`
- **What:** Before designing, check whether a pattern already exists in `01-design/wireframes/templates/`. Returns match or confirms new pattern needed. Called automatically by `layout-design`.
- **Layer:** meta / process
- **Gate type:** Autonomous with summary
- **Size:** S
- **Depends on:** Nothing
- **Enables:** SKL-02
- **Status:** planned

### SKL-04: `feature-build`
- **What:** Implement a feature end-to-end. Reads brief + layout spec + ADRs + existing code, proposes implementation plan, waits for approval, then builds.
- **Layer:** meta / process
- **Gate type:** Hard gate on plan before any code; soft gate on review after
- **Size:** S (to write the skill file — individual build sessions are sized per feature)
- **Depends on:** SKL-01, SKL-02
- **Enables:** All app features
- **Status:** planned

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
- **Status:** planned

### SKL-07: `feature-update`
- **What:** Update an existing feature with full context loaded first — brief, layout spec, ADRs, session logs, current code. Prevents changes that violate earlier decisions. Hard gate before and after.
- **Layer:** meta / process
- **Gate type:** Hard gate throughout — context summary reviewed before proposing changes
- **Size:** S
- **Depends on:** SKL-01 (brief must exist for the feature being updated)
- **Enables:** Safe iteration on anything already built
- **Status:** planned

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
- **Status:** planned

### SKL-10: `session-log`
- **What:** Draft a session log at the end of a working session. Covers: what was built, decisions made, what's next, context for future sessions. Saved to `00-project-management/sessions/`.
- **Layer:** meta / process
- **Gate type:** Soft gate — model drafts, human confirms
- **Size:** S
- **Depends on:** Nothing
- **Enables:** Continuity between sessions
- **Status:** planned

### SKL-11: `feature-request`
- **What:** Structure an ad hoc idea into a proper backlog entry. Formats it, checks for conflicts, presents for confirmation, adds to backlog. The ADHD pressure valve — capture without derailing.
- **Layer:** meta / process
- **Gate type:** Light gate — human confirms entry before it's added
- **Size:** S
- **Depends on:** Nothing
- **Enables:** Backlog stays accurate without interrupting flow
- **Status:** planned

---

## Summary: Feature count by layer

| Layer | Count | Planned | Parked |
|---|---|---|---|
| Infrastructure | 6 | 6 | 0 |
| Data (KG) | 3 | 3 | 0 |
| Data (Vector) | 2 | 2 | 0 |
| Data (DNA) | 10 | 10 | 0 |
| Data (Source) | 2 | 2 | 0 |
| Data (Registry) | 2 | 2 | 0 |
| Input | 7 | 7 | 0 |
| Automation | 4 | 4 | 0 |
| Output | 7 | 5 | 2 |
| Dashboard | 2 | 2 | 0 |
| Cross-cutting | 2 | 2 | 0 |
| Client (future) | 2 | 0 | 2 |
| Development skills | 11 | 11 | 0 |
| **Total** | **60** | **56** | **4** |

---

## Dependency chain: critical path to MVP

The longest dependency chain (and therefore the thing that determines how quickly you can get something usable) is:

```
Tech stack decision (ADR-001)
  → INF-01 (scaffold)
    → INF-02 (Postgres) + INF-03 (graph) + INF-04 (files) + INF-06 (LLM)
      → KG-01 (graph schema) + VEC-01 (vector setup) + DNA-01 (DNA schema)
        → INP-03 (processing pipeline) + KG-02 (graph API) + VEC-02 (semantic search)
          → RET-01 (unified retrieval)
            → OUT-01 (chat)
```

That's the thinnest vertical slice: infra → storage → processing → retrieval → chat. Everything else branches off from there.
