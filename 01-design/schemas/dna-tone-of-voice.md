---
status: draft
tables: dna_tone_of_voice, dna_tov_samples, dna_tov_applications
type: singular (base) + plural library (samples) + plural (applications)
related_features: DNA-01, DNA-09, OUT-02
last_updated: 2026-03-29
---

# Schema: Tone of Voice (three tables)

The ToV system is split across three tables:

1. **`dna_tone_of_voice`** — the singular base record: the brand's voice in full
2. **`dna_tov_samples`** — a library of real writing samples, tagged by format
3. **`dna_tov_applications`** — per-context deltas: how the base voice shifts for different formats

At content generation time, the system loads: base record + matching application delta (if exists) + semantically nearest sample(s) via embedding search. This replaces the old `${tov_sample}` static injection with dynamic retrieval.

---

## Table 1: `dna_tone_of_voice`

Singular. One row per brand.

### Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | |
| `brandId` | uuid | not null, FK → `brands.id` | Owning brand |
| `language` | varchar(20) | not null, default 'en-GB' | BCP 47 language tag. e.g. `en-GB`, `en-US` |
| `grammaticalPerson` | varchar(50) | not null, default 'first_singular' | `first_singular \| first_plural \| second` — maps to old `${brand_person}` |
| `dimensions` | jsonb | nullable | Tonal dimension scores and descriptions — see structure below |
| `summary` | text | nullable | 2–3 paragraph ToV guideline, written in the brand's own voice. Maps to old `${tov_guideline}`. |
| `linguisticNotes` | text | nullable | Lexical choices, sentence structure, rhythm, cadence, idiosyncrasies, figurative language preferences |
| `emotionalResonance` | text | nullable | How persuasive, educational, and emotive elements are incorporated |
| `brandVocabulary` | jsonb | nullable | Brand-specific vocabulary preferences — see structure below |
| `generatedFromSamplesAt` | timestamp with tz | nullable | When AI generation was last run against the sample library |
| `lastEditedByHumanAt` | timestamp with tz | nullable | When a human last manually reviewed or edited this record — used to flag drift if samples have been added since |
| `status` | varchar(50) | not null, default 'draft' | `draft \| active \| archived` |
| `version` | integer | not null, default 1 | |
| `createdAt` | timestamp with tz | not null, defaultNow | |
| `updatedAt` | timestamp with tz | not null, defaultNow | |

### `dimensions` JSONB structure

Four dimensions from the legacy system, each scored 0–100 with a prose description:

```json
{
  "humour": {
    "score": 30,
    "description": "Wry and dry — present but never forced. Wit lands through precision of language and unexpected angles, not jokes. We're playfully serious, not comedic."
  },
  "reverence": {
    "score": 45,
    "description": "Respectful of our subject matter and our audience but not deferential. We take ideas seriously; we don't take ourselves seriously."
  },
  "formality": {
    "score": 50,
    "description": "Professionally informal. We sound like a smart colleague, not a consultant's deck. Contractions yes, slang no."
  },
  "enthusiasm": {
    "score": 40,
    "description": "Energised and engaged, but measured. We care visibly without gushing. Exclamation marks are used sparingly and earn their place."
  }
}
```

Dimension reference (from legacy prompt system):
- **Humour** — 0 = serious, 100 = full-bore funny
- **Reverence** — 0 = highly reverent, 100 = extremely irreverent
- **Formality** — 0 = traditionally formal, 100 = extremely casual
- **Enthusiasm** — 0 = unenthusiastic, 100 = maximum enthusiasm

### `brandVocabulary` JSONB structure

```json
{
  "preferred": ["sharp", "considered", "grounded"],
  "avoid": ["synergy", "leverage (as a verb)", "journey", "ecosystem"],
  "notes": "Prefer Anglo-Saxon words over Latinate equivalents. Short words over long ones where meaning is equal."
}
```

Brand-specific layer only. Global banned words (transform, empower, unlock, etc.) live in `prompt_components` table as `banned_words` slug.

---

## Table 2: `dna_tov_samples`

Plural library. Real writing samples that demonstrate the voice in action, tagged by format. Used for dynamic injection into generation prompts via semantic similarity search.

### Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | |
| `brandId` | uuid | not null, FK → `brands.id` | Owning brand |
| `formatType` | varchar(50) | not null | `social \| email \| sales \| blog \| spoken \| other` |
| `subtype` | varchar(100) | nullable | More specific tag: e.g. `linkedin_post`, `nurture_email`, `sales_page`, `youtube_script`, `podcast_intro` |
| `body` | text | not null | The sample text itself |
| `notes` | text | nullable | What makes this a good example — specific techniques, what to notice |
| `sourceContext` | text | nullable | Where this came from (e.g. "LinkedIn post, March 2025, high engagement") |
| `tonalTags` | text[] | nullable | AI-applied tonal register tags — see tag set below. Human-correctable. 2–3 tags per sample recommended. |
| `isCurrent` | boolean | not null, default true | False = superseded or no longer representative |
| `embedding` | vector(1536) | nullable | Embedding for fallback similarity — dimension count to be confirmed at VEC-01. |
| `createdAt` | timestamp with tz | not null, defaultNow | |
| `updatedAt` | timestamp with tz | not null, defaultNow | |

### `tonalTags` — permitted values

`authoritative | conversational | warm | direct | playful | reflective | persuasive | educational | personal | formal`

Applied by AI at sample intake, based on the base ToV dimension scores as a guide. Human can correct in the UI. Multiple tags allowed — a sample can be `conversational + persuasive + warm`.

### Indexes
- `formatType`, `isCurrent` — composite index; primary filter at retrieval time
- `tonalTags` — GIN index for array containment queries (`@>`)
- `embedding` — HNSW index (added when VEC-01 is implemented; lower priority given tag-based filtering)

### Notes
- **Primary retrieval strategy:** filter by `formatType` first (hard), then `tonalTags` overlap with the generation brief's intended register (soft). If multiple candidates remain, take most recent `isCurrent`.
- **Embedding role:** secondary/fallback — useful once the sample library is large and tags alone leave too many candidates. Not the primary matching mechanism.
- `embedding` dimension (1536) assumes OpenAI text-embedding-3-small or Claude equivalent. Update if a different model is chosen at VEC-01.

---

## Table 3: `dna_tov_applications`

Plural. Per-format or per-context instructions that describe how the base voice shifts. These are the delta from the base — not a full re-specification of the voice.

### Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | |
| `brandId` | uuid | not null, FK → `brands.id` | Owning brand |
| `label` | varchar(200) | not null | Human-readable name: e.g. "LinkedIn posts", "Client emails", "Sales pages", "Recorded video scripts" |
| `formatType` | varchar(50) | not null | `social \| email \| sales \| blog \| spoken \| other` — matches `dna_tov_samples.formatType` |
| `subtype` | varchar(100) | nullable | More specific context if needed |
| `dimensionDeltas` | jsonb | nullable | How scores shift from the base — see structure below |
| `tonalTags` | text[] | nullable | Tonal register tags for this application — same tag set as `dna_tov_samples`. AI-suggested at creation, human-correctable. Describes the register this context calls for (e.g. `formal + authoritative` for client emails; `conversational + direct` for LinkedIn). Used to match samples at retrieval time. |
| `notes` | text | nullable | Prose description of what changes and why. Cadence, CTA style, sentence length, punctuation conventions, emotional register shifts. |
| `doNotUse` | text[] | nullable | Specific things to avoid in this format that are otherwise acceptable |
| `structuralGuidance` | text | nullable | Format-specific structural rules (e.g. "Social: hook in first line, no more than 3 paragraphs, CTA last") |
| `isCurrent` | boolean | not null, default true | |
| `createdAt` | timestamp with tz | not null, defaultNow | |
| `updatedAt` | timestamp with tz | not null, defaultNow | |

### `dimensionDeltas` JSONB structure

```json
{
  "formality": +15,
  "enthusiasm": -10,
  "notes": "Client emails are slightly more formal and measured than general brand content"
}
```

Deltas are added to the base dimension scores at generation time to produce context-adjusted scores.

---

## How the three tables work together at generation time

```
1. Content creator receives: output type (e.g. "LinkedIn post")

2. Load base ToV record
   → dimensions, summary, linguisticNotes, brandVocabulary

3. Find matching application delta
   → SELECT FROM dna_tov_applications WHERE formatType = 'social' AND isCurrent = true
   → Extract tonalTags from the application (e.g. ['conversational', 'direct'])
   → Apply dimensionDeltas to base scores
   → Include structuralGuidance and notes

4. Retrieve nearest sample(s)
   → Primary: SELECT FROM dna_tov_samples
       WHERE formatType = 'social'
       AND isCurrent = true
       AND tonalTags @> $applicationTonalTags   -- samples matching the application's register
       LIMIT 2
   → Fallback (if no tag match): relax to formatType + isCurrent only, take most recent
   → Embedding similarity: secondary — used as tiebreaker if tag filter returns many candidates
   → Include body + notes

5. Inject into generation prompt:
   - base summary + linguistic notes
   - adjusted dimension scores with descriptions
   - application notes + structural guidance
   - sample(s) with context notes
   - brandVocabulary (preferred + avoid)
   - global banned_words from prompt_components
```

## Relationships

- All three tables carry `brandId` → `brands.id` (not null)
- `dna_tov_applications.formatType` and `.tonalTags` should align with `dna_tov_samples` equivalents — the application defines the target register; the sample is found by matching it
- `dna_tone_of_voice` referenced in content generation as `${tov_guideline}` and `${brand_language}` and `${brand_person}`

## Generation model

All ToV records are AI-generated initially — from writing samples, existing brand docs, or a structured intake conversation. Humans review and edit after generation; they don't write this from scratch. The workflow is:

1. **Seed:** Add writing samples to `dna_tov_samples` (real content: posts, emails, proposals)
2. **Generate:** Run the ToV generation skill — AI analyses samples and produces `dimensions`, `summary`, `linguisticNotes`, `emotionalResonance`, `brandVocabulary`
3. **Review:** Human reads, edits, and approves — sets `status = 'active'`, records `lastEditedByHumanAt`
4. **Regenerate:** When new samples are added, re-run to pick up evolution in the voice — compare diff to previous version before accepting

`lastEditedByHumanAt` vs `generatedFromSamplesAt`: if samples have been added since the last human edit, surface a prompt to regenerate or review. The voice may have evolved.

**Note:** The ToV generation prompt needs careful design — it must produce structured output (dimensions with scores + descriptions, vocabulary lists) not just prose guidelines. See backlog item GEN-PROMPTS-01.
