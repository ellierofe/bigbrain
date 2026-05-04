---
status: draft
lens: content-ideas
related_features: INP-12
last_updated: 2026-05-04
produces_lens_report: true
takes_lens_input: false
---

# Lens prompt — content-ideas

## Purpose

Mine a corpus for content potential — hooks, angles, formats, and audience hypotheses worth turning into posts, articles, talks, or other artefacts. Distinct from the `contentAngles` category in `surface-extraction`: that lens captures content angles already present in a single source. This lens hunts across a corpus for what could become content, including angles that emerge from combining sources, and packages them into a brief content creation can act on.

## When to use

- Mining a batch of recent transcripts for "what could I write about this week?"
- Working through a body of research on a topic to find the strongest content angles before writing.
- After a project closes, surfacing the public-facing content the project's experience could support.
- Reviewing peer conversations and coaching calls for personal-voice angles that haven't surfaced as content yet.
- Not appropriate when the user already has a specific decision (use `decision-support`) or wants the corpus extracted item-by-item (use `surface-extraction`).

## Prompt fragment

You are applying the **content-ideas** lens. Your job is to surface content potential in the corpus — angles that could become posts, articles, talks, threads, or longer-form artefacts. Output is a brief that content creation can act on directly.

### What "content potential" means here

A content angle is not a topic. "AI in marketing" is a topic; "Why marketers who resist AI tools will outperform those who automate everything" is an angle. An angle has a specific claim or framing, a reason an audience would care, and a defensible position. Your job is to find angles, not topics.

Sources differ in how they yield angles. A direct content idea named in the source goes straight into `angles` with attribution. An angle that emerges from a contradiction between sources, or from a pattern across multiple sources, is more valuable — flag those explicitly.

### What to produce

**summary** — One paragraph. State how many sources you read, what categories of content potential they yielded (e.g. "strong on positioning angles, weak on personal-voice material"), and the single strongest angle if one stands out clearly. If the corpus is unsuitable for content mining (e.g. tightly NDA-bound client material that can't go public, or material too generic to support specific angles), say so.

**hooks** — Specific opening lines, questions, or framings that could anchor a piece of content. Each hook is a draft sentence or fragment, not a topic. The user is looking for the kind of line that makes someone stop scrolling — sharp, specific, ideally counterintuitive or pattern-breaking. Each entry includes the hook itself, what kind of piece it could open, and what claim or thesis the rest of the piece would need to back up.

**angles** — Full content angles. Each angle has: the angle (the specific claim or framing — one or two sentences), the audience it speaks to (be specific — not "founders" but "founders of seed-stage B2B SaaS who've raised once and are figuring out how to talk to series A investors"), why it would resonate (what makes this audience care now), and the substance the corpus provides to back it up. Skip angles the corpus can't substantively support.

**formats** — When the corpus suggests a specific format (long-form essay, LinkedIn post, talk, podcast pitch, email, thread, video script), capture the format with the angle(s) it suits. Not every angle needs a format suggestion; only include format suggestions that are non-obvious.

**audienceHypotheses** — Audiences the corpus implies but doesn't explicitly name. Each entry: the proposed audience (described concretely), the corpus signals that suggest this audience cares about the material, and 1–2 angles from this lens's output that would specifically land for them. Use this section sparingly — it's most valuable when the corpus reveals an audience the user hasn't been writing for yet.

### Rules

- `sourceRefs` on every item per the universal contract — source ids only.
- Hooks and angles drawn from a single source: cite that source. Hooks and angles emerging from a pattern across sources: cite all contributing sources. Cross-source angles are usually the most valuable; flag them explicitly in the angle text ("emerges from comparing X across three client interviews").
- Authority matters here. Prefer angles grounded in `own` and `peer` sources — those have voice and conviction. `external-authoritative` sources support angles with citations and data. `external-sample` sources support angles only as pattern observations, never as claim-evidence (do not cite a competitor's tweet to back up your own claim).
- An angle that requires the user to invent material to support it is not a usable angle. The point is to surface what the corpus can defend.
- Skip generic angles ("AI is changing everything") and clichés ("here are 5 lessons from..."). The user has plenty of those without LLM help.
- Do not produce 30 angles. 5–10 strong, specific angles is the target. Quality over quantity is the explicit instruction.
- The user has a specific voice (defined in DNA / tone-of-voice). Do not propose angles that contradict it. (You don't have direct access to the voice spec in this prompt — but if the corpus consistently signals a particular tone, register, or stance, propose angles consistent with it.)

## Output schema

```ts
{
  summary: string,
  hooks: Array<{
    hook: string,                   // the actual line
    pieceType: string,              // what it could open: "essay", "post", "thread", etc.
    thesisToBackUp: string,         // what the rest of the piece would need to argue
    sourceRefs: string[],
  }>,
  angles: Array<{
    angle: string,                  // 1-2 sentence specific claim or framing
    audience: string,               // concrete description, not a category
    whyItResonates: string,         // why this audience cares now
    corpusSubstance: string,        // what the corpus provides to back it up
    crossSource: boolean,           // true when the angle emerges from multiple sources
    sourceRefs: string[],
  }>,
  formats: Array<{
    format: string,                 // 'long-form essay' | 'LinkedIn post' | etc.
    suitedTo: string[],             // angle text(s) from this lens output that this format suits
    rationale: string,              // why this format for these angles
  }>,
  audienceHypotheses: Array<{
    audience: string,               // concrete, named audience
    corpusSignals: string,          // what in the corpus suggests this audience cares
    sampleAngles: string[],         // 1-2 angle texts (from this lens output) that would land for them
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

- **An angle the corpus cannot defend is noise.** If you cannot point to substance in the corpus that backs up the angle, drop the angle. Inventing material the user would then have to either fabricate or back-fill is a failure mode.
- **Voice consistency.** Do not propose angles in a register or tone the corpus does not support. If the corpus is reflective and considered, do not propose hot-take angles. If the corpus is sharp and contrarian, do not propose anodyne angles.
- **Cross-source angles are flagged explicitly.** When an angle requires multiple sources to be defensible, set `crossSource: true` and list all contributing source ids in `sourceRefs`. The user will use this signal to decide which angles are stronger.
- **Audience specificity is non-negotiable.** "B2B founders" is not an audience for this lens. "Founders of seed-stage B2B SaaS who've raised once" is. If you cannot specify the audience this concretely, the angle isn't ready and should be cut or revised.
- **No clichés, no generic frames.** Reject "5 lessons from", "what I learned about", "the hidden truth about", "in [year], the [category] is [verb]ing", and equivalents. They are filler regardless of what comes after.

## Notes

- This lens is new in INP-12 (no INP-11 predecessor). The closest INP-11 equivalent was the `contentAngles` category inside individual `surface-extraction` — useful but bounded to single-source angles. This lens adds cross-source mining, format hypotheses, and audience hypotheses.
- The first-pass output of this lens will be uneven. Tune the prompt during re-ingest day once 2–3 corpora have been run and the typical failure modes are visible (likely candidates: too many cross-source angles that don't really cross sources, format suggestions that are too obvious, audience hypotheses that drift from the corpus).
- Pairs naturally with the content creator (OUT-02). A committed `content-ideas` LensReport is a richer input to bundle generation than ad hoc DNA queries — the content angles are already pre-grounded in source material.
- Pairs with `project-synthesis` for project-close work: synthesis produces methodology + narrative; content-ideas mines the same corpus for what could become public content. Run both, treat them as complementary outputs of one project review.
