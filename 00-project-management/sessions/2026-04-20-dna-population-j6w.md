# Session log — 2026-04-20 — DNA population + intake design
Session ID: 2026-04-20-dna-population-j6w

## What we worked on
- DNA-02: Singular DNA elements (data population + intake flow design)
- RET-01: Retrieval layer (context — understanding what data is needed to test retrieval)

## What was done

### DNA data population
Populated three singular DNA records for the NicelyPut brand directly in Neon:

- **`dna_business_overview`** — 1 record. All fields populated: business name, legal name, owner, vertical (fundraising and brand strategy consulting), specialism (hard tech sectors), business model, founding year (2020), geographic focus, stage, short description, full description, website, email, social handles.
- **`dna_brand_meaning`** — 1 record. Vision, mission, purpose statements + 5 values with behaviours. Status: active. Values: Strategy before story, Work in material reality, Create space for founders to think, Iterate don't promise magic, Put in the work together.
- **`dna_value_proposition`** — 1 record. Core statement, target customer, problem solved, outcome delivered, unique mechanism (diagnostic-first, 12-cell grid), 5 differentiators, 4 alternatives addressed (DIY, generalist agency, accelerator/VC, in-house hire), elevator pitch. Status: active.

### Intake flow design
Created `01-design/briefs/DNA-02-singular-dna-intake.md` — documents the conversational intake flows for all three singular DNA types, derived from the live session. Three flows:
1. Business overview — mostly form-fill, collaborative drafting for fullDescription only
2. Brand meaning — 4-stage conversational flow (problem → future → values through behaviour → draft statements last)
3. Value proposition — 5-stage flow (outcome → differentiation → alternatives → evidence integration → draft as package)

Added `## Intake design` cross-references to all three schema docs:
- `01-design/schemas/dna-business-overview.md`
- `01-design/schemas/dna-brand-meaning.md`
- `01-design/schemas/dna-value-proposition.md`

### Data audit
Ran a full count of all DNA and source knowledge tables. Current state:
- `dna_audience_segments`: 4 records
- `dna_business_overview`: 1 record (new)
- `dna_brand_meaning`: 1 record (new)
- `dna_value_proposition`: 1 record (new)
- `src_source_documents`: 67 records
- `graph_nodes`: 0, `graph_edges`: 0
- All other DNA and source tables: 0

## Decisions made
- Singular DNA intake flows must be conversational, not form-based. Brand meaning in particular requires a multi-stage question flow — asking "what's your mission?" directly produces unusable output. Ask about the problem and the future first, synthesise statements last.
- Values are actions, not adjectives — this is both a Nicely Put brand value and a design principle for the values intake flow.
- Intake design is UI-agnostic for now — could be standalone guided flows, chat recipes, or hybrid. Decision deferred to layout design phase.
- Business overview `fullDescription` was collaboratively drafted — system drafts from factual fields, user corrects. This pattern works well.
- Value proposition: "spend less time on fundraising" not "get funded faster" — can't promise funding outcomes, can promise reduced founder time burden.
- NicelyPut client stage range: Seed through Series B (not pre-seed — "pre-seed is a nightmare re funds").

## What came up that wasn't planned
Nothing — session was focused on DNA population as planned.

## Backlog status changes
No status changes — DNA-02 remains `planned` (we populated data but didn't build UI). The intake design document is new preparatory work for the DNA-02 build.

## What's next
Remaining DNA items to populate for retrieval testing (in priority order):
1. **Knowledge assets** — gives "what do I know about X?" queries something to find
2. **Offers** — connects audiences to outcomes
3. **Tone of voice** — needed before content generation works
4. Then: competitors, entity outcomes, platforms, brand intros

After DNA population: RET-01 build (brief approved 2026-04-20, current milestone M3).

## Context for future sessions
- The Neon project ID is `damp-boat-57321258` and the brand ID is `ea444c72-d332-4765-afd5-8dda97f5cf6f`.
- Graph nodes/edges are still at zero — no extractions have been committed to the graph yet (INP-11 analysis→graph commit not yet wired).
- The intake design document at `01-design/briefs/DNA-02-singular-dna-intake.md` should be referenced when building the DNA-02 UI — it captures tested conversational patterns, not theoretical ones.
- Ellie noted imposter syndrome during value proposition work — this is normal and the intake flow is designed to work through it rather than around it. Important context for the front-end UX.
