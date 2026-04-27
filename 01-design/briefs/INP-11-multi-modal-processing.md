# Multi-Modal Processing Brief
Feature ID: INP-11
Status: approved
Last updated: 2026-04-17

## Summary

Redesign the input processing flow so that transcripts and other source materials are stored first, processed later, and processable in multiple ways. The current system auto-extracts on ingestion with a single prompt. The new system separates storage from processing: sources land in an inbox, the user decides when and how to process them, and processing can be run multiple times with different prompts (individual extraction, batch analysis, reflective analysis, project synthesis). This is the epistemological foundation — different kinds of knowledge form in different ways, and the system must support that.

## The problem with the current model

The current pipeline (INP-01 → INP-03 → INP-07) treats every input identically:

1. Krisp scrapes a transcript
2. System auto-runs extraction (one prompt, one pass)
3. Results land in the queue for review
4. User commits to graph

This fails because:
- **Not every input should be extracted individually.** Accountability calls aren't about discrete ideas — they're about patterns over time.
- **Some knowledge only emerges across multiple inputs.** Discussing the same topic with 4 people in a week — no single transcript contains "the insight."
- **The user has no agency over processing.** The system decides what to extract and when. If the extraction is poor or wrong-shaped, the only option is to skip it.
- **Auto-extraction produces noise.** Without the user choosing *what kind of value* they want from a transcript, the system defaults to "extract everything" which produces thin, headline-level items.

## Core design shift

**From:** Input → auto-process → review → commit
**To:** Input → store → user selects + chooses processing mode → process → review → commit

The user decides when to process and how. The system makes source materials available and offers processing modes. Processing doesn't consume sources — a transcript can be processed multiple times with different prompts.

## The three spaces

### 1. Inbox (the cue)

**What it is:** A filtered view of Sources showing items with `inbox_status = 'new'`. Badge in sidebar with count. Prompts the user to act.

**What lands here:** Krisp transcripts (auto-scraped), uploaded documents, voice note transcriptions — anything that arrives without the user actively processing it.

**What the user does here:**
- See what's new at a glance (title, date, participants, source type, auto-tags from meeting_types)
- Tag/re-tag items
- Assign to a project or mission
- Select items → choose a processing mode → send to processing
- Mark as "reviewed" (sets `inbox_status = 'triaged'`, removes from inbox view)

**Implementation:** Not a separate page — a filtered view of Sources where `inbox_status = 'new'`. Sidebar badge shows count of `inbox_status = 'new'` rows. Same UI, different default filter.

### 2. Sources (the library)

**What it is:** The permanent, browsable collection of all source materials. Transcripts, documents, voice notes, research files. Filterable by type, date, tags, project, mission, participants.

**Key properties:**
- Sources are **never consumed or deleted by processing.** A transcript stays in Sources forever.
- A source can be **processed multiple times** with different prompts. Each processing run creates a separate results set.
- Sources track their **processing history:** date, mode used, link to result.
- Sources can be **selected in bulk** for batch processing.

**Relationship to existing tables:** This is `src_source_documents` — the table already exists. The change is making it browsable as a first-class section in the UI and decoupling it from the extraction flow. Currently, `src_source_documents` rows are only created at commit time. In the new model, they're created at ingestion time (when the transcript is stored), before any processing happens.

### 3. Results (the review queue)

**What it is:** Where processing output lands for review before committing to the graph. This is what the current queue (INP-07) becomes — but now it only contains items the user deliberately asked the system to process.

**What appears here:**
- For individual extraction: same as today — per-item results with topic clustering, editing, dedup badges, commit flow
- For batch analysis: a structured analysis document with sections, insights, and patterns — reviewable and editable before selective ingestion
- For reflective analysis: a longitudinal reflection with themes, shifts, recurring patterns — reviewable before ingestion

**The user can:** review, edit, uncheck items, commit to graph — same flow as today but downstream of a deliberate choice.

## Processing modes

### Mode 1: Individual extraction

**What:** Process each selected source separately. Extract discrete knowledge items (ideas, concepts, people, techniques, etc.) from each one independently.

**When to use:** Strategy conversations, research discussions, client sessions — any input where specific things were said that are individually worth capturing.

**Prompt:** The current INP-03 extraction prompt (as recently improved with the quality bar). See `lib/llm/system-prompts.ts` → `processing`.

**Output:** One `ExtractionResult` per source, each appearing as a separate entry in Results. Same review flow as today.

**Selection:** User selects 1+ sources from Inbox or Sources → "Extract individually"

### Mode 2: Batch analysis

**What:** Process multiple sources together as one corpus. Identify patterns, recurring themes, contradictions, and synthesised insights that span the set.

**When to use:** Multiple conversations about the same topic (e.g., 4 people discussed go-to-market strategy this week). Research interviews for a project. Sales calls for a quarter.

**Prompt:**
```
You are a knowledge analyst for BigBrain, a second-brain system for Ellie Rofe at NicelyPut — a strategic communications, positioning and pitch deck/fundraising consultancy.

You have been given multiple source documents from a defined period or topic. Your job is to analyse them as a corpus — not to extract from each one individually, but to identify what emerges from the set as a whole.

## What to produce

**recurring_themes** — Topics, concerns, or ideas that appear across multiple sources. For each theme: what it is, which sources it appears in, and how it manifests differently across them. Only include themes that genuinely recur — a topic mentioned once is not a theme.

**convergences** — Points where multiple sources agree, reinforce each other, or arrive at the same conclusion from different angles. Note what's converging and why that convergence is significant.

**divergences** — Points where sources disagree, contradict, or present meaningfully different perspectives on the same topic. Note the tension and what it might indicate.

**synthesised_insights** — Insights that don't exist in any single source but emerge from reading them together. These are the most valuable outputs. Each must explain: what the insight is, why it only becomes visible across the set, and what it implies for strategy, content, or action.

**gaps** — Topics or questions you'd expect to be covered given the theme of these sources, but that are missing or underexplored. What wasn't discussed that probably should have been?

## Rules

- Ground everything in the actual source text. You can speculate beyond what the sources support, based on your knowledge, as long as those speculations or additions are clearly flagged.
- For each finding, reference which source(s) it draws from (by title or date).
- Prefer depth over breadth. 5 well-developed synthesised insights are worth more than 10 shallow observations.
- If the sources are too similar to produce meaningful cross-cutting analysis (e.g., they're essentially the same conversation), say so — don't force patterns that aren't there.
```

**Output schema:**
```typescript
interface BatchAnalysis {
  summary: string              // 2-3 sentence overview of what the corpus covers
  sourceCount: number
  dateRange: { from: string; to: string }
  recurringThemes: Array<{
    theme: string
    description: string
    sourceRefs: string[]       // titles or dates of sources where this appears
  }>
  convergences: Array<{
    point: string
    description: string
    sourceRefs: string[]
  }>
  divergences: Array<{
    point: string
    description: string
    sourceRefs: string[]
  }>
  synthesisedInsights: Array<{
    insight: string            // the insight itself — 2-4 sentences
    basis: string              // why this only emerges from the set
    implication: string        // what it means for strategy/content/action
    sourceRefs: string[]
  }>
  gaps: Array<{
    gap: string
    description: string
  }>
}
```

**Selection:** User selects 2+ sources → "Analyse as batch"

### Mode 3: Reflective analysis

**What:** Analyse a set of sources over time. Focus on what changed, what recurred, what shifted.

**When to use:** Accountability calls over a month. Coaching sessions across a quarter. Any repeating conversation type where the value is in the trajectory, not any single instance.

**Prompt:**
```
You are a reflective analyst for BigBrain, a second-brain system for Ellie Rofe at NicelyPut — a strategic communications, positioning and pitch deck/fundraising consultancy.

You have been given a set of source documents ordered by date, from the same recurring context (e.g., weekly accountability calls, coaching sessions, mastermind meetings). Your job is to analyse them as a trajectory — what's changed, what's stuck, what patterns are emerging.

## What to produce

**commitments_and_followthrough** — What did Ellie commit to doing across these sessions? Which commitments were followed through, which were dropped, and which keep getting re-committed without completion? Be specific — name the commitment and trace it across sessions.

**recurring_blockers** — What obstacles, frustrations, or sticking points come up repeatedly? Which ones eventually got resolved and how? Which ones are still active? Note any patterns in what triggers them.

**emerging_themes** — Topics, interests, or concerns that have grown in prominence over the period. What was barely mentioned early on but became central? What faded out?

**shifts_in_thinking** — Places where Ellie's perspective, approach, or priorities visibly changed between sessions. What prompted the shift? Was it gradual or sudden?

**energy_and_momentum** — Reading between the lines: where does energy seem high vs. low? Are there patterns in what energises and what drains? Any correlation with specific project types, topics, or contexts?

**key_realisations** — The most important "aha" moments or insights that emerged across the period. These may have been stated explicitly in one session or may only be visible in retrospect.

**meta_analysis** — Are these sessions providing value? Are they producing progress or moving the dial? Are there opportunity costs to spending this time here? Are there any negative side effects?

## Rules

- Present findings chronologically where relevant — show the trajectory, not just the summary.
- Reference specific sessions by date or title.
- Be honest about negative patterns (dropped commitments, recurring avoidance) — this analysis is for self-improvement, not a highlight reel.
- If the sessions are too few or too similar to show meaningful change, say so.
- Prefer concrete observations over generic coaching-speak. "Ellie mentioned task-switching fatigue in 3 of 4 sessions, always in the context of client work" is useful. "There may be some stress" is not.
```

**Output schema:**
```typescript
interface ReflectiveAnalysis {
  summary: string
  period: { from: string; to: string }
  sessionCount: number
  commitmentsAndFollowthrough: Array<{
    commitment: string
    status: 'completed' | 'in_progress' | 'dropped' | 'recurring'
    sessions: string[]         // dates/titles where this appeared
    notes: string
  }>
  recurringBlockers: Array<{
    blocker: string
    frequency: number          // how many sessions it appeared in
    resolved: boolean
    resolution?: string
  }>
  emergingThemes: Array<{
    theme: string
    trajectory: string         // how it changed over the period
    sessions: string[]
  }>
  shiftsInThinking: Array<{
    shift: string
    from: string
    to: string
    trigger?: string
  }>
  energyAndMomentum: {
    highPoints: string[]
    lowPoints: string[]
    patterns: string
  }
  keyRealisations: Array<{
    realisation: string        // 2-4 sentences
    session: string            // where it emerged or became visible
    significance: string
  }>
    metaAnalysis: Array<{
    observation: string        // 2-4 sentences
    evidence: string            // where it emerged or became visible
    suggestions: string
  }>
}
```

**Selection:** User selects sources (likely filtered by tag or meeting type + date range) → "Reflective analysis"

### Mode 4: Project synthesis

**What:** Distil learning from an entire body of work. What methodology was used? What worked? What are the reusable patterns? What's the case study narrative?

**When to use:** At project close, or periodically during long engagements. Triggered from a client project or mission page, or by selecting all sources tagged to a project.

**Prompt:**
```
You are a project analyst for BigBrain, a second-brain system for Ellie Rofe at NicelyPut — a strategic communications, positioning and pitch deck/fundraising consultancy.

You have been given all source documents from a specific client project or research mission. Your job is to distil what was learned — the methodology that emerged, the patterns worth reusing, and the narrative worth telling.

## What to produce

**methodology** — What approach or methodology did Ellie actually use in this project? Not the textbook version — the real one, as evidenced by the sources. Steps, tools, frameworks, decision points. Describe it as if writing a playbook someone else could follow.

**what_worked** — Specific approaches, decisions, or strategies that produced good results. Cite evidence from the sources. Be concrete — "the stakeholder mapping in week 2 identified the right decision-makers" not "the research phase went well."

**what_didnt_work** — Approaches that failed, pivots that were needed, or assumptions that turned out wrong. Just as important as what worked. Ellie needs this for honest reflection and improvement.

**reusable_patterns** — Frameworks, templates, approaches, or principles from this project that could be applied to future work. Each must be general enough to transfer but specific enough to be actionable.

**case_study_narrative** — The project story as it could be told to a client, audience, or portfolio: the challenge, the approach, the key moments, the outcome. Written as a draft narrative (not bullet points), 400-800 words.

**content_angles** — Content pieces that could be written based on this project's experience. Each needs a specific angle (not just a topic), a target audience, and why it would resonate.

**open_threads** — Questions raised by the project that weren't resolved. Follow-up research needed. Things worth revisiting.

## Rules

- Base everything on the source documents. Do not invent outcomes or details not present.
- If the sources are incomplete (e.g., missing the project conclusion), note what's missing and work with what's available.
- The methodology section is the most important output — it's what compounds across projects.
- Write the case study narrative in Ellie's voice if possible (based on how she speaks in the transcripts).
```

**Output schema:**
```typescript
interface ProjectSynthesis {
  summary: string
  projectName: string
  sourceCount: number
  dateRange: { from: string; to: string }
  methodology: {
    overview: string           // 2-3 sentence summary
    steps: Array<{
      step: string
      description: string
      tools?: string[]
    }>
  }
  whatWorked: Array<{
    approach: string
    evidence: string
    sourceRefs: string[]
  }>
  whatDidntWork: Array<{
    approach: string
    whatHappened: string
    lesson: string
  }>
  reusablePatterns: Array<{
    pattern: string
    description: string
    applicability: string      // when/where to apply this
  }>
  caseStudyNarrative: string   // 200-400 word draft
  contentAngles: Array<{
    angle: string
    audience: string
    whyItResonates: string
  }>
  openThreads: Array<{
    question: string
    context: string
  }>
}
```

**Selection:** User selects sources from project/mission scope → "Synthesise project" — or triggered from project page.

## Data model

### Modified: `src_source_documents`

Currently created only at commit time. Change to create at **ingestion time** — when the transcript is first stored.

New fields:

| Field | Type | Notes |
|---|---|---|
| `inbox_status` | text | `'new'` \| `'triaged'` \| null. Auto-scraped items get `'new'`. Set to `'triaged'` when user acknowledges or processes. Null for manually-created sources. |
| `processing_history` | jsonb | Array of `{ date: string, mode: string, runId: string }`. Tracks each processing run this source was part of. |

Existing fields used as-is: `raw_text`, `krisp_meeting_id`, `tags`, `title`, `type`, `document_date`.

### New: `processing_runs`

One row per processing run. Replaces the role `pending_inputs` currently plays (which becomes legacy once INP-11 is built).

| Field | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `brand_id` | uuid FK → brands | |
| `mode` | text | `'individual'` \| `'batch'` \| `'reflective'` \| `'synthesis'` |
| `source_ids` | uuid[] | Array of `src_source_documents.id` that were inputs to this run |
| `title` | text | Auto-generated or user-provided title for the run |
| `extraction_result` | jsonb | For mode `'individual'`: the `ExtractionResult` (same as current). Null for other modes. |
| `analysis_result` | jsonb | For modes `'batch'` / `'reflective'` / `'synthesis'`: the structured analysis output. Null for individual. |
| `topic_clusters` | jsonb | Topic clusters if generated. |
| `status` | text | `'pending'` \| `'committed'` \| `'skipped'` |
| `committed_at` | timestamptz | |
| `created_at` | timestamptz | |

### Legacy: `pending_inputs`

Remains as-is for backward compatibility with existing queued items. New processing runs write to `processing_runs`. Once existing pending items are processed or cleared, `pending_inputs` can be deprecated.

### Not in v1: `processing_prompts`

Registry of available processing prompts. For v1, the four modes are hardcoded. Future: custom prompts, prompt versioning, prompt suggestions based on source tags.

## User journey

### Primary flow: Weekly triage

1. Ellie opens BigBrain on Monday. Sidebar shows Sources badge: "7 new"
2. Opens Sources (defaults to Inbox filter showing `inbox_status = 'new'`). Sees 7 transcripts from last week, auto-tagged by meeting_types:
   - 2x "Daily accountability" (Justyna)
   - 1x "Mastermind" (State Change group)
   - 2x "Client: SDP" (tagged by client project)
   - 1x "Research call" (tagged manually or by pattern)
   - 1x "Catch-up" (untagged)
3. She selects the 2 accountability calls → "Reflective analysis" → processing runs → results land in Results
4. She selects the 2 SDP calls → "Extract individually" → each gets extracted separately → 2 result sets land in Results
5. She selects the mastermind call → "Extract individually" → results land
6. The research call she wants to batch with two others from the previous week. She switches to "All sources" view, filters by tag "research", selects 3 → "Analyse as batch" → one analysis lands in Results
7. The catch-up she skims, decides it's not worth processing. Marks as "reviewed" → `inbox_status` set to `'triaged'`, disappears from inbox view.
8. She works through the Results queue over the week, reviewing and committing.

### Secondary flow: Project synthesis

1. Ellie finishes the SDP project. Opens the SDP project page.
2. Sees all linked sources (12 transcripts, 3 documents).
3. Clicks "Synthesise project" → synthesis prompt runs across all 15 sources
4. A synthesis document appears in Results: methodology used, what worked, reusable patterns, case study narrative
5. She reviews, edits the narrative, commits selected items to graph (new Methodology nodes, a Story, Content Angles)

## Relationship to existing features

| Feature | Relationship |
|---|---|
| INP-01 (Krisp ingest) | Still runs auto-scrape. But stops at storage — no auto-extraction. Transcripts land in Inbox. |
| INP-03 (Processing pipeline) | Becomes one processing mode ("Individual extraction"). `extractFromText()` unchanged. |
| INP-07 (Queue) | Evolves into the Results queue. Same review UI, but downstream of deliberate processing. |
| INP-09 (Context-aware extraction) | Applies to all processing modes — DNA context injection improves any prompt. |
| INP-10 (Dedup detection) | Applies at Results review time, same as designed. |
| AUTO-03 (Self-development analysis) | Becomes a scheduled instance of Mode 3 (Reflective analysis). The prompt is AUTO-03's scope, the mechanism is INP-11's. |
| CLIENT-01 (Client projects) | Project synthesis (Mode 4) triggers from project page. Sources linked to project are the corpus. |
| MISSION-01 (Research missions) | Same as CLIENT-01 — mission page can trigger synthesis across linked sources. |
| SRC-02 (Source knowledge library) | The Sources section in INP-11 *is* SRC-02. Building this delivers both features. |

## Edge cases

- **Empty inbox:** "No new sources. Transcripts from Krisp will appear here automatically, or add sources manually."
- **Processing a single source with batch mode:** Allowed but discouraged — UI hint: "Batch analysis works best with 2+ sources."
- **Very large corpus (50+ sources in one batch):** Token limits. Chunk into sub-batches or use summarise-then-synthesise two-pass approach. Flag to user if corpus exceeds practical limits.
- **Re-processing:** A source that's been extracted individually can later be included in a batch analysis. Processing history tracked on the source. Results are additive, not replacing.
- **Source without raw text:** Some sources may be metadata-only (e.g., a reference to an external document). Can't be processed — greyed out in selection with tooltip.
- **Auto-processing for specific meeting types:** Future enhancement. `meeting_types` could have a `default_processing_mode` field that auto-triggers processing on ingestion for certain types. Not in v1 — everything starts manual.

## Out of scope (v1)

- Custom prompt creation UI (prompts are hardcoded for the 4 modes)
- Auto-processing rules per meeting type
- Voice note transcription (INP-02 — separate feature)
- Document parsing (INP-05 — separate feature, but sources from INP-05 would use the same processing modes)
- Graph-node-level synthesis (operating on already-extracted nodes rather than raw source text) — revisit when building project/mission retrieval

## Decisions log

- 2026-04-16: Briefed. Core shift: separate storage from processing, user chooses when and how to process. Four processing modes identified. Inbox/Sources/Results three-space model. Sources are permanent, processing is repeatable. Krisp auto-scrape stops at storage. Analysis modes (2-4) produce intermediate documents reviewed before ingestion.
- 2026-04-17: Open questions resolved. Inbox implemented as filtered view of Sources (not separate page) with sidebar badge. Processing history as JSONB array on `src_source_documents`. New `processing_runs` table (not evolving `pending_inputs`). Prompts drafted for all four modes with structured output schemas. Ellie reviewed and refined all prompts (NicelyPut description updated, speculation rules clarified, reflective analysis expanded with self-development and relationship patterns). Brief approved.
