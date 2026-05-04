---
status: draft
source_type: meeting-notes
related_features: INP-12
last_updated: 2026-05-04
default_authority: peer
chunking: speaker-turn or paragraph
graph_shape: source-document
---

# Source-type fragment — meeting-notes

## Definition

A multi-party project meeting — three or more participants, scoped to a specific purpose, with multiple voices contributing across the session. Examples: client kickoff calls (Ellie + multiple client team members), cross-organisational project meetings (Ellie + supplier + client representative), internal team meetings within client engagements, advisory board sessions.

The defining frame is **multi-party + project-bounded**. Distinct from `client-interview` (two-party, structured, Ellie interviewing one person) and `peer-conversation` (typically two-party, mutual, no project frame).

## Default surfaces (per ADR-009)

Decisions, action items, attendees.

The high-value categories: **decisions** (what the group decided, including informal agreements), **attendees** (every named participant — meetings are dense with people who matter for the project), **scope and trade-offs** (what the group agreed is in vs out, what's being deferred), **disagreements and tensions** (often more visible in multi-party than two-party sources — surface where decisions weren't fully aligned).

Note: **action items / to-dos are deliberately deprioritised** for the lens. The base prompt says don't extract action items — that rule applies. Capture decisions (knowledge), not tasks (operational state).

## Likely participants

Three or more voices. Speaker-turn chunking distinguishes them — but on transcripts of multi-party calls, speaker labels are often noisy or missing for some participants. The user can correct in the per-item review step; you do your best with what's labelled.

Substance is distributed across speakers. **Do not bias toward Ellie's contributions** — in a client kickoff call, the client's words are usually the higher-value extraction. Attribute extracted items to the speaker who said them; for items that emerged across the group, name the contributors.

## Authority default + override guidance

Default `authority: peer` — multi-party project meetings are usually collaborative.

Override to `external-authoritative` when the meeting is functionally a structured interview with multiple expert voices on one side (e.g. Ellie + research partner interviewing a panel of investors). The panel's contributions become citable evidence.

Override to `own` is rare for this source type — even when Ellie chairs the meeting, the multi-party shape means the substance is collective. Flag at triage if a particular meeting was dominated by Ellie's framing.

## Prompt fragment

This source is **meeting-notes** — a multi-party project meeting (three or more participants, scoped to a project or work session). Substance is distributed across multiple speakers; speaker-turn chunking distinguishes them but labels can be noisy on automatic transcripts.

Bias your extraction:

1. **Decisions over discussion.** A decision made (or surfaced as needed) is high-value; the deliberation that led to it is usually less valuable than the conclusion. Capture the substance of the decision and (where evident) the reasoning, not the full back-and-forth.
2. **Attribute carefully.** Multi-party transcripts are noisy. When you cite a quote or attribute an idea, use the named speaker if labelled. When the speaker is unclear or unlabelled, say so in the item's text rather than guessing — e.g. "stated by an unidentified attendee in the second half of the call". Do not invent a speaker.
3. **Extract every named person and organisation**. Project meetings are dense with people who matter (decision-makers, reference customers, advisors, vendors). The user is going to review and resolve canonical matches against the existing graph; your job is to surface the names with the context they appeared in.
4. **Surface disagreements and tensions**. Multi-party meetings often have moments where the group didn't quite agree — someone qualified, someone pushed back, the conversation moved on without resolution. These are high-value for `pattern-spotting` lenses run later. Capture the substance, not just "there was some disagreement".
5. **Skip action items and to-dos**. These belong in project management, not the knowledge graph. The exception: when an action item reveals a decision, a constraint, or a methodology ("we'll do X because of Y"), the *Y* is extractable.

Where the source contains genuine technical or strategic substance (architectural decisions, scope decisions, methodology agreements), extract it as for `supplier-conversation` or `client-interview`. Where the source is mostly status and coordination, return short arrays — meeting-notes sources are highly variable in extraction yield.

## Edge cases

- **Meetings without speaker labels** (e.g. a poorly-transcribed group call with all turns labelled "Speaker"): you cannot reliably attribute. Capture extracted items with attribution like "in this meeting, but speaker not identified". The user resolves at review.
- **Meetings dominated by one speaker** (e.g. a kickoff where the client team's lead does 80% of the talking): the source-type still applies if there were multiple participants. Substance is heavily skewed; extract from the dominant speaker primarily.
- **Internal-only meetings** (e.g. NicelyPut team meetings, if Ellie has a team): these would be `meeting-notes` with `authority: own` — the overrides section above covers this, though the case is rare.
- **Recorded panel discussions / events**: technically meeting-shaped but often public-facing material. Treat as `meeting-notes` for ingestion; consider separate handling if a future feature distinguishes public events from private meetings.
- **Hybrid meetings that include unstructured group conversation alongside structured agenda**: fragment applies to the whole. The lens reads it as one corpus.
