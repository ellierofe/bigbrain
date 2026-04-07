# Layout Spec: INP-03 Input Processing Pipeline
Status: draft
Last updated: 2026-04-01
Template: establishes `input-process` pattern (new pattern — no existing match)

---

## Template check result
No applicable template found. INP-03 is a pipeline/flow pattern (text input → async LLM extraction → side panel review → commit). Structurally distinct from all existing patterns. This spec establishes the `input-process` template.

---

## Views

| View | Purpose | When it appears |
|---|---|---|
| Process page | Paste or trigger text input, initiate extraction | `/dashboard/inputs/process` |
| Results side panel | Review extracted items, confirm or deselect before saving | Slides in from the right after extraction completes |
| Commit summary state | Shows what was saved after confirmation | Replaces panel action area after commit |

---

## Navigation and routing

- **Entry:** "Inputs" section in sidebar → sub-item "Process text" → `/dashboard/inputs/process`
- **Also triggered programmatically:** INP-01 (Krisp) will navigate to this page (or call the API directly) after uploading a file. The page accepts a `?source=` query param to pre-populate metadata fields.
- **Routes:**
  - `/dashboard/inputs/process` — main process page
  - `/dashboard/inputs` — future home of INP-07 input queue (not built yet — sidebar item stubbed)
- **Back:** Sidebar navigation — no back button needed on this page.

---

## Process page layout

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│  Process Input                                                    [nav sidebar]  │
│  Turn text into linked knowledge.                                               │
├──────────────────────────────────────────────────────────┬──────────────────────┤
│  MAIN AREA (flex-1)                                      │  RESULTS PANEL       │
│                                                          │  (w-[480px],         │
│  ┌──────────────────────────────────────────────────┐   │   slides in after    │
│  │ Metadata row                                      │   │   extraction)        │
│  │ [Title input]  [Source type ▾]  [Date input]     │   │                      │
│  │ [Tags: coaching × client:acme ×  + add tag...]   │   │                      │
│  └──────────────────────────────────────────────────┘   │                      │
│                                                          │                      │
│  ┌──────────────────────────────────────────────────┐   │                      │
│  │                                                   │   │                      │
│  │  Paste your text here...                         │   │                      │
│  │                                                   │   │                      │
│  │  (textarea, min-h-[480px], font-mono text-sm)    │   │                      │
│  │                                                   │   │                      │
│  └──────────────────────────────────────────────────┘   │                      │
│                                                          │                      │
│  [char count / word count]    [Extract knowledge →]      │                      │
│                                                          │                      │
└──────────────────────────────────────────────────────────┴──────────────────────┘
```

### Metadata row

Four fields, inline, above the textarea:

- **Title** — `Input` component, placeholder "e.g. Mastermind hotseat — March 2026", required. Auto-populated if triggered from INP-01 with filename.
- **Source type** — `Select` component. Options: Transcript / Session note / Research / Voice note / Image / Email / Document / Other. Default: Transcript. Values: `transcript | session-note | research | voice-note | image | email | document | other`.
- **Date** — `Input` type=date, optional. Defaults to today. Used for temporal graph edges — if blank, commit date is used.
- **Tags** — tag input. Free-text, press Enter or comma to add a pill. No predefined list. Placeholder: "Add tags — e.g. coaching, client:acme". Optional. Tags stored on `src_source_documents.tags` for filtering within a type.

### Textarea

- `min-h-[480px]`, `font-mono text-sm` — monospace makes transcript text more readable
- Placeholder: "Paste your text here — transcripts, session notes, documents, research..."
- Character count shown below right: "2,340 chars · ~585 words". Amber when >28,000 chars with tooltip "Long text will be chunked for processing."
- No max length enforced — chunking handles it

### Extract button

- `"Extract knowledge →"` — primary, right-aligned below textarea
- Disabled if textarea is empty or title is blank
- Loading state: button text becomes "Extracting..." with spinner. Textarea and metadata fields become read-only.
- On success: results panel slides in from right, main area shifts left (flex layout)
- On error: toast (error) — "Extraction failed — please try again"

---

## Results side panel

Slides in from the right after extraction. `w-[480px]`, full viewport height, sticky. Main area compresses (doesn't go behind panel).

```
┌────────────────────────────────────────────────┐
│  What we found                     [✕ close]   │
│  23 items across 6 categories                  │
├────────────────────────────────────────────────┤
│  [Select all]  [Deselect all]                  │
├────────────────────────────────────────────────┤
│  ▼ IDEAS  (8)                   [☐ select all] │
│  ☑ The "souls" technique is a w...  HIGH        │
│  ☑ Multiple-choice prompting red...  HIGH       │
│  ☑ Shortening the swim — break m...  MED        │
│  ☑ Love the ball — single focus...  HIGH        │
│  ☑ Making invisible work visible...  MED        │
│  ☑ Marathon as mountain run (not...  MED        │
│  ☑ Dev update skill as whiteboar...  LOW        │
│  ☑ AI orchestration = new manage...  HIGH       │
├────────────────────────────────────────────────┤
│  ▼ PEOPLE  (4)                  [☐ select all] │
│  ☑ Demetrius                         HIGH       │
│  ☑ Robert                            HIGH       │
│  ☑ Ray                               HIGH       │
│  ☑ Ellie Rofe                        HIGH       │
├────────────────────────────────────────────────┤
│  ▼ TECHNIQUES  (3)              [☐ select all] │
│  ☑ Souls technique (Demetrius)        HIGH      │
│  ☑ Multiple-choice prompting          MED       │
│  ☑ Inner Game of Tennis framework     MED       │
│  ...                                            │
├────────────────────────────────────────────────┤
│  [sticky footer]                               │
│  Save 21 to BigBrain                           │
│  (updates as checkboxes toggled)               │
└────────────────────────────────────────────────┘
```

### Panel header
- Title: "What we found"
- Subtitle: "N items across N categories" — updates as items are deselected
- Close button (✕) — dismisses panel, nothing written, text remains in textarea

### Global controls
- "Select all" / "Deselect all" — applies across all categories

### Category sections
Each extraction type gets a collapsible section. Sections with zero items are hidden.

**Section header:**
- Label: "IDEAS", "CONCEPTS", "PEOPLE & ORGS", "STORIES", "TECHNIQUES", "CONTENT ANGLES"
- Count badge: `(8)`
- Per-section "select all / deselect all" checkbox (top right of section header)
- Chevron to collapse/expand — expanded by default

**Each item row:**
- Checkbox (default: checked)
- Text: truncated at ~60 chars, full text on hover tooltip
- Confidence badge: `HIGH` (green) / `MED` (amber) / `LOW` (muted/grey)
- `LOW` confidence items shown at bottom of their section, slightly muted
- **Story items only:** inline `subject` select (`Self / Client / Business / Project`) shown below the story title. Defaults to `Self`. Editable before commit — story subject is often ambiguous in transcript context.

### Panel footer (sticky)
- Primary CTA: `"Save [N] to BigBrain"` — N updates live as checkboxes toggled
- Disabled if N = 0
- Secondary: `"Cancel"` text link — dismisses panel, nothing written

### Commit loading state
After clicking Save:
- Button becomes `"Saving..."` with spinner
- Checkboxes disabled
- Panel header subtitle: "Writing to graph and database..."

### Commit success state
- Header: "Saved to BigBrain"
- Subtitle: "8 ideas · 3 people · 1 story · 1 source document"
- Body: brief summary list (same clusters, now showing counts only)
- Single CTA: `"Process another"` → clears textarea, closes panel, resets form
- Panel stays open until dismissed — gives time to read the summary

---

## Empty states

**Process page, no text yet:**
No empty state needed — textarea placeholder is sufficient.

**Extraction returns nothing:**
Panel opens but shows: icon `SearchX`, heading "Nothing significant found", description "Try a longer or more detailed input, or check that your text is readable." CTA: "Close". SourceDocument row is still created on commit (preserves provenance) — but since there's nothing to confirm, a quiet "Save source only" link appears below the close button.

---

## Loading and error states

- **Extracting:** Button spinner + "Extracting..." label. Fields locked. No skeleton — user can see their text while waiting.
- **Extraction error:** Toast (error) — "Extraction failed — please try again". Fields unlock. Panel does not open.
- **Commit error (partial):** Panel footer shows inline error: "Saved with errors — X items failed. [View details ▾]" — expands to show which items failed with reason.
- **Commit error (total):** Toast (error) — "Save failed — nothing was written. Please try again."

---

## Viewport

Desktop only. `min-w-[1024px]` assumed — side panel at 480px requires enough main area width to remain usable. Below 1024px: panel overlays rather than pushes (absolute positioned over main area, with overlay scrim).

---

## Backlog items to add

1. **INP-07 queue page** — `/dashboard/inputs` stub needed as the parent section. Add to backlog as planned.
2. **Re-process document** — allow re-running extraction on a previously processed source document (dedup + merge logic needed). V2.
3. **Edit extracted items before saving** — inline text editing in the panel. V2.
4. **Krisp auto-ingest trigger** — INP-01 navigates to this page with pre-populated text. Wire up the `?source=` param.
