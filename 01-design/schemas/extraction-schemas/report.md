---
status: draft
source_type: report
related_features: INP-12
last_updated: 2026-05-04
default_authority: own
chunking: paragraph (with sections as logical groups)
graph_shape: source-document
---

# Source-type fragment — report

## Definition

A finished or near-finished output authored by Ellie or by NicelyPut — a published research piece, a strategy document delivered to a client, a positioning report, a market research write-up, an essay or article published under her name. The defining frame is **own authorship + audience-shaped + finished**: this is content that left her keyboard for someone else's eyes, polished to a public-facing standard.

Distinct from `internal-notes` (her own thinking, unpolished), `pitch-deck` (slide-shaped argument), and `research-document` (externally authored).

## Default surfaces (per ADR-009)

Own arguments, claims, recommendations.

The high-value categories: **arguments** (the report's core positions and how it builds them), **claims** (specific assertions Ellie made — these are her on-record positions, important for content consistency and for tracing how her thinking has evolved), **recommendations** (the report's actionable conclusions — what Ellie advised), **methodologies** (the analytical or research method the report applied — extractable as `Methodology` nodes for reuse on similar future work).

These are voice-canonical sources. Extracted material here is high-value for content generation, for ensuring consistency across Ellie's published positions, and for understanding her own intellectual trajectory.

## Likely participants

One author (Ellie) or named co-authors. No speakers; chunking is per paragraph, with sections as logical groups.

When a report cites or quotes named individuals (interviewees, advisors, customers featured in case studies), extract them as `Person` nodes. When it names organisations (clients, partners, references, competitors), extract them as `Organisation` nodes.

## Authority default + override guidance

Default `authority: own` — definitionally correct for Ellie's own published outputs.

Override to `peer` when the report is co-authored with a peer or when Ellie was a contributor rather than the primary author. The line is fuzzy; default `own` is fine for anything where Ellie has clear authorship.

Do not override to `external-authoritative` or `external-sample` — by definition this source type is Ellie's authorship.

## Prompt fragment

This source is a **report** — a finished or near-finished output authored by Ellie or NicelyPut. Published to an audience: a client, a public readership, an industry. The text is polished, the arguments are built, the claims are on-record. Single-author (or named co-authors), paragraph-chunked with section structure.

Bias your extraction toward **Ellie's voice and her on-record positions**:

1. **Arguments and claims, in her words.** A report is where Ellie has committed to specific positions for an audience. Extract the substance of her arguments and the specific claims she made. Use `sourceQuote` (where the lens schema includes it) to capture exact phrasings — the way Ellie writes when she's writing for an audience is canonical reference material for content generation.
2. **Recommendations.** When the report makes recommendations (to a client, to a sector, to readers), extract them substantively — what was recommended, on what basis, with what caveats. These are decisions Ellie advised.
3. **Methodology.** When the report describes how its findings were produced (research process, analytical framework, evaluation approach), extract as a `Methodology` node. Especially valuable for reports that are themselves research or strategy outputs — the methodology is reusable for similar future work.
4. **Voice and register.** The report carries Ellie's published voice. Capture characteristic phrasings, framings, and moves — both as `sourceQuote` and in the item's text. Resist smoothing the language; the specific words matter.
5. **References and citations.** Reports cite their own sources — other research, interview subjects, organisations referenced. Extract these (as `Person`, `Organisation`, or as references the report leans on). Useful for understanding what Ellie has built her positions on.

For reports, **`confidence` reflects what Ellie committed to in writing**: explicit claims are `high`; nuanced or hedged positions retain their hedging in the extraction. Don't promote a hedged claim to a confident one — the hedge is part of her published position.

When the report contains **case-study material** (a client engagement told as narrative), extract the case study as a `story` item and the underlying methodology as a `methodology` item. Both are valuable; together they form a portable reference Ellie can draw on for similar future work.

## Edge cases

- **Reports that were drafted but not delivered**: still treat as `report` if the content was finished to public-facing standard. The `is_archived` or tags can flag the unsent status if the user wants.
- **Reports that are technically pitch-decks** (e.g. a strategy report delivered as a deck): defer to `pitch-deck` if slide-shaped. The fragment for pitch decks handles the visual + structural reading better.
- **Reports with mixed authorship** (Ellie + a client team contributing): default to `report` if Ellie was the primary author or editor. Override to `peer` at triage if the contribution was genuinely shared.
- **Reports in an unfamiliar register** (e.g. a regulatory submission, a technical specification): the fragment still applies; the lens reads it as a polished output. Voice extraction is less useful for technical formats but methodology and claim extraction still work.
- **Old reports** (from before Ellie's current positioning): extract as written. The audit trail is part of the value — these show how her thinking has evolved. The current voice tools downstream can choose to weight recent reports more heavily, but the source itself is preserved as-is.
- **Confidential client reports**: handled the same as any report at extraction. Privacy / sharing decisions happen downstream when content is being generated for external use.
