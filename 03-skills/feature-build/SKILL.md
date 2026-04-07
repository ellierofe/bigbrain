---
name: feature-build
description: Implement a feature end-to-end. Use after feature-brief and layout-design are both approved. Hard gate on implementation plan before any code is written.
---

# feature-build (SKL-04)

Implement a feature end-to-end. Never writes code without an approved plan. Reads all context before proposing anything.

## Autonomy level

**Hard gate before writing code** — the model loads all context, produces an implementation plan, and waits for explicit approval before touching any files. If something unexpected comes up mid-build that would change the plan, it stops and surfaces it rather than solving silently.

**Soft gate after build** — model produces a review summary for manual testing; human confirms the feature is complete before backlog is updated.

## Pre-conditions

Before starting, verify all of the following. If any are missing, stop and say what's needed:

- [ ] Feature brief exists in `01-design/briefs/[feature-id]-[feature-slug].md` with status `approved`
- [ ] Layout spec exists (either in the brief's UI/UX notes section, or as `01-design/wireframes/[feature-id]-layout.md`) with status `approved`
  - **Exception:** For infrastructure or data-layer features with no UI output (layer: `infra` or `data`), the layout spec pre-condition is waived. The brief's UI/UX notes section must explicitly state "No UI — layout spec not applicable."
- [ ] All backlog dependencies for this feature are marked `done` in `00-project-management/backlog.md`
- [ ] If the feature requires DB tables: schema has been run through `schema-to-db` (SKL-06) and migrated via `db-migrate` (SKL-09)

## Steps

### Step A: Load all context

Read everything relevant before proposing anything:

1. `01-design/briefs/[feature-id]-[feature-slug].md` — full brief including data model, relationships, edge cases, decisions log, and UI/UX notes
2. `01-design/wireframes/[feature-id]-layout.md` (if separate from brief) — layout spec
3. `00-project-management/backlog.md` — the feature entry: size, layer, dependencies, what it enables
4. `00-project-management/decisions/` — all ADRs, scanned for anything that constrains this feature
5. `00-project-management/sessions/` — any session logs mentioning this feature ID
6. `02-app/lib/db/schema/` — current database schema, especially tables this feature reads from or writes to
7. Current code in areas this feature will touch — read before proposing, not after

Report what you found. Flag any constraints from ADRs, any patterns already established in existing code that should be followed, and any open questions in the brief that weren't resolved.

### Step B: Produce the implementation plan

Write a concrete plan before touching anything:

**Files to create**
List each file, its path, and its purpose. For React components: what it renders and what data it receives. For API routes: method, path, request shape, response shape. For lib functions: signature and what it does.

**Files to modify**
List each file and specifically what changes — not "update the schema barrel" but "add `export * from './dna-segments'` to `02-app/lib/db/schema/index.ts`". Be precise enough that the human can evaluate the plan without reading the code.

**Database changes**
Flag if any DB work is needed that hasn't been done yet. If `schema-to-db` and `db-migrate` need to run first, say so — do not proceed past the plan gate until they're done.

**New dependencies**
List any `npm` packages to install. Note if they're devDependencies. Flag if any dependency conflicts with the existing stack (check `02-app/package.json`).

**Implementation order**
The sequence matters. Types and DB layer first, then server-side logic, then UI. List the order explicitly — it's also how you'll build.

**Test cases to cover**
What should work after this is built? List specific scenarios the human should manually verify. Include edge cases from the brief (empty states, error states, limits).

**Unknowns and decisions**
Anything that needs a decision before building. Don't surface these after the gate — find them during planning and ask now. Common ones:
- A field in the schema that has no UI representation yet — is it set automatically or manually?
- A relationship that could be implemented two ways — which is right for this feature?
- An edge case in the brief marked `[TBD]` — does it need resolving before this build, or can it be deferred?

### Step C: Hard gate — plan approval

Present the full plan. State explicitly: "No code has been written. Approve this plan to proceed."

The human may:
- Approve → proceed to Step D
- Add constraints → incorporate them and re-present
- Flag concerns → address them and re-present
- Identify missing context → read it, update the plan, re-present

Do not write any code until explicitly approved.

If the plan reveals a dependency that isn't done yet (e.g. a DB table that doesn't exist), stop here. The human needs to resolve the dependency first. Do not work around missing infrastructure.

### Step D: Build

Follow the plan exactly, in the order specified. For each file:
- Write it completely — no TODOs, no placeholder implementations
- Follow the patterns established in existing code (naming conventions, error handling style, component structure)
- Follow ADR constraints (e.g. all LLM calls through `lib/llm/`, all graph queries through `lib/graph/`)

If something unexpected comes up that would change the plan — a type conflict, a missing export, behaviour in an existing function that wasn't anticipated — **stop and surface it** before resolving it silently. The human approved a specific plan; deviations need approval too.

**Stack conventions to follow (from ADR-001):**
- Server actions for form submissions and CRUD
- API routes (`app/api/`) only for: streaming responses, webhooks, cron triggers
- Shared types in `lib/types/` — don't define types inline in components
- All DB queries through Drizzle — no raw SQL strings in feature code
- All LLM calls through `lib/llm/` — never call the AI SDK directly from a component or route
- shadcn/ui components from `components/ui/` — don't reach for HTML elements where a shadcn component exists
- Tailwind for all styling — no inline styles, no CSS modules

**Component registry rule (from INF-01):**
Before creating any new shared UI component, read `02-app/components/registry.ts`.
- If a matching component exists: use it. Do not create a duplicate.
- If an existing component is close but needs extending: extend it and update the registry entry.
- If no match exists: create the component in `02-app/components/`, then add an entry to the registry before the build is marked complete.
- `02-app/components/ui/` is reserved for shadcn/ui base components only — never add custom components there.

### Step E: Review summary

After the build, produce a review summary:

```
## Build complete — [Feature ID]: [Feature name]

### What was built
[List of files created and modified, with one-line description of each]

### How to test
[Step-by-step manual test instructions. Be specific — "go to /dashboard/dna, click New Segment, fill in the Name field with a long string (>200 chars) and verify the validation error appears"]

### Edge cases to verify
[From the brief — the specific edge cases that need manual checking]

### What's out of scope
[Anything from the brief's "out of scope" section, restated — so the human knows what's intentionally not there]

### Anything to watch
[Anything that came up during build that the human should be aware of — not problems, but things to note]
```

### Step F: Soft gate — human review

The human reviews the summary and does manual testing. They confirm: "feature complete" or flag issues.

If issues are found:
- Minor (edge case, visual tweak) → fix immediately, update the review summary
- Substantive (behaviour is wrong, data model issue) → treat as a new `feature-update` (SKL-07) if it requires rethinking the approach

Do not mark the feature as complete until the human confirms.

### Step G: Finalise

Once confirmed complete:

1. Update the feature brief: set status to `complete`, append to the decisions log section with date and any notable decisions made during build
2. Update `00-project-management/backlog.md`: feature status → `done`
3. Update `00-project-management/milestones.md` if this feature was on the current milestone's remaining list

### Step H: Self-improvement check

After marking complete:

1. Did the plan miss anything that caused a mid-build stop? If so, propose an addition to the plan template in Step B.
2. Were there ADR constraints that weren't surfaced early enough? Propose adding a check to Step A.
3. Was anything in the feature brief unclear in a way that caused confusion during build? Propose a clarification to `feature-brief` (SKL-01).

Propose specific improvements if found. Human confirms or dismisses.

## Edge cases

- **Brief has unresolved `[TBD]` items that affect the build:** Stop at the plan gate. A `[TBD]` in the data model or behaviour spec is not buildable. Resolve it in the brief first.
- **An existing pattern in the codebase conflicts with the layout spec:** Surface the conflict in the plan. Don't pick one silently — the human needs to decide whether to update the pattern or adapt the spec.
- **A dependency feature is marked `done` but its code is incomplete:** Flag it. The backlog status may be wrong. Don't work around missing infrastructure — surface it.
- **The feature is larger than the backlog size estimate:** Note this in the plan. If it's significantly larger (S estimate, clearly L work), propose splitting before building. Don't silently build an XL feature when an S was estimated.
- **shadcn/ui doesn't have the right component for a UI requirement:** Check `02-app/components/ui/` for any custom components first. If none exists, build a minimal custom component in `components/` (not `components/ui/` which is reserved for shadcn). Note it in the review summary so the human knows a custom component was introduced.
