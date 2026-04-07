# Session log — 2026-03-31 — DNA tables, dashboard shell, DNA-03 brief and layout
Session ID: 2026-03-31-dna-dash-brief-m7k

## What we worked on
- DNA-01: 5 approved DNA tables (schema-to-db + db-migrate)
- DASH-01: Dashboard shell (sidebar nav, routing, stub pages)
- DNA-03: Feature brief + layout design (audience segments)
- UX backlog items raised

## What was done

**DNA-01 (partial — 5 of 18 tables):**
- Ran SKL-06 for all 5 approved schemas: `dna_business_overview`, `dna_brand_meaning`, `dna_value_proposition`, `dna_brand_identity`, `dna_audience_segments`
- Created `02-app/lib/db/schema/dna/` subfolder with one file per table + `index.ts` barrel
- Decision: added `uniqueIndex` on `brand_id` for all 4 singular tables (one-row-per-brand enforcement at DB level)
- Generated migration `0003_glorious_karma.sql` and applied via SKL-09
- All 5 tables confirmed live in Neon with correct indexes

**DASH-01:**
- Installed shadcn sidebar (Base UI version — see ADR-001 note)
- Created `components/nav-sidebar.tsx` — three sections: Strategy (all 14 DNA types), Knowledge (Sources, Graph), Content (Create, Inbox)
- Created `app/(dashboard)/layout.tsx` — `SidebarProvider` + `NavSidebar` + main content area
- Created `app/(dashboard)/page.tsx` — redirects `/dashboard` → `/dna`
- Created stub pages for all 14 DNA routes + DNA overview (`/dna`, `/dna/audience-segments`, `/dna/business-overview`, etc.)
- Added `TooltipProvider` to root layout (required by shadcn sidebar)
- Fixed `asChild` → `render` prop issue (Base UI API difference)
- Updated `components/registry.ts` — `NavSidebar` entry added
- Build confirmed clean, all 14 routes 200

**DNA-03 brief (SKL-01):**
- Wrote and approved feature brief: `01-design/briefs/DNA-03-audience-segments.md`
- Key decisions captured: autosave on blur (500ms debounce), generation deferred to post-INF-06, no versioning (freely editable), archive = soft delete only, VOC categories kept as four types, avatar out of scope

**DNA-03 layout (SKL-02):**
- Ran feature-template-check (SKL-03) — no templates exist yet, new pattern
- Designed full layout spec: `01-design/wireframes/DNA-03-layout.md`
- Key decisions: two-column layout (left sticky panel + content pane, no right column), actions in header area, segment switcher as pill strip, 3 tabs (Persona / VOC / Related Content), Persona tab has anchor-scrolled mini-nav (Overview / Identity / Life Circs / Business / Psychographics), VOC tab is inline-editable table, default route loads first segment directly (not card grid), draft segment status
- Created `dna-plural-item` template: `01-design/wireframes/templates/dna-plural-item-template.md` — canonical pattern for all future plural DNA types
- Updated `feature-template-check` skill registry with new template
- Updated ADR-001 with Base UI / render prop gotcha

**Backlog items raised:**
- UX-01: Dependency-aware empty states (P2)
- UX-02: Creation modal document upload path (blocked on SRC-01 + INF-06)
- UX-03: Generation progress UX (blocked on INF-06)
- UX-04: Segment switcher → select dropdown (watch item)

## Decisions made

- **Unique index on `brand_id` for singular DNA tables** — enforces "one row per brand" at DB level. Applied to `dna_business_overview`, `dna_brand_meaning`, `dna_value_proposition`, `dna_brand_identity`. Will apply to all future singular DNA tables.
- **shadcn Base UI vs Radix** — installed version uses Base UI. `render` prop instead of `asChild`. Noted in ADR-001.
- **No right column in DNA detail view** — actions (New, Archive) live in the header area alongside view toggle. Keeps layout simpler and avoids a third column that doesn't justify its width.
- **Default landing = first segment's detail view** — avoids card-grid overhead when there's only one segment. Card grid accessible via view toggle.
- **Draft status for generated segments** — segments created via "Save as draft" (pre-INF-06 escape hatch) are `draft` and not selectable as targets until manually promoted to `active`.
- **dna-plural-item template established** — DNA-03 is the canonical first instance. All future plural DNA features use this template and only specify deltas.

## What came up that wasn't planned

- shadcn sidebar installed with Base UI (not Radix) — required `asChild` → `render` prop fix mid-build. Noted in ADR-001.
- Remaining 10 DNA schemas are all marked `draft` (not `approved`) — will need review and approval before implementing. Agreed to do 5 approved tables as dry run first, then review drafts.
- `dna_brand_intros` status is `draft` — not yet in scope for schema-to-db.

## Backlog status changes

- DNA-01: `planned` → `in-progress` (5 of 18 tables done; remaining tables pending schema approval)
- DASH-01: `planned` → `done`
- DNA-03: `planned` → `in-progress` (brief + layout approved; build next session)
- UX-01, UX-02, UX-03, UX-04: added as new entries

## What's next

1. **DNA-03 build** — start in a fresh chat. Pre-conditions all met: brief approved, layout spec approved, schema migrated, DASH-01 done. Seed 2–3 test segments into Neon before or during build.
2. **Remaining DNA schemas** — review and approve draft schemas (`dna_brand_intros`, `dna_competitors`, `dna_content_pillars`, `dna_tone_of_voice` x3, `dna_entity_outcomes`, `dna_knowledge_assets`, `dna_lead_magnets`, `dna_offers`, `dna_platforms`, `prompt_components`). Then run SKL-06 + SKL-09 for all.
3. **SRC-01** — source knowledge tables (schemas already defined in `01-design/schemas/src-*.md`).
4. **INF-04, INF-05, INF-06** — file storage, auth, LLM integration (can run in parallel with DNA/SRC work).

## Context for future sessions

- **DNA-03 build:** Brief at `01-design/briefs/DNA-03-audience-segments.md`, layout at `01-design/wireframes/DNA-03-layout.md`. Schema already migrated (`dna_audience_segments` table live in Neon). Use `feature-build` (SKL-04). Seed data needed — 2–3 test segments via Neon MCP or a seed script.
- **Plural DNA template:** `01-design/wireframes/templates/dna-plural-item-template.md` — all future plural DNA builds should run `feature-template-check` first, which will find this template and produce a delta-only layout spec.
- **Singular DNA tables have `uniqueIndex` on `brand_id`** — enforces one-row-per-brand. Apply this pattern to all future singular DNA tables.
- **shadcn Base UI:** `render` prop, not `asChild`. See ADR-001 note.
- **Remaining DNA schemas to approve:** all 10 remaining files in `01-design/schemas/dna-*.md` are `draft` — need review before schema-to-db can run.
- **Neon project ID:** `damp-boat-57321258` — use for all Neon MCP calls.
