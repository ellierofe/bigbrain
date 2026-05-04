---
status: draft
source_type: client-interview
related_features: INP-12
last_updated: 2026-05-04
default_authority: peer
chunking: speaker-turn
graph_shape: source-document
---

# Source-type fragment — client-interview

## Definition

A structured conversation Ellie conducts with a client (or potential client) for a specific positioning, fundraising, or research engagement. Includes counsel calls, fundraising-prep interviews where Ellie interviews a founder, customer/market research interviews she runs as part of a client engagement, and structured podcast-style interviews she conducts as part of her work. Bounded by a project — there is a reason this conversation is being recorded.

Distinct from `peer-conversation` (collaborative, mutual) and `coaching-call` (the speaker is being coached, not consulted).

## Default surfaces (per ADR-009)

Quotes, objections, decision-criteria, pain-points, people, organisations.

The high-value categories: **direct quotes** (the client's exact words on the topics that matter — these become the raw material for content and pitch decks downstream), **objections** (what the client pushed back on, hesitated over, found unconvincing), **decision-criteria** (how this client evaluates options, who they listen to, what evidence persuades them), **pain-points** (the actual problems they're navigating, in their language not Ellie's reframing).

People and organisations matter — interviews surface the names of decision-makers, advisors, competitors, and reference customers in the client's orbit. These all need extracting and resolving against the existing graph.

## Likely participants

Two voices typically: Ellie (interviewer) and the client (interviewee). Sometimes a co-founder or team member joins. Speaker-turn chunking will name them.

The interviewee is the primary subject — most quotes, objections, pain-points come from them. Ellie's voice in these transcripts is questions and reflections; her contributions are usually scaffolding rather than knowledge. Don't promote her questions to extracted ideas unless they genuinely contain insight (sometimes they do — the framing of a question can be a useful concept on its own).

## Authority default + override guidance

Default `authority: peer` — these are collaborative conversations, mutually authored.

Override to `external-authoritative` when the interviewee is a recognised expert being interviewed for their authority (a sector analyst, a former government official, a published researcher). The client then becomes citable as evidence, not just as voice/pattern.

## Prompt fragment

This source is a **client-interview** — a structured conversation Ellie conducted as part of a client engagement (positioning, fundraising-prep, market research, or similar). One side is Ellie asking questions; the other side is the client (or research subject) providing the substance.

Bias your reading toward the **client's contributions, not Ellie's questions**. The client is the source of insight; Ellie's role is to elicit and probe. When extracting ideas, concepts, stories, or content angles, attribute them to the client — not to Ellie — unless the source genuinely shows Ellie introducing the idea.

The most valuable extractions from a client interview are usually:

1. **Direct quotes** — the client's exact words on what matters. These are gold for downstream content and pitch deck work. Use the `sourceQuote` field aggressively (where the lens schema includes it). Quote verbatim, never paraphrase.
2. **Objections and hesitations** — moments where the client pushed back, qualified, or expressed doubt. These often reveal the real decision dynamic better than the explicit answers. Capture the substance, not just "the client had reservations".
3. **Decision-criteria** — how this client evaluates options. Who they listen to, what evidence persuades them, what dismisses an argument. Extract as concepts when stable, as ideas when situational.
4. **Pain-points** — problems in the client's own language, not the consultant reframing. The exact phrase a client uses for a problem is often more useful than a more elegant formulation.
5. **People and organisations** — interviews surface names of decision-makers, advisors, competitors, references. Extract them all; canonical resolution happens in review.

Be careful with `confidence`: for client-interview sources, what the client *says* is `high` confidence as a record of what they said. Whether what they said is *true* about the world is a separate question that the lens cannot adjudicate. Mark items by what the source supports, not by your own judgement of the underlying claim.

## Edge cases

- **Multi-party interviews** (founder + co-founder, or a small team): treat all non-Ellie speakers as the "client side". Distinguish them in extracted items where possible (e.g. attribute a quote to the specific speaker).
- **Interviews where Ellie does most of the talking**: rare but happens, especially in pre-engagement scoping. The same rule applies — extract from substance, not volume. If the source genuinely doesn't yield much, return short arrays rather than padding.
- **Interviews about a third party** (e.g. Ellie interviews a former employee about their previous CEO): the third party is a `Person` to extract, but contextually — the interviewee is the source, not the subject.
- **Confidential / NDA-bound interviews**: the source is still ingested and lensed normally. Flagging for content use is downstream (content-creator UI shows authority + tags); the lens does not self-censor.
