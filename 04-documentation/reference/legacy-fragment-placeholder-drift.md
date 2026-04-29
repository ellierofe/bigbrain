# Legacy fragment placeholder drift

Phase 2 punchlist generated when porting the 38 legacy fragments from
`Centralised Prompt Data Live.csv` into `prompt_fragments` (OUT-02 Phase 3,
seed script `02-app/lib/db/seed/seed-out02-fragments.ts`).

The brief instructs to "port verbatim, audit during use" — so legacy `${...}`
placeholder names are preserved on disk. None of them match the new vocabulary
defined in [`prompt-vocabulary.md`](./prompt-vocabulary.md). The 9 fragments
listed below cannot assemble cleanly until either (a) the placeholders are
renamed in-content (with a fragment version bump) OR (b) the new vocabulary
is extended with these legacy names as aliases.

The remaining 29 fragments have no placeholders and are safe to use as-is.

## Drift table

| Legacy placeholder | Used by | Likely new-vocab equivalent |
|---|---|---|
| `${audienceoverview}` | `business_context_short` | (new) audience-segment summary block — closest fit: rendered `audience_summary` bundle output, but as inline text |
| `${audiencepromptstring}` | `topic`, `topic_cta`, `topic_platform` | `${segment_name}` (or new placeholder for joined segment description) |
| `${brand_language}` | `tov_frame`, `dna_tov` | (new) `${brand_language}` — needs adding to vocab Group B |
| `${brand_vocab}` | `banned_words` | (new) `${brand_vocab}` — needs adding to vocab Group B |
| `${brandname}` | `business_context_short` | `${brand_name}` (rename: drop the squashed casing) |
| `${business_field}` | `business_context_short` | (new) `${business_field}` — needs adding to vocab Group B |
| `${business_specialism}` | `business_context_short` | (new) `${business_specialism}` — needs adding to vocab Group B |
| `${contentplatformstring}` | `topic_platform` | `${platform_name}` |
| `${customer_journey}` | `topic`, `topic_cta` | (new) needs strategy-field placeholder — Group A candidate |
| `${offerpromptstring}` | `topic_cta` | `${offer_name}` |
| `${person}` | `tov_frame`, `dna_tov` | (new) `${person}` (e.g. "we" / "I") — needs adding to vocab Group B |
| `${post_topic}` | `topic`, `topic_cta`, `topic_platform` | `${selected}` (the topic-chain leaf, per current vocab) |
| `${related_proof}` | `brand_proof` | (new) brand-proof bundle output — likely Layer 5 bundle, not placeholder |
| `${selected_tov}` | `dna_tov` | n/a — `dna_tov` is archived (DNA-generation only) |
| `${tov_guideline}` | `tov_frame`, `dna_tov` | `${tov_core}` |

## Affected fragments (9)

- `business_context_short` (context) — 5 unknown placeholders
- `topic` (context) — 3
- `topic_cta` (context) — 4
- `topic_platform` (context) — 3
- `tov_frame` (context) — 3
- `brand_proof` (context) — 1
- `banned_words` (proofing) — 1
- `dna_tov` (context, **archived**) — 4 (out of scope)

## Resolution path (Phase 2)

When the assembler is built and the first content type is exercised end-to-end:

1. Decide per-placeholder: rename (cleaner long-term) vs alias (less churn).
2. For renames, bump the fragment's `version` to 2 with the new placeholder names; mark the v=1 row `archived`.
3. For each new placeholder added to the vocabulary, update [`prompt-vocabulary.md`](./prompt-vocabulary.md) AND `02-app/lib/llm/content/types.ts` constants in the same change (per the doc's maintenance section).
4. Re-run `db:seed:out02-fragments` to upsert the v=2 rows.

This is deliberately deferred — the current verbatim port lets us see the legacy content in-context before deciding the rename rules.
