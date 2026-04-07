# App Scaffold and Project Structure Brief
Feature ID: INF-01
Status: approved
Last updated: 2026-03-30

## Summary
Establish the full directory structure, install all core packages, create shared primitive components as stubs, and set up a component registry. This is the foundation everything else builds on — no feature can be built until the folder structure, tooling, and component conventions are in place.

## Use cases
- Every subsequent feature build assumes this structure exists
- `feature-build` and `feature-update` skills check the component registry before creating new components
- Design system retrofit: when a visual design is applied later, CSS variable updates in `globals.css` cascade through all components automatically

## User journey
No user-facing journey — this is infrastructure. The deliverable is a correctly structured, deployable app with:
- Full directory scaffold per ADR-001
- All stack packages installed and verified
- Shared primitive component stubs in place
- Component registry documenting them
- `.env.local` template (with placeholder keys) for all services needed in M1+
- `layout.tsx` updated with app name and clean metadata
- `page.tsx` replaced with a minimal BigBrain placeholder (not the Next.js default)

## Data model / fields
None — no database work in this feature.

## Update behaviour
Freely editable — scaffold and registry evolve as the app grows. Skills update the registry when new shared components are created.

## Relationships
### Knowledge graph (FalkorDB)
None.
### Postgres
None.

## UI/UX notes
No designed UI. Primitive component stubs have minimal, unstyled implementations using shadcn/ui primitives and Tailwind. They exist to establish the pattern and reuse point — not to be visually finished.

### Primitive components to stub
These live in `components/` (not `components/ui/` which is shadcn-only):

| Component | File | Purpose |
|---|---|---|
| `Modal` | `components/modal.tsx` | Wraps shadcn Dialog. Used for all modal interactions (generation, confirmation, editing). |
| `PageHeader` | `components/page-header.tsx` | Consistent page title + optional subtitle + optional action slot. Used at the top of every dashboard page. |
| `EmptyState` | `components/empty-state.tsx` | Consistent empty state: icon, heading, description, optional CTA. Used when a list/section has no data yet. |
| `FormLayout` | `components/form-layout.tsx` | Consistent form wrapper: title, description, fields slot, submit/cancel actions. Used for all DNA and source knowledge creation forms. |
| `SectionCard` | `components/section-card.tsx` | Card container with title, optional description, content slot. Used for grouping content in dashboard views. |

## Edge cases
- If a package install fails, stop and surface the error — don't proceed with a partial install
- If shadcn components are added later and conflict with primitive names, the primitive wins (it's in `components/`, shadcn is in `components/ui/`)
- `.env.local` is gitignored — never commit it; the `.env.example` template IS committed

## Out of scope
- No DB connections (INF-02)
- No auth (INF-05)
- No LLM integration (INF-06)
- No actual page implementations — just placeholder content on `page.tsx`
- No design system tokens — that comes when design is applied; CSS variable slots exist but values are defaults
- No shadcn component additions beyond `button.tsx` (already installed)

## Open questions / TBDs
None — all decisions resolved.

## Decisions log
- 2026-03-30: Brief approved. Component registry approach agreed: `components/registry.ts` TS file, paired with stubs for 5 primitive components. Skills updated to check registry before creating new components.
