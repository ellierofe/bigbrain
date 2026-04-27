---
status: draft
table: prompt_components
type: system (not DNA)
related_features: INF-06, OUT-02, OUT-01
last_updated: 2026-03-29
---

# Schema: prompt_components

System table. Not brand DNA — reusable instruction snippets that are composed into generation prompts at runtime. Equivalent to the centralised prompt data in the legacy system (`Centralised Prompt Data Live.csv`).

These components can be updated centrally and the change cascades to every prompt that uses them — no need to edit individual content type configurations. They are domain knowledge and copywriting expertise encoded as injectable instructions.

## Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | |
| `brandId` | uuid | nullable, FK → `brands.id` | Null = system-global. Set = brand-specific override. Brand-specific takes precedence over global for the same `slug`. |
| `slug` | varchar(100) | not null | Machine-readable identifier used in prompt assembly — e.g. `cadence`, `empathy`, `banned_words`, `hooks_social`. Unique constraint on `(brandId, slug)` — global rows use `brandId = null`, brand overrides use the brand's id. |
| `name` | varchar(200) | not null | Human-readable name |
| `type` | varchar(50) | not null | `copywriting \| proofing \| context \| structure \| formatting` |
| `purpose` | text | nullable | What this component does — why it exists |
| `usage` | text | nullable | When/where this component is used — which content types or prompt stages inject it |
| `content` | text | not null | The actual instruction text. May include `${variable}` placeholders for dynamic values injected at runtime. |
| `isActive` | boolean | not null, default true | Inactive components are not injected even if referenced |
| `version` | integer | not null, default 1 | Incremented on each edit — provides a simple change log |
| `notes` | text | nullable | Internal notes — rationale, history, known edge cases |
| `createdAt` | timestamp with tz | not null, defaultNow | |
| `updatedAt` | timestamp with tz | not null, defaultNow | |

## Type reference

| Type | Description |
|---|---|
| `copywriting` | Copywriting technique instructions — hooks, headlines, CTAs, empathy, cadence, persuasion |
| `proofing` | Output quality rules — banned words, formatting, style enforcement |
| `context` | Context injection snippets — how to frame brand, audience, topic in a prompt |
| `structure` | Output structure instructions — JSON format requirements, section ordering |
| `formatting` | Visual formatting rules — paragraph length, use of lists, visual parsing |

## Known components from legacy system

| Slug | Type | Purpose |
|---|---|---|
| `banned_words` | proofing | Global banned words list (transform, empower, unlock, etc.) + brand vocab placeholder |
| `hooks_social` | copywriting | 10 social media hook techniques with examples |
| `hooks_email` | copywriting | Email subject line techniques |
| `hooks_storytelling` | copywriting | Storytelling hook techniques for marketing narratives |
| `persuasive_sales` | copywriting | Basics of persuasive sales copy — clarity, structure, audience-centricity |
| `cadence` | copywriting | Vary sentence length and rhythm |
| `paragraphs` | formatting | Max 3 sentences per paragraph, break up long blocks |
| `headlines` | copywriting | Headline crafting framework — 4 qualifying questions |
| `subheadings` | copywriting | Lead/subheading writing — benefit + urgency |
| `empathy` | copywriting | Empathy doubling — symptomatic messaging, deep audience understanding |
| `triple_stack_bullets` | copywriting | Benefit + feature + mechanism bullet structure |
| `price_reframing` | copywriting | Context-specific price reframing technique |
| `cta_zhuzz` | copywriting | CTA optimisation — benefit, prequalify, eliminate objection |
| `pacing` | copywriting | Leading statement + led-to statement structure |
| `experiential` | copywriting | Symptomatic/tangible messaging — show don't tell |
| `apostrophe` | proofing | Do not directly address audience by their segment name or role |
| `metaphors` | copywriting | Figurative language types — experiential yes, literary no, twisted clichés sparingly |
| `internal_logic` | copywriting | Cohesive narrative flow across sections |
| `brand_context` | context | Signals that ToV, sample, and banned words will follow |
| `business_context_short` | context | Business name, field, specialism, audience, value proposition snippet |
| `tov_frame` | context | ToV guideline, language, and grammatical person injection |
| `topic` | context | Topic, audience, customer journey stage injection |
| `topic_cta` | context | Offer-specific topic, audience, journey stage injection |
| `labels` | proofing | Do not include technique labels in final output |

## How prompt components are used

Content generation prompts are assembled from layers:

```
1. Role/task framing (hardcoded per content type)
2. Brand context: business_context_short + brand_context
3. Strategy context: audience data + offer/topic data + pillar framing
4. Copywriting instructions: selected components from this table
   (e.g. cadence + empathy + hooks_social + apostrophe for a LinkedIn post)
5. Output format instructions: json_structure + visual_formatting
6. Tone of voice: tov_frame + selected sample from dna_tov_samples
7. Proofing: banned_words (global + brand vocab) + labels
```

The content type record (future: a `content_types` table) specifies which slugs to inject for each output type.

## Relationships

- Referenced by content generation logic (OUT-02, OUT-01) at prompt assembly time
- `banned_words` content references `dna_tone_of_voice.brandVocabulary` at runtime (the `${brand_vocab}` placeholder is resolved from the DNA record)
- `business_context_short` references `dna_business_overview.shortDescription` at runtime
- `tov_frame` references `dna_tone_of_voice.summary`, `.language`, `.grammaticalPerson` at runtime

## Notes

- This table is **not user-facing** in the DNA dashboard — it's a system configuration table managed through an admin interface or directly
- `content` may contain `${variable}` placeholders — these are resolved at prompt assembly time by the content generation layer, not stored as resolved text
- Version history is lightweight here (just a version counter) — full audit trail is not needed since these are system-level instructions, not business strategy
- New components can be added without code changes — the prompt assembly layer reads from this table dynamically
