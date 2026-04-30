---
name: session-log
description: Draft and save a session log at the end of a working session. Use when wrapping up a session or switching context.
---

# session-log (SKL-10)

Record what happened in a working session so context is never lost between conversations.

## Purpose

Draft a session log at the end of a working session. Covers what was built, decisions made, what's next, and any context future sessions will need. Saved to `00-project-management/sessions/`.

## Autonomy level

**Human-confirmed draft** — the model writes the log autonomously from conversation context, then presents it for review before saving. The human's job is to catch anything missing or wrong, not to write it themselves.

## Pre-conditions

- Called at the end of a session, or when switching context mid-session
- No other pre-conditions — this skill has no dependencies

## Steps

### Step A: Gather context

Before drafting, gather:

1. Read `00-project-management/backlog.md` — note any features whose status changed this session
2. Read `00-project-management/milestones.md` — note current milestone and whether exit criteria moved
3. Check `00-project-management/sessions/` for the most recent log — understand where the last session left off so this log reads as a continuation
4. Review the current conversation — identify: what was worked on, what decisions were made, what came up unexpectedly, what's unresolved

### Step B: Generate a session ID

Every log gets a unique session ID to support parallel sessions and unambiguous sequencing:

Format: `YYYY-MM-DD-[topic]-[3-char alphanumeric suffix]`

The suffix is random (e.g. `a4k`, `9bz`) — generate it yourself. It prevents filename collisions when two sessions on the same day cover similar topics, and makes each log individually referenceable.

Examples:
- `2026-03-29-schema-design-a4k`
- `2026-03-29-schema-design-9bz` (second session same day, same topic)
- `2026-03-29-session-log-skill-x2m`

### Step C: Identify decisions that need an ADR

Before drafting the log, review the session's decisions and ask: does any decision meet the ADR bar?

**ADR bar:** A decision warrants an ADR if it:
- Affects architecture, data model, or tech choices in a durable way
- Would be non-obvious to revisit without knowing the reasoning
- Other sessions might question or unknowingly contradict

Examples that warrant an ADR: schema design choices (why a field is structured a certain way, why two tables relate as they do), technology selections, data model patterns, naming conventions with system-wide impact.

Examples that don't: implementation details, UI choices, wording decisions, anything easily reversible.

If one or more decisions meet the bar, draft the relevant ADR(s) now (before drafting the session log). ADRs live in `00-project-management/decisions/` and follow the format of `adr-001-tech-stack.md`:
- Status, date, what it decides
- Context (why this decision was needed)
- Decision (what was chosen and why)
- Consequences / what this means in practice
- What was ruled out and why

Reference any new or updated ADRs in the session log's "Decisions made" section.

**Parallel-session ADRs:** if the working tree contains an unstaged ADR file authored by another session (running concurrently or earlier the same day), do NOT claim it as a session decision. Mention it in "What came up that wasn't planned" with the originating session ID, and reference it in "Decisions made" only if this session genuinely depended on or updated it. Step I will surface the dual-session commit boundary separately.

### Step D: Draft the log

Produce a draft in this structure:

```markdown
# Session log — YYYY-MM-DD — [topic]
Session ID: [YYYY-MM-DD-topic-xxx]

## What we worked on
[Feature IDs and names, e.g. SKL-10, SKL-11, SKL-01]

## What was done
[Concrete list of what was built, written, decided, or changed. Be specific — future sessions should be able to understand the state of the work from this log alone. Include file paths for anything created or modified.]

## Decisions made
[Non-obvious choices made during the session and why. ADR-worthy decisions should reference the ADR file — e.g. "See ADR-002". Decisions not warranting an ADR can be captured inline here.]

## What came up that wasn't planned
[Ideas, blockers, scope changes, feature requests captured mid-session. If a feature-request was filed, reference the new backlog entry.]

## Backlog status changes
[List any features moved from planned → in-progress → done, or any new features added. Only list features this session actually touched.]

## What's next
[Specific next actions — feature IDs, decisions needed, open questions. Enough detail that a future session can start without re-reading the whole conversation.]

## Context for future sessions
[Anything that would be easy to forget but matters — constraints discovered, things to watch out for, half-finished work, open questions]
```

**Note on parallel sessions:** Each session log is self-contained and only reflects the work of that session. Do not attempt to reconcile with other sessions' work — backlog updates only cover features this session touched.

### Step E: Human review

Present the draft (and any ADR drafts). They may:
- Confirm it looks right → proceed to Step F
- Add missing context → update and re-present
- Correct anything inaccurate → update and re-present

Do not save until confirmed.

### Step F: Save

Save the session log to `00-project-management/sessions/[session-id].md`. Save any ADR files to `00-project-management/decisions/`.

### Step G: Update backlog and milestones

Update `00-project-management/backlog.md` to reflect any status changes noted in the log. Only update features this session actually worked on — leave everything else as-is.

Then check `00-project-management/milestones.md`: if any milestone exit criteria items were completed this session, tick them off. If a milestone is now fully complete, update its status.

### Step H: Self-improvement check

After saving, briefly assess this session's use of the skill system:

1. Did any skill behave unexpectedly or produce output that needed significant correction?
2. Were there gaps in any skill — things the session needed that the skill didn't cover?
3. Was anything missing from the session log template that would have been useful?

If you identify a specific, actionable improvement to any SKILL.md file, propose it now. The human can confirm or dismiss. If confirmed, update the relevant SKILL.md and note the change in the decisions log section of this session log.

Only raise improvements that are material — don't propose changes for the sake of it.

### Step I: Commit and push

Stage and commit the session's work as a single per-session commit, then push to `origin`. This is the convention going forward (established 2026-04-27 after a four-week gap forced a bulk recovery — see commit `76233c4`).

**What to stage:** every change made this session — files created, modified, deleted across the whole repo (code, schemas, briefs, layouts, ADRs, the new session log itself, backlog updates, milestone updates, any SKILL.md edits from Step H).

**What NOT to stage:** files outside the session's scope that happen to be unstaged from prior work. If you find such files, surface them explicitly to the human — they shouldn't ride along silently.

**Pre-commit checks:**
- Scan for secrets (`.env*`, credential files) — never commit these
- Scan for editor/OS artefacts (`~$*` Office lock files, `.DS_Store`) — should be in `.gitignore`; if encountered, add to `.gitignore` first
- Run `git status` and present the staged file list to the human before committing

**Commit message format:**

```
<type>(<feature-id>): <one-line summary>

<2–4 sentences of what shipped and why, written in the past tense>

Session: [session-id]
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

Where `<type>` is one of: `feat` (new feature), `fix` (bug fix), `refactor`, `docs`, `chore`, `catch-up` (only if recovering from gaps).

Examples:
- `feat(DNA-07b): channel taxonomy consolidation`
- `fix(OUT-01): chat scroll bug on long messages`
- `docs(ADR-007): external data sources`

**Push:** after committing, push to `origin` (`git push`). The convention is "always push" — single-user app, GitHub mirrors local.

**If the working tree is unexpectedly large** (more files than this session touched), surface it to the human before staging — likely a prior session didn't commit. Decide together whether to roll prior work into this commit or roll a separate catch-up commit first.

## Edge cases

- **Session had no concrete output** (e.g. planning, discussion only): Still log it. Decisions and orientation are worth recording. Note "no code/files changed" explicitly.
- **Multiple topics in one session:** Use the dominant topic for the filename slug. List all topics in "What we worked on".
- **Session was interrupted mid-task:** Note the interruption point explicitly in "What's next" so the next session knows exactly where to pick up.
- **Skill called mid-session (context switch):** Log what's done so far, note the switch. A second log can be written at end of session if work continues.
- **Two sessions ran in parallel:** Each produces its own log with its own session ID. They don't merge. If both touched the same backlog entries, the human reconciles manually — each log clearly states which features it updated.
- **Session ran out of context before Step G:** The self-improvement check gets deferred to the next session. Run it at the start of that session — the human will often prompt it directly. Note any skill changes made in the decisions section of the new session's log rather than the previous one.
- **Session continues after context reset (new conversation, same work):** Write a new log for the continuation. In "What we worked on", note it explicitly: "Continuation of [prior-session-id]". Only log what happened in this conversation — don't re-log work already captured in the prior session. Backlog and milestone updates only cover features that reached a new status in this conversation.
