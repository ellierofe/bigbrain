# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Project Overview

**BigBrain** is a single-user second brain / strategy / content creation app for Ellie Rofe @ NicelyPut. It collects inputs (transcripts, voice notes, research, documents), stores them in linked knowledge systems (Postgres, knowledge graph, vector search), and generates outputs (content, strategy updates, insights) through a chat interface, content creator, and dashboard.

See `04-documentation/domain-model.md` for the full domain model, including the five core problems this system solves and the design rules that follow from them.

## Architecture

### Project structure
- **`00-project-management/`** — Backlog, milestones, ADRs, session logs
- **`01-design/`** — Information architecture, wireframes, design system, schema definitions
- **`02-app/`** — The Next.js application (App Router + TypeScript)
- **`.claude/skills/`** — Claude Code skills for repeatable development operations
- **`04-documentation/`** — Domain model, reference docs, content model

### Tech stack (ADR-001)
- **Framework:** Next.js (App Router) + TypeScript
- **Database:** Neon (Postgres + pgvector)
- **Graph DB:** FalkorDB
- **LLM:** Vercel AI SDK + Claude (primary) + multi-model support
- **File storage:** Vercel Blob
- **Hosting:** Vercel via GitHub
- **UI:** Tailwind CSS + shadcn/ui
- **ORM:** Drizzle
- **Auth:** Auth.js v5

### Databases
- **Neon (Postgres + pgvector)** — Brand DNA, source knowledge, content registry, vector embeddings, graph node index
- **FalkorDB** — Knowledge graph (ideas, topics, people, concepts, research, methodologies)

Graph index is mirrored in Neon for fast flat queries — same pattern as SDP project.

## Key files
- `00-project-management/backlog.md` — Feature registry with dependencies and status
- `00-project-management/milestones.md` — Current and upcoming milestones
- `00-project-management/decisions/` — Architecture Decision Records
- `01-design/schemas/` — DNA and source knowledge schema definitions (field-level specs)
- `04-documentation/domain-model.md` — The domain model and design principles

## Working conventions

### Before implementing any feature:
1. Check the backlog entry for dependencies and status
2. Check relevant ADRs for architectural constraints
3. Check schema definitions in `01-design/schemas/` for data structures
4. Update backlog status when starting and completing work

### Design system (hard rule)
`01-design/design-system.md` is the source of truth for all UI decisions. The `design-system` skill enforces it.

- **At layout-design time:** the layout spec must include a **Molecule composition** section listing every molecule the feature uses — existing (with spec/registry links) and new (with one-line spec sketches). This is the upstream input for the build-time gate.
- **At feature-build plan time** (Step B Molecule plan + Step C plan-approval check): every new molecule must have its draft spec ready, via `design-system` Mode A, before plan approval. The hard gate is at plan time, not build time — no code is written with an unspecced molecule.
- **After any feature build that touches UI:** `design-system` Drift check (Mode B) runs across all organism-layer files — `app/(dashboard)/**` AND `02-app/components/*-view.tsx`, `*-modal.tsx`, `*-panel.tsx`, `*-list.tsx`, `*-table.tsx`, `*-workspace.tsx`, `*-area.tsx`, `*-section.tsx`, `*-card.tsx`. No appearance classes (`bg-*`, `text-*`, `border-*`, `shadow-*`) in any of those.
- **No hardcoded colour or spacing values in components** — tokens only (`--primary`, `--muted-foreground`, `--border`, etc.). Named-colour scales (`green-*`, `amber-*`, `emerald-*`, `red-*`) are violations — use semantic state tokens (`--color-success` etc.) once DS-02 lands.
- **No appearance classes in organisms** — organisms compose molecules; they do not style them. "Organism" is a role, not a path: any file composing molecules into a feature surface is an organism, regardless of directory.
- **No direct atom imports in organisms** — every `import ... from '@/components/ui/*'` outside `02-app/components/ui/` itself or a registered molecule file is a missing-molecule signal.
- **Coherence check:** `cd 02-app && npm run check:design-system` validates registry ↔ spec alignment and lists direct atom imports. The `design-system` skill Mode B runs this automatically post-build. Errors (broken anchors, orphan specs) block; warnings (`spec: null`, atom imports) are tracked by DS-03 / DS-05.

### Session logs
Log each working session in `00-project-management/sessions/` with: date, what was done, decisions made, what's next.

### Schema-first development
DNA and source knowledge schemas must be defined as documents in `01-design/schemas/` BEFORE being implemented in code. The schema documents are the source of truth; the Drizzle tables implement them.

### Skills
Use skills in `.claude/skills/` for repeatable operations. Each DNA type has a creation skill and an update skill. Always use the relevant skill rather than ad-hoc approaches.

### Deployment
- Vercel `rootDirectory` must be set to `02-app`
- Push to main = deploy
- Vercel cron handles scheduled jobs (API routes in `02-app/app/api/cron/`)

## Design principles (from domain model)
1. Nothing enters storage without being processed and linked
2. Separate capture from organisation from action
3. More content should make the system better, not worse
4. Visibility over trust — every layer must be inspectable
