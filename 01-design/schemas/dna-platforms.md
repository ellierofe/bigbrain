---
status: approved
table: dna_platforms
type: plural
related_features: DNA-01, DNA-07, OUT-02
last_updated: 2026-03-29
---

# Schema: dna_platforms

Plural. One row per platform. Platform-specific strategy and constraints — how the brand shows up on each channel, what formats work, what the objectives are, and what the rules are for content created there. Used by the content creator to apply platform-appropriate formatting and strategy.

## Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | |
| `brandId` | uuid | not null, FK → `brands.id` | Owning brand |
| `name` | varchar(100) | not null | Platform name — e.g. "LinkedIn", "Newsletter", "Instagram", "Podcast", "YouTube" |
| `platformType` | varchar(50) | not null | `social \| email \| owned_content \| video \| audio \| other` |
| `handle` | varchar(200) | nullable | Profile URL or handle on this platform |
| `isActive` | boolean | not null, default true | Is the brand currently active on this platform? |
| `primaryObjective` | text | nullable | What is this platform for? e.g. "Thought leadership and direct client acquisition" vs "Community and content distribution" |
| `audience` | text | nullable | Who is the audience on this platform — may differ from overall segments. Platform-specific demographics/context. |
| `contentStrategy` | text | nullable | Overall approach to this platform — posting philosophy, relationship to other channels, content mix rationale |
| `postingFrequency` | varchar(100) | nullable | e.g. "3x per week", "Weekly newsletter", "Monthly long-form" |
| `contentFormats` | jsonb | not null, default '[]' | Formats used on this platform — see structure below |
| `characterLimits` | jsonb | nullable | Relevant character/word limits — see structure below |
| `contentPillarIds` | uuid[] | nullable | Which content pillars are featured on this platform |
| `hashtagStrategy` | text | nullable | How hashtags are used (if applicable) |
| `engagementApproach` | text | nullable | How to engage with comments, DMs, community — the interaction strategy |
| `customerJourneyStage` | varchar(50) | nullable | Where in the customer journey this platform predominantly sits: `awareness \| engagement \| conversion \| delight_advocacy`. Not exclusive — can serve multiple stages, but note the primary one. |
| `growthFunction` | text | nullable | How this platform specifically helps the business grow — thought leadership, lead gen, traffic, conversion, community, partnerships, education. From the legacy platform prompt. |
| `contentPillarThemes` | text | nullable | How the content pillars manifest on this platform — which themes get the most traction here, which angles work, what the audience comes for |
| `subtopicIdeas` | jsonb | not null, default '[]' | Array of subtopic clusters with example content ideas — see structure below. From legacy prompt. |
| `structureAndFeatures` | jsonb | nullable | Signature structural elements and recurring features of content on this platform — see structure below. From legacy prompt. |
| `analyticsGoals` | text | nullable | What metrics matter on this platform — what does success look like? |
| `performanceSummary` | text | nullable | Qualitative notes on what's working and what isn't — updated over time |
| `doNotDo` | text[] | nullable | Platform-specific things to avoid — content types, approaches, styles that don't work here |
| `usp` | text | nullable | What makes this brand's presence on this platform distinct from others in the space — the positioning and unique value for the audience here |
| `notes` | text | nullable | Any other platform-specific context |
| `sortOrder` | integer | nullable | |
| `createdAt` | timestamp with tz | not null, defaultNow | |
| `updatedAt` | timestamp with tz | not null, defaultNow | |

## `contentFormats` JSONB structure

```json
[
  {
    "format": "Text post",
    "description": "Long-form written post, typically 500–1200 words. Hook in first line. No images required.",
    "characterLimit": 3000,
    "bestFor": ["thought leadership", "storytelling", "contrarian takes"],
    "frequency": "2x per week"
  },
  {
    "format": "Carousel",
    "description": "5–10 slide visual post. Lead with a bold claim, teach in the middle, CTA at end.",
    "characterLimit": 150,
    "bestFor": ["frameworks", "how-to", "list content"],
    "frequency": "1x per week"
  }
]
```

## `subtopicIdeas` JSONB structure

Array of subtopic clusters, each with example content ideas. Used by the content creator as seed material for this platform.

```json
[
  {
    "subtopic": "Why most brand strategy doesn't stick",
    "examples": [
      "The reason your positioning statement lives in a deck and nowhere else",
      "What 'doing the brand work' actually needs to result in",
      "The strategy→systems gap: why thinking clearly isn't enough"
    ]
  }
]
```

## `structureAndFeatures` JSONB structure

Signature features and content structure for this platform. Informs the content creator when generating for this platform.

```json
{
  "signatureFeatures": [
    {
      "name": "The Reframe",
      "description": "Every post ends with a one-line reframe of the conventional wisdom challenged in the post. Builds a recognisable editorial voice."
    }
  ],
  "contentStructure": "Hook (1–2 lines) → Setup/tension (2–3 paras) → Insight/reframe (2–3 paras) → Implication → CTA",
  "brandedComponents": ["Opening without preamble", "No 'I hope this finds you well'", "Ends with a question or provocation"]
}
```

## `characterLimits` JSONB structure

```json
{
  "post": 3000,
  "headline": 220,
  "bio": 220,
  "comment": 1250,
  "notes": "LinkedIn post limit is 3000 chars; algorithm favours posts under 1200 chars for reach"
}
```

## Relationships

- `contentPillarIds` → `dna_content_pillars.id`
- Referenced by content creator (OUT-02) as a parameter — platform choice applies format constraints and strategy
- Informs `dna_tov_applications` — each platform should have a corresponding ToV application record
- `handle` may reference `dna_business_overview.socialHandles` (denormalised for convenience)

## Notes

- `contentFormats` is the most important field for generation quality — it gives the LLM the structural rules for each format on each platform
- `characterLimits` are stored here so the content creator can enforce them at generation time, not just as a note in a prompt
- Owned content platforms (newsletter, blog, podcast) use this table too — they have strategy, format, and objectives just like social platforms
- `doNotDo` is deliberately platform-specific: what's fine on Instagram may be wrong for LinkedIn
- `subtopicIdeas` and `structureAndFeatures` are adapted from the legacy platform strategy prompt — they capture the outputs of a platform strategy session as structured data rather than prose, so they're available for content generation, not just reference
- `customerJourneyStage` is about the platform's role in the funnel — not the individual customer's journey through it (that lives in audience segments)
