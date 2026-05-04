---
status: draft
lens: self-reflective
related_features: INP-12
last_updated: 2026-05-04
produces_lens_report: true
takes_lens_input: false
---

# Lens prompt — self-reflective

## Purpose

Read sources from a recurring personal context (accountability calls, coaching sessions, mastermind meetings, internal notes over time) as a trajectory and surface what's changed, what's stuck, what patterns are emerging. The lens is for self-understanding, not self-promotion: it makes visible what's hard to see from inside the day-to-day.

## When to use

- End-of-month reflection across accountability check-ins and coaching calls.
- Quarterly review of what's shifted in the user's thinking, energy, or focus.
- After a stretch of intense work, taking stock of what came up across the period.
- Reviewing sessions with a specific coach or mentor across several months.
- Not appropriate for cross-topic or cross-corpus pattern work (use `pattern-spotting`) or for project-specific reflection on outcomes (use `project-synthesis`).

## Prompt fragment

You are applying the **self-reflective** lens. The corpus is a set of sources from a recurring personal context — accountability calls, coaching sessions, internal notes, or similar — ordered by date (earliest first). Your job is to read them as a trajectory and surface what's changed, what's stuck, what patterns are emerging.

This lens is for honest reflection, not encouragement. The user is reading this to understand themselves better. Generic coaching language ("there may be some stress", "it sounds like you're growing") is worse than useless here — it dilutes signal.

### What to produce

**summary** — One paragraph. State the period covered, the number of sessions, and the headline trajectory: what's the single most important thing this set of sources reveals about the user across this period? If the corpus is too short or too uniform to show meaningful trajectory (e.g. two sessions a week apart), say so plainly and stop.

**commitmentsAndFollowthrough** — What did the user commit to doing across these sessions? Trace each commitment across the corpus: was it followed through, dropped, or repeatedly re-committed without completion? Be specific — name the commitment, name the sources where it appears, mark its status (`completed` / `in_progress` / `dropped` / `recurring`), and give brief notes on what the trajectory of that commitment suggests.

**recurringBlockers** — Obstacles, frustrations, or sticking points that come up repeatedly. Each blocker: what it is, how often it appears (count), whether it's been resolved (and if so, how), and any patterns in what triggers it. Recurring blockers are often more diagnostic than commitments — they point at structural rather than situational problems.

**emergingThemes** — Topics, interests, or concerns that have grown in prominence across the period. Each theme: what it is, its trajectory (`growing` / `stable` / `fading`), the sessions where it appears, and what its growth or decline might indicate. The interesting themes are usually those that grow without the user explicitly attending to them — quieter signals that something is shifting.

**shiftsInThinking** — Specific places where the user's perspective, approach, or priorities visibly changed between sessions. Each shift: what changed, what they thought before, what they think now, and (where evident) what triggered the shift. A shift is more than a stated opinion change; the corpus should show the change in how they describe situations across sessions, not just one session where they say "I've changed my mind about X."

**energyAndMomentum** — Reading between the lines. Where does energy seem high vs low across the period? Are there patterns in what energises and what drains? Any correlation with specific project types, topics, contexts, or times? Surface high points, low points, and the patterns that connect them. This is the most interpretive section — be concrete about what in the source text supports each observation.

**keyRealisations** — The most important "aha" moments from across the period. These may have been stated explicitly in one session or may only be visible in retrospect. Each realisation: what it is, the session where it surfaced (or "across the period" for retrospectively-visible ones), and why it's significant.

**metaAnalysis** — Step back from the content and look at the practice itself. Are these sessions producing value? Is the format working? Is the user using the time well? Are there opportunity costs to spending this time here? Negative observations are welcome — the user has agreed to coaching ending in some cases (e.g. specific accountability series ending) and a clear-eyed read on whether the practice is paying off is more useful than encouragement.

### Rules

- `sourceRefs` on every item per the universal contract — source ids only.
- Where a finding traces across multiple sessions, list every contributing source id in `sourceRefs`. Do not pick "the most representative" one; the trajectory is the point.
- Present trajectory findings chronologically inside the field text — the user wants to see the arc, not just the conclusion.
- Be honest about negative patterns: dropped commitments, recurring avoidance, blockers that haven't moved, sessions that aren't producing value. The user has explicitly chosen this lens for self-improvement, not validation.
- Generic coaching language (`growth journey`, `stepping into your power`, `embracing change`, `holding space`) is forbidden. Specific, concrete observations only. "The user mentioned task-switching fatigue in 3 of 4 sessions, always in the context of client work, never in the context of strategy work" is useful. "There may be some stress around work" is not.
- Do not extract action items or to-dos. The point is reflection, not planning.
- If the corpus is too few sessions or too internally uniform to support trajectory analysis, say so in the `summary` and return empty arrays for the rest. Better than fabricating arc.
- The `metaAnalysis` section is unusual in that it's allowed (and encouraged) to be skeptical of the practice itself. Do not soften this — the user has asked for it.

## Output schema

```ts
{
  summary: string,
  period: { from: string, to: string },     // ISO dates
  sessionCount: number,
  commitmentsAndFollowthrough: Array<{
    commitment: string,
    status: 'completed' | 'in_progress' | 'dropped' | 'recurring',
    notes: string,
    sourceRefs: string[],
  }>,
  recurringBlockers: Array<{
    blocker: string,
    frequency: number,                       // count of sessions where it appears
    resolved: boolean,
    resolution?: string,
    sourceRefs: string[],
  }>,
  emergingThemes: Array<{
    theme: string,
    trajectory: 'growing' | 'stable' | 'fading',
    description: string,
    sourceRefs: string[],
  }>,
  shiftsInThinking: Array<{
    shift: string,
    from: string,
    to: string,
    trigger?: string,
    sourceRefs: string[],
  }>,
  energyAndMomentum: {
    highPoints: string[],
    lowPoints: string[],
    patterns: string,
    sourceRefs: string[],                    // sources supporting the energy reading
  },
  keyRealisations: Array<{
    realisation: string,
    significance: string,
    sourceRefs: string[],                    // session(s) where it surfaced
  }>,
  metaAnalysis: Array<{
    observation: string,
    evidence: string,
    suggestions: string,
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

- **Trajectory means visible arc, not single-session statement.** A "shift in thinking" requires evidence of how the user described things before vs after. A user saying "I've changed my mind" once is data, but not a shift unless the rest of the corpus reflects the change.
- **Counts and patterns, not vibes.** Recurring blockers have frequencies. Energy patterns have specific source-text anchors. Generic emotional readings without source-text support are not findings.
- **No advocacy, no flattery, no minimising.** The user is reading this honestly; the lens is honest with them.
- **The `metaAnalysis` field is the lens's quiet exit ramp.** When the corpus suggests the practice itself isn't working — coaching that's stalled, accountability that's become performative, sessions that don't produce action — `metaAnalysis` is the field that says so. Do not soften this; the user has asked the lens to be honest about it.

## Notes

- This lens is the INP-11 `reflectiveAnalysis` mode, ported. Critical-pass changes from the INP-11 prompt:
  - Brand identity context lifted to the base prompt.
  - `sourceRefs` standardised on source ids (was "by date or title").
  - `emergingThemes.trajectory` typed as enum (was free-form text — easier to render in the review UI).
  - `keyRealisations.session` field replaced with `sourceRefs[]` array — supports realisations that surface across multiple sessions, not just one.
  - `recurringBlockers.frequency` clarified as session count rather than free-form.
  - `metaAnalysis` framing strengthened — explicit allowance for skepticism of the practice. The INP-11 version was accurate about this but soft. The user has signalled (per project memory: Justyna sessions ending) that this section is genuinely valuable when honest.
  - Banned coaching jargon list added. Reading the INP-11 prompt's caution against "coaching-speak" was less effective than naming specific phrases.
  - `energyAndMomentum.sourceRefs` added so the energy reading is traceable to its source-text anchors.
- Output schema matches the existing `reflectiveAnalysisSchema` in `lib/types/processing.ts` with the additions noted above. TypeScript type will be renamed `SelfReflectiveResult` per ADR-009 §Consequences.
- Pairs with `catch-up` for accountability work: catch-up answers "what changed since last time?", self-reflective answers "what does the trajectory tell me about myself?" Different cadences — catch-up is short-period, self-reflective is multi-month.
- Pairs with `content-ideas` cautiously — self-reflective material is private by default. Use only when the user explicitly wants to mine personal reflection for public content.
