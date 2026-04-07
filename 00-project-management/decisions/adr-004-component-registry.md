# ADR-004: Component Registry and Primitive Component Pattern

> Status: APPROVED
> Date: 2026-03-30
> Decides: How UI component consistency and reuse are maintained across the app

---

## Context

BigBrain has a future design system retrofit path (ADR-001). Components need to be reusable, consistent, and easy to update in bulk when a visual design is applied. The question was: what mechanism actually enforces this?

A component registry file was proposed during INF-01. The decision was to pair it with a set of primitive component stubs so that reuse is structurally enforced from the first feature built, not just aspirationally documented.

---

## Decision

Two complementary mechanisms:

**1. Primitive component stubs** in `components/` (not `components/ui/`):
- `Modal` — wraps shadcn Dialog; used for all modal interactions
- `PageHeader` — consistent page title + subtitle + action slot
- `EmptyState` — consistent empty state: icon, heading, description, CTA
- `FormLayout` — consistent form wrapper with title, fields, and footer actions
- `SectionCard` — card container with title and content slot

All features use these rather than building equivalent UI inline. Updating one component cascades everywhere it is used.

**2. `components/registry.ts`**: A TypeScript file listing every shared component — name, path, category, description, props summary, and which features use it (`usedIn[]`). The `feature-build` and `feature-update` skills check this before creating any new component:
- Match exists → use or extend it (update the registry entry if extending)
- No match → create the component in `components/`, add entry to registry before build is marked complete

---

## Why not just the registry?

The registry alone only prevents duplication at the point of new component creation. The primitive stubs are what make single-place updates possible — the registry is the guard, the stubs are the mechanism.

---

## Design system readiness

All components use CSS variables (`--background`, `--foreground`, `--muted`, `--card`, etc.) defined in `app/globals.css` via shadcn/ui's token system. When a design scheme is applied, updating those variables and `tailwind.config.ts` cascades through every component without individual code changes.

`components/ui/` is reserved for shadcn/ui base components only. Custom primitives live in `components/` and are always registered in `registry.ts`.

---

## Consequences

- Every feature build must check `components/registry.ts` before creating any UI component
- New shared components are added to the registry before the build is marked complete
- `feature-update` skill (SKL-07) must include the same registry check when written — noted in backlog
- The `usedIn[]` array in each registry entry should be updated as components are adopted by features
- If a shadcn component is added that conflicts with a primitive name, the primitive in `components/` takes precedence

---

## What was ruled out

| Option | Why rejected |
|---|---|
| Registry-only (no stubs) | Prevents duplication but doesn't enable single-place updates. The stubs are the actual consistency mechanism. |
| Markdown component catalogue | Human-readable but not checkable by skills. The `.ts` file is the right format — Claude can read it, TypeScript validates it, and it's co-located with the code. |
| shadcn-only (no custom primitives) | shadcn components are base primitives. The app needs higher-level compositions (e.g. Modal = Dialog + standard header pattern) that shadcn doesn't provide. |
