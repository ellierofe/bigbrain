# Postgres Setup + Brands Root Schema Brief
Feature ID: INF-02 + INF-00 (combined)
Status: approved
Last updated: 2026-03-30

## Summary
Wire up Drizzle ORM to the Neon Postgres instance, enable pgvector, establish the migrations workflow, and create the `brands` + `brand_users` root tables. These two features are combined because INF-00 is the first migration to run — it makes no sense to set up the migrations framework without also running the first migration through it.

## Use cases
- Every subsequent DB feature (DNA-01, SRC-01, etc.) depends on this being in place
- `brands` + `brand_users` are the root FK target for every other table in the system
- pgvector extension must be present before VEC-01 can create embedding columns

## User journey
No user-facing journey. Deliverables:
- `DATABASE_URL` in `.env.local` resolves to a live Neon connection (already done)
- pgvector extension enabled on the `neondb` database
- Drizzle config fully wired (`drizzle.config.ts` pointed at schema + migrations dirs)
- `lib/db/index.ts` — Drizzle client singleton, exported for use everywhere
- `lib/db/schema/brands.ts` — `brands` + `brand_users` table definitions
- `lib/db/schema/index.ts` — barrel export for all schema files
- First migration generated and applied — `brands` and `brand_users` tables exist in Neon
- `npm run db:generate` and `npm run db:migrate` scripts in `package.json`

## Data model

### `brands`
| Field | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, defaultRandom |
| `name` | varchar(200) | not null |
| `slug` | varchar(100) | not null, unique |
| `isActive` | boolean | not null, default true |
| `createdAt` | timestamp with tz | not null, defaultNow |
| `updatedAt` | timestamp with tz | not null, defaultNow |

### `brand_users`
| Field | Type | Constraints |
|---|---|---|
| `id` | uuid | PK, defaultRandom |
| `brandId` | uuid | not null, FK → brands.id ON DELETE CASCADE |
| `userId` | uuid | not null, FK → users.id ON DELETE CASCADE |
| `role` | varchar(50) | not null, default 'owner' |
| `createdAt` | timestamp with tz | not null, defaultNow |

Unique constraint on `(brandId, userId)`.
Indexes: `(brandId, userId)` composite, `userId`.

**Note on `users` FK:** The `users` table is created by Auth.js (INF-05, not yet done). The FK `brand_users.userId → users.id` cannot be enforced until Auth.js creates that table. For this migration we define `brand_users` with the `userId` column but **omit the FK constraint on `userId`** — it will be added in the INF-05 migration once the `users` table exists. The `brandId` FK to `brands.id` is fully enforced from day one.

## Update behaviour
`brands` — freely editable (name, slug, isActive).
`brand_users` — freely editable (role). Rows added/removed as users are linked/unlinked.

## Relationships
### Knowledge graph
None at this layer.
### Postgres
`brands.id` is the FK target for every brand-scoped table in the system. See `01-design/schemas/brands.md` for the full list.

## Edge cases
- `slug` must be unique — if a duplicate is attempted, Postgres will reject it with a unique constraint violation
- `brand_users` FK to `users` deliberately deferred to INF-05 — document this clearly in the migration file
- `drizzle-kit push` is NOT used — always `generate` + `migrate` so migration files are committed to git

## Out of scope
- No `users` table (Auth.js owns that — INF-05)
- No DNS/domain-level multi-tenancy — slug is for routing convenience only
- No RLS (row-level security) — application-layer scoping is sufficient for single-user now; Neon RLS can be added later
- No seed data (the NicelyPut brand row will be inserted manually or via a seed script in a later feature)

## Open questions / TBDs
None.

## Decisions log
- 2026-03-30: Brief approved. INF-00 folded into INF-02 — first migration runs as part of DB setup. `userId` FK on `brand_users` deferred to INF-05.
