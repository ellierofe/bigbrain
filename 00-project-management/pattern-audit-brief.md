# Pattern audit — brief for subagent
Task: Audit the BigBrain app for UI patterns that should be registered as templates
Status: ready for subagent
Created: 2026-04-24
Output location: 00-project-management/pattern-audit-report.md

## Summary

Scan the existing BigBrain app (`02-app/app/(dashboard)/`, `02-app/components/`) to identify recurring UI patterns that are used in the wild but not yet registered as templates in `01-design/wireframes/templates/`. Produce a prioritised list of templates to write, with evidence of repetition. Do NOT write the templates themselves — Ellie will review and decide which to codify.

## Why this matters

Four templates are registered today:
- `dna-plural-item-template.md`
- `project-workspace-template.md`
- `tab-master-detail-template.md` (2026-04-24)
- `tab-table-expand-template.md` (2026-04-24, retroactive)

The 2026-04-24 session revealed that patterns were being built in-line without being captured, leading to reinvention. Registering used-and-proven patterns means `feature-template-check` (run at the start of every `layout-design`) can match against a richer set, and future features adapt from a template instead of redesigning from scratch.

## Deliverable

A single markdown report at `00-project-management/pattern-audit-report.md` containing:

1. **Executive summary** — how many new patterns proposed, and the single highest-priority one to codify next.

2. **Proposed templates** — for each:
   - Proposed template name (kebab-case, e.g. `side-drawer-editor`)
   - One-line description
   - Evidence: list of 2+ files/features that implement this pattern, with file paths
   - Variable parts that would differ between instances
   - Priority: High / Medium / Low (see priority rules below)
   - Relationship to existing templates (sibling? variant? distinct?)

3. **Patterns considered but not proposed** — short section explaining recurring-looking things that are actually one-offs or don't warrant a template yet (used only once, too feature-specific, etc.).

4. **Recommended template-writing order** — a numbered list of which to write first, with a one-sentence rationale per item.

## What counts as a pattern worth a template

A pattern should have:
- **At least 2 instances** in the existing code (or 1 instance + strong signal it will recur — e.g. the feature type is plural and the schema shows more of them coming)
- **Structural repetition**, not surface repetition. "Two pages use cards" is not a pattern. "Two pages use a left-aside + right-tabbed-content with fixed chrome and the same edit affordances" is.
- **Variable parts that can be named** — if the pattern can't be described as "fixed X + variable Y, Z, W", it's probably too abstract to template
- **Non-trivial decisions embedded** — spacing, scroll behaviour, empty-state handling, autosave contracts, etc. A pattern worth templating carries design decisions that future builds would otherwise re-litigate

Do NOT propose templates for:
- Single-use pages (sources, chat, process) unless they clearly match a pattern also used elsewhere
- Pure molecule usage (a page that just composes standard molecules in obvious ways)
- Dashboard home page, which is intentionally a one-off

## Priority rules

- **High**: pattern has 3+ instances and is likely to recur in planned M4/M5 features (content creator, DNA overview, remaining DNA types)
- **Medium**: pattern has 2-3 instances, likely to recur in 1+ planned feature
- **Low**: pattern has 2 instances but no clear upcoming use; worth capturing for completeness but not blocking other work

## Scope

**In scope for review:**
- `02-app/app/(dashboard)/` — all routes and their components
- `02-app/components/` — shared molecules and organism-adjacent components
- `01-design/wireframes/` — existing layout specs, to cross-reference what was designed intentionally vs emergent

**Out of scope:**
- `02-app/app/api/` (API routes)
- `02-app/lib/` (non-UI code)
- Writing actual template files (the deliverable is the report only)
- Proposing changes to existing templates

## Features built so far (for orientation)

The subagent should scan these areas; grouping by which template (if any) already covers them:

Already covered by `dna-plural-item`:
- DNA-03 audience segments — `app/(dashboard)/dna/audience-segments/`
- DNA-04 offers — `app/(dashboard)/dna/offers/`
- DNA-05 knowledge assets — `app/(dashboard)/dna/knowledge-assets/`
- DNA-07 platforms — `app/(dashboard)/dna/platforms/`

Already covered by `project-workspace`:
- CLIENT-01 client projects — `app/(dashboard)/client-projects/` (exact path — verify)
- MISSION-01 missions — `app/(dashboard)/missions/` (verify)

Partially covered:
- DNA-02 singular DNA (business-overview, brand-meaning, value-proposition, tone-of-voice) — MAY reveal a `dna-singular` pattern worth capturing
- DNA-09 tone-of-voice page — tabs already captured by the two new tab templates; base fields + tabs + fixed chrome may be worth another look

Not yet covered:
- IDEA-01 ideas — global capture + flat triage list + embeddable IdeasPanel molecule
- DASH-01 dashboard shell — sidebar + home
- Inputs/process page — `app/(dashboard)/inputs/process/`
- Sources pages
- Chat (OUT-01)

## Explicit instructions for the subagent

1. Read ALL existing templates in `01-design/wireframes/templates/` first — so you know what's already covered and can avoid duplication.
2. Read `01-design/wireframes/` layout specs — they document intent for features that made it through `layout-design`.
3. Read `01-design/design-system.md` — understand the molecule layer so you don't mistake "uses PageChrome" for a pattern.
4. Do NOT write any templates. Just propose them in the report.
5. Do NOT modify any code or existing files except writing the report.
6. Do NOT update the feature-template-check skill's registry list. That's Ellie's call once she reviews proposals.
7. When in doubt about whether something is a pattern or a one-off, include it in the "considered but not proposed" section with your reasoning. It's more useful to know you looked and ruled it out than to silently omit.
8. If the audit reveals missing design-system molecules (things that are repeated in components but not codified), flag those separately at the end of the report as "molecule candidates" — but again, don't write them.

## How to launch

Use the Agent tool with subagent_type=Explore. The task is read-only research plus writing one markdown report. Budget: "very thorough" exploration level — the value of this audit comes from completeness.

## Open questions / TBDs

- None blocking. The subagent has enough context to proceed.

## Decisions log
- 2026-04-24: Brief created and approved by Ellie. Scope deliberately limited to report only — Ellie reviews before any templates are written.
