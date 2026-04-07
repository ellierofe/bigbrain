---
status: approved
table: src_stories
type: source-knowledge
related_features: SRC-01, SRC-02, OUT-02, PROV-01
last_updated: 2026-03-29
---

# Schema: src_stories

Source knowledge. One row per story. Narratives about business owner, the business, clients, or defining moments. Stories are the highest-leverage content ingredient — a well-structured story can anchor an entire piece of content. The schema separates raw narrative from structured story components so both can be used: the full story for long-form, the elements for shorter formats.

## Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | |
| `brandId` | uuid | not null, FK → `brands.id` | Owning brand |
| `title` | varchar(300) | not null | Short internal label. e.g. "The £40k project that started with a conversation at a conference" |
| `subject` | varchar(50) | not null | Who the story is about. `self \| client \| business \| project` |
| `narrative` | text | not null | The full story, written out. No length constraint — this is the raw material. |
| `hook` | text | nullable | The opening line or moment that makes someone keep reading. Extracted or crafted from the narrative. |
| `tension` | text | nullable | The problem, conflict, or stakes at the centre of the story |
| `resolution` | text | nullable | What changed, what was learned, what was achieved |
| `lesson` | text | nullable | The explicit or implicit takeaway — what this story proves or illustrates |
| `type` | varchar(50) | not null, default 'origin' | `origin \| client-win \| failure-learning \| pivot \| belief \| behind-the-scenes \| other` |
| `audienceSegmentIds` | uuid[] | nullable | Which segments this story resonates with most |
| `contentPillarIds` | uuid[] | nullable | Which content pillars this story supports |
| `tags` | text[] | nullable | Free-form tags |
| `isPublic` | boolean | not null, default true | False = internal/private — not for published content |
| `isArchived` | boolean | not null, default false | Soft delete |
| `occurredAt` | date | nullable | When the events described happened (not when the story was written) |
| `createdAt` | timestamp with tz | not null, defaultNow | |
| `updatedAt` | timestamp with tz | not null, defaultNow | |

## Relationships

- `audienceSegmentIds` → `dna_audience_segments.id` (soft reference)
- `contentPillarIds` → `dna_content_pillars.id` (soft reference)
- Usage tracked via `PROV-01`

## Notes

- The four structural fields (`hook`, `tension`, `resolution`, `lesson`) are optional but valuable — they make the story usable in prompt injection without sending the full `narrative`. Short-form content can be built from just these four.
- `subject: client` stories should flag whether the client has been anonymised — this can be captured in `notes` or as a tag like `"anonymised"`.
- `type` guides retrieval — when generating content that needs a credibility anchor, fetch `client-win`; when generating content that shows vulnerability or growth, fetch `failure-learning`.
- No `updatedAt` — immutable. If a story evolves (e.g. a later chapter), create a new entry and reference the original in `narrative`.
