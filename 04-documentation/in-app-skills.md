# BigBrain In-App Skills (Recipes)

> These are skills the app itself exposes to the user — NOT development skills for building the app.
> Development skills live in `03-skills/skills-plan.md`.
> These are the spec for features OUT-01a (chat recipes) and feed into the content creator (OUT-02).
> Last updated: 2026-03-28 — DRAFT v0.1

---

## What an in-app skill is

An in-app skill is a structured, repeatable operation the app can run on your behalf, triggered from the chat interface or (in some cases) directly from the dashboard. The difference between a skill and a plain chat message:

- A skill has a **defined structure** — it knows what inputs to gather, what to retrieve, what to generate, and where to store the output
- A skill has **system prompts and context loading baked in** — it automatically pulls the right DNA elements, source knowledge, graph context
- A skill produces a **consistent output format** — you know what you're going to get
- A skill can be **invoked with parameters** — e.g. "run generate-linkedin-post for [audience segment] about [topic]"

Recipes are the mechanism that makes the app feel like it knows you, rather than a generic AI assistant.

---

## Human-in-the-loop design for in-app skills

The same gate principles from development skills apply here, but the context is different:

- **Hard gate** for anything that writes to permanent storage (DNA updates, source knowledge additions)
- **Soft gate** for content generation (you review before it's saved to the registry)
- **Autonomous** for retrieval, analysis, and insight generation (surfaces results, you decide what to do with them)

The key rule: **the app never silently updates your strategy or saves content you haven't seen.**

---

## Skill categories

### 1. Knowledge retrieval
Skills that query what you know and surface it in useful forms.

### 2. Strategy skills
Skills that work with Brand DNA — reviewing, drafting, updating.

### 3. Content creation skills
Skills that generate content using your DNA, source knowledge, and research.

### 4. Input processing skills
Skills that process incoming material into the knowledge system.

### 5. Self-development skills
Skills that analyse patterns in your work, thinking, and growth.

---

## 1. Knowledge retrieval skills

### `know-about`
> "What do I know about [topic]?"

**Purpose:** Retrieve everything in the system related to a topic or question. Combines graph traversal, vector search, and structured queries.

**Inputs:** Topic, question, or concept (free text)

**Process:**
1. Runs semantic search across all stored text
2. Traverses graph for related nodes
3. Queries structured data (DNA elements, source knowledge) for matches
4. Synthesises results into a coherent summary: what you know, where it came from, connections you might not have noticed
5. Surfaces source references for everything

**Output:** A structured response with:
- Direct answer / summary
- Connected concepts and how they relate
- Source references (graph nodes, documents, transcripts)
- Suggested follow-up questions

**Gate type:** Autonomous — retrieval only, nothing is written

---

### `find-connections`
> "How does [X] connect to [Y]?" or "What connects [X]?"

**Purpose:** Surface non-obvious relationships in the knowledge graph.

**Inputs:** One or two topics/concepts

**Process:**
1. Identifies nodes for X (and Y if provided)
2. Runs graph traversal to find paths between them
3. Runs semantic search for conceptually similar content that might not be explicitly linked
4. Returns: direct connections, indirect paths (X → Z → Y), suggested connections (semantically similar but not yet linked)

**Output:** Connection map with explanation of each link and its source

**Gate type:** Autonomous — retrieval only

---

### `research-brief`
> "Brief me on [topic] from what I know"

**Purpose:** Produce a structured briefing document on a topic using only the knowledge already in the system. Useful before a client meeting, a piece of writing, or starting a new research push.

**Inputs:** Topic

**Process:**
1. Full retrieval sweep on the topic
2. Structures into: what you know, key findings, connections to other areas, gaps (things you know you don't know), questions worth investigating

**Output:** A formatted briefing document, saved to the content registry (with provenance) if you choose

**Gate type:** Autonomous generation, soft gate before saving

---

## 2. Strategy skills

### `review-dna`
> "Review my [DNA element]" or "How is my value proposition holding up?"

**Purpose:** Critically review a DNA element against recent inputs, research, and outputs. Surfaces drift, inconsistencies, or opportunities to strengthen.

**Inputs:** DNA element type (e.g. "value proposition", "audience segment: Founders")

**Process:**
1. Reads the current DNA element in full
2. Retrieves: recent transcripts and ideas mentioning this element, recent content that used it, any research that's relevant, how it's been described in different contexts
3. Analyses for: internal consistency, alignment with recent thinking, whether it still reflects reality, whether outputs using it landed well
4. Produces a review: what's working, what's drifted, what's worth reconsidering

**Output:** Review summary with specific observations. No changes made.

**Gate type:** Autonomous retrieval and analysis, no writes

---

### `draft-dna-update`
> "Update my positioning to reflect [new thinking]" or "My value prop needs to account for [X]"

**Purpose:** Draft an update to a DNA element based on new input, a conversation, or a review finding.

**Inputs:** Which DNA element, what the change is about (free text, voice note, or trigger from `review-dna`)

**Process:**
1. Reads current version of the DNA element (full text + version history)
2. Retrieves relevant context from knowledge graph and source knowledge
3. Drafts the updated version, showing clearly what's changing and why
4. Presents: current version | proposed version | diff | reasoning

**Output:** Draft update for review

**Gate type:** Hard gate — you must explicitly approve before the DNA element is updated. Approved changes are versioned, not overwritten.

---

### `strategy-snapshot`
> "Give me a strategy snapshot" or "Where am I strategically?"

**Purpose:** A high-level view of the current state of all your DNA — what's complete, what's a draft, what's empty, what hasn't been updated recently, where there are internal inconsistencies.

**Inputs:** None required

**Process:**
1. Reads all DNA elements and their metadata (completeness, last updated, version count)
2. Checks for internal consistency across elements (does your positioning conflict with your audience segments? do your content pillars align with your methodologies?)
3. Checks recency — flags elements that haven't been reviewed in a while
4. Produces an overview: health of each element, flags to address, suggested priorities

**Output:** Strategy health dashboard (formatted for chat or a shareable document)

**Gate type:** Autonomous analysis, no writes

---

### `audience-deep-dive`
> "Tell me everything about [audience segment]"

**Purpose:** Full profile of an audience segment, enriched with everything the system knows — research, voice of customer, how your offers relate to them, content that has resonated.

**Inputs:** Audience segment name

**Process:**
1. Reads the audience segment DNA entry
2. Retrieves: any transcripts or ideas mentioning this segment, research related to their context, testimonials from this segment type, content created for them, offer elements most relevant to them
3. Synthesises into a rich profile

**Output:** Comprehensive audience brief. Option to update the DNA element with new findings.

**Gate type:** Autonomous retrieval, hard gate if any DNA updates are suggested

---

## 3. Content creation skills

### `generate-post`
> "Write a LinkedIn post about [topic] for [audience]"

**Purpose:** Generate a single social media post with full DNA context applied.

**Inputs:** Platform, topic or angle, audience segment (optional — defaults to primary), content pillar (optional — system infers)

**Process:**
1. Reads: tone of voice parameters and samples, relevant audience segment profile, relevant content pillar(s), any source knowledge relevant to the topic
2. Retrieves: relevant knowledge graph nodes on the topic (for substance), recent transcripts with relevant thinking (for authenticity)
3. Generates post with platform constraints applied (character limits, format conventions)
4. Presents post with: the DNA elements used, source knowledge referenced, the graph context that informed it

**Output:** Draft post with provenance trail

**Gate type:** Soft gate — review before saving to content registry

---

### `generate-content-series`
> "Create a content series on [topic] for [platform]"

**Purpose:** Generate a set of related posts that build on each other, covering a topic from multiple angles.

**Inputs:** Topic, platform, number of posts (or "suggest"), audience segment

**Process:**
1. Retrieves: all relevant knowledge on the topic (graph + vector)
2. Plans the series: different angles, formats, entry points, a narrative arc if appropriate
3. **Soft gate:** Presents the series plan before generating individual posts. You confirm the plan.
4. Generates each post in sequence, tone of voice applied throughout
5. Ensures series has variety (not all the same format or angle)

**Output:** Series plan + individual draft posts, linked in the content registry

**Gate type:** Soft gate on plan, soft gate on final review

---

### `generate-longform`
> "Write a Substack post on [topic]" or "Draft a lead magnet on [topic]"

**Purpose:** Generate a long-form piece of content (article, newsletter, guide, lead magnet).

**Inputs:** Format, topic, audience, desired outcome (inform / persuade / convert / build trust)

**Process:**
1. Full knowledge retrieval on topic
2. Reads relevant DNA: audience segment, content pillars, tone of voice, relevant offer (if converting), methodology (if teaching)
3. Produces outline: structure, sections, key points per section, estimated length
4. **Soft gate:** You review and approve the outline. Can add/remove/reorder sections.
5. Generates section by section
6. **Soft gate after each section** (for longer pieces) or **after complete draft** (for shorter pieces)
7. Final assembly with formatting

**Output:** Complete draft, saved with full provenance

**Gate type:** Soft gate on outline, soft gate on draft

---

### `generate-sales-page`
> "Write a sales page for [offer]"

**Purpose:** Generate a complete sales page by composing the relevant DNA elements into persuasive copy.

**Inputs:** Offer name

**Process:**
1. Reads: the offer DNA entry (features, benefits, positioning), relevant audience segment(s), value proposition, tone of voice, any testimonials from source knowledge relevant to this offer, methodology underlying the offer
2. Follows a proven sales page structure (above the fold, problem, solution, offer, proof, objections, CTA) and maps DNA elements to each section
3. Generates each section
4. **Soft gate:** Review complete draft

**Output:** Full sales page copy, structured in sections, saved with provenance

**Gate type:** Soft gate on draft

---

### `repurpose-content`
> "Repurpose [existing piece] for [platform/format]"

**Purpose:** Adapt an existing piece of content to a new platform or format without losing the substance.

**Inputs:** Content registry reference, target platform/format

**Process:**
1. Reads the original content and its provenance (which DNA, which source knowledge, which graph context)
2. Applies platform constraints and format conventions
3. Adapts — doesn't just shrink. A newsletter article becoming a LinkedIn post needs a different structure, not just fewer words.
4. Marks the repurposed piece as derived from the original in the content registry

**Output:** Repurposed draft with link back to original

**Gate type:** Soft gate

---

## 4. Input processing skills

### `process-transcript`
> "Process this Krisp transcript"

**Purpose:** Extract ideas, topics, actions, and insights from a Krisp transcript and route them into the system.

**Inputs:** Transcript (paste, file, or from inbox)

**Process:**
1. Parses transcript — identifies speakers where possible, timestamps key moments
2. Extracts:
   - Ideas (things worth developing further)
   - Topics (subject areas that came up)
   - People/organisations mentioned
   - Decisions made
   - Action items
   - Insights (things that reframe existing thinking)
   - Potential DNA updates (things that suggest your strategy should evolve)
3. **Soft gate:** Presents extraction summary — "I found 5 ideas, 3 topics, 2 actions, 1 potential strategy flag. Here they are. Does this look right?"
4. On confirmation: writes ideas to the inbox, links graph nodes, generates embeddings, saves original transcript to file storage
5. Potential DNA updates go to the inbox as draft suggestions (not applied automatically)

**Output:** Extraction summary, items routed to inbox

**Gate type:** Soft gate on extraction, hard gate on any DNA suggestions

---

### `process-document`
> "Process this document" (research PDF, book summary, article, etc.)

**Purpose:** Extract and route knowledge from a document into the system.

**Inputs:** Document (file upload, URL, or paste)

**Process:**
1. Reads/parses document, identifies type (research paper, book summary, article, your own writing, data)
2. Extracts:
   - Key findings or arguments
   - Data points / statistics worth keeping
   - Frameworks or concepts introduced
   - People/organisations/topics mentioned
   - Connections to existing knowledge in the graph
3. **Soft gate:** Summary of what was found — "This document covers [X]. I found [N] key findings, [N] data points, and connections to [existing topics]. Here's a summary. Does this look right?"
4. On confirmation: creates graph nodes, links to existing nodes, generates embeddings

**Output:** Extraction summary, knowledge routed to graph + vector store

**Gate type:** Soft gate on extraction

---

### `capture-idea`
> Quick capture — voice, text, or paste

**Purpose:** Zero-friction capture of an idea or observation. Process later.

**Inputs:** Free text, voice note, or paste

**Process:**
1. Saves the raw content immediately — no processing, no questions
2. Creates an inbox item tagged "to triage"
3. Returns immediately: "Captured."

**Output:** Item in inbox

**Gate type:** None — capture is autonomous and instant by design

---

### `triage-inbox`
> "Let's triage my inbox"

**Purpose:** Work through the inbox together — classify, tag, link, promote, or discard items.

**Inputs:** None required (reviews current inbox)

**Process:**
1. Shows inbox items in batches (5 at a time by default)
2. For each item, model suggests: what type it is, what topics it relates to, what action to take (promote to graph / save as source knowledge / link to DNA element / discard / defer)
3. **Human decides** on each item — accept the suggestion or override
4. Items are processed according to the decision
5. Nothing happens to an item without the human's explicit choice

**Output:** Inbox cleared (or partially cleared), items routed to correct storage

**Gate type:** Human-in-the-loop for every item — this skill exists specifically to be a human gate

---

## 5. Self-development skills

### `weekly-review`
> "Run my weekly review"

**Purpose:** A structured weekly reflection drawing on transcripts, actions, and patterns from the past week.

**Inputs:** None required (uses date range automatically)

**Process:**
1. Retrieves: all transcripts and inputs from the past 7 days, actions captured, ideas generated, content published, strategy updates made
2. Analyses:
   - What themes came up most?
   - What actions were captured — which are done, which are outstanding?
   - What were the high-energy moments (where did the thinking feel most alive)?
   - What friction points appeared?
   - How does this week connect to current strategic priorities?
3. Produces a weekly review document

**Output:** Weekly review, saved to a dedicated review section in the knowledge base

**Gate type:** Autonomous generation, soft gate before saving

---

### `growth-patterns`
> "What patterns are emerging in my thinking/work?"

**Purpose:** Look across a longer time horizon (month, quarter) to surface recurring themes, evolving ideas, and shifts in focus.

**Inputs:** Time range (optional — defaults to last 30 days)

**Process:**
1. Retrieves all inputs and outputs for the period
2. Clusters by theme and identifies:
   - Topics getting more attention over time
   - Ideas that recur (may be worth developing further)
   - Areas that haven't had attention (possible neglect or intentional deprioritisation)
   - Tension between different areas of thinking
3. Produces a pattern analysis

**Output:** Pattern analysis with examples and suggestions

**Gate type:** Autonomous analysis, no writes

---

### `methodology-review`
> "How is [methodology] holding up across projects?"

**Purpose:** Review how a specific methodology is performing in practice — based on how it's appeared in transcripts, notes, and client work.

**Inputs:** Methodology name

**Process:**
1. Reads the methodology DNA entry
2. Retrieves: all transcripts and notes where this methodology came up, any client project outputs that used it, any friction or challenges noted
3. Identifies: where it worked well, where it fractured, what adaptations were made, whether the current DNA entry reflects reality
4. Produces: a review summary with observations and suggestions for the DNA entry

**Output:** Review summary. Option to trigger `draft-dna-update` for the methodology.

**Gate type:** Autonomous analysis, hard gate if DNA update is triggered

---

## Skill extension pattern

When adding new in-app skills:
1. Define the skill here (purpose, inputs, process, output, gate type)
2. Add to the appropriate category
3. Add to the `feature-request` flow to get it into the backlog as part of OUT-01a
4. When implementing: the skill definition here IS the spec — build to this document

Skills can call other skills. E.g. `weekly-review` may call `capture-idea` internally. `draft-dna-update` may be triggered by `review-dna` or `methodology-review`.
