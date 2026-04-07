---
status: approved
table: dna_entity_outcomes
type: shared junction
related_features: DNA-01, DNA-04, DNA-05
last_updated: 2026-03-29
---

# Schema: dna_entity_outcomes

Shared junction table. Stores outcomes, benefits, advantages, features, bonuses, and FAQs for both knowledge assets and offers — in a single table, enabling the relationship between an offer and the knowledge asset it's built on to share and cross-reference their data.

A methodology and the offer that delivers it often share outcomes and features — the offer delivers the methodology, so many of these are the same. This table allows that sharing without duplication, and makes the relationship between the two visible.

Each record can be linked to an offer, a knowledge asset, or both via explicit FK fields. Filter by whichever ID is set depending on what you're fetching.

## Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | |
| `brandId` | uuid | not null, FK → `brands.id` | Owning brand |
| `offerId` | uuid | nullable, FK → `dna_offers.id` | Set if this record belongs to an offer. Null if offer-agnostic. |
| `knowledgeAssetId` | uuid | nullable, FK → `dna_knowledge_assets.id` | Set if this record belongs to a knowledge asset. Null if asset-agnostic. |
| `kind` | varchar(50) | not null | `outcome \| benefit \| advantage \| feature \| bonus \| faq` |
| `body` | text | not null | The statement itself — written in conversational VOC language, 1–2 sentences. For `faq`: the answer. |
| `question` | text | nullable | For `faq` kind only — the question. Null for all other kinds. |
| `faqType` | varchar(50) | nullable | For `faq` kind only: `logistics \| differentiation \| psychological \| pricing \| timeline` |
| `objectionAddressed` | text | nullable | For `bonus` kind — the specific psychological block this bonus removes: "I can't because…" |
| `valueStatement` | text | nullable | For `bonus` kind — a short statement of the bonus's concrete value, e.g. "Saves 10+ hours of copy iteration" |
| `category` | varchar(50) | nullable | For `outcome`/`benefit` kinds — optional categorisation: `resources \| skills \| mindset \| relationships \| status` |
| `sortOrder` | integer | nullable | For ordered display within a kind+entity grouping |
| `createdAt` | timestamp with tz | not null, defaultNow | |

## Kind definitions

| Kind | Definition | Example |
|---|---|---|
| `outcome` | The direct, tangible result of using the offer/methodology. The A→B transformation. | "A clear, one-sentence positioning statement you can use immediately" |
| `benefit` | The second-order positive effect of the outcome — what the outcome enables or unlocks. | "The confidence to walk into any sales conversation knowing exactly how to frame your value" |
| `advantage` | How this approach compares favourably to alternatives — DIY, competitors, doing nothing. | "Unlike generic brand strategy frameworks, this is built around your specific context — not adapted from a template designed for a different kind of business" |
| `feature` | A component of the offer or methodology — what's included and why it matters. Value-forward, not a dry bullet. | "Two 90-minute positioning intensives — you leave session 2 with a complete positioning statement and differentiation framework" |
| `bonus` | An add-on that removes a specific psychological block. Requires `objectionAddressed`. | "The Messaging Matrix — a ready-to-use framework for translating your positioning into copy for any format" |
| `faq` | A question-and-answer pair. Requires `question` field. Optional `faqType` for categorisation. | Q: "How is this different from a regular brand strategy engagement?" |

## Category reference (from legacy system)

| Category | Covers |
|---|---|
| `resources` | Money, time, network, assets |
| `skills` | Knowledge, talent, know-how gained |
| `mindset` | Confidence, peace, positivity, clarity |
| `relationships` | With clients, team, audience, partners |
| `status` | Respect, credibility, admiration, competitive position |

## Indexes

- Index on `(offer_id, kind)` — primary query for offer content
- Index on `(knowledge_asset_id, kind)` — primary query for knowledge asset content

## Relationships

- `offerId` → `dna_offers.id` (nullable FK, cascade delete)
- `knowledgeAssetId` → `dna_knowledge_assets.id` (nullable FK, cascade delete)
- Both fields can be set simultaneously on a single record — this means the record is shared between the offer and its underlying knowledge asset

## Constraints

- At least one of `offerId` or `knowledgeAssetId` must be non-null (enforced at application level)

## Query patterns

```sql
-- All features for a specific offer
SELECT * FROM dna_entity_outcomes
WHERE offer_id = $offerId AND kind = 'feature'
ORDER BY sort_order;

-- All outcomes for a knowledge asset (including those shared with its offer)
SELECT * FROM dna_entity_outcomes
WHERE knowledge_asset_id = $knowledgeAssetId AND kind = 'outcome'
ORDER BY sort_order;

-- Everything shared between an offer and its knowledge asset
SELECT * FROM dna_entity_outcomes
WHERE offer_id = $offerId AND knowledge_asset_id = $knowledgeAssetId;

-- All FAQs for an offer
SELECT * FROM dna_entity_outcomes
WHERE offer_id = $offerId AND kind = 'faq'
ORDER BY faq_type, sort_order;
```

## Notes

- Written statements should follow the conversational, symptomatic language principle from the legacy system — tangible, specific, audience-resonant. Not abstract: "increased confidence" → "walking into a sales call knowing your first answer to 'what do you do?' will land, not land flat"
- `category` is optional — use it when you want to ensure a range of outcome types (e.g. not all outcomes are practical/resources — include mindset and status outcomes too)
- A record with both `offerId` and `knowledgeAssetId` set is intentionally shared — the same feature/outcome is true of both. Records with only one set are specific to that entity only.
- Outcomes for the same underlying idea that need different framing on the offer vs the knowledge asset should be stored as two separate records (one each) rather than one shared record.
