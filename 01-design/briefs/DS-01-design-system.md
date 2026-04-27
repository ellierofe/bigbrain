# DS-01: Design System

**Status:** approved
**Layer:** cross
**Size:** L
**Depends on:** DASH-01 (shell complete — components to refactor exist)
**Enables:** DNA-02 and all future features (consistent molecule layer)
**Problems addressed:** All (visual consistency, development velocity, maintainability)

---

## What and why

The current app is built with ad hoc Tailwind — appearance decisions (colours, spacing, typography, borders) are made at point of use, not extracted into reusable components. Every new feature compounds the inconsistency. The root cause is the absence of a disciplined molecule layer: atoms (shadcn/ui) exist, organisms (pages) exist, but the molecules in between are missing or poorly defined.

DS-01 establishes the design system before DNA-02 and beyond are built on top of it. This is an architectural refactor, not a cosmetic pass.

---

## Scope

### 1. Token set (globals.css)
Audit and tighten the existing CSS variables. Add missing tokens (spacing scale, elevation scale, typography scale). Everything downstream uses tokens — no hardcoded values.

### 2. Molecule components
Build or refactor the following shared molecules. Each becomes a registered component in `components/registry.ts`:

| Component | Status | Issues to fix |
|---|---|---|
| `PageHeader` | refactor | No icon slot; floats bare on background with no visual containment |
| `ContentPane` | refactor | Shadow too light — poor zone separation from bone background |
| `InlineField` | refactor | Border transparent on idle — no field definition; label/icon placement needs tightening |
| `SectionCard` | refactor | Audit spacing and border treatment against token system |
| `SectionDivider` | new | Sidebar and in-page section dividers — currently render as icons (broken) |
| `TabbedPane` | new | Tabbed content area molecule (tab strip + content). Replaces ad hoc tab usage |
| `InPageNav` | new | In-page vertical nav with active indicator line (for persona sections in segments detail) |
| `PageChrome` | new | Wraps PageHeader + optional sub-header chrome (tabs, switchers) as a unit |

### 3. Layout fixes (organisms)
After molecules are in place, refactor the following organisms to use them:

- `NavSidebar`: sidebar icon sizing, spacing in collapsed state, divider rendering
- Dashboard layout: content pane width, sidebar overlay vs push behaviour
- Audience segments: left panel / content area visual separation, segment switcher positioning, persona section nav

### 4. Visual calibration
Apply across the board after molecules are correct:

- Background bone (`--background: #f0ede9`) — assess whether it's too heavy; may lighten
- Button padding — currently pinched; increase to feel more grounded
- Base font size — currently slightly small; assess `text-sm` vs `text-base` defaults
- `ContentPane` shadow — increase contrast against background

### 5. `design-system` skill
A new skill at `.claude/skills/design-system/SKILL.md` that:
- Reads `01-design/design-system.md` as source of truth before any component work
- Gates new component creation (must check registry + design system first)
- Extracts new patterns after feature builds
- Runs a post-build drift check

---

## Out of scope

- Dark mode refinement (tokens are stubbed; full dark mode pass is a separate milestone)
- New feature UI (this is infrastructure, not features)
- Typography system overhaul (base scale is fine; only calibration needed)
- Animation / motion system

---

## Visual benchmark

`04-documentation/reference/legacy_files/index.html` — the Moogul legacy reference. Not to copy, but to match the level of component discipline: clear zone separation, consistent field treatment, reliable spacing.

---

## Design principles (from domain model)

- Nothing styled without a token — no hardcoded colour or spacing values below organism level
- No Tailwind appearance classes below molecule level — organisms only compose, they don't style
- Visibility over trust — every component must be inspectable (consistent naming, registry entry)

---

## Key architectural rule

> **No Tailwind appearance classes below molecule level.**
> Atoms (shadcn/ui) accept appearance props. Molecules define the visual decisions. Organisms compose molecules — they do not re-style them.

---

## UI/UX notes

Full design system spec is in `01-design/design-system.md`. That document is the source of truth for tokens, component specs, and visual decisions. This brief is the project record; the spec is the working reference.

---

## Decisions log

- **2026-04-12:** DS-01 scoped and approved. Design system before features. Architecture first, cosmetic second. Skill to be written alongside the system to prevent future drift. (Session: 2026-04-12-design-system-p5w)
