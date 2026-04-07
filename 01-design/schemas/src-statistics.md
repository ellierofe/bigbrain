---
status: approved
table: src_statistics
type: source-knowledge
related_features: SRC-01, SRC-02, OUT-02, PROV-01
last_updated: 2026-03-29
---

# Schema: src_statistics

Source knowledge — immutable once created. One row per statistic or data point. Numbers, percentages, and findings referenced regularly in content. The emphasis is on citability — every stat should have a traceable source so it can be used confidently in published content.

## Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | |
| `brandId` | uuid | not null, FK → `brands.id` | Owning brand |
| `stat` | text | not null | The statistic as it would appear in content. e.g. "73% of B2B buyers say thought leadership directly influences their purchasing decisions" |
| `shortLabel` | varchar(200) | nullable | Brief label for UI listing. e.g. "73% B2B buyers influenced by thought leadership" |
| `source` | varchar(500) | not null | Publication, study, or organisation. e.g. "Edelman-LinkedIn B2B Thought Leadership Impact Study 2023" |
| `sourceUrl` | varchar(500) | nullable | Direct link to the source document or page |
| `sourceYear` | smallint | nullable | Year the study or data was published |
| `notes` | text | nullable | Context, caveats, how to use this stat, or why it's relevant |
| `topic` | varchar(200) | nullable | Broad topic area. e.g. "B2B buying behaviour", "content marketing ROI" |
| `tags` | text[] | nullable | Free-form tags for filtering |
| `audienceSegmentIds` | uuid[] | nullable | Audience segments this stat is most relevant to |
| `offerIds` | uuid[] | nullable | Offers this stat supports |
| `contentPillarIds` | uuid[] | nullable | Content pillars this stat is most relevant to |
| `methodologyIds` | uuid[] | nullable | Methodologies this stat supports or validates |
| `isArchived` | boolean | not null, default false | Soft delete — stats that are outdated or superseded |
| `createdAt` | timestamp with tz | not null, defaultNow | |
| `updatedAt` | timestamp with tz | not null, defaultNow | |

## Relationships

- `audienceSegmentIds` → `dna_audience_segments.id` (soft reference)
- `offerIds` → `dna_offers.id` (soft reference)
- `contentPillarIds` → `dna_content_pillars.id` (soft reference)
- `methodologyIds` → `dna_knowledge_assets.id` (soft reference)
- Usage tracked via `PROV-01`

## Notes

- `stat` is the publication-ready string — store it exactly as you'd want to use it. Avoids reformatting at generation time.
- `sourceYear` matters for longevity — stats older than ~5 years should be flagged or archived, especially in fast-moving fields.
- If a stat is superseded by newer data, archive the old one and create a new entry.
