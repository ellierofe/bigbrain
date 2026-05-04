---
status: approved
type: prompt-fragments
related_features: INP-12
last_updated: 2026-05-04
depends_on: ADR-009, lens-prompts/_README.md, src-source-documents.md
---

# Extraction schemas — source-type prompt fragments

One file per source type in the controlled vocabulary, plus a shared `_base.md` and this README. Each file holds the prompt fragment composed into the system prompt at processing time, telling the LLM what to expect from this kind of source and which extraction categories to bias toward.

Per ADR-009, the system prompt sent to the LLM is composed at runtime from three pieces:

```
[base extraction prompt]      ← _base.md  ← THIS DIRECTORY
+ [source-type schema fragment] ← {source-type}.md  ← THIS DIRECTORY
+ [lens fragment]               ← lens-prompts/{lens}.md
```

Fragments live as markdown so they are editable without code changes. A build-time validator asserts every source type in the controlled vocabulary (except `dataset` — see below) has a registered file here.

## The 12 source-type fragments + base

| File | Source type | Default authority | Chunking strategy | Graph shape |
|---|---|---|---|---|
| `_base.md` | (universal) | — | — | — |
| `client-interview.md` | `client-interview` | `peer` (often overridden) | speaker-turn | source-document |
| `coaching-call.md` | `coaching-call` | `peer` | speaker-turn | source-document |
| `peer-conversation.md` | `peer-conversation` | `peer` | speaker-turn | source-document |
| `supplier-conversation.md` | `supplier-conversation` | `peer` (often overridden) | speaker-turn | source-document |
| `accountability-checkin.md` | `accountability-checkin` | `peer` | speaker-turn | source-document |
| `meeting-notes.md` | `meeting-notes` | `peer` | speaker-turn or paragraph | source-document |
| `internal-notes.md` | `internal-notes` | `own` | paragraph | source-document |
| `research-document.md` | `research-document` | `external-authoritative` | paragraph (sections as logical groups) | source-document |
| `pitch-deck.md` | `pitch-deck` | `own` (override for external samples) | slide | source-document |
| `report.md` | `report` | `own` | paragraph | source-document |
| `collection.md` | `collection` | `external-sample` | item-children | source-collection |
| `content-idea.md` | `content-idea` | `own` | paragraph | source-document |

## `dataset` is intentionally absent

The 13th source type in the controlled vocabulary, `dataset`, has **no** extraction-schema fragment. Datasets ingest via the `kg-ingest-creator` skill (SKL-12) — they go directly into FalkorDB + Neon as nodes/edges, queried by graph traversal, not lensed. The runtime should reject any attempt to compose a system prompt with `sourceType='dataset'` (raise a `LensNotApplicableError`).

The lens picker UI hides or disables itself for dataset sources, with a link to the graph view instead.

This is recorded in ADR-009 as a follow-up amendment.

## File structure

Each source-type fragment file follows this shape:

```markdown
---
status: draft | approved
source_type: <source-type-id>
related_features: INP-12
last_updated: YYYY-MM-DD
default_authority: <own | peer | external-authoritative | external-sample>
chunking: <speaker-turn | paragraph | section | slide | item-children>
graph_shape: source-document | source-collection
---

# Source-type fragment — <source-type-id>

## Definition
What kinds of things qualify as this source type. Examples.

## Default surfaces (per ADR-009 §Source types table)
The categories most likely to be present — biases the lens prompt toward looking for these.

## Likely participants
Who typically speaks/contributes; what to expect from speaker turns.

## Authority default + override guidance
Default value + when to override.

## Prompt fragment
The actual prose composed into the system prompt. Verbatim — load it directly.

## Edge cases
Common shape variants and how to handle them.
```

## What `_base.md` covers

The base prompt provides everything that's universal across lens × source-type combinations, so individual fragments can stay short and focused on what makes them distinct:

- **Identity context** — who Ellie is, what NicelyPut does, who her clients tend to be.
- **Quality bar** — extract selectively; depth over breadth; the "useful in 6 months" test.
- **Source format convention** — the `--- SOURCE: <id> | <title> | <date> | <source_type> | <authority> ---` header spec.
- **Confidence vocabulary** — `high` / `medium` / `low`.
- **The universal `sourceRefs` contract** — source ids only, never titles or dates.
- **The "no invent / no silent canonical resolution" rule** — bounds on inference.
- **The universal `unexpected[]` output field** — a per-lens output array that lets the LLM surface left-field observations that didn't fit the lens's frame but seem worth flagging.

Lens fragments and source-type fragments do not duplicate these — they extend them.

## Composition order at runtime

```
1. _base.md verbatim
2. {source-type}.md verbatim (or LensNotApplicableError if sourceType='dataset')
3. {lens}.md verbatim
```

Concatenated with two blank lines between each. The runtime validates at startup that all required fragment files exist; missing files are a deployment error, not a runtime error.

## Editing notes

- Source-type fragments are tuned during re-ingest day. First-pass drafts are good enough to validate the pipeline; expect revisions once real outputs are reviewed.
- Keep prompt fragments under ~300 words each. The lens does most of the heavy lifting; source-type fragments bias and shape expectations.
- Hardcoded business context (`Ellie Rofe at NicelyPut...`) lives in `_base.md`, not here. If a source-type fragment names a person, organisation, or domain, that's a smell.
- If a fragment grows beyond 300 words, that's usually a signal that material belongs in `_base.md` (because it's actually universal) or in a lens fragment (because it's lens-specific, not source-type-specific).
