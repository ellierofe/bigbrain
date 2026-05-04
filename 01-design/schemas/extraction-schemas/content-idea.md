---
status: draft
source_type: content-idea
related_features: INP-12
last_updated: 2026-05-04
default_authority: own
chunking: paragraph
graph_shape: source-document
---

# Source-type fragment — content-idea

## Definition

A quick capture of a content seed — an angle, a hook, a fragment of an argument, a half-formed post, a reaction to something that could become content. Distinct from `internal-notes` (broader thinking, may or may not be content-bound) by being **specifically aimed at content from the moment of capture**. Examples: a voice note while walking ("there's a post in the way founders treat fundraising research as the slow option"), a paragraph drafted in response to a news event, a fragment captured on the phone before bed.

Often very short — a sentence, a paragraph, a few lines. Sometimes more developed — a full draft argument awaiting publication. Always Ellie's own.

Distinct from `internal-notes` (general thinking) and `report` (finished output). Sits in between.

## Default surfaces (per ADR-009)

Content angles, formats, hooks.

The high-value categories: **content angles** (the specific framing or argument the seed is gesturing at — even when only partially articulated), **hooks** (the opening line, question, or framing that could anchor the piece), **formats** (when the seed implies a specific format — a thread, an essay, a post — capture it).

Content-idea sources are deliberately small and high-leverage: a 30-second voice note can produce one content angle that becomes a published piece. The lens output should match the source's shape — short, specific, unfinished.

## Likely participants

One voice: Ellie. Often a voice note with a single speaker, sometimes a typed fragment. No multi-party content-idea sources by definition (those would be `peer-conversation` or `meeting-notes`).

## Authority default + override guidance

Default `authority: own` — definitionally correct.

Do not override.

## Prompt fragment

This source is a **content-idea** — a quick capture of a content seed in Ellie's own voice. Always short, often unfinished, specifically aimed at becoming content (a post, an essay, a thread, a talk). Single-author, paragraph-chunked when typed, or one chunk when a single voice note.

Bias your extraction:

1. **Don't smooth or expand.** A content-idea source is valuable *because* it captured a fragment in Ellie's actual voice. Resist rewriting the fragment into a fuller version — quote the fragment as-is, with its particular framing intact. The fragment's roughness is part of its content potential.
2. **Surface the angle even when only partially articulated.** A content-idea often contains the *gesture toward* an angle without the angle itself fully formed. Capture what's gestured at — but flag with `medium` or `low` confidence and surface the under-articulation. "Ellie sketches an angle around X but doesn't fully articulate the through-line" is more useful than promoting an under-formed thought to a confident extraction.
3. **Hooks are gold.** When the seed includes an opening line, a question, or a punchy framing, capture it as a hook. These are the highest-leverage extractions from this source type — a hook in Ellie's voice is the hardest part of content production to automate.
4. **Format hints.** When the seed implies a specific format ("there's a thread here", "this is a long essay", "this is a 30-second LinkedIn post"), capture the format with the angle.
5. **Skip everything that isn't content-bound.** Content-idea sources are narrow — they're for content. Don't extract methodologies, people (unless central to the angle), or general concepts. Stay in the lane.

The lens output for a single content-idea source is almost always **short**. One angle, maybe one hook, possibly a format suggestion. Empty arrays for everything else is the right shape.

When the seed contains a **reaction to something specific** (a news event, an article, a peer's post, a client moment), capture what it's reacting to — the reaction is the angle, but the trigger gives it a anchor for retrieval and content generation. "Ellie reacts to [specific event/article] with the framing X" is the right shape.

## Edge cases

- **Very short captures** (single sentence, fragment): expected. Return a single angle and possibly a hook; everything else empty. Don't pad.
- **Captures that turned into a full draft**: when the seed has been developed into a near-complete piece, the source-type is borderline — could be `content-idea` or `internal-notes`. Default to `content-idea` if it's still aimed at content; `internal-notes` if it's broader thinking that touched on a content possibility. The user re-classifies at triage.
- **Captures reacting to private material** (e.g. a thought about a client engagement that could become a generic post): extract the angle in its abstract form. Note the private trigger only if relevant to the angle's substance — usually it isn't.
- **Captures that are explicitly off-the-record / not for publication**: still extract the angle; the sharing decision is downstream. The lens does not self-censor.
- **Sets of multiple seeds in one source** (e.g. a "content brain dump" with 8 different angles): each angle is extractable; expect 5–10 items rather than 1. Treat the source as content-rich rather than the typical short-capture shape.
- **Dated or time-sensitive content seeds** (reactions to news that's now old): extract as written, mark with the source date. Downstream content generation can decide whether the seed is still timely.
