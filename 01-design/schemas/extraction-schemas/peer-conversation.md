---
status: draft
source_type: peer-conversation
related_features: INP-12
last_updated: 2026-05-04
default_authority: peer
chunking: speaker-turn
graph_shape: source-document
---

# Source-type fragment — peer-conversation

## Definition

An exchange between Ellie and a peer — another founder, strategist, advisor, or industry contact — where the conversation is mutual rather than directional. Both parties contribute substance; neither is being interviewed, coached, or sold to. Strategy chats, walking calls, post-event reflections, mutual-thinking sessions. The conversational equivalent of working a problem out together.

Per project memory, the most common contributors to this source type are Ross, Ray, and William — peer-strategy conversations that often surface ideas, content angles, and decisions that don't appear in any other type of source.

Distinct from `client-interview` (directional, work-bounded) and `coaching-call` (one-sided support work).

## Default surfaces (per ADR-009)

Ideas, decisions, mutual references, content angles.

The high-value categories: **ideas** (sharp formulations that emerge through the back-and-forth — usually richer than what either party would produce alone), **decisions** (commitments made or considered, often informally), **mutual references** (the people, books, frameworks, and prior conversations both speakers are drawing on — these are dense in peer talk), **content angles** (peer conversations are unusually generative for content because the back-and-forth surfaces what's actually interesting vs what's merely true).

The looseness of these conversations is part of their value. They're often the place where Ellie tries out an angle, a framing, or a critique before committing to it publicly. Extracted material from peer-conversation sources tends to be high-quality but unfinished — record it as it appears, in the speaker's actual voice.

## Likely participants

Two or occasionally three voices, all peers. Speaker-turn chunking will distinguish them.

Both sides contribute substance. Do **not** bias toward Ellie's contributions — peer conversations are mutual and the peer's ideas are often what makes the conversation valuable. Attribute extracted items to whoever said them. When an idea emerges through dialogue (not from one speaker), reflect that in the item's context (e.g. "developed across the exchange between Ellie and Ross — Ross introduces X, Ellie counters with Y, they land on Z").

When attributing to a named peer, extract them as a `Person` if not already present in the canonical register. The peer themselves becomes part of the graph and accumulates edges to ideas, content, and other people they've discussed.

## Authority default + override guidance

Default `authority: peer` — definitionally correct.

Do not override to `own` even when Ellie's contributions dominate. The peer's contribution is part of why the conversation produced what it did; flagging the source as `own` loses that. Do not override to `external-authoritative`; peer talk is conversational, not citable.

The one situation worth flagging: when a peer brings a specific piece of external evidence to the conversation (a data point, a published study, a verifiable claim), the *evidence* is `external-authoritative` — but the source remains `peer`. Extract the evidence as a separate item with appropriate `confidence` and `sourceQuote`; downstream content use should cite the original source the peer referenced, not the conversation.

## Prompt fragment

This source is a **peer-conversation** — a mutual exchange between Ellie and one or more peers (other founders, strategists, advisors). Both sides contribute substance. The conversation is loose and generative; it tries out ideas rather than concluding them.

Bias your extraction differently from client-interview or coaching-call sources: **both speakers are sources of insight here**. Attribute extracted items to whoever said them. When an idea is built through back-and-forth, reflect that in the item's text — "X emerges through the exchange between Ellie and the peer; Ellie introduces the question, Ross adds the counterexample, they land on Y" is more useful than picking one speaker's name to attach.

The most valuable extractions from a peer conversation:

1. **Sharp ideas** — formulations that landed because of the conversation, not despite it. Often richer than monologue. Capture them with the dialogue context that produced them.
2. **Tested angles and framings** — peer conversations are where Ellie tries out positions before publishing. Content angles, arguments, hot takes that surface here are content-creation gold; flag them as such.
3. **Mutual references** — the people, frameworks, and prior conversations both speakers reference. These are dense and high-value for graph connection. Extract people, organisations, and concepts liberally.
4. **Decisions** — peer conversations often produce informal decisions ("OK, I think I'm going to write the longer essay rather than the post") or surface decisions in flight. Extract these as commitments where applicable.
5. **Disagreements** — peers disagree productively. When the source shows a real disagreement (not just nuance), extract both sides and the substance of the tension. This is high-value material for `pattern-spotting` lenses run later.

Match the conversational register in extracted text where appropriate. If both speakers describe something using a casual or punchy phrase, the punchy phrase is often the right one to capture — it's the version with voice. The "neutral" rephrase loses signal.

## Edge cases

- **Conversations where the peer is also a client**: rare but happens (a peer who's also paying for advisory work). Default to `peer-conversation` if the conversation feels mutual; `client-interview` if it feels work-bounded. The user can override at triage.
- **Conversations that pivot from peer to coaching**: e.g. the peer asks about something that turns into a coaching moment for Ellie. Extract the substance of both halves; flag the pivot in `unexpected[]`. The user may want to re-classify or split.
- **Recorded with a third-party device** (walking calls, podcasts that aren't published): treat normally. Authority stays `peer`. Add a tag at triage if the user wants to distinguish.
- **Brief peer pings** (Slack-style exchanges, voice notes): these are still peer-conversation; chunking is per turn, even when turns are short. The lens decides whether the volume is enough.
