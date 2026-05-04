---
status: draft
source_type: coaching-call
related_features: INP-12
last_updated: 2026-05-04
default_authority: peer
chunking: speaker-turn
graph_shape: source-document
---

# Source-type fragment — coaching-call

## Definition

A coaching session where Ellie is the one being coached, or (less often) where she is coaching someone else. Bounded by a coaching engagement or a one-off session. The defining characteristic is that one party is in the role of working through their own thinking, blockers, or development — and the other party is supporting that process, not contributing peer-level substance.

Distinct from `peer-conversation` (mutual exchange) and `accountability-checkin` (status updates, not deep work).

## Default surfaces (per ADR-009)

Realisations, shifts in thinking, blockers, commitments.

The high-value categories: **realisations** (moments where the coachee saw something they hadn't seen before), **shifts** (changes in stance, framing, or priority that emerged through the session), **blockers** (what's actually getting in the way — usually clearer in coaching than in self-reflection alone), **commitments** (what the coachee committed to do, by when, and why).

These are personal-development and self-knowledge sources — the lens this source-type pairs most naturally with is `self-reflective`. Surface-extraction works too but yields softer outputs (concepts, methodologies referenced) than for client-interview-shaped sources.

## Likely participants

Two voices: the coach and the coachee. The coachee is almost always Ellie (when these are her own coaching sessions); occasionally Ellie is the coach.

Speaker-turn chunking will distinguish them. Bias extraction toward **the coachee's contributions** — that's where the realisations, shifts, and commitments live. The coach's role is question-asking, reflecting, holding space. Their words sometimes contain insight (a sharp framing, a useful technique) but usually scaffold the coachee's work.

## Authority default + override guidance

Default `authority: peer` — coaching is collaborative, even when asymmetric.

Override to `own` when Ellie is the coachee and the source feels more like internal work than external dialogue (e.g. self-coaching, journaling that became a session). The line is fuzzy; default `peer` is fine in most cases.

Do not override to `external-authoritative` — coaching content is not a citable claim about the world. Even when the coach makes useful observations, those are heuristics for personal use, not facts.

## Prompt fragment

This source is a **coaching-call** — a session where one party (usually Ellie) is being coached. The defining frame is that this is *personal-development work*, not strategic consultation or research.

Bias your reading toward the **coachee's process**: where they got stuck, where they saw something new, what they committed to, what's still in the way. The coach's questions and reflections are scaffolding — surface their contributions only when they contain genuinely transferable insight (a sharp framing the coachee adopts, a technique introduced and used). Don't extract every coach prompt as a "concept".

The most valuable extractions from a coaching call:

1. **Realisations** — moments the coachee saw something they hadn't seen before, or named something that had been latent. These are usually high-confidence ideas. Capture them with enough context to be intelligible later (what prompted the realisation, what it shifts).
2. **Shifts in thinking** — places where the coachee's stance, framing, or priority changed across the session. Usually emerges through dialogue, not in a single utterance — read the arc.
3. **Blockers** — what's actually getting in the way. Coaching often surfaces blockers that self-reflection misses (because the coach asks the question that breaks the avoidance). Capture the blocker substantively, not as "user mentioned feeling stuck".
4. **Commitments** — what the coachee said they would do, by when, and why. These are often where the trajectory of growth lives — they connect across sessions.
5. **Recurring themes** — coaching sessions tend to revisit a small number of themes over time. If the source acknowledges "this has come up again", that's signal.

Be honest in your extraction. Generic coaching-speak (`growth journey`, `holding space`, `stepping into power`) is forbidden — the user has explicitly asked for this rule across the system. If the coach uses these phrases, you don't need to extract them as concepts; quote them only if they're actually substantive in the source's context.

The user reads coaching-call material **for self-understanding, not validation**. Extracting flattering observations the coachee didn't earn is worse than no extraction. When the source shows avoidance, dropped commitments, or stuck patterns, those are extractable too.

## Edge cases

- **Sessions where Ellie is the coach**: invert the bias — the substance comes from her client. Authority stays `peer`. The lens consumer (usually `self-reflective` running over a series) will care less about these than about Ellie's own coaching sessions.
- **Sessions that are mostly check-in**: if the source is more accountability than coaching (status, plans, no real exploration), the source-type is probably wrong — flag in `unexpected[]` and the user can re-classify.
- **Sessions ending a coaching arc**: per project memory, certain coaching engagements (e.g. Justyna sessions) are wrapping up. Final sessions often contain meta-reflection about the engagement itself — extract as `metaAnalysis`-shaped material if running `self-reflective`, or as `realisations` if running `surface-extraction`.
- **Group coaching / mastermind sessions**: technically meeting-notes-shaped, but if the coachee is one of the group and the work is on her, treat as coaching-call. Distinguish speakers carefully.
