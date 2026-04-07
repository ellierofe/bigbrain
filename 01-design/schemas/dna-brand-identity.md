---
status: approved
table: dna_brand_identity
type: singular
related_features: DNA-01, DNA-02, DNA-10, OUT-04
last_updated: 2026-03-29
---

# Schema: dna_brand_identity

Singular. One row per brand. Visual identity parameters — the rules and assets that govern how the brand looks. Stored structurally so it can eventually feed design generation (OUT-04). Asset files stored in Vercel Blob; this table holds references and parameters.

## Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | |
| `brandId` | uuid | not null, FK → `brands.id` | Owning brand |
| `colours` | jsonb | nullable | Array of colour objects — see structure below |
| `typography` | jsonb | nullable | Font stack — see structure below |
| `logoAssets` | jsonb | nullable | Array of logo variants with file references |
| `motifs` | text | nullable | Description of recurring visual motifs, patterns, or graphic elements |
| `imageStyle` | text | nullable | Guidance on photography/illustration style. What the brand looks like visually beyond colour and type. |
| `imageStyleExamples` | text[] | nullable | Array of Vercel Blob URLs for reference/mood board images |
| `iconStyle` | text | nullable | Icon style guidance — e.g. "line icons, 2px stroke, rounded caps" |
| `designPrinciples` | text[] | nullable | Array of high-level visual principles (e.g. "Lots of white space", "Data-led layouts") |
| `doNotUse` | text | nullable | Visual elements to avoid — styles, colours, approaches that are off-brand |
| `brandGuidelineUrl` | varchar(500) | nullable | Link to an external brand guidelines document if one exists |
| `status` | varchar(50) | not null, default 'draft' | `draft \| active \| archived` |
| `version` | integer | not null, default 1 | |
| `createdAt` | timestamp with tz | not null, defaultNow | |
| `updatedAt` | timestamp with tz | not null, defaultNow | |

## `colours` JSONB structure

```json
[
  {
    "name": "Primary",
    "hex": "#1A1A2E",
    "rgb": "26, 26, 46",
    "usage": "Primary backgrounds, headings",
    "role": "primary"
  },
  {
    "name": "Accent",
    "hex": "#E94560",
    "rgb": "233, 69, 96",
    "usage": "CTAs, highlights, links",
    "role": "accent"
  }
]
```

| Sub-field | Type | Notes |
|---|---|---|
| `name` | string | Human label |
| `hex` | string | Hex code |
| `rgb` | string | RGB values as string |
| `hsl` | string | Optional |
| `usage` | string | Where this colour is used |
| `role` | string | `primary \| secondary \| accent \| neutral \| background \| text \| error \| success` |

## `typography` JSONB structure

```json
{
  "heading": {
    "family": "Playfair Display",
    "weights": [400, 700],
    "source": "Google Fonts",
    "url": "https://fonts.google.com/specimen/Playfair+Display"
  },
  "body": {
    "family": "Inter",
    "weights": [400, 500],
    "source": "Google Fonts",
    "url": "https://fonts.google.com/specimen/Inter"
  },
  "mono": {
    "family": "JetBrains Mono",
    "weights": [400],
    "source": "Google Fonts",
    "url": null
  },
  "notes": "Heading font is display-only — never use at small sizes. Body font handles all UI text."
}
```

## `logoAssets` JSONB structure

```json
[
  {
    "variant": "primary",
    "format": "svg",
    "url": "https://blob.vercel-storage.com/...",
    "backgroundUsage": "light",
    "notes": "Full lockup with wordmark"
  },
  {
    "variant": "icon",
    "format": "png",
    "url": "https://blob.vercel-storage.com/...",
    "backgroundUsage": "any",
    "notes": "Icon-only, used for favicon and social avatars"
  }
]
```

## Relationships

- `logoAssets[].url` and `imageStyleExamples` reference files in Vercel Blob (INF-04)
- Will feed OUT-04 (design generation) when that milestone is reached
- Informs `dna_tov_applications` indirectly — visual tone should align with written tone

## Versioning

Singular table — one live row. `version` incremented on every save.

## Notes

- All asset URLs point to Vercel Blob — no binary data stored in Postgres
- JSONB for colours and typography allows additions (e.g. a new colour token) without schema migrations
- `designPrinciples` and `doNotUse` are the most useful fields for AI-assisted design generation — they constrain the output space
- This schema is intentionally kept at the parameters level, not the full design system level. A full design token system (spacing, radii, shadows, etc.) lives in `01-design/design-system/` when built out.
