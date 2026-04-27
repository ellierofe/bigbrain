---
name: layout-design
description: Design the UI/UX for a feature. Use after feature-brief is approved, before feature-build. For new patterns: full design with hard gate. For known patterns: delta-only with light confirmation.
---

# layout-design (SKL-02)

Design the UI/UX for a feature. Runs `feature-template-check` first to determine whether to design a new pattern or adapt an existing one. The output is a layout spec that `feature-build` reads before writing any code.

## Autonomy level

**New pattern: hard gate** — model produces a full layout spec; human reviews and can push back before any code is written. This is the right moment to challenge the UX.

**Template adaptation: light confirmation** — model presents only the delta from the established template; human confirms the differences are correct.

## Pre-conditions

- Feature brief exists in `01-design/briefs/[feature-id]-[feature-slug].md` with status `approved`
- `01-design/wireframes/` directory exists
- `01-design/wireframes/templates/` directory exists (may be empty)

## Steps

### Step A: Load context

Read:
1. `01-design/briefs/[feature-id]-[feature-slug].md` — full brief, especially: use cases, user journey, data model, update behaviour, relationships, edge cases
2. `01-design/design-system.md` — full spec. Note which molecule components are available to use, which are needed for this feature, and whether any new molecules will be required. New molecules must be listed explicitly in Step D's **Molecule composition** section — flagging is not enough; this is a hard gate input for `feature-build`.
3. `02-app/components/registry.ts` — confirm what is registered. Cross-check against `design-system.md`: any molecule registered without a spec is itself a known gap (DS-03), and using one for the first time in this feature is a chance to spec it now rather than later.
4. `04-documentation/domain-model.md` — relevant sections for this feature type
5. `01-design/wireframes/` — any existing layout specs to understand the design language and navigation patterns already established
6. `00-project-management/decisions/adr-001-tech-stack.md` — UI constraints (shadcn/ui + Tailwind, App Router routing conventions)

### Step B: Run feature-template-check

Run `feature-template-check` (SKL-03). Its output determines which path to take:
- **Match found** → proceed to Step C (template adaptation)
- **No match** → proceed to Step D (new pattern design)

### Step C: Template adaptation path

Read the matched template file from `01-design/wireframes/templates/`.

Produce a **delta document** — not a full redesign, just the differences:

```markdown
## Layout delta: [Feature name] from [Template name]

**Template:** [path to template file] (established from [feature ID])

**What's identical to the template:**
[Confirm the structural elements that don't change — navigation model, modal behaviour, version history display, etc.]

**What changes:**
- Fields: [list the fields this instance has vs the template. Flag any fields with unusual types or constraints that might affect layout]
- Labels: [any terminology changes]
- Type-specific behaviour: [anything this item type does that the template doesn't account for — e.g. a field that has a graph relationship and needs a picker/selector rather than a text input]
- Empty states: [any empty state copy or behaviour specific to this item type]
- Validation rules: [field-level validation that differs from the template's defaults]

**Molecule composition delta:**
- Existing molecules used by the template that this instance reuses unchanged: [list — confirm none need extension]
- New molecules required for this instance: [list with one-line spec sketches, same format as Step D]
- Atoms used directly (should be empty — flag any here, justify, and prefer a new molecule)

**Open questions:**
[Anything that isn't answered by the template and needs a decision]
```

**Light confirmation:** Present the delta. Human confirms it's correct or requests changes. No hard gate on the structural delta — but **the molecule composition delta IS gated**: any "new molecule required" entry needs a spec sketch before `feature-build` plan approval can proceed. If the delta is purely structural with no new molecules, light confirmation is fine.

Once confirmed, append the delta to the feature brief under "UI/UX notes" and save as `01-design/wireframes/[feature-id]-layout.md`.

### Step D: New pattern design

For the first instance of a new pattern type, design it fully. This layout spec becomes the template for future instances.

Produce a layout spec covering all of the following sections. Adapt depth to the feature — a simple settings panel needs less than a full CRUD flow.

---

**Views needed**
List every distinct screen, panel, modal, or drawer this feature requires. For each: name it, describe its purpose, and say when/how it appears.

**Navigation and routing**
- How does the user get to this feature? (nav item, link from another view, deep link)
- What's the App Router path? (e.g. `/dashboard/dna/segments`)
- If there are sub-views (list → detail), how does routing work? (nested routes, search params, drawer overlay?)
- How does the user get back?

**List view** (for plural items — features with multiple instances)
- Layout: cards, table, or list? Why?
- What's shown in each row/card? (which fields, any computed values, status indicators)
- Sort order default and options
- Filtering options (if any)
- Empty state: what does the user see with no items? Include a call-to-action.
- Item count display?
- Pagination or infinite scroll? (for a single-user app, pagination is usually unnecessary early — note if deferred)

**Detail view** (what's shown when you open an item)
- Full-page or drawer/panel overlay?
- If complex: tab structure? What's on each tab?
- Which fields are shown, and in what layout?
- Inline editing or separate edit mode?
- Version history: how is it surfaced? (collapsed section, separate tab, timestamp in header?)
- Related items: are graph connections or related records shown? If so, how?

**Create flow**
- Triggered how? (button in list view header, FAB, inline in list?)
- Modal, drawer, or full page?
- Which fields appear in the create flow? (may be a subset of all fields — some might only appear on edit)
- Required vs optional fields, and how that's communicated
- Validation: when does it run? (on blur, on submit) What do errors look like?
- On success: where does the user land? (detail view of new item, back to list, stays on form?)
- On cancel: behaviour?

**Edit flow**
- Same modal/drawer as create, or separate?
- Are all fields editable, or are some read-only after creation? (e.g. slug, created date)
- For versioned items (DNA): is the edit a new version, or does it overwrite? How is this communicated to the user?
- How is version history accessed from edit view?

**Delete flow**
- Where is delete triggered? (detail view action, list row action, both?)
- Confirmation step: what does the confirmation say? Does it show the item name?
- Soft delete (hidden but recoverable) or hard delete (gone)? Note: for DNA and source knowledge, deleting is likely a rare/serious action — confirmation should be appropriately weighty.
- What happens to related data? (referenced in content registry, graph nodes?) — note if this needs handling in the implementation

**Image / avatar / thumbnail handling** (if applicable)
- Does this item type have a visual representation?
- How is it set? (file upload, URL, auto-generated initial/colour?)
- Default state when no image is set?
- Display size and crop in list view vs detail view?

**Empty states**
For each major view, what does the user see when there's no data?
- List view with no items: message + CTA
- Detail view with no content in a section: placeholder copy
- Search/filter with no results: message

**Loading and error states**
- Loading: skeleton screens or spinner? (shadcn/ui Skeleton component is the default)
- Error: what does the user see if a data fetch fails? Inline message or toast?
- Optimistic updates where appropriate — flag which actions should feel instant

**Mobile considerations**
Desktop-first but note anything that would break or need significant adaptation on smaller screens. This isn't a mobile design spec — just flag if the layout makes specific assumptions about viewport width.

**Molecule composition** *(mandatory — feeds the `feature-build` plan gate)*

This section is what `feature-build` Step B reads to seed its "Molecules to use / molecules to create" subsection. Be specific. The plan gate cannot proceed if any "new" molecule listed here lacks a one-line spec sketch.

```
### Existing molecules used
- [MoleculeName] (registry: components/[file].tsx, spec: design-system.md § [section]) — used for [purpose in this feature]
- ...

### Existing molecules used but unspecced *(known gap — DS-03)*
- [MoleculeName] (registry: components/[file].tsx, no spec) — used for [purpose]. Flag for spec backfill; do not block this feature on it unless behaviour is unclear.

### New molecules required
- [ProposedName] — [one-line purpose]. Spec sketch:
  - Props: [shortlist]
  - Visual: [the appearance contract — tokens used, states, variants]
  - Replaces: [which existing inline pattern this absorbs, or "net new"]
- ...

### Atoms used directly *(should be empty — every direct atom use is a missing molecule)*
- If any atom from `components/ui/*` is composed directly in an organism for this feature, list it here with a justification. The default expectation is: every entry here triggers a "new molecule required" entry above. An atom may be used directly only if it is genuinely one-off (rare) and that's noted explicitly.
```

---

**Hard gate:** Present the full layout spec. State: "This spec has not been filed yet. Approve to proceed."

The human may:
- Approve → proceed to Step E
- Request UX changes → update spec and re-present (this is the right time to push back on layout decisions)
- Flag a conflict with established patterns → resolve and re-present

This is the moment to challenge the design. Once this is approved and build starts, changes become more expensive.

### Step E: Save layout spec

1. Append the approved layout spec to the feature brief under the "UI/UX notes" section
2. Save the layout spec separately as `01-design/wireframes/[feature-id]-layout.md`
3. Update the brief status to `approved` (it was already approved from `feature-brief`, but note the layout is now complete)

### Step F: Register new template (new pattern only)

If this was a new pattern design (Step D path), and the feature type is likely to recur (e.g. any plural DNA item, any list+detail CRUD view):

Create a template file at `01-design/wireframes/templates/[pattern-name]-template.md`.

The template captures:
- The pattern name and what type of feature it applies to
- The canonical structure (all the structural decisions from this layout spec)
- The variable parts (what will differ between instances — field names, labels, type-specific behaviour)
- The feature(s) it was established from

Update the template registry in `feature-template-check` (SKL-03) — add the new template to the "Current registered patterns" list.

### Step G: Self-improvement check

After completing:

1. Were there layout questions that the feature brief hadn't answered, forcing guesswork? Propose additions to the `feature-brief` (SKL-01) questionnaire.
2. Did the layout spec miss anything that `feature-build` later needed? Propose additions to the spec structure.
3. Did a template adaptation reveal that the template needs updating? Propose the update.

Propose specific improvements if found. Human confirms or dismisses.

## Edge cases

- **Feature has no UI** (pure API / background processing): Skip this skill entirely. `feature-build` doesn't require a layout spec for non-UI features — note this in the brief.
- **Layout spec conflicts with an existing screen** (e.g. both use the same route): Flag the conflict. Don't design around it silently — the navigation architecture needs to be resolved first.
- **Feature depends on a UI that doesn't exist yet** (e.g. needs DASH-01 shell but that's not built): Design assuming the dependency will exist. Note the dependency clearly — `feature-build` will flag it again, but layout design shouldn't be blocked by it.
- **Human wants to skip layout design and go straight to build:** Don't allow it for new patterns. The layout spec is `feature-build`'s contract — building without it means building blind. For template adaptations, a very simple feature might combine the delta confirmation with the build plan review — flag this as an option for the human to decide.
- **Rework of existing UI** (e.g. restyling a built page after design system changes, sidebar restructure): This skill's full spec process is designed for net-new patterns. For reworks of already-built UI, the design conversation can happen inline during the build session — the existing implementation serves as the "spec" being revised. Don't force a full layout spec write-up when the changes are driven by a reference (style guide, mockup) and the human is actively reviewing the output. Document the rework decisions in the feature brief's decisions log or the session log instead.
