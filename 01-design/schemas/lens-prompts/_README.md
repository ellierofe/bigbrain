---
status: approved
type: prompt-fragments
related_features: INP-12
last_updated: 2026-05-04
depends_on: ADR-009, lens-reports.md, processing-runs.md
---

# Lens prompts

One file per lens. Each file holds the prompt fragment composed into the system prompt at processing time, plus the lens's output schema (mirrored in `lib/types/processing.ts`).

Per ADR-009, the system prompt sent to the LLM is composed at runtime from three pieces:

```
[base extraction prompt]      ← 01-design/schemas/extraction-schemas/_base.md
+ [source-type schema fragment] ← 01-design/schemas/extraction-schemas/{source-type}.md
+ [lens fragment]               ← 01-design/schemas/lens-prompts/{lens}.md  ← THIS DIRECTORY
```

Fragments live as markdown so they are editable without code changes. A build-time validator asserts every lens in the controlled vocabulary has a registered file here.

## The 7 lenses

| File | Lens | Produces |
|---|---|---|
| `surface-extraction.md` | `surface-extraction` | Discrete graph items (no LensReport) |
| `self-reflective.md` | `self-reflective` | LensReport — realisations, shifts, blockers, commitments |
| `project-synthesis.md` | `project-synthesis` | LensReport — methodology, narrative, content angles |
| `pattern-spotting.md` | `pattern-spotting` | LensReport — themes, convergences, divergences, insights |
| `catch-up.md` | `catch-up` | LensReport — what changed since last touch |
| `decision-support.md` | `decision-support` | LensReport — evidence for/against a decision |
| `content-ideas.md` | `content-ideas` | LensReport — hooks, angles, formats, audiences |

`surface-extraction` is the only lens that writes items directly to the graph rather than producing a `LensReport`. The other six produce a `LensReport` (per ADR-009 + `lens-reports.md` schema).

## File structure

Each lens prompt file follows this shape:

```markdown
---
status: draft | approved
lens: <lens-id>
related_features: INP-12
last_updated: YYYY-MM-DD
produces_lens_report: true | false
takes_lens_input: true | false
---

# Lens prompt — <lens-id>

## Purpose
One paragraph: what this lens produces and why someone would use it.

## When to use
Concrete situations that match this lens.

## Lens input
(Only present when the lens takes user-supplied input — `decision-support` and
`catch-up` for v1.) Describes what the user provides and how it shapes the prompt.

## Prompt fragment
The actual prose composed into the system prompt. Verbatim — do not rephrase
when porting into code; load it directly.

## Output schema
The keys the LLM must produce. Mirrors `result` shape in `lens-reports.md` and
typed in `lib/types/processing.ts`.

## Grounding rules
What the lens may and must not infer beyond the source material.
```

## Composition contract (what the runtime guarantees)

By the time the lens fragment is concatenated, the LLM has already received from the base prompt:

- **Identity context** — who Ellie is, what NicelyPut does. (Lens prompts must not duplicate this.)
- **Quality bar** — extract selectively; depth over breadth; the "useful in 6 months" test.
- **Source format convention** — sources arrive as `--- SOURCE: <id> | <title> | <date> | <source_type> | <authority> ---` blocks. **`<id>` is the canonical reference.** Every lens output that cites a source must use the id, not the title.
- **Confidence vocabulary** — `high` / `medium` / `low` defined consistently for every extracted item.
- **Universal `unexpected[]` output field** — every lens carries an `unexpected: Array<{ observation, why, sourceRefs }>` for surfacing left-field observations the lens's frame couldn't see. Defined in `_base.md`; lens prompts must not redefine it but should reflect it in their output schema documentation.

Lens prompts therefore focus only on:

1. The **frame** — what the user is asking the LLM to do with this corpus.
2. The **output structure** — the specific keys and shapes for this lens (with `unexpected[]` always included as the last key).
3. The **lens-specific grounding rules** — anything beyond the universal "don't invent" rule.

## Source references — the universal `sourceRefs` contract

Every item in every lens output that traces back to source material **must** include `sourceRefs: string[]` — an array of source `id` values (UUIDs). The id is provided in the `--- SOURCE: ... ---` header of each source in the corpus prompt.

- One id per source the item draws from. If the item is supported by 3 sources, list 3 ids.
- Do **not** use titles, dates, or freeform descriptions in `sourceRefs`. Commit-time edge writing depends on a stable key, and titles drift.
- Single-source surface extraction items use the `sourceRefs` of the single source that was passed in.
- For multi-source lenses, items with no single attributable source (rare — e.g. a `synthesisedInsight` that emerged from the gestalt) may have a single id corresponding to the strongest contributor, with the rest reflected in narrative text.
- Empty `sourceRefs[]` is invalid output.

## Lens input — when present

Two lenses take user-supplied input alongside the corpus:

- `decision-support` — free-form decision text. The user describes the decision they're weighing; the lens interrogates the corpus against it.
- `catch-up` — a `since` reference (date, event, or "last time"). The lens treats sources after `since` as primary and earlier sources as the baseline.

When a lens takes input, the runtime injects it into the prompt above the corpus. Lens prompts that take input must include explicit handling for the input being absent or empty (skip the lens, surface a warning at the UI layer).

## Editing notes

- These prompts are tuned during re-ingest day (Track B). First-pass drafts are good enough to validate the pipeline; expect revisions once real outputs are reviewed.
- Do not embed model-specific syntax (Claude/Gemini quirks). Prompts must work across the model fallback chain.
- Keep prompts under ~600 words each. If a lens needs more, that's a signal to split or move logic into the source-type fragment.
- Hardcoded brand context (`Ellie Rofe at NicelyPut...`) lives in the base prompt, not here. If a lens prompt names a person, organisation, or domain, that's a smell.
