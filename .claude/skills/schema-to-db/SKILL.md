---
name: schema-to-db
description: Turn an approved schema definition document into a Drizzle table definition and migration file. Use when a schema doc in 01-design/schemas/ has been approved and is ready to become database code. Hard gate — SQL is reviewed before any files are written.
---

# schema-to-db (SKL-06)

Turn an approved schema definition document from `01-design/schemas/` into a Drizzle table definition and the corresponding migration file. Shows TypeScript and SQL before writing anything.

## Autonomy level

**Hard gate** — the model generates the Drizzle schema and migration SQL and presents both for review before writing any files. No code is written until explicitly approved. This skill generates files only; it does not run migrations. Running is handled by `db-migrate` (SKL-09).

## Pre-conditions

- The schema definition document must exist in `01-design/schemas/` and be in approved state (not draft)
- Drizzle is configured and connected to Neon (`02-app/drizzle.config.ts` exists)
- If this is the first table in the app, confirm Drizzle has been initialised (`02-app/lib/db/` exists with a base schema file)

If pre-conditions aren't met, stop and flag what's missing.

## Steps

### Step A: Load context

Read:
1. The schema definition document in `01-design/schemas/` for the feature being implemented
2. `00-project-management/decisions/adr-001-tech-stack.md` — confirm Drizzle config and any stack constraints
3. `02-app/lib/db/schema/` — read all existing table definitions to understand current schema state, naming conventions, and any shared column patterns (e.g. how `id`, `createdAt`, `updatedAt` are handled across existing tables)
4. Any related feature brief in `01-design/briefs/` — check the relationships section for FK references and join requirements

Report what you found: the schema's fields, any existing tables this one relates to, and any immediate questions before proceeding.

### Step B: Map schema fields to Drizzle types

Work through each field in the schema definition and determine:

| Schema field | Drizzle type | Constraints | Notes |
|---|---|---|---|
| ... | ... | ... | ... |

**Type mapping guide:**
- Short text (names, slugs, codes) → `varchar(n)` with appropriate length
- Long text (descriptions, body content) → `text`
- Rich text / markdown → `text`
- Numbers → `integer` or `numeric(p, s)` for decimals
- Booleans → `boolean`
- Timestamps → `timestamp('createdAt', { withTimezone: true })` — always with timezone
- Dates (no time) → `date`
- JSON / flexible objects → `jsonb`
- Arrays of primitives → `text[]` or use a junction table if the array has structure
- Vector embeddings → `vector(dimensions)` (pgvector — confirm dimension count matches embedding model)
- UUIDs → `uuid().defaultRandom()` — use as primary keys unless the schema specifies otherwise
- Version numbers → `integer` with default 1
- Enum-like fields → define a Drizzle `pgEnum` if the values are fixed and known; use `text` with a comment if values may evolve

**Naming convention:** Use `camelCase` for Drizzle column definitions in TypeScript. Drizzle maps to `snake_case` in Postgres by default — confirm this matches other tables in the schema.

### Step C: Identify relationships and constraints

From the schema doc and feature brief, determine:

**Foreign keys:**
- Which columns reference rows in other tables?
- What should happen on delete? (`cascade` / `restrict` / `set null`) — flag if not specified in the schema doc, as this is a consequential choice

**Indexes:**
- Primary key (always present — `uuid` default unless schema says otherwise)
- Columns that will be filtered or sorted frequently → add indexes
- Columns used in joins → add indexes
- Full-text search columns → note if a `tsvector` column or GIN index is needed

**Unique constraints:**
- Are there natural uniqueness requirements? (e.g. slug must be unique per entity type)

**pgvector specifics (if this table includes embeddings):**
- Confirm the embedding dimension count — must match the model used in `lib/llm/`
- Add an HNSW or IVFFlat index for vector similarity queries if this table will be searched semantically
- Note the index type recommendation: HNSW for most cases (better query performance), IVFFlat for very large datasets

### Step D: Draft the Drizzle table definition

Write the TypeScript table definition that would live in `02-app/lib/db/schema/[table-name].ts`.

Present the full file, including:
- All imports (`drizzle-orm/pg-core`, any shared column helpers, referenced table imports for FKs)
- The table definition using `pgTable`
- Any enums defined for this table
- Exported TypeScript types: `type [TableName] = typeof [tableName].$inferSelect` and `type New[TableName] = typeof [tableName].$inferInsert`

```typescript
// Example shape — adapt to actual fields
import { pgTable, uuid, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const exampleTable = pgTable('example_table', {
  id: uuid('id').defaultRandom().primaryKey(),
  // ... fields
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

export type ExampleTable = typeof exampleTable.$inferSelect
export type NewExampleTable = typeof exampleTable.$inferInsert
```

### Step E: Draft the migration SQL

Generate the SQL that Drizzle would produce when running `drizzle-kit generate`. Present this as a standalone SQL block so it can be reviewed without running anything.

Flag explicitly:
- **Destructive operations** (DROP TABLE, DROP COLUMN, ALTER COLUMN type change) — these are never safe on tables with data
- **Columns requiring defaults for existing rows** — if adding a NOT NULL column to a table that already has rows, a default is required or the migration will fail
- **New enums** — adding a new `pgEnum` creates a Postgres type; removing one later requires more work than removing a table column

### Step F: Hard gate — present for review

Present to the human:
1. The Drizzle TypeScript file
2. The migration SQL
3. Any flags from Step E
4. Any questions that need answering before proceeding (e.g. missing FK cascade behaviour, unclear field types)

State clearly: "No files have been written yet. Approve to proceed."

The human may:
- Approve → proceed to Step G
- Request changes → update draft and re-present
- Flag an issue → resolve it, update, re-present

Do not write any files until explicitly approved.

### Step G: Write files

Once approved:

1. Write the Drizzle table definition to `02-app/lib/db/schema/[table-name].ts`
2. Run `drizzle-kit generate` from `02-app/` to produce the migration file:
   ```bash
   cd 02-app && npx drizzle-kit generate
   ```
   **TTY requirement:** `drizzle-kit generate` may prompt interactively when it detects rename-vs-create ambiguity (e.g. a column with the same shape was added and another removed in the same diff). The prompt requires a real TTY — piped input fails with "Interactive prompts require a TTY terminal". If this happens, surface it back to the human and ask them to run the command in their own terminal. Do not attempt to pipe answers in.
3. Confirm the generated migration file in `02-app/lib/db/migrations/` matches the SQL presented in Step E. If there are unexpected differences, surface them before proceeding.
4. **Verify the snapshot file exists.** After generate succeeds, `02-app/lib/db/migrations/meta/NNNN_snapshot.json` must be present alongside the new SQL file. If only the SQL was created, that's a signal of corruption — the next migration will diff against a stale snapshot and produce spurious column-rename prompts. Stop and investigate before proceeding.
5. If the schema file exports types, confirm the `index.ts` (or barrel file) in `02-app/lib/db/schema/` exports the new table and types — add the export if missing.

### Step H: Log

Note what was created:
- Schema file path
- Migration file path and name
- Any flags or decisions made during the process

Remind the human: migration file exists but has not been applied to the database yet. Next step is `db-migrate` (SKL-09).

### Step I: Self-improvement check

After completing:

1. Were there any type mapping decisions that felt ambiguous or required guesswork? If so, propose a note to add to this skill's type mapping guide.
2. Did the schema definition doc have gaps that caused friction here? If so, propose a check to add to the `feature-brief` (SKL-01) questionnaire's data model section.
3. Was anything missing from the Drizzle file structure that caused issues?

Propose specific changes if found. Human confirms or dismisses.

## Edge cases

- **Schema doc has `[TBD]` fields:** Stop at Step A. A schema with unresolved fields cannot be fully implemented. Flag which fields need decisions and don't proceed until they're resolved.
- **Table already exists in Drizzle schema:** This skill creates new tables. If modifying an existing table, use `feature-update` (SKL-07) instead — it loads the full context of why the table is structured the way it is before proposing changes.
- **pgvector column but dimension count not specified:** Stop and ask. Wrong dimensions mean all embeddings will need to be regenerated when corrected.
- **Multiple related tables in one schema doc:** Generate them together in one pass so FK references resolve correctly. Present all definitions and all migration SQL together before writing anything. File structure: one `.ts` file per table regardless of how many tables the schema doc covers. If the tables form a tight logical unit (e.g. the three ToV tables), group them in a subfolder (e.g. `02-app/lib/db/schema/tov/`) with a local `index.ts` that re-exports all tables. Otherwise use the flat `02-app/lib/db/schema/` directory.
- **Neon branching for risky migrations:** If the migration SQL contains destructive operations, recommend creating a Neon branch before applying. The human does this — `db-migrate` also flags it, but flag it here too so the human knows before they get to that step.
