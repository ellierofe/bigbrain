---
status: draft
lens: decision-support
related_features: INP-12
last_updated: 2026-05-04
produces_lens_report: true
takes_lens_input: true
---

# Lens prompt — decision-support

## Purpose

Interrogate a corpus against a specific open decision. The user provides the decision text; the lens reads the corpus and produces evidence for, evidence against, gaps, and suggested next steps. Output is structured for action — not a balanced essay, but a decision-grade brief weighted to what the corpus actually says.

## When to use

- A decision is open and the user wants to know what their existing knowledge says about it.
- "Should I run a defence-tech investor roundtable in Q3?" + selecting 5 fundraising interviews and 2 strategy calls.
- "Does it make sense to bring on a junior researcher?" + selecting recent client work + accountability sources.
- "Which of these 3 positioning angles for client X has the best evidence?" + selecting client interviews.
- Not appropriate for open-ended exploration (use `pattern-spotting`) or for decisions where the corpus is irrelevant (the lens will say so, but it's wasted compute).

## Lens input

`decisionText` — free-form text describing the decision the user is weighing. Required. Examples: a single sentence ("Should we run a Q3 investor roundtable?"), a structured brief (problem + options + criteria), or a paragraph of context. The lens does not require a particular shape — it works with what the user provides.

The runtime injects this above the corpus prompt as:

```
DECISION TEXT:
<decisionText>
```

If `decisionText` is empty or absent, the lens emits a single `summary` field saying decision-support requires a decision and returns empty arrays for the rest. The UI prevents this case at the input stage but the prompt should handle it defensively.

## Prompt fragment

You are applying the **decision-support** lens. The user has an open decision and wants the corpus interrogated against it. Your output is not a neutral analysis — it is a decision-grade brief that surfaces what the corpus says for, against, and around the decision, plus what's missing.

### Read the decision first

Before reading the corpus, read the decision text closely. Identify:
- What the actual question is. (Sometimes the decision text contains a stated question and an implied one — surface both if so.)
- What would count as evidence for and against. (E.g. for "should we run a roundtable?" — relevant evidence might be investor appetite signals, prior event ROI, current bandwidth, audience density.)
- Whether the decision text frames a binary, a multi-option choice, or an open question.

State this framing in the `summary` field so the user can correct it before the rest of your output is read.

### What to produce

**summary** — One paragraph. Echo the decision as you understood it, name the type of decision (binary / multi-option / open), and give the headline answer the corpus supports — including "the corpus is too thin to support a confident answer" if that's what you find. Do not hedge for politeness; hedge only when the evidence demands it.

**evidenceFor** — Concrete material from the corpus that supports the decision (or supports a particular option, when the decision is multi-option). Each entry: the evidence (what was said / observed / measured), the option or direction it supports, and the strength of the evidence (`strong` / `moderate` / `weak`). Not a bullet list of vague positives — each item must be quotable from the source.

**evidenceAgainst** — Concrete material that argues against the decision or against a particular option. Same shape as `evidenceFor`. Treat both lists with equal rigour — confirmation bias is the single biggest failure mode of this lens.

**gaps** — What the corpus does not contain that the decision genuinely needs. Each entry: the gap (what's missing), why it matters for this decision, and a specific way the user could fill it (a person to talk to, a piece of research to commission, a metric to track for two weeks). A gap without a fill suggestion is half a gap.

**suggestedNextSteps** — 2–5 actions the user could take next. Each step is concrete (someone to talk to, a question to test, a small experiment to run, a clarifying decision to make first). Order them by what unblocks the most: the first step should be the one that resolves the most uncertainty for the least effort.

### Rules

- `sourceRefs` on every item per the universal contract — source ids only.
- An evidence item must be quotable. If you cannot point to a passage that supports the claim, the claim is inference, not evidence — move it to `gaps` or `suggestedNextSteps` or drop it.
- Strength labels (`strong` / `moderate` / `weak`) reflect the corpus, not your confidence in the conclusion. Strong = direct, recent, multiply-attested. Moderate = direct but single-source or older. Weak = indirect or implied.
- If `evidenceFor` and `evidenceAgainst` are both thin, say so in the `summary` and emphasise `gaps` over a forced answer.
- The user is making the decision. Do not present a single "recommendation" as a top-level field. The `summary` may state what the evidence supports; `suggestedNextSteps` may include "make this decision now if X" as one of the steps; but the lens does not pretend to decide.
- Multi-option decisions: each entry in `evidenceFor` / `evidenceAgainst` should specify which option it bears on (in the `option` field). Treat unaddressed options as visible — if the corpus is silent on option C, that's a gap, not absence of evidence against it.

## Output schema

```ts
{
  summary: string,
  decisionText: string,             // echo of the lens input
  decisionFraming: {
    type: 'binary' | 'multi-option' | 'open',
    options?: string[],             // populated when type === 'multi-option'
    statedQuestion: string,
    impliedQuestion?: string,       // populated when surfaced
  },
  evidenceFor: Array<{
    evidence: string,
    option?: string,                // populated when decision is multi-option
    strength: 'strong' | 'moderate' | 'weak',
    sourceRefs: string[],
  }>,
  evidenceAgainst: Array<{
    evidence: string,
    option?: string,
    strength: 'strong' | 'moderate' | 'weak',
    sourceRefs: string[],
  }>,
  gaps: Array<{
    gap: string,
    whyItMatters: string,
    fillSuggestion: string,
  }>,
  suggestedNextSteps: Array<{
    step: string,
    rationale: string,
    sourceRefs?: string[],          // optional — populated when the step is grounded in a specific source
  }>,
  unexpected: Array<{               // universal — see extraction-schemas/_base.md
    observation: string,
    why: string,
    sourceRefs: string[],
  }>,
}
```

## Grounding rules

- **The decision drives the lens.** Every output element must trace back to the decision text. A finding that's interesting but unrelated to the decision belongs in `pattern-spotting`, not here.
- **Evidence ≠ inference.** If the corpus does not directly speak to a claim, it is not evidence for the claim. Inferences belong in `gaps` (as a gap to fill) or `suggestedNextSteps` (as a hypothesis to test).
- **Authority is not pre-weighted by the lens.** The corpus header tells you each source's `authority` (`own`, `peer`, `external-authoritative`, `external-sample`). Do not silently downweight `external-sample` evidence — surface it and let the user weight. A consistent pattern across `external-sample` sources is a real signal.
- **No advocacy.** The user picks the corpus and the decision; the lens reports. If the decision text reveals the user's lean, do not amplify it. Apply the same rigour to evidence both ways.
- **If the corpus is the wrong one for the decision, say so.** "The selected sources are about positioning for B2B fundraising; the decision is about a B2C content channel — recommend re-running with a different corpus" is a valid, complete output. Better than a thin forced answer.

## Notes

- This lens is new in INP-12 (no INP-11 predecessor).
- The `decisionText` input is intentionally unstructured (per ADR-009 ruled-out list — "Treat `lensInput` as a structured object"). Free-form lets the user describe binary, multi-option, and open decisions in one path; the prompt asks the LLM to identify the type.
- The lens has a pronounced failure mode: producing a "balanced" answer when the evidence is one-sided. The instruction to weight by what the corpus actually says (and to call out thin corpora explicitly) is intentional pushback against that.
- Pairs well with `pattern-spotting` for prep — pattern-spot the corpus first to surface themes, then decision-support against the decision once the user has a clearer sense of what's there.
- The `committed` LensReport for a decision-support run is a useful artefact in its own right: a dated, source-cited record of what the user knew at the moment they made the decision. Re-running the same decision text on a refreshed corpus produces a new versioned report (per `lens-reports.md` supersession).
