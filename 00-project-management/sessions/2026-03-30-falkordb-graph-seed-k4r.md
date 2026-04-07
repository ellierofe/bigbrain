# Session log — 2026-03-30 — FalkorDB setup and graph seed
Session ID: 2026-03-30-falkordb-graph-seed-k4r

## What we worked on
- INF-03: FalkorDB connection setup
- GRF-01: Graph seed data (countries, dates, orgs, canonical register)
- GRF-02: Graph mirror tables in Neon

## What was done

**INF-03:**
- Confirmed FalkorDB Cloud (managed DBaaS) is the right hosting choice — no need for Fly.io self-hosting
- Created FalkorDB Cloud instance; credentials added to `02-app/.env.local`
- Installed `falkordb` npm package in `02-app`
- Created `02-app/lib/graph/client.ts` — FalkorDB singleton client (`getGraphClient()`, `getGraph()`, `GRAPH_NAME`)
- Confirmed connection working (no TLS wrapper needed — FalkorDB Cloud handles it at network level)
- Configured FalkorDB MCP server in `/Users/eleanorrofe/bigbrain/.mcp.json` (gitignored)
- Added `.mcp.json` to `.gitignore`

**GRF-01:**
- Created `lib/db/schema/graph.ts` — `canonical_register` table (Drizzle schema)
- Generated and applied migration `0001_brown_cammi.sql` — `canonical_register` live in Neon
- Created seed scripts in `02-app/lib/graph/seed/`:
  - `seed-countries.mjs` — 247 Country nodes + canonical_register rows
  - `seed-dates.mjs` — 21 year + 252 month + 7,670 day nodes with `IN_YEAR`/`IN_MONTH` edges
  - `seed-orgs.mjs` — Atomic Lounge + NicelyPut Organisation nodes + canonical_register rows
- All scripts run successfully; MERGE used throughout (idempotent)

**GRF-02:**
- Added `graph_nodes` and `graph_edges` tables to `lib/db/schema/graph.ts`
- Generated and applied migration `0002_bitter_beyonder.sql` — both tables live in Neon with indexes and cascade FKs

## Decisions made

- **FalkorDB Cloud over Fly.io self-hosting** — FalkorDB now has a managed cloud product (free tier available). No operational overhead, same connection pattern. Fly.io suggestion was from an earlier context predating the cloud product. FalkorDB MCP is a dev/exploration tool, not an app integration layer.
- **No TLS flag needed for FalkorDB Cloud** — TLS is handled at the network/infrastructure level. Setting `tls: true` in the Node client caused connection timeouts; omitting it works correctly.
- **`{ params: {...} }` wrapper required for falkordb-ts parameterised queries** — the Node client requires params wrapped as `{ params: { key: value } }`, not passed directly as the second argument.
- **UNWIND batching required for large seed operations** — one-query-per-row caused ECONNRESET after ~700 day nodes. Switching to one UNWIND query per month (batch of ~28–31 days) resolved the issue. This is consistent with ingestion rule #11 and should be applied in all future ingestion scripts.
- **Per-year reconnection for date seeding** — reconnecting once per year (12 queries per connection) provides reliable throughput without idle timeout.

## What came up that wasn't planned
- FalkorDB connection timeout with `tls: true` — required investigation. Resolution: omit the flag.
- ECONNRESET during date node seeding — required two iterations (per-year reconnect, then UNWIND batching) to resolve.
- NicelyPut added as an Organisation node alongside Atomic Lounge — made sense to seed both founding orgs together.

## Backlog status changes
- INF-03: `planned` → `done`
- GRF-01: `planned` → `done`
- GRF-02: `planned` → `done`

## What's next
1. **DNA-01** — all DNA tables via SKL-06 + SKL-09 (schemas already approved in `01-design/schemas/`)
2. **SRC-01** — all source knowledge tables via SKL-06 + SKL-09
3. **INF-04, INF-05, INF-06** — file storage, auth, LLM integration (can run in parallel with DNA/SRC work)
4. **Restart Claude Code** to pick up the FalkorDB MCP server from `.mcp.json`

## Context for future sessions
- FalkorDB graph name: `bigbrain`. All queries use `client.selectGraph("bigbrain")` — `GRAPH_NAME` constant exported from `lib/graph/client.ts`.
- falkordb-ts param syntax: always `{ params: { key: value } }` — not a bare object.
- Seed scripts are idempotent (MERGE throughout) — safe to rerun if needed.
- `graph_nodes` / `graph_edges` mirror tables exist but are **not yet populated** — seed scripts wrote directly to FalkorDB only. Future ingestion scripts must write to both FalkorDB and the Neon mirror simultaneously.
- `.mcp.json` is gitignored — credentials are not in source control. If re-cloned, the file must be recreated manually.
- MCP restart needed before FalkorDB MCP tools are available in Claude Code.
