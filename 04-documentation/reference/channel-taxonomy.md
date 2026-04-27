---
status: approved
last_updated: 2026-04-27
related_features: DNA-07, DNA-07b, DNA-08, DNA-09, OUT-02
authority: This is the source-of-truth vocabulary for category / channel / format. All schemas (`dna_platforms`, `dna_tov_samples`, `dna_tov_applications`, `dna_lead_magnets`, `content_types`) align to it.
---

# Channel taxonomy

A three-level model for talking about *where* content lives, *what kind of artifact* it is, and *what slot it occupies* in the brand's strategy. Everything in the system that needs to gate, group, or cascade based on platform-shaped concepts uses this vocabulary.

```
category   →  channel   →  format (format_type → subtype)
─────         ───────      ─────────────────────────────
```

Each level answers a different question:

- **`category`** — what's this channel's place in the business? Owned vs paid vs earned vs in-person vs relational. Drives UI grouping and helps the user mentally cluster their channels.
- **`channel`** — what is this thing specifically? `linkedin`, `podcast`, `partnership`, `hosted_event`. The canonical instance identifier — what `content_types.prerequisites.channels` and the OUT-02 picker locks gate on.
- **`format`** — what *shape* is the artifact? A LinkedIn carousel and a LinkedIn long post are both on the `linkedin` channel but have different format rules. Two columns: `format_type` (coarse cascade bucket) and `subtype` (canonical leaf). Drives ToV sample matching.

---

## Why three levels (not one)

Earlier iterations of the schema collapsed these into a single `platform_type` column with values like `social`, `audio`, `email`. That broke as soon as we needed to:

1. **Gate prerequisites at the right granularity** — "Podcast brainstorm" needs a podcast channel, not just any audio platform. ("Does the user have a podcast set up?" must be answerable.)
2. **Group channels in UI** — owned content and social have different operational shapes; users want to see them clustered.
3. **Match ToV samples by artifact shape** — a podcast script and a YouTube to-camera script share format characteristics that a podcast and a podcast brainstorm do not.

Three levels let each axis answer its own question without conflating them.

---

## Level 1: `category`

Closed enum. Eight values.

| `category` | What it means | Strategic posture |
|---|---|---|
| `owned_real_estate` | Properties the brand fully controls and visitors come to deliberately. Not content per se — the foundational web surface. | Asset, not stream. Permanent. SEO and conversion. |
| `owned_content` | Content streams the brand produces and publishes on its own terms — not subject to a third-party algorithm. | Long-term audience build. Voice and depth. |
| `social` | Third-party social platforms where reach depends on an external algorithm and feed dynamics. | Distribution and visibility. Algorithm-aware. |
| `paid` | Spend-driven channels — money in, attention out. | Tactical, measurable, optimisable. |
| `earned` | Coverage, mentions, and appearances on other people's surfaces. The brand is a guest, not a host. | Authority transfer. Less control, higher trust. |
| `in_person` | Real-world surfaces — events the brand hosts, talks given, workshops led. | High-bandwidth, low-volume. Relationships and reputation. |
| `relationships` | Channels that are people-shaped, not content-shaped. Outbound, networking, partnerships. | Slow, compounding, conversation-led. |
| `other` | Escape hatch. Used when no category genuinely applies. Avoid by default. | — |

### Notes

- **Why split owned into two categories** — `owned_real_estate` (website, sales pages, newsletter) and `owned_content` (blog, podcast, YouTube channel) have different strategic shapes. Real estate is a permanent surface that *receives* visitors; content is a stream that *publishes* to subscribers. Both are owned, but they're operationally distinct.
- **Why `relationships` is its own category** — networking, partnerships, and referrals don't have content formats but they do have strategy, cadence, do-not-do rules, USP. The xlsx audit confirmed they belong in the same table as publishing platforms, but they don't fit `paid` / `earned` / `in_person`.
- **Newsletter is `owned_real_estate`, not `owned_content`** — because the email list is an asset (the most owned thing in any business), not a content stream. The *content* that goes in newsletters is described at format level. Open question: revisit if this feels wrong in practice.

---

## Level 2: `channel`

Closed enum, scoped per-category. With explicit `other` as the escape hatch.

### `owned_real_estate`

| `channel` | Examples |
|---|---|
| `website` | Marketing site, About page, Services page |
| `sales_page` | Long-form sales pages for offers |
| `newsletter` | Email list / mailing list |
| `other` | — |

### `owned_content`

| `channel` | Notes |
|---|---|
| `blog` | Written long-form on the brand's own site |
| `podcast` | Brand's own audio show |
| `youtube_channel` | Used when YouTube is treated as a long-form content destination, not a social feed. See "YouTube duplication" below. |
| `online_course` | Self-paced courses on the brand's own platform |
| `other` | — |

### `social`

| `channel` | Notes |
|---|---|
| `linkedin` | Personal or company LinkedIn |
| `instagram` | |
| `x` | (Twitter) |
| `tiktok` | |
| `facebook_profile` | Personal Facebook profile used for business |
| `facebook_page` | Business Facebook page |
| `facebook_group` | Operationally distinct — community-shaped |
| `threads` | |
| `pinterest` | |
| `reddit` | |
| `youtube_social` | When YouTube is treated as a Shorts-first feed, not a long-form destination |
| `substack_social` | Notes / social side of Substack (the publication itself is `newsletter`) |
| `other` | — |

### `paid`

| `channel` | Notes |
|---|---|
| `google_ads` | |
| `social_ads` | Paid ads run on any social platform |
| `print_ads` | |
| `sponsorship` | Event or product sponsorship |
| `other` | — |

### `earned`

| `channel` | Notes |
|---|---|
| `press_feature` | Coverage in press / industry publications |
| `press_interview` | Interview-led press |
| `guest_podcast` | Appearing on someone else's podcast |
| `panel_appearance` | Talks/panels at industry/audience events you didn't host |
| `csr_project` | CSR-style brand-credit work |
| `other` | — |

### `in_person`

| `channel` | Notes |
|---|---|
| `hosted_event` | Events the brand runs |
| `talk_or_keynote` | Solo talks given by the brand |
| `workshop` | Workshops the brand runs (live or virtual but synchronous) |
| `networking` | Conferences, meetups, IRL networking — channel-shaped because of cadence + strategy |
| `other` | — |

### `relationships`

| `channel` | Notes |
|---|---|
| `cold_outreach` | Outbound DM / email to specific people |
| `partnership` | Formal partnerships with other brands or individuals |
| `referral_scheme` | Formal, commission- or reward-based referrals |
| `client_referral` | Existing-client referrals (organic) |
| `word_of_mouth` | Untracked organic referrals — strategic if cultivated |
| `other` | — |

### `other`

| `channel` |
|---|
| `other` |

### YouTube duplication

YouTube intentionally appears as two distinct channels — `youtube_channel` (`owned_content`, long-form posture) and `youtube_social` (`social`, short-form feed posture). They are operationally different: long-form has scripts, episodes, SEO; Shorts is feed-shaped. The user picks which lens they're operating in when they create the row. Documented duplication, not an accident.

---

## Level 3: `format` — `format_type` + `subtype`

Two columns. `format_type` is a coarse cascade bucket (used for ToV sample matching with fallback). `subtype` is the canonical leaf (preferred match when available).

### `format_type` (cascade bucket)

| `format_type` | Notes |
|---|---|
| `social_short` | Short text-led posts. LinkedIn post, X post, threads post. |
| `social_visual` | Visual-first formats. Carousels, reels, stories, TikTok, IG posts. |
| `blog` | Long-form written editorial. |
| `newsletter` | Email-list editorial. |
| `email` | Transactional, nurture, broadcast email. |
| `sales` | Sales-led copy: sales pages, sales emails, DM pitches. |
| `spoken_audio` | Podcast scripts, voiceovers, audio brainstorms. |
| `spoken_video` | To-camera scripts, video reels, video interviews. |
| `ad_copy` | Paid ad copy across formats. |
| `event` | Talk outlines, workshop briefs, panel prep. |
| `outreach` | Cold DMs, partnership pitches, referral scripts. |
| `brainstorm` | Idea-generation outputs (not finished artifacts). |
| `other` | — |

### `subtype` (canonical leaf)

Authoritative subtype values — not exhaustive, but the canonical set new content types should match against where possible.

| `subtype` | `format_type` | Channels where typical |
|---|---|---|
| `linkedin_post` | `social_short` | `linkedin` |
| `linkedin_carousel` | `social_visual` | `linkedin` |
| `linkedin_article` | `blog` | `linkedin` |
| `instagram_caption` | `social_short` | `instagram` |
| `instagram_carousel` | `social_visual` | `instagram` |
| `reel` | `social_visual` | `instagram`, `tiktok`, `youtube_social` |
| `story` | `social_visual` | `instagram`, `facebook_profile` |
| `x_post` | `social_short` | `x` |
| `threads_post` | `social_short` | `threads` |
| `tiktok_video` | `social_visual` | `tiktok` |
| `pinterest_pin` | `social_visual` | `pinterest` |
| `reddit_post` | `social_short` | `reddit` |
| `blog_post_long` | `blog` | `blog` |
| `blog_post_short` | `blog` | `blog` |
| `field_note` | `blog` | `blog` |
| `essay` | `blog` | `blog`, `newsletter` |
| `newsletter_issue` | `newsletter` | `newsletter` |
| `newsletter_short` | `newsletter` | `newsletter` |
| `nurture_email` | `email` | `newsletter` |
| `transactional_email` | `email` | `newsletter` |
| `broadcast_email` | `email` | `newsletter` |
| `sales_page` | `sales` | `sales_page` |
| `sales_email` | `sales` | `newsletter` |
| `dm_pitch` | `sales` | various social |
| `podcast_script` | `spoken_audio` | `podcast` |
| `podcast_brainstorm` | `brainstorm` | `podcast` |
| `voiceover` | `spoken_audio` | `podcast`, `youtube_channel` |
| `to_camera_script` | `spoken_video` | `youtube_channel`, `youtube_social` |
| `interview_prep` | `spoken_video` | `guest_podcast`, `press_interview` |
| `reel_script` | `spoken_video` | `instagram`, `tiktok` |
| `search_ad` | `ad_copy` | `google_ads` |
| `display_ad` | `ad_copy` | `google_ads` |
| `social_ad_copy` | `ad_copy` | `social_ads` |
| `talk_outline` | `event` | `talk_or_keynote`, `panel_appearance` |
| `workshop_brief` | `event` | `workshop`, `hosted_event` |
| `panel_prep` | `event` | `panel_appearance` |
| `cold_dm` | `outreach` | `cold_outreach` |
| `partnership_pitch` | `outreach` | `partnership` |
| `brainstorm_topic` | `brainstorm` | any |
| `brainstorm_platform` | `brainstorm` | any |
| `other` | `other` | — |

`subtype` is **not** a closed enum at the database level — new content types may introduce new subtypes. But the canonical set above is the preferred vocabulary; new values should follow the naming convention (`{channel_or_context}_{form}`) and be added to this doc when they prove out.

### ToV cascade

The ToV sample matching cascade (per `01-design/content-creation-architecture.md`):

1. Match by `subtype` exactly (if generation context supplies one)
2. Fall back to `format_type` (cascade bucket)
3. Fall back through documented cross-bucket hops where shape is similar:
   - `brainstorm` → `blog` (brainstorm output reads like prose)
   - `spoken_audio` → `spoken_video` and vice versa (script structure transfers)
   - `event` → `blog` (talk outlines are essay-like)
   - `outreach` → `email` (DM rhythm transfers)
4. Fall back to most-recent `isCurrent` sample on the same `format_type`

---

## Lead magnet types — separate dimension

Lead magnets are not channels. They're *kinds of asset* that get distributed via channels. They live in `dna_lead_magnets.kind` with their own closed vocabulary:

| `kind` | Notes |
|---|---|
| `guide` | Written long-form guide |
| `ebook` | Book-length asset |
| `checklist` | Action-oriented list |
| `template` | Fillable structure |
| `worksheet` | Active task / exercise |
| `swipe_file` | Reusable copy / examples |
| `quiz` | Assessment with scored output |
| `assessment` | Diagnostic without quiz framing |
| `calculator` | Interactive numerical tool |
| `tool` | Other interactive software tool |
| `webinar` | Live or recorded presentation |
| `workshop` | Live participatory session |
| `masterclass` | Higher-tier educational session |
| `video_series` | Multi-part video |
| `mini_course` | Multi-part structured learning |
| `email_course` | Multi-part email-delivered learning |
| `report` | Research report |
| `whitepaper` | Industry-shaped report |
| `case_study` | Single case deep-dive |
| `free_consult` | Consultative call as the offer |
| `audit` | Diagnostic deliverable |
| `free_chapter` | Sample of a paid asset |
| `challenge` | Time-bound participation programme |
| `community_access` | Free community as the lead asset |
| `other` | — |

**Why separate from channels:** lead magnets are produced on one channel and promoted on others. A webinar (lead magnet kind) is *delivered* via `hosted_event` (channel) and *promoted* via `linkedin` + `newsletter` (channels). Conflating them would lose this separation.

---

## How `content_types.prerequisites` uses this

`prerequisites` is a structured object expressing what must exist before a content type unlocks in the picker:

```jsonc
{
  "channels": ["podcast"],          // dna_platforms with channel='podcast' AND is_active=true must exist
  "lead_magnets": ["webinar"],      // dna_lead_magnets with kind='webinar' AND status='active' must exist
  "dna": ["tov", "audience"]        // singular DNA records / plural-with-rows must exist
}
```

All three keys are optional. Empty / omitted = no requirement on that dimension.

For singular DNA records (tov, brand_meaning, value_proposition, business_overview, brand_identity), the gate is "row exists with non-default content." For plural DNA tables (audience, offers, knowledge_assets), the gate is "≥1 active row exists." For channels, "≥1 active row with the matching `channel` value." For lead magnets, "≥1 active row with the matching `kind`."

---

## Per-category field relevance on `dna_platforms`

`dna_platforms` is one table holding all categories. Many fields are channel-shape-specific. The schema keeps them all nullable; the UI hides what doesn't apply by category.

| Field | `owned_real_estate` | `owned_content` | `social` | `paid` | `earned` | `in_person` | `relationships` |
|---|---|---|---|---|---|---|---|
| `name` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `handle` | URL | URL | handle | account ID | URL | event URL | (n/a) |
| `primaryObjective` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `audience` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `contentStrategy` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `postingFrequency` | (n/a) | ✓ | ✓ | (cadence) | (cadence) | (cadence) | (cadence) |
| `contentFormats` | (n/a) | ✓ | ✓ | ad formats | (n/a) | (n/a) | (n/a) |
| `characterLimits` | (n/a) | (n/a) | ✓ | ad limits | (n/a) | (n/a) | (n/a) |
| `hashtagStrategy` | (n/a) | (n/a) | ✓ | (n/a) | (n/a) | (n/a) | (n/a) |
| `engagementApproach` | ✓ | ✓ | ✓ | (n/a) | ✓ | ✓ | ✓ |
| `customerJourneyStage` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `growthFunction` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `subtopicIdeas` | (n/a) | ✓ | ✓ | (n/a) | ✓ | ✓ | (n/a) |
| `structureAndFeatures` | (n/a) | ✓ | ✓ | (n/a) | (n/a) | ✓ | (n/a) |
| `analyticsGoals` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `doNotDo` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| `usp` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

`(n/a)` = field is not meaningful for this category and the UI hides it. The DB stays permissive (all fields nullable) — soft validation only. Some `relationships` and `in_person` channels (e.g. cold outreach, networking) will surface real-world needs the current field set doesn't cover yet (sequence templates, partner CRM data, follow-up cadence). When that happens, decide between adding nullable columns or splitting into a new table — don't pre-build.

---

## Maintenance rules

1. **Adding a new `channel`:** approved by editing this doc *and* updating the `categoryHasField` lookup in code. PR title prefix: `taxonomy:`.
2. **Adding a new `subtype`:** add to this doc when used in ≥2 places (a content type plus a sample, say). One-off subtypes don't need to be canonical.
3. **Adding a new `category`:** require strong justification — a category change cascades into UI grouping, prerequisite shape, and per-category field relevance. Don't do this lightly.
4. **`platformType` (legacy column on `dna_platforms`)** — deprecated. Kept only for backwards compatibility during the DNA-07b migration. Do not introduce new code that reads it.
