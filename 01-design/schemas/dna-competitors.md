---
status: approved
tables: dna_competitor_analyses, dna_competitors
type: plural (versioned parent + child records)
related_features: DNA-01, OUT-03
last_updated: 2026-03-29
---

# Schema: Competitors (two tables)

The competitor system uses two tables:

1. **`dna_competitor_analyses`** — a versioned snapshot grouping a set of competitors at a point in time. Each new analysis is a new row; version history is preserved.
2. **`dna_competitors`** — individual competitor records within an analysis, with structured assessment across six dimensions.

Scope: this is **brand-level competitor intelligence** — positioning, messaging, brand, and offer analysis for NicelyPut's own competitive landscape. Client-specific competitor analysis (with domain-specific parameters) is a future skill in the client project system (M6+) and is not handled here.

Your own brand is included in the analysis — assessed on the same criteria, AI-assisted to reduce subjectivity.

---

## Table 1: `dna_competitor_analyses`

Parent record. Groups a complete competitive analysis snapshot.

### Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | |
| `brandId` | uuid | not null, FK → `brands.id` | Owning brand |
| `label` | varchar(200) | not null | e.g. "Brand strategy consulting — UK market, Q1 2026" |
| `scope` | text | nullable | What this analysis covers — market, geography, criteria focus |
| `isCurrent` | boolean | not null, default true | Only one analysis should be current at a time |
| `ownBrandAssessmentId` | uuid | nullable | FK → `dna_competitors.id` — the own-brand record within this analysis |
| `matrixAxes` | jsonb | nullable | Custom matrix dimensions if used — see structure below |
| `matrixData` | jsonb | nullable | The comparative matrix data across competitors — see structure below |
| `summaryInsights` | text | nullable | AI-generated or manually written synthesis — key takeaways, positioning gaps, strategic opportunities |
| `aiAnalysedAt` | timestamp with tz | nullable | When AI analysis was last run across this snapshot |
| `version` | integer | not null, default 1 | |
| `createdAt` | timestamp with tz | not null, defaultNow | |
| `updatedAt` | timestamp with tz | not null, defaultNow | |

### `matrixAxes` JSONB structure

Optional custom matrix — define the dimensions to plot competitors against:

```json
[
  { "id": "pricing", "label": "Pricing", "range": ["Low", "High"] },
  { "id": "specialisation", "label": "Specialisation", "range": ["Generalist", "Specialist"] }
]
```

### `matrixData` JSONB structure

```json
[
  {
    "competitorId": "uuid",
    "competitorName": "NicelyPut",
    "axes": {
      "pricing": 75,
      "specialisation": 90
    }
  }
]
```

---

## Table 2: `dna_competitors`

Child records. One row per competitor within an analysis. Structured assessment across six brand dimensions, drawn from the original competitor audit framework.

### Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | |
| `brandId` | uuid | not null, FK → `brands.id` | Owning brand — denormalised for query simplicity |
| `analysisId` | uuid | not null, FK → `dna_competitor_analyses.id` | Which analysis this belongs to |
| `name` | varchar(200) | not null | Competitor name |
| `competitorType` | varchar(50) | not null | `direct \| adjacent \| alternative_approach \| doing_nothing \| own_brand` |
| `url` | varchar(500) | nullable | Website URL |
| `overview` | text | nullable | Brief description of who this competitor is |
| `isOwnBrand` | boolean | not null, default false | True for the own-brand record |
| `positioningStrategy` | jsonb | nullable | Assessment of positioning — see structure below |
| `brandMessage` | jsonb | nullable | Assessment of messaging — see structure below |
| `personality` | jsonb | nullable | Assessment of brand personality — see structure below |
| `brandIdentity` | jsonb | nullable | Assessment of visual identity — see structure below |
| `brandPresence` | jsonb | nullable | Assessment of website and presence — see structure below |
| `coreOffer` | jsonb | nullable | Assessment of offer and sales approach — see structure below |
| `reviews` | jsonb | nullable | Positive and negative review data — see structure below |
| `aiGenerated` | boolean | not null, default false | True if this record was AI-populated |
| `aiGeneratedAt` | timestamp with tz | nullable | |
| `manualNotes` | text | nullable | Any manually added notes or overrides |
| `createdAt` | timestamp with tz | not null, defaultNow | |
| `updatedAt` | timestamp with tz | not null, defaultNow | |

### Assessment JSONB structures

Each section mirrors the original competitor audit framework dimensions. Fields are stored as objects with a `rating` (1–10 or boolean) and `notes` (free text assessment). This allows both structured scoring and qualitative observation.

**`positioningStrategy`**
```json
{
  "mainPointOfDifference": { "notes": "..." },
  "communicatesDifference": { "rating": 6, "notes": "Claims specialisation but messaging is generic" },
  "isPositionUnique": { "rating": true, "notes": "..." },
  "addsValue": { "rating": 8, "notes": "..." },
  "enhancesExperience": { "rating": 4, "notes": "..." },
  "replicableEasily": { "rating": true, "notes": "Could be easily copied" },
  "uniqueBrandExperience": { "notes": "..." }
}
```

**`brandMessage`**
```json
{
  "memorableTagline": { "rating": 4, "notes": "No clear tagline" },
  "compellingHook": { "rating": 6, "notes": "..." },
  "communicatesSolution": { "rating": 8, "notes": "..." },
  "speaksToFearsDesiresEmotions": { "rating": 4, "notes": "..." },
  "consistentAndStructured": { "rating": 6, "notes": "..." }
}
```

**`personality`**
```json
{
  "definedPersonalityArchetype": { "rating": true, "notes": "Clearly 'Sage' archetype" },
  "messagingCharacteristics": { "notes": "Authoritative, measured, data-led" },
  "identityCharacteristics": { "notes": "Clean, minimal, corporate" },
  "resonanceTechniques": { "notes": "Credentials, case studies, research citations" },
  "failureToResonate": { "notes": "Lacks warmth; feels inaccessible to smaller businesses" },
  "brandVoiceWellDefined": { "rating": 8, "notes": "..." }
}
```

**`brandIdentity`**
```json
{
  "logoMemorableAndImpactful": { "rating": 6, "notes": "..." },
  "colourPaletteCommunicatesCharacteristics": { "rating": 8, "notes": "Navy/gold — authority and premium" },
  "imageStyleCommunicatesCharacteristics": { "rating": 6, "notes": "..." },
  "typographyCommunicatesCharacteristics": { "rating": 8, "notes": "..." },
  "overallPresenceCommunicatesCharacteristics": { "rating": 6, "notes": "..." }
}
```

**`brandPresence`**
```json
{
  "websiteEffectiveness": { "rating": 8, "notes": "Strong case study presentation" },
  "uxRating": { "rating": 6, "notes": "..." },
  "uiRating": { "rating": 8, "notes": "..." },
  "usefulContent": { "rating": 4, "notes": "Blog inactive" },
  "physicalPresence": { "rating": null, "notes": "No physical presence" }
}
```

**`coreOffer`**
```json
{
  "coreOfferClearlyPromoted": { "rating": 6, "notes": "Services page buried" },
  "effectiveSalesFunnel": { "rating": 4, "notes": "No clear conversion path from content" },
  "effectiveCTA": { "rating": 6, "notes": "..." },
  "competitivelyPriced": { "rating": null, "notes": "Pricing not disclosed" },
  "improvementOpportunities": { "notes": "Needs clearer outcome statements on services page" }
}
```

**`reviews`**
```json
{
  "positive": [
    "Transformed how we communicate our value — we've had more inbound in 3 months than in the previous year",
    "Genuinely different to the usual brand strategy shops — practical and commercial"
  ],
  "negative": [
    "Very expensive for what it is",
    "Takes a while to see results — not for businesses that need quick wins"
  ],
  "reviewSources": ["Google", "LinkedIn recommendations", "Trustpilot"],
  "overallSentiment": "Positive with consistent pricing objections"
}
```

---

## Relationships

- `dna_competitors.analysisId` → `dna_competitor_analyses.id` (cascade delete)
- `dna_competitor_analyses.ownBrandAssessmentId` → `dna_competitors.id` (the own-brand record)
- `dna_value_proposition` informs the own-brand assessment — the competitive positioning should be evaluated against your stated positioning
- Will feed `dna_value_proposition` updates — new competitive intelligence should prompt a review of positioning

## Notes

- **Own brand inclusion**: The own-brand record (`isOwnBrand = true`, `competitorType = 'own_brand'`) is assessed on the same criteria. AI analysis of own brand is specifically useful for reducing founder blind spots around messaging consistency and perceived positioning.
- **`doing_nothing` type**: Always include a "doing nothing / status quo" competitor record. What does the prospect lose by not solving the problem? This is often the most persuasive competitive framing.
- **AI population**: This table is designed to be populated via a skill that uses AI to research and assess competitors from public data. `aiGenerated` and `aiGeneratedAt` flag what was researched vs manually assessed.
- **Versioning via new analysis**: When re-running a competitive analysis, create a new `dna_competitor_analyses` record (with new `dna_competitors` children) rather than overwriting. Set the new analysis `isCurrent = true` and the old one `isCurrent = false`. Full history preserved.
- **Matrix is optional**: The `matrixAxes` and `matrixData` fields allow a visual positioning map but are not required. Heat map / matrix visualisation is a UI concern handled in the dashboard (KG-03 or DASH-02 scope).
