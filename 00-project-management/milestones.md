# BigBrain Milestones

> What we're working towards and in what order.
> Last updated: 2026-03-28

---

## Current milestone: M0 — Project setup and schema design

**Goal:** Get the project structure in place, define all data schemas, and scaffold the app so we're ready to build.

**What's in scope:**
- [x] Domain model (v0.2)
- [x] Feature backlog (v1, 60 features)
- [x] Tech stack decision (ADR-001)
- [x] Skills plan (dev skills + in-app skills documented)
- [x] Move project to its own directory (`~/bigbrain/`)
- [ ] Git init + GitHub repo
- [ ] Vercel connection (remember: set rootDirectory to `02-app`)
- [ ] Next.js scaffold in `02-app/`
- [ ] Define DNA schemas (all types, field by field) → `01-design/schemas/`
- [ ] Define source knowledge schemas → `01-design/schemas/`
- [ ] Define graph schema (node types, relationship types) → ADR-002
- [ ] Build initial skills: `feature-request` (SKL-11), `session-log` (SKL-10), `feature-brief` (SKL-01) — minimum set needed before any feature work starts
- [ ] Remaining skills (SKL-02 through SKL-09) built as needed during M1+

**Exit criteria:** Deployable hello-world app, all schemas defined, initial skills functional, backlog updated.

---

## Next milestones (sequence TBD)

### M1 — Storage layer
Set up Neon (Postgres + pgvector), FalkorDB, file storage. Implement DNA-01, SRC-01, KG-01. Database tables match the defined schemas.

### M2 — Input processing pipeline
INP-03 (the core engine), INP-01 (Krisp ingestion), VEC-01 (vector setup). First inputs flowing through to storage.

### M3 — Retrieval and chat
RET-01 (unified retrieval), OUT-01 (chat interface). First end-to-end: input → storage → retrieval → conversation.

### M4 — Dashboard and DNA editing
DASH-01 (shell), DASH-02 (DNA overview), DNA-02 through DNA-08. See and edit your strategy.

### M5 — Content creation
OUT-02 (single-step content creator), DNA-09 (tone of voice system). Generate content using the full system.

### M6+ — Automation, long-form, client projects, design generation
AUTO-01–04, OUT-02a, CLIENT-01–02, OUT-04. Later milestones, sequence determined by need.
