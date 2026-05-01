# Template: Creator Workspace — Three-Region
Pattern name: `creator-workspace-three-region`
Established from: OUT-02-P4a (Content creator generation surface at `/content/create/[slug]`)
Last updated: 2026-04-30

---

## What this template covers

A fixed-viewport workspace where the user fills structured inputs in a left rail, presses a primary action, and sees output in a right pane. Used when the work is **parameter-driven generation** — the user is not editing an item, they're configuring a one-shot job whose output goes elsewhere (saved to a library, exported, posted, etc.).

Use this template when:
- The output is **generated**, not entered (LLM, render, compute)
- Inputs are **structured and bounded** (selects, cascades, configs — not free-form long writing)
- The user wants to **see input + output simultaneously** so they can tweak and regenerate
- The workspace is **transient** — work is committed elsewhere, not autosaved into this surface

---

## Fixed structure (do not redesign per instance)

### Routing
- `/[workspace-route]/[slug]` — the workspace for one launch context (e.g. one content type, one skill)
- Optional `?run=[runId]` query param to deep-link a specific run (resume / regenerate flows)
- Reached from a launch picker (see `launch-picker-grid` template)

### Page chrome
```
PageChrome:
  title (icon + name of the launch context)        [Switch ↗] (back to picker)
  subtitle (1-line description)
```
- "Switch" link in PageChrome action slot — back to `/[picker-route]`
- No subheader by default; subheader available for instance-specific badges (e.g. "Project: X" if the workspace was launched from a project)

### Working area — fixed viewport
- Wrap with `ContentPane padding={false}` so the working area fills available height with no internal pane padding
- Outer working area: `flex flex-col h-full overflow-hidden` (children handle scroll)

### Layout
```
┌─────────────────────────┬──────────────────────────────────────┐
│ LEFT RAIL (380px)       │ RIGHT PANE (flex-1)                  │
│ ┌─────────────────────┐ │                                      │
│ │ Block 1 (SectionCard,│ │  Empty state until action pressed:  │
│ │ shrink-0,           │ │    EmptyState molecule               │
│ │ scrolls if overflow)│ │                                      │
│ └─────────────────────┘ │  Loading state:                      │
│ ┌─────────────────────┐ │    centered spinner + status text    │
│ │ Block 2 (SectionCard,│ │                                      │
│ │ flex-1 min-h-0,     │ │  Success state: instance-specific    │
│ │ scrolls internally) │ │    output (variant cards, document,  │
│ └─────────────────────┘ │    inspector view, etc.)             │
│ ┌─────────────────────┐ │                                      │
│ │ Block 3 (Settings   │ │  Error state: red banner with        │
│ │ strip, shrink-0)    │ │    actionable message                │
│ └─────────────────────┘ │                                      │
│ ┌─────────────────────┐ │                                      │
│ │ [Primary action]    │ │                                      │
│ │ (full-width, sticky │ │                                      │
│ │ via mt-auto)        │ │                                      │
│ └─────────────────────┘ │                                      │
└─────────────────────────┴──────────────────────────────────────┘
```

**Sizing rules:**
- Left rail: `w-[380px] shrink-0 flex flex-col gap-3 p-4 border-r overflow-hidden`
- Block 1 (top input block): `shrink-0` content-sized
- Block 2 (middle / largest input block): `flex-1 min-h-0 overflow-auto` — takes remaining vertical space
- Block 3 (settings / config strip): `shrink-0` — typically a single-row inline strip with `bg-muted/40 rounded-md`, **not** a SectionCard (kept lighter to reduce visual weight at the bottom of the rail)
- Primary action: `shrink-0 mt-auto` — full-width primary `ActionButton`
- Right pane: `flex-1 min-h-0 overflow-auto p-6`

The 380px rail width derives from: input fields need ≥ 320px to feel un-cramped at the SectionCard padding budget. Adjust per instance only if input shapes genuinely demand more (e.g. dual-column entity pickers).

### Right-pane states (instance-specific content; states are fixed)
| State | Trigger | Visual scaffold |
|---|---|---|
| Empty | Initial load | `EmptyState` centred — instance picks the icon + copy |
| Loading | Action pressed, awaiting response | Centred spinner + status text |
| Success | Response with output | Instance-specific molecule (variant cards, doc renderer, prompt inspector, etc.) |
| Error | Response error or thrown | Red banner with title + message + retry hint |

### Primary action button
- Full-width primary `ActionButton`
- **Disabled** until validation passes — instance defines validation rules (typically: required inputs filled + cascade resolved)
- **Disabled hover state:** tooltip "[Hint]" describing what's missing
- **Loading state:** spinner + label like "Generating…" or "Assembling…" — also disables
- Stays at the bottom of the left rail via `mt-auto` after the three blocks

### Mobile
- This template assumes ≥ 1024px viewport — at narrower widths the side-by-side layout breaks
- Use `ScreenSizeGate` to show a "Try a wider screen" message below the threshold
- Do not attempt to stack vertically on mobile — the dual-pane is the point of the pattern

---

## Variable parts (per instance)

### The three left-rail blocks
Each instance picks 1-3 of these block types (typically 3, sometimes 2):

1. **Inputs block** (always present) — `SectionCard` with structured fields (selects, comboboxes, value pickers). Driven by a declarative config column on the launch context's catalogue row (e.g. `content_types.strategy_fields`, `skills.input_schema`).
2. **Cascade / drill block** (often present) — `SectionCard` with a multi-step picker, dynamic data queries, progressive disclosure. Pure-input contexts can omit this and let block 2 grow.
3. **Settings strip** (always present, but lightweight) — inline `bg-muted/40` strip with model / variant / config controls. **NOT** a SectionCard. Controls are compact selects + steppers.

### Primary action label
- "Generate" for content
- "Run" for skills
- "Render" for documents
- "Compute" for analytics
Keep it one verb.

### Validation rules
- Per-instance: which input fields are required, when does the cascade count as resolved, are there cross-block dependencies (e.g. cascade required only when a config flag is true)

### Right-pane output molecule
- Instance-specific molecule for the success state
- Should expose props that take run id + output payload — keep stateful behaviour inside the molecule
- The empty / loading / error scaffolds are template-level; only success is instance-defined

### Resume / deep-link behaviour
- Instance decides whether `?run=[runId]` re-hydrates the form + re-renders previous output, or just opens fresh

### Settings strip escalation rule
- If the inline strip looks visually unbalanced against the SectionCards above it during build, it's pre-approved to promote to a standard `SectionCard` (titled "Settings" or instance-specific). Promotion is not a redesign; it's a contained visual fix.

---

## Molecule contract

This template requires:
- `PageChrome`, `ContentPane` (with `padding={false}`), `SectionCard`, `EmptyState`, `Modal`, `ActionButton` (existing)
- `NumberStepper` (built first by OUT-02-P4a — used in Settings strip for numeric configs)
- `SelectField` (existing — for compact Settings controls and most input fields)
- One per-instance set of input molecules (e.g. `StrategyField`, `TopicCascade`)
- One per-instance output molecule for the right-pane success state

---

## When NOT to use this template

- Inputs are free-form long writing (use a doc editor pattern instead)
- Output is committed back to the same surface (workspace owns the artifact)
- The user is editing an existing item (use `dna-plural-item` or a tab-master-detail pattern)
- The workflow is multi-page or has a wizard structure (different pattern)
- The work is collaborative or multi-session (not a one-shot generation)
