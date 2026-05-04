---
status: draft
source_type: supplier-conversation
related_features: INP-12
last_updated: 2026-05-04
default_authority: peer
chunking: speaker-turn
graph_shape: source-document
---

# Source-type fragment — supplier-conversation

## Definition

A working conversation with a supplier, vendor, or specialist contractor — Ellie discussing a piece of delivery work with the person doing it. Examples: technical decisions with Dimitris (Ellie's Project), scoping or kickoff calls with research suppliers, methodology discussions with specialist freelancers (designers, developers, illustrators, video producers).

The defining frame is **delivery focus**: this conversation exists because work is being done together. Distinct from `peer-conversation` (mutual, no delivery dependency) and `client-interview` (Ellie is the consultant, not the buyer).

## Default surfaces (per ADR-009)

Technical decisions, scope, deliverables, methodology, people.

The high-value categories: **technical decisions** (architectural choices, design decisions, methodology choices made or being weighed), **scope** (what is and isn't in this engagement, what trade-offs are being made), **deliverables** (what specific outputs are being produced and on what timeline), **methodology** (how the supplier works — their process, tools, approach — Ellie often picks up reusable methods from these conversations), **people** (suppliers introduce other contacts: their team, their network, sub-contractors).

These are practical, often technical conversations. Less often a source of strategic insight; more often a source of operational decisions and methodologies worth capturing for future similar work.

## Likely participants

Two voices typically: Ellie (buyer / commissioner) and the supplier. Sometimes a member of the supplier's team joins. Speaker-turn chunking will distinguish them.

Both sides contribute substance, but in different registers: the supplier brings domain expertise (they know how to build the thing), Ellie brings context (what the thing needs to achieve, who it's for, what constraints apply). Extract from both — the supplier's expertise often becomes a `Methodology` graph node Ellie can reference for future work.

## Authority default + override guidance

Default `authority: peer` — these are collaborative working conversations.

Override to `external-authoritative` when the supplier is being engaged for their domain expertise and the conversation is functionally an expert interview (e.g. a sector specialist consulted on methodology). The methodology and technical decisions then become citable evidence, not just operational record.

Do not override to `external-sample` — supplier conversations are not pattern-only material.

## Prompt fragment

This source is a **supplier-conversation** — a working conversation between Ellie and a supplier, vendor, or specialist contractor. The conversation exists because work is being delivered; it is practical and decision-oriented rather than exploratory.

Bias your extraction toward **operational and methodological substance**. The high-value extractions are usually:

1. **Technical decisions** — choices being made about how the work is done. Often phrased informally ("OK let's go with the React Native approach" / "we'll do qual interviews first then a quant pass"). Capture the decision and the reasoning if available — the reasoning usually matters more for future similar engagements.
2. **Scope and trade-offs** — what's in, what's out, what's being deferred, what's being added. These conversations often surface scope decisions that aren't documented elsewhere.
3. **Methodologies** — the supplier's approach to their work. How they research, how they build, how they validate. These are reusable across projects; extract as `Methodology` items where the description is substantive enough to apply elsewhere.
4. **People** — suppliers reference their team, their network, sub-contractors. Extract names; canonical resolution happens in review. These contacts compound over time as Ellie's working network.
5. **Deliverables and timelines** — what's being produced, by when. Useful for project synthesis later.

Be cautious about over-extracting **status and to-dos**. Supplier conversations often include status updates ("X is done, Y is blocked, Z next week") and concrete to-dos. These are operational state, not knowledge. Skip them unless the to-do reveals a constraint, decision, or methodology worth preserving. The lens output is for the knowledge graph; project management lives elsewhere.

When the supplier introduces a methodology (their approach, their framework, their process) and explains it substantively, extract as a `technique` / `Methodology` — even if it's not formally named. These are particularly high-value extractions for project-synthesis lenses run later.

## Edge cases

- **Conversations that are mostly status / no real substance**: return short arrays. Don't promote operational detail to extracted knowledge to fill the schema.
- **Long-running supplier engagements**: conversations late in an engagement often contain reflection ("here's what we learned, here's what we'd do differently"). These are high-value — flag in `unexpected[]` if they exceed the lens's frame.
- **Mixed supplier-and-peer relationships** (e.g. a supplier who's also a friend, a contractor who's also a peer Ellie discusses strategy with): default to `supplier-conversation` when the conversation is delivery-focused. Override to `peer-conversation` at triage if the conversation pivots away from delivery.
- **Multi-supplier calls** (e.g. Ellie + two suppliers from different companies coordinating): treat as `meeting-notes` rather than `supplier-conversation` if the conversation is genuinely cross-organisational.
