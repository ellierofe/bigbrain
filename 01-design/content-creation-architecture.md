# Content Creation Architecture

> Pre-brief design doc. Maps the legacy Wized/Xano content creation system, identifies what we keep / change / kill, and locks the V1 architecture before OUT-02 brief is written.
>
> Status: draft
> Last updated: 2026-04-26
> Authors: Ellie + Claude

---

## Why this doc exists

The legacy "Moogul" content creation system in Wized + Xano was thorough and well thought-out. It contained ~140 content types, a centralised prompt fragment library, a four-stage cascading topic selector ("Infinite Prompt Engine"), a Strategy panel that adapted per content type, and a two-step blueprint→copy flow for long-form. Three years of working on it produced strong taste about what works.

We don't want to replicate it 1:1 — the model landscape, the stack, and the surrounding system have all changed. But we do want to absorb the design intelligence baked into it, then improve specifically where the new stack makes new things easy.

This doc:
1. Maps the legacy system at a structural level (so future chat contexts understand it without re-explanation).
2. Defines the eight-layer prompt model that replaces the legacy 8-slot structure.
3. Catalogues the Topic Engine cascade against the BigBrain schema (the seed spec for `topic_paths`).
4. Names what we keep, change, and kill.
5. Splits scope between **OUT-02** (single-step, V1) and **OUT-02a** (two-step long-form, V2).
6–9. Data model, worked example, open questions, locked decisions.

---

## Part 1: The legacy system, mapped

### 1.1 Content types as monolithic rows

`Content Creation Live Data.csv` — 140+ rows, each a single content type. Every row carries:

**Identity & catalogue metadata**
- `Content_Name`, `Slug`, `output_name`, `content_icon`, `content_desc`, `Time_saved`
- `Content_types` (categorical — e.g. "Sales", "Email", "Social", "Long form"), `Platform`, `social_platform`, `SEO`, `customer_journey`, `creator_case`, `story_panel`
- `Current` (active/inactive flag), `hidden`

**Behaviour flags**
- `topic_bar` (whether the Infinite Prompt Engine cascade applies)
- `strategy` (which Strategy panel fields show)
- `offer`, `sales` (whether offer selection is required/shown)
- `prerequisites` (jsonb object — what must exist before unlocking the content type in the picker). Shape: `{ channels: string[]; lead_magnets: string[]; dna: string[] }`. Channel/lead-magnet vocabulary follows `04-documentation/reference/channel-taxonomy.md` (DNA-07b). Example: `{ channels: ["blog"], lead_magnets: [], dna: ["tov", "audience", "brand"] }`.

**Prompt assembly slots (the meat)**
- `primer` — opening framing (e.g. "You are an experienced content marketing strategist...")
- `background` — context block (typically with `${business_context_short}` template literals)
- `briefing_notes_two` — additional briefing layer
- `copywriting` — core copywriting instructions
- `second_primer` — secondary framing/persona shift
- `page_structure` — the **structural skeleton** (sections, order, intent — this is the hand-tuned part)
- `instructions` — generation instructions
- `structure_recap` — final reinforcement of structure
- `rag_prompt` — retrieval augmentation prompt
- `tov_sample` — which ToV sample category to inject (e.g. "blog", "email", "social")

**Generation controls**
- `numshots` — number of variants to generate (typically 5 for short-form)
- `min_tokens`, `max_tokens`, `character_limit`
- `literals` — array of template literals expected in the prompt
- `enrich_options` — additional context-injection options

**Key insight:** each row is a *self-contained prompt cocktail* with named slots. The slots are fixed (every type has a `primer`, `background`, etc.) but the *content* of each slot was hand-tuned per type.

### 1.2 Centralised prompts — the existing fragment library

`Centralised Prompt Data Live.csv` — 38 fragments, three kinds:

- **`copywriting` (24)** — shared craft directives. `hooks_social`, `hooks_email`, `headlines`, `subheadings`, `cadence`, `paragraphs`, `persuasive_sales`, etc. These are the "we always say it this way when writing this kind of thing" rules.
- **`context` (7)** — shared context blocks. Business context summaries, audience context summaries, etc.
- **`proofing` (7)** — shared QA rules. `banned_words`, formatting checks, banned phrases.

Each fragment has `name`, `purpose`, `content`. The `content` contains template literals (`${brand_name}`, `${voc_problems}`, `${offer_benefits}`).

**Key insight:** Ellie already had the fragment pattern. The 140 content type rows referenced or embedded these fragments. The skeleton-per-type + shared-craft model is the system that already worked — we're not inventing it, we're systematising it.

### 1.3 The Infinite Prompt Engine (topic bar)

A cascading 1–4 step selector for picking *what* the content is about. Defined in `topic-options.md` as Wized variables `topic1options` / `topic2options` / `topic3options`, plus a translation table (`topic options in topic bar.xlsx`) that maps each `(topic1, topic2, topic3)` combination → a literal sentence injected into the prompt context.

**Step 1 — DNA / source category** (always shown, options filtered by `v.item_counts`):
- An audience segment (if any segments exist)
- An offer (if any offers exist)
- A knowledge asset (if any methods exist)
- A lead magnet (if any magnets exist)
- A content pillar (if any pillars exist)
- A content platform (if any platforms exist + not creating a platform-content type)
- Brand meaning (if values/mission/vision/purpose populated)
- Brand proof (if testimonials/stats/case studies exist)
- Source material (if any sources exist)
- Free-text (always available — escape hatch)

**Step 2 — sub-category within step 1.** Examples:
- Audience → Pain points / Desires / Objections / Beliefs / Obstacles
- Offer → Outcomes / Benefits / Features / Bonuses / FAQs / Stats / Testimonials
- Brand meaning → Purpose / Vision / Mission / Values
- Brand proof → Testimonial / Stat / Case study

**Step 3 — specific item.** Either:
- A static refinement (e.g. for "Audience > Pain points": shows the actual list of pain points)
- A dynamic item (e.g. "Offer > [which offer?]" → the offer list)

**Step 4 — drilling further into a specific item.** Used when step 3 surfaces a category and step 4 surfaces the items within it. E.g. "Offer > Acme Course > Outcomes > [which outcome?]"

**Cascade logic:**
- Some content types skip steps because Strategy already answered them. E.g. an Instagram caption Strategy panel pre-selects target audience → topic bar starts at step 2 (skipping audience selection).
- Each step's options are computed live from the DB at the moment the previous step is selected.

**Translation to prompt:** the XLSX file is essentially a lookup table — for each combination of topic1+topic2+topic3, there's a literal sentence to inject:

> "This is about A product/service we offer, specifically [topic2chosen]. Please create content about this topic: Outcome: The tangible, positive changes or transformations that the offer creates/delivers. Most specifically, content should be about '[selected outcome]'"

### 1.4 The Strategy panel

Per content type, the Strategy panel surfaces different fields. Examples (from observation, not exhaustive):
- Instagram caption → Target audience selector + Customer journey stage
- Sales page → Target audience + Offer + CTA + (maybe) urgency/scarcity flags
- Blog post → Target audience + content pillar
- Email → Target audience + sequence stage

The Strategy selections are *both* UI gating (some answers determine what shows in the topic bar) *and* prompt context (they get injected into the system prompt).

### 1.5 Settings panel
- Model selection (override the default)
- Person override (1st singular vs 1st plural — overrides the ToV default per generation)
- Tone variation override (e.g. "more sassy this time")
- Number of variants (a.k.a. `numshots` — default per content type, override at generation)

### 1.6 Generation flow

**Single-step (short-form):**
1. User selects content type (lightspeed picker).
2. User answers Strategy + Topic Bar + Settings.
3. Wized sends to Xano with content type ID and all variables.
4. Xano: assembles prompt (concatenates `primer` + `background` + `briefing_notes_two` + `copywriting` + relevant centralised fragments + `page_structure` + `instructions` + `structure_recap`, resolving template literals against context data).
5. Xano calls the model (numshots times → 5 variants).
6. Stream returned to Wized → rendered as 5 variant cards.
7. User can: edit a variant in place, save to library (with auto-tagging from selections), open chat-on-variant, regenerate, discard.

**Two-step (long-form — sales pages, blog posts, web pages):**
1. Steps 1–3 same as above.
2. Stage A: generate **blueprint**. Xano assembles a blueprint prompt that asks for structure only — no copy. Model returns a structured outline: each section has (a) **section purpose** (e.g. "problem framing"), (b) **rationale** ("why I chose this angle"), (c) **messaging guidance** (what to say), (d) **provenance** (which DNA pieces feed it).
3. User reviews blueprint. In legacy: text-edit each section's details. (Limited — no reorder, no per-section regen.)
4. Stage B: generate **copy** from blueprint + original context. Single pass (in legacy).
5. Same library/chat/regen options as single-step.

### 1.7 Chat-on-artifact

Two distinct surfaces:

**(a) Inline chat on a generated variant.** Click a variant → modal opens *in the generation page*. The modal:
- Keeps the other variants accessible (you can switch between them).
- Has a context pane showing what the model knows (topic chain, strategy answers, the variant text itself).
- Lets you tweak/amend through chat.

**(b) Saved content as chat context.** In the main BigBrain chat, the context picker lets you select a saved library item as the subject ("let me chat about this saved blog post"). Parallel to selecting an offer or audience as context.

### 1.8 Library / content registry

Library items are *only* generations the user has explicitly saved. Saving:
- Auto-inherits the selections that drove it (audience, offer, topic chain).
- User adds: publish date, extra tags, platform, status.
- Becomes a first-class artifact in the registry — discoverable, chat-able, the basis for future "what have I shipped about X?" queries.

**Important:** unsaved generations are *not* in the library. They live in the generation/draft layer until saved or discarded. No junk in the registry.

### 1.9 Picker (lightspeed.html)

Filterable card grid of content types:
- Search by name
- Filter by `Content_types` (Sales, Email, Social, Long form, Brainstorm…)
- Filter by `Platform`
- Favourites
- Locked/unlocked (locked = prerequisites missing — DNA piece doesn't exist yet)
- Each card shows: icon, name, description, time_saved, locked/unlocked state

---

## Part 2: The eight-layer prompt model

After decomposing three legacy content types side-by-side (Instagram caption, Sales page AIDA, Brainstorm Podcast Episodes), the legacy CSV's eight prompt slots (`primer`, `background`, `briefing_notes_two`, `copywriting`, `second_primer`, `page_structure`, `instructions`, `structure_recap`) turned out to **conflate distinct things** and **mis-name others**. For example: `primer` mixed Persona + Worldview + multi-step flow declaration; `background` was sometimes brand orientation and sometimes a heavy topic-specific bundle; `structure_recap` wasn't a recap at all — it was the entire copy-stage prompt for two-step content.

The cleaner abstraction, derived from the legacy data, is **eight conceptual layers** that any prompt is composed from. Some layers are pure references to fragments. Some are configuration (which DNA bundles to pull). Some are hand-authored (the structural skeleton).

### The eight layers

| # | Layer | Role | Authoring mode | Typical source |
|---|---|---|---|---|
| 1 | **Persona** | Who the AI is for this task. The voice/expertise framing. | Reference to a fragment | Fragment library (`persona_social_copywriter`, `persona_direct_response`, `persona_strategist_owned_content`) |
| 2 | **Worldview** | Embedded principles about *what the content is for*. Can be empty. | Reference to a fragment, optional | Fragment library (`worldview_owned_content`, `worldview_sales_principles`) |
| 3 | **Task framing** | What we're producing right now and how many variants. Includes variant count. | Hand-authored per stage (short) | Stage-specific text |
| 4 | **Brand context** | Always-on orientation: business overview, ToV core, identity essentials. Same shape every prompt. | Reference to a fixed bundle | Bundle resolver (pulls from DNA tables) |
| 5 | **Topic context** | Per-content-type config: which DNA strands does *this* type weave in? Where the Topic Engine slots in. | Per-content-type configuration | Bundle resolver + Topic Engine output |
| 6 | **Structural skeleton** | The architecture of the output. The hand-tuned per-content-type bit. Can embed inline fragment refs. For two-step: blueprint scaffold or copy scaffold. | Hand-authored per stage (the heart of craft) | Stage row |
| 7 | **Craft directives** | Shared fragments for voice, formatting, technique. Three usage modes: list, inline, tiered. | List of fragment refs (with optional tiering) | Fragment library |
| 8 | **Output contract** | JSON shape, length constraints, no-fluff reminders, final-stage triggers. | Reference to a fragment + content-type extras | Fragment library + stage row |

### Why these eight, and not the legacy slots

- **Persona, Worldview, Task framing** were collapsed into legacy `primer` + `second_primer`. Splitting them is honest: they're three different things. A heavy persona can pair with no worldview (IG caption). A heavy worldview can pair with a flow-declaring persona (Sales AIDA). Task framing always changes per stage.
- **Brand context vs Topic context** was the biggest legacy conflation. Sales AIDA's `background` looked huge because it included the offer and VOC pulls — but those are *topic context*, not *brand orientation*. Once split, brand context is uniform across every content type (same bundle every time) and topic context becomes the per-content-type configurable bit.
- **Structural skeleton** stays the cleanest concept. Renamed for clarity. Embeds inline fragment refs (e.g. `${hooks_social}` inside the Hook section).
- **Craft directives** captures `copywriting` *and* the tiered fragment usage in `briefing_notes_two` *and* the inline refs scattered in `page_structure`. One layer, three usage modes.
- **Output contract** isolates `${json_five}`, character limits, `${no_fluff}`, and the "OK, now generate" trigger — the structural-output specification is its own thing.

### How the eight layers compose into a prompt

The assembler walks the layers in order and produces the final prompt. Pseudocode:

```
prompt =
  resolve(stage.persona_fragment_id) +
  resolve(stage.worldview_fragment_id, optional) +
  stage.task_framing +
  resolve_bundle('brand_context_v1') +
  resolve_topic_context(content_type.topic_context_config, generation_inputs) +
  resolve_skeleton(stage.structural_skeleton, generation_inputs) +
  resolve_craft(stage.craft_fragment_ids, generation_inputs) +
  resolve_output_contract(stage.output_contract_fragment_id, stage.output_contract_extras)
```

Where `resolve_*` handles placeholder substitution against the live data (DNA pulls, Topic Engine selections, Strategy answers, free-text augments).

### The three content types, mapped to the eight layers

| Layer | IG caption (id 30) | Sales AIDA (id 104) | Brainstorm Podcast (id 34) |
|---|---|---|---|
| 1. Persona | `persona_social_copywriter` (light) | `persona_direct_response` (heavy) | `persona_strategist_owned_content` (medium) |
| 2. Worldview | none | `worldview_sales_principles` | `worldview_owned_content` |
| 3. Task framing | "5 captions, brief, persuasive marketing" | Stage 1: "build the blueprint." Stage 2: "write the copy from the approved blueprint." | "10 episode ideas, strategy-aligned" |
| 4. Brand context | brand bundle | brand bundle | brand bundle |
| 5. Topic context | Topic Engine sentence | Offer details + offer VOCs (no Topic Engine — offer-driven) | Platform metadata + (optionally) Topic Engine sentence |
| 6. Structural skeleton | 3-section short skeleton (Hook → Detail → CTA) with embedded `${hooks_social}` and `${social_ctas}` | Stage 1: 16-section blueprint scaffold. Stage 2: 16-section copy guide with TECHNIQUE refs. | List output spec with rationale-per-item |
| 7. Craft directives | List: cadence, visual_formatting, empathy, apostrophe, experiential | Tiered: foundational (persuasive_sales, cadence, paragraphs, empathy, apostrophe, metaphors) + section-specific (headlines, subheadings, triple_stack_bullets, price_reframing, cta_zhuzz, pacing, experiential) | List: cadence, empathy, apostrophe |
| 8. Output contract | `json_five` + visual_formatting + no_fluff | Stage 1: blueprint JSON shape. Stage 2: freeform sections + final-stage trigger. | `json_ten` + visual_formatting + no_fluff |

This makes the per-type variation visible and explicit — and makes it obvious when two content types are essentially the same shape with different skeletons (most short-form social) versus genuinely different shapes (long-form sales).

---

## Part 3: Topic Engine cascade — BigBrain catalogue

The legacy Topic Engine cascade was tied to the Wized/Xano data model. The structure (1–4 step cascade, multi-select on item steps, free-text augment, live data) carries forward — but the *categories, sub-categories, and what each step actually surfaces* must be redesigned against the BigBrain schemas.

This section is the seed spec for `topic_paths`. It defines, per category, exactly:
- what step 1 surfaces and from which table
- what step 2 sub-categories exist and where they map in the schema
- what step 3 (and step 4 where applicable) surfaces
- the prompt template literal injected when the cascade reaches a leaf

### 3.1 Step 1 — categories (BigBrain V1)

Each category is gated by a "has data" check against the live DB. The free-text option is always present.

| Category | Source table(s) | Has-data check | Notes |
|---|---|---|---|
| **An audience segment** | `dna_audience_segments` | `count(*) where status='active' > 0` | Direct map. |
| **An offer** | `dna_offers` | `count(*) where status='active' > 0` | Direct map. |
| **A knowledge asset** | `dna_knowledge_assets` | `count(*) where status='active' > 0` | Includes all `kind` values (methodology / framework / process / tool / template). |
| **A content platform** | `dna_platforms` | `count(*) where is_active=true > 0` | Scoped: hidden if the content type being generated is itself a platform-content type (preserves legacy behaviour). |
| **Value proposition** | `dna_value_proposition` | `core_statement IS NOT NULL` | One row per brand. |
| **Brand meaning** | `dna_brand_meaning` | any of `vision`/`mission`/`purpose` is not null OR `values` jsonb is non-empty | One row per brand; sub-fields gate step 2 visibility. |
| **Brand proof** | `src_testimonials` ∪ `src_statistics` ∪ `src_stories` | `count(testimonials) + count(statistics) + count(stories) > 0` | Meta-category; step 2 splits into the three sources. |
| **Source material** | `src_source_documents` | `count(*) where is_archived=false > 0` | |
| **Own research** | `src_own_research` | `count(*) where is_archived=false > 0` | New (no legacy equivalent). |
| **A research mission** | `missions` | `count(*) > 0` | New (no legacy equivalent). |
| **An idea** | `ideas` | `count(*) where status='captured' > 0` | New (no legacy equivalent). Covers ideas + questions. |
| **Free-text** | n/a | always | Escape hatch. User types a topic. |

**Out of V1 (parked tables):**
- Lead magnets (DNA-08 parked)
- Content pillars (DNA-06 parked)

**Out of V1 (intentional editorial cuts):**
- Client projects — already pre-fill Strategy when generating *from* a project workspace, so duplicative as a Topic Engine category.
- Competitors — niche; revisit V2.

### 3.2 Per-category cascades

For each category below: step structure, surfaced items, prompt template.

The prompt template uses `${...}` placeholders the assembler fills from selections. `${selected}` = chosen item label/text. `${segment_name}` = parent entity's display name. Etc.

---

#### **An audience segment**

```
Step 1: An audience segment
Step 2: which segment? → dna_audience_segments rows (label = segment_name)
Step 3: which aspect? → fixed list:
        - Problems (gated: segment.problems jsonb non-empty)
        - Desires (gated: segment.desires jsonb non-empty)
        - Objections (gated: segment.objections jsonb non-empty)
        - Beliefs (gated: segment.shared_beliefs jsonb non-empty — surfaced as "Beliefs")
Step 4: which item? → array items from the chosen jsonb field. Multi-select enabled.
```

**Prompt template (leaf):**
> This is about an audience segment — `${segment_name}` — specifically the `${aspect_label}` they hold. Most specifically: `${selected_items_joined}`.

Where `aspect_label` is "problems, worries or fears", "desires/needs", "objections", or "beliefs"; `selected_items_joined` is the array elements joined naturally (single → quoted; multiple → "X" and "Y"). 

**Step skip:** if the Strategy panel already pre-selected an audience segment, step 2 is skipped and the cascade starts at step 3.

---

#### **An offer**

```
Step 1: An offer
Step 2: which offer? → dna_offers rows (label = name)
Step 3: which aspect? → fixed list, gated by data presence on the chosen offer:
        - Outcomes (gated: dna_entity_outcomes where offerId = X AND kind='outcome' > 0)
        - Benefits (gated: same query, kind='benefit')
        - Features (gated: same query, kind='feature')
        - Bonuses (gated: same query, kind='bonus')
        - FAQs (gated: same query, kind='faq')
        - USP (gated: offer.usp IS NOT NULL — single item, no step 4)
        - Guarantee (gated: offer.guarantee IS NOT NULL — single item, no step 4)
        - Pricing (gated: offer.pricing IS NOT NULL — single item, no step 4)
        - CTA (gated: offer.cta IS NOT NULL — single item, no step 4)
        - Stats about this offer (gated: src_statistics where offerIds @> [X] > 0)
        - Testimonials about this offer (gated: src_testimonials where offerIds @> [X] > 0)
Step 4: which item? → varies by aspect:
        - For outcomes/benefits/features/bonuses/FAQs: dna_entity_outcomes rows. Multi-select.
        - For Stats: src_statistics rows. Multi-select.
        - For Testimonials: src_testimonials rows (label = clientName + truncated quote). Multi-select.
        - For USP/Guarantee/Pricing/CTA: no step 4 (single value on the offer).
```

**Prompt template (leaf, multi-step):**
> This is about an offer — `${offer_name}` — specifically the `${aspect_label}`. Most specifically: `${selected_items_joined}`.

**Prompt template (single-value aspect, e.g. USP):**
> This is about an offer — `${offer_name}` — specifically its `${aspect_label}`: `${value}`.

**Step skip:** if Strategy pre-selected an offer (e.g. Sales page AIDA), step 2 is skipped.

---

#### **A knowledge asset**

```
Step 1: A knowledge asset
Step 2: which asset? → dna_knowledge_assets rows (label = name; consider sub-grouping by `kind`)
Step 3: which aspect? → fixed list, gated by data presence on the chosen asset:
        - Overview (gated: asset.summary IS NOT NULL — single item, no step 4)
        - Philosophy (gated: asset.principles IS NOT NULL OR asset.origin IS NOT NULL — single item)
        - Process (gated: asset.flow jsonb non-empty OR asset.key_components jsonb non-empty — step 4 lists individual steps/components)
        - Goals (gated: asset.objectives IS NOT NULL — single item)
        - Outcomes (gated: dna_entity_outcomes where knowledgeAssetId = X AND kind='outcome' > 0)
        - Benefits (gated: same query, kind='benefit')
        - Advantages (gated: same query, kind='advantage')
        - Features (gated: same query, kind='feature')
        - FAQs (gated: same query, kind='faq')
        - Problems solved (gated: asset.problems_solved IS NOT NULL — single item)
        - Contexts (gated: asset.contexts IS NOT NULL — single item)
        - Stats about this asset (gated: src_statistics where methodologyIds @> [X] > 0)
Step 4: which item? → varies by aspect:
        - Process → individual flow steps or key_components items (multi-select).
        - Outcomes/Benefits/Advantages/Features/FAQs → dna_entity_outcomes rows. Multi-select.
        - Stats → src_statistics rows. Multi-select.
        - Single-value aspects → no step 4.
```

**Prompt template:** parallel structure to offer.

---

#### **A content platform**

```
Step 1: A content platform
Step 2: which platform? → dna_platforms rows (label = name)
Step 3: which aspect? → fixed list, gated by data presence:
        - Overview (gated: platform.primary_objective IS NOT NULL OR platform.audience IS NOT NULL — single item)
        - Topic / themes (gated: platform.content_pillar_themes IS NOT NULL OR platform.subtopic_ideas non-empty — step 4 lists subtopics)
        - Positioning (gated: platform.usp IS NOT NULL OR platform.content_strategy IS NOT NULL — single item)
        - Content formats (gated: platform.content_formats jsonb non-empty — step 4 lists individual formats)
Step 4: where applicable, individual subtopic / format / theme.
```

**Prompt template:**
> This is about a content platform — `${platform_name}` — specifically `${aspect_label}`. ${most specifically: ${selected_items_joined}.}

(Trailing "most specifically" clause appended only when step 4 produced selections.)

**Note:** Legacy "Episode/post" sub-category is dropped for V1 (no episode storage). Will surface from `library_items` filtered by platform tag once the library has content (V1.5 enhancement, not blocking).

---

#### **Value proposition**

```
Step 1: Value proposition
Step 2: which aspect? → fixed list, gated:
        - Core statement (gated: vp.core_statement IS NOT NULL)
        - Target customer (gated: vp.target_customer IS NOT NULL)
        - Problem solved (gated: vp.problem_solved IS NOT NULL)
        - Outcome delivered (gated: vp.outcome_delivered IS NOT NULL)
        - Unique mechanism (gated: vp.unique_mechanism IS NOT NULL)
        - Differentiators (gated: vp.differentiators array non-empty — step 3 lists them)
        - Elevator pitch (gated: vp.elevator_pitch IS NOT NULL)
Step 3: only for Differentiators — individual items (multi-select).
```

**Prompt template:**
> This is about the value proposition — specifically `${aspect_label}`: `${value_or_selected_items}`.

---

#### **Brand meaning**

```
Step 1: Brand meaning
Step 2: which aspect? → fixed list, gated:
        - Vision (gated: bm.vision IS NOT NULL)
        - Mission (gated: bm.mission IS NOT NULL)
        - Purpose (gated: bm.purpose IS NOT NULL)
        - Values (gated: bm.values jsonb non-empty — step 3 lists individual values)
Step 3: only for Values — individual values (multi-select).
```

**Prompt template:**
> This is about brand meaning — specifically `${aspect_label}`: `${value_or_selected_items}`.

---

#### **Brand proof** (meta-category)

```
Step 1: Brand proof
Step 2: which kind? → fixed list, gated:
        - A testimonial (gated: count(src_testimonials where is_archived=false) > 0)
        - A statistic (gated: count(src_statistics where is_archived=false) > 0)
        - A story / case study (gated: count(src_stories where is_archived=false) > 0)
Step 3: which item? → rows from the chosen table. Multi-select within kind.
        Filter chip: by `audienceSegmentIds` / `offerIds` if Strategy already pre-selected these.
```

**Prompt template (testimonial leaf):**
> This is about brand proof — specifically a testimonial from `${client_name}${client_company ? `, ${client_company}` : ''}`: "`${quote}`". `${result ? `Result: ${result}.` : ''}`

**Prompt template (statistic leaf):**
> This is about brand proof — specifically the statistic: "`${stat}`" (Source: `${source}${source_year ? `, ${source_year}` : ''}`).

**Prompt template (story leaf):**
> This is about brand proof — specifically the story "`${title}`" (`${type}`): `${narrative_or_summary}`.

---

#### **Source material**

```
Step 1: Source material
Step 2: which type? → distinct values of src_source_documents.type:
        - Transcript / Session note / Research / Voice note / Email / Document / etc.
        Each gated by count(*) of that type > 0.
Step 3: which document? → rows of that type (label = title). Multi-select.
```

**Picker UI extras (not cascade steps):** tag filter chip + date range filter inline in step 3 list. Tags / date are not cascade steps because they're cross-cutting filters, not refinement.

**Prompt template:**
> This is about source material — specifically the `${type}` titled "`${title}`"`${document_date ? ` (${document_date})` : ''}`: `${extracted_text_excerpt}`.

For multi-select: list all selected sources, then concatenate excerpts.

---

#### **Own research**

```
Step 1: Own research
Step 2: which research item? → src_own_research rows (label = title or short_label). Multi-select.
Step 3: which aspect? → fixed list, gated by data presence:
        - Summary (gated: research.summary IS NOT NULL — single item)
        - Methodology (gated: research.methodology IS NOT NULL — single item)
        - Key findings (gated: research.key_findings non-empty — step 4 lists individual findings)
Step 4: only for Key findings — individual findings (multi-select).
```

**Prompt template:**
> This is about own research — specifically `${aspect_label}` from "`${title}`": `${value_or_selected_items}`.

---

#### **A research mission**

```
Step 1: A research mission
Step 2: which mission? → missions rows (label = name). Filter chip: by phase.
Step 3: which aspect? → fixed list, gated:
        - Thesis (gated: mission.thesis IS NOT NULL — single item)
        - Verticals (gated: mission_verticals join non-empty — step 4 lists)
        - Linked statistics (gated: mission_stats join non-empty — step 4 lists)
        - Linked source inputs (gated: mission_inputs join non-empty — step 4 lists)
Step 4: where applicable, individual items (multi-select).
```

**Prompt template:**
> This is about a research mission — `${mission_name}` (phase: `${phase}`) — specifically `${aspect_label}`: `${value_or_selected_items}`.

---

#### **An idea**

```
Step 1: An idea
Step 2: which idea? → ideas rows where status='captured' (label = truncated text + type icon). Multi-select.
        Filter chip: by type (idea / question).
        (No further steps — the idea IS the topic.)
```

**Prompt template:**
> This is about a captured `${type}`: "`${idea_text}`".

For multi-select: "These captured `${type}s`: " + listed items.

---

#### **Free-text**

```
Step 1: Free-text
(No further steps — user types their topic in a textarea.)
```

**Prompt template:**
> The topic is: `${user_text}`.

---

### 3.3 Multi-select rules (recap)

- Multi-select is enabled at item-surfacing steps only (the leaf step that produces actual records — step 3 or 4, depending on category).
- Within the same category only — no mixing problems + desires.
- A single `${selected_items_joined}` placeholder handles 1 or N items. Single → quoted item; 2 → "X" and "Y"; 3+ → "X", "Y", and "Z".

### 3.4 Free-text augment rules (recap)

- A "+ add note" button appears at every step that has a selection.
- Augments are appended to the prompt as: `Additionally: ${user_augment_text}.`
- Multiple augments at different depths concatenate in step order.

### 3.5 "Adding items must be easy" — UX implication

A user who lands on the picker with thin data (e.g. only one offer, no testimonials yet) shouldn't hit dead ends in the cascade. When a category or sub-category is empty, the locked-card pattern from the picker generalises:

- **At step 1:** categories with no data are dimmed with a "+ Add `${category}`" inline link (e.g. "+ Add audience segment") that deeplinks to the relevant DNA page.
- **At step 2:** if the chosen entity has no data for any aspect, surface "+ Add data to this `${entity_type}`" with a deeplink.
- **At step 3/4:** if a sub-list is empty (e.g. an offer with no FAQs yet), the aspect option is greyed out with "+ Add `${aspect}` to this offer" inline.

This keeps the cascade honest about what's available without forcing the user to bounce out of the content creation flow blind.

### 3.6 `topic_paths` seed data shape

This catalogue translates into seed rows for `topic_paths`. Provisional shape per row:

```ts
{
  id: 'audience.segment.problems.item',  // dotted slug = full cascade path
  parent_id: 'audience.segment.problems',
  step_level: 4,                          // 1–4
  label: 'Problems',                      // user-facing
  category: 'audience',                   // top-level category slug
  surface_kind: 'item',                   // 'category' | 'sub_category' | 'entity' | 'aspect' | 'item'
  data_query: {                           // declarative — interpreted by topic engine query layer
    table: 'dna_audience_segments',
    field: 'problems',
    extract: 'jsonb_array',
    parent_param: 'segment_id'
  },
  has_data_check: { ... },               // declarative gate
  multi_select: true,
  prompt_template: 'This is about an audience segment — ${segment_name} — specifically the problems...',
  next_step_id: null                     // null = leaf; non-null = points to next step row
}
```

**Schema gate caveat:** the row shape above is provisional. The `schema-to-db` skill will refine it during Phase 1. The two storage options to weigh:
- (a) Tree-shaped table (parent_id + materialised path) — what's sketched above. Better for adding categories incrementally.
- (b) Single jsonb config with the full cascade tree per category — simpler queries but one big config blob to maintain.

Phase 1 implementation review picks one.

---

## Part 4: What we keep, change, and kill

### KEEP — the design intelligence

✅ **Skeleton-first per content type.** Each stage owns its structural skeleton (Layer 6). Shared craft lives in fragments (Layer 7). The skeleton is what makes a sales page look like a sales page, not a generic LLM cocktail.

✅ **Centralised fragment library.** Already the right pattern in legacy. Becomes a real DB table, with kinds extended to cover personas, worldviews, output contracts, and context bundles alongside the legacy three (craft / context / proofing).

✅ **The Infinite Prompt Engine.** Cascading 1–4 step topic selector. Live data driven. Free-text escape hatch at step 1.

✅ **Strategy panel adapts per content type.** Different content types ask different things up front.

✅ **Settings panel.** Model, person override, tone variation, variant count.

✅ **Single-step vs two-step distinction.** Short-form gets N variants in one pass. Long-form gets blueprint → approve → copy.

✅ **Blueprint section schema (locked V1):** `{purpose, rationale, messaging, provenance}`. Forces the model to justify each section. Used even though the editor is V2.

✅ **Library is opt-in.** Only saved generations enter the registry. Auto-tag from selections + user-added tags on save.

✅ **Chat-on-artifact (both surfaces).** Inline chat on generation + saved-content-as-chat-context.

✅ **Prerequisite hints in picker.** Locked cards show what's missing, with one-click fix path.

✅ **ToV cascade.** Per `format_type`, fall back through the closest-analogue sample type when none exists. Includes deliberate cross-medium hops (e.g. brainstorm-podcast uses `blog` samples because brainstorm output is read like prose).

### CHANGE — what the new stack makes better

🔄 **Eight-layer schema replaces the eight legacy slots.** Decomposing the legacy slots into the eight conceptual layers (Part 2) gives a cleaner authoring surface, exposes per-type variation honestly, and makes prompt assembly traceable.

🔄 **Two stages are two records, not one row with doubled columns.** Each content type has 1+ `prompt_stages` rows (FK). Single-step = 1 stage. Two-step = 2 stages (blueprint + copy). V2 synthesis pass = 3rd stage. No special-casing.

🔄 **Brand context is invariant; Topic context is per-type configurable.** Layer 4 is always the same bundle. Layer 5 declares per content type which DNA strands to weave (offer + VOCs for sales, platform metadata for brainstorm-platform, Topic Engine sentence for socials).

🔄 **Fragment library has more kinds.** Three kinds in legacy (craft, context, proofing) become: `persona`, `worldview`, `craft`, `context`, `proofing`, `output_contract`. Each fragment is versioned — when you tune one, old generations stay reproducible by referencing the version they were built with.

🔄 **Topic Engine is schema-driven, not hand-coded.** A `topic_paths` config (or table) declares the cascade. Each step's options are queries against live data. New audience segments / offers / etc. show up automatically.

🔄 **Multi-select within a step.** At any step that surfaces *items* (step 3 short-cascade, step 4 long-cascade), user can select multiple — but only within the same category (objection + objection, not objection + desire). Mix-and-match within category supported, cross-category not.

🔄 **Free-text augment at any step.** Beyond the legacy "Free-text" option at step 1, the user can append a free-text fragment at any depth. Injected as additional context.

🔄 **Blueprint editor is richer (V2).** Beyond legacy text-only edit: section reorder, per-section regenerate, swap which DNA powers a section, mark sections as "locked / don't regenerate."

🔄 **Per-section copy with synthesis pass (V2).** Long-form copy generates section-by-section (smaller context per call → better quality per section), then a synthesis pass reads the whole draft against the blueprint and reconciles flow. Required for sales pages, optional for blogs/web pages.

🔄 **Generation drafts as transient first-class objects.** Every `generation_run` persists from the moment of submit (so closing the tab doesn't lose work). Drafts have a status (`generating` / `complete` / `errored`) and a TTL (e.g. auto-purge unsaved drafts after 30 days). They are *not* in the library — they're in `generation_runs`. Promotion to library is explicit.

🔄 **Picker is intelligent.** V1: filters + search + favourites + recently-used + prereq locks. V2: AI suggestion from one-line goal, project/mission-aware ranking.

🔄 **Model defaults per task and per stage.** Each stage declares a default model (blueprint stage might use Opus for reasoning; copy stage might use Sonnet for voice). User overrides anywhere.

🔄 **ToV system picks samples, not the content type.** Content type declares its `format_type` (`social_short` / `long_form_blog` / `email_sequence` / `sales_page` / `brainstorm` etc.). The ToV system picks samples + applications based on format type, with cascade fallback.

### KILL — Wized-shaped accidents that don't earn their place

❌ **The legacy 8-slot prompt structure** (`primer`, `background`, `briefing_notes_two`, `copywriting`, `second_primer`, `page_structure`, `instructions`, `structure_recap`). Replaced by the eight-layer model. The legacy slots conflated Persona+Worldview+Flow, Brand+Topic context, and structural skeleton + tiered craft.

❌ **`numshots` as a meaningful column.** It conflated step count with variant count. Replaced by `is_multi_step` (on `content_types`) + `default_variant_count` (runtime setting).

❌ **`min_tokens`/`max_tokens` as fixed columns.** Becomes a setting on stage row, often inferable from `format_type`.

❌ **`tov_sample` per content type.** Killed; replaced by `format_type` + ToV cascade.

❌ **`literals` as an explicit array column.** Implicit — fragments declare their own placeholders; the assembler resolves them.

❌ **`Current` flag.** Use a proper `status` enum (`active` / `archived` / `draft`).

❌ **The XLSX prompt-fragment lookup table.** Replaced by `topic_paths` schema with a `prompt_template` field per leaf node.

❌ **Wized variable juggling.** All state lives in DB rows + URL params + React state.

❌ **140 content types as the V1 surface area.** Port the most-used 30–40 for V1. Audit during V1 build, port the rest in V2/V3 as needed.

---

## Part 5: V1 vs V2 scope split

### OUT-02 (V1) — Single-step content

**Includes:**
- Picker (filters + search + favourites + prereq locks + basic recently-used ranking)
- Strategy panel (per content type, pre-filled from project context where applicable)
- Infinite Prompt Engine (1–4 step cascade, multi-select on item steps, free-text augment at any step)
- Settings panel (model, person, tone variation, variant count)
- Eight-layer prompt assembler + fragment library + bundle resolvers
- Single-step generation (returns N variants, default 5)
- Generation drafts as transient first-class objects
- Save-to-library with auto-tagging + user tags
- Inline chat-on-variant (modal in generation page)
- Saved content as chat context in main Ask BigBrain chat
- ~30–40 ported content types (highest-value subset)
- Blueprint section schema declared (`{purpose, rationale, messaging, provenance}`) — even though the editor is V2

**Exit criteria:** User can pick a content type → fill Strategy → drill the topic engine → generate variants → edit / save / chat. Saved items appear in registry. Chat can scope to saved items.

### OUT-02a (V2) — Two-step long-form + smarts

**Includes:**
- Two-step generation (blueprint stage → user reviews → copy stage → optional synthesis stage)
- Blueprint editor (reorder, per-section regen, lock sections, swap DNA per section)
- Synthesis pass implementation (full-draft reconciliation against blueprint)
- Retrieval-aware step 4 (rank items by relevance when lists are long)
- AI suggestion from one-line goal in picker
- Project/mission-aware picker ranking
- Cost guardrail / token estimation
- Remaining content types ported as needed

---

## Part 6: V1 data model sketch

Not final schema — for orientation. Schemas get ratified via `schema-to-db` skill before implementation.

### `content_types`

The catalogue + per-type configuration. **Does not** carry per-stage prompt content — that lives in `prompt_stages`.

> **Vocabulary source-of-truth:** `04-documentation/reference/channel-taxonomy.md` (DNA-07b, done 2026-04-27). `platform_type`, `format_type`, `subtype`, and `prerequisites.channels` all draw from there. TypeScript constants live in `02-app/lib/types/channels.ts`.

- `id`, `slug`, `name`, `description`, `icon`
- `category` (display category for the picker — Sales / Email / Social / Long form / Brainstorm…). **Note:** this is the *content-type display category*, not the `dna_platforms.category` from the channel taxonomy. Distinct concept; same word. Don't conflate.
- `platform_type` (the **channel** the content type targets — values from `Channel` enum in the channel-taxonomy doc: `linkedin`, `instagram`, `podcast`, `blog`, `newsletter`, `cold_outreach`, `hosted_event`, etc.). Used at picker time to filter by channel.
- `format_type` (drives ToV cascade — values from the format-bucket enum in the channel-taxonomy doc: `social_short`, `social_visual`, `blog`, `newsletter`, `email`, `sales`, `spoken_audio`, `spoken_video`, `ad_copy`, `event`, `outreach`, `brainstorm`, `other`)
- `subtype` (canonical leaf for ToV cascade — `linkedin_post`, `blog_post_long`, `cold_dm`, `podcast_script`, etc. Optional; preferred match when present, else falls back to `format_type`)
- `is_multi_step` (bool — V1 always false)
- `prerequisites` (jsonb — what must exist before the picker unlocks). **Shape:** `{ channels: string[]; lead_magnets: string[]; dna: string[] }`.
  - `channels` values are channel keys (e.g. `["podcast"]`) and resolve to `dna_platforms WHERE channel = X AND is_active = true` (≥1 row required)
  - `lead_magnets` values are lead-magnet kinds (e.g. `["webinar"]`) and resolve to `dna_lead_magnets WHERE kind = X AND status = 'active'` (≥1 row required; empty array for V1 — DNA-08 still parked)
  - `dna` values are singular-DNA-record keys (`["tov", "audience", "offers", "brand"]`) — singular records gate on "row exists with non-default content"; plural tables gate on "≥1 active row"
- `default_variant_count` (int)
- `default_min_chars`, `default_max_chars`
- `topic_bar_enabled` (bool)
- `strategy_fields` (jsonb — declarative config of which Strategy fields show)
- `topic_context_config` (jsonb — Layer 5 config; see below)
- `seo`, `customer_journey_stage`, `time_saved_minutes` (carry-overs from legacy)
- `status` (active / archived / draft)
- `created_at`, `updated_at`

**`topic_context_config` shape (Layer 5):**
```json
{
  "uses_topic_engine": true,
  "dna_pulls": ["offer_full", "audience_voc"],
  "platform_metadata": "when_platform_selected",
  "fallback": "free_text_only"
}
```
Resolved per generation by the bundle resolver. (Schema decision noted in Part 7 Open Questions: this is provisional; refine through use.)

### `prompt_stages`

One row per stage. Single-step content types have 1 stage. Two-step have 2 (blueprint + copy). V2 synthesis adds a 3rd. FK to `content_types`.

- `id`, `content_type_id` (FK), `stage_order` (int — 1, 2, 3…), `stage_kind` (`single` | `blueprint` | `copy` | `synthesis`)
- `persona_fragment_id` (FK to `prompt_fragments`, kind = `persona`) — Layer 1
- `worldview_fragment_id` (FK to `prompt_fragments`, kind = `worldview`, nullable) — Layer 2
- `task_framing` (text — short, hand-authored per stage) — Layer 3
- `structural_skeleton` (text — the heart of the per-type craft, with `${placeholder}` substitutions) — Layer 6
- `craft_fragment_config` (jsonb — Layer 7; supports list / inline / tiered usage; see below)
- `output_contract_fragment_id` (FK to `prompt_fragments`, kind = `output_contract`) — Layer 8
- `output_contract_extras` (text — content-type-specific tweaks to the contract, e.g. character limits, finer JSON shape constraints)
- `default_model` (slug — overrides content type default)
- `min_tokens`, `max_tokens` (per stage)
- `created_at`, `updated_at`

**Layers 4 (Brand context) and 5 (Topic context) are NOT stored on `prompt_stages`** — they're invariant (Layer 4) or configured at the content type level (Layer 5). The assembler injects them around the stage's content.

**Stage inheritance:** none formal. When authoring a two-step content type, just copy FK values for layers that don't differ between stages (typically Persona and Worldview). Less clever, less to go wrong, allows stages to diverge later without migration.

**`craft_fragment_config` shape (Layer 7):**
```json
// Simple list (IG caption, brainstorm)
{ "mode": "list", "fragment_ids": ["frag_id_1", "frag_id_2", "frag_id_3"] }

// Tiered (sales AIDA copy stage)
{
  "mode": "tiered",
  "tiers": [
    { "label": "foundational", "fragment_ids": ["persuasive_sales", "cadence", "paragraphs", "empathy", "apostrophe", "metaphors"] },
    { "label": "section_specific", "fragment_ids": ["headlines", "subheadings", "triple_stack_bullets", "price_reframing", "cta_zhuzz", "pacing", "experiential"] }
  ]
}
```

Inline fragment references (e.g. `${hooks_social}` embedded in the structural skeleton) are resolved by the assembler at template-substitution time — they don't need to be listed in `craft_fragment_config` because they're part of the skeleton.

### `prompt_fragments`

The unified fragment library. Six kinds.

- `id`, `slug`, `kind` (`persona` | `worldview` | `craft` | `context` | `proofing` | `output_contract`)
- `name`, `purpose`
- `content` (text — with `${placeholder}` template literals)
- `placeholders` (jsonb — declared expected placeholders)
- `version` (int — bumps on edit; `prompt_stages` and `generation_runs` reference specific versions)
- `status`
- `created_at`, `updated_at`

### `topic_paths`

Declares the 1–4 step cascade per category. Likely a tree-shaped table (parent_id) or a single jsonb config. Each leaf has a `prompt_template` (the literal sentence injected — like the legacy XLSX rows).

Example shape:
```
audience > pain_points > [items: from voc_problems table for selected segment]
  → "This is about An audience segment, specifically the problems, worries or fears
     this audience has. Most specifically: '${selected}'"
```

### `generation_runs`

The system-of-record for in-flight and recently-generated work. Persists from moment of submit.

- `id`, `content_type_id`, `stage_id` (which stage of the content type this run executed; FK to `prompt_stages`), `parent_run_id` (nullable — for blueprint→copy linkage and for regenerations)
- `created_by`, `created_at`, `completed_at`, `status` (`generating` / `complete` / `errored` / `cancelled`)
- `inputs` (jsonb — full structured snapshot: strategy answers, topic chain, settings, free-text augments)
- `assembled_prompt` (text — the final prompt sent; for audit/debug)
- `fragment_versions` (jsonb — `{fragment_slug: version}` map for reproducibility)
- `model_used` (slug)
- `variants` (jsonb array, each: `{id, text, status (draft/saved/discarded), saved_at, ...}`)
- For multi-step: `previous_run_id` references the run that produced the input to this one (e.g. copy run references blueprint run).

**`inputs` shape:**
```json
{
  "strategy": { "audience_id": "uuid", "offer_id": null, "customer_journey_stage": "awareness" },
  "topic_chain": {
    "step1": "audience",
    "step2": "objections",
    "step3": ["uuid-of-segment-x"],
    "step4": ["uuid-objection-1", "uuid-objection-2"]
  },
  "free_text_augments": [
    { "after_step": 4, "text": "specifically the cost objection" }
  ],
  "settings": { "model": "claude-opus-4-7", "person_override": null, "tone_variation": null, "variant_count": 5 },
  "approved_blueprint_run_id": null
}
```

### `library_items` (a.k.a. content registry — REG-01 lands here)

Only saved variants. A `library_item` is a *promoted* variant from a `generation_run`.

- `id`, `generation_run_id`, `variant_id` (the variant within the run)
- `text` (snapshot at save time — divorces the library item from the generation run, so subsequent regenerations don't mutate library state)
- `auto_tags` (jsonb — inherited from generation inputs: audience_id, offer_id, topic_chain, etc.)
- `user_tags` (jsonb — user-added)
- `publish_date`, `published_url`, `platform`, `status`
- `created_at`, `updated_at`

---

## Part 7: Worked example — Sales page AIDA in the new schema

To make the schema concrete:

```yaml
# content_types row
slug: sales-page-aida
name: Sales page (AIDA)
category: Sales              # picker display category (not dna_platforms.category)
platform_type: sales_page    # channel key from channel-taxonomy.md
format_type: sales           # cascade bucket
subtype: sales_page          # canonical leaf
is_multi_step: true
prerequisites:
  channels: ["sales_page"]   # owned_real_estate / sales_page must be configured
  lead_magnets: []
  dna: ["brand", "tov", "offers", "audience"]
default_variant_count: 1
strategy_fields:
  - { id: offer, required: true }
  - { id: sales_page_angle, required: false }
topic_bar_enabled: false   # offer-driven, no topic engine
topic_context_config:
  uses_topic_engine: false
  dna_pulls: ["offer_full", "audience_voc"]
  platform_metadata: "never"
  fallback: "none"

# prompt_stages row 1 — blueprint
content_type_id: <fk>
stage_order: 1
stage_kind: blueprint
persona_fragment_id: <fk to persona_direct_response>
worldview_fragment_id: <fk to worldview_sales_principles>
task_framing: |
  STEP 1 of 2: Build the blueprint of the sales page.
  A blueprint is like an outline, but instead of just structure, it also breaks
  down the goal for each section, the rationale, and the key messages drawn
  from the source data. The user will review and amend before copy is generated.
structural_skeleton: |
  Here's the Page Structure. Please now generate the blueprint.
  0. "Angle". Goal: ...
  1. "Headline and Subheadline (Attention)". Goal: ...
  [... 16 sections, each with Goal/Instructions/Output/Source data ...]
craft_fragment_config:
  mode: list
  fragment_ids: [blueprint_techniques]
output_contract_fragment_id: <fk to output_contract_blueprint_json>
output_contract_extras: |
  Each section must include section purpose, rationale, messaging guidance
  (verbatim extracts from source), provenance.

# prompt_stages row 2 — copy
content_type_id: <fk>
stage_order: 2
stage_kind: copy
persona_fragment_id: <fk to persona_direct_response>   # same FK as stage 1
worldview_fragment_id: <fk to worldview_sales_principles>   # same FK as stage 1
task_framing: |
  STEP 2 of 2: The user-approved blueprint is below. Generate the copy for
  the entire page. The Output Guidelines reference copywriting techniques
  for each section.
structural_skeleton: |
  These are the Output Guidelines:
  1. "Headline and Subheadline (Attention)". TECHNIQUE: Headline crafting...
  [... 16 sections with copy directives + TECHNIQUE refs ...]
craft_fragment_config:
  mode: tiered
  tiers:
    - label: foundational
      fragment_ids: [persuasive_sales, cadence, paragraphs, empathy, apostrophe, metaphors]
    - label: section_specific
      fragment_ids: [headlines, subheadings, triple_stack_bullets, price_reframing, cta_zhuzz, pacing, experiential]
output_contract_fragment_id: <fk to output_contract_freeform_sections>
output_contract_extras: ""
```

Note: Persona and Worldview use the same FK in both stages — that's the "just copy the FK in" approach (no formal inheritance).

---

## Part 8: Open questions for the brief

These are decisions that don't need answering right now, but the brief should pin down:

1. **Where does the picker live in IA?** Top-level "Content" nav? Sub-nav under Outputs?
2. **What's the directory of V1 content types?** Probably the brief includes a list of the ~30–40 to port. Source: legacy CSV, sorted by Ellie's gut.
3. **Authoring surface for content types in V1.** Probably: seeded via SQL or a CLI script, edited via direct DB or a private admin page. End-user authoring is post-V2.
4. **Authoring surface for fragments in V1.** Same as content types — admin-only.
5. **Inline chat-on-variant: shared chat infrastructure with OUT-01 or separate?** OUT-01's chat is built on AI SDK — should be reusable. Brief locks the integration.
6. **Generation persistence: TTL on unsaved drafts?** Suggested 30 days. Brief decides.
7. **Streaming approach.** OUT-01 already streams via AI SDK — same pattern here. For multi-variant single-step: parallel streams or sequential? Brief decides.
8. **The ~38 legacy fragments in `Centralised Prompt Data Live.csv`.** Port verbatim as the V1 fragment library? Or audit + rewrite? Suggested: port verbatim, audit during use.
9. **Layer 5 `topic_context_config` shape.** The shape sketched above is provisional. Refine through implementation of the first ~5 content types.
10. **`topic_paths` storage model.** Tree table (parent_id, materialised path) vs single jsonb config. Probably tree table; brief locks.

---

## Part 9: Decisions locked here (so the brief can compress)

| Decision | Locked answer |
|---|---|
| Prompt schema model | **Eight-layer model** (Persona, Worldview, Task framing, Brand context, Topic context, Structural skeleton, Craft directives, Output contract). |
| Multi-stage record model | **Two records, FK-linked** (`content_types` + `prompt_stages`). Single-step = 1 stage. Two-step = 2 stages. V2 synthesis = 3 stages. |
| Stage inheritance | **None formal — copy FKs as needed.** Less clever, allows divergence without migration. |
| Skeleton vs fragments for V1 | **Skeleton-first.** Each stage owns its structural skeleton; fragments cover persona / worldview / craft / context / proofing / output_contract. |
| Brand context | **Always-on, invariant bundle.** Same shape every prompt. |
| Topic context | **Per-content-type configurable** via `topic_context_config`. Where the Topic Engine slots in. |
| Authoring surface | Ellie-only for V1. No end-user content-type authoring in V1. |
| Single vs two-step in V1 | **Single-step only.** Two-step is OUT-02a. |
| Multi-select in topic engine | **Yes, but only at item-surfacing steps**, and only within the same category. |
| Blueprint section schema | **`{purpose, rationale, messaging, provenance}`**. Locked even though editor is V2. |
| Strategy pre-fill from project context | **Yes** — when in a CLIENT or MISSION workspace, Strategy fields pre-fill from project context. |
| Library = saved only | **Yes.** Unsaved drafts live in `generation_runs`, not the library. |
| ToV sample selection | **System-driven via `format_type` + cascade fallback**, not per-content-type sample picking. |
| Auto-tagging on save | **Yes** — inherits topic chain + Strategy answers. User can add more. |
| Chat-on-variant | **Yes V1**, modal in generation page, shows context pane. |
| Saved content as main-chat context | **Yes V1.** |
| Picker AI suggestion from goal | **V2.** |
| Retrieval-aware step 4 ranking | **V2.** |
| Project-aware picker ranking | **V2 (basic recently-used in V1 if cheap).** |
| Cost guardrail / token estimation | **V2.** |
| Fragment versioning | **V1.** Each fragment is versioned; runs reference specific versions for reproducibility. |
| Library item snapshots | **Yes** — `library_items.text` is a snapshot at save time, divorced from `generation_runs.variants`. |

---

## Next steps

1. Approve this design doc (Ellie reviews + amends).
2. Write the OUT-02 brief, compressing this doc.
3. `feature-template-check` — is there an existing layout pattern that fits any part of this? (Picker is template-friendly; Strategy + Topic Engine + Generation surface is likely net-new.)
4. `layout-design` — wireframes for the picker, the generation surface, and the library item view.
5. Schema gates for `content_types`, `prompt_stages`, `prompt_fragments`, `topic_paths`, `generation_runs`, `library_items` (or a slimmed `content_registry` if REG-01 is being collapsed in).
6. `feature-build`.
