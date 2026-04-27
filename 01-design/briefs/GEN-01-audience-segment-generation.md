# Audience Segment Generation Brief
Feature ID: GEN-01
Status: approved
Last updated: 2026-04-20
Related: DNA-03 (audience segments CRUD — done), GEN-PROMPTS-01 (generation prompt design — this is the first implementation)

## Summary

Replace the stubbed "Generate segment" flow in the audience segment creation modal with a working LLM-powered generation pipeline. The user provides a few high-signal inputs through a guided conversation within the modal; the system injects business context (DNA, existing segments), generates the full segment profile (psychographics, VOC statements, demographics, summary, avatar), and saves it directly to the detail view for review and editing. Avatar image generation runs in parallel with profile generation. This feature establishes the generation pattern that all future DNA types will follow.

## Design principles (specific to this feature)

1. **Intelligent interlocutor, not a form.** The system has minimum information thresholds, not minimum field counts. The LLM decides whether it has enough to generate and what to ask for if it doesn't.
2. **Context-grounded generation.** Business overview, value proposition, and existing segments are always injected. The LLM generates within the context of this specific business, not from stereotypes.
3. **Biggest problem and desire do the heavy lifting.** These two inputs anchor the entire VOC generation. Without them the output is weaker but still viable; with them it's dramatically better.
4. **Demographics are contextual, not universal.** The LLM asks for demographics that matter for this specific segment, not a fixed checklist. Orientation matters for Attitude magazine's audience; it doesn't for an NYT target profile. Forcing irrelevant demographics distorts downstream targeting.
5. **Generate once, edit forever.** No regeneration button. The output saves directly and the user edits in the detail view. This prevents "regeneration mashing" by users who don't actually know enough about their audience — the friction of editing specific fields is productive friction.

## Use cases

### UC-1: Generate a new audience segment (primary)
- **Who:** Ellie (or future users), from the audience segments list page
- **When:** Building out brand strategy, needs a new segment profile
- **Trigger:** Click "New segment" → modal opens → "Answer questions" path (already exists as the active path)
- **Outcome:** Full segment record saved to DB, user redirected to detail view

### UC-2: Generate with existing knowledge (future — out of scope)
- **Who:** Ellie
- **When:** Has source documents (transcripts, research) that describe an audience
- **Trigger:** "Generate from document" path in creation modal (currently stubbed)
- **Outcome:** LLM reads source material + business context, generates segment
- **Note:** This is UX-02 in the backlog. The generation prompt and pipeline built here will be reusable.

### UC-3: Refresh/evolve an existing segment (future — out of scope)
- **Who:** Ellie
- **When:** Understanding of an audience has evolved, wants to update the segment with new insight
- **Trigger:** Button on segment detail view
- **Outcome:** Conversational flow that takes the existing segment as a starting point and regenerates with updated understanding. Overlap with the original is expected and intentional (unlike UC-1 which differentiates from existing segments).
- **Note:** Different from UC-1 — this is "update my understanding" not "create a new audience". Closer to SKL-07 feature-update. Brief separately when ready.

## User journey

### Step 1: Role context (required)
Modal opens. Single text area:
- **Label:** "Who is this segment?"
- **Helper text:** "Their role, what they do, who they serve, how they relate to your work"
- **Placeholder:** e.g. "A founder of a £1-5m B2B services company who needs to reposition before their next growth phase"
- **Validation:** Must be non-empty. This is the only hard gate.

User clicks "Next →"

### Step 2: Core problem (optional but prompted)
- **Label:** "What's their single biggest problem — in relation to your work?"
- **Helper text:** "In their own words, not clinical language. This anchors the entire profile."
- **Placeholder:** e.g. "They've invested in brand strategy twice and neither time did it translate into anything they could actually use day-to-day"

User can skip with "Skip — let the AI infer" link, or fill in and click "Next →"

### Step 3: Core desire (optional but prompted)
- **Label:** "What do they most want to achieve?"
- **Helper text:** "The thing they'd describe to a trusted peer, not what they'd put on a form."
- **Placeholder:** e.g. "A clear, distinctive position that makes the right clients come to them instead of chasing"

User can skip or fill in. Clicks "Generate segment"

### Step 4: LLM evaluation + optional follow-up
The system sends the user's inputs + business context to the LLM. The LLM evaluates whether it has enough to generate a high-quality profile. Two paths:

**Path A — Sufficient context (most cases):** LLM proceeds directly to generation. The modal shows a generating state (spinner, "Generating your segment profile... this takes about 30 seconds").

**Path B — LLM wants more:** The modal shows 1-2 targeted follow-up questions from the LLM. These are contextual — not a fixed list. Examples:
- "What industry or sector are they typically in?" (if role context was sector-ambiguous)
- "What's their business stage — early, established, scaling?" (if relevant to the business model)
- "Is age range important for this segment?" (only if the LLM judges it matters)

The user answers (free text) and clicks "Generate". The LLM does not ask more than 2 follow-up questions — if it still doesn't have enough, it generates with what it has.

### Step 5: Generation
Two parallel operations:

**Profile generation (LLM):**
- Generates: segmentName, personaName, summary, demographics (contextually relevant fields), psychographics (all 5 dimensions), roleContext (refined from user input), problems (20, categorised), desires (20, categorised), objections (10 with responses), sharedBeliefs (6 with doppelganger notes), avatarPrompt
- Model: Gemini Pro 3.1 (`MODELS.geminiPro`)
- Output: structured JSON matching the `dna_audience_segments` schema

**Avatar generation (image model, parallel):**
- Input: the `avatarPrompt` generated by the profile LLM
- Model: Gemini 3.1 Flash Image Preview (`gemini-3.1-flash-image-preview`) via Google AI SDK (already configured)
- Output: image uploaded to Vercel Blob at `avatars/segments/{segmentId}.png`, URL saved to `avatarUrl`
- Note: avatar generation can fail without blocking the segment save. If it fails, `avatarUrl` stays null and the detail view shows the existing placeholder.

### Step 6: Save + redirect
- Segment is saved to DB (all fields populated)
- Status: `active` (not `draft` — it's generated, not half-filled)
- Modal closes
- User is redirected to the detail view for the new segment
- Toast: "Segment created — review and edit as needed"

### Generating state UX
- Modal transitions to a full-modal generating state (replaces the form steps)
- Spinner + "Generating your segment profile..."
- "This takes about 30 seconds"
- "Don't close this tab"
- No cancel button (generation has already started; cancellation is complex and low-value for a 30s operation)

## Data model / fields

No new DB tables or columns. All output maps to existing `dna_audience_segments` columns (migration 0006).

**Generated fields (profile LLM):**

| Field | Source | Notes |
|---|---|---|
| `segmentName` | Generated | 2-4 word label. User provided segment name in old flow — now always generated. |
| `personaName` | Generated | Uncommon first name |
| `summary` | Generated | ~50 words starting "This audience..." — no segment/persona name in summary |
| `demographics` | Generated (contextual) | JSONB — only fields relevant to this segment. LLM fills what matters, leaves others null. |
| `psychographics` | Generated | JSONB — all 5 dimensions: personalityTraits, lifestyle, valuesAndWorldview, motivations, identity |
| `roleContext` | Refined from user input | LLM may expand/clarify the user's input |
| `problems` | Generated | Array of 20 `{ text, category }` objects. Categories: practical, emotional, psychological, social |
| `desires` | Generated | Array of 20 `{ text, category }` objects |
| `objections` | Generated | Array of 10 `{ objection, answer }` objects |
| `sharedBeliefs` | Generated | Array of 6 `{ text, notes }` objects. Notes contain doppelganger reasoning. |
| `avatarPrompt` | Generated | Starts with "Generate a raw, real-life, photorealistic studio shot of..." |

**Generated fields (image model):**

| Field | Source | Notes |
|---|---|---|
| `avatarUrl` | Image generation → Vercel Blob | Nullable. Stored at `avatars/segments/{segmentId}.png` |

**User-provided fields (inputs to generation):**

| Input | Maps to | Required |
|---|---|---|
| Role context | Used as seed for `roleContext` generation | Yes |
| Biggest problem | Injected into generation prompt as anchor | No |
| Biggest desire | Injected into generation prompt as anchor | No |
| Follow-up answers | Injected into generation prompt as additional context | No (only asked if LLM requests) |

## Context injection

The generation prompt receives the following business context automatically:

| Context | Source | How loaded |
|---|---|---|
| Business overview | `dna_business_overview` table | Load by brandId — vertical, specialism, business model, short/full description |
| Value proposition | `dna_value_proposition` table | Load by brandId — core statement, problem solved, unique mechanism, differentiators |
| Existing segments | `dna_audience_segments` table | Load all active segments for brandId — segment names + summaries. Used to differentiate the new segment. |

If business overview or value proposition don't exist yet, the LLM generates without them (weaker output but still functional). Existing segments being empty is fine — it just means no differentiation guidance.

## Generation prompt design

The generation prompt adapts the legacy prompt (`04-documentation/reference/legacy_prompts/audience_prompt.md`) with the following changes:

### Retained from legacy
- FBI profiler + brand strategist persona framing
- VOC generation methodology for problems (jobs-to-be-done, fears, impact on loved ones, frustration/cynicism, avoidance)
- VOC generation methodology for desires (magic wand, ambition, emotional impact, social perception)
- Objection generation methodology (resistance, alternatives, resource objections, sceptical mood)
- Objection response structure (surface, misunderstanding, psychological)
- Shared beliefs via doppelganger flip method (3 types: incompatible need, doesn't value approach, incompatible philosophy)
- Conversational language rule ("the way this persona would utter them verbally")
- Avatar prompt format ("Generate a raw, real-life, photorealistic studio shot of...")

### Added (not in legacy)
- **Psychographics generation** — 5 dimensions: personalityTraits, lifestyle, valuesAndWorldview, motivations, identity. Each is a 2-4 sentence description of that dimension for this specific person. Written as observation, not clinical assessment.
- **Category tagging** — problems and desires each get a category: practical, emotional, psychological, social. The legacy prompt mentioned these categories in the guidance but didn't require them on each item.
- **Differentiation instruction** — "The following audience segments already exist for this business: [names + summaries]. The segment you are creating must be meaningfully distinct from these."
- **Context injection block** — business overview + value proposition injected as structured context, not template variables

### Changed from legacy
- **Demographics are output, not input.** The legacy prompt received demographics as user-provided form fields. Now the LLM generates demographics based on the role context and any follow-up answers, filling only fields that are genuinely relevant.
- **Structured JSON output** — the legacy prompt used a loose array format. The new prompt specifies the exact JSON schema matching `dna_audience_segments`.
- **Biggest problem/desire as optional anchors** — the legacy prompt required a persona role as the primary input. The new prompt uses roleContext as the required input, with biggest problem and desire as optional but heavily weighted anchors.
- **Template variables replaced** — `${v.brandstrategy.Field}` etc. replaced with structured context injection from the actual DNA tables.

### Prompt structure (high-level)
```
[System message]
  - Role: brand strategist + FBI profiler persona
  - Task description
  - VOC methodology (problems, desires, objections, beliefs) — adapted from legacy
  - Psychographics generation instructions (NEW)
  - Language rules
  - Output schema (exact JSON structure)

[User message]
  - Business context block (from DNA tables)
  - Existing segments block (names + summaries, for differentiation)
  - User inputs (roleContext, biggest problem if provided, biggest desire if provided, follow-up answers if any)
```

The full prompt will be implemented in `lib/llm/prompts/audience-segment.ts` (new file). The prompt design pattern (system message + structured context injection + user inputs → JSON output) becomes the template for all DNA generation prompts.

## Update behaviour

This feature creates records. It does not update them. The generated segment is freely editable via the existing detail view (DNA-03). UC-3 (refresh/evolve) is a separate feature.

## Relationships

### Knowledge graph (FalkorDB)
Not in scope. Segments don't create graph nodes in this build.

### Postgres
- Writes to `dna_audience_segments` (existing table, no schema changes)
- Reads from `dna_business_overview`, `dna_value_proposition`, `dna_audience_segments` (for context injection)
- `avatarUrl` references Vercel Blob (existing `avatarUrl` column)

## Technical implementation notes

### API route
New route: `app/api/generate/audience-segment/route.ts`
- POST endpoint
- Accepts: `{ roleContext, biggestProblem?, biggestDesire?, followUpAnswers?, brandId }`
- Returns: `{ segmentId, avatarGenerating: boolean }`
- Saves segment to DB, triggers avatar generation as a background task
- If avatar generation completes before response, includes `avatarUrl`. Otherwise, avatar is written to DB async.

### Follow-up question evaluation
Before generation, a lightweight LLM call evaluates the inputs:
- Input: roleContext + biggestProblem + biggestDesire + business context
- Output: either `{ ready: true }` or `{ ready: false, questions: [string, string?] }`
- Model: `MODELS.geminiPro` (same model, fast evaluation)
- This is a separate, short call — not part of the main generation

### Image generation
- Provider: Gemini 3.1 Flash Image Preview (`gemini-3.1-flash-image-preview`) via `@ai-sdk/google` (already configured)
- No additional API key — uses existing `GOOGLE_GENERATIVE_AI_API_KEY`
- Resolution: 1K default (sufficient for avatar cards + detail view)
- Image uploaded to Vercel Blob at `avatars/segments/{segmentId}.png`
- If generation fails: log error, leave `avatarUrl` null, don't block segment save
- Avatar prompt follows legacy format: photorealistic studio shot, demographic accuracy, positive emotion, headshot (head and shoulders), eye-level
- Note: preview model — image quality may evolve. If portrait quality proves insufficient, DALL-E 3 is a fallback (OpenAI SDK already installed)

### Pattern for future DNA types
The following components are designed to be reusable:

| Component | Reuse scope |
|---|---|
| Modal step flow with skip/next | All DNA generation modals |
| LLM follow-up question evaluation step | All DNA types — different thresholds per type |
| Context injection (load DNA tables for prompt) | All generation prompts |
| Generation prompt structure (system + context + input → JSON) | All DNA types |
| Parallel image/asset generation | Any DNA type with visual output |
| "Generate → save → redirect to detail" flow | All DNA types |

## Edge cases

- **No business overview in DB:** Generate without it. Output will be less grounded but still usable. No error — just weaker context.
- **No value proposition in DB:** Same — generate without it.
- **First segment (no existing segments for differentiation):** No differentiation instruction in prompt. This is fine.
- **LLM returns malformed JSON:** Parse error → show error in modal: "Generation failed — please try again." Allow retry from the generating state (not from step 1). Log the raw response for debugging.
- **Avatar generation fails:** Segment saves successfully with `avatarUrl: null`. Detail view shows placeholder. No error toast — avatar is a nice-to-have.
- **Generation takes >60s:** The modal generating state handles this gracefully (no timeout on the UI side). Server-side: if the LLM call times out (provider-specific), return an error.
- **User closes modal during generation:** Generation continues server-side if it's already been submitted. Segment will appear in the list when the user returns. (If we want to prevent orphaned generations, we could add a `generating` status — but this is an edge case not worth the complexity for v1.)
- **Segment name conflicts:** Not enforced. Two segments can have the same name. The LLM is instructed to create distinct names, but if it doesn't, that's fine — the user can rename.

## Out of scope

- **Regeneration button** — by design. Edit in detail view instead.
- **Document upload path (UC-2)** — deferred. Generation prompt and pipeline are reusable when this is built.
- **Refresh/evolve existing segment (UC-3)** — separate feature. Noted as planned companion.
- **Streaming the generation output** — the full response is needed to save as a complete record. Streaming partial fields to the UI adds complexity without clear value since the operation is ~30s.
- **Custom model selection** — hardcoded to Gemini Pro for now. Can be made configurable later.
- **Graph node creation for the generated segment** — deferred to when graph-segment linking is designed.
- **Prompt versioning / prompt management UI** — the prompt lives in code. If prompt iteration becomes frequent, a management layer can be added later.

## Open questions / TBDs

None — all decisions resolved.

## Dependencies

| Dependency | Status | Blocking? |
|---|---|---|
| DNA-03 (audience segments CRUD + UI) | done | No |
| DNA-01 (DNA schema — audience segments table) | done | No |
| INF-06 (LLM integration — Gemini Pro configured) | done | No |
| INF-04 (Vercel Blob for avatar storage) | done | No |
| `dna_business_overview` data in DB | Needed for quality, not for function | No — generates without it |
| `dna_value_proposition` data in DB | Needed for quality, not for function | No — generates without it |
| `GOOGLE_GENERATIVE_AI_API_KEY` (for avatar image gen) | Already configured | Soft — segment generates without avatar |

## Decisions log

- 2026-04-20: Brief approved. Gemini Pro 3.1 for profile generation, Gemini 3.1 Flash Image Preview for avatar generation. No regeneration by design. Establishes pattern for all DNA generation (GEN-PROMPTS-01).
