---
name: feature-template-check
description: Check whether a UI pattern already exists before designing a new feature. Called automatically at the start of layout-design. Returns a match or confirms a new pattern is needed.
---

# feature-template-check (SKL-03)

Before designing a new feature's UI, check whether an applicable pattern already exists in the template registry. Prevents reinvention of patterns that have already been established and approved.

## Autonomy level

**Autonomous with summary** — runs without a gate. Returns one of two outcomes: a match (proceed with template adaptation) or no match (proceed with new pattern design). The result is reported and logged; the human doesn't need to approve the check itself.

## Pre-conditions

- Called automatically at the start of `layout-design` (SKL-02)
- Can also be called independently if you want to check before writing a brief

## Steps

### Step A: Read the feature brief

Read `01-design/briefs/[feature-id]-[feature-slug].md`. Extract:
- What type of feature is this? (list + detail view, form-based CRUD, read-only display, pipeline/flow, settings panel, etc.)
- What data does it display or edit?
- How does it behave — is it a single item, a collection, an input form, a dashboard widget?

### Step B: Scan the template registry

Read all files in `01-design/wireframes/templates/`.

Each template file describes a pattern type: its canonical structure, the features it was established from, and the variable parts (what changes between instances).

Current registered patterns (update this list as new templates are added):
- `dna-plural-item-template.md` — plural DNA item: card grid + full-page detail view (left sticky panel + tabbed content pane with mini-nav) + creation modal + inline autosave + archive flow. Established from DNA-03 (audience segments).
- `project-workspace-template.md` — project workspace: filterable list table + detail workspace (read-heavy hub with linked-item sections, light editing, archive). The workspace is a lens, not a workbench. Established from CLIENT-01 (client projects). Also applies to: MISSION-01 (missions).
- `tab-master-detail-template.md` — plural collection inside a parent page's tab: narrow master list (fixed top/bottom chrome + scrolling middle) + detail pane (fixed identifier chrome + scrolling body) + minimal create modal + inline autosave + archive flow. For collections with 5+ editable fields where table-with-expand would be cramped. Established from DNA-09 (Applications tab on Tone of Voice page).
- `tab-table-expand-template.md` — plural collection inside a parent page's tab: table with compact summary rows, click a row to expand inline-editable fields below. For collections that are mostly browsable with ~3-6 short fields. Simpler/denser alternative to `tab-master-detail`. Established from DNA-09 (Samples tab on Tone of Voice page, retroactively registered).

If the directory is empty or a template doesn't exist for the relevant pattern yet, that's expected early in the project — note it and proceed to "no match".

### Step C: Return the result

**Match found:**
> "This feature matches the **[pattern name]** pattern (template at `01-design/wireframes/templates/[file]`, established from [feature ID]). `layout-design` will proceed with template adaptation — only the variable parts (field names, labels, type-specific behaviour) need specifying."

Log the match in the feature brief under a "Template match" line in the UI/UX notes section.

**No match:**
> "No applicable template found for this feature type. `layout-design` will proceed with new pattern design. If this establishes a reusable pattern, a template will be created after the first instance is built and confirmed."

Log this in the feature brief too.

## What makes a good template match

A pattern match means the **structural behaviour** is the same, not just that the feature involves a list or a form. Ask:
- Same navigation model? (how you get to the list, how you open a detail, how you create/edit)
- Same data lifecycle? (e.g. both are versioned plural items with a create modal and an edit-in-place detail view)
- Same relationship to the rest of the app? (both are subsections of the dashboard, both feed into the content creator)

Surface-level similarity (both have a list and a form) is not sufficient for a template match. The template should be applicable with only field names and labels changing — not structural rethinking.

## Self-improvement check

If a template match was borderline — close but not quite right — note it. Over time, patterns may need variants. If the same "close but not quite" situation arises twice, propose a new template or a template variant rather than designing from scratch each time.
