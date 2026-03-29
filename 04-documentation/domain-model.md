# BigBrain Domain Model

> Second brain / strategy / content creation system for Ellie Rofe @ NicelyPut.
> This document is the single source of truth for what the app contains and how it fits together.
> Last updated: 2026-03-28 — DRAFT v0.2

---

## 0. Why this system exists

This isn't a filing system. It solves five structural problems:

### Problem 1: Outputs become overheads
AI-generated work and processed outputs become *more things stored in more places*. Each output adds cognitive load instead of reducing it. **Design principle:** Anything generated must land in context — already linked, already findable. If an output doesn't have a home before it's created, the system has failed.

### Problem 2: Accidental strategy drift
Thinking evolves through conversations, documents, AI chats, and client work — producing multiple divergent versions of the same strategic element, none canonical. **Design principle:** Brand DNA is a single source of truth with direct visibility and editability. The dashboard is the mechanism that prevents drift, not a nice-to-have.

### Problem 3: Disconnected knowledge
Learning happens in isolated contexts. Connections exist only in memory (the worst storage medium for an ADHD brain). **Design principle:** The system must surface connections you haven't made yet, not just store the ones you have. This is why the knowledge graph and vector search exist.

### Problem 4: Research as accumulation instead of compounding
Each research project is discrete. Defence, robotics, energy — the overlaps exist but aren't captured structurally. **Design principle:** Each research effort must make the next one faster and richer. The graph should already have adjacent territory mapped. This is the compound interest model.

### Problem 5: Translation friction
The thinking, research, and strategy exist — but assembling them into outputs (posts, pages, pitches) is cognitively expensive, boring relative to the thinking, and easy to abandon. **Design principle:** The content layer handles assembly. You handle judgment.

### Overarching design rules
1. **Nothing enters storage without being processed and linked.** Anything in the intake 'inbox' must be properly processed (via a defined skill and/or subskills) before it is stored.
2. **Separate capture from organisation from action.** Capture = instant, frictionless. Organisation = later or automated. Action = system assembles context, you decide.
3. **More content should make the system better, not worse.** This is the test: if adding knowledge increases noise, the architecture is wrong. If it increases connections, it's right.
4. **Visibility over trust.** If you can't see it, you won't trust it, and you'll stop using it. Every layer must be inspectable. For strategy that might be the DNA/knowledge .

---

## 1. System overview

The system has three layers: **Inputs**, **Storage**, and **Outputs**. Data flows from left to right but also loops back — outputs generate insights that become inputs, and storage is queried by outputs but updated by both inputs and outputs.

```
INPUTS ──▶ STORAGE ──▶ OUTPUTS
  │            ▲            │
  └────────────┴────────────┘
         (feedback loops)
```

---

## 2. Inputs

Things that enter the system. Each input type has different structure, fidelity, and processing needs.

### 2.1 Conversation transcripts (Krisp)
- **Source:** Krisp transcription software
- **Format:** Text transcripts of calls and meetings
- **Processing needed:** Speaker identification, topic extraction, idea extraction, action items
- **Frequency:** Ongoing, potentially daily
- **Notes:** Rich but noisy. Needs filtering — not everything is relevant

### 2.2 Spoken ideas / voice notes
- **Source:** Ad hoc voice recordings
- **Format:** Audio → transcribed text
- **Processing needed:** Transcription, idea extraction, tagging
- **Frequency:** Sporadic, burst-driven
- **Notes:** Often fragmentary. Capture speed matters — low friction to get ideas in

### 2.3 Written documents
- **Source:** Documents Ellie has written — blog drafts, proposals, notes, frameworks
- **Format:** Various (markdown, Google Docs, Word, plain text)
- **Processing needed:** Categorisation, key concept extraction, linking to existing knowledge
- **Frequency:** Ongoing

### 2.4 Client project outputs
- **Source:** Work delivered for clients that generates reusable thinking
- **Format:** Various (strategy decks, brand work, research outputs)
- **Processing needed:** Anonymisation/abstraction where needed, pattern extraction, methodology capture
- **Frequency:** Per project
- **Notes:** These become inputs to your own thinking — lessons, patterns, validated approaches

### 2.5 Research documents
- **Source:** External — McKinsey PDFs, scraped data, book summaries, social media analysis, datasets
- **Format:** Highly varied (PDF, CSV, JSON, markdown summaries, raw scrapes)
- **Processing needed:** Depends heavily on type. PDFs need extraction. Data needs cleaning. Summaries need key-point extraction.
- **Frequency:** Ongoing, often in bursts around a research topic
- **Notes:** This is the broadest category. Sub-types may emerge and need their own pipelines.

### 2.6 Social media / web content
- **Source:** Scraped or saved content from LinkedIn, X, newsletters, etc.
- **Format:** Text, possibly with media
- **Processing needed:** Relevance filtering, summarisation, linking to topics
- **Frequency:** Ongoing

---

## 3. Storage

The system needs multiple storage types that work together. Not everything belongs in the same place.

### 3.1 Knowledge graph
- **Purpose:** Rich, contextual, linked information. Relationships between concepts, people, organisations, research topics, ideas.
- **What lives here:**
  - Research topics and their connections (e.g. hard tech flows → defence investment → reshoring)
  - People and organisations encountered across research and work
  - Concepts and frameworks (your own and others')
  - How ideas, projects, and outputs relate to one another
  - Methodology connections (what approach works for what problem)
- **Query patterns:** "What do I know about X?", "How does X connect to Y?", "What have I written/said about Z?", traversal-based exploration
- **Technology:** TBD (FalkorDB candidate — already in use on SDP project)

### 3.2 Relational database
- **Purpose:** Structured, queryable, tabular data. Things with clear schemas that need fast lookup and filtering.
- **What lives here:**
  - Brand DNA entries (see section 4)
  - Content registry (what's been created, where, when, using what)
  - Source knowledge items (testimonials, stats, stories — see section 4.3)
  - Feature/config data for the app itself
- **Technology:** TBD (Neon/Postgres candidate — already in use)

### 3.3 Document / file storage
- **Purpose:** Original source files, generated outputs, media assets
- **What lives here:**
  - Original input files (PDFs, transcripts, voice notes)
  - Generated content (posts, pages, documents)
  - Brand assets (logos, fonts, imagery)
- **Technology:** TBD (file system, S3, or similar)

### 3.4 Vector store (likely needed)
- **Purpose:** Semantic search across all text content
- **What lives here:** Embeddings of documents, ideas, transcripts, research
- **Query patterns:** "Find things similar to this idea", "What have I said that's relevant to this topic?"
- **Technology:** TBD (could be Postgres pgvector extension in Neon, or dedicated)
- **Notes:** This is what makes the "second brain" actually intelligent. Without it you're just filing. With it you're finding connections you didn't know existed.

### How storage layers interact
- An idea extracted from a Krisp transcript gets: a **node in the graph** (linked to the conversation, topic, people), a **row in Postgres** (if it becomes a structured item like a content idea), a **vector embedding** (for semantic retrieval), and the original transcript stays in **file storage**.
- A piece of Brand DNA lives in **Postgres** (structured fields) but connects to related concepts in the **graph** and is searchable via **vectors**.

---

## 4. Brand DNA (structured strategy layer)

This is the strategic backbone. Some items are singular (one per business), some are plural (multiple instances).

### 4.1 Singular DNA elements
| Element | Description |
|---|---|
| **Vision** | Where you're going — the future state you're working toward |
| **Mission** | What you do to get there |
| **Purpose** | Why it matters |
| **Values** | What you stand for and how you operate |
| **Value proposition** | The core promise — why someone should choose you |
| **Tone of voice** | How you sound — structure, samples, rules for AI replication |
| **Brand identity** | Visual parameters — colours, fonts, motifs, core assets, logos |
| **Positioning / how you're different** | What makes your approach distinct |

### 4.2 Plural DNA elements
| Element | Description | Notes |
|---|---|---|
| **Audience segments** | Who you serve | Demographics, psychographics, voice-of-customer statements. Each segment is a full profile. |
| **Offers** | What you sell | Features, benefits, pricing, positioning, strategy per offer |
| **Methodologies** | How you work | Top-level summaries here; deep detail links into the knowledge graph |
| **Content pillars** | What you talk about and why | Topics, framings, formats, media types, angles, approach |
| **Platforms** | Where you show up | Platform-specific strategies, constraints, content formats |
| **Lead magnets** | Free value for lead capture | Content, structure, strategy, conversion paths |

### 4.3 Source knowledge
Static reference material that doesn't change but gets added to over time. Used as ingredients in content creation and strategy.

| Type | Description |
|---|---|
| **Testimonials** | Client quotes, results, endorsements |
| **Own research** | Studies, analyses, surveys you've conducted |
| **Statistics** | Data points you reference regularly |
| **Stories** | Narratives about you, your business, your clients |
| **Source documents** | Original materials that inform the above |

**Key property:** Individual items don't update once created. The collection grows. Each item can be used in multiple outputs and tracked (where has this testimonial appeared?).

---

## 5. Outputs

### 5.1 Chat (conversational interface)
- **Purpose:** Flexible, natural-language interaction with the whole system
- **Capabilities:**
  - Create ad hoc content
  - Discuss and develop strategy
  - Query knowledge ("what do I know about X?")
  - Generate or update Brand DNA elements
  - Run "recipes" / skills (structured operations)
- **Input modes:** Text, voice notes, images, documents (multimodal)
- **Notes:** This is the primary interface for unstructured work. It should have full access to all storage layers.

### 5.2 Content creator (structured generation)
Two modes:

#### Single-step generation
- Select parameters: audience segment, content pillar, offer element (feature/benefit), platform, format
- Generate a single piece of content (e.g. one LinkedIn post)
- Tone of voice applied automatically
- Source knowledge available as ingredients

#### Multi-step / long-form generation
- Sales pages, web pages, proposals, larger documents
- Effectively a composition of modular brand strategy pieces turned into copy
- May follow templates or be more freeform
- Likely needs a review/edit workflow

### 5.3 Client project system (future)
- **Purpose:** Run client engagements through the same system, so that the work feeds back into your own knowledge and strategy
- **How it connects:**
  - Client research becomes part of the knowledge graph — defence procurement for a client maps the same territory you'd explore independently, and that knowledge persists and compounds
  - Methodologies get tested and refined through client delivery — the system captures what worked, what fractured, what evolved
  - Client work generates source knowledge: testimonials, case patterns, validated frameworks, results data
  - Offers and audience segments get reality-tested — what actually resonated, what needed repositioning
- **What it would include:**
  - Project workspace per client (scoped view, not a separate system)
  - Ability to tag knowledge, research, and outputs as client-related while keeping them connected to the wider graph
  - Deliverable tracking with provenance (which DNA elements, research, and methodologies informed this deliverable)
  - Post-project extraction: a structured step to harvest learnings, testimonials, and methodology refinements back into the main system
- **Key constraint:** Client-specific detail stays scoped. The *patterns and knowledge* flow back to the graph. You don't want client A's brand strategy polluting your own DNA — but you do want the insight that "this diagnostic approach broke down for services businesses" feeding back into your methodology.
- **Status:** Later milestone. Design the graph and storage to accommodate it from the start (e.g. project-scoping on nodes), but don't build the UI or workflows yet.

### 5.4 Design generation (future)
- Uses brand identity parameters (colours, fonts, motifs, assets)
- Generates graphics, social media visuals, presentations
- **Integration candidates:** Canva (MCP exists), Affinity, AI image generation
- **Status:** Aspirational — park for now, but design the identity storage to support it

### 5.5 Dashboard
- **Purpose:** See and directly edit the state of your business knowledge
- **Shows:**
  - Brand DNA overview — all elements, ability to drill in and edit
  - Content registry — what's been created, where, performance
  - Knowledge graph explorer — visual or list-based browsing
  - Input queue — what's come in that needs processing
  - Source knowledge library
- **Notes:** This is the "control panel" view. Not just read-only — you should be able to edit DNA elements, tag inputs, manage the backlog of ideas.

---

## 6. Cross-cutting concerns

### 6.1 Provenance and usage tracking
- Every piece of content should trace back to what informed it (which DNA elements, which source knowledge, which research)
- Source knowledge items should track where they've been used
- This supports: avoiding repetition, understanding what's working, auditing your own thinking

### 6.2 Idea capture and triage
- Ideas arrive constantly and in fragments
- The system must make capture frictionless (voice, text, paste, whatever)
- Triage happens later — ideas get tagged, linked, prioritised, or discarded
- This is the ADHD-critical path: if capture has friction, ideas get lost. If triage doesn't happen, ideas pile up and create overwhelm.

### 6.3 Tone of voice as a system-wide parameter
- Not just a text description — needs structured rules AND samples
- Applied automatically to all generated content
- Should be adjustable per context (e.g. more formal for proposals, more casual for social)

### 6.4 Context windows and retrieval
- The chat and content creator need to pull relevant context from storage
- This means good retrieval (vector search + graph traversal + structured queries working together)
- The quality of outputs is directly proportional to the quality of retrieval

---

## 7. Open questions

_To be resolved through Architecture Decision Records as we progress._

1. **Tech stack for the app itself** — framework, hosting, deployment approach
2. **Graph schema design** — what are the node types, relationship types, how granular?
3. **How do inputs get processed?** — Manual triage? Auto-classification? LLM pipeline? Mix?
4. **Auth and access** — single user for now, but how locked down?
5. **Where does the LLM sit?** — API calls to Claude? Local model for some tasks? How do we manage context and cost?
6. **Voice input pipeline** — how do voice notes get transcribed and into the system?
7. **Content creator UX** — how opinionated should the structured generation be? How much should it constrain vs. suggest?
8. **What's the MVP?** — smallest useful slice that touches all layers

---

## Appendix: Conceptual data flow examples

### Example 1: Krisp transcript → ideas → content
1. Krisp transcript lands in **Inputs**
2. Processing extracts 3 ideas, 1 action item, tags 2 topics
3. Ideas become **nodes in the graph**, linked to topics and the conversation
4. One idea is strong — Ellie promotes it to a **content idea** in Postgres
5. In the **content creator**, she generates a LinkedIn post using that idea + an audience segment + tone of voice
6. The post is stored with **provenance**: source transcript → idea → post

### Example 2: Research PDF → knowledge → strategy update
1. McKinsey PDF on defence investment lands in **Inputs**
2. Processing extracts key findings, data points, frameworks
3. Findings become **graph nodes** linked to existing topic cluster (defence, reshoring, hard tech)
4. A new connection is discovered: a framework from the PDF relates to one of Ellie's methodologies
5. Ellie updates the **methodology DNA entry** in the dashboard to incorporate this
6. Next time content is generated about that methodology, the new framing is available
