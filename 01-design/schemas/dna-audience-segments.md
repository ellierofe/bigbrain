---
status: approved
table: dna_audience_segments
type: plural
related_features: DNA-01, DNA-03, OUT-02
last_updated: 2026-03-29
---

# Schema: dna_audience_segments

Plural. One row per audience segment. Full psychographic and demographic profiles with voice-of-customer (VOC) statements across problems, desires, objections, and shared beliefs. Used in content generation to ground copy in the audience's actual psychology, not surface descriptors.

## Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | |
| `brandId` | uuid | not null, FK → `brands.id` | Owning brand |
| `segmentName` | varchar(200) | not null | 2–4 word label. e.g. "Scaling Founder", "B2B Service Owner" |
| `personaName` | varchar(100) | nullable | A persona name for this segment (uncommon name, not generic) |
| `summary` | text | nullable | ~50 word overview starting "This audience..." — used in prompt injection. No persona/segment name in this field. |
| `demographics` | jsonb | nullable | Demographic data — see structure below |
| `psychographics` | jsonb | nullable | Structured psychographic profile — see structure below |
| `roleContext` | text | nullable | Their role, what they do day to day, what they're responsible for |
| `problems` | jsonb | not null, default '[]' | Array of VOC problem statements — see structure below. Min 10, aim for 20. |
| `desires` | jsonb | not null, default '[]' | Array of VOC desire/need statements. Min 10, aim for 20. |
| `objections` | jsonb | not null, default '[]' | Array of objection + response objects. Min 5, aim for 10. |
| `sharedBeliefs` | jsonb | not null, default '[]' | Array of shared belief statements. Min 5. |
| `avatarPrompt` | text | nullable | AI image generation prompt for this persona's avatar. Starts with "Generate a raw, real-life, photorealistic studio shot of…" |
| `avatarUrl` | varchar(500) | nullable | Vercel Blob URL of generated avatar image |
| `isActive` | boolean | not null, default true | False = archived/retired segment |
| `sortOrder` | integer | nullable | For ordering segments in the UI |
| `createdAt` | timestamp with tz | not null, defaultNow | |
| `updatedAt` | timestamp with tz | not null, defaultNow | |

## `demographics` JSONB structure

```json
{
  "ageRange": "35-50",
  "gender": "Any",
  "location": "UK-based, may have global clients",
  "income": "£80k–£200k",
  "education": "Degree-educated or equivalent experience",
  "occupation": "Founder / MD / Head of Marketing",
  "businessIndustry": "Professional services",
  "businessStage": "Established (3–10 years)",
  "businessModel": "B2B service",
  "familySituation": "Partner, possibly children",
  "notes": ""
}
```

## `psychographics` JSONB structure

```json
{
  "personalityTraits": "Analytically-minded, high standards, risk-aware. Prefers evidence and examples over enthusiasm and promises. Can be their own worst critic.",
  "lifestyle": "Runs a small team or works solo. Calendar is full. Deep work happens early morning or late evening. Reads widely — business, psychology, adjacent fields.",
  "valuesAndWorldview": "Believes quality of thinking matters. Sceptical of hype and trends. Values directness. Has strong opinions about what good work looks like.",
  "motivations": "Driven by the desire to build something that genuinely stands for something — not just profitable, but meaningful and distinctive. Wants to be known for a specific kind of excellence.",
  "identity": "Sees themselves as a practitioner first, a business owner second. Wants to be respected by peers, not just successful by conventional metrics."
}
```

| Sub-field | Notes |
|---|---|
| `personalityTraits` | How they tend to think and behave — cognitive style, emotional tendencies, interpersonal patterns |
| `lifestyle` | How they spend their time, structure their days, what they prioritise outside work |
| `valuesAndWorldview` | What they believe about the world, their industry, and how things should be done — their general outlook, distinct from shared beliefs with this specific brand |
| `motivations` | What drives decisions at a deeper level than stated desires — the underlying 'why' |
| `identity` | How they see themselves; how they want to be seen by others; what they're proud of |

All sub-fields are free text. Structured as an object (not an array) since each sub-field is singular — one description per dimension per segment.

## `problems` JSONB structure

Array of problem statement objects. Statements are written in first-person VOC language — conversational, specific, not clinical:

```json
[
  {
    "text": "I have a drawer full of positioning documents from three different consultants and none of them feel like me",
    "category": "emotional"
  },
  {
    "text": "Every time I try to explain what I do, I watch people's eyes glaze over and I change my answer to try to fix it",
    "category": "practical"
  }
]
```

`category` options: `practical | emotional | psychological | social`

## `desires` JSONB structure

Array of desire statement objects. Conversational first-person, not prefaced with "I want" or "I desire":

```json
[
  {
    "text": "A one-sentence answer to 'what do you do?' that makes people lean in instead of politely nod",
    "category": "practical"
  },
  {
    "text": "The confidence to charge what I'm worth without apologising for it",
    "category": "psychological"
  }
]
```

`category` options: `practical | emotional | psychological | social`

## `objections` JSONB structure

Array of objection + response objects. Responses address surface objection, misunderstandings, and underlying psychology:

```json
[
  {
    "objection": "I've already worked with a brand strategist and it didn't translate into anything I could actually use",
    "answer": "Most brand strategy fails at the translation step — it produces a deck, not a system. We build the strategy into the tools you use every day, so it stops being something you refer to and starts being something that works for you automatically."
  }
]
```

## `sharedBeliefs` JSONB structure

Array of belief statement objects. Generated via 'doppelganger flip' method — what must be true about the ideal client that distinguishes them from an almost-fit:

```json
[
  {
    "text": "How a business communicates is as important as what it does — maybe more so",
    "notes": "Doppelganger: thinks brand is superficial, real work speaks for itself"
  }
]
```

## Relationships

- Referenced by `dna_offers` (which segments each offer targets)
- Referenced by `dna_knowledge_assets` (which segments a methodology is designed for)
- Referenced by `dna_content_pillars` (which segments a pillar speaks to)
- `id` used in prompt injection as `${audiencepromptstring}` (summary + key VOC data)
- `avatarUrl` references Vercel Blob (INF-04)

## Notes

- VOC statements should be in the audience's voice, not a description of the audience. "I can't explain what I do" not "this segment struggles to articulate their value proposition"
- `problems` and `desires` are rich enough to feed symptomatic messaging (the `experiential` prompt component) — the tangible manifestations are already there if the statements are specific enough
- `sharedBeliefs` are critical for content targeting — they define the minimum viable worldview overlap. Used to qualify content angles and avoid wasting energy on audiences who will never convert
- Customer journey stage is not stored on the segment — a segment isn't *at* a stage, it *can be reached* at different stages. Stage lives on `dna_content_pillars`, `dna_offers`, and is a parameter in the content creator at generation time
- `avatarPrompt` follows the legacy format: photorealistic studio shot, demographic accuracy, positive emotion, ends with "headshot (head and shoulders), eye-level"
