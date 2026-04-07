---
status: approved
table: src_testimonials
type: source-knowledge
related_features: SRC-01, SRC-02, OUT-02, PROV-01
last_updated: 2026-03-29
---

# Schema: src_testimonials

Source knowledge. One row per testimonial. Client quotes, results statements, and endorsements used as social proof ingredients in content generation. Items don't update — if a testimonial needs correction, archive the old one and create a new one.

## Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | |
| `brandId` | uuid | not null, FK → `brands.id` | Owning brand |
| `clientName` | varchar(200) | not null | Name of the person giving the testimonial |
| `clientTitle` | varchar(200) | nullable | Role or title at time of testimonial |
| `clientCompany` | varchar(200) | nullable | Company or organisation |
| `quote` | text | not null | The exact quote, verbatim. No paraphrasing. |
| `editedQuote` | text | nullable | Lightly edited version for readability (with permission). If null, use `quote`. |
| `result` | text | nullable | Quantified or specific outcome described in the testimonial, extracted for easy reference. e.g. "Closed £40k project within two weeks of launch" |
| `context` | text | nullable | What project or engagement this came from. Internal use only — not published. |
| `type` | varchar(50) | not null, default 'quote' | `quote \| written \| video \| case-study` |
| `sourceUrl` | varchar(500) | nullable | Link to original (LinkedIn post, Google review, email screenshot, etc.) |
| `mediaUrl` | varchar(500) | nullable | Vercel Blob URL if video or image asset |
| `audienceSegmentIds` | uuid[] | nullable | Which audience segments this testimonial resonates most with |
| `offerIds` | uuid[] | nullable | Which offers this testimonial is associated with |
| `tags` | text[] | nullable | Free-form tags for filtering. e.g. ["positioning", "quick-win", "B2B"] |
| `isPublic` | boolean | not null, default true | False = internal reference only, not for use in published content |
| `isArchived` | boolean | not null, default false | Soft delete — retired testimonials |
| `collectedAt` | date | nullable | When the testimonial was given |
| `createdAt` | timestamp with tz | not null, defaultNow | |
| `updatedAt` | timestamp with tz | not null, defaultNow | |

## Relationships

- `audienceSegmentIds` → `dna_audience_segments.id` (soft reference — array, not FK)
- `offerIds` → `dna_offers.id` (soft reference — array, not FK)
- Usage tracked via `PROV-01` — content registry records which testimonials were used in which outputs

## Notes

- `quote` is always verbatim. `editedQuote` is the usable version if editing was agreed with the client. Content generation should prefer `editedQuote` when present.
- `result` is a convenience extraction — it's always present inside `quote` but pulling it out makes it easy to inject just the outcome into prompt context without the full quote.
- Array FK references (`audienceSegmentIds`, `offerIds`) are intentionally soft — source knowledge persists even if the referenced DNA items are deleted. Retrieval handles the join at query time.
- No `updatedAt` — immutable. Archive and recreate if correction needed.
