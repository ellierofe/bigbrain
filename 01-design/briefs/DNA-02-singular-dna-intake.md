# Singular DNA Intake Design
Feature ID: DNA-02
Status: draft
Last updated: 2026-04-20

## Summary

This document captures the conversational intake flows for the three singular DNA types: business overview, brand meaning, and value proposition. These flows were refined through a live session populating NicelyPut's DNA — the patterns here are tested, not theoretical.

Singular DNA types are fundamentally different from plural types (audience segments, offers, etc.):
- One record per brand, not a list
- Populated once, updated occasionally
- The fields are deeply interdependent — vision informs mission informs purpose; value proposition references business overview and brand meaning
- The hardest part isn't data entry — it's helping the user think clearly enough to write the fields

The intake flows below are designed to be implemented as guided, conversational UI — not as blank forms. The system asks questions, reflects back understanding, and drafts field content collaboratively. The user approves or corrects at each stage.

---

## Sequencing

These three types should be populated in order:

1. **Business overview** — factual foundation, everything references it
2. **Brand meaning** — vision, mission, purpose, values (the "why")
3. **Value proposition** — the external promise (the "what and for whom")

The UI should guide users through this sequence. If brand meaning is empty and the user tries to start value proposition, the system should suggest completing brand meaning first (soft gate, not hard block).

---

## Flow 1: Business Overview

### Nature of the task
Mostly factual. The user knows these answers — the challenge is completeness, not clarity. Only `fullDescription` requires generative assistance.

### Intake structure

**Stage 1 — Direct questions (form-like, grouped)**

Group A — Identity:
- Business name (trading name)
- Legal name (if different)
- Owner name
- Vertical / sector
- Specialism (what specifically within that vertical)
- Business model

Group B — Context:
- Founding year
- Founder names
- Geographic focus
- Stage (with a prompt: "How would you describe where the business is right now?")

Group C — Links:
- Website URL
- Primary email
- Social handles (LinkedIn, X, Instagram, etc.)

Group D — Descriptions:
- Short description (1-2 sentences, with guidance: "This gets injected into every AI prompt as context. Not marketing copy — what should the system always know about your business?")
- Full description (see Stage 2)

**Stage 2 — Collaborative drafting (fullDescription only)**

The short description is usually manageable as a direct write. The full description is harder — most founders struggle to write about themselves objectively.

Flow:
1. System reviews everything entered so far
2. System drafts a fullDescription based on the factual fields + short description
3. User reviews, corrects, approves

**Design note:** The draft should read as factual context for an AI system, not as marketing copy or an About page. Tone: third-person, informative, specific.

### Fields populated
All fields in `dna_business_overview`. See schema: `01-design/schemas/dna-business-overview.md`.

---

## Flow 2: Brand Meaning

### Nature of the task
This is the hardest intake. Vision/mission/purpose statements feel high-stakes and abstract. Most founders freeze when asked to write them directly. The key insight: **ask about the problem and the future first, draft the statements last.**

### Intake structure

**Stage 1 — The problem in the world**

Don't ask "what's your mission?" Ask:

> "What's the thing you see happening in your industry that frustrates you or that you think is broken? The thing that made you start doing this?"

This is deliberately open-ended. The goal is to get the founder talking about what they care about without the pressure of writing a formal statement. Let them ramble.

System then **reflects back the layers** it heard:
- The core problem
- Different modes or manifestations of it
- What the founder does about it

The founder corrects. This builds shared understanding before any drafting happens.

**Stage 2 — The future**

> "If your business really succeeds — not just commercially but in terms of impact — what's different in the world?"

Again, open-ended. Don't ask "what's your vision?" — ask what the future looks like. The vision statement gets synthesised from this, not written directly.

Allow follow-up and expansion. The first answer is rarely the full picture — probe for the systemic layer behind the immediate answer.

**Stage 3 — Values through behaviour**

> "When you think about the work you're proudest of, or the moments where you think 'yes, this is what I'm supposed to be doing' — what's happening in those moments?"

And the flip side:

> "When something feels wrong in a client engagement or in how someone else in your space operates — what's the thing that bothers you?"

Then filter the raw material:
- **Values are actions, not adjectives.** "We value integrity" is useless. "We challenge founders on commercial logic before we help them present it" is a value expressed as behaviour.
- **Separate personal convictions from business values.** The founder's worldview matters but not everything belongs in the brand record. Filter for: does this shape how the business operates and how work gets done?

System reflects back candidate values as action statements — each with:
- Name (short phrase)
- Description (what it means in practice)
- Behaviours (2-4 specific commitments that manifest it)

Founder confirms, adjusts, or removes. Cap at 6 values.

**Stage 4 — Draft statements**

Only after Stages 1-3 are complete, the system drafts:
- **Vision** — synthesised from Stage 2 (the future)
- **Mission** — synthesised from Stage 1 (the problem) + what the business does about it
- **Purpose** — the bridge between the two: why this work matters beyond commercial return

Present all three together so the founder can see coherence. Adjust individually.

**Stage 5 — Review and save**

Full record displayed: vision, mission, purpose, all values with behaviours. One confirmation to save.

### Key design principles for this flow
- **Never start with the statement.** Start with the raw thinking. Statements are synthesis, not starting points.
- **Reflect before drafting.** The system summarises what it heard at each stage. The founder corrects the understanding, not the wording.
- **Allow imposter syndrome.** Founders will undersell themselves, especially on values and differentiation. The system should note evidence (e.g. from testimonials or previous answers) that contradicts self-deprecation, without being pushy.
- **Separate the thinking from the writing.** Most founders can talk about what they care about fluently. They freeze when asked to write a mission statement. The flow keeps them talking and does the writing for them.

### Fields populated
All fields in `dna_brand_meaning`. See schema: `01-design/schemas/dna-brand-meaning.md`.

---

## Flow 3: Value Proposition

### Nature of the task
Externally-facing strategic positioning. Depends heavily on business overview (what the business is) and brand meaning (why it exists). The challenge: founders either undersell themselves or over-claim. Testimonials and evidence help ground the drafting.

### Intake structure

**Stage 1 — Outcome, not positioning**

> "When a client finishes working with you — what's actually different for them? Not the deliverable, but the real outcome. What can they do now that they couldn't before?"

This surfaces `outcomeDelivered` and often hints at `uniqueMechanism`. Let the founder talk — the first answer is usually the deliverable ("they have a better deck"), the real answer comes after a prompt ("but what does that actually change for them?").

**Stage 2 — Why you specifically**

> "There are other people who help with [what you do]. What's the thing that makes you the right person for [your specific audience]? What do you bring that a generalist doesn't?"

Allow imposter syndrome — it's normal and the real answers come through anyway. If the founder deflects ("I don't know if I'm better than anyone"), probe with:
- "What do you do differently in your process?"
- "What have clients told you they valued most?"
- "What do you see in competitors' work that you wouldn't do?"

**Stage 3 — The alternatives**

> "When a potential client is weighing up whether to work with you, what are they actually comparing you against?"

Suggest common alternatives based on the business overview (DIY, generalist agency, in-house hire, etc.) and ask the founder to respond to each honestly. The honest version is more useful than the sales version — it builds `alternativesAddressed` with real substance.

**Stage 4 — Evidence integration**

If testimonials or source documents exist in the system, surface relevant ones:
- "Here's what [client name] said about working with you: [quote]. Does this match how you'd describe the value?"

Testimonials often articulate the value proposition better than the founder can. Use them as mirrors, not just proof points.

**Stage 5 — Draft all fields together**

Present the full value proposition as one package:
- Core statement
- Target customer
- Problem solved
- Outcome delivered
- Unique mechanism
- Differentiators (3-6)
- Alternatives addressed
- Elevator pitch

Review as a coherent whole — individual fields should reinforce each other. The founder corrects specific claims (e.g. "can't promise X, can promise Y") rather than rewriting from scratch.

**Stage 6 — Review and save**

Final confirmation. One save.

### Key design principles for this flow
- **Start with outcome, not positioning language.** "What changes for your clients?" not "What's your value proposition?"
- **Use evidence.** Testimonials, client feedback, and previous answers are more reliable than the founder's self-assessment in the moment.
- **Allow honest differentiation.** "I don't know if I'm better" is a valid starting point. The process surfaces the differentiation through specific questions about process, client feedback, and competitor gaps.
- **Draft as a package, correct in specifics.** Don't iterate field by field. Present the whole thing and let the founder flag what's wrong. "Can't promise funded faster, can promise they'll spend less time on it" is a better correction mode than rewriting the core statement from scratch.
- **Respect the dependency chain.** Value proposition references business overview and brand meaning. If those are empty, the system should surface that and suggest completing them first.

### Fields populated
All fields in `dna_value_proposition`. See schema: `01-design/schemas/dna-value-proposition.md`.

---

## Implementation notes

### Conversation engine
These flows require a conversational interface — not a traditional form wizard. The system needs to:
1. Ask open-ended questions and accept free-text (potentially voice-transcribed) responses
2. Summarise and reflect back understanding
3. Draft structured field content from unstructured input
4. Present drafts for approval with specific correction capability

This maps naturally to a chat-like interface with structured output stages. The LLM handles steps 1-3; the UI handles step 4 with editable field previews.

### Relationship to OUT-01 (chat interface)
The DNA intake flows could be implemented as:
- **Standalone guided flows** — dedicated UI per DNA type with a built-in conversational component
- **Chat recipes** — structured sequences triggered from the chat interface (OUT-01a)
- **Hybrid** — chat-driven conversation with structured review/approval panels

Decision deferred to layout design phase. The intake design here is UI-agnostic — it specifies the question flow and drafting logic, not the component architecture.

### Voice input
Several founders (including Ellie) find it easier to talk than type for these questions. Voice transcription (INP-02 / IDEA-02) would significantly improve the intake experience. Not a hard dependency but a strong nice-to-have.

### Progressive population
Not all fields need to be filled in one session. The system should:
- Save progress at any stage
- Show which stages are complete vs pending
- Allow re-entry at any stage
- Allow direct field editing after initial population (bypass the guided flow for updates)

---

## UI Entry Points

Each singular DNA page needs two action buttons:

### Generate (first-time population)
- Shown when the DNA record is empty or has only placeholder data
- Launches the relevant conversational intake flow (Flow 1/2/3 above)
- Progressive — saves at each stage, allows re-entry
- On completion, populates all fields and sets status to 'active'

### Refresh / Review (re-run with context)
- Shown when the DNA record already has substantive content
- Re-runs the conversational flow but with existing data as context:
  - The system shows current field values as a starting point
  - Asks focused questions: "Has anything changed about [X]?" / "Is this still accurate?"
  - Surfaces new evidence (recent inputs, testimonials, source docs added since last review) that might warrant updates
  - Drafts updated fields where changes are needed, preserving unchanged content
- The review flow should be lighter than the initial generate — skip stages where nothing has changed
- On completion, increments version and updates `updatedAt`

### Implementation pattern
The generation UX pattern is being established first on **DNA-03 (Audience Segments)** — the plural DNA generation flow. The singular DNA generate/refresh buttons should reference that implementation as the baseline pattern and adapt it for the singular case (single record, no creation modal, in-page flow rather than modal-triggered).

### Dependency awareness
- Business overview should always be populatable (it's the foundation)
- Brand meaning generate/refresh should surface a soft prompt if business overview is empty: "Your business overview isn't filled in yet — completing it first will produce better results"
- Value proposition generate/refresh should check both business overview and brand meaning, same soft prompt pattern

---

## Decisions log

- 2026-04-20: Flows designed and tested via live session populating NicelyPut DNA. Business overview, brand meaning, and value proposition all populated using these flows. Key learning: asking about the problem before the mission, and values through behaviour rather than adjectives, produced dramatically better results than direct "write your mission statement" prompts.
- 2026-04-20: Brand meaning flow confirmed as the hardest — 4-stage conversational approach is necessary. Direct form entry would produce generic, unusable statements.
- 2026-04-20: Value proposition flow confirmed: imposter syndrome is normal and productive if the system probes through it rather than accepting the first deflection. Testimonials are critical evidence.

---

## Cross-build dependency: OUT-01c functional testing

OUT-01c (LLM database write tool) shipped code-complete on 2026-05-10 but its full end-to-end QA (UC-1: skill terminal save) is blocked on this build. DNA-02's brand-meaning skill is the first save-bearing skill — its `onComplete` hook calling `lib/db/writes/dna/brand-meaning.ts` is what closes OUT-01c's testing loop.

**When the DNA-02 brand-meaning skill lands and is exercisable end-to-end, run the full OUT-01c test plan:** [`00-project-management/2026-05-10-out01c-deferred-testing.md`](../../00-project-management/2026-05-10-out01c-deferred-testing.md). Pass means OUT-01c flips from `in-progress` → `done` (per the test plan's checklist).
