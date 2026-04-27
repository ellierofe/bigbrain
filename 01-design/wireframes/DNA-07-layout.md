# Layout: DNA-07 Platforms
Status: approved
Last updated: 2026-04-23

## Template

`dna-plural-item` (established from DNA-03 Audience Segments)

---

## What's identical to the template

- Routing model (`/dna/platforms`, `/dna/platforms/[id]`, `/dna/platforms/cards`)
- Header area with switcher pills + actions (cards, new, archive)
- Two-column detail layout (left sticky panel + tabbed content pane)
- Autosave on blur with 500ms debounce
- Card grid view (3-col/2-col responsive)
- Archive flow with dependency check
- Creation modal (guided conversation path, same GEN-01 pattern)
- Draft/active/archived status model (using `is_active` boolean + future status if needed)
- Loading states (Skeleton), toast system (Sonner)

---

## Delta from template

### Left panel fields

| Field | Type | Icon | Notes |
|---|---|---|---|
| Platform name | InlineField (input) | `Globe` | Primary name, bold |
| Platform type | Badge (read-only) | — | Set at creation, not editable. Styled badge: social=blue, email=purple, owned_content=green, video=red, audio=orange, other=grey |
| Handle/URL | InlineField (input) | `Link` | Secondary field |
| Active toggle | Switch | — | `isActive` boolean. Replaces the avatar slot from the template |
| Primary objective | InlineField (textarea, 3 rows) | `Target` | In left panel because it's the "what is this for" summary |

**No avatar/thumbnail** — platforms don't have a visual identity. The left panel space where the avatar sits in segments is used by the platform type badge + active toggle instead.

---

### Tabs (5 instead of 3)

| Tab | Slug | Content |
|---|---|---|
| **Strategy** | `strategy` | Text fields via InlineField + one select |
| **Formats & Output** | `formats` | Structured JSONB editors (new molecules) |
| **Ideas** | `ideas` | Structured JSONB editor + one textarea |
| **Performance** | `performance` | Three textareas |
| **Related Content** | `related` | Stub |

---

### Tab 1 — Strategy (with InPageNav sections)

| Section | Fields | Type | Icon |
|---|---|---|---|
| **Audience & positioning** | | | |
| | Audience | textarea, 4 rows | `Users` |
| | Customer journey stage | select: awareness / engagement / conversion / delight_advocacy | `ArrowRight` |
| | USP | textarea, 3 rows | `Star` |
| **Content approach** | | | |
| | Content strategy | textarea, 4 rows | `FileText` |
| | Posting frequency | input | `Clock` |
| | Growth function | textarea, 3 rows | `TrendingUp` |
| **Engagement** | | | |
| | Engagement approach | textarea, 3 rows | `MessageCircle` |
| | Hashtag strategy | textarea, 2 rows | `Hash` |

`hashtagStrategy` conditionally hidden when `platformType` is `audio`, `video`, or `owned_content`.

---

### Tab 2 — Formats & Output (with InPageNav sections)

| Section | Content |
|---|---|
| **Content formats** | `ExpandableCardList` — each card: format name (input), description (textarea 3 rows), character/duration limit (number input), best for (StringListEditor), frequency (input). Add/remove/reorder. |
| **Structure & features** | Content structure (textarea 3 rows), Signature features (`ExpandableCardList` — name + description), Branded components (`StringListEditor`) |
| **Constraints** | Character limits (`KeyValueEditor` — key/value pairs + notes textarea), Do not do (`StringListEditor`) |

---

### Tab 3 — Ideas

| Section | Content |
|---|---|
| **Subtopic ideas** | `ExpandableCardList` — each card: subtopic name (input), examples (`StringListEditor`). Add/remove. |
| **Content pillar themes** | InlineField textarea, 4 rows. Label note: "Freeform until content pillars are built." |

---

### Tab 4 — Performance

| Field | Type | Icon |
|---|---|---|
| Analytics goals | textarea, 4 rows | `BarChart3` |
| Performance summary | textarea, 4 rows | `Activity` |
| Notes | textarea, 4 rows | `StickyNote` |

---

### Tab 5 — Related Content

Stub: "Coming soon — content created for this platform will appear here."

---

### Card grid — card content

- Platform type badge (top-left, small coloured pill)
- Platform name (bold, truncated)
- Primary objective (2-line clamp, muted)
- Active/inactive indicator (subtle dot or muted text if inactive)

---

### Creation modal steps

1. Platform name (required) + platform type (required, select) + handle (optional)
2. "What is this platform for?" (required, maps to `primaryObjective`) + "Who's the audience here?" (optional)
3. Evaluation + follow-ups (same GEN-01 pattern)

---

### Empty state copy

- List: "No platforms yet. Add your first platform to define how your brand shows up on each channel."
- Content formats empty: "No formats defined yet. Add your first content format."
- Subtopic ideas empty: "No subtopic ideas yet. Add a topic cluster to seed content generation."

---

### Archive dependency targets

- Future: content registry (OUT-02) will reference platform ID
- Currently: no dependent tables, so archive is always a simple confirmation

---

## New molecules

### ExpandableCardList

**File:** `components/expandable-card-list.tsx`
**Purpose:** Editable list of structured JSONB array items. Each item renders as a collapsible card with a summary line when collapsed and full form fields when expanded.

Spec:
- **Collapsed card:** Single row — primary field value (bold) + secondary field value (muted, right-aligned) + chevron icon. Click anywhere to expand.
- **Expanded card:** All fields rendered as InlineField components within the card. Card has subtle border (`border-border/60`) and `bg-card` background, `rounded-md`, `p-4`.
- **Add button:** Bottom of list. `+ Add [item type]` text button. Inserts a new expanded empty card at the bottom.
- **Delete:** Trash icon on each card (visible on hover for collapsed, always visible for expanded). Confirm via inline "Delete?" / "Yes" / "Cancel" — no modal for list items.
- **Reorder:** Not in v1 — defer drag-to-reorder. Items display in array order.
- **Save:** On blur of any field within an expanded card, save the entire parent JSONB array. Debounced 500ms.
- **Props:** `items: T[]`, `onSave: (items: T[]) => Promise<{ok: boolean}>`, `renderCollapsed: (item: T) => {primary: string, secondary?: string}`, `renderExpanded: (item: T, onChange: (item: T) => void) => ReactNode`, `addLabel: string`, `emptyMessage: string`
- **Empty state:** `emptyMessage` text + add button.

### StringListEditor

**File:** `components/string-list-editor.tsx`
**Purpose:** Add/remove list of string values. Used for `doNotDo`, `brandedComponents`, `bestFor`.

Spec:
- Each string is a row: text value + delete (X) icon on hover
- Add: text input at bottom with "Add" button or Enter to submit. Input clears after add.
- No reorder in v1.
- Inline within a parent form section — not a standalone card.
- **Props:** `values: string[]`, `onSave: (values: string[]) => Promise<{ok: boolean}>`, `placeholder: string`, `label?: string`

### KeyValueEditor

**File:** `components/key-value-editor.tsx`
**Purpose:** Edit a flat JSONB object as key-value pairs. Used for `characterLimits`.

Spec:
- Each key-value pair is a row: key (input, left) + value (input, right) + delete (X) icon
- Add: "Add field" button at bottom, inserts empty row
- Special `notes` key rendered as a full-width textarea below the key-value pairs (not as a row)
- Save: on blur of any field, save the entire object. Debounced 500ms.
- **Props:** `data: Record<string, string | number>`, `onSave: (data: Record<string, string | number>) => Promise<{ok: boolean}>`, `notesKey?: string`

---

## Decisions log

- 2026-04-23: Layout approved. Template adaptation from dna-plural-item. 5 tabs (Strategy, Formats & Output, Ideas, Performance, Related Content). No avatar — replaced with platform type badge + active toggle. Three new molecules: ExpandableCardList, StringListEditor, KeyValueEditor. hashtagStrategy conditionally hidden for non-social platforms.
