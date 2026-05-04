---
status: draft
source_type: accountability-checkin
related_features: INP-12
last_updated: 2026-05-04
default_authority: peer
chunking: speaker-turn
graph_shape: source-document
---

# Source-type fragment — accountability-checkin

## Definition

A short, recurring accountability or status conversation. Examples: daily morning calls, weekly check-ins with an accountability partner, regular structured sessions where Ellie reports on commitments, blockers, and intentions for the period ahead. Usually brief (10–30 minutes), structured around the same questions session-to-session, low on novel substance per session but high on longitudinal signal.

Per project memory, the most common contributors are Justyna (whose engagement is wrapping up) and other accountability partners. The value of these sources is almost entirely longitudinal — single sessions yield little; the trajectory across many sessions is where the signal lives.

Distinct from `coaching-call` (deeper, exploratory) and `peer-conversation` (mutual exchange, not check-in-shaped).

## Default surfaces (per ADR-009)

Status, blockers, commitments, energy patterns.

The high-value categories: **status** (what was done, what wasn't, what's in flight), **blockers** (what got in the way, especially recurring patterns), **commitments** (what Ellie commits to for the next period), **energy patterns** (often more visible in accountability sources than elsewhere — when Ellie sounds high-energy vs depleted is signal that compounds across sessions).

These sources almost always pair with the `self-reflective` lens run over a period. Single-session lensing yields thin output; the lens's value is reading 4+ sessions as a trajectory.

## Likely participants

Two voices typically: Ellie and the accountability partner. Roughly symmetric — both share status, both ask questions. But the substance is overwhelmingly Ellie's: this is her accountability practice; the partner's role is to ask, reflect, and witness.

Bias extraction toward **Ellie's contributions**. The partner's questions are scaffolding; their reflections are usually short and supportive. Extract them only when they contain genuine substance.

## Authority default + override guidance

Default `authority: peer` — these are collaborative practice conversations.

Override to `own` when the accountability practice is solo (Ellie recording her own check-ins as voice notes — a `voice-note`-shaped source that's been classified as `accountability-checkin` because of its recurring structure). The line is fuzzy; use `own` when there's no second speaker.

Do not override to `external-authoritative` — accountability content is personal practice, not citable evidence about the world.

## Prompt fragment

This source is an **accountability-checkin** — a short, recurring conversation organised around status, blockers, commitments, and intentions. These sessions are individually thin but longitudinally rich. A single session is usually 10–30 minutes and follows roughly the same structure each time.

Bias your extraction strongly toward **Ellie's contributions**, not the partner's. The partner's questions and reflections are scaffolding — extract from them only when they contain genuinely substantive observations (rare).

The most valuable extractions from a single accountability check-in are usually:

1. **Status** — what was done since last session, what wasn't, what's in flight. Capture as factual record; don't promote routine status to "ideas".
2. **Blockers** — what got in the way. Be specific and quote-faithful: "task-switching fatigue, especially in afternoon client work" is more useful than "user mentioned feeling stretched".
3. **Commitments** — what Ellie commits to for the next period. These are the spine that connects sessions; commitments are the longitudinal trace `self-reflective` will analyse.
4. **Energy markers** — moments where Ellie sounds high-energy or low-energy, depleted or recovered, focused or scattered. Capture these as observations with `low` or `medium` confidence; they're interpretive but valuable. Quote where possible.
5. **Recurring themes** — even single-session, you can sometimes hear "this has come up again" — accountability is the source-type where this is most visible. Flag explicitly.

Be **honest** in extraction. Avoid the temptation to extract motivational or aspirational material as "commitments" if the session shows hesitation or non-commitment. Banned coaching-speak (`growth journey`, `holding space`, `stepping into power`) is not extractable as concepts; if the partner uses these phrases, they're partner-language, not Ellie's voice.

The user reads accountability material primarily for **self-understanding via trajectory**. Single-session extraction is not the main use case. When this source is lensed individually (e.g. surface-extraction on one check-in), expect short arrays — that's the right shape. The compounding value lives in the longitudinal lens.

## Edge cases

- **Sessions that are entirely status / no commitments / no blockers**: rare but happens. Return short arrays. Flag in `unexpected[]` if the session feels qualitatively different (e.g. Ellie was depleted and the partner mostly listened — this is itself signal for `self-reflective`).
- **Final sessions of an accountability arc** (per project memory: Justyna's engagement ending): often contain meta-reflection about the practice itself. Extract as substantive material; this is where `metaAnalysis` content lives in the `self-reflective` lens.
- **Voice-note self-checkins**: Ellie sometimes records solo accountability check-ins as voice notes. Same fragment applies; authority shifts to `own`.
- **Mixed sessions** (accountability that pivots into coaching or strategy): default to `accountability-checkin` if the structure is preserved; override at triage if more than half the session is non-checkin work.
