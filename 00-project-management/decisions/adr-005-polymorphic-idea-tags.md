# ADR-005: Polymorphic idea_tags table for idea-to-entity linking

> Status: APPROVED
> Date: 2026-04-24
> Decides: How ideas link to other entities (missions, client projects, offers, knowledge assets, audience segments, and future entity types)

---

## Context

IDEA-01 originally specified per-entity join tables (`idea_missions`, `idea_projects`) as deferrable until those features existed. By 2026-04-23 CLIENT-01 had been built with an `idea_projects` join table and associated queries (`getProjectIdeas`, `linkIdeaToProject`, `unlinkIdeaFromProject`).

During the IDEA-01 build (2026-04-24), Ellie needed the ability to tag ideas to additional entity types — specifically knowledge assets, offers, and audience segments, with the expectation that more entity types will become taggable over time.

The question: keep adding per-entity join tables (`idea_offers`, `idea_knowledge_assets`, etc.) or switch to a single polymorphic tagging table?

---

## Decision

A single polymorphic `idea_tags` table handles all idea-to-entity linking.

```
idea_tags
├─ id (uuid pk)
├─ idea_id (uuid fk → ideas.id, cascade delete)
├─ entity_type (text — 'mission' | 'client_project' | 'offer' | 'knowledge_asset' | 'audience_segment')
├─ entity_id (uuid — no FK constraint; polymorphic)
├─ created_at (timestamp)
└─ unique index on (idea_id, entity_type, entity_id)
```

Entity types are an application-level union (`IdeaTagEntityType` in `lib/types/ideas.ts`), not a Postgres enum — so adding a new taggable type is one-line in the app code, no migration.

`idea_projects` (created during CLIENT-01) is deprecated. Its three wrapper functions (`getProjectIdeas`, `linkIdeaToProject`, `unlinkIdeaFromProject`) now read/write `idea_tags` under the hood, preserving the existing call sites. The physical `idea_projects` table remains in the DB but is unused; can be dropped in a cleanup migration.

---

## Why polymorphic, not per-entity join tables?

**Scalability.** Every new entity type that should be taggable would otherwise require: a new table + migration, new query functions, new server actions, new wiring. With polymorphic tags, adding a new entity type is: add one value to `IdeaTagEntityType`, add one row to `listTaggableEntities`.

**Single source of truth for tagging.** A single `IdeasList` / `IdeasPanel` UI can render tags for any entity mix — no per-type rendering logic, no special cases. Tags are a uniform concept at the UI layer.

**Context embedding.** The `IdeasPanel` molecule (used in mission and client project workspaces) is structurally entity-agnostic: it takes `entityType` and `entityId` as props. This was only possible because tagging is uniform on the data side.

---

## Trade-offs accepted

**No FK enforcement on `entity_id`.** Postgres can't enforce that `entity_id` points to a real row in the target table, because the target varies by `entity_type`. Mitigation: entity names are resolved at read time via a Set lookup over `listTaggableEntities()`; orphaned tags (if an entity is hard-deleted) render as unresolved. Since most taggable entities use soft-delete / archive patterns, this is rarely surfaced.

**Entity name resolution happens in the app, not the query.** A UNION-based SQL query across five tables was considered (to return tags with resolved names in one round trip) but rejected — too brittle across schema changes, and `listTaggableEntities()` is already a small, cached lookup.

**Can't cascade-delete tags when an entity is deleted.** If a mission is hard-deleted, its `idea_tags` rows linger. Acceptable because: (a) the query pattern filters out stale tags via the resolved-name check, (b) deletions of these entity types are rare and usually soft (archive), and (c) a periodic cleanup job can prune orphans if needed.

---

## Consequences

- Adding a new taggable entity type requires only: a new union member in `IdeaTagEntityType`, a new query branch in `listTaggableEntities`, and (optional) a new icon+label in `ENTITY_TYPE_LABELS` / `ENTITY_TYPE_ICONS` in `ideas-list.tsx`.
- The `IdeasPanel` molecule can be dropped into any entity workspace with no new infrastructure work.
- Per-entity join table helpers in `client-projects.ts` (`linkIdeaToProject`, etc.) continue to work but are now thin wrappers over the polymorphic table.
- The `idea_projects` physical table can be dropped in a cleanup migration once confirmed nothing depends on it.
- Future queries like "show me all ideas tagged to any entity of type X" are trivial via a single indexed lookup on `(entity_type, entity_id)`.

---

## What was ruled out

| Option | Why rejected |
|---|---|
| Per-entity join tables (`idea_missions`, `idea_offers`, etc.) | Every new taggable entity type would require a migration, new queries, new actions, and new UI wiring. Doesn't scale with the expected growth in taggable entity types. |
| Postgres enum for `entity_type` | Adding a new entity type would require a migration. The application-level union gives the same type safety in TypeScript without the migration cost. |
| `graph_edges` instead of `idea_tags` | The graph layer (FalkorDB + Neon mirror) is for knowledge graph semantics (node traversal, relationship types with meaning). Idea-to-entity tagging is a structural concern, not a knowledge graph concern. Overloading `graph_edges` would conflate two very different domains. |
| Keep `idea_projects` alongside a new polymorphic table | Split-brain. Two sources of truth for project-idea links means two places to read from, two places to write to, and inevitable drift. Migrating the wrapper functions to read from `idea_tags` keeps one source of truth. |
