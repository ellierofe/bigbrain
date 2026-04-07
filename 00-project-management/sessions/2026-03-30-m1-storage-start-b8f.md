# Session log — 2026-03-30 — M1 storage layer start
Session ID: 2026-03-30-m1-storage-start-b8f

## What we worked on
- INF-01: App scaffold and project structure
- INF-02: Neon Postgres setup + pgvector
- INF-00: Brands root schema (`brands`, `brand_users` tables)

## What was done

**INF-01:**
- Created full directory structure per ADR-001 (`app/(dashboard)/*`, `app/api/*`, `lib/db/schema`, `lib/db/migrations`, `lib/graph`, `lib/llm`, `lib/retrieval`, `lib/processing`, `lib/types`) — all with `.gitkeep`
- Created 5 primitive component stubs: `components/modal.tsx`, `components/page-header.tsx`, `components/empty-state.tsx`, `components/form-layout.tsx`, `components/section-card.tsx`
- Created `components/registry.ts` — component registry with rules and entries for all 5 primitives
- Created `02-app/.env.example` — env var template for all M1+ services
- Created `02-app/drizzle.config.ts` — Drizzle config pointing at `lib/db/schema` and `lib/db/migrations`
- Replaced Next.js default `page.tsx` with BigBrain placeholder
- Installed `@ai-sdk/anthropic`; installed shadcn Dialog component (needed by Modal stub)
- Updated `feature-build` skill with component registry rule (ADR-004)
- Feature brief written to `01-design/briefs/INF-01-app-scaffold.md`

**INF-02 + INF-00:**
- Created Neon project `bigbrain` (project ID: `damp-boat-57321258`, org: `ellie@nicelyput.co`)
- Enabled pgvector extension on `neondb`
- Created `lib/db/index.ts` — Drizzle client singleton using `@neondatabase/serverless`
- Created `lib/db/schema/brands.ts` — `brands` + `brand_users` table definitions
- Created `lib/db/schema/index.ts` — schema barrel export
- Added `db:generate` and `db:migrate` scripts to `package.json`
- Generated migration `lib/db/migrations/0000_misty_sunspot.sql` and applied to Neon
- `brands` and `brand_users` tables confirmed live in Neon
- Feature brief written to `01-design/briefs/INF-02-postgres-setup.md`

## Decisions made

- **Component registry + primitive stubs pattern adopted** — see ADR-004 (`00-project-management/decisions/adr-004-component-registry.md`). `components/registry.ts` is the source of truth; `feature-build` skill checks it before creating any new component.
- **INF-00 folded into INF-02** — brands root schema implemented as the first migration in the DB setup session. No value in a separate session for two tables.
- **`brand_users.userId` FK to `users` deferred to INF-05** — Auth.js creates the `users` table; the FK constraint cannot be enforced until then. `userId` column exists without the FK.
- **`drizzle-kit migrate` needs env vars explicitly loaded** — doesn't read `.env.local` automatically. Workaround: `export $(grep -v '^#' .env.local | xargs) && npm run db:migrate`. Could be fixed with `dotenv` in `drizzle.config.ts` — flagged as polish item on INF-02 backlog entry.
- **Neon MCP used for project creation and SQL** — faster than console round-trips. Will use for all subsequent Neon work.

## What came up that wasn't planned
- `.env.local` was initially created without the leading dot (`env.local`) — caught before migration attempt, renamed.
- `drizzle-kit` has 4 moderate vulnerabilities in its `esbuild` dependency (dev-only, not runtime). Fix would require a breaking downgrade. Noted in INF-02 backlog entry; leave until upstream patch released.

## Backlog status changes
- INF-01: `planned` → `done`
- INF-00: `planned` → `done`
- INF-02: `planned` → `done`
- INF-02: `Known issue` note added re drizzle-kit vulnerabilities
- SKL-07: `Note` added — must include component registry rule when written

## What's next
1. **INF-03** — FalkorDB connection. Need to confirm whether a FalkorDB instance exists on Fly.io or needs to be created.
2. **GRF-01** — Graph seed data (Country nodes, Date nodes, Atomic Lounge org node, canonical register table in Neon)
3. **GRF-02** — Graph index mirror tables in Neon (`graph_nodes`, `graph_edges`)
4. Then DNA-01 + SRC-01 in parallel with INF-04/05/06

## Context for future sessions
- Neon project ID: `damp-boat-57321258`. Use this for all MCP tool calls.
- `DATABASE_URL` is in `02-app/.env.local` (gitignored). Full connection string in the Neon console.
- Migration workflow: `export $(grep -v '^#' .env.local | xargs) && npm run db:migrate` — or fix with dotenv in `drizzle.config.ts` (polish item)
- `brand_users.userId` has no FK constraint — intentional, not an omission. FK added in INF-05 migration.
- Component registry at `02-app/components/registry.ts` — update `usedIn[]` as components get adopted by features.
- `feature-update` skill (SKL-07) not yet written — when it is, it must include the component registry rule from ADR-004.
