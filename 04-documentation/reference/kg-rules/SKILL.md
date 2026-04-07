# KG Rules

Surface the universal ingestion rules for this knowledge graph project.

## Instructions

When this skill is referenced, read and apply the rules in:
`05-documentation/reference/ingestion-rules.md`

These 12 rules govern every data ingestion into the knowledge graph:

1. **No AI inference** — null not estimated
2. **Entity resolution before write** — check canonical_register in Neon first
3. **Canonical names** — resolve through the register
4. **Date linking** — ON_DATE/IN_MONTH/IN_YEAR to pre-created Date nodes
5. **Source tracking** — `source` + `file_ref` on every node and edge
6. **Natural language description** — detailed, on every node and edge
7. **Deduplication on reruns** — MERGE not CREATE
8. **Validation before batch** — defined per ingestion
9. **Self-improvement** — learnings fed back to ingestion script, skill creator, and universal rules
10. **Query provenance** — return traversed nodes/edges, not just answers
11. **Decisions capture** — record architecture/schema/design decisions in decisions-log.md
12. **Ingestion log** — update ingestion_log table in Neon after every run

Also reference:
- `05-documentation/reference/canonical-register.md` — entity names, variations, dedup keys
- `05-documentation/reference/file-naming-convention.md` — file prefixes and source codes
- `05-documentation/reference/decisions-log.md` — why things are the way they are
