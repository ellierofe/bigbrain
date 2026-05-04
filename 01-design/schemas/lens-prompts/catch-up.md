---
status: draft
lens: catch-up
related_features: INP-12
last_updated: 2026-05-04
produces_lens_report: true
takes_lens_input: true
---

# Lens prompt — catch-up

## Purpose

Answer "what's changed since last time?" Run when returning to a project, a person, a topic, or a body of work after a gap. The lens treats sources before a `since` reference as the baseline state and sources after it as new development, then surfaces what's different — what changed, what's new, what's still unresolved, and who said what.

## When to use

- Returning to a client project after two weeks away — what happened in the meantime?
- Re-engaging with a person you haven't spoken to in months — what did you discuss, what was outstanding?
- Picking up a research thread that's been on the back burner.
- After a period of busy execution work, catching up on the broader strategy conversations.
- Not appropriate for first-time ingestion of a corpus (use `pattern-spotting` instead) or for surfacing personal patterns over time (use `self-reflective`).

## Lens input

`since` — a free-form reference describing the cut-off. Examples: `"2026-04-01"`, `"my last session with Justyna"`, `"before the Q1 review"`. The user provides this in a textarea at processing time.

The runtime injects this above the corpus prompt as:

```
CATCH-UP REFERENCE: <since>
```

The LLM uses the source dates (provided in each `--- SOURCE: ... ---` header) to split the corpus into baseline (before `since`) and new (after `since`). If `since` is non-temporal (e.g. an event name), the LLM relies on the source titles and dates to make a best-effort split and explicitly states the cut-off it inferred in the `summary`.

If `since` is empty, missing, or cannot be reconciled with the source dates at all, the lens emits a single `summary` field explaining why catch-up cannot run on this corpus and returns empty arrays for the rest. The UI surfaces this as a warning.

## Prompt fragment

You are applying the **catch-up** lens. The user has been away from this corpus and wants a focused account of what has changed since `<since>`.

The corpus is split by date: sources dated before `<since>` are the baseline state; sources dated after `<since>` are the new development. Read the baseline first to ground yourself in what was already known, then read the new sources for what's different.

### What to produce

**summary** — One paragraph. State the cut-off you used (echo the `since` value or, if non-temporal, name the inferred boundary), how many sources fall into baseline vs new, and the headline change. If the new corpus is small or shows little change, say so plainly — do not pad.

**whatChanged** — Things that were one way before `<since>` and a different way after. Each entry needs the prior state, the current state, and what triggered or evidenced the change. Be concrete: "the supplier shortlist went from 3 candidates to 1 after the November call with Dimitris" — not "the supplier situation evolved." Skip changes that are merely the natural progression of work in flight; surface changes that altered direction or substance.

**newDevelopments** — Things that did not exist in the baseline at all. New people introduced, new ideas emerged, new decisions taken, new sources of information. Each entry: what the new development is, when in the new corpus it appeared, and why it matters.

**whoSaidWhat** — When specific people contributed materially in the new corpus, capture who said what and to what effect. One entry per person, not per utterance. Include only contributions that move something forward, raise a flag, or anchor a position. Skip routine participation. (Person canonical resolution happens at review time — extract names as written.)

**unresolvedFromLastTime** — Items from the baseline that were open questions, parked decisions, or pending commitments, and that the new corpus does not address. The point is to make the gaps visible: "you committed to talk to Ross about Mission X in March; nothing in the new sources references it." If the baseline is silent on a topic the new corpus picks up, that is a `newDevelopment`, not an `unresolvedFromLastTime`.

### Rules

- `sourceRefs` on every item per the universal contract — source ids only.
- If a `whatChanged` or `unresolvedFromLastTime` entry references baseline material, list both the baseline source(s) and the new source(s) in `sourceRefs` — they trace the change end-to-end.
- Be explicit about the cut-off you used. The user is going to act on what you tell them; an ambiguous boundary undermines the whole lens.
- If the new corpus is empty or contains nothing of substance relative to the baseline, return a `summary` that says so and empty arrays for the other fields. Do not invent change to fill the schema.
- Do not summarise the baseline for its own sake. The baseline exists to make the new corpus legible; the user is not asking to relearn it.

## Output schema

```ts
{
  summary: string,
  since: string,                    // echo of the lens input, or inferred cut-off
  whatChanged: Array<{
    topic: string,
    priorState: string,
    currentState: string,
    trigger: string,
    sourceRefs: string[],           // baseline ids + new ids
  }>,
  newDevelopments: Array<{
    development: string,
    significance: string,
    sourceRefs: string[],
  }>,
  whoSaidWhat: Array<{
    person: string,                 // name as written; canonical resolution at review
    contribution: string,
    sourceRefs: string[],
  }>,
  unresolvedFromLastTime: Array<{
    item: string,                   // the open question, parked decision, pending commitment
    baselineContext: string,        // why it was open in the baseline
    sourceRefs: string[],           // baseline source(s) where it was raised
  }>,
  unexpected: Array<{               // universal — see extraction-schemas/_base.md
    observation: string,
    why: string,
    sourceRefs: string[],
  }>,
}
```

## Grounding rules

- The `since` boundary defines the lens. Output that ignores it (treats the corpus as a flat set) is wrong output.
- "Change" means difference between baseline and new. Single-source observations belong in `surface-extraction`, not here.
- Do not infer change from absence. If a topic is in the baseline and not in the new corpus, that is `unresolvedFromLastTime`, not `whatChanged` ("X was deprioritised"). Deprioritisation is a real change only when the new corpus says so.
- People named in `whoSaidWhat` must be quotable from the new corpus, not the baseline. The whole entry frame is "since `<since>`, this person did this."
- If the new corpus is too small for catch-up to be meaningful (e.g. one source, or all sources from the same hour), return a brief `summary` saying so and stop. Better to produce nothing than to fabricate a trajectory.

## Notes

- This lens is new in INP-12 (no INP-11 predecessor).
- The `since` input is intentionally free-form rather than structured — matches the user's preference (per ADR-009 ruled-out list and brief approval) and the LLM is good at reconciling natural-language temporal references against source dates.
- Pairs well with `self-reflective` for accountability sources: `catch-up` answers "what changed since last time?", `self-reflective` answers "what does the trajectory tell me about myself?"
- For project work, pairs well with `decision-support`: catch-up first, then run decision-support against the now-current state.
