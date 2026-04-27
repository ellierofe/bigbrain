---
status: approved
table: dna_platforms
type: plural
related_features: DNA-01, DNA-07, DNA-07b, OUT-02
last_updated: 2026-04-27
---

# Schema: dna_platforms

Plural. One row per channel. Channel-specific strategy and constraints — how the brand shows up on each channel, what the objectives are, what the operating rules are. Used by the content creator and other generation surfaces to apply channel-appropriate formatting and strategy, and by `content_types.prerequisites` to gate the picker.

> **Vocabulary note:** the table is named `dna_platforms` (legacy), but the canonical concept is **channel**. The taxonomy at `04-documentation/reference/channel-taxonomy.md` is authoritative for `category` and `channel` values. A future rename is intentionally deferred — column-driven semantics give us everything we need today.

## Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | |
| `brandId` | uuid | not null, FK → `brands.id` | Owning brand |
| `name` | varchar(100) | not null | Channel name — e.g. "LinkedIn", "Newsletter", "Instagram", "Podcast", "YouTube", "Cold outreach", "Hosted events" |
| `category` | varchar(50) | not null | `owned_real_estate \| owned_content \| social \| paid \| earned \| in_person \| relationships \| other`. See [channel-taxonomy.md](../../04-documentation/reference/channel-taxonomy.md). Drives UI grouping and per-category field relevance. |
| `channel` | varchar(50) | not null | Canonical channel value — e.g. `linkedin`, `podcast`, `blog`, `cold_outreach`, `hosted_event`. See `channel-taxonomy.md` for the closed enum scoped per category. This is what `content_types.prerequisites.channels` gates against. |
| `platformType` | varchar(50) | nullable | **Deprecated.** Legacy `social \| email \| owned_content \| video \| audio \| other`. Kept temporarily during the DNA-07b migration; do not introduce new code that reads it. Will be dropped in a follow-up. |
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
- Referenced by content creator (OUT-02) as a parameter — channel choice applies format constraints and strategy
- Gated by `content_types.prerequisites.channels` — picker locks evaluate `WHERE channel = X AND is_active = true`
- Informs `dna_tov_applications` — each content-publishing channel typically has a corresponding ToV application record
- `handle` may reference `dna_business_overview.socialHandles` (denormalised for convenience)

## Per-category field relevance

Not every field is meaningful for every category. `dna_platforms` is one table holding all channels (publishing platforms, paid surfaces, in-person events, relationship channels). All fields are nullable; the UI hides fields that don't apply to the row's `category` via a `categoryHasField()` lookup. See `channel-taxonomy.md` for the relevance matrix.

Examples of expected sparseness:

- `relationships` rows (e.g. `cold_outreach`, `partnership`): `contentFormats`, `characterLimits`, `hashtagStrategy`, `subtopicIdeas`, `structureAndFeatures` are all `(n/a)` — these channels don't produce single-format publishing artifacts. `engagementApproach`, `doNotDo`, `usp`, `audience`, `primaryObjective` remain meaningful.
- `in_person` rows (e.g. `hosted_event`, `networking`): `contentFormats`, `characterLimits`, `hashtagStrategy` are `(n/a)`. `subtopicIdeas` and `structureAndFeatures` may apply to talk content but not to networking cadence.
- `paid` rows: `contentFormats` reinterpreted as ad formats; `characterLimits` reinterpreted as ad-spec limits; `hashtagStrategy` and `subtopicIdeas` typically `(n/a)`.

When a category surfaces a real need the current field set doesn't cover (e.g. cold outreach wants sequence templates and follow-up cadence; hosted events want venue / attendee count / co-hosts), decide between adding nullable columns or splitting into a sibling table — don't pre-build.

## Notes

- `category` and `channel` together are what the rest of the system gates on, groups by, and queries against. `platformType` is legacy and deprecated.
- `contentFormats` is the most important field for generation quality on publishing channels — it gives the LLM the structural rules for each format on each channel
- `characterLimits` are stored here so the content creator can enforce them at generation time, not just as a note in a prompt
- Owned content channels (newsletter, blog, podcast) use this table too — they have strategy, format, and objectives just like social channels
- Non-publishing channels (cold outreach, networking, partnerships, hosted events) use this table too — they have objectives, audience, USP, and do-not-do rules even though they don't have content formats
- `doNotDo` is deliberately channel-specific: what's fine on Instagram may be wrong for LinkedIn; what's fine in cold outreach may be wrong in a partnership pitch
- `subtopicIdeas` and `structureAndFeatures` are adapted from the legacy platform strategy prompt — they capture the outputs of a channel strategy session as structured data rather than prose, so they're available for content generation, not just reference
- `customerJourneyStage` is about the channel's role in the funnel — not the individual customer's journey through it (that lives in audience segments)
- The cards UI groups channels by `category`. Hue/icon defaults are by `category`, overridable per `channel` if needed. The legacy `PLATFORM_TYPE_HUES` lookup is replaced by a `CATEGORY_HUES` map.
