# Layout Spec: IDEA-01 — Ideas / Quick Capture
Feature ID: IDEA-01
Status: approved
Last updated: 2026-04-23

**Template check:** No match. New pattern — global capture trigger + lightweight list with inline triage. Structurally distinct from both `dna-plural-item` and `project-workspace`.

---

## Views needed

| View | Purpose | How it appears |
|---|---|---|
| **Capture modal** | Fast text input for a thought/question/spark | Lightbulb button in top toolbar (already wired) |
| **Ideas list** | Browse, triage, and manage captured ideas | Tab in Inputs section at `/inputs/ideas` |

Two views only. No detail page — ideas are short text fragments, not documents.

---

## Navigation and routing

- **Capture modal:** Triggered from top toolbar lightbulb icon (already exists in `TopToolbar`). Available on every page. Not a route.
- **Ideas list:** `/inputs/ideas` — sits alongside Sources, Results, Process in the Inputs nav group. Already present in `nav-config.ts`.
- **No deep-linked detail view.** Ideas are triaged inline in the list. Long text expands in-place.

---

## Capture modal

Already stubbed at `components/idea-capture-modal.tsx`.

```
┌──────────────────────────────────┐
│  Capture idea                     │
│  Jot it down. Triage later.       │
│                                   │
│  [💡 Idea] [❓ Question]   toggle │
│                                   │
│  ┌──────────────────────────────┐ │
│  │ What's on your mind?         │ │
│  │                              │ │
│  │         (textarea)           │ │
│  │                              │ │
│  └──────────────────────────────┘ │
│                                   │
│                    [Capture ⌘↵]   │
└──────────────────────────────────┘
```

- **Size:** `sm:max-w-md`
- **Type toggle:** Two-option pill toggle above the textarea — `Idea` (Lightbulb icon) and `Question` (HelpCircle icon). Default: `Idea`. Compact pill-style, not a dropdown. Resets to `Idea` each time modal opens.
- **Fields:** Single `Textarea`, no label, placeholder "What's on your mind?"
- **Auto-focus** on open
- **Submit:** "Capture" button + `⌘+Enter` keyboard shortcut
- **On success:** Clear textarea, close modal, return user to where they were. No toast.
- **On cancel / close:** Close without warning. Ideas are sticky notes — if you close mid-thought, that's fine.
- **Context page:** Auto-captured from `usePathname()`. Stored but not displayed in the modal.
- **No mission/project tagging in v1.** Add when CLIENT-01 and MISSION-01 are built.

---

## Ideas list view

Route: `/inputs/ideas`

```
┌─────────────────────────────────────────────────────────────────┐
│  PageHeader: "Ideas & Questions"  icon: Lightbulb               │
│                                            action: [+ Capture]  │
├─────────────────────────────────────────────────────────────────┤
│  Status: [All (12)] [Captured (8)] [Shelved (3)] [Done (1)]     │
│  Type:   [All] [💡 Ideas (7)] [❓ Questions (5)]                │
├─────────────────────────────────────────────────────────────────┤
│  ContentPane                                                    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 💡  "Use IdTechEx report and customer enquiries from       ││
│  │     Manus AI etc to prove timing window"                   ││
│  │     captured · from /inputs/process · 2 hours ago          ││
│  │                                      [Shelve] [Done] [🗑]  ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ ❓  "How do we prove the timing opportunity is right?      ││
│  │     JPMorgan report?"                                      ││
│  │     captured · from /inputs/process · yesterday            ││
│  │                                      [Shelve] [Done] [🗑]  ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ ...                                                        ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Layout
Vertical list (not cards, not table). Ideas are text-first.

### Each idea row shows
- **Type icon** — 💡 (idea) or ❓ (question) at the start of the row. Clickable to toggle type (saves immediately, autosave pattern).
- **Text** — full text for short ideas (< ~150 chars). Truncated to 2 lines for longer text, with "Show more" to expand in-place. No separate detail view.
- **Status badge** — `captured` (default, muted), `shelved` (faded), `done` (green/check)
- **Context page** — where the idea was captured from, e.g. "from /dna/offers". `text-muted-foreground text-[12px]`. Omitted if null.
- **Relative timestamp** — "2 hours ago", "yesterday", "Apr 18"
- **Actions** — appear on row hover:
  - **Shelve** / **Unshelve** (toggles) — text button, muted
  - **Done** / **Reopen** (toggles) — text button, muted
  - **Delete** — trash icon, destructive. Hard delete, optimistic removal with undo toast (3s window). No confirmation modal.

### Filter pills
Two dimensions, both active simultaneously (AND logic):

**Status row:** `All` | `Captured` | `Shelved` | `Done` — each with count badge. Default: `Captured`.

**Type row:** `All` | `💡 Ideas` | `❓ Questions` — each with count. Default: `All`.

Active pill: `bg-primary text-primary-foreground`. Inactive: `bg-secondary text-secondary-foreground`.

### Sort order
Newest first (`created_at DESC`). No sort options.

### Header action
"+ Capture" button opens the same `IdeaCaptureModal`. Second entry point alongside toolbar lightbulb.

### Inline editing
Click idea text to edit in-place. Textarea appears, save on blur. 500ms debounce, "Saved"/"Failed" indicator. Same autosave pattern as InlineField.

---

## Data model addition

The brief's data model needs one additional field:

| Field | Type | Required | Constraints | Notes |
|---|---|---|---|---|
| `type` | text | yes | enum: `idea`, `question` | Default: `idea` |

---

## Create flow

The capture modal IS the create flow. "+ Capture" in the list header opens the same `IdeaCaptureModal`.

---

## Delete flow

- **Trigger:** Trash icon on each row (hover)
- **No confirmation modal.** Optimistic delete with undo toast: "Idea deleted. [Undo]" — 3s window.
- **Hard delete.** No cascading effects.

---

## Empty states

**No ideas captured yet:**
```
    💡

    No ideas yet

    Thoughts, questions, sparks — capture them here
    so they don't get lost. Use the lightbulb button
    in the toolbar, or click below.

    [+ Capture an idea]
```

**Filter shows no results** (e.g. "Done" tab with nothing done):
"No [done] ideas yet." — simple inline text, no CTA.

---

## Loading and error states

- **List loading:** Skeleton — 4 rows with text block placeholders
- **Save error (inline edit):** "Failed" indicator next to field
- **Delete error:** Restore row (optimistic undo) + toast "Couldn't delete idea"
- **Status change error:** Revert badge + toast

---

## Reusable molecule: IdeasList

The ideas list view should be built as a **reusable molecule** (`components/ideas-list.tsx`) that can be embedded in other contexts:

- **Standalone page** at `/inputs/ideas` — shows all ideas, all filters
- **Embedded in project/mission workspaces** (future: CLIENT-01, MISSION-01) — filtered by context. When missions/projects gain `idea_missions` / `idea_projects` join tables, the molecule accepts an optional `contextFilter` prop (e.g. `{ missionId: string }` or `{ projectId: string }`) that scopes the query to linked ideas only. The workspace embeds the molecule in a SectionCard.
- **Props:** `contextFilter?`, `showFilters?` (default true — workspaces may hide the status filter row for compactness)

This avoids rebuilding the ideas list UI when project workspaces land.

---

## Mobile considerations

Desktop-first. Single-column layout works on narrower viewports. Action buttons may need always-visible treatment on touch — future concern.

---

## Keyboard shortcut

Deferred. `⌘+I` flagged as possible hotkey — not in v1 scope.
