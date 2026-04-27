# Layout Spec: DNA-04 Offers
Status: approved
Last updated: 2026-04-23
Template: `dna-plural-item` (adaptation, not new pattern)

---

## Layout delta from `dna-plural-item` template

**Template:** `01-design/wireframes/templates/dna-plural-item-template.md` (established from DNA-03)

### What's identical to the template

- Routing model (`/dna/offers`, `/dna/offers/[id]`, `/dna/offers/cards`)
- Default landing behaviour (redirect to first active item or empty state)
- Header area structure (title + status badge + actions + switcher pills)
- Two-column detail layout (left sticky panel + tabbed content pane)
- Autosave on blur, 500ms debounce, inline save indicators
- Card grid view (3-col/2-col responsive)
- Archive flow with dependency check
- Draft behaviour (badge, not selectable as target until active)
- Loading states (Skeleton), error states (inline + toast)
- Viewport (768px+)

### What changes

**Route slug:** `offers`

**Page title:** "Offers"

**Card grid subtitle:** "Define what you sell."

**Status values:** `draft | active | retired | paused` (4 values vs segments' 3). Colour-coded in header badge per template spec.

**Left sticky panel:**
| Field | Type | Notes |
|---|---|---|
| Offer name | InlineField (input) | Bold, primary name |
| Type | Select dropdown | From known offer types list |
| Overview | InlineField (textarea) | 2-4 sentence summary |
| Primary audience | Link (read-only) | Displays segment name, links to segment detail view |
| Knowledge asset | Link or "Link IP" button | Displays asset name if linked, or button to open picker |

No avatar/thumbnail. Status is in the header (per template), not left panel.

**Card grid card:**
- Offer name (bold, truncated)
- Type badge (small, muted)
- Status badge (if not active — draft/retired/paused)
- Primary audience name (small, muted-foreground)
- Overview (3 lines, truncated)
- No avatar/thumbnail

**Tabs (5):**

| # | Tab name | Template equivalent | Content |
|---|---|---|---|
| 1 | Positioning | Main content tab | USP, USP explanation, CTA, visual prompt, VOC mapping |
| 2 | Commercial | — (new) | Pricing, guarantee, scarcity, funnel notes |
| 3 | Value Gen | Sub-items table tab | Entity outcomes (6 kinds) |
| 4 | Journey | — (new) | Structured customer journey (5 stages) |
| 5 | Related Content | Related Content tab | Stub |

---

### Tab 1: Positioning

Mini-nav sections:
- **Value proposition** — USP (textarea, icon `Gem`), USP explanation (textarea, icon `MessageSquare`)
- **Call to action** — CTA (input, icon `MousePointerClick`), Visual prompt (textarea, icon `Image`)
- **Audience alignment** — VOC mapping display:
  - Primary audience segment name as section header (links to segment)
  - Four grouped checklists: problems, desires, objections, beliefs
  - Each item shows statement text from the audience segment's JSONB arrays
  - Checkbox per item — checked = this offer addresses it
  - Category badge per statement (practical/emotional/psychological/social)
  - Save on check/uncheck (immediate)
  - If audience archived: "(archived)" badge on header, checkboxes disabled, read-only

---

### Tab 2: Commercial

Mini-nav sections:

**Pricing**
- Currency (input, icon `CircleDollarSign`, label "Currency", placeholder "GBP")
- Main price (input, icon `Banknote`, label "Price", type number)
- Display price (input, icon `Tag`, label "Display price", placeholder "£3,500")
- Payment plans — list of {label, amount} pairs. Add/remove. Each row: label input + amount input.
- Pricing notes (textarea, icon `StickyNote`, label "Pricing notes")
- Reframing note (textarea, icon `RefreshCw`, label "Price reframing")

**Guarantee**
- Type (input, icon `Shield`, label "Guarantee type", placeholder "satisfaction")
- Headline (input, icon `Type`, label "Headline")
- Description (textarea, icon `FileText`, label "Description")
- Terms (textarea, icon `Scale`, label "Terms")
- Business risk note (textarea, icon `AlertTriangle`, label "Business risk note")

**Funnel**
- Scarcity (textarea, icon `Clock`, label "Scarcity / urgency")
- Sales funnel notes (textarea, icon `Filter`, label "Sales funnel notes")

---

### Tab 3: Value Gen

Entity outcomes from `dna_entity_outcomes` table, linked via `offer_id`.

**Filter pills row:**
`All` | `Outcomes (n)` | `Benefits (n)` | `Advantages (n)` | `Features (n)` | `Bonuses (n)` | `FAQs (n)`

No minimum count badges.

**Table columns vary by kind:**

*Outcomes / Benefits:*
- Checkbox | Kind badge | Category badge (resources/skills/mindset/relationships/status) | Body (click to edit)

*Advantages:*
- Checkbox | Kind badge | Body (click to edit)

*Features:*
- Checkbox | Kind badge | Body (click to edit)

*Bonuses:*
- Checkbox | Kind badge | Body (click to edit) | Objection addressed (click to edit) | Value statement (click to edit)

*FAQs:*
- Checkbox | Kind badge | FAQ type badge (logistics/differentiation/psychological/pricing/timeline) | Question (click to edit) | Answer/body (click to edit)

**Add dropdown:** "Add ▾" → Outcome / Benefit / Advantage / Feature / Bonus / FAQ

**Toolbar + deletion:** Same as template (multi-select, optimistic delete, restore on failure).

**Empty state per kind:** "No [kind]s yet — add your first one via the Add button above."

---

### Tab 4: Journey

Customer journey — 5 fixed stages displayed as a vertical sequence of stage cards.

**Layout:** Each stage is a SectionCard:
```
┌─────────────────────────────────────┐
│ ● Awareness                         │
├─────────────────────────────────────┤
│ Thinking    [textarea]              │
│ Feeling     [textarea]              │
│ Doing       [textarea]              │
│ Push to next [textarea]             │
└─────────────────────────────────────┘
       ↓
┌─────────────────────────────────────┐
│ ● Consideration                     │
│ ...                                 │
```

- Stage header: stage name (capitalised), with a subtle step indicator (●, or numbered)
- Fields: InlineField textareas, icons: Thinking (`Brain`), Feeling (`Heart`), Doing (`Activity`), Push to next (`ArrowRight`)
- Advocacy stage: no "Push to next" field
- Autosave on blur per field
- Vertical connector lines between stages (subtle `border-l` or `→`)

**Actions:**
- "Generate journey" button in tab header — generates all 5 stages from audience profile + offer details + VOC mapping
- If journey already exists: confirmation dialog "This will replace the current journey — proceed?"
- Individual stage regeneration: small refresh icon per stage card (stretch — implement if easy, otherwise defer)

**Empty state:** "No customer journey yet. Generate one based on your audience and offer details." + "Generate journey" CTA button.

**Generation model:** Same as offer generation (Gemini Pro). System prompt receives: offer overview, USP, target audience profile (full), VOC mapping (which statements this offer addresses), entity outcomes summary.

---

### Tab 5: Related Content

Stub — same as template: "Content created using this offer will appear here once the content registry is built."

---

### Creation modal — three-phase flow

Departs from the template's 3-step form. Three phases:

**Phase 1: Quick form**
- Offer name (input, required)
- Offer type (select, required — known types: productised service, retainer, intensive, 1:1 coaching, 1:1 consulting, course, group programme, digital product, subscription, newsletter, book, template, tool, event, other)
- Status (select, default: draft)
- Primary audience (select from existing segments, required)
- Progress: "Step 1 of 3"
- Footer: Cancel | Next →
- **No segments exist:** audience select shows "Create an audience segment first" + link to `/dna/audience-segments`. Next disabled.

**Phase 2: VOC mapping**
- Header: selected audience segment name
- Four grouped checklists with section headers + counts:
  - Problems — statement text + category badge
  - Desires — statement text + category badge
  - Objections — statement text (not answer)
  - Beliefs — statement text
- Checkboxes per item, none pre-checked
- Helper text: "Select at least 1 problem and 1 desire for the best results" (soft, not blocking)
- Progress: "Step 2 of 3"
- Footer: ← Back | Next →

**Phase 3: Interlocutor generation**
- Same pattern as GEN-01:
  - LLM evaluation — checks sufficiency, may ask 1-2 follow-ups
  - Follow-ups displayed with text inputs + "Continue"
  - If sufficient: "Generate offer" primary button
  - Generating state: spinner + "Generating your offer — this takes about 30 seconds" + "Don't close this tab" + Cancel
  - On complete: save offer + entity outcomes → redirect to detail view
- Progress: "Step 3 of 3"
- Footer: ← Back | Generate offer (primary)
- No "Save as draft" escape — manual creation via generation then edit

**Customer journey NOT generated during creation** — generated on-demand from the Journey tab after reviewing the core offer.

---

### Empty state

- Icon: `Package`
- Heading: "No offers yet"
- Description: "Create your first offer to define what you sell and how it maps to your audience."
- CTA: "Create your first offer" → opens creation modal

---

### Archive dependency targets

- `dna_knowledge_assets.related_offer_ids` (uuid array, soft ref)

---

### Knowledge asset picker

Triggered by "Link IP" button in left panel:
- Small modal or popover listing active knowledge assets (name + kind badge)
- Select one → saves `knowledgeAssetId` on the offer
- "Unlink" option when already linked
- No assets exist: "No knowledge assets yet — create one in Knowledge Assets."
