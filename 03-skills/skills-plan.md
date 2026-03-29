# BigBrain Development Skills Plan

> This document defines the full set of Claude Code development skills for building the BigBrain app.
> These are NOT in-app skills (see `04-documentation/in-app-skills.md`) — they are tools for *building* the app.
> Last updated: 2026-03-28

---

## Architecture of the skill system

### The core principle
Every skill should do exactly as much autonomously as it can without requiring human judgment, and then stop and ask. The human is in the loop at decision points, not at execution points. Mechanical work is autonomous. Consequential decisions are gated.

### Three gate types
- **Hard gate** — model cannot proceed without explicit written approval. Used where mistakes are expensive to reverse (schema changes, DB migrations, implementation plans, any write to permanent storage).
- **Soft gate** — model shows output and proceeds on lightweight confirmation ("looks right, continue"). Used where output needs a sense-check but the stakes are lower (session logs, extraction summaries).
- **Autonomous with digest** — model does the work and reports what happened. Used for genuinely mechanical operations where the output is fully inspectable and reversible.

### The brief-first principle
No feature gets built without a feature brief. The brief is written collaboratively (model asks, human answers), filed in `01-design/`, and becomes the permanent reference that all future work on that feature reads before touching anything. This prevents:
- Building the wrong thing
- Helpful refactors that violate earlier decisions
- Losing context when sessions are weeks apart

### The template principle
The first time a new *type* of feature is built, it establishes a pattern. The second, third, fourth instances of that type use the pattern — only the variable parts (field names, labels, type-specific logic) change. This is how building DNA-04 through DNA-08 can be fast once DNA-03 is done. The `feature-template-check` skill enforces this.

---

## Skill index

### Planning and design
- [`feature-brief`](#feature-brief) — Document a feature before building anything
- [`layout-design`](#layout-design) — Design UI/UX for a feature or adapt existing pattern
- [`feature-template-check`](#feature-template-check) — Check if a pattern already exists before designing

### Build
- [`feature-build`](#feature-build) — Build a feature end-to-end with plan gate
- [`dna-item-build`](#dna-item-build) — Build a plural DNA item type using the established pattern
- [`schema-to-db`](#schema-to-db) — Turn a schema definition doc into Drizzle tables + migration

### Consistency and safety
- [`feature-update`](#feature-update) — Update an existing feature with full context loading
- [`global-change`](#global-change) — Make a cross-cutting change with blast radius analysis
- [`db-migrate`](#db-migrate) — Run a database migration with SQL review gate

### Meta
- [`session-log`](#session-log) — Log what happened in a session
- [`feature-request`](#feature-request) — Capture an ad hoc idea as a proper backlog entry

---

## Planning and design skills

### `feature-brief`

**Purpose:** Produce a complete feature brief document before any design or build work begins. This document becomes the permanent reference that all future work reads.

**Gate type:** Heavy human-in-the-loop. The model asks questions; the human provides answers. The model structures them. Nothing is assumed.

**When to use:** At the start of any new feature, before `layout-design` or `feature-build`.

**Process:**
1. Model reads: the backlog entry for the feature, any relevant ADRs, any related existing brief docs, the domain model
2. Model presents a structured questionnaire covering:
   - **Use cases:** What are all the situations in which this feature is used? Who triggers it, when, why?
   - **User journey:** Step by step, what does the user do? What does the system do in response?
   - **Data / fields:** What information does this feature create, store, display, or edit? What are the field types, constraints, defaults?
   - **Update behaviour:** How does this item change over time? Is it immutable (source knowledge), versioned (DNA), or freely editable?
   - **Relationships:** What does this feature connect to in the graph or in Postgres? What other features depend on it?
   - **Edge cases:** Empty states, errors, permission issues, maximum lengths, duplicates
   - **Out of scope:** What are we explicitly NOT building in this iteration?
3. Human answers each section. Model may ask follow-ups.
4. Model produces a brief doc in `01-design/briefs/[feature-id]-[feature-name].md`
5. **Hard gate:** Human reviews and approves the brief before proceeding. The brief is the contract.

**Output file:** `01-design/briefs/[feature-id]-[feature-name].md`

**Brief doc structure:**
```
# [Feature name] Brief
Feature ID: [e.g. DNA-03]
Status: draft → approved → in-build → complete
Last updated: [date]

## Summary
## Use cases
## User journey (step by step)
## Data model / fields
## Update behaviour
## Relationships (graph + DB)
## UI/UX notes (populated by layout-design)
## Edge cases
## Out of scope
## Decisions log (appended during build)
```

---

### `layout-design`

**Purpose:** Design the UI/UX for a feature. For the *first instance* of a new pattern, this designs the full pattern. For *subsequent instances* of the same pattern type, this identifies the template and proposes the adaptations only.

**Gate type:** Heavy human-in-the-loop for new patterns. Light gate for template adaptations (you confirm the delta, not the whole design).

**When to use:** After `feature-brief` is approved, before `feature-build`.

**Process — new pattern:**
1. Model reads: approved feature brief, domain model, any existing design docs in `01-design/`
2. Model checks `feature-template-check` — confirms no applicable template exists
3. Model produces a layout spec covering:
   - **Views needed:** List all distinct screens/panels/modals this feature requires
   - **Navigation:** How does the user move between views? How do they get here from elsewhere in the app?
   - **List view** (for plural items): How are instances displayed? Cards, table, list? What's shown in the thumbnail/preview? Sorting, filtering?
   - **Detail view:** What's shown when you open an item? Tab structure if complex?
   - **Create flow:** Modal, page, or inline? What fields appear? What's required vs optional? Validation behaviour?
   - **Edit flow:** Same modal as create, or separate? How is version history surfaced?
   - **Delete flow:** Confirmation step? What happens to related data?
   - **Image/avatar/thumbnail handling:** Does this item type have a visual identity? How is it set, displayed, defaulted?
   - **Empty states:** What does the user see when there are no items yet? What does a field look like when blank?
   - **Loading and error states**
   - **Mobile considerations** (even if desktop-first)
4. **Hard gate:** Human reviews layout spec. This is the point to challenge the UX before any code is written. Human may request changes — model updates spec and re-presents.
5. Approved layout spec is appended to the feature brief doc under "UI/UX notes"
6. Layout spec is also saved separately as `01-design/wireframes/[feature-id]-layout.md`

**Process — template adaptation:**
1. Model reads: approved feature brief, identifies pattern type (e.g. "this is a plural DNA item")
2. Model reads the template established by the first instance (noted in `01-design/wireframes/templates/`)
3. Model produces a delta doc: "Here is the established [DNA item] pattern. Here are the changes for [this specific item]: field names, labels, any type-specific behaviour. Everything else is identical to the template."
4. **Light gate:** Human confirms the delta is correct
5. Delta is appended to the feature brief

**Template registry:** `01-design/wireframes/templates/` — one file per pattern type, updated after the first instance is built and confirmed.

---

### `feature-template-check`

**Purpose:** Before designing a new feature, check whether a pattern already exists that can be adapted. Prevents reinvention.

**Gate type:** Autonomous with summary.

**When to use:** Called automatically at the start of `layout-design`.

**Process:**
1. Model reads the feature brief (type, use cases, data structure)
2. Model scans `01-design/wireframes/templates/` for applicable patterns
3. Returns one of:
   - "This looks like a **[pattern type]** — template exists at `[path]`. Proceeding with template adaptation."
   - "No applicable template found. Proceeding with new pattern design."
4. Result is logged in the feature brief

---

## Build skills

### `feature-build`

**Purpose:** Implement a feature end-to-end. Never starts without a plan gate.

**Gate type:** Hard gate before writing code (plan approval) + soft gate after (review before marking complete).

**When to use:** After `feature-brief` and `layout-design` are both approved.

**Pre-conditions (model checks before proceeding):**
- Feature brief exists and is approved
- Layout spec exists and is approved
- All backlog dependencies are marked `done`
- Relevant ADRs have been read
- Any existing code in affected areas has been read

**Process:**
1. Model reads: feature brief, layout spec, backlog entry, all ADR docs, any session logs that mention this feature, existing code in affected areas
2. Model produces an implementation plan:
   - Files to create (with purpose)
   - Files to modify (with what changes and why)
   - DB changes needed (if any — flags that `schema-to-db` and `db-migrate` will be needed)
   - New dependencies to install (if any)
   - Test cases to cover
   - Anything that needs a decision before building (surfaces unknowns early)
3. **Hard gate:** Human reviews and approves the plan. Human may add constraints or flag concerns. Model must address any concerns before proceeding.
4. Model builds, following the plan exactly. If something unexpected comes up that would change the plan, it stops and surfaces it rather than solving silently.
5. After build: model produces a review summary — what was built, what changed, what to test manually, anything that was out of scope and should go back to backlog
6. **Soft gate:** Human reviews summary and does manual testing. Confirms feature is complete.
7. Model updates: backlog status → `done`, appends to the "decisions log" section of the feature brief, writes a session log entry

---

### `dna-item-build`

**Purpose:** Specialised version of `feature-build` for plural DNA item types (audience segments, offers, methodologies, content pillars, platforms, lead magnets). Knows the DNA item pattern and handles first-instance vs subsequent-instance differently.

**Gate type:** Same as `feature-build` — hard plan gate + soft review gate.

**When to use:** When building any plural DNA item feature (DNA-03 through DNA-08 and any future additions).

**What makes this different from `feature-build`:**
- Explicitly checks whether the DNA item pattern has been established yet
- If it's the first DNA item (DNA-03): builds the full pattern including list view, detail view, create modal, edit modal, delete flow, version history display, navigation, empty states. This becomes the template.
- If it's a subsequent DNA item: reads the first implementation, reads the feature brief for the new item (which specifies the fields), and adapts. Only the fields, labels, validation rules, and any type-specific behaviour change. All structural code is reused or directly adapted.
- After the first instance: generates/updates the template doc in `01-design/wireframes/templates/dna-item-template.md`

**Process (first instance):**
1. Reads: DNA-03 brief, layout spec, DNA-01 (schema/CRUD), CLAUDE.md
2. Produces full implementation plan for the DNA item pattern
3. Hard gate: plan approval
4. Builds full pattern
5. Documents the pattern as a template
6. Soft gate: review + manual test

**Process (subsequent instances):**
1. Reads: feature brief for this item, DNA item template, existing first-instance code
2. Produces a delta plan: "Here is what changes from the template. Here is what is identical."
3. Hard gate: plan approval (shorter — just the delta)
4. Builds by adapting the template
5. Soft gate: review

---

### `schema-to-db`

**Purpose:** Turn a schema definition document from `01-design/schemas/` into a Drizzle table definition and the corresponding migration file.

**Gate type:** Hard gate — shows SQL before running anything.

**When to use:** After a schema doc is approved (via `feature-brief`), before any feature that requires that DB table.

**Pre-conditions:**
- Schema definition doc exists and is approved in `01-design/schemas/`
- Drizzle is configured and connected to Neon

**Process:**
1. Reads the schema definition doc
2. Generates the Drizzle table definition (TypeScript)
3. Generates the migration SQL that Drizzle would run
4. **Hard gate:** Presents both to human:
   - The TypeScript table definition
   - The SQL that will execute against Neon
   - Flags any destructive operations (drops, renames, type changes)
   - Flags any columns that need default values for existing rows
5. Human approves (or requests changes)
6. Model writes the Drizzle schema file and runs `drizzle-kit generate` to create the migration
7. Logs the migration in the session log
8. Note: does NOT run the migration — that's `db-migrate`

---

## Consistency and safety skills

### `feature-update`

**Purpose:** Update an existing feature with full context loaded. The most important safety skill in the system — prevents "helpful" changes that violate earlier decisions.

**Gate type:** Hard gate throughout.

**When to use:** Any time an existing feature needs to be changed, extended, or fixed.

**Why this exists:** Without this skill, updates happen in isolation. The model reads the current code and makes a sensible-looking change. But it doesn't know about: the decision in ADR-002 that constrained the graph schema, the exception noted in session 7, the edge case documented in the brief after a bug was found in week 3. This skill loads all of that before proposing anything.

**Pre-conditions:**
- Feature ID must be provided
- Feature brief must exist (if it doesn't, run `feature-brief` first)

**Process:**
1. Model loads ALL context for the feature:
   - Feature brief doc (including decisions log section)
   - Layout spec
   - Backlog entry
   - All ADRs (scanned for relevance)
   - All session logs mentioning the feature ID
   - Current code in all affected files
2. Model produces a **context summary:** "Here is what I know about this feature: [brief summary of decisions, constraints, exceptions, patterns]. Here is the current state of the code."
3. **Hard gate:** Human reviews context summary. Confirms it's accurate and complete. This is the point to add any context the model missed.
4. Human describes the change needed
5. Model produces an update plan: what changes, what stays the same, what other features might be affected (cross-references backlog dependencies)
6. **Hard gate:** Human approves the update plan
7. Model implements
8. Model appends to the decisions log in the feature brief: what was changed, when, why
9. **Soft gate:** Human reviews changes

---

### `global-change`

**Purpose:** Make a change that touches multiple features — design system updates, shared component changes, API contract changes, naming convention updates, etc.

**Gate type:** Hard gate with mandatory blast radius analysis before anything is touched.

**When to use:** Any change where the affected scope isn't known in advance or spans multiple features.

**Why this is its own skill:** A global change done carelessly is the most dangerous kind of change in a complex app. This skill forces the scope to be fully understood before execution begins.

**Process:**
1. Human describes the change
2. Model maps the blast radius:
   - All files that directly implement the thing being changed
   - All files that import or depend on those files
   - All features in the backlog that are affected
   - Any ADR decisions that the change might interact with
   - Any schema changes required
3. **Hard gate:** Model presents the full blast radius. Human confirms scope is understood and approves proceeding.
4. Model proposes execution order (changes that must happen before other changes)
5. **Hard gate:** Human approves execution order
6. Model implements feature by feature, in order, pausing after each to confirm before moving to the next
7. After all changes: model produces a summary of everything that changed
8. Model updates CLAUDE.md if the change affects project-wide conventions
9. **Soft gate:** Human does a final review pass

---

### `db-migrate`

**Purpose:** Run a Drizzle migration against the Neon database.

**Gate type:** Hard gate — migration SQL is reviewed before execution.

**When to use:** After `schema-to-db` has generated a migration, when you're ready to apply it to the database.

**Process:**
1. Model reads the migration file generated by `schema-to-db`
2. **Hard gate:** Presents the SQL again (humans forget what they approved) and flags:
   - Whether this is additive (safe) or destructive (column drops, table drops, type changes)
   - Whether it affects tables with existing data
   - Whether it requires a Neon branch for safety (recommended for destructive changes)
3. Human confirms
4. Model runs `drizzle-kit migrate`
5. Verifies migration completed successfully
6. Logs in session log

---

## Meta skills

### `session-log`

**Purpose:** Record what happened in a session so context is never lost between conversations.

**Gate type:** Soft gate — model drafts, human confirms.

**When to use:** At the end of every working session, or when switching context.

**Process:**
1. Model drafts a log covering:
   - Date
   - What was worked on (feature IDs)
   - What was built or changed
   - Decisions made (and the reasoning)
   - Anything that came up that wasn't planned
   - What's next (specific backlog items or open questions)
   - Any context that future sessions will need
2. **Soft gate:** Human reviews, adds anything missing, confirms
3. Saved to `00-project-management/sessions/YYYY-MM-DD-[topic].md`
4. Backlog statuses updated to match

---

### `feature-request`

**Purpose:** Capture an ad hoc idea as a proper backlog entry. The ADHD pressure valve — get the idea structured and filed without derailing the current session.

**Gate type:** Light gate — model structures the intake, human confirms before it's added to backlog.

**When to use:** Any time a new idea or requirement comes up mid-session that isn't already in the backlog.

**Process:**
1. Human describes the idea (as rough or detailed as they have)
2. Model structures it into a backlog entry format:
   - Feature ID (next available in the relevant section)
   - What it is (one sentence)
   - Layer
   - Problems addressed
   - Size estimate
   - Dependencies (what it needs)
   - Enables (what needs it)
3. Model also checks: does this conflict with any existing feature or decision?
4. **Light gate:** Human confirms the entry looks right
5. Model adds to backlog
6. Human can continue with whatever they were doing

---

## Skill file structure

Each skill above will be implemented as a markdown file in `03-skills/`. The format for each skill file:

```markdown
# [Skill name]

## Purpose
## Gate type
## Pre-conditions
## Steps
## Output
## Edge cases / what to do if X
```

Skills reference each other where needed (e.g. `layout-design` calls `feature-template-check`).

---

## Skill creation and maintenance

### Creating a new skill
Use the `feature-request` skill to add it to the backlog, then `feature-brief` to specify it, then implement as a markdown file in `03-skills/`.

### When a skill needs updating
Use `feature-update` — skills are features too. The skill definition doc is the brief. Any changes to a skill's gating, steps, or output format should go through the same review process.

### Skills for in-app features
In-app skills (recipes the app exposes to you as a user) are documented separately in `04-documentation/in-app-skills.md`. They are distinct from development skills. When building the chat interface (OUT-01) and recipes system (OUT-01a), that document is the spec.
