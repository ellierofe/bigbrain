---
status: draft
tables: brands, brand_users
type: root entity
related_features: DNA-01, INF-05
last_updated: 2026-03-29
---

# Schema: brands + brand_users

The root entity of the system. Every DNA record, source knowledge item, and prompt component belongs to a brand. Users are linked to brands via a junction table, enabling multi-user and multi-brand support from the start — even though the initial deployment is single-user, single-brand.

**Relationship to `dna_business_overview`:** The `brands` table is a lightweight anchor — just enough to identify and scope the brand. The full business detail (vertical, specialism, description, etc.) lives in `dna_business_overview`, which has a `brandId` FK.

---

## Table 1: `brands`

One row per brand. The root record that all other tables hang off.

### Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | |
| `name` | varchar(200) | not null | Trading name — duplicated from `dna_business_overview.businessName` for fast access without a join |
| `slug` | varchar(100) | not null, unique | URL-safe identifier — e.g. `nicelyput`. Used in routing and scoping. |
| `isActive` | boolean | not null, default true | Soft delete / suspension flag |
| `createdAt` | timestamp with tz | not null, defaultNow | |
| `updatedAt` | timestamp with tz | not null, defaultNow | |

### Indexes
- `slug` — unique index (already implied by unique constraint, but explicit for query clarity)

---

## Table 2: `brand_users`

Junction table. Many-to-many between brands and users. Controls who has access to which brand and at what permission level.

### Fields

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `id` | uuid | PK, defaultRandom | |
| `brandId` | uuid | not null, FK → `brands.id` ON DELETE CASCADE | |
| `userId` | uuid | not null, FK → `users.id` ON DELETE CASCADE | `users` table created by Auth.js (INF-05) |
| `role` | varchar(50) | not null, default 'owner' | `owner \| editor \| viewer` |
| `createdAt` | timestamp with tz | not null, defaultNow | |

### Constraints
- Unique on `(brandId, userId)` — a user can only have one role per brand

### Indexes
- `(brandId, userId)` — composite unique index
- `userId` — for "which brands does this user have access to?" queries

---

## Relationships

- `brands.id` is referenced as `brandId` FK in every DNA table, every source knowledge table, the content registry, and `prompt_components`
- `brand_users.userId` → Auth.js `users` table (created by INF-05 — not defined here)
- `dna_business_overview.brandId` → `brands.id` — the brand detail record

## `brandId` FK pattern across all dependent tables

Every table that is brand-scoped has:

```typescript
brandId: uuid('brand_id').notNull().references(() => brands.id),
```

With an index on `brandId` for all tables where it appears, since the primary query pattern for every table is always brand-scoped.

**Tables that carry `brandId`:**
- `dna_business_overview`
- `dna_brand_meaning`
- `dna_value_proposition`
- `dna_brand_identity`
- `dna_tone_of_voice`
- `dna_tov_samples`
- `dna_tov_applications`
- `dna_audience_segments`
- `dna_offers`
- `dna_knowledge_assets`
- `dna_content_pillars`
- `dna_platforms`
- `dna_lead_magnets`
- `dna_brand_intros`
- `dna_competitor_analyses`
- `dna_competitors` — inherits brand scope via `analysisId → dna_competitor_analyses`, but also carries `brandId` directly for simpler queries
- `dna_entity_outcomes` — carries `brandId` directly for query simplicity
- `prompt_components` — carries `brandId` (nullable). Null = system-global. Set = brand-specific override. At prompt assembly, brand-specific takes precedence over global for the same `slug`.

## Notes

- **Why duplicate `name` on `brands`?** Every table query is brand-scoped. Having the name available without joining to `dna_business_overview` simplifies logging, UI headers, and debugging.
- **`slug` usage:** Primarily for URL routing (`/[slug]/dna`, `/[slug]/content`) if multi-brand UI is ever built. For now it's a useful human-readable identifier in logs and session context.
- **`brand_users.role`:** `owner` = full access including brand deletion and user management. `editor` = create/update all content. `viewer` = read-only. Role enforcement is at application layer (middleware + server actions), not DB-level RLS (which is a Neon feature that can be added later if needed).
- **On Auth.js integration:** The `users` table is created and managed by Auth.js (INF-05). `brand_users` references it but does not own it. The FK is set but Auth.js schema must be initialised before `brand_users` migration runs.
- **Multi-brand future:** The system is designed for it from day one. Adding a second brand is just a new row in `brands` and a new `brand_users` entry. All DNA tables are already scoped by `brandId`.
