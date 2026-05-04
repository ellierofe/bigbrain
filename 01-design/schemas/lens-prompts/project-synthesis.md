---
status: draft
lens: project-synthesis
related_features: INP-12
last_updated: 2026-05-04
produces_lens_report: true
takes_lens_input: false
---

# Lens prompt — project-synthesis

## Purpose

Distil what was learned from a body of work on a single project. Reads the full set of sources from a client engagement, research mission, or internal initiative and produces the methodology that emerged, the patterns worth reusing, the case-study narrative, and the open threads. The lens compounds expertise across projects — the methodology section is the part that pays off most over time.

## When to use

- Project close — after a client engagement wraps up, before context fades.
- Mid-project review at a natural pause point (end of a phase, after a major deliverable).
- Retrospectively, to extract methodology from older work that was never properly captured.
- Not appropriate for ongoing recurring contexts (use `self-reflective`) or for cross-project pattern work (use `pattern-spotting`).

## Prompt fragment

You are applying the **project-synthesis** lens. The corpus is the set of sources from a specific project — client engagement, research mission, or internal initiative. Your job is to distil what was learned: the methodology that actually emerged (not the textbook version), the patterns worth reusing on future work, the narrative worth telling, and the threads still open.

The methodology section is the most valuable output. Methodology compounds across projects in a way that individual insights do not.

### What to produce

**summary** — One paragraph. Name the project (use the corpus tags, titles, or explicit project markers; if uncertain, say so), the period covered, the corpus size, and the headline of what was learned. If the corpus is incomplete (missing the project conclusion, missing the discovery phase, etc.) note what's missing — the user can decide whether to wait for more sources or proceed.

**methodology** — What approach did the user actually use in this project? Not the textbook version — the real one, evidenced by the sources. Describe it as a playbook someone else could follow:
- An overview paragraph (3–5 sentences) covering the shape of the approach.
- Steps in order, each with a name, a description of what was done, and the tools, frameworks, or artefacts involved.

The implicit methodology is often more interesting than the explicit one — the user's actual sequence of work, including the steps they didn't name as "methodology" but did consistently. Surface those.

**whatWorked** — Specific approaches, decisions, or strategies that produced good results in this project. Be concrete: "the stakeholder mapping in week 2 surfaced the unnamed sponsor and changed the deck structure" — not "the research phase went well." Each entry: the approach, the evidence it worked, the source(s) that show it.

**whatDidntWork** — Approaches that failed, pivots that became necessary, assumptions that turned out wrong, or steps that produced friction. Equally important to `whatWorked` — the user uses this for honest improvement, not for highlight reels. Each entry: the approach or assumption, what actually happened, and the lesson worth carrying forward.

**reusablePatterns** — Frameworks, templates, sequences, or principles from this project that could transfer to future work. Each pattern needs to be general enough to transfer (not "the deck for client X") but specific enough to be actionable (not "stakeholder alignment is important"). The right level: "for first-call fundraising research, lead with the founder's narrative arc rather than the market thesis — generates better signal on what to investigate next." Each entry: the pattern, a description of it, and where it would apply.

**caseStudyNarrative** — The project told as a story, 200–400 words: the challenge that opened it, the approach taken, the key turning points, the outcome (or where it currently stands). Written as a draft narrative — full sentences, paragraphs, not bullets. Written in a register the user could re-voice and use as a portfolio piece, a sales conversation, or content material. If the corpus reveals the user's voice (e.g. transcripts of how they describe the project to clients), match that register.

**contentAngles** — Public-facing content this project's experience could support. Distinct from the `content-ideas` lens (which mines a corpus broadly for content potential): here, you are extracting only angles that this specific project's experience uniquely substantiates. Each angle: the angle, the specific audience, why this project's evidence backs it up. Skip generic angles a hundred consultancies could write.

**openThreads** — Questions raised by the project that weren't resolved, follow-up research worth doing, ideas the project sparked but didn't pursue, or things worth revisiting on similar future work. Each thread: the question or thread, and the context that makes it worth carrying forward.

### Rules

- `sourceRefs` on every item per the universal contract — source ids only.
- Methodology steps sometimes won't have a single source — they emerged across multiple sessions. Use the array (`sourceRefs: string[]`) accordingly. (For the `methodology.overview` and `methodology.steps[].description` fields, `sourceRefs` is a strong recommendation but not required if the step is genuinely cross-corpus.)
- Base everything on the source documents. Do not invent outcomes or details not present.
- Where the corpus is incomplete (no conclusion, missing discovery phase, etc.), state this in `summary` and produce what you can. Do not fabricate to fill the schema.
- The `caseStudyNarrative` is the only field that allows narrative voice. Match the user's register if the corpus reveals it. Do not write in a generic case-study voice.
- Avoid project-management language for its own sake (`stakeholder alignment`, `delivery cadence`, `success criteria`) — only use it when the source text uses it. The lens reflects the project as it was, in the language it was conducted in.

## Output schema

```ts
{
  summary: string,
  projectName: string,                       // from corpus tags/titles, or "Unnamed project"
  dateRange: { from: string, to: string },
  sourceCount: number,
  methodology: {
    overview: string,                        // 3-5 sentence shape of the approach
    steps: Array<{
      step: string,                          // step name
      description: string,
      tools?: string[],
      sourceRefs: string[],
    }>,
  },
  whatWorked: Array<{
    approach: string,
    evidence: string,
    sourceRefs: string[],
  }>,
  whatDidntWork: Array<{
    approach: string,
    whatHappened: string,
    lesson: string,
    sourceRefs: string[],
  }>,
  reusablePatterns: Array<{
    pattern: string,
    description: string,
    applicability: string,
    sourceRefs: string[],
  }>,
  caseStudyNarrative: string,                // 200-400 words, full prose
  contentAngles: Array<{
    angle: string,
    audience: string,
    whyItResonates: string,
    sourceRefs: string[],
  }>,
  openThreads: Array<{
    question: string,
    context: string,
    sourceRefs: string[],
  }>,
  unexpected: Array<{               // universal — see extraction-schemas/_base.md
    observation: string,
    why: string,
    sourceRefs: string[],
  }>,
}
```

## Grounding rules

- **Methodology is what was actually done, not what was claimed.** If the user said "we'll start with stakeholder mapping" but the sources show they actually started with desk research, the methodology says desk research. The descriptive method beats the prescriptive one every time.
- **`whatDidntWork` deserves equal rigour to `whatWorked`.** The single biggest failure mode of project synthesis is producing a balanced-looking but imbalanced output — three things that worked, one vague thing that "had its challenges". Treat both with the same specificity.
- **Reusable patterns must be both general and specific.** Too general = "communication is important". Too specific = "use Notion for the deck for fundraising clients in defence-tech". The right level abstracts the pattern enough to transfer but keeps enough specificity to act on.
- **Case-study narrative matches voice or stays neutral.** If the corpus reveals the user's voice (especially own / peer authority transcripts), match it. If voice is unclear, write neutrally — better than imitating a voice you don't have evidence for.
- **Open threads are not failures.** A project with several open threads at synthesis time is normal and useful — they're inputs to future work. List them generously.

## Notes

- This lens is the INP-11 `projectSynthesis` mode, ported. Critical-pass changes from the INP-11 prompt:
  - Brand identity context lifted to the base prompt.
  - `sourceRefs` standardised on source ids (was "by title or date").
  - `whatDidntWork.sourceRefs` and `reusablePatterns.sourceRefs` and `openThreads.sourceRefs` added — INP-11 had source refs only on `whatWorked`. The asymmetry was a real gap; failures and reusable patterns deserve the same provenance trail.
  - `methodology.steps[].sourceRefs` added — needed for the graph commit to write `DERIVED_FROM` edges from methodology nodes back to the sources that show them.
  - `contentAngles` reframed with explicit boundary against the `content-ideas` lens — only project-specific angles here, broad mining belongs in the dedicated lens.
  - Voice-matching guidance for `caseStudyNarrative` softened from "if possible" to a concrete rule: match if revealed, stay neutral otherwise. Imitating voice from thin evidence is worse than neutral prose.
  - Methodology framing strengthened: descriptive (what actually happened) over prescriptive (what was planned). The INP-11 version had this as one bullet; promoted to a top-line grounding rule.
- Output schema matches the existing `projectSynthesisSchema` in `lib/types/processing.ts` with the `sourceRefs` additions noted. TypeScript type stays as `ProjectSynthesisResult` per ADR-009 §Consequences.
- Pairs with `content-ideas` for project-close work — project-synthesis distils the methodology and narrative; content-ideas mines the same corpus broadly for content angles. Run both.
- Pairs with `pattern-spotting` for cross-project work — project-synthesis on each project, then pattern-spot across the synthesised methodologies to find what's transferring.
