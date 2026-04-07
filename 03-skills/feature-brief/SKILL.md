---
name: feature-brief
description: Write a feature brief collaboratively before any design or build work begins. Use at the start of any new feature. Hard gate — nothing gets built without an approved brief.
---

# feature-brief (SKL-01)

Produce a complete feature brief before any design or build work begins. The brief is the contract — nothing gets designed or built without one.

## Purpose

Write a feature brief collaboratively: the model asks structured questions, the human answers, the model produces a document. The brief lives in `01-design/briefs/` and becomes the permanent reference for all future work on the feature — design, build, and updates all read it first.

## Gate type

**Hard gate** — human must explicitly approve the brief before it can be used to proceed to `layout-design` or `feature-build`. A brief in `draft` status is not a valid pre-condition for downstream skills.

## Pre-conditions

- A feature must exist in `00-project-management/backlog.md` before a brief can be written for it
- If the feature doesn't exist yet, use `feature-request` (SKL-11) first

## Steps

### Step A: Load context

Before asking any questions, read:

1. `00-project-management/backlog.md` — find the feature entry: its What, layer, problems addressed, size, dependencies, and enables list
2. `04-documentation/domain-model.md` — understand which core problems this feature addresses and which design rules apply
3. `00-project-management/decisions/` — read all ADRs for any constraints that affect this feature (tech stack, schema approach, data model decisions)
4. `01-design/briefs/` — check whether any related feature already has a brief; read it for relevant patterns or decisions
5. `01-design/schemas/` — if the feature involves stored data, read the relevant schema definition if it exists

Report what you've read and any immediately relevant constraints before asking questions. This surfaces "I see ADR-002 constrains the graph schema — that will affect how this feature stores relationships" before the human spends time answering questions in a direction that's already closed off.

### Step B: Present the questionnaire

Ask structured questions across these categories. Adapt the questions to what you actually know about the feature — don't ask questions that the backlog entry or ADRs already answer clearly.

**Use cases**
- What are all the situations this feature is used? (Who triggers it, when, why?)
- Are there any secondary use cases or edge-mode uses beyond the primary one?

**User journey**
- Step by step: what does the user do? What does the system do in response?
- Where does the user come from to reach this feature, and where do they go after?

**Data / fields**
- What information does this feature create, store, display, or edit?
- For each field: type, constraints, required vs optional, default value if any
- Are there fields that need to be validated? What are the rules?

**Update behaviour**
- How does this item change over time?
  - Immutable (source knowledge — additions only, no edits)
  - Versioned (DNA — changes tracked, history preserved)
  - Freely editable (config, settings)
- Who can trigger updates?

**Relationships**
- What does this feature connect to in the knowledge graph (FalkorDB)?
- What does it connect to in Postgres (foreign keys, joins)?
- What other features depend on this one being in place?

**Edge cases**
- Empty state: what does the user see when there's no data yet?
- Error states: what can go wrong and how should it be handled?
- Limits: maximum field lengths, maximum item counts, any uniqueness constraints?
- Duplicates: what happens if the user tries to create something that already exists?

**Out of scope**
- What are we explicitly NOT building in this iteration?
- What would a v2 of this feature add that v1 won't have?

Ask all sections in one pass. The human can answer in any order or skip sections they don't have answers to yet — blank sections become `[TBD]` in the brief and must be resolved before the feature can enter build.

### Step C: Iterate

Based on the human's answers, ask follow-up questions where needed. Continue until you have clear answers on:

- [ ] All primary use cases covered
- [ ] User journey is step-by-step and unambiguous
- [ ] All fields named, typed, and constrained
- [ ] Update behaviour defined
- [ ] Graph and DB relationships mapped (even if approximate)
- [ ] At least the most likely edge cases handled
- [ ] Out of scope explicitly stated

It's fine to have `[TBD]` items — note them and flag that they need resolution before build can start.

### Step D: Produce the brief

Write the brief to `01-design/briefs/[feature-id]-[feature-slug].md` using this structure:

```markdown
# [Feature name] Brief
Feature ID: [e.g. DNA-03]
Status: draft
Last updated: [date]

## Summary
[2-3 sentences: what this feature is, why it exists, what problem it solves]

## Use cases
[Bulleted list of all situations this feature is used, with who/when/why]

## User journey
[Step-by-step: user action → system response, from entry point to completion]

## Data model / fields
[Table or list: field name | type | required | constraints | notes]

## Update behaviour
[Immutable / versioned / freely editable — and what that means in practice for this feature]

## Relationships
### Knowledge graph (FalkorDB)
[Node types this feature creates or connects to; relationship types]
### Postgres
[Tables, foreign keys, joins]

## UI/UX notes
[Left blank until layout-design is run]

## Edge cases
[Empty states, error states, limits, duplicate handling]

## Out of scope
[Explicit list of things not being built in this iteration]

## Open questions / TBDs
[Anything that needs resolution before build can start]

## Decisions log
[Appended during build — leave blank initially]
```

### Step E: Hard gate

Present the complete brief. State clearly:
- Any `[TBD]` items that must be resolved before `layout-design` or `feature-build` can proceed
- Any conflicts with existing ADR decisions that need resolving
- Any dependencies in the backlog that aren't yet `done`

The human must explicitly approve the brief — "looks good", "approved", or similar. Partial approval ("proceed but note X") is valid — record the caveat in the decisions log section.

Do not update the brief status to `approved` until explicitly confirmed.

### Step F: Finalise

Once approved:
1. Update the brief status from `draft` to `approved`
2. Update the backlog entry status from `planned` to `in-progress`
3. Note in the brief's decisions log: "Brief approved [date]"

## Edge cases

- **Feature has dependencies that aren't done yet:** Write the brief anyway (planning ahead is fine), but flag the blockers clearly. Mark status `draft — blocked` rather than just `draft`.
- **Human wants to skip the questionnaire and just tell you everything at once:** Fine. Accept the information in whatever form it arrives, then structure it into the brief format. Still present it for approval before proceeding.
- **Brief reveals the feature is much bigger or smaller than the backlog size estimate:** Note the discrepancy. If it's significantly bigger, propose splitting into sub-features before proceeding. If smaller, update the size estimate in the backlog.
- **Human asks to start building before the brief is approved:** Do not proceed. The brief is the gate. If they want to move fast, help them get through the brief quickly — don't skip it.
- **Related feature already has a brief with overlapping decisions:** Cross-reference it. Don't duplicate decisions — link to the existing brief and note "see [feature-id] brief for the decision on X".
