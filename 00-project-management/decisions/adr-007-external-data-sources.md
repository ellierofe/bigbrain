# ADR-007: External Data Sources Strategy

> Status: APPROVED
> Date: 2026-04-27
> Decides: Categories of external data to ingest into the knowledge graph, jurisdictional scope, prioritisation bias, ingestion principles for reports and structured datasets

---

## Context

BigBrain's knowledge graph (ADR-002) is being extended beyond Ellie's own inputs (interviews, research, documents) to incorporate external structured data. The first concrete trigger is a UK politics knowledge graph (~75K nodes, ~347K edges) covering MPs, donors, parties, policy positions, financial returns, polling, and constituencies. That graph is being audited and will be ported into BigBrain.

That port raises a wider question: what other external data sources should the graph incorporate? The analytical job BigBrain is being designed for is two things at once:

1. **Three-body analysis** — trace the path from policy → capital → companies → narrative for a given vertical
2. **Who's-who lookup** — fast structured queries about people, organisations, funding events, regulations

This ADR sets the strategy for external data ingestion: which categories, which jurisdictions, and what rules govern ingestion of report-style content.

---

## Decisions

### 1. Jurisdictional scope: UK + US + EU + Israel (Phase 2)

Four jurisdictions, with Israel scoped tightly.

| Jurisdiction | Rationale |
|---|---|
| **UK** | Home market; politics graph already centred here; Companies House and gov data are accessible and clean |
| **US** | Largest defence and deeptech capital pool; SBIR/DARPA/SEC data is free and high-quality; most narratives originate here |
| **EU** | CORDIS gives unique visibility into European deeptech research funding; regulatory differentiation matters for reshoring analysis |
| **Israel** | Outsized defence-tech founder pool, often under-represented in UK/US datasets; closes capital and acquisition loops that otherwise dangle |

**Israel scope is restricted** to: Israeli companies, founders, capital, and policy *as they intersect with the UK/US/EU innovation ecosystem*. Not Israeli domestic politics. Not the wider Middle East. The risk of scope creep is real and the constraint is deliberate.

**Israel is Phase 2** — added after the UK politics graph is cleaned and ported, and after the UK/US/EU starter sources are ingested.

### 2. Vertical bias: defence, robotics, reshoring (with overlaps embraced)

Initial ingestion biases toward defence + robotics + reshoring. Overlaps with adjacent verticals (climate, energy, biotech, space) are not forced into a primary category — the `Vertical` node type with `OVERLAPS_WITH` (no hierarchy) is designed for this. A company can `BELONGS_TO` defence + robotics + dual-use simultaneously.

**Practical implication:** prioritise data sources that cover the seams (CORDIS, SBIR, DASA fund across them), not pure single-vertical databases.

### 3. Six data categories

External data falls into six categories. Coverage targets are listed below; a fuller working list of named sources is maintained in `04-documentation/reference/external-data-sources.md` (to be created as part of the relevant backlog item).

| Category | What it answers | UK starter | US starter | EU starter | Israel (Phase 2) |
|---|---|---|---|---|---|
| **Capital flows** | Who funded whom, when | Innovate UK, ARIA, DASA, NIHR, Companies House (done), Beauhurst or Crunchbase (paid TBD) | SBIR.gov, SEC EDGAR, Crunchbase or Dealroom (paid TBD) | CORDIS, EIC, Dealroom (paid TBD) | Israel Innovation Authority, IVC, Start-Up Nation Central |
| **Regulatory and policy** | The rules of the game | legislation.gov.uk, Hansard (partial), GOV.UK consultations, SPIRE (export controls) | Congress.gov, Federal Register, Regulations.gov, BIS | EUR-Lex, Commission consultations, EU dual-use list | Knesset Open Data |
| **People and influence** | Who shapes narrative and policy | 58 think tanks (done), APPGs, ORCL lobbying register, PublicAppointments | CSIS, RAND, CNAS, Hudson, AEI, ITIF, CSET, SCSP, Brookings, Hoover (~10), Senate LDA | Bruegel, ECFR, CEPS, IISS Europe, Carnegie Europe, DGAP, IFRI, ISPI, Clingendael (~10), EU Transparency Register | INSS, BESA, Reichman ICT |
| **Media and narrative** | Where stories get told | Sifted UK, E&T, curated RSS bundle | Defense News, The Information, Breaking Defense, curated RSS | Sifted EU, Politico EU, GDELT | Calcalist, Globes, TheMarker |
| **Procurement and demand** | Who's actually buying | Contracts Finder, Find a Tender | SAM.gov, USAspending | TED | MoD Israel published contracts |
| **Technical and IP** | What's actually being built | Espacenet, Google Patents | USPTO, GitHub | Espacenet | (deferred) |

### 4. Ingest reports on demand, not by default

Reports (Goldman, McKinsey, RUSI, CSIS, NAO, GAO, OECD, etc.) are valuable but infinite. Without a constraint, ingestion becomes completist and never ends.

**Rule:** Ingest a report only when *either* of the following is true:

1. It is already cited by something already in the graph
2. It is a primary source for a Mission currently being investigated

This keeps ingestion demand-driven, consistent with the design principle "nothing enters storage without being processed and linked."

### 5. Reports model as both SourceDocument and ContentItem

A report is genuinely two things in the schema (ADR-002):

- **`SourceDocument`** — provenance for what was claimed, with page-level `file_ref` (e.g. `goldman_robotics_2024.pdf#p47`)
- **`ContentItem`** with `format: 'report'` — published by an `Organisation` (Goldman, McKinsey, RUSI), enabling traversal of "what has Goldman published about robotics?"

Both representations point to the same underlying file. `INFORMED_BY` connects extracted Ideas to the SourceDocument; `PRODUCED_BY` connects the ContentItem to the publishing Organisation.

### 6. Report ingestion principles

The following principles govern PDF/report ingestion. They extend the 12 ingestion rules in ADR-002 §5 with report-specific concerns:

| Principle | Detail |
|---|---|
| **Vision extraction for charts and tables** | Charts and tables contain the data — they cannot be treated as opaque images. Extract underlying numbers into structured form, link as evidence to extracted Ideas. |
| **Page-level provenance** | Every Idea extracted from a report carries page-level `file_ref`, not just the document-level reference. |
| **Forecast vs observation** | Properties on extracted Ideas distinguish claims-about-the-future from claims-about-the-past. Forecasts are falsifiable claims worth tracking against later reality. |
| **Citation graph** | Footnotes are edges. A report `CITES` other reports / papers / data sources where extractable. Citations are crawl-points for further ingestion. |
| **Source perspective tagging** | Report-publishing organisations carry a `source_perspective` property (e.g. `consultancy`, `investment_bank`, `think_tank_left`, `think_tank_right`, `academic`, `government`, `multilateral`, `industry_body`). This enables filtering and cross-checking by lens. |
| **No framing absorption** | The "no AI inference" rule (ADR-002 §5 rule 1) extends to report framings. Describe what the source claims — do not adopt its categorisation as fact. Especially relevant for politicised topics. |

### 7. No framing absorption — explicit for politicised data

For Israel-related data (and any other politicised domain), the schema rule is: ingest the source's framing as a *property of the source*, not as truth. A think tank labelling a technology "counter-terror tech" vs "surveillance tech" is a fact about the think tank's framing, not a fact about the technology.

This is enforced at ingestion time by:
- Source attribution on every node and edge (already required by ADR-002)
- `source_perspective` tagging (decision 6 above)
- Description fields that quote rather than paraphrase contested claims

---

## What was ruled out

| Option | Why rejected |
|---|---|
| Modelling Israeli domestic politics in full | Scope creep risk. The Israel/Palestine geopolitical dimension is its own three-body problem and pulls in regional politics. Restrict to innovation/defence-tech intersection. |
| Ingesting all reports proactively (completist) | Infinite ingestion demand. A demand-driven rule is necessary to keep the graph signal-dense. |
| Treating reports only as `SourceDocument` (not also `ContentItem`) | Loses traversal — "what has McKinsey published?" requires a ContentItem-level edge to the publishing organisation. Both representations needed. |
| Forcing companies into a single primary `Vertical` | Defence, robotics, climate, biotech genuinely overlap in dual-use. Hierarchy would force false precision. `OVERLAPS_WITH` between Verticals is the right shape. |
| Premium paid databases (PitchBook, full Crunchbase, full Dealroom) up front | Defer until ingestion patterns are proven and query needs are concrete. Free government and multilateral sources (NAO, GAO, CORDIS, SBIR, OECD, IEA) are consistently underrated. |
| Ingesting LinkedIn / Twitter at scale | Scrape-y and noisy. Use only for enrichment of people already in the graph, not as a primary discovery source. |

---

## Consequences

- A new backlog item (KG-04: External data sources working list) captures the named sources per category and tracks ingestion priority. ADR-007 fixes the strategy; the working list evolves.
- ADR-002 schema additions will be needed to absorb the politics graph (PolicyPosition, Constituency, Poll, PollWave, Election, RegisteredInterest, DonationTransaction, LoanTransaction, or a subset). Captured separately when the politics KG audit completes.
- Each external data source becomes its own ingestion script following the `kg-ingest-creator` skill pattern — same provenance rules, canonical register resolution, MERGE-not-CREATE batching.
- `source_perspective` is added as a standard property on `Organisation` nodes that publish reports or analysis. Existing 58 UK think tanks should be backfilled with this property.
- Israel jurisdiction work is parked in the backlog as Phase 2 — not started until UK/US/EU starter sources are ingested.
- The reports-on-demand rule needs to be enforced procedurally (in the relevant ingestion skill or a workflow check), not just documented here.
