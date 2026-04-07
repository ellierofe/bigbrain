---
status: approved
table: dna_knowledge_assets
type: plural
related_features: DNA-01, DNA-05, OUT-02
last_updated: 2026-03-29
---

# Schema: dna_knowledge_assets

Plural. One row per knowledge asset. Covers methodologies, frameworks, processes, tools, and templates — differentiated by `kind`. Shared fields apply to all kinds; kind-specific depth lives in `detail` JSONB to avoid a wide sparse table. Outcomes, benefits, advantages live in the shared `dna_entity_outcomes` table.

The knowledge graph (FalkorDB) holds the *connections* between knowledge assets and other nodes. This Postgres table holds the *structured content* — a rich, retrievable record that can be summarised, cited, and injected into prompts.

## Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | |
| `brandId` | uuid | not null, FK → `brands.id` | Owning brand |
| `name` | varchar(200) | not null | Asset name — preserve proprietary naming exactly |
| `kind` | varchar(50) | not null | `methodology \| framework \| process \| tool \| template` |
| `proprietary` | boolean | not null, default true | Is this original IP? |
| `status` | varchar(50) | not null, default 'active' | `draft \| active \| archived` |
| `summary` | text | nullable | 50–80 word overview for prompt injection and card display. Written in brand voice. |
| `principles` | text | nullable | Core beliefs, theoretical foundations, philosophies that underpin this asset. What is it built on? |
| `origin` | text | nullable | How and why this was developed. Origin story — pivotal moments, evolution, key influences. |
| `keyComponents` | jsonb | not null, default '[]' | Structured breakdown of core elements — see structure below. Rich, not a bullet list. |
| `flow` | jsonb | not null, default '[]' | Sequence, cycle, or system of implementation — how components work together — see structure below |
| `objectives` | text | nullable | Stated outcomes or goals — what is this asset trying to achieve? |
| `problemsSolved` | text | nullable | Specific problems or challenges this asset addresses |
| `contexts` | text | nullable | Primary contexts of application — industries, company sizes, business challenges, scenarios |
| `priorKnowledge` | text | nullable | Prerequisites — knowledge, skills, or experience needed to apply this effectively |
| `resources` | text | nullable | Tools, conditions, or inputs required to implement this |
| `targetAudienceIds` | uuid[] | nullable | References to `dna_audience_segments.id` — who this is designed for |
| `relatedOfferIds` | uuid[] | nullable | References to `dna_offers.id` — offers that deliver or use this asset |
| `graphNodeId` | varchar(200) | nullable | ID of corresponding node in FalkorDB knowledge graph |
| `detail` | jsonb | nullable | Kind-specific additional fields — see structure below |
| `visualPrompt` | text | nullable | AI image generation prompt for key art. Simple, evocative thumbnail concept. |
| `faqs` | jsonb | not null, default '[]' | Array of FAQ objects (question + answer) |
| `createdAt` | timestamp with tz | not null, defaultNow | |
| `updatedAt` | timestamp with tz | not null, defaultNow | |

## `keyComponents` JSONB structure

Array of component objects. Each component must have a title and substantive description — not a label with a one-liner. This is the mother lode; it gets summarised in other contexts:

```json
[
  {
    "title": "Diagnostic Phase",
    "description": "A structured audit of the client's current positioning, messaging, and competitive context. Uses a combination of stakeholder interviews, document review, and market research to surface gaps between where the brand is positioned and where it needs to be. The diagnostic produces a 'positioning gap map' that becomes the foundation for all subsequent work.",
    "sortOrder": 1
  }
]
```

## `flow` JSONB structure

Array of flow step objects. Sequential or cyclical — describe each step in terms of what happens, how the client experiences it, and any decision points:

```json
[
  {
    "step": 1,
    "title": "Discovery & Diagnostic",
    "description": "Client completes a pre-work brief. We run a 90-minute discovery session covering business context, audience, and competitive landscape. Output: a completed positioning gap map shared before session 2.",
    "clientExperience": "Client gains clarity on what's actually causing the positioning problem — often different from what they assumed.",
    "decisionPoints": "If the gap map reveals a fundamental business model issue, we flag this before proceeding."
  }
]
```

## `detail` JSONB — kind-specific fields

Only the fields relevant to the `kind` value are populated. Others remain absent.

```json
// For kind = 'methodology' or 'process'
{
  "deliveryFormat": "1-to-1 intensive / workshop / async",
  "duration": "6 weeks",
  "repeatability": "Can be run annually as a refresh",
  "certificationOffered": false
}

// For kind = 'framework'
{
  "dimensions": ["Clarity", "Differentiation", "Resonance"],
  "visualMetaphor": "Three interlocking lenses",
  "applicationContext": "Diagnostic and decision-making tool, not a delivery process"
}

// For kind = 'tool' or 'template'
{
  "format": "Google Doc / Notion / Figma",
  "fileUrl": "https://blob.vercel-storage.com/...",
  "fillTime": "45–60 minutes",
  "outputFormat": "Completed positioning document"
}
```

## `faqs` JSONB structure

```json
[
  {
    "question": "How is this different from a standard brand audit?",
    "answer": "A brand audit catalogues what exists. This methodology diagnoses why it's not working — and produces a specific action plan, not a report.",
    "type": "differentiation"
  }
]
```

`type` options: `differentiation | logistics | psychological | application`

## Relationships

- `targetAudienceIds` → `dna_audience_segments.id`
- `relatedOfferIds` → `dna_offers.id`
- `dna_offers.knowledgeAssetId` → this table's `id`
- Outcomes, benefits, advantages → `dna_entity_outcomes` (entity_type = 'knowledge_asset', entity_id = this record's id)
- `graphNodeId` → FalkorDB node — the graph holds relationships to topics, concepts, research, and other assets; this table holds structured content

## Notes

- **Richness over brevity in `keyComponents` and `flow`**: these are the source data. Other features will summarise from here. Don't cut detail at entry time.
- `kind` is a varchar not an enum so new types can be added (e.g. `diagnostic`, `assessment`, `playbook`) without migrations. Application-level validation enforces the known set.
- `graphNodeId` links to FalkorDB where the asset's connections to topics, research, and other knowledge live. The two systems are complementary: graph = relationships, Postgres = structured content.
- `visualPrompt` replaces `dalle_prompt` from the legacy schema — same purpose, generalised name for multi-model support
- `priorKnowledge` and `resources` are most relevant for methodology/process kinds; typically empty for tools/templates
