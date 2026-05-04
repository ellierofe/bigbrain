---
status: draft
source_type: internal-notes
related_features: INP-12
last_updated: 2026-05-04
default_authority: own
chunking: paragraph
graph_shape: source-document
---

# Source-type fragment — internal-notes

## Definition

Ellie's own thinking, captured in writing or voice for her own use. Memos, jotted thoughts, draft thinking, voice notes captured to herself, working documents she's developing for her own clarity. The defining frame is **single-author, own voice, internal**: she's the only contributor, and the material is for her own thinking, not yet shaped for anyone else.

Distinct from `report` (a finished or near-finished output), `content-idea` (a quick capture specifically aimed at content), and `coaching-call` (dialogue with a coach about her thinking).

## Default surfaces (per ADR-009)

Ideas, content angles, plans.

The high-value categories: **ideas** (her own working thoughts — often more candid than what appears in client work or content), **content angles** (sketches of arguments, framings, hot takes that may become public material), **plans** (operational thinking about how to approach a piece of work, a project, a quarter).

Internal notes often contain the **earliest, most candid** version of an idea — before it's been polished for an audience. This makes them disproportionately valuable for understanding Ellie's own thinking trajectory and for content creation that needs her authentic voice.

## Likely participants

One voice: Ellie. No speaker turns; chunking is per paragraph.

Voice notes that are technically transcribed (so they have a "speaker" label) still belong here — there's no second speaker, and the material is internal.

## Authority default + override guidance

Default `authority: own` — definitionally correct.

Do not override. If a note is co-authored or contains substantive contributions from someone else, it's not internal-notes — it's likely `peer-conversation` (if conversational) or `meeting-notes` (if structured).

## Prompt fragment

This source is **internal-notes** — Ellie's own thinking, written or voice-noted, for her own use. Single-author, in her own voice, often unpolished. The earliest version of ideas that may later become content, strategy, or client work.

Bias your extraction:

1. **Ideas in their earliest form.** Internal notes often capture an idea before it's been refined for an audience — that early version is sometimes more useful than the polished one. Extract ideas with their working roughness intact; resist smoothing them.
2. **Voice and register.** Notes in Ellie's own voice are the canonical material for content generation downstream. Where the source has a sharp phrase, a particular framing, or a characteristic move, capture it verbatim in `sourceQuote` (where the lens schema permits) or quote it in the item's text.
3. **Content angles** are usually high-density in internal notes — Ellie often uses the format to test arguments and hooks. Extract liberally. Cross-reference with the `content-ideas` lens later if running it.
4. **Plans** — operational thinking about how to approach work. Extract substantively (what the plan is, what it depends on, what trade-offs it's making) but skip pure to-do material.
5. **Drafts and fragments**: notes often contain incomplete thoughts. A half-formed idea is still extractable if it's specific enough to be useful — but mark `medium` or `low` confidence and capture what's actually there, not what you imagine the complete version would be.

Be careful with **inference**. Internal notes are sometimes elliptical (Ellie writes shorthand for herself). Do not expand the shorthand into things she didn't actually write. If a note says "the Q3 thing is going to need a different angle", do not invent what "the Q3 thing" is — capture the observation as-is and mark `low` confidence.

Internal notes are also where Ellie's most candid takes on people, organisations, and situations sometimes appear. Extract these as written, but be aware that downstream content use should respect privacy — the lens does not self-censor, but the user reviewing each item will make calls about what's appropriate to surface in public material.

## Edge cases

- **Voice notes that are mostly stream-of-consciousness**: chunking by paragraph still applies. Expect uneven extraction — some chunks yield substance, others don't. Return what's there.
- **Notes that reference a private project or relationship by initials or codename**: extract as written. Don't try to expand initials into full names. The user knows what they refer to.
- **Notes that are partially structured** (e.g. start with bullets, end as prose): treat as one source. Chunking adapts.
- **Notes that summarise a conversation Ellie had** (e.g. she comes out of a meeting and writes notes about it): these are still `internal-notes` if the source is *her notes*, not the meeting transcript. The notes carry her interpretation, which is the point. Distinct from `meeting-notes` (the actual transcript).
- **Notes that turn into content drafts**: when a note has clearly become a draft of a public piece, it may belong in a separate type (a future `draft` type isn't planned). For v1, treat as `internal-notes`; downstream content creation can use it as voice-source material.
