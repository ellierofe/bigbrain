---
status: draft
table: dna_lead_magnets
type: plural
related_features: DNA-01, DNA-08, DNA-07b, OUT-02
last_updated: 2026-04-27
---

# Schema: dna_lead_magnets

Plural. One row per lead magnet. Free-value offers used for lead capture — their content, structure, strategic purpose, and conversion path. Lead magnets may be linked to knowledge assets (a condensed framework), offers (the lead magnet leads into a specific offer), and audience segments (which segment this is designed to attract).

## Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | |
| `brandId` | uuid | not null, FK → `brands.id` | Owning brand |
| `name` | varchar(200) | not null | Lead magnet name |
| `kind` | varchar(100) | not null | Canonical lead magnet vocabulary. See `04-documentation/reference/channel-taxonomy.md` ("Lead magnet types"). Values: `guide \| ebook \| checklist \| template \| worksheet \| swipe_file \| quiz \| assessment \| calculator \| tool \| webinar \| workshop \| masterclass \| video_series \| mini_course \| email_course \| report \| whitepaper \| case_study \| free_consult \| audit \| free_chapter \| challenge \| community_access \| other`. Gated by `content_types.prerequisites.lead_magnets`. |
| `status` | varchar(50) | not null, default 'active' | `draft \| active \| retired` |
| `summary` | text | nullable | Brief description of what this lead magnet is and what value it delivers. Used in copy and prompt injection. |
| `valuePromise` | text | nullable | The specific outcome or result the subscriber gets — what does this leave them with? |
| `contentSummary` | text | nullable | What's inside — the content breakdown. For a guide: chapters/sections. For a course: module outlines. For a template: what's covered. |
| `targetAudienceIds` | uuid[] | nullable | Which audience segments this is designed to attract |
| `problemAddressed` | text | nullable | Which specific problem from the target audience this lead magnet addresses |
| `knowledgeAssetId` | uuid | nullable, FK → `dna_knowledge_assets.id` | If this lead magnet delivers or previews a knowledge asset |
| `linkedOfferId` | uuid | nullable, FK → `dna_offers.id` | The primary offer this lead magnet leads into |
| `conversionPath` | text | nullable | How the lead magnet connects to the offer — the nurture sequence, the bridge, the logical next step |
| `deliveryMethod` | varchar(100) | nullable | How it's delivered — e.g. `email_sequence`, `instant_download`, `members_area`, `live_event` |
| `nurturSequenceId` | uuid | nullable | Future: reference to a content sequence/automation. Placeholder FK for M6+. |
| `fileUrl` | varchar(500) | nullable | Vercel Blob URL if it's a downloadable asset |
| `landingPageUrl` | varchar(500) | nullable | URL of the opt-in page |
| `promotionNotes` | text | nullable | How and where to promote this — which platforms, which content types, which audience stages |
| `performanceNotes` | text | nullable | What's worked, what hasn't — qualitative notes on how this performs |
| `isActive` | boolean | not null, default true | |
| `createdAt` | timestamp with tz | not null, defaultNow | |
| `updatedAt` | timestamp with tz | not null, defaultNow | |

## Relationships

- `targetAudienceIds` → `dna_audience_segments.id`
- `knowledgeAssetId` → `dna_knowledge_assets.id`
- `linkedOfferId` → `dna_offers.id`
- `fileUrl` references Vercel Blob (INF-04)
- Referenced by content creator when generating lead magnet promotion content

## Notes

- `conversionPath` is strategic, not technical — it describes the logical narrative bridge between "I got this free thing" and "I should buy this offer". It's the copy brief for the nurture sequence.
- `valuePromise` should be written as a clear, specific outcome statement — not "learn about positioning" but "leave with a one-sentence positioning statement you can use immediately"
- `kind` captures the format; `contentSummary` captures the substance — both are needed for content generation about the lead magnet
- **Lead magnets are not channels.** They're kinds of asset that get *delivered* via channels (a webinar runs on `hosted_event`, an ebook is sent via `newsletter`) and *promoted* via channels (`linkedin`, `newsletter`, etc.). `kind` and `dna_platforms.channel` are deliberately separate dimensions in `content_types.prerequisites`.
