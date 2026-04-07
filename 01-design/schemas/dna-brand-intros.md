---
status: approved
table: dna_brand_intros
type: plural library
related_features: DNA-01, OUT-02
last_updated: 2026-03-29
---

# Schema: dna_brand_intros

Plural library. Executional expressions of the brand's value proposition — taglines, bios, elevator pitches, one-liners, formatted for specific contexts and platforms. Accumulates over time; not overwritten. `isCurrent` filters to the active version(s).

Distinct from `dna_value_proposition` (which is strategic/internal) — these are ready-to-use external-facing copy.

## Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | |
| `brandId` | uuid | not null, FK → `brands.id` | Owning brand |
| `kind` | varchar(50) | not null | `tagline \| social_bio \| elevator_pitch \| one_liner \| speaker_bio \| press_description \| other` |
| `label` | varchar(200) | nullable | Optional human label to distinguish variants of the same kind — e.g. "LinkedIn bio (short)", "Conference speaker bio" |
| `platform` | varchar(100) | nullable | Platform or context this is written for — e.g. `linkedin`, `instagram`, `website_hero`, `podcast_guest`, `email_signature`. Null = general use. |
| `body` | text | not null | The intro text itself |
| `characterCount` | integer | nullable | Character count — stored for quick filtering against platform limits. Computed at write time. |
| `characterLimit` | integer | nullable | Max character limit for this intro's target context — e.g. 220 for LinkedIn bio. Set manually or pulled from `dna_platforms.characterLimits`. Used to filter viable intros and warn at generation time. |
| `wordCount` | integer | nullable | Word count — for spoken intros where timing matters |
| `isCurrent` | boolean | not null, default true | True = this is the active/preferred version for this kind+platform combination |
| `valuePropId` | uuid | nullable, FK → `dna_value_proposition.id` | The value proposition record this was written from |
| `audienceId` | uuid | nullable, FK → `dna_audience_segments.id` | If written for a specific audience context |
| `notes` | text | nullable | Context — why this version was written, what angle it takes, what makes it different from other variants |
| `createdAt` | timestamp with tz | not null, defaultNow | |
| `updatedAt` | timestamp with tz | not null, defaultNow | |

## Kind reference

| Kind | Typical length | Notes |
|---|---|---|
| `tagline` | 5–10 words | Memorable encapsulation — works standalone |
| `social_bio` | 150–300 chars | Platform bio field — often character-limited |
| `elevator_pitch` | 60–90 seconds spoken (~150–200 words) | Conversational, first-person, spoken register |
| `one_liner` | 1 sentence | The sharpest possible answer to "what do you do?" |
| `speaker_bio` | 80–150 words | Third-person, credential-forward |
| `press_description` | 50–100 words | Third-person, factual, journalist-ready |

## Relationships

- `valuePropId` → `dna_value_proposition.id` — all intros should be traceable to the strategic record they express
- `audienceId` → `dna_audience_segments.id` — for audience-specific framings of the same core intro
- Referenced by content creator when generating content that needs a bio or intro element

## Notes

- Library model: all versions persist. Old versions aren't deleted — they're a history of how the brand's self-expression has evolved.
- `isCurrent = true` can apply to multiple rows simultaneously (e.g. one current LinkedIn bio, one current elevator pitch)
- `characterCount` and `wordCount` are stored (not just computed) so they can be used as filter criteria: "give me all current social bios under 200 characters"
- `platform = null` means general-purpose — not tailored to a specific platform's culture or constraints
