---
status: approved
table: src_own_research
type: source-knowledge
related_features: SRC-01, SRC-02, OUT-02, PROV-01
last_updated: 2026-03-29
---

# Schema: src_own_research

Source knowledge. One row per research output. Studies, surveys, analyses, and structured investigations conducted by Ellie or NicelyPut. Distinct from external research (which lives in the knowledge graph) — this is original work that carries authority and can be cited as proprietary data.

## Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | |
| `brandId` | uuid | not null, FK → `brands.id` | Owning brand |
| `title` | varchar(300) | not null | Full title of the research. e.g. "NicelyPut Brand Clarity Survey 2024" |
| `shortLabel` | varchar(200) | nullable | Brief label for UI listing |
| `type` | varchar(50) | not null | `survey \| analysis \| audit \| case-study \| experiment \| framework-validation \| other` |
| `summary` | text | not null | 2–5 sentence overview: what was studied, how, and the headline finding. Used in prompt injection. |
| `methodology` | text | nullable | How the research was conducted — sample size, method, data sources, period |
| `keyFindings` | jsonb | not null, default '[]' | Array of finding objects — see structure below |
| `sourceDocumentIds` | uuid[] | nullable | FK references to `src_source_documents` — the underlying data or files |
| `publishedUrl` | varchar(500) | nullable | If this research has been published externally |
| `conductedAt` | date | nullable | When the research was conducted or completed |
| `topic` | varchar(200) | nullable | Primary topic area |
| `tags` | text[] | nullable | Free-form tags |
| `contentPillarIds` | uuid[] | nullable | Which content pillars this research supports |
| `isPublic` | boolean | not null, default true | False = internal only |
| `isArchived` | boolean | not null, default false | Soft delete |
| `createdAt` | timestamp with tz | not null, defaultNow | |
| `updatedAt` | timestamp with tz | not null, defaultNow | |

## `keyFindings` JSONB structure

Array of finding objects. Each finding is independently usable as a stat or claim:

```json
[
  {
    "finding": "84% of respondents said they'd attempted to define their positioning at least once but felt the result didn't reflect how they actually work",
    "significance": "Validates the core positioning problem — the issue isn't lack of effort, it's lack of a system that translates thinking into language",
    "tags": ["positioning", "validation"]
  }
]
```

| Sub-field | Notes |
|---|---|
| `finding` | The result, written in citable form — as it would appear in content |
| `significance` | Why this finding matters in the context of NicelyPut's work — internal interpretation |
| `tags` | Optional, for filtering findings across research items |

## Relationships

- `sourceDocumentIds` → `src_source_documents.id` (soft reference)
- `contentPillarIds` → `dna_content_pillars.id` (soft reference)
- Usage tracked via `PROV-01`
- Individual findings from `keyFindings` can be extracted and stored as `src_statistics` entries for independent use

## Notes

- `keyFindings` are the primary retrieval unit — at generation time, the system can pull just the relevant findings without injecting the full research document.
- The relationship between `src_own_research` and `src_statistics` is intentional: a survey might produce 10 citable data points that live both here (in context) and as standalone `src_statistics` rows (for independent use). No forced deduplication — let both exist.
- If you run a follow-up study, create a new entry rather than overwriting — the original research is a historical record. Corrections to the existing entry are fine.
