# ADR-001: Tech Stack

> Status: DRAFT
> Date: 2026-03-28
> Decides: Framework, database, hosting, repo structure, key libraries

---

## Context

BigBrain is a single-user app for knowledge management, brand strategy, and content generation. It needs:
- A web UI with dashboard, forms, chat, and content editing
- Multiple storage backends (Postgres, graph DB, vector search, file storage)
- LLM integration (Claude API) for processing, retrieval, and generation
- Scheduled jobs for batch processing
- Deployment that's low-maintenance for a solo operator

Ellie already has experience with: Neon (Postgres), FalkorDB, Fly.io, Claude API, and the general shape of Next.js/React.

## Decision

### Framework: Next.js (App Router) + TypeScript

**Why:**
- Full-stack in one framework — React frontend + API routes + server actions, no separate backend needed
- App Router gives server components (fast initial loads, less client JS) and server actions (form handling without writing API endpoints for everything)
- TypeScript because the data model is complex and types will catch drift between layers early
- Massive ecosystem — libraries exist for everything we need
- First-class Vercel support

**What this means in practice:**
- Pages and UI components live in `app/` (Next.js App Router conventions)
- API routes in `app/api/` for things that need dedicated endpoints (chat streaming, webhooks, cron triggers)
- Server actions for form submissions and CRUD operations (DNA editing, source knowledge intake, etc.)
- Shared types in a `lib/types/` directory — database schemas, API contracts, DNA element structures all defined once

### Database: Neon (Postgres + pgvector)

**Why:**
- Already in use on the SDP project — known quantity
- pgvector extension handles vector search without a separate service
- Serverless scaling — no idle costs, no connection management headaches
- Branching feature is useful for schema migrations (test on a branch, merge to main)
- One database service for structured data AND semantic search reduces operational overhead

**What lives here:**
- All Brand DNA (singular + plural elements, version history)
- Source knowledge library
- Content registry
- Input metadata and processing status
- Vector embeddings (via pgvector)
- User/auth data
- Job scheduling state

**ORM: Drizzle**
- Type-safe, lightweight, good migration story
- Generates TypeScript types from schema — single source of truth for data shapes
- Less magic than Prisma, more control, better for complex queries
- Good pgvector support via `pgvector` extension

### Graph database: FalkorDB

**Why:**
- Already in use on the SDP project — schema patterns and operational knowledge transfer
- Good performance for the traversal queries this app needs
- Redis-compatible protocol — simple to connect
- Currently hosted on Fly.io — can continue there or evaluate alternatives

**What lives here:**
- Knowledge graph (ideas, topics, people, organisations, concepts, frameworks, methodologies, research)
- Relationship traversal queries ("how does X connect to Y?", "what do I know about Z?")
- Research topic clusters and their connections

**Connection:** API routes in Next.js talk to FalkorDB. Graph nodes reference Postgres records by ID where needed (e.g. a Methodology node links to the DNA record in Postgres).

**Graph index in Neon:** Same pattern as the SDP project — a flat index of all graph nodes and relationships is mirrored in Postgres. This gives fast filtering, search, joins with structured data, and reporting without requiring graph queries for everything. The graph is the authority for relationships; Neon is the fast lookup and cross-referencing layer.

### Vector search: pgvector (in Neon)

**Why:**
- Avoids a separate vector database service (Pinecone, Weaviate, etc.)
- Embeddings live alongside the structured data they relate to — simpler joins, simpler queries
- Good enough performance for a single-user app (dedicated vector DBs matter at scale, not here)
- One fewer service to manage

**Embedding model:** Claude's embedding endpoint, or an open model via API. Decision deferred — the interface should be abstracted so the model can change.

### File storage: Vercel Blob (or S3)

**Why:**
- Vercel Blob integrates natively with the deployment platform — no config, SDK just works
- Handles file uploads (transcripts, PDFs, voice notes, brand assets) with CDN delivery
- If we outgrow it or need more control, swap to S3 — the interface is nearly identical

**What lives here:**
- Original input files (Krisp transcripts, PDFs, voice notes, documents)
- Generated content exports
- Brand assets (logos, fonts, imagery)

### LLM: Vercel AI SDK + Claude (primary) + multi-model support

**Why:**
- **Vercel AI SDK** (`ai` package) provides a unified interface across model providers — Claude, OpenAI, Gemini, Grok, and others. Write code once, swap provider with a config change.
- **Claude as default** — strongest at the core tasks: extraction, summarisation, structured output, strategy, conversational interaction
- **Multi-model as needed** — different models are better for different outputs. Content creator and chat may benefit from model choice. Processing can fall back to alternatives when Claude is overloaded.
- Building on the AI SDK from day one means model switching is a parameter change, not a rewrite.

**Integration pattern:**
- Vercel AI SDK in `lib/llm/` — unified interface, all model calls go through one place
- Provider config: which model for which task (e.g. Haiku for routine extraction, Sonnet for content, Opus for strategy)
- System prompts managed as versioned templates (not hardcoded strings)
- Streaming responses for chat interface
- Structured output (JSON mode) for extraction and processing pipelines
- Cost tracking per operation type and per model

**Cost note:** Claude Max subscription does not include API access — API is billed separately via the Anthropic console. For a single-user app, costs are manageable: Haiku for bulk processing is very cheap, Sonnet/Opus reserved for quality-sensitive tasks. Cost tracking from day one so spend is always visible.

### Hosting: Vercel (via GitHub)

**Why:**
- Native Next.js host — zero-config deployment, preview deployments per PR
- GitHub integration — push to main = deploy
- Edge functions for API routes (fast, globally distributed)
- Built-in cron jobs (vercel.json `crons` config) — handles AUTO-01 without a separate scheduler
- Analytics and monitoring included

**Cron jobs:** Vercel supports cron via `vercel.json`. Each scheduled job is an API route that Vercel hits on a schedule. Simple, no infrastructure to manage. For the jobs defined in AUTO-02/03/04, this is sufficient.

### UI: Tailwind CSS + shadcn/ui (design system retrofit path)

**Why:**
- Tailwind: utility-first, fast to build with, consistent styling, works perfectly with Next.js
- shadcn/ui: not a component library you install — it's copy-paste components you own. Accessible, well-designed defaults, fully customisable. Built on Radix primitives.
- This combination means: professional-looking UI without a design system buildout phase. Iterate on function first, refine aesthetics later.
- Both are what Claude Code is most fluent in for frontend work — faster iteration.

**Design system retrofit path:** shadcn/ui is specifically chosen because it supports a later design overhaul without rebuilding. The path: (1) build with defaults now, (2) when ready, define custom design tokens in `01-design/design-system/` (colours, spacing, typography, radii, shadows), (3) update `tailwind.config.ts` with those tokens — changes cascade through every component automatically, (4) customise individual shadcn components as needed (you own them, they're in your repo). This is a reskin, not a rebuild. A Figma→code pipeline can also slot in at this stage. The `01-design/` folder exists from day one to hold these decisions when the time comes.

### Repo structure: Monorepo (single repo)

**Why:**
- Solo project — multi-repo is pure overhead with no benefit
- Change a schema, update the form, adjust the type — one commit, one PR, one deploy
- One CLAUDE.md, one set of skills, one backlog
- Vercel handles monorepo deployments natively

The repo structure merges two concerns: **project management** (how we track and manage the build) and **application code** (the Next.js app itself). The earlier project structure we designed (numbered folders for management, skills, documentation) wraps around the app code rather than living inside it.

```
bigbrain/
│
│── CLAUDE.md                       # Central rules for Claude Code (like SDP project)
│
│── 00-project-management/          # How we manage the build
│   ├── backlog.md                  # Feature registry (all features, status, deps)
│   ├── milestones.md               # Current target, what's next
│   ├── decisions/                  # Architecture Decision Records
│   │   ├── adr-001-tech-stack.md
│   │   ├── adr-002-graph-schema.md
│   │   └── ...
│   └── sessions/                   # Session logs (what we did, what we decided)
│
├── 01-design/                      # Design decisions and assets
│   ├── information-architecture/   # Data flows, system diagrams
│   ├── wireframes/                 # Screen-level decisions
│   ├── design-system/              # Tokens, variables (when we build this out)
│   └── schemas/                    # DNA and source knowledge schema definitions
│                                   #   (these are the detailed field specs, not DB tables)
│
├── 02-app/                         # The Next.js application
│   ├── app/                        # Next.js App Router
│   │   ├── (dashboard)/            # Dashboard route group
│   │   │   ├── dna/                # Brand DNA views
│   │   │   ├── sources/            # Source knowledge
│   │   │   ├── content/            # Content registry
│   │   │   ├── graph/              # Knowledge graph explorer
│   │   │   └── inbox/              # Input queue / triage
│   │   ├── chat/                   # Chat interface
│   │   ├── create/                 # Content creator
│   │   ├── api/                    # API routes
│   │   │   ├── chat/               # Chat streaming endpoint
│   │   │   ├── cron/               # Scheduled job endpoints
│   │   │   ├── ingest/             # Input processing endpoints
│   │   │   └── graph/              # Graph query endpoints
│   │   ├── layout.tsx              # Root layout
│   │   └── page.tsx                # Home / entry point
│   ├── components/                 # Shared UI components
│   │   ├── ui/                     # shadcn/ui base components
│   │   └── ...                     # App-specific components
│   ├── lib/                        # Shared logic
│   │   ├── db/                     # Drizzle schema, migrations, queries
│   │   │   ├── schema/             # Table definitions
│   │   │   └── migrations/         # Migration files
│   │   ├── graph/                  # FalkorDB connection, graph index sync
│   │   ├── llm/                    # Vercel AI SDK integration, prompts, templates
│   │   ├── retrieval/              # Unified retrieval layer (RET-01)
│   │   ├── processing/             # Input processing pipeline (INP-03)
│   │   ├── types/                  # Shared TypeScript types
│   │   └── utils/                  # General utilities
│   ├── public/                     # Static assets
│   ├── drizzle.config.ts           # Drizzle ORM config
│   ├── next.config.ts              # Next.js config
│   ├── tailwind.config.ts          # Tailwind config
│   ├── components.json             # shadcn/ui config
│   ├── package.json
│   └── tsconfig.json
│
├── 03-skills/                      # Claude Code skills for development
│   ├── feature-request.md          # Skill: intake a new feature idea
│   ├── implement.md                # Skill: implement against backlog with checks
│   ├── session-log.md              # Skill: log what we did
│   ├── dna-create.md               # Skill: create a new DNA element (per type)
│   ├── dna-update.md               # Skill: update/amend a DNA element
│   ├── source-create.md            # Skill: add source knowledge item
│   └── ...
│
├── 04-documentation/               # Reference docs and domain knowledge
│   ├── domain-model.md             # The domain model (moved here from z_bigbrain)
│   ├── reference/                  # External research, API docs, etc.
│   └── content-model.md            # How content types, DNA, and sources relate
│
└── vercel.json                     # Vercel config (cron schedules, build settings)
```

**Key difference from earlier draft:** The earlier conversation proposed a flat project structure. This version nests the Next.js app inside `02-app/` so that project management, design, skills, and documentation live *alongside* the code but aren't tangled with it. This mirrors the SDP project's numbered-folder pattern while accommodating the fact that an app has its own internal structure (dictated by Next.js conventions).

**What carries over from the SDP project pattern:**
- Numbered folders for clear phases/concerns
- CLAUDE.md at root as the single source of truth
- Session logs for tracking what happened
- Skills for repeatable operations
- Schemas defined as documents before they become code
- Clear separation of management artifacts from working artifacts

**Vercel config note:** Because the Next.js app lives in `02-app/` (not the repo root), Vercel must be told where to find it. Set `rootDirectory` to `02-app` in the Vercel dashboard (Project Settings → General → Root Directory) or in `vercel.json` at repo root. Do this during initial project setup (INF-01) or the first deploy will fail.

### Auth: NextAuth.js (Auth.js v5)

**Why:**
- Single user now, but don't ship a web app with no auth at all
- Auth.js v5 integrates natively with Next.js App Router
- Start with a simple email/password or magic link — can add OAuth later if needed
- Minimal setup, protects all routes behind login

---

## What this stack does NOT include (and why)

| Excluded | Why |
|---|---|
| Separate backend (Express, FastAPI, etc.) | Next.js API routes and server actions cover everything needed. Adding a backend doubles the deployment and maintenance surface for no gain at this scale. |
| Dedicated vector DB (Pinecone, Weaviate) | pgvector in Neon is sufficient for single-user semantic search. Revisit if retrieval quality or speed becomes an issue. |
| State management library (Redux, Zustand) | Server components + server actions handle most state. React's built-in useState/useContext covers the rest. Don't add complexity until it's needed. |
| CSS-in-JS (styled-components, Emotion) | Tailwind is faster to iterate with and has no runtime cost. |
| Separate CMS | The app IS the CMS. Brand DNA, source knowledge, content — it's all managed in the app itself. |
| Docker / containerisation | Vercel handles deployment. No need to containerise unless we move off Vercel. |

---

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| FalkorDB on Fly.io + everything else on Vercel = two platforms | Acceptable for now. FalkorDB is the only thing that can't run on Vercel. If it becomes a pain, evaluate Neo4j Aura or similar managed graph DB. |
| Neon free tier limits | Monitor usage. Paid tier is cheap and this is a single-user app. |
| Vercel cron limitations (once per day on free tier, once per hour on Pro) | Start with Pro if needed, or use an external scheduler (e.g. GitHub Actions) as fallback for higher-frequency jobs. |
| LLM costs | Track per-operation. Use cheaper models for routine extraction, reserve Opus/Sonnet for generation and strategy. Cache embeddings — don't re-embed unchanged content. |

---

## Next steps

1. Set up the GitHub repo
2. Scaffold the Next.js project with the structure above
3. Connect Neon (Postgres), set up Drizzle, run initial migration
4. Connect FalkorDB
5. Define DNA and source knowledge schemas (prerequisite for DNA-01 and SRC-01)
