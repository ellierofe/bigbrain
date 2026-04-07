---
name: feature-request
description: Capture an ad hoc idea as a structured backlog entry without derailing the current session. Use when a new idea or requirement comes up mid-session.
---

# feature-request (SKL-11)

Capture an ad hoc idea as a properly structured backlog entry. The ADHD pressure valve — get the idea filed without derailing the current session.

## Purpose

When a new idea or requirement surfaces mid-session, this skill structures it and adds it to `00-project-management/backlog.md` so it isn't lost and doesn't take over the current thread.

## Autonomy level

**Human-confirmed entry** — the model does all the structuring and conflict-checking autonomously; the human confirms the entry looks right before it's written to the backlog. Lightweight by design: the point is speed of capture, not depth of analysis.

## Pre-conditions

- None. This skill can be called at any time, from any context.

## Steps

### Step A: Receive the idea

The human describes the idea — as rough or detailed as they have. Voice-transcribed text is fine. Do not ask for a structured brief; the point is low-friction capture.

### Step B: Read current backlog state

Before structuring the entry:

1. Read `00-project-management/backlog.md`
   - Find the next available feature ID in the relevant section (e.g. if adding to OUTPUTS, check what the last OUT-XX number is)
   - Scan for any existing features that overlap with or duplicate this idea
   - Note any features this new idea would depend on or enable

2. Read `04-documentation/domain-model.md` (skim) — check whether this idea fits the domain model's five core problems and design rules, or cuts against them

### Step C: Structure the entry

Produce a draft backlog entry in the standard format:

```markdown
### [ID]: [Feature name]
- **What:** [One clear sentence describing what this feature does]
- **Layer:** [infra / data / input / output / cross]
- **Problems:** [P1–P5 or "none directly"]
- **Size:** [S / M / L / XL]
- **Depends on:** [feature IDs or "nothing"]
- **Enables:** [feature IDs or "nothing identified yet"]
- **Status:** planned
- **Note:** [Any important constraint, open question, or context — omit if nothing to add]
```

If the idea is clearly out of scope for the current build phase, flag it as `parked` rather than `planned` and say why.

If the idea conflicts with an existing feature or decision, flag it explicitly — don't silently merge or discard.

### Step D: Human confirmation

Present the structured entry with a one-line summary of any conflicts or flags.

Human confirms, or:
- Asks for changes → update and re-present
- Says it's out of scope → mark as `parked` and note why
- Says it duplicates something existing → don't add; note the existing feature ID

Do not write to the backlog until confirmed.

### Step E: Add to backlog

Insert the confirmed entry into the correct section of `00-project-management/backlog.md`, in ID order. Update the feature count table at the bottom if the layer count changes.

### Step F: Return to current work

Confirm the entry is saved. Then return to whatever the session was doing before. Do not pivot to the new feature unless the human explicitly asks to.

### Step G: Self-improvement check

After filing the entry, briefly check:

1. Was the backlog format clear enough to fill in without ambiguity? If anything felt forced or missing in the entry format, note it.
2. Did any aspect of the structuring process produce output the human had to significantly correct?

If there's a specific, actionable improvement to this SKILL.md, propose it. Human confirms or dismisses. If confirmed, update the file.

## Edge cases

- **Idea is actually a change to an existing feature:** Don't create a new entry — note the existing feature ID and suggest using `feature-update` (SKL-07) when ready to act on it.
- **Idea spans multiple layers or features:** It may warrant being split into 2-3 entries. Propose the split if obvious; ask if unclear.
- **Human gives a very rough idea with no detail:** Fill what you can with `[TBD]` markers and note what needs answering before the feature can be built. The entry is a placeholder, not a spec.
- **Idea is actually urgent and should start now:** Note this, but still file it properly. If the human wants to act on it immediately, the next step is `feature-brief` (SKL-01), not skipping straight to build.
