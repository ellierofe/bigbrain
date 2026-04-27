# Session log — 2026-04-20 — DNA-09 tone of voice setup
Session ID: 2026-04-20-dna09-tov-setup-v8p

## What we worked on
- DNA-09: Tone of voice system
- GEN-PROMPTS-01: Generation prompt design (ToV subset)
- UX-06: Tab and panel design consistency (backlog item added)

## What was done

### Writing samples seeded (14 total)
- Created `02-app/scripts/seed-tov-samples.mjs` — splits source files into individual samples and inserts into `dna_tov_samples`
- Source files: `04-documentation/reference/tov-samples/blogging.txt` (8 blog posts from Trivial Pursuit era), `04-documentation/reference/tov-samples/social-media.txt` (6 LinkedIn posts, NicelyPut era)
- Each sample has: formatType, subtype, body, analyst notes, source context

### ToV generation prompt built and run
- Created `02-app/scripts/generate-tov.mjs` — reads samples from DB, calls LLM with structured prompt, parses JSON, upserts `dna_tone_of_voice` record
- Prompt adapted from legacy `04-documentation/reference/legacy_prompts/tov-prompt.md` — redesigned to produce structured JSON matching schema (dimensions with scores + descriptions, vocabulary lists, linguistic notes, emotional resonance)
- Used Gemini Flash (Anthropic API key had insufficient credits)
- Base ToV record generated and saved (id: `464a65be-d3b7-4207-84e4-775f645fda18`)
- Humour score adjusted from 90 → 65 after review (humour serves the point, it's not the point itself)

### Data layer
- Created `02-app/lib/db/queries/tone-of-voice.ts` — getToneOfVoice, updateToneOfVoiceField, listSamples, createSample, updateSampleField, archiveSample, listApplications
- Created `02-app/app/actions/tone-of-voice.ts` — server actions for field-level autosave, dimensions, vocabulary, status, sample CRUD, data loader

### Review/edit UI
- Rewrote `02-app/app/(dashboard)/dna/tone-of-voice/page.tsx` — server component loading data
- Created `02-app/app/(dashboard)/dna/tone-of-voice/tone-of-voice-view.tsx` — two-column layout:
  - Left panel (w-64): voice summary (editable), language settings
  - Right panel with 4 tabs (BaseUI Tabs, line variant):
    - **Linguistics** — linguistic notes + emotional resonance (inline editable)
    - **Dimensions** — four sliders (0-100) with editable descriptions
    - **Vocabulary** — table with Use | Avoid | Notes columns, add/remove rows, overview field
    - **Samples** — table with format/preview/source columns, click to expand and edit, delete per row
- Vocabulary data model changed from `{ preferred: string[], avoid: string[], notes }` to `{ entries: [{ use, avoid, notes }], overview }` — backwards-compatible normalisation in the view

## Decisions made
- **Dimension scores are useful for relative positioning and drift detection, not for direct voice replication.** The descriptions, linguistic notes, and samples do the heavy lifting for generation. Scores kept for format-specific deltas, regeneration comparisons, and quick orientation.
- **Vocabulary should be specific word/phrase choices ("use X not Y"), not vocabulary pattern descriptions.** Pattern guidance ("prefer Anglo-Saxon over Latinate") belongs in linguistic notes or the vocabulary overview field, not in individual entries.
- **Gemini Flash used for generation** due to Anthropic API credit issue. Works well enough — can re-run with Claude when credits are topped up.
- **Model hierarchy clarified:** Anthropic (Claude) is primary for generation/analysis. Gemini 3.1 Pro is the standard fallback — not Flash. Flash is for legwork tasks only (classification, tagging, routing). Updated `generate-tov.mjs` to use Gemini Pro.

## What came up that wasn't planned
- **UX-06 raised:** Tab and left panel design inconsistencies found between audience segments and ToV pages. Filed as UX-06 in backlog, marked as blocker for all future DNA UI work (DNA-02 remaining, DNA-04, DNA-05, DNA-07). Needs DS-01 design system pass before more tabbed content is built.

## Backlog status changes
| Feature | From | To |
|---|---|---|
| DNA-09 | planned | in-progress |
| UX-06 | — | planned (new) |
| DNA-02 | in-progress | in-progress (added UX-06 dep) |
| DNA-04 | planned | planned (added UX-06 dep) |
| DNA-05 | planned | planned (added UX-06 dep) |
| DNA-07 | planned | planned (added UX-06 dep) |

## What's next
- **UX-06** — resolve tab/panel/label design before further DNA UI work. Run DS-01 design system skill to define canonical TabbedPane molecule, left panel pattern, and field label treatment. Apply to both audience segments and ToV pages.
- **DNA-09 remaining** — application deltas UI (per-format voice shifts), sample add UI (currently seed-only), regeneration flow (re-run generation from updated samples)
- **Top up Anthropic API credits** — needed for generation with Claude instead of Gemini
- **Vocabulary cleanup** — current generated entries are too literal (lists specific words from samples rather than brand vocabulary choices). Needs manual curation via the new table UI.

## Context for future sessions
- The generation scripts are standalone `.mjs` files in `02-app/scripts/` — they load `.env.local` manually and use raw SQL/fetch rather than the app's Drizzle/AI SDK layer. This is intentional for one-time operations.
- The vocabulary JSONB format changed — old `{ preferred, avoid, notes }` is normalised to new `{ entries, overview }` on read, and written back in new format on first save. No migration needed.
- `generate-tov.mjs` uses Gemini 3.1 Pro. Swap the API call to Anthropic when credits are available — the prompt is model-agnostic.
- **Model hierarchy:** Anthropic primary → Gemini 3.1 Pro fallback → Gemini Flash for legwork only. See `lib/llm/client.ts` MODELS constant.
