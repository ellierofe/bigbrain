# Prompt vocabulary reference

Canonical vocabulary for the eight-layer prompt assembler (ADR-006, OUT-02). Two
namespaces, both consumed by the assembler and seed-time fragment authors:

1. **Placeholders** — `${...}` tokens that appear inside fragment `content` and
   inside `prompt_stages.structural_skeleton`. The assembler substitutes their
   values at generation time from `GenerationInputs` and DNA records.
2. **Bundle slugs** — names referenced from `content_types.topic_context_config.dna_pulls[]`.
   Each slug maps to a resolver function that pulls specific DNA fields and
   formats them as a context block.

Both vocabularies are closed sets at any given time. Adding a new placeholder
or bundle is a coordinated change — fragment authoring, the assembler resolver
map, and this doc all update together. Missing placeholders fail closed (the
assembler raises rather than emitting literal `${...}` to the model).

---

## Placeholders

`${...}` tokens substituted by the assembler. Three groups by source:

### Group A — Strategy / selection

Filled from `GenerationInputs.strategy` and `GenerationInputs.topic_chain`.

| Placeholder | Source | Example value |
|---|---|---|
| `${selected}` | `topic_chain.prompt_template_resolved` (best-effort fallback) | "the problems they hold" |
| `${selected_items_joined}` | array elements from the cascade leaf, joined naturally (single → quoted; multi → "X" and "Y") | `"financial anxiety" and "career drift"` |
| `${segment_name}` | `dna_audience_segments.segment_name` for the selected segment | `Mid-career creatives` |
| `${offer_name}` | `dna_offers.name` for the selected offer | `The Brand DNA Sprint` |
| `${platform_name}` | `dna_platforms.name` for the selected platform | `Ellie's LinkedIn` |
| `${asset_name}` | `dna_knowledge_assets.name` for the selected asset | `The Three Lenses framework` |
| `${aspect_label}` | the human-readable label of the chosen step-3 aspect | `problems, worries or fears` |
| `${value}` | for single-value aspects (USP, Guarantee, Pricing, CTA), the field value | `$2,400 one-time` |
| `${cta_url}` | `strategy.cta_url` (freetext strategy field) | `https://nicelyput.co/sprint` |
| `${sales_page_angle}` | `strategy.sales_page_angle` (freetext strategy field) | `For founders who've outgrown DIY branding` |

### Group B — Brand DNA

Filled from singular DNA tables. Resolved per generation (cached within a request).

| Placeholder | Source |
|---|---|
| `${brand_name}` | `dna_business_overview.brand_name` |
| `${business_context_short}` | brand-context bundle (Layer 4) — short version |
| `${tov_core}` | `dna_tone_of_voice.core_descriptors` rendered as a block |
| `${voc_problems}` | DNA-aggregate: all `dna_audience_segments.problems` joined (or filtered by selected segment when one is set) |
| `${voc_desires}` | parallel — `desires` jsonb |
| `${voc_objections}` | parallel — `objections` jsonb |
| `${value_proposition_core}` | `dna_value_proposition.core_statement` |
| `${offer_benefits}` | resolved offer's benefit list (`dna_entity_outcomes` where `offerId = X AND kind='benefit'`) |

### Group C — Output / structural

Self-referential — substituted from the stage row itself or the assembler state.

| Placeholder | Source |
|---|---|
| `${variant_count}` | `GenerationSettings.variant_count` |
| `${min_chars}` | `prompt_stages.min_tokens` translated to chars (or `content_types.default_min_chars`) |
| `${max_chars}` | parallel for max |

### Resolution rules

- **Substitution order:** placeholders are resolved before fragment-slug refs
  (Group A is cheapest; Group B requires DNA reads; Group C is constant).
- **Missing values:** if a placeholder cannot be resolved (e.g. `${segment_name}`
  with no segment selected), the assembler raises. Fail-closed by design.
- **Escape:** there is no escape syntax in V1 — fragment authors must avoid
  literal `${...}` in prose. (V2 may add `\${literal}`.)

---

## Bundle slugs

Named resolvers referenced from `content_types.topic_context_config.dna_pulls[]`.
Each slug maps to a function in `02-app/lib/llm/content/bundles.ts` that pulls
specific DNA fields and formats them as a Layer 5 (Topic context) block.

Bundle slugs are NOT placeholders — they aren't `${...}` tokens. They're
config keys. The assembler walks `dna_pulls[]` in order and concatenates each
resolver's output.

| Slug | What it pulls | Used by (V1) |
|---|---|---|
| `offer_full` | The selected offer's full record: name, USP, outcomes, benefits, pricing, guarantee, CTA. Multi-paragraph block. | Sales pages, offer-driven emails |
| `offer_summary` | Lighter version: name + USP + top 3 outcomes only | Social posts about an offer |
| `audience_voc` | The selected (or default) audience segment's `problems` + `desires` + `objections` arrays formatted as bullets. | Sales pages, persuasive social |
| `audience_summary` | One-paragraph segment description: `segment_name` + role/context fields | Brainstorm types, strategy emails |
| `tov_frame` | `dna_tone_of_voice` core descriptors + ToV samples filtered by current `format_type`/`subtype` (channel-taxonomy.md cascade rules) | Most short-form types |
| `topic_intro` | A one-line topic statement derived from the topic_chain leaf — essentially `topic_chain.prompt_template_resolved` formatted as a header line | Topic-Engine-driven types |
| `value_proposition` | `dna_value_proposition.core_statement` + 3 differentiators | Brand-positioning content |
| `brand_meaning` | `dna_brand_meaning` — vision/mission/purpose/values jsonb formatted | Manifestos, brand-essay types |
| `knowledge_asset` | The selected knowledge asset's overview + key components/process | Methodology-led content |
| `competitor_context` | Top competitor analysis findings (used sparingly) | V2 — not in V1 seeds |
| `recent_research` | `src_own_research` last 3 entries, summary fields only | Thought-leadership posts |

### Resolution rules

- **Order matters.** `dna_pulls[]` is rendered in array order — closer-to-the-front
  bundles get more model attention.
- **Filtering by selection:** bundles that depend on a specific record (offer,
  segment, platform, asset) read from `inputs.strategy` first; if the field
  isn't pre-selected, the bundle either short-circuits to a default or raises
  per the resolver's choice. See per-bundle behaviour in `bundles.ts`.
- **Empty bundles:** if a resolver has nothing to pull (e.g. `competitor_context`
  with no competitor analyses), it returns `null` and the assembler skips it.
  Layer 5 with all-empty bundles falls through to `topic_context_config.fallback`.

### Naming conventions

- Snake-case, lowercase
- `<entity>_<scope>` shape: `offer_full`, `offer_summary`, `audience_voc`,
  `audience_summary`. Two-word slugs preferred over verbose three-word slugs.
- New bundles are added to this doc *and* to the `BUNDLE_RESOLVERS` map in
  `02-app/lib/llm/content/bundles.ts` in the same change.

---

## Maintenance

This doc is the source of truth. The assembler imports its placeholder and
bundle vocabularies from constants in `02-app/lib/llm/content/types.ts` and
`02-app/lib/llm/content/bundles.ts` respectively. The constants must match
this doc — if they drift, the doc is right and the constants are wrong.

Linting check (future): a script that parses every `prompt_fragments.content`
and every `prompt_stages.structural_skeleton`, extracts `${slug}` references,
and verifies they resolve to either a known placeholder or a known fragment
slug. Worth adding once the seed library lands.
