---
status: draft
source_type: collection
related_features: INP-12, INP-06
last_updated: 2026-05-04
default_authority: external-sample
chunking: item-children
graph_shape: source-collection
---

# Source-type fragment — collection

## Definition

A container source representing one ingestion of many sibling items, where each item is a piece of language (text, short-form content) rather than a structured row. Examples: 200 scraped tweets from a single influencer, a set of customer reviews of a product, a feedback corpus, a comment thread, a curated set of testimonials, a set of LinkedIn posts on a topic.

Distinct from `dataset` (structured CSV/JSON/parquet rows — those bypass the lens path entirely and ingest via `kg-ingest-creator` SKL-12 directly to the graph). The line is **structured rows** (dataset, no lens) vs **semantic items** (collection, lensed).

The collection itself is one `SourceCollection` graph node; each item is a `SourceItem` graph node linked via `PART_OF`. Each item has its own embedding. The collection has its own metadata (source URI, item count, date range).

Per the brief, the actual scraping/ingestion paths for collections (INP-06: web/social scraping) are not yet built. This fragment is forward-compatible — it describes how a collection should be lensed once the ingestion pipeline lands.

## Default surfaces (per ADR-009)

Sibling SourceItem children — each item is its own thing.

The lens reads collections at one of two levels:

1. **Item-level** when the user wants per-item extraction (e.g. surface-extraction across a review set: one `Idea` per review, treating each review as its own mini-source).
2. **Aggregate-level** when the user wants the collection read as a whole (e.g. pattern-spotting across 200 tweets to find recurring themes, content-ideas mining for what could become Ellie's content).

Most analysis lenses operate at the **aggregate level** — items are inputs to the synthesis, not individually extracted. `surface-extraction` operates at the item level.

## Likely participants

Many — typically one item per author (e.g. 200 tweets from one author, OR one author per review across many authors). The collection's metadata identifies the source(s) of authorship.

For author-aggregated collections (one influencer's tweets), the author is one `Person` node referenced by every item's `DERIVED_FROM` edge to the collection. For multi-author collections (a review set, a feedback corpus), each item may have its own author or be anonymised.

## Authority default + override guidance

Default `authority: external-sample` — most collections are pattern-only material (scraped tweets, sample feedback, competitor reviews). The user is reading the collection for *what patterns it shows*, not for *what claims it can support*.

Override to `external-authoritative` when the collection is functionally a body of citable evidence (e.g. a curated set of expert quotes, a published research-grade survey corpus). Rare but happens.

Override to `peer` for a collection of peer feedback Ellie has gathered (e.g. peer reviewers' comments on her work). Authority shifts because the contributors are peers.

Override to `own` only for collections of Ellie's own output (e.g. a corpus of her past tweets) — though this is a narrow case and may be better captured as a series of `internal-notes` or a single `report` depending on context.

## Prompt fragment

This source is a **collection** — a container of many sibling items, each item a piece of language. Tweets, reviews, feedback entries, comments, short-form posts. The collection has metadata (source URI, item count, date range); each item has its own text and embedding.

You will receive the collection in one of two framings depending on the lens:

1. **Item-level**: each `SourceItem` is presented as its own mini-source within the corpus. Extract per-item — one set of items per source. The source ids in `sourceRefs` are item-level (the item's UUID), not the collection's.
2. **Aggregate-level**: the collection is presented as one source with its items as the body. Extract from the collection as a whole, treating items as the evidence base. The source ids in `sourceRefs` are the collection's UUID; the lens output reflects collective patterns rather than per-item extraction.

The lens fragment will indicate which framing applies — read the lens prompt carefully.

For collections, **bias your reading toward patterns and aggregations**:

1. **Recurring themes across items.** What concerns, framings, or topics appear repeatedly? With what frequency? Patterns from many items are usually more valuable than any single item's content.
2. **Voice and register patterns** (especially for content-ideas and pattern-spotting on an influencer's tweets, a competitor's reviews, etc.). What does this body of language sound like? What moves recur? What positions does it stake?
3. **Outliers and tensions.** Within a collection that's broadly homogeneous, the items that *don't* fit the pattern are often the most interesting. A negative review in a sea of positives, a tweet that contradicts the influencer's usual line — flag these.
4. **Aggregate signals**, not anecdotes. A single feedback comment is one data point; the lens should surface the pattern, not promote one comment to a "finding". When extracting per-item (lens permitting), still maintain selectivity — a 200-item corpus does not need 200 extracted ideas.

For `external-sample` collections (the default), **do not treat any item as evidence of a fact**. A pattern across the collection is signal about *the source population* (e.g. "this influencer's audience reacts most to X-shaped framings"), not about *the world*. Surface this distinction in extraction text where relevant.

When the collection is from one identifiable author (e.g. one influencer's tweets), extract them as a `Person` node and treat the collection's voice as evidence of how that person communicates. This is high-value for content-creation work where the user wants to study a peer or competitor's public voice.

## Edge cases

- **Empty or near-empty collections**: rare — usually a scraping problem. Return short arrays. Flag in `unexpected[]`.
- **Collections with mixed-format items** (some text, some images, some links): for v1, the lens reads text only. Items that are purely visual (a tweet with only an image) yield nothing extractable until vision-capable ingestion lands; flag this as a known limitation.
- **Very large collections (1000s of items)**: the runtime should sample or chunk-retrieve before passing to the lens. Item-level lensing on 1000 items is unlikely to be meaningful; aggregate-level with retrieval-based input is the right shape. Lens output should reflect the sample, not pretend to have read everything.
- **Collections that are essentially one author over time**: the trajectory is itself signal — the lens may be applied chronologically (date-ordered items) for `pattern-spotting` or `self-reflective`-shaped reading. The lens fragment will indicate.
- **Collections that should have been datasets** (e.g. a "collection" of structured rows): if items are clearly schema'd data (rows with columns), the source-type is wrong — re-classify as `dataset` and route through `kg-ingest-creator` instead. Flag in `unexpected[]`.
- **Mixed-language collections**: per the brief, English-only for v1. Surface a warning if non-English content is significant.
