# Platforms Brief
Feature ID: DNA-07
Status: complete
Last updated: 2026-04-23

## Summary

Platform strategies define how the brand shows up on each channel — LinkedIn, podcast, newsletter, YouTube, or any other platform. Each record captures the strategic rationale, content formats, structural conventions, and constraints specific to that platform. This data feeds directly into the content creator (OUT-02): when generating content for a platform, the system applies the right formats, limits, tone, and strategy automatically. Follows the established `dna-plural-item` pattern from DNA-03.

---

## Use cases

- **Create a new platform** — via modal with guided conversation (same pattern as GEN-01 audience segment generation). User provides the platform name and type; system asks targeted questions about objectives, audience, formats, and strategy; LLM generates a complete platform strategy record using Brand DNA context. Manual "save without generating" escape hatch for seed data.
- **View all platforms** — card grid showing platform name, type badge, primary objective snippet, active/inactive indicator. Click to open detail view.
- **View/edit a platform** — two-column detail view (left sticky panel + tabbed content). Inline editing with autosave on blur.
- **Archive a platform** — soft delete. Archived platforms visible where referenced but not selectable for new content. Cannot archive last active platform.
- **View archived platforms** — toggle on list view, shown in muted state.
- **Manage content formats** — structured editor within the detail view to add, edit, remove, and reorder format entries (e.g. "Text post", "Carousel", "Interview episode").
- **Manage subtopic ideas** — structured editor for subtopic clusters with example content ideas.

---

## User journey

### List view (card grid)

1. User navigates to `/dna/platforms/cards`
2. Card grid of all active platforms — platform name, `platformType` badge (social / email / owned_content / video / audio / other), primary objective snippet (2-line clamp), active indicator
3. Top-right: "New platform" button → opens creation modal
4. Click any card → opens detail view
5. "Show archived" toggle at bottom

### Creation modal — guided conversation path

Same pattern as GEN-01 (audience segment generation):

1. Modal opens. Path selection: "Answer questions" (active) | "Generate from document" (disabled, coming soon)
2. **Step 1 — Identity**: Platform name (required), platform type (required, select from: social, email, owned_content, video, audio, other), handle/URL (optional)
3. **Step 2 — Strategy context**: "What is this platform for?" (required — maps to `primaryObjective`), "Who's the audience here?" (optional — maps to `audience`)
4. **Step 3 — Evaluation + follow-ups**: System evaluates whether it has enough to generate. If not, asks targeted follow-ups (format preferences, posting cadence, growth goals, what works/doesn't).
5. **Generating state**: Spinner, "This takes about 30 seconds", cancel button
6. On success: redirect to detail view of newly created platform
7. On error: retry button

**Generation scope**: The LLM generates all strategy fields (`contentStrategy`, `postingFrequency`, `customerJourneyStage`, `growthFunction`, `usp`, `engagementApproach`, `hashtagStrategy`) plus `contentFormats`, `subtopicIdeas`, `structureAndFeatures`, `characterLimits`, `doNotDo`, and `analyticsGoals`. Uses Brand DNA context (business overview, value prop, audience segments, tone of voice) to inform the output.

**Manual escape hatch**: "Save without generating" — saves name + type + any entered fields directly. Hidden/subtle, not primary CTA. For seed data or cases where the user wants to fill in manually.

### Detail view

**Left sticky panel** (always visible):
- Platform name (editable inline)
- Platform type badge (not editable — set at creation)
- Handle/URL (editable inline)
- Active/inactive toggle
- Primary objective (editable inline, textarea)

**Tab 1 — Strategy**:
Sections via InPageNav:
- **Audience & positioning**: `audience` (textarea), `customerJourneyStage` (select), `usp` (textarea)
- **Content approach**: `contentStrategy` (textarea), `postingFrequency` (input), `growthFunction` (textarea)
- **Engagement**: `engagementApproach` (textarea), `hashtagStrategy` (textarea — hidden if platformType is audio/video/owned_content)

**Tab 2 — Formats & output**:
Sections:
- **Content formats**: Expandable card list editor (see below)
- **Content structure & features**: `structureAndFeatures` editor — `contentStructure` (textarea), `signatureFeatures` (add/remove list), `brandedComponents` (add/remove list)
- **Constraints**: `characterLimits` (key-value editor with notes field), `doNotDo` (add/remove string list)

**Tab 3 — Ideas**:
- **Subtopic ideas**: Expandable card list — each card shows subtopic name, expand to see/edit example content ideas (add/remove strings)
- **Content pillar themes**: `contentPillarThemes` (textarea) — note: content pillars not yet built (DNA-06 parked), so this is a freeform field for now

**Tab 4 — Performance** (lightweight):
- `analyticsGoals` (textarea)
- `performanceSummary` (textarea)
- `notes` (textarea)

**Tab 5 — Related Content** (stub):
- "Coming soon — content created for this platform will appear here."

### Content formats editor (expandable card list)

Each format entry is a card:
- **Collapsed state**: Format name (bold) + frequency (muted, right-aligned) + chevron
- **Expanded state**: All fields editable:
  - Format name (input, required)
  - Description (textarea, 3 rows)
  - Character/duration limit (input, number — label adapts: "Character limit" for text platforms, "Duration limit" for audio/video)
  - Best for (tag-style input — comma-separated or chip input, stored as string array)
  - Frequency (input)
- **Actions**: Delete button (with confirm), drag handle for reorder
- **Add button**: At bottom of list, adds a new expanded empty card
- **Save**: Each card saves its full format object on blur of any field within it (debounced). The entire `contentFormats` array is written as a single JSONB update.

Same expandable card pattern for `subtopicIdeas` (subtopic name + examples list) and `signatureFeatures` (name + description).

### Autosave behaviour

Same as audience segments:
- All InlineField values: save on blur, 500ms debounce
- JSONB structured editors (formats, subtopics, etc.): save full object on blur of any child field
- Subtle "Saved" indicator near field, fades after 2s
- Error: "Save failed — try again" inline

---

## Data model / fields

All fields map to existing `dna_platforms` table (migration 0006). No new DB changes needed.

**Left panel fields:**
| Field | DB column | Type | Required | Notes |
|---|---|---|---|---|
| Platform name | `name` | varchar(100) | Yes | |
| Platform type | `platform_type` | varchar(50) | Yes | social \| email \| owned_content \| video \| audio \| other |
| Handle/URL | `handle` | varchar(200) | No | Profile URL, feed URL, publication URL |
| Active | `is_active` | boolean | Yes | Default true |
| Primary objective | `primary_objective` | text | No | |

**Strategy tab fields:**
| Field | DB column | Type | Notes |
|---|---|---|---|
| Audience | `audience` | text | Platform-specific audience context |
| Customer journey stage | `customer_journey_stage` | varchar(50) | awareness \| engagement \| conversion \| delight_advocacy |
| USP | `usp` | text | What makes this brand's presence distinct here |
| Content strategy | `content_strategy` | text | Overall approach |
| Posting frequency | `posting_frequency` | varchar(100) | e.g. "3x per week" |
| Growth function | `growth_function` | text | How this platform grows the business |
| Engagement approach | `engagement_approach` | text | Comments, DMs, community |
| Hashtag strategy | `hashtag_strategy` | text | Conditionally shown |

**Formats & output tab — JSONB fields:**
| Field | DB column | Type | Notes |
|---|---|---|---|
| Content formats | `content_formats` | jsonb | Array of format objects (see schema doc) |
| Structure & features | `structure_and_features` | jsonb | Single object with signatureFeatures, contentStructure, brandedComponents |
| Character limits | `character_limits` | jsonb | Key-value with notes |
| Do not do | `do_not_do` | text[] | Array of strings |

**Ideas tab:**
| Field | DB column | Type | Notes |
|---|---|---|---|
| Subtopic ideas | `subtopic_ideas` | jsonb | Array of {subtopic, examples[]} |
| Content pillar themes | `content_pillar_themes` | text | Freeform until DNA-06 is built |

**Performance tab:**
| Field | DB column | Type | Notes |
|---|---|---|---|
| Analytics goals | `analytics_goals` | text | What metrics matter |
| Performance summary | `performance_summary` | text | What's working |
| Notes | `notes` | text | Anything else |

**Not displayed (future):**
| Field | DB column | Notes |
|---|---|---|
| Content pillar IDs | `content_pillar_ids` | Deferred until DNA-06 |
| Sort order | `sort_order` | Deferred |

---

## Update behaviour

**Freely editable** — fields can be edited at any time without versioning. `updated_at` is refreshed on every save. No history table. Same rationale as audience segments.

---

## Relationships

### Knowledge graph (FalkorDB)
Not in scope for this build. Platforms don't currently map to a graph node type in ADR-002. If needed in future, would be a new node type or a property on existing nodes.

### Postgres
- `dna_platforms.brand_id` → `brands.id` (cascade delete)
- `dna_platforms.content_pillar_ids` → `dna_content_pillars.id` (future, when DNA-06 is built)
- Informs `dna_tov_applications` — each platform should have a corresponding ToV application record (future link)
- Referenced by content creator (OUT-02) as a generation parameter

---

## UI/UX notes

Template match: `dna-plural-item` (established by DNA-03 audience segments).

Delta from template:
- **Left panel**: Platform type badge (not editable) + active toggle instead of avatar
- **5 tabs** instead of 3 (Strategy, Formats & Output, Ideas, Performance, Related Content)
- **Structured JSONB editors**: Expandable card list pattern for `contentFormats`, `subtopicIdeas`, `signatureFeatures`. New molecule: `ExpandableCardList`.
- **Conditional field visibility**: `hashtagStrategy` hidden for audio/video/owned_content platform types
- **Key-value editor**: For `characterLimits` JSONB. New molecule: `KeyValueEditor`.
- **String list editor**: For `doNotDo` and `brandedComponents`. New molecule: `StringListEditor`.

Full layout spec: `01-design/wireframes/DNA-07-layout.md` (approved 2026-04-23)
Template file: `01-design/wireframes/templates/dna-plural-item-template.md` (existing)

---

## Edge cases

- **Empty state (no platforms):** Full-page empty state — "No platforms yet. Add your first platform to define your channel strategy." with "New platform" CTA.
- **Single platform — no switcher shown:** Platform switcher only appears when 2+ active platforms exist.
- **Archive last active:** Disabled with tooltip: "You must have at least one active platform."
- **Platform type determines field visibility:** `hashtagStrategy` only shown for social platforms. `characterLimits` label adapts for audio/video ("Duration/format constraints" vs "Character limits"). Future: could conditionally show/hide more fields per type.
- **Long platform names:** Truncate in card view and switcher with ellipsis. Full name in sticky panel.
- **Content formats — empty list:** Show "No formats defined. Add your first content format." with add button.
- **Subtopic ideas — empty list:** Show "No subtopic ideas yet. Add a topic cluster to seed content generation."
- **Autosave failure:** Inline error near field. Do not block editing. Retry on next blur.
- **Duplicate platform name:** No hard constraint — warn but allow (user may have "LinkedIn (personal)" and "LinkedIn (company)").

---

## Out of scope (this build)

- Content pillar linking (DNA-06 is parked) — `contentPillarIds` field not displayed
- Sort order / drag-to-reorder platforms
- ToV application linking (viewing the ToV delta for this platform)
- Related Content tab content — stub only
- **Source document generation path** — creation modal currently only supports the "answer questions" path. A second path ("generate from document") should allow selecting/uploading source documents (e.g. existing platform strategy PDFs, content audits, analytics exports) that the LLM uses as context for generation. Same pattern as DNA-05 Knowledge Assets (phases 1-2: context path → source doc selection). The "Generate from document" card is stubbed as "Coming soon" in the modal.
- Platform-specific content preview (showing what generated content would look like on this platform)

---

## Open questions / TBDs

None — all decisions resolved.

---

## Decisions log

- 2026-04-23: Brief approved.
- 2026-04-23: Brief written. Follows dna-plural-item pattern from DNA-03. Generation flow follows GEN-01 pattern (guided conversation, LLM generates full record). Expandable card list chosen for contentFormats editor (compact when scanning, full detail when editing). hashtagStrategy conditionally hidden for non-social platforms. 5 tabs: Strategy, Formats & Output, Ideas, Performance, Related Content.
- 2026-04-24: Feature complete. Three new molecules established (ExpandableCardList, StringListEditor, KeyValueEditor). Gemini Pro + Claude Sonnet fallback for generation. Source doc generation path added (uses DNA-05 SourceDocPicker/SourceMaterialsTable). Sources tab added, making final tab count 6 (Strategy, Formats & Output, Ideas, Performance, Sources, Related Content stub). Migration 0020 added `source_document_ids uuid[]` column. InPageNav molecule updated to include its own sticky positioning (removed wrapper divs from 3 consumers). Modal sizing bug fixed in base Modal molecule (sm:max-w-* override). End-to-end tested: create, generate, edit, archive, switcher, source doc generation all working.
