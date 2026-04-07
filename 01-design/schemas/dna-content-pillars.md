---
status: draft
table: dna_content_pillars
type: plural
related_features: DNA-01, DNA-06, OUT-02
last_updated: 2026-03-29
---

# Schema: dna_content_pillars

Plural. One row per content pillar. Defines the strategic territory each pillar covers — the topics, framings, formats, angles, and approach. Used by the content creator to scope and orient generation; a piece of content belongs to a pillar and inherits its strategic parameters.

## Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | |
| `brandId` | uuid | not null, FK → `brands.id` | Owning brand |
| `name` | varchar(200) | not null | Pillar name — short and memorable, e.g. "The Thinking Behind the Work" |
| `summary` | text | nullable | 2–3 sentence description of what this pillar covers and why. Used in prompt injection. |
| `strategicPurpose` | text | nullable | Why this pillar exists — what business/brand objective it serves. E.g. authority-building, audience trust, lead generation, thought leadership. |
| `topics` | text[] | nullable | Array of specific topics or subject areas this pillar covers |
| `framing` | text | nullable | How the brand approaches these topics — the perspective, angle, or lens that makes this content distinctively ours |
| `howWereDifferent` | text | nullable | What makes this brand's take on these topics distinct from how competitors or the market discusses them |
| `formats` | text[] | nullable | Content formats used in this pillar — e.g. `['long-form post', 'carousel', 'short video', 'newsletter section']` |
| `mediaTypes` | text[] | nullable | Media types — e.g. `['written', 'video', 'audio', 'visual']` |
| `contentAngles` | jsonb | not null, default '[]' | Recurring angles or approaches within this pillar — see structure below |
| `targetAudienceIds` | uuid[] | nullable | Which audience segments this pillar primarily speaks to |
| `customerJourneyStages` | text[] | nullable | Which funnel stages this pillar typically addresses: `awareness \| consideration \| decision \| retention` |
| `callToActionStyle` | text | nullable | How CTAs are typically handled in this pillar — hard sell, soft nurture, no CTA, community invite, etc. |
| `successIndicators` | text | nullable | What does good look like for this pillar? What are we trying to achieve with it? |
| `isActive` | boolean | not null, default true | |
| `sortOrder` | integer | nullable | |
| `createdAt` | timestamp with tz | not null, defaultNow | |
| `updatedAt` | timestamp with tz | not null, defaultNow | |

## `contentAngles` JSONB structure

Recurring angles that give this pillar its character — the repeatable patterns of approach, not one-off topic ideas:

```json
[
  {
    "name": "The contrarian take",
    "description": "Challenge a common piece of received wisdom in the field with a specific, argued counterpoint",
    "example": "Why 'find your niche' is the wrong starting point for positioning"
  },
  {
    "name": "Behind the work",
    "description": "Show the thinking process behind a piece of client work or strategic decision — process transparency as authority-building",
    "example": "How we diagnosed a positioning problem that looked like a pricing problem"
  }
]
```

## Relationships

- `targetAudienceIds` → `dna_audience_segments.id`
- Referenced by content creator (OUT-02) as a parameter selection — pillar choice scopes the generation
- Referenced by `dna_platforms` implicitly — which pillars are featured on which platforms
- Used in prompt injection to ground the topic and framing for generated content

## Notes

- A pillar is a strategic *territory*, not a content calendar. Topics come from the pillar; the pillar doesn't enumerate all possible topics.
- `framing` is the most important field for generation quality — it's the thing that makes content feel distinctively from this brand vs generic content on the same topic
- `contentAngles` gives the content creator and the LLM concrete, repeatable patterns to work with — much more useful than "write about X"
- `howWereDifferent` maps to the positioning differentiation work in `dna_value_proposition` — content pillars are where strategic positioning becomes topic-level execution
