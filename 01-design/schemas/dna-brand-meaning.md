---
status: approved
table: dna_brand_meaning
type: singular
related_features: DNA-01, DNA-02
last_updated: 2026-03-29
---

# Schema: dna_brand_meaning

Singular. One row per brand. The strategic heart — why the business exists, where it's going, and what it stands for. Groups vision, mission, purpose, and values into a single cohesive record because they are always written and reviewed together.

## Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | |
| `brandId` | uuid | not null, FK → `brands.id` | Owning brand |
| `vision` | text | nullable | The future state being worked toward. Long-horizon, aspirational. |
| `visionNotes` | text | nullable | Context, caveats, or working notes on the vision |
| `mission` | text | nullable | What the business does to move toward the vision. Action-oriented. |
| `missionNotes` | text | nullable | |
| `purpose` | text | nullable | Why it matters beyond commercial return. The deeper 'because'. |
| `purposeNotes` | text | nullable | |
| `values` | jsonb | nullable | Array of value objects — see structure below. Max 6. |
| `status` | varchar(50) | not null, default 'draft' | `draft \| active \| archived` |
| `version` | integer | not null, default 1 | Incremented on each save |
| `createdAt` | timestamp with tz | not null, defaultNow | |
| `updatedAt` | timestamp with tz | not null, defaultNow | |

## `values` JSONB structure

Array of up to 6 value objects:

```json
[
  {
    "name": "Clarity over complexity",
    "description": "We believe the best thinking produces the simplest output. If it's hard to explain, it's not ready yet.",
    "behaviours": ["We cut jargon from everything we write", "We don't ship thinking we can't defend in plain English"]
  }
]
```

| Sub-field | Type | Notes |
|---|---|---|
| `name` | string | Short value name or phrase |
| `description` | string | What this value means in practice — not a dictionary definition |
| `behaviours` | string[] | Optional. Specific behaviours or commitments that manifest this value. 2–4 recommended. |

## Relationships

- `brandId` → `brands.id` (not null)
- Conceptually informs `dna_value_proposition` (the external expression of internal meaning) and `dna_tone_of_voice` (voice should reflect values)
- Referenced in content generation as brand context

## Versioning

Singular table — one live row. `version` incremented and `updatedAt` refreshed on every save.

## Notes

- Vision/mission/purpose are kept as separate fields (not a single blob) so each can be individually displayed, edited, and injected into prompts independently
- `_notes` fields on each are for working context — capturing why the current wording was chosen, alternatives considered, etc. Not injected into prompts.
- Values cap at 6 to maintain usability; most strong brand positioning relies on 3–5. More than 6 typically indicates unclear prioritisation.
- `status` field allows a draft state while the brand meaning is being worked on without it appearing as 'live' in the dashboard
