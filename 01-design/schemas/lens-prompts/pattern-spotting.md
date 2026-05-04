---
status: draft
lens: pattern-spotting
related_features: INP-12
last_updated: 2026-05-04
produces_lens_report: true
takes_lens_input: false
---

# Lens prompt — pattern-spotting

## Purpose

Read 2+ sources as a corpus and surface what emerges from the set as a whole — recurring themes, points of agreement, points of tension, insights that only become visible cross-source, and gaps in the coverage. The lens does not extract from each source individually; it reads them together and reports what the gestalt reveals.

## When to use

- 2+ sources on a related topic — fundraising research interviews, competitor coverage, peer conversations on the same theme.
- Reviewing a tag-filtered slice of the corpus (e.g. all sources tagged `defence-tech`) to see what's there in aggregate.
- After ingesting a batch of related transcripts, before deciding what to write or what to investigate further.
- Not appropriate for a single source (use `surface-extraction`) or for sources too dissimilar to support cross-cutting analysis (the lens will say so, but it's wasted compute).

## Prompt fragment

You are applying the **pattern-spotting** lens. You have been given a corpus of sources to read as a set. Do not extract from each source individually — that's a different lens. Your job is to surface what emerges across the corpus that wouldn't be visible reading any one source on its own.

### What to produce

**summary** — One paragraph. State the size of the corpus, the date range, the apparent topic or thread, and the headline finding. If the corpus is too thin or too internally similar to support meaningful cross-cutting analysis (e.g. five near-duplicate transcripts of the same conversation), say so plainly and recommend what would make the analysis viable.

**recurringThemes** — Topics, concerns, ideas, or framings that appear across multiple sources. For each theme: what it is, how it manifests differently across the sources where it appears, and which sources it appears in (`sourceRefs`). A topic mentioned once is not a theme.

**convergences** — Points where multiple sources agree, reinforce each other, or arrive at the same conclusion from different angles. Note what's converging, why the convergence is significant (e.g. "three independent sources arrive at this from different starting points — that's stronger than any one of them stated alone"), and the contributing sources.

**divergences** — Points where sources disagree, contradict, or present meaningfully different perspectives on the same topic. Note the tension explicitly: who said what, and what the disagreement might indicate (e.g. "client A and client B both describe the same market dynamic but draw opposite conclusions about its trajectory").

**synthesisedInsights** — Insights that don't exist in any single source but emerge from reading them together. These are the most valuable outputs of this lens. Each must explain: what the insight is, why it only becomes visible across the corpus, and what it implies for strategy, content, or further investigation. Treat the bar for inclusion here as high — a true synthesised insight is rare and worth more than a dozen recurring themes.

**gaps** — Topics or questions you'd expect to be covered given the apparent thread of this corpus, but that are missing or underexplored. What wasn't discussed that probably should have been? Each gap: what's missing, why its absence is notable, and (where possible) where the user could go to fill it.

### Rules

- `sourceRefs` on every item per the universal contract — source ids only, populated for `recurringThemes`, `convergences`, `divergences`, and `synthesisedInsights`. Gaps reference no sources by definition (gaps are absences) — `sourceRefs` is omitted for gap entries.
- Ground every finding in the actual source text. You may extrapolate cautiously *beyond* what the sources directly support — but speculative extensions must be clearly flagged as such inside the relevant field's text, not presented as findings.
- Prefer depth over breadth. 5 well-developed synthesised insights are worth more than 15 shallow observations. 8 sharp recurring themes are worth more than 25 vague ones.
- If the corpus is too internally similar to produce meaningful cross-cutting analysis (e.g. multiple recordings of the same conversation, sources from the same author saying the same things), the right output is a brief `summary` saying so and empty arrays for the rest. Do not force patterns that aren't there.
- Authority context: the corpus header tells you each source's `authority`. A convergence across `external-authoritative` sources is a different signal from a convergence across `external-sample` sources. Surface this in the `convergences` text where it materially affects the strength.

## Output schema

```ts
{
  summary: string,
  dateRange: { from: string, to: string },  // ISO dates from corpus extremes
  sourceCount: number,
  recurringThemes: Array<{
    theme: string,
    description: string,
    sourceRefs: string[],
  }>,
  convergences: Array<{
    point: string,
    description: string,
    sourceRefs: string[],
  }>,
  divergences: Array<{
    point: string,
    description: string,
    sourceRefs: string[],
  }>,
  synthesisedInsights: Array<{
    insight: string,
    basis: string,                  // why this only becomes visible across the set
    implication: string,            // what it implies for strategy, content, or investigation
    sourceRefs: string[],
  }>,
  gaps: Array<{
    gap: string,
    description: string,            // why its absence is notable + where to fill it
  }>,
  unexpected: Array<{               // universal — see extraction-schemas/_base.md
    observation: string,
    why: string,
    sourceRefs: string[],
  }>,
}
```

## Grounding rules

- **A pattern requires multiple sources.** A single-source observation is not a pattern, regardless of how interesting it is. If it belongs in any output, it belongs in a different lens.
- **Convergence and divergence are different from agreement and disagreement.** Two sources can both make the same observation (low-value convergence) or arrive at the same observation from different starting points (high-value convergence). Surface the latter; deprioritise the former.
- **Synthesised insights have a high bar.** "These three sources all mention X" is a recurring theme, not a synthesised insight. "These three sources, taken together, reveal that X behaves differently in the presence of Y — none of them states this directly but it's visible across the set" is a synthesised insight.
- **Acknowledge thin corpora.** When the lens cannot do its job because the corpus doesn't support it, say so in the summary and stop. Better than producing patterned-looking output from material that doesn't pattern.

## Notes

- This lens is the INP-11 `batchAnalysis` mode, ported. Critical-pass changes from the INP-11 prompt:
  - Brand identity context lifted to the base prompt.
  - `sourceRefs` standardised on source ids (was "by title or date").
  - `summary` now explicitly required to flag thin/similar corpora rather than buried in a "rules" bullet — the failure mode is real and the user wants it surfaced loudly.
  - `gaps` now asks for "where the user could go to fill it" where possible, not just naming the gap. Matches the action-oriented framing used in `decision-support`.
  - Authority context made explicit: convergences across `external-authoritative` vs `external-sample` are different signals.
  - Schema field ordering tightened to match the lens-reports.md result-shape summary.
- Output schema matches the existing `batchAnalysisSchema` in `lib/types/processing.ts` (with `sourceCount` added to match the schema doc summary). The TypeScript type will be renamed `PatternSpottingResult` per ADR-009 §Consequences.
- Pairs with `decision-support` for prep work — pattern-spot first, then run decision-support against a specific decision once the corpus shape is clear.
- Pairs with `content-ideas` for content prep — the recurring themes and synthesised insights from this lens often surface the strongest cross-source content angles.
