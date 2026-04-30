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

## Status (2026-04-30)

**V1 assembler is unblocked.** The two fragments transitively referenced by
the three V1 stages — `topic` and `topic_platform` — were rebumped to v=2
during Phase 2 step 1 (assembler build) so the smoke test could run end-to-end:

- `topic` v=2 — `${selected}`, `${segment_name}`, `${customer_journey_stage}`
- `topic_platform` v=2 — `${platform_name}`, `${selected}`, `${segment_name}`
- Newsletter stage skeleton's inline `${contentplatformstring}` → `${platform_name}`

The vocabulary picked up one new placeholder (`${customer_journey_stage}`,
Group A) — the strategy field already existed on `instagram-caption`. v=1 rows
of both `topic` and `topic_platform` are now `status='archived'` for the audit
trail.

All three V1 content types (`instagram-caption`, `newsletter-edition`,
`brainstorm-blog-posts`) now assemble cleanly via
`02-app/lib/llm/content/__smoke__/assemble-smoke.ts` — final prompts ranged
from ~5k to ~19k chars.

## Drift table

Resolved fragments are struck through. Unresolved ones still apply when those
fragments enter active use.

| Legacy placeholder | Used by | Likely new-vocab equivalent | Resolved? |
|---|---|---|---|
| `${audienceoverview}` | `business_context_short` | (new) audience-segment summary block — closest fit: rendered `audience_summary` bundle output, but as inline text | no |
| ~~`${audiencepromptstring}`~~ | ~~`topic`, `topic_cta`, `topic_platform`~~ | renamed to `${segment_name}` in `topic` v=2 + `topic_platform` v=2 | partial (still in `topic_cta`) |
| `${brand_language}` | `tov_frame`, `dna_tov` | (new) `${brand_language}` — needs adding to vocab Group B | no |
| `${brand_vocab}` | `banned_words` | (new) `${brand_vocab}` — needs adding to vocab Group B | no |
| `${brandname}` | `business_context_short` | `${brand_name}` (rename: drop the squashed casing) | no |
| `${business_field}` | `business_context_short` | (new) `${business_field}` — needs adding to vocab Group B | no |
| `${business_specialism}` | `business_context_short` | (new) `${business_specialism}` — needs adding to vocab Group B | no |
| ~~`${contentplatformstring}`~~ | ~~`topic_platform`~~, newsletter skeleton | renamed to `${platform_name}` | yes (V1 callsites) |
| ~~`${customer_journey}`~~ | ~~`topic`~~, `topic_cta` | renamed to `${customer_journey_stage}` (added to vocab Group A) | partial (still in `topic_cta`) |
| `${offerpromptstring}` | `topic_cta` | `${offer_name}` | no |
| `${person}` | `tov_frame`, `dna_tov` | (new) `${person}` (e.g. "we" / "I") — needs adding to vocab Group B | no |
| ~~`${post_topic}`~~ | ~~`topic`, `topic_platform`~~, `topic_cta` | renamed to `${selected}` | partial (still in `topic_cta`) |
| `${related_proof}` | `brand_proof` | (new) brand-proof bundle output — likely Layer 5 bundle, not placeholder | no |
| `${selected_tov}` | `dna_tov` | n/a — `dna_tov` is archived (DNA-generation only) | n/a |
| `${tov_guideline}` | `tov_frame`, `dna_tov` | `${tov_core}` | no |

## Affected fragments — remaining work

- `business_context_short` (context) — 5 unknown placeholders. **Blocks** any
  content type that pulls this fragment via Layer 4 brand context. Currently
  the assembler hard-codes Layer 4 with `${business_context_short}` placeholder
  (Group B), bypassing this fragment entirely. If this fragment ever gets
  imported by a stage, all 5 placeholders need vocab additions.
- `topic_cta` (context) — 4 unknown placeholders. Used by sales / CTA-driven
  content types, none of which are in V1. Resolve when OUT-02a (long-form +
  sales pages) lands or when `topic_cta` is referenced by any new V1+ stage.
- `tov_frame` (context) — 3 unknown placeholders (`brand_language`, `person`,
  `tov_guideline`). The `tov_frame` BUNDLE (Layer 5 resolver) supersedes the
  `tov_frame` fragment for V1 content types, so this fragment may simply be
  archived once `bundles.ts` ships its `tov_frame` resolver. Decide then.
- `topic_platform` (context, currently v=2 active) — content overlap with Layer
  5 bundles. The fragment carries platform strategy + topic + audience text
  inline (used by `newsletter-edition` and `brainstorm-blog-posts` task framing
  via `${topic_platform}`), but Layer 5's `topic_intro` + `audience_summary`
  bundles now provide the same information in a more structured form. Symptom:
  mild echo in the assembled prompt where Layer 5 ("the problems faced by X")
  is followed by Layer 6 ("The specific topic to consider is the problems
  faced by X"). Cleanup path: slim the fragment to the platform-strategy bit
  only, OR drop it entirely if `topic_context_config.dna_pulls` covers the
  same ground. Bump v=3 / archive v=2 when chosen.
- `brand_proof` (context) — 1 placeholder (`${related_proof}`). Likely
  reframed as a Layer 5 `brand_proof` bundle — not a placeholder.
- `banned_words` (proofing) — 1 placeholder (`${brand_vocab}`). Easy add to
  vocab Group B (pull from `dna_tone_of_voice.brandVocabulary` jsonb).
- `dna_tov` (context, archived) — 4 placeholders, **out of scope** (DNA-generation only).

## Resolution path

When a deferred fragment enters active use:

1. Decide per-placeholder: rename (cleaner long-term) vs alias (less churn).
2. For renames: add a v=2 entry to `out02-fragments-data.ts`, mark the v=1
   row `status: 'archived'` with a `notes` line, re-run `db:seed:out02-fragments`.
3. For each new vocabulary entry: update [`prompt-vocabulary.md`](./prompt-vocabulary.md)
   AND the `PLACEHOLDERS_GROUP_*` constants in `02-app/lib/llm/content/types.ts`
   AND add a resolver in `02-app/lib/llm/content/placeholders.ts` — all in the
   same change (per the doc's maintenance section).
4. Re-run the smoke at `02-app/lib/llm/content/__smoke__/assemble-smoke.ts`
   against the affected content type to confirm.
