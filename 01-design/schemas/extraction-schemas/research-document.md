---
status: draft
source_type: research-document
related_features: INP-12, INP-05
last_updated: 2026-05-04
default_authority: external-authoritative
chunking: paragraph (with sections as logical groups)
graph_shape: source-document
---

# Source-type fragment — research-document

## Definition

A document authored by a credible external party — a research firm report (McKinsey, Gartner, BCG), an academic paper, an industry analyst's published work, a published expert interview, a regulatory document, or a long-form journalism piece on a topic relevant to Ellie's work. The defining frame is **external authorship + citable substance**.

Distinct from `report` (Ellie's own published outputs), `internal-notes` (her own working thinking), and `pitch-deck` (visual / argumentative rather than research-grade).

## Default surfaces (per ADR-009)

Claims, statistics, trends, cited organisations, methodologies.

The high-value categories: **claims** (the document's specific assertions about the world — these are citable in Ellie's own work), **statistics** (data points the document publishes — handled separately by the dedicated statistics extractor, but the lens still surfaces context for them), **trends** (medium-term directional observations the document makes), **cited organisations** (companies, institutions, sources the document references — these accumulate in the graph and connect to Ellie's other knowledge), **methodologies** (research methods, analytical frameworks, evaluation techniques the document describes).

These sources are dense; expect higher extraction volume than from conversation-shaped sources, but the same selectivity bar applies.

## Likely participants

No speakers. Single document with potentially multiple sections, possibly multiple authors named in the document itself. Chunking is per paragraph, with sections as logical groups (a section heading marks the start of a new logical group of paragraphs).

When the document quotes named individuals or interviews specific people, extract them as `Person` nodes — the document is reporting their words, and those people are part of the graph the document contributes to.

## Authority default + override guidance

Default `authority: external-authoritative` — definitionally correct.

Override to `external-sample` when the document is being kept for reference but is not credible enough to cite (e.g. a content-marketing piece masquerading as research, an SEO-padded "industry report" with no methodology, a competitor's white paper Ellie wants to reference for pattern-spotting but not for claim-evidence). The override reduces retrieval weighting for content-claim use without removing the source.

Do not override to `own` or `peer` — by definition this source type is external.

## Prompt fragment

This source is a **research-document** — an externally-authored document with citable substance. Reports, papers, analyst pieces, regulatory documents, long-form journalism on topics relevant to Ellie's work. Single-document, no speaker turns, paragraph-chunked with section structure.

Bias your extraction toward **the document's own claims, evidence, and methodology**, not surrounding context:

1. **Specific claims**, not general topic statements. "Defence procurement spend in the UK is forecast to reach £58bn by 2028" is a claim. "Defence is changing" is a topic. Extract claims with their evidence basis (the document's own citation or methodology) where it's stated.
2. **Statistics in context**. The dedicated statistics extractor handles data points themselves; this lens captures the *context* a statistic appeared in — what the document was arguing, what the comparison set is, what time period applies. When a lens schema includes `sourceQuote`, use it to capture the document's exact phrasing of a key claim.
3. **Trends**. Medium-term directional observations ("we're seeing a shift in X over Y period because Z"). Extract substantively — capture what the trend is, what evidence the document offers, what timescale, and what the document predicts as a consequence.
4. **Methodology**. When the document describes how its findings were produced (sample sizes, interview counts, modelling approach, data sources), extract this as a `Methodology` node. Useful both for evaluating the document's own credibility and for Ellie's own methodology library.
5. **Cited organisations and people**. Documents typically reference dozens of organisations and individuals. Extract them all; canonical resolution against the existing graph happens at review (where many will already exist from the politics graph or prior research).

For research documents, **`confidence` shifts meaning**: claims explicitly stated by the document are `high` confidence as a record of what the document says. Whether the underlying claim is true about the world is a separate question — the lens captures the source's position, not the world.

The document's own framing matters. When the document hedges ("evidence suggests X"), capture the hedge — don't promote a hedged claim to a confident one. When the document is direct, capture the directness.

## Edge cases

- **Documents with embedded charts, diagrams, or images**: per INP-05, the future ingestion pipeline will attach per-chunk images for visual context. For v1, you may receive only extracted text — work with what's there. Mark items as `medium` confidence when you suspect critical context lives in an image you can't see (e.g. the text references "as shown in Figure 3" with no further explanation).
- **Documents that are mostly tables and data**: extraction yields short arrays for ideas/concepts — most of the value is in the data, which routes through the statistics extractor and (for true datasets) through the kg-ingest-creator path. Don't try to extract every table cell as a fact.
- **Documents that are partly research, partly opinion** (e.g. a McKinsey piece with a research section and a commentary section): treat as one source. The lens reads it as a whole.
- **Long documents (>50 pages)**: the chunking + retrieval path handles length — the lens may operate on retrieved chunks rather than the full text. Quality stays consistent if chunks carry section context (chunking strategy must preserve section headings).
- **Documents in non-English languages**: per the brief, English-only for v1. Surface a warning if the source language is non-English; lens output quality is not guaranteed.
- **Pre-prints, working papers, draft documents**: still `research-document`. Override `authority` only if the working-paper status meaningfully reduces credibility.
