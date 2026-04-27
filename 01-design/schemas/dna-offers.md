---
status: approved
table: dna_offers
type: plural
related_features: DNA-01, DNA-04, OUT-02
last_updated: 2026-03-29
---

# Schema: dna_offers

Plural. One row per offer. Full offer strategy — from USP and positioning through to features, bonuses, guarantees, and FAQs. Outcomes, benefits, and advantages live in the shared `dna_entity_outcomes` table. The offer may be based on or linked to a knowledge asset (`dna_knowledge_assets`).

## Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | |
| `brandId` | uuid | not null, FK → `brands.id` | Owning brand |
| `name` | varchar(200) | not null | Offer name — retain any proprietary naming exactly |
| `offerType` | varchar(100) | not null | e.g. `productised_service`, `retainer`, `intensive`, `1_1_coaching`, `1_1_consulting`, `course`, `group_programme`, `digital_product`, `subscription`, `newsletter`, `book`, `template`, `tool`, `event`, `other` |
| `status` | varchar(50) | not null, default 'active' | `draft \| active \| retired \| paused` |
| `overview` | text | nullable | High-level description of what the offer is and who it's for. 2–4 sentences. |
| `usp` | text | nullable | Unique selling proposition / unique mechanism. 1–2 sentences. The 'only we…' or 'because we…'. Maps to `${offer_mechanism}`. |
| `uspExplanation` | text | nullable | 2–3 sentences explaining why the USP is effective and how it differentiates |
| `targetAudienceIds` | uuid[] | nullable | References to `dna_audience_segments.id` — which segments this offer is designed for |
| `knowledgeAssetId` | uuid | nullable, FK → `dna_knowledge_assets.id` | If this offer is based on / delivers a specific knowledge asset |
| `pricing` | jsonb | nullable | Price points, payment plans, tiers — see structure below |
| `scarcity` | text | nullable | Any genuine scarcity or urgency (limited places, cohort dates, etc.) |
| `guarantee` | jsonb | nullable | Guarantee type, description, terms — see structure below |
| `customerJourney` | jsonb | nullable | Structured customer journey — 5 stages (awareness, consideration, decision, service, advocacy), each with thinking/feeling/doing/pushToNext. See structure below. |
| `salesFunnelNotes` | text | nullable | How this offer fits into the broader sales funnel — what leads into it, what follows |
| `vocMapping` | jsonb | nullable | Which of the primary audience's VOC statements this offer addresses. See structure below. |
| `cta` | text | nullable | Primary call to action text for this offer. Maps to `${offer_CTA}`. |
| `visualPrompt` | text | nullable | AI image generation prompt for offer key art. Captures the emotional/tangible transformation. |
| `internalNotes` | text | nullable | Working notes — what's been tested, what's changed, strategic context |
| `createdAt` | timestamp with tz | not null, defaultNow | |
| `updatedAt` | timestamp with tz | not null, defaultNow | |

## `pricing` JSONB structure

```json
{
  "currency": "GBP",
  "mainPrice": 3500,
  "displayPrice": "£3,500",
  "paymentPlans": [
    { "label": "Pay in full", "amount": 3500 },
    { "label": "3 monthly payments", "amount": 1250 }
  ],
  "pricingNotes": "Early bird at £2,950 for first 5 clients",
  "reframingNote": "Less than one month of a retained senior consultant"
}
```

`reframingNote` maps to the `price_reframing` prompt component — the context-specific reframe is stored here, the technique lives in `prompt_components`.

## `guarantee` JSONB structure

```json
{
  "type": "satisfaction",
  "headline": "30-Day No-Questions-Asked Guarantee",
  "description": "If you complete the first two sessions and don't feel the work is moving you forward, we'll refund in full.",
  "terms": "Must complete sessions 1 and 2. Refund requested within 30 days of start date.",
  "businessRiskNote": ""
}
```

## `customerJourney` JSONB structure

```json
[
  {
    "stage": "awareness",
    "thinking": "They're starting to realise their positioning isn't landing...",
    "feeling": "Frustrated, uncertain",
    "doing": "Googling, asking peers, reading content",
    "pushToNext": "Sees a post or case study that names their exact problem"
  },
  { "stage": "consideration", "thinking": "...", "feeling": "...", "doing": "...", "pushToNext": "..." },
  { "stage": "decision", "thinking": "...", "feeling": "...", "doing": "...", "pushToNext": "..." },
  { "stage": "service", "thinking": "...", "feeling": "...", "doing": "...", "pushToNext": "..." },
  { "stage": "advocacy", "thinking": "...", "feeling": "...", "doing": "..." }
]
```

Five fixed stages. Advocacy has no `pushToNext` (no next stage). Generated on-demand after core offer is confirmed, using audience profile + offer details + VOC mapping as context.

## `vocMapping` JSONB structure

```json
{
  "audienceSegmentId": "uuid",
  "problems": [0, 3, 7],
  "desires": [1, 4],
  "objections": [2],
  "beliefs": [0, 5]
}
```

Values are indexes into the primary audience segment's JSONB VOC arrays. The `audienceSegmentId` identifies which segment was the primary audience at mapping time.

## Relationships

- `targetAudienceIds` → `dna_audience_segments.id` (array of UUIDs, not a FK constraint — validated at application level)
- `knowledgeAssetId` → `dna_knowledge_assets.id` (nullable FK)
- Features, bonuses, FAQs, outcomes, benefits, advantages → `dna_entity_outcomes` (offer_id = this offer's id, filtered by `kind`)
- Referenced in prompt injection as: `${offer_benefits}`, `${offer_mechanism}`, `${offer_transformation}`, `${offer_features}`, `${offer_objections}`, `${offer_CTA}`, `${offer_price}`, `${offer_scarcity}`, `${offer_bonuses}`, `${offer_guarantee}`, `${offer_pricing_details}`

## Notes

- Features, bonuses, and FAQs all live in `dna_entity_outcomes` (kind = `feature` | `bonus` | `faq`) — not in this table. This keeps them queryable across both offers and knowledge assets without duplication.
- `offerType` is a free-form varchar rather than an enum because offer types evolve.
- **Customer journey (funnel progression):** The question of how a customer moves through the funnel — what they're doing, thinking, and feeling at each stage, and what causes them to escalate — is richer than a single field. This belongs in audience segment strategy (DNA-03/P2 scope), not the offer record. The offer's `salesFunnelNotes` field captures how this offer *fits* within the funnel; the journey *through* it lives with the audience.
