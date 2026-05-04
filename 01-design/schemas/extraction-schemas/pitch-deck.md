---
status: draft
source_type: pitch-deck
related_features: INP-12, INP-05
last_updated: 2026-05-04
default_authority: own
chunking: slide
graph_shape: source-document
---

# Source-type fragment — pitch-deck

## Definition

A pitch or presentation deck — a slide-based document built to argue a position, raise capital, present a strategy, or persuade an audience. Slide-shaped material where each slide is a distinct unit of argument or content. Examples: Ellie's clients' fundraising decks she's helped build, her own pitch decks for NicelyPut, online sample decks she's collected for pattern-study, original client decks brought to her at engagement start as the as-is.

The defining frame is **slide-shaped + argumentative**. Distinct from `research-document` (linear text, claim-and-evidence shape) and `report` (Ellie's published output, more linear).

## Default surfaces (per ADR-009)

Claims, structure, narrative arcs, design patterns.

The high-value categories: **claims** (the deck's specific assertions — usually short and punchy, sometimes only intelligible with the visual context), **structural moves** (how the deck sequences its argument: problem → solution → traction → ask, or variants), **narrative arcs** (the story the deck tells — the rising action, the turning point, the ask), **design patterns** (how slides are constructed visually — useful for Ellie's own deck-building work, especially across many sample decks).

Pitch decks are **the source type where visual content matters most**. A slide that's 80% image and 20% text loses most of its meaning if extracted as text only. Per INP-05, the future ingestion pipeline will attach slide images per chunk and use a vision-capable LLM to generate slide descriptions. For v1, expect text-only extraction; the lens output quality reflects this constraint.

## Likely participants

No speakers — single document with potentially named author/company. Chunking is per slide; each slide is one chunk.

When a deck cites named individuals (executives, advisors, customers, investors), extract them as `Person` nodes. When a deck names companies (the deck's own company, mentioned partners, named customers, named competitors, named investors), extract them as `Organisation` nodes.

## Authority default + override guidance

Default `authority: own` — most pitch decks Ellie ingests are hers, her clients' (where she's the strategic author or co-author), or her own work for NicelyPut.

Override to `external-sample` when the deck is an external sample collected for pattern-study only (an online deck, a competitor's deck, a deck shared as reference). External samples are useful for design-pattern and structural-move extraction but **never for claim-evidence** — a claim from a competitor's deck is not a fact about the world.

Override to `external-authoritative` is rare for decks — most decks are not citable evidence even when externally authored. Use only when a deck is functionally a published research output (e.g. an analyst firm's slide-shaped report).

Override to `peer` when a peer shares their deck in a peer-conversation context for mutual feedback — though usually this would route through `peer-conversation` if it's part of a conversation, and stay as a separate `pitch-deck` source if it's the deck itself.

## Prompt fragment

This source is a **pitch-deck** — slide-shaped argumentative content. Each chunk is one slide. Decks are visually-dense; for v1 you may receive only the slide's text content (vision-capable ingestion is in flight per INP-05). Once the visual pipeline lands, each slide chunk will carry both text and a vision-LLM-generated description of the slide's visual content.

Bias your extraction differently from text-shaped sources:

1. **Don't expand the text. Capture it as it is.** Pitch deck text is often punchy fragments, not full sentences. The fragment is usually the point — the slide says "47% of pilots said X" with a chart; the fragment is the claim, the chart is the evidence. Don't rewrite the fragment into a "complete" sentence; quote it.
2. **Read structure, not just content.** What does this deck do across its slides? Problem → solution → traction → ask is one shape; case study → method → result → recommendation is another. The structural sequence is itself extractable as a `Methodology` (especially valuable across many sample decks for Ellie's own deck-building work).
3. **Surface narrative arcs.** Decks tell stories — the rising tension of the problem, the turning point of the insight, the resolution of the ask. When the deck has a clear arc, capture it as a narrative item. When the deck is just a list of slides without arc, that's also signal (and often a quality problem with the deck itself).
4. **Design patterns and structural moves.** When extracting from external sample decks (`authority: external-sample`), prioritise this category — the user is collecting samples to learn from how they're built, not from what they claim. Extract: how the title slide opens, how problem slides are structured, how data is presented, how the ask is framed.
5. **Cited people and organisations.** Decks reference customers, partners, advisors, investors, market data sources. Extract them all.

When critical context is **clearly missing because it's visual**, mark items `low` confidence and note the absence in the item's text — e.g. "the slide references 'Figure 1: pilot adoption curve' which is not in the extracted text". The user is going to know this is an honest limitation, not bad output.

For decks where Ellie was the author or co-author (`authority: own`), the deck is part of her voice canon — extracted material here is high-value for content generation downstream. For external samples, the deck is pattern-only — useful for *how* to argue, not for *what* to claim.

## Edge cases

- **Decks with only slide titles extracted** (poor PDF extraction, image-only slides without OCR): you may get extremely thin text. Return short arrays. Flag in `unexpected[]` that the source extraction was partial.
- **Multi-language decks** (text in one language, captions in another): English-only for v1; flag if non-English content is significant.
- **Very long decks (>50 slides)**: chunking handles it. Lens output should still be selective — a long deck is not a license for long extraction.
- **Decks with appendix material**: appendices often contain reference data or detailed slides. Extract from them where relevant; don't ignore them, but apply the same selectivity bar.
- **Decks that are mostly Ellie's annotations on a client's original** (e.g. Ellie's mark-up of a client's existing deck): the source is the deck-with-annotations, source-type still `pitch-deck`, but the substance is mostly in the annotations. Authority depends on who Ellie is annotating *for* — usually `own` or `peer`.
- **Pre-vision-pipeline limitations**: until INP-05 lands the visual extraction pipeline, expect lens output on pitch-decks to be noticeably weaker than on text-shaped sources. This is a known constraint; the user is aware. Don't fabricate visual context to compensate.
