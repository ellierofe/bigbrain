---
status: approved
table: dna_value_proposition
type: singular
related_features: DNA-01, DNA-02
last_updated: 2026-03-29
---

# Schema: dna_value_proposition

Singular. One row per brand. The external-facing strategic statement — what is promised, to whom, and why this business over alternatives. Combines value proposition and positioning because they are always co-dependent: positioning is the competitive framing of the value promise.

## Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | |
| `brandId` | uuid | not null, FK → `brands.id` | Owning brand |
| `coreStatement` | text | nullable | The distilled value proposition in 1–3 sentences. The answer to "what do you do and why does it matter?" |
| `targetCustomer` | text | nullable | Who this is for — a clear description of the primary beneficiary. Not a segment name; a description of the person and their situation. |
| `problemSolved` | text | nullable | The specific problem or tension this business resolves. Should feel painfully accurate to the target customer. |
| `outcomeDelivered` | text | nullable | The transformation or result the customer gets. Concrete, not abstract. |
| `uniqueMechanism` | text | nullable | How this business delivers the outcome differently. The 'only we...' or 'because we...' — the thing that makes the outcome credible and distinct. |
| `differentiators` | text[] | nullable | Array of specific differentiating factors vs alternatives (competitors, DIY, doing nothing). 3–6 recommended. |
| `alternativesAddressed` | jsonb | nullable | Key alternatives a prospect might consider, and why this is the better choice. See structure below. |
| `elevatorPitch` | text | nullable | A spoken, first-person version of the value proposition — conversational, not corporate. Distinct from brand intros (which are platform-formatted). |
| `internalNotes` | text | nullable | Working notes — reasoning behind wording choices, what's been tested, what didn't work |
| `status` | varchar(50) | not null, default 'draft' | `draft \| active \| archived` |
| `version` | integer | not null, default 1 | |
| `createdAt` | timestamp with tz | not null, defaultNow | |
| `updatedAt` | timestamp with tz | not null, defaultNow | |

## `alternativesAddressed` JSONB structure

```json
[
  {
    "alternative": "Hiring an in-house brand strategist",
    "whyUs": "Same strategic rigour, a fraction of the cost, no management overhead, available when you need it"
  },
  {
    "alternative": "Doing nothing / status quo",
    "whyUs": "Unclear positioning compounds over time — it makes every sales and marketing effort harder. The cost of drift is real."
  }
]
```

## Relationships

- Referenced by `dna_brand_intros` (FK) — intros are the executional expressions of this record
- Informs `dna_offers` — each offer should be traceable to the core value proposition
- Used in content generation as `${valuepropositionstring}`
- Informs `dna_competitor_analyses` — positioning is only meaningful relative to alternatives

## Versioning

Singular table — one live row. `version` incremented on every save.

## Notes

- `coreStatement` is the primary prompt injection point — concise enough to fit in a system prompt without dominating context
- `uniqueMechanism` maps to `${offer_mechanism}` in the old prompt system — it's the 'because' that makes the value promise credible
- `alternativesAddressed` is structured rather than free text so it can be used in competitive content and objection handling
- This record should be reviewed whenever `dna_competitor_analyses` is updated — positioning is only meaningful relative to the competitive landscape
