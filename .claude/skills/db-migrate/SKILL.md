---
name: db-migrate
description: Apply a Drizzle migration to the Neon database. Use after schema-to-db has generated a migration file and it's ready to run against the database. Hard gate — SQL is reviewed again before execution.
---

# db-migrate (SKL-09)

Apply a Drizzle migration to the Neon database. Always follows `schema-to-db` (SKL-06), which generates the migration file. This skill runs it.

## Autonomy level

**Hard gate** — the model presents the migration SQL again (humans forget what they approved) and explicitly flags risk level before running anything. No migration executes without a second, explicit approval at this step. The extra confirmation is intentional — the cost of a database mistake is high and often not immediately visible.

## Pre-conditions

- `schema-to-db` (SKL-06) has been run and the migration file exists in `02-app/lib/db/migrations/`
- Neon connection is configured in `02-app/.env.local` (or equivalent) — `DATABASE_URL` must be set
- Drizzle config exists at `02-app/drizzle.config.ts`

If pre-conditions aren't met, stop and say what's missing.

## Steps

### Step A: Load the migration

Read:
1. The pending migration file(s) in `02-app/lib/db/migrations/` — identify which have not yet been applied (Drizzle tracks this in the `__drizzle_migrations` table in Neon)
2. `02-app/lib/db/schema/` — read the current schema state so you understand what the migration is moving *from* and *to*
3. Any session log or notes from the `schema-to-db` run that generated this migration — look for flags that were raised

To check which migrations have already been applied, you can run:
```bash
cd 02-app && npx drizzle-kit studio
```
Or inspect the `__drizzle_migrations` table directly via Neon MCP:
```sql
SELECT * FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 10;
```

### Step B: Classify the migration

Assess the migration SQL and classify it:

**Additive (low risk):**
- `CREATE TABLE`
- `ALTER TABLE ... ADD COLUMN` (with a default or nullable)
- `CREATE INDEX`
- `CREATE TYPE` (new enum)

**Potentially destructive (flag clearly, recommend Neon branch):**
- `DROP TABLE`
- `ALTER TABLE ... DROP COLUMN`
- `ALTER TABLE ... ALTER COLUMN` (type change)
- `ALTER TABLE ... RENAME COLUMN`
- `ALTER TABLE ... ADD COLUMN ... NOT NULL` without a default (will fail if table has rows)
- `DROP TYPE` (enum removal)

**Always destructive (require explicit confirmation beyond "looks good"):**
- Any `DROP` on a table or column that has existing data
- Any type change on a column that has existing data

State the classification clearly at the start of the review. Do not bury it.

### Step C: Neon branch recommendation

If the migration contains **any destructive operation**, recommend creating a Neon branch before proceeding:

> "This migration contains destructive operations ([list them]). Recommend creating a Neon branch first:
> 1. Go to the Neon console → your project → Branches → Create branch from main
> 2. Name it `migration-[table-name]-[date]`
> 3. Run the migration against the branch first to verify it succeeds
> 4. If it works correctly, run against main
>
> Do you want to proceed with a branch, or apply directly to main?"

For additive-only migrations on an empty or non-production database, the branch is optional — flag it but don't block.

### Step D: Hard gate — present for review

Present:
1. The full SQL that will execute (the migration file contents)
2. The risk classification from Step B
3. The Neon branch recommendation if applicable
4. Which Neon project and database this will run against (confirm from `drizzle.config.ts` and `DATABASE_URL`)
5. Whether any tables being modified currently have data (check via Neon MCP if uncertain)

State clearly: "This migration has not run yet. Approve to proceed."

The human must give explicit approval — "run it", "go ahead", "approved" or similar. A soft "looks right" is not sufficient for destructive migrations — ask for confirmation a second time if the SQL contains drops.

### Step E: Run the migration

> **Known issue:** `drizzle-kit migrate` silently exits when using the `pg` driver with Neon's SSL connection string — it prints "applying migrations…" and exits cleanly without applying anything. Use the MCP apply pattern below instead.

**Apply via Neon MCP (canonical approach):**

1. Parse the migration file into individual statements by splitting on `--> statement-breakpoint`:
   ```bash
   node -e "
   const fs = require('fs');
   const sql = fs.readFileSync('lib/db/migrations/[filename].sql', 'utf8');
   const stmts = sql.split('--> statement-breakpoint').map(s => s.trim()).filter(Boolean);
   console.log(JSON.stringify(stmts));
   "
   ```

2. Run via `mcp__Neon__run_sql_transaction` with the parsed statements array and the bigbrain project ID (`damp-boat-57321258`).

3. Record the migration in Drizzle's tracking table:
   ```bash
   # Compute the hash
   node -e "
   const crypto = require('crypto');
   const fs = require('fs');
   const content = fs.readFileSync('lib/db/migrations/[filename].sql', 'utf8');
   console.log(crypto.createHash('sha256').update(content).digest('hex'));
   "
   ```
   Then insert into Neon:
   ```sql
   INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
   VALUES ('[hash]', [when_from_journal]);
   ```

   > ⚠️ **Always read the `when` value directly from the journal entry for this specific migration's `tag`.** Open `lib/db/migrations/meta/_journal.json`, find the entry whose `tag` matches the migration filename, and use its `when` integer verbatim. Do not reuse a value from a prior migration's transcript and do not estimate from the current time — Drizzle treats this as the canonical sort key, and a wrong value silently corrupts migration ordering. If you have to fix it after the fact, do so via `UPDATE drizzle.__drizzle_migrations SET created_at = [correct_when] WHERE hash = '[hash]';`.

If the transaction fails, capture the full error and present it. Do not attempt to fix the migration automatically — surface the error and wait for instruction.

### Step F: Verify

After a successful run, verify the migration applied correctly:

1. Check the `__drizzle_migrations` table to confirm the migration is recorded as applied
2. For new tables: confirm the table exists with the correct columns:
   ```sql
   SELECT column_name, data_type, is_nullable, column_default
   FROM information_schema.columns
   WHERE table_name = '[table_name]'
   ORDER BY ordinal_position;
   ```
3. For new indexes: confirm they exist:
   ```sql
   SELECT indexname, indexdef
   FROM pg_indexes
   WHERE tablename = '[table_name]';
   ```
4. For pgvector columns: confirm the vector extension is active and the column type is correct:
   ```sql
   SELECT column_name, udt_name
   FROM information_schema.columns
   WHERE table_name = '[table_name]' AND udt_name = 'vector';
   ```

Report what was verified.

### Step G: Log

Note in the session log (or directly in conversation context for the next `session-log` run):
- Migration name and file path
- What it created/modified
- Risk level
- Whether a Neon branch was used
- Any issues encountered

### Step H: Self-improvement check

After completing:

1. Did the migration fail or behave unexpectedly? If so, was there a gap in `schema-to-db` that should have caught the issue earlier?
2. Was the risk classification clear and accurate? If a migration was harder to classify than expected, propose a clarification to the classification guide in Step B.
3. Were there verification steps missing that would have been useful?

Propose specific improvements if found. Human confirms or dismisses.

## Edge cases

- **`drizzle-kit migrate` appears to succeed but tables don't exist:** This is the known SSL/pg silent exit bug. Switch to the MCP apply pattern in Step E. Do not attempt `drizzle-kit migrate` again — it will not work in this environment without resolving the underlying driver issue.
- **Migration fails with "column already exists" or similar:** The schema and database are out of sync. Do not attempt to auto-resolve. Surface the full error, explain the likely cause (migration was partially applied, or the schema was edited manually), and ask the human how to proceed. Neon branching is strongly recommended before any recovery attempt.
- **Multiple pending migrations:** Apply them in order (Drizzle handles this automatically). Present all pending migration SQL together before running any of them — one approval covers the batch, but flag if the migrations are interdependent in ways that make partial failure risky.
- **Migration applied to branch, now needs to go to main:** This is a Neon-level operation, not Drizzle. The human needs to either re-run the migration against main's connection string, or use Neon's branch merge feature. Flag this clearly — don't assume the branch run means main is updated.
- **No pending migrations found:** Report this. It means either `schema-to-db` hasn't been run yet, or the migration was already applied. Check the `__drizzle_migrations` table to confirm.
- **`DATABASE_URL` points to wrong environment:** Before running, confirm which database the connection string points to. Neon project IDs are visible in the URL. If uncertain, stop and ask — running a migration against the wrong environment is a hard-to-reverse mistake.
