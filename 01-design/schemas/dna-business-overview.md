---
status: approved
table: dna_business_overview
type: singular
related_features: DNA-01, DNA-02
last_updated: 2026-03-29
---

# Schema: dna_business_overview

Singular. One row per brand. The factual foundation — what the business is, what it does, and where it operates. Referenced in prompt context injection (`business_context_short`) to ground all generated content.

## Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | |
| `brandId` | uuid | not null, FK → `brands.id` | Owning brand |
| `businessName` | varchar(200) | not null | Trading name |
| `legalName` | varchar(200) | nullable | If different from trading name |
| `ownerName` | varchar(200) | nullable | Owner's name if relevant to content |
| `vertical` | varchar(200) | not null | The industry or sector (e.g. "Brand strategy consulting") |
| `specialism` | text | not null | What specifically the business does within that vertical (e.g. "Positioning, messaging and content strategy for founders and SMEs") |
| `businessModel` | varchar(100) | nullable | e.g. "B2B service", "B2B2C", "productised service", "SaaS" |
| `foundingYear` | integer | nullable | |
| `founderNames` | text[] | nullable | Array of founder names |
| `geographicFocus` | varchar(200) | nullable | e.g. "UK-based, global clients", "North America" |
| `stage` | varchar(100) | nullable | e.g. "bootstrapped solo", "early growth", "scaling" |
| `shortDescription` | text | nullable | 1–2 sentence overview. Used as `${business_context_short}` in prompts |
| `fullDescription` | text | nullable | Longer background — origin story, context, what makes it distinct. Not a marketing statement; factual context for the system |
| `websiteUrl` | varchar(500) | nullable | |
| `primaryEmail` | varchar(200) | nullable | |
| `socialHandles` | jsonb | nullable | `{ linkedin: "", twitter: "", instagram: "" }` etc |
| `notes` | text | nullable | Internal notes — anything that doesn't fit above |
| `version` | integer | not null, default 1 | Incremented on each save |
| `createdAt` | timestamp with tz | not null, defaultNow | |
| `updatedAt` | timestamp with tz | not null, defaultNow | Updated on every save |

## Relationships

- Referenced by `dna_value_proposition`, `dna_brand_meaning` (implicitly — all DNA belongs to this business)
- `shortDescription` is injected as `${business_context_short}` in content generation prompts

## Versioning

Singular table — one live row. `version` is incremented and `updatedAt` is refreshed on every save. No separate history table at this stage; version number provides a change indicator without full audit trail.

## Notes

- `vertical` and `specialism` map directly to the old `${business_field}` and `${business_specialism}` prompt variables
- `shortDescription` is the primary prompt injection point — keep it concise and factual
- `socialHandles` is JSONB to allow platform additions without schema migrations
