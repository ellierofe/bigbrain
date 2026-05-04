---
status: draft
lens: surface-extraction
related_features: INP-12
last_updated: 2026-05-04
produces_lens_report: false
takes_lens_input: false
---

# Lens prompt — surface-extraction

## Purpose

Extract the discrete, named things present in a source: ideas, concepts, people, organisations, stories, methodologies, content angles, plus their supporting quotes. This is the workhorse lens — the default for any new source where specific things were said. Output goes directly to the graph (no `LensReport` wrapper) once the user reviews it per-item.

## When to use

- Default for any single source that has substantive content.
- Default for new transcripts from Krisp, research documents, voice notes.
- The first lens applied to most sources — other lenses tend to run on top of the items it produces.
- Not appropriate for cross-source synthesis (use `pattern-spotting`) or longitudinal patterns (use `self-reflective`).

## Prompt fragment

You are applying the **surface-extraction** lens. Your job is to identify the discrete, named things present in the source(s) you have been given. The user will review each proposed item before any of it is written to the knowledge graph, so accuracy and selectivity matter more than coverage.

### What to extract

The source-type fragment above tells you which item categories are most likely in this source and how to bias toward them. Use it as guidance — extract what is present, not what the fragment suggests should be present. The seven categories are:

**ideas** — A specific insight, realisation, or argument. Not a headline; a complete thought. Each idea must include what the insight is, why it matters or what it implies, and enough context to understand it without the source. Write 2–4 sentences. Skip generic observations and truisms — extract only insights specific to this source that wouldn't be obvious to someone who wasn't there.

**concepts** — Named abstractions, mental models, principles, or frameworks that can be referenced independently. A concept has a name, a description that explains what it means, and an indication of why it's useful. More stable and general than ideas. Only extract if the concept was meaningfully discussed, not just name-dropped.

**people** — Named individuals mentioned. Capture their role and the context in which they appear. Do not infer details not present. Skip incidental mentions — extract only people who are substantively discussed or whose identity matters to the knowledge being captured. Canonical resolution against existing graph nodes happens in the review step; you do not need to attempt it here.

**organisations** — Named companies, institutions, publications, funders, regulators, political parties, or bodies. Include the context in which they were mentioned and why they're relevant. Skip incidental mentions.

**stories** — Narratives worth preserving: client wins or failures, personal experiences, metaphors, illustrative examples. Must have a clear narrative arc — not just a mention of an event. The narrative should capture enough detail that the story could be retold without the original source.

**techniques** — Methodologies, frameworks, approaches, tools, or practices described in enough detail to explain or apply. Can be the speaker's own methods or methods discussed/referenced. The description should explain what the technique is, how it works, and when to use it. Skip techniques mentioned only in passing without explanation.

**contentAngles** — Ideas with direct content potential: a specific framing, argument, or story that could become a post, article, talk, or piece of content. Must include the angle (what makes this interesting to an audience), not just a topic. "AI in marketing" is a topic; "Why marketers who resist AI tools will outperform the ones who automate everything" is an angle.

### Rules

- Assign each item a unique string id within the response (`idea-1`, `concept-2`, etc.). These are local to the response — the graph commit assigns persistent UUIDs.
- Confidence: `high` = explicitly stated; `medium` = implied or partially stated; `low` = inferred or uncertain.
- `sourceQuote` (where the schema permits): include the exact phrase or sentence from the source that supports the extraction. Keep under 200 characters. Quote verbatim — do not paraphrase.
- `sourceRefs`: every item must include `sourceRefs: string[]` populated with the source id(s) from the corpus header. For single-source extraction, this is the one source's id repeated per item.
- Do not invent, embellish, or combine information not present.
- Do not extract action items, tasks, or to-dos — only knowledge.
- Do not extract statistics or data points — handled separately by a dedicated extractor.
- Empty arrays are valid. Return all seven category arrays even if some are empty.
- Deduplicate within each category — if two items express the same idea or concept, merge into the stronger one.
- Prefer fewer, richer extractions. A 30-minute conversation typically yields 3–8 ideas, 0–3 concepts, 0–2 techniques, 0–2 content angles. Extracting 15+ ideas from one source is a signal you are not being selective enough.

## Output schema

The lens produces an object matching the existing `extractionResultSchema` in `lib/types/processing.ts`:

```ts
{
  ideas: ExtractedIdea[],
  concepts: ExtractedConcept[],
  people: ExtractedPerson[],
  organisations: ExtractedOrganisation[],
  stories: ExtractedStory[],
  techniques: ExtractedTechnique[],
  contentAngles: ExtractedContentAngle[],
}
```

Each item includes `sourceRefs: string[]` per the universal contract in `_README.md`. (The existing schema in `lib/types/processing.ts` will need a `sourceRefs` field added to each extracted item type as part of INP-12 implementation — flagged as a TODO in `lib/types/processing.ts`.)

**Plus the universal `unexpected[]` field** from `extraction-schemas/_base.md` — applies to surface-extraction too. Since surface-extraction does not produce a `LensReport`, the `unexpected[]` array attaches to the processing run record (or is surfaced in the per-item review UI for individual commit/discard alongside the regular extracted items). Implementation note: store on the `processing_runs` row's existing fields or add a new `unexpected` jsonb column — flagged for INP-12 implementation.

## Grounding rules

- **Quotes are verbatim or absent.** A `sourceQuote` that paraphrases the source is a violation. If you cannot quote the supporting passage exactly, omit the quote.
- **Inference is bounded.** You may compress, summarise, and select. You may not invent attributions, dates, named entities, or claims that are not in the source.
- **No silent canonical resolution.** If a person or organisation is mentioned, extract them as written. Do not "match" them to other names you might have heard of. The review step handles canonical resolution against the existing graph.
- **Ambiguity is signalled, not resolved.** If the source is ambiguous about who said something, who an organisation refers to, or what a concept means, mark the item `low` confidence and surface the ambiguity in the description rather than picking an interpretation.

## Notes

- This lens replaces the INP-11 `individual` / `processing` mode. The prose above is a refinement of the INP-11 `processing` system prompt with three changes: (1) brand identity context lifted out into the base prompt; (2) `sourceRefs` and `sourceQuote` rules made explicit; (3) "no silent canonical resolution" rule added (was implicit; the INP-11 implementation surfaced this as a real gap).
- `surface-extraction` is the only lens that does not produce a `LensReport`. Its review UI is the per-item editor; commit writes nodes + `DERIVED_FROM` edges to the source(s).
- Statistics extraction is intentionally separate (see `src-statistics.md`). When the source contains data points, they are routed to that extractor in parallel — the surface-extraction lens does not duplicate them.
