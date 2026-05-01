/**
 * Component Registry
 *
 * Single source of truth for all shared UI components.
 *
 * RULES (enforced by feature-build, layout-design, and design-system skills):
 * 1. Before creating a new component, check this registry.
 *    If something close enough exists, use or extend it — don't duplicate.
 * 2. After creating a new shared component, add it here AND add its spec entry to
 *    01-design/design-system.md before composing it into any organism.
 * 3. components/ui/ is reserved for shadcn/ui base components — do not add custom
 *    components there. Custom components live in components/ and are listed here.
 * 4. When a component is removed or renamed, update this registry first.
 * 5. Every entry must have a `spec` field. `null` is allowed only as a known gap
 *    (tracked by DS-03 backfill); new molecules added here MUST point to a real
 *    spec anchor before plan approval per the feature-build hard gate.
 *
 * DESIGN SYSTEM NOTE:
 * All components use CSS variables (--background, --foreground, --muted, etc.) defined
 * in app/globals.css. When a design scheme is applied, update those variables and
 * Tailwind design tokens — components update automatically without code changes.
 *
 * COHERENCE CHECK:
 * Run `npm run check:design-system` (script at 02-app/scripts/check-design-system.ts)
 * to validate registry ↔ spec alignment. The design-system skill Mode B invokes this
 * automatically as part of post-build drift checks.
 */

export type ComponentCategory =
  | "layout"    // Structural / page-level
  | "feedback"  // Empty states, errors, loading
  | "form"      // Form containers and field wrappers
  | "overlay"   // Modals, drawers, tooltips
  | "editor"    // Structured data editors

export interface ComponentEntry {
  name: string
  path: string
  category: ComponentCategory
  description: string
  /** Props summary — enough to know if this component fits your use case */
  props: string
  /** Features that use this component (updated as the app grows) */
  usedIn: string[]
  /**
   * Spec anchor in 01-design/design-system.md (e.g. "molecule-specifications/inline-field"
   * resolves to the heading "### InlineField" under "## Molecule specifications").
   * Pass `null` ONLY for known gaps tracked by DS-03 (spec backfill). New molecules
   * added to this registry must point to a real spec anchor — `null` is not valid for
   * net-new entries per the feature-build hard gate.
   */
  spec: string | null
}

export const componentRegistry: ComponentEntry[] = [
  {
    name: "Modal",
    path: "@/components/modal",
    category: "overlay",
    description:
      "Standard modal dialog. Wraps shadcn Dialog. Use for all modal interactions: generation, confirmation, editing. Optional footer slot for action buttons.",
    props: "open, onOpenChange, title, description?, children, footer?, size? (sm|md|lg|xl|2xl)",
    usedIn: [],
    spec: "molecule-specifications/modal",
  },
  {
    name: "PageHeader",
    path: "@/components/page-header",
    category: "layout",
    description:
      "Consistent page title + optional subtitle + optional top-right action slot. Use at the top of every dashboard page.",
    props: "title, subtitle?, icon? (LucideIcon), action?, className?",
    usedIn: [],
    spec: "molecule-specifications/pageheader",
  },
  {
    name: "EmptyState",
    path: "@/components/empty-state",
    category: "feedback",
    description:
      "Consistent empty state: icon, heading, description, optional CTA. Use when a list or section has no data yet.",
    props: "icon? (LucideIcon), heading, description?, action?",
    usedIn: [],
    spec: "molecule-specifications/emptystate",
  },
  {
    name: "FormLayout",
    path: "@/components/form-layout",
    category: "form",
    description:
      "Consistent form wrapper: title, description, fields slot, footer with submit/cancel actions. Use for all DNA and source knowledge creation/edit forms.",
    props: "title?, description?, children, actions, onSubmit?",
    usedIn: [],
    spec: "molecule-specifications/formlayout",
  },
  {
    name: "SectionCard",
    path: "@/components/section-card",
    category: "layout",
    description:
      "Card container with title, optional description, optional top-right action, and a content slot. Use for grouping related content in dashboard views.",
    props: "title, description?, action?, children",
    usedIn: [],
    spec: "molecule-specifications/sectioncard",
  },
  {
    name: "NavSidebar",
    path: "@/components/nav-sidebar",
    category: "layout",
    description:
      "App-wide left navigation sidebar. Logo mark header, search bar (cosmetic), flat links + accordion sections. Sections: Home (flat), DNA, Knowledge, Inputs, Content, Projects. Active state: sage bg fill for flat links, sage text for group items. Nav config from lib/nav-config.ts.",
    props: "pendingInputsCount? (number) — badge on Queue nav item",
    usedIn: ["DASH-01"],
    spec: "molecule-specifications/navsidebar",
  },
  {
    name: "TopToolbar",
    path: "@/components/top-toolbar",
    category: "layout",
    description:
      "Persistent toolbar in the top-right of every dashboard page. Houses the ideas capture lightbulb button. Designed to accommodate future additions (notifications, etc.).",
    props: "none",
    usedIn: ["DASH-01", "IDEA-01"],
    spec: "molecule-specifications/toptoolbar",
  },
  {
    name: "IdeaCaptureModal",
    path: "@/components/idea-capture-modal",
    category: "overlay",
    description:
      "Quick-capture modal for ideas/questions/sparks. Type toggle (idea/question) + textarea + capture button. Auto-records context page. Saves via server action. Optional autoTag prop immediately tags the captured idea to a given entity (used from IdeasPanel). Keyboard shortcut: ⌘+Enter to submit.",
    props: "open, onOpenChange, autoTag? ({ entityType, entityId, entityLabel? }), onCaptured? (() => void)",
    usedIn: ["IDEA-01"],
    spec: "molecule-specifications/ideacapturemodal",
  },
  {
    name: "IdeasList",
    path: "@/components/ideas-list",
    category: "layout",
    description:
      "Reusable ideas list molecule. Vertical list with two-dimensional filter pills (status + type), inline text editing, status/type toggling, optimistic delete with undo toast, and polymorphic entity tagging (missions, projects, offers, knowledge assets, segments). Supports contextFilter for context-scoped views (one-click Link affordance). onTagsChange lets parents mirror tag state.",
    props: "ideas (Idea[]), tagsMap? (Record<string, IdeaTag[]>), taggableEntities? (TaggableEntity[]), showFilters? (default true), onCaptureClick? (() => void), contextFilter? ({ entityType, entityId, entityLabel }), onTagsChange? ((tagsMap) => void)",
    usedIn: ["IDEA-01"],
    spec: "molecule-specifications/ideaslist",
  },
  {
    name: "IdeasPanel",
    path: "@/components/ideas-panel",
    category: "layout",
    description:
      "Embeddable Ideas & Questions section for entity workspaces (missions, client projects, and any taggable entity). SectionCard wrapper with two tabs: 'This [entity]' (scoped) and 'All ideas' (wider pool with one-click Link). Capture button opens IdeaCaptureModal with autoTag to the current context.",
    props: "entityType (IdeaTagEntityType), entityId (string), entityLabel (string), allIdeas (Idea[]), tagsMap (Record<string, IdeaTag[]>), taggableEntities (TaggableEntity[]), title? (default 'Ideas & Questions')",
    usedIn: ["IDEA-01", "MISSION-01", "CLIENT-01"],
    spec: "molecule-specifications/ideaspanel",
  },
  {
    name: "SectionDivider",
    path: "@/components/section-divider",
    category: "layout",
    description:
      "Visual separator for nav menus and in-page content sections. Thin horizontal rule with optional label above. Sidebar variant uses sidebar-border colour via className override.",
    props: "label?, className?",
    usedIn: ["DS-01", "DASH-01"],
    spec: "molecule-specifications/sectiondivider",
  },
  {
    name: "TabbedPane",
    path: "@/components/tabbed-pane",
    category: "layout",
    description:
      "Canonical tab strip molecule. Always renders the line variant (underline indicator in --primary). Tab strip sits above ContentPane as part of page chrome. Uses shadcn Tabs atoms internally.",
    props: "tabs: { id, label, content }[], defaultTab?, className?",
    usedIn: ["DNA-03", "DNA-09", "UX-06"],
    spec: "molecule-specifications/tabbedpane",
  },
  {
    name: "InPageNav",
    path: "@/components/in-page-nav",
    category: "layout",
    description:
      "Sticky vertical section navigation. Includes its own positioning (w-36, shrink-0, self-start, sticky top-0) — no wrapper div needed. Place as a sibling to a flex-1 scrolling content div inside a flex row. Active item has left border in --primary.",
    props: "items: { id, label }[], activeId, onSelect, className?",
    usedIn: ["DNA-03", "DNA-05", "DNA-07", "UX-06"],
    spec: "molecule-specifications/inpagenav",
  },
  {
    name: "PageChrome",
    path: "@/components/page-chrome",
    category: "layout",
    description:
      "Wraps the full page header area — PageHeader + optional sub-header elements (tab strips, switchers, breadcrumbs) — as a single layout unit. mb-4 below before ContentPane.",
    props: "title, subtitle?, icon? (LucideIcon), action?, subheader? (ReactNode)",
    usedIn: ["DNA-03", "DNA-09", "UX-06"],
    spec: "molecule-specifications/pagechrome",
  },
  {
    name: "ContentPane",
    path: "@/components/content-pane",
    category: "layout",
    description:
      "The white working area within a dashboard page. White card + shadow. flex-1 + overflow-auto so it fills remaining height after page chrome and scrolls internally. Goes BELOW PageHeader and sub-header chrome (tabs, switchers). Never wraps PageHeader or action buttons.",
    props: "children, className?, padding? (default true — pass false for full-bleed layouts)",
    usedIn: ["DASH-01"],
    spec: "molecule-specifications/contentpane",
  },
  {
    name: "PageSkeleton",
    path: "@/components/page-skeleton",
    category: "feedback",
    description:
      "Generic full-page loading shimmer. Used as the default Suspense fallback for all dashboard routes. Individual pages can provide their own loading.tsx for more specific skeletons.",
    props: "none",
    usedIn: ["DASH-01"],
    spec: "molecule-specifications/pageskeleton",
  },
  {
    name: "ScreenSizeGate",
    path: "@/components/screen-size-gate",
    category: "layout",
    description:
      "Client component that renders children on screens ≥990px wide. Below that, shows a full-page 'please use a larger screen' message. Wraps the entire dashboard layout.",
    props: "children",
    usedIn: ["DASH-01"],
    spec: "molecule-specifications/screensizegate",
  },
  {
    name: "InlineField",
    path: "@/components/inline-field",
    category: "form",
    description:
      "Inline-editable field (input or textarea variant). Always-visible border with label integrated into top border. Autosaves on blur with debounce. Focus state: primary colour border/bg shift + label/icon colour change. Optional description as info tooltip. Disabled state via `disabled` prop.",
    props: "variant ('input'|'textarea'), value, onSave, label, placeholder?, icon? (LucideIcon), description?, labelBg? (default bg-card), rows? (textarea only), debounceMs? (default 500), disabled?, className?",
    usedIn: ["DNA-03"],
    spec: "molecule-specifications/inlinefield",
  },
  {
    name: "ListRowField",
    path: "@/components/list-row-field",
    category: "form",
    description:
      "Inline-list-row text editor (input | textarea variant). No envelope, no label — the host list provides the visual chrome. Carries the same save contract as InlineField (onBlur + 500ms debounce, inline Saved/Failed indicator + debounced toast). Saved indicator sits right of the input or below-right of the textarea, in a reserved slot to prevent layout shift.",
    props: "variant ('input'|'textarea'), value, onSave, placeholder?, aria-label (required), rows? (textarea only, default 2), disabled?, debounceMs? (default 500), className?",
    usedIn: ["DS-06"],
    spec: "molecule-specifications/listrowfield",
  },
  {
    name: "SelectField",
    path: "@/components/select-field",
    category: "form",
    description:
      "Field-context select with InlineField visual parity (always-visible border, floating label, icon, focus state, Saved/Failed feedback). Built on base-ui Select. Saves on selection change.",
    props: "label, value, options ({ value, label }[]), onSave, placeholder?, icon? (LucideIcon), description?, labelBg? (default bg-card), disabled?, className?",
    usedIn: ["DS-04", "DNA-07"],
    spec: "molecule-specifications/selectfield",
  },
  {
    name: "InlineCellSelect",
    path: "@/components/inline-cell-select",
    category: "form",
    description:
      "Compact cell-context select for table rows. No floating label, no icon, no inline save indicator (errors flash + toast). Built on base-ui Select.",
    props: "value, options ({ value, label }[]), onSave, placeholder?, disabled?, className?",
    usedIn: ["DS-04"],
    spec: "molecule-specifications/inlinecellselect",
  },
  {
    name: "CheckboxField",
    path: "@/components/checkbox-field",
    category: "form",
    description:
      "Labelled checkbox with consistent layout. Checkbox left, label flex-1, optional description below. Click extends to label. Parent owns save (no onSave; controlled checked + onCheckedChange).",
    props: "checked, onCheckedChange, label (string | ReactNode), description?, disabled?, className?",
    usedIn: ["DS-04"],
    spec: "molecule-specifications/checkboxfield",
  },
  {
    name: "SliderField",
    path: "@/components/slider-field",
    category: "form",
    description:
      "Field-context slider with InlineField visual parity. Track + thumb + numeric readout + low/high labels. Saves on commit (mouseUp/touchEnd). Zero-centred variant for delta sliders (e.g. -50..+50): adds tick at 0, signs the readout. Built on base-ui Slider.",
    props: "label, value (number), min, max, step? (default 1), onSave, lowLabel?, highLabel?, valueFormatter?, description?, icon?, zeroCentred? (boolean), labelBg?, disabled?, className?",
    usedIn: ["DS-04", "DNA-09"],
    spec: "molecule-specifications/sliderfield",
  },
  {
    name: "VocTable",
    path: "@/components/voc-table",
    category: "form",
    description:
      "Inline-editable table for VOC statements (problems, desires, objections, beliefs). Filter pills with count badges (amber below minimum). Add dropdown, multi-select delete with optimistic removal. Inline cell editing on click.",
    props: "segmentId, problems, desires, objections, sharedBeliefs",
    usedIn: ["DNA-03"],
    spec: "molecule-specifications/voctable",
  },
  {
    name: "CreateSegmentModal",
    path: "@/components/create-segment-modal",
    category: "overlay",
    description:
      "3-step creation modal for audience segments. Step 1: path selection + identity. Step 2: core VOC. Step 3: demographics. Generate button shows coming-soon toast. Save as draft submits to DB and navigates to new segment.",
    props: "open, onOpenChange",
    usedIn: ["DNA-03"],
    spec: "molecule-specifications/createsegmentmodal",
  },
  {
    name: "ArchiveItemModal",
    path: "@/components/archive-item-modal",
    category: "overlay",
    description:
      "Configurable archive confirmation modal. Runs a dependency check on open, then shows confirm UI (with dependents list when present) and confirm/cancel footer. Replaces per-entity archive modals — used by audience segments, platforms, offers and any future archive flow.",
    props:
      "open, onOpenChange, itemName, itemType, dependencyCheck, onConfirm, onArchived?, dependentsCopy?",
    usedIn: ["DNA-03", "DNA-04", "DNA-05", "DS-07"],
    spec: "molecule-specifications/archiveitemmodal",
  },
  {
    name: "ItemSwitcher",
    path: "@/components/item-switcher",
    category: "layout",
    description:
      "Generic dropdown for navigating between sibling items in a detail view. Sits in PageChrome's subheader slot. Compact pill trigger with small uppercase label + current item name; full names visible in dropdown options. Optional `getFlag` renders a warning-coloured meta pill alongside item names (e.g. for drafts). Optional `getGroup` (with optional `getGroupLabel`) renders the dropdown options inside SelectGroup blocks grouped by key. Renders nothing when fewer than 2 items. Replaces 4 pill-strip switcher molecules (DS-09). Built on base-ui Select.",
    props: "items (T[] — pre-filtered active items), currentId, getHref ((item) => string), getLabel ((item) => string), getId? ((item) => string), getFlag? ((item) => string | null — warning pill), getGroup? ((item) => string), getGroupLabel? ((groupKey) => string), label (string — uppercase descriptor), maxWidth? (default 220), className?",
    usedIn: ["DS-09", "DNA-03", "DNA-04", "DNA-05", "DNA-07", "DNA-07b"],
    spec: "molecule-specifications/itemswitcher",
  },
  {
    name: "IconButton",
    path: "@/components/icon-button",
    category: "form",
    description:
      "Icon-only button with optional tooltip and optional Link rendering. Wraps Button atom. Default tooltip shows the `label` prop on hover. Pass `tooltip={false}` to suppress; pass a string to override. Accepts `href` to render as a Next.js Link. Distinct from ActionButton (which has a visible label).",
    props: "icon (LucideIcon), label (string — required, used as aria-label and default tooltip), onClick?, href?, variant? ('default'|'outline'|'ghost'|'destructive', default 'outline'), size? ('sm'|'icon', default 'sm'), disabled?, tooltip? (boolean | string, default true), data-testid?, className?",
    usedIn: ["DS-05"],
    spec: "molecule-specifications/iconbutton",
  },
  {
    name: "ActionButton",
    path: "@/components/action-button",
    category: "form",
    description:
      "Icon (optional, leading or trailing) + label primary action. Used for top-of-page CTAs (`+ New X`, `Generate`), confirmation buttons, and other primary/secondary actions. Wraps Button atom. Accepts `href` to render as Next.js Link. Optional `loading` shows a spinner inline with the label and disables the button. Optional `tooltip` for explanation (works on disabled). Optional `trailingIcon` renders to the right of the label (hidden while loading).",
    props: "icon? (LucideIcon), trailingIcon? (LucideIcon), children (label content), onClick?, href?, variant? ('default'|'outline'|'ghost'|'destructive', default 'default'), size? ('sm'|'default', default 'sm'), disabled?, loading?, tooltip? (string), type? ('button'|'submit', default 'button'), data-testid?, className?",
    usedIn: ["DS-05", "OUT-01a"],
    spec: "molecule-specifications/actionbutton",
  },
  {
    name: "ConfidenceBadge",
    path: "@/components/confidence-badge",
    category: "feedback",
    description:
      "Coloured confidence level badge. HIGH (success) / MED (warning) / LOW (muted). Token-driven (DS-02). Used in extraction results panel to indicate LLM confidence for each extracted item.",
    props: "confidence ('high' | 'medium' | 'low')",
    usedIn: ["INP-03"],
    spec: "molecule-specifications/confidencebadge",
  },
  {
    name: "TypeBadge",
    path: "@/components/type-badge",
    category: "feedback",
    description:
      "Decorative non-interactive category pill. Token-driven (DS-02 tag tokens 1–8). Used inline in tables, cards, and headers to indicate which kind of thing this is. Distinct from StatusBadge (which is interactive and indicates state). Per-feature hue mappings live in consumer files.",
    props: "hue (1 | 2 | 3 | 4 | 5 | 6 | 7 | 8), label (string), size? ('xs' default | 'sm'), className?",
    usedIn: ["DS-02", "DNA-07b"],
    spec: "molecule-specifications/typebadge",
  },
  {
    name: "MarkdownRenderer",
    path: "@/components/markdown-renderer",
    category: "layout",
    description:
      "Wrapper around react-markdown + remark-gfm with design-system-consistent heading, list, code, link, table, and blockquote styles. Tokens only — no hardcoded colours.",
    props: "content (string), compact? (boolean — smaller text for drawer mode)",
    usedIn: ["OUT-01"],
    spec: "molecule-specifications/markdownrenderer",
  },
  {
    name: "ToolCallIndicator",
    path: "@/components/tool-call-indicator",
    category: "feedback",
    description:
      "Collapsible pill showing LLM tool call name + key parameter. Expandable to show truncated result. Icons per tool type (Search, Dna, FileText, Network).",
    props: "toolName, args?, result?, state?, compact?",
    usedIn: ["OUT-01"],
    spec: "molecule-specifications/toolcallindicator",
  },
  {
    name: "ChatMessage",
    path: "@/components/chat-message",
    category: "layout",
    description:
      "Renders a single chat message. User messages: right-aligned muted bubble. Assistant messages: left-aligned flat with markdown rendering and tool call indicators above text.",
    props: "message (UIMessage), compact? (boolean)",
    usedIn: ["OUT-01"],
    spec: "molecule-specifications/chatmessage",
  },
  {
    name: "ChatInput",
    path: "@/components/chat-input",
    category: "form",
    description:
      "Auto-growing chat textarea with image attach button, send/stop button. Enter to send, Shift+Enter for newline. Image preview with remove. Disabled during streaming.",
    props: "onSend, onStop?, isStreaming?, disabled?, compact?, placeholder?",
    usedIn: ["OUT-01"],
    spec: "molecule-specifications/chatinput",
  },
  {
    name: "PromptStarter",
    path: "@/components/prompt-starter",
    category: "layout",
    description:
      "Clickable chip for empty-state prompt suggestions. Border + rounded-lg, fills input on click.",
    props: "text (string), onClick (text: string) => void",
    usedIn: ["OUT-01"],
    spec: "molecule-specifications/promptstarter",
  },
  {
    name: "ConversationList",
    path: "@/components/conversation-list",
    category: "layout",
    description:
      "Chat history left panel. Grouped by relative date (Today, Yesterday, etc.). Active state, hover archive. Collapsible to 48px strip.",
    props: "conversations, activeId, onSelect, onNew",
    usedIn: ["OUT-01"],
    spec: "molecule-specifications/conversationlist",
  },
  {
    name: "ChatDrawer",
    path: "@/components/chat-drawer",
    category: "overlay",
    description:
      "Slide-out drawer from right for contextual chat from any page. 440px, backdrop overlay, compact message rendering. Header: new chat, title, open in full view, close.",
    props: "open, onOpenChange",
    usedIn: ["OUT-01"],
    spec: "molecule-specifications/chatdrawer",
  },
  {
    name: "ExpandableCardList",
    path: "@/components/expandable-card-list",
    category: "editor",
    description:
      "Generic expandable card list for editing JSONB array items. Each item is a collapsible card: collapsed shows primary + secondary text, expanded shows full form fields. Add, delete (with inline confirm), save on blur.",
    props: "items: T[], onSave, renderCollapsed, renderExpanded, createEmpty, addLabel, emptyMessage",
    usedIn: ["DNA-07"],
    spec: "molecule-specifications/expandablecardlist",
  },
  {
    name: "StringListEditor",
    path: "@/components/string-list-editor",
    category: "editor",
    description:
      "Add/remove list of string values. Each string is a row with delete-on-hover. Input + Enter or Add button to append. Saves full array on each change.",
    props: "values: string[], onSave, placeholder?, label?",
    usedIn: ["DNA-07", "DNA-09"],
    spec: "molecule-specifications/stringlisteditor",
  },
  {
    name: "KeyValueEditor",
    path: "@/components/key-value-editor",
    category: "editor",
    description:
      "Edit a flat JSONB object as key-value pairs. Each pair is an editable row. Special 'notes' key rendered as textarea below. Add/remove rows. Save on blur with debounce.",
    props: "data: Record<string, string|number>, onSave, notesKey?",
    usedIn: ["DNA-07"],
    spec: "molecule-specifications/keyvalueeditor",
  },
  {
    name: "CreatePlatformModal",
    path: "@/components/create-platform-modal",
    category: "overlay",
    description:
      "Multi-step creation modal for channels. Path step (sources vs questions), optional sources step, identity step (category cards on top → channel + name + handle revealed inline once a category is picked), strategy context, follow-up evaluation. Follows GEN-01 pattern with evaluate/generate API flow.",
    props: "open, onOpenChange",
    usedIn: ["DNA-07", "DNA-07b"],
    spec: "molecule-specifications/createplatformmodal",
  },
  {
    name: "ChangeCategoryChannelModal",
    path: "@/components/change-category-channel-modal",
    category: "overlay",
    description:
      "Inline modal for changing a channel row's category and channel post-creation. Two SelectFields (category, channel-scoped-to-category). Warning copy when category differs from current. Saves atomically via updatePlatformCategoryAndChannel server action; no data is deleted regardless of which fields become hidden.",
    props: "open, onOpenChange, platformId, currentCategory, currentChannel",
    usedIn: ["DNA-07b"],
    spec: "molecule-specifications/changecategorychannelmodal",
  },
  {
    name: "ArchivePlatformModal",
    path: "@/components/archive-platform-modal",
    category: "overlay",
    description:
      "Archive confirmation modal for platforms. Checks dependents on open, shows warning if any exist. Redirects to next active platform or empty state on confirm.",
    props: "open, onOpenChange, platformId, platformName",
    usedIn: ["DNA-07"],
    spec: "molecule-specifications/archive-modal",
  },
  {
    name: "StatusBadge",
    path: "@/components/status-badge",
    category: "form",
    description:
      "Status indicator pill. Two option variants: state-shaped ({ value, label, state: success|warning|error|info|neutral }) for health-style status, and tag-hue-shaped ({ value, label, hue: 1-8 }) for categorical lifecycle states (e.g. mission phases). Pass onChange to enable a dropdown picker; omit onChange for a static read-only pill. Composes FloatingMenu for popover chrome.",
    props:
      "status, onChange? (omit for read-only pill), options? (StatusOption[] — all options must share the same shape, all-state or all-hue)",
    usedIn: ["DNA-05", "DS-02", "DS-07"],
    spec: "molecule-specifications/statusbadge",
  },
  {
    name: "OrderedCardList",
    path: "@/components/ordered-card-list",
    category: "form",
    description:
      "Ordered list of inline-editable cards with add, delete, and up/down reorder. Used for structured JSONB arrays (key components, flow steps). Each card renders configurable fields.",
    props: "items, fields, onUpdate, emptyMessage, addLabel, newItemDefaults?",
    usedIn: ["DNA-05"],
    spec: "molecule-specifications/orderedcardlist",
  },
  {
    name: "SourceMaterialsTable",
    path: "@/components/source-materials-table",
    category: "form",
    description:
      "Reusable table of linked source documents. Shows title, type badge, date, file size. Link/unlink actions. Row click expands to show extracted text preview. Uses SourceDocPicker for linking.",
    props: "sourceDocumentIds, brandId, onLink, onUnlink",
    usedIn: ["DNA-05"],
    spec: "molecule-specifications/sourcematerialstable",
  },
  {
    name: "SourceDocPicker",
    path: "@/components/source-doc-picker",
    category: "overlay",
    description:
      "Modal for searching and selecting existing source documents, with multi-select checkboxes and type/search filtering. Used by SourceMaterialsTable and creation modals.",
    props: "open, onOpenChange, brandId, selected, onSelect, excludeIds?",
    usedIn: ["DNA-05"],
    spec: "molecule-specifications/sourcedocpicker",
  },
  {
    name: "VocMapping",
    path: "@/components/voc-mapping",
    category: "form",
    description:
      "Checklist for audience VOC mapping. Displays four grouped checklists (problems, desires, objections, beliefs) from a selected audience segment. Check/uncheck saves immediately. Shared between knowledge assets and offers.",
    props: "segment, mapping, onToggle",
    usedIn: ["DNA-05"],
    spec: "molecule-specifications/vocmapping",
  },
  {
    name: "EntityOutcomesPanel",
    path: "@/components/entity-outcomes-panel",
    category: "form",
    description:
      "Grouped CRUD panel for entity outcomes (outcomes, benefits, advantages, features, bonuses, FAQs). Add dropdown per kind, inline edit, delete with confirm. Shared between knowledge assets and offers.",
    props: "outcomes, parentType, parentId, brandId",
    usedIn: ["DNA-05"],
    spec: "molecule-specifications/entityoutcomespanel",
  },
  {
    name: "CreateAssetModal",
    path: "@/components/create-asset-modal",
    category: "overlay",
    description:
      "5-phase creation modal for knowledge assets. Phase 1: context path (sources or chat). Phase 2: source doc selection. Phase 3: metadata (name, kind, audience). Phase 4: VOC mapping. Phase 5: interlocutor generation with follow-up questions.",
    props: "open, onOpenChange, brandId, segments",
    usedIn: ["DNA-05"],
    spec: "molecule-specifications/createassetmodal",
  },
  {
    name: "ArchiveAssetModal",
    path: "@/components/archive-asset-modal",
    category: "overlay",
    description:
      "Archive confirmation modal for knowledge assets. Checks dependents (offers) on open, shows warning if any exist. Redirects to next active asset or empty state on confirm.",
    props: "open, onOpenChange, assetId, assetName",
    usedIn: ["DNA-05"],
    spec: "molecule-specifications/archive-modal",
  },
  {
    name: "CreateMissionModal",
    path: "@/components/create-mission-modal",
    category: "overlay",
    description:
      "Single-step creation modal for research missions. Name (required), thesis (optional), verticals multi-select with inline create. Navigates to workspace on success.",
    props: "open, onOpenChange",
    usedIn: ["MISSION-01"],
    spec: "molecule-specifications/createmissionmodal",
  },
  {
    name: "CreateProjectModal",
    path: "@/components/create-project-modal",
    category: "overlay",
    description:
      "Single-step creation modal for client projects. Organisation picker with inline create, project name (required), brief (optional). Navigates to workspace on success.",
    props: "open, onOpenChange",
    usedIn: ["CLIENT-01"],
    spec: "molecule-specifications/createprojectmodal",
  },
  {
    name: "ItemLinker",
    path: "@/components/item-linker",
    category: "form",
    description:
      "Inline search/picker for linking existing items to a parent entity. Search input + result list + click to link. Shared between client projects and missions. Renders inside a SectionCard when the + Link button is clicked.",
    props: "entityLabel, onSearch, onLink, onClose",
    usedIn: ["CLIENT-01", "MISSION-01"],
    spec: "molecule-specifications/itemlinker",
  },
  {
    name: "CreateOfferModal",
    path: "@/components/create-offer-modal",
    category: "overlay",
    description:
      "3-phase creation modal for offers. Phase 1: quick form (name, type, audience). Phase 2: VOC mapping (checkboxes). Phase 3: interlocutor generation with follow-up questions. Follows GEN-01 evaluate/generate API pattern.",
    props: "open, onOpenChange, brandId, segments",
    usedIn: ["DNA-04"],
    spec: "molecule-specifications/createoffermodal",
  },
  {
    name: "ArchiveOfferModal",
    path: "@/components/archive-offer-modal",
    category: "overlay",
    description:
      "Archive confirmation modal for offers. Checks dependents (knowledge assets) on open, shows warning if any exist. Redirects to next active offer or empty state on confirm.",
    props: "open, onOpenChange, offerId, offerName",
    usedIn: ["DNA-04"],
    spec: "molecule-specifications/archive-modal",
  },
  {
    name: "CustomerJourneyPanel",
    path: "@/components/customer-journey-panel",
    category: "form",
    description:
      "5-stage customer journey editor (awareness → advocacy). Each stage has thinking/feeling/doing/pushToNext fields as InlineField textareas. Generate button calls LLM. Regenerate with confirmation dialog.",
    props: "offerId, journey (CustomerJourneyStage[] | null), onSaveField",
    usedIn: ["DNA-04"],
    spec: "molecule-specifications/customerjourneypanel",
  },
  {
    name: "ApplicationsTab",
    path: "@/components/applications-tab",
    category: "layout",
    description:
      "Tab-master-detail content for the ToV Applications tab. Narrow master list (w-52) with fixed top/bottom chrome + scrolling middle, paired with a detail pane (fixed identifier chrome + scrolling body). Shows per-format voice deltas: dimension shift sliders, prose fields, do-not-use list. Implements the tab-master-detail pattern.",
    props: "applications (DnaTovApplication[]), baseDimensions (Partial<TovDimensions>)",
    usedIn: ["DNA-09"],
    spec: "molecule-specifications/applicationstab",
  },
  {
    name: "CreateApplicationModal",
    path: "@/components/create-application-modal",
    category: "overlay",
    description:
      "Minimal create modal for new ToV applications. Three fields: label (required), formatType (required, from TOV_FORMAT_TYPES), subtype (optional). All deeper editing happens in the ApplicationsTab detail pane after creation.",
    props: "open, onOpenChange, onCreated? ((id: string) => void)",
    usedIn: ["DNA-09"],
    spec: "molecule-specifications/createapplicationmodal",
  },
  {
    name: "AddSamplesModal",
    path: "@/components/add-samples-modal",
    category: "overlay",
    description:
      "Two-step add-samples flow for the ToV Samples tab. Step 1 reuses SourceDocPicker to pick (or upload) source documents; step 2 categorises each picked source with a TOV format type and optional subtype. Submits via addSamplesFromSources, which copies the source's extractedText into a sample row.",
    props: "open, onOpenChange, brandId, excludeIds?, onAdded? ((created: number) => void)",
    usedIn: ["DNA-09"],
    spec: null,
  },
  {
    name: "FloatingMenu",
    path: "@/components/floating-menu",
    category: "overlay",
    description:
      "Token-driven popover container. Owns positioning (align/side), raised shadow, click-outside dismissal, and Escape-key dismissal. Used internally by StatusBadge and ActionMenu; available for direct use anywhere a popover is the right pattern. Distinct from shadcn Popover — thinner, no portal, no collision detection.",
    props:
      "open, onOpenChange, trigger, children, align? (start|end), side? (bottom|top), minWidth?, className?, containerClassName?",
    usedIn: ["DS-07"],
    spec: "molecule-specifications/floatingmenu",
  },
  {
    name: "ActionMenu",
    path: "@/components/action-menu",
    category: "overlay",
    description:
      "Generic context-action dropdown menu. Wraps FloatingMenu with item chrome (action, link, disabled, divider). Owns its own open state (sealed unit). Use for overflow/context menus and quick-action triggers.",
    props:
      "trigger, items (ActionMenuItem[]), align? (start|end, default end), side? (bottom|top), minWidth?",
    usedIn: ["DS-07"],
    spec: "molecule-specifications/actionmenu",
  },
  {
    name: "ListItem",
    path: "@/components/list-item",
    category: "layout",
    description:
      "Opinionated list-row shell. Owns padding, hover, and divider tokens via density variants. Composes leading / children / trailing slots. Renders as div, link or button via the `as` prop.",
    props:
      "leading?, children, trailing?, density? (default|compact), divider?, className?, as? (div|link|button), onClick? OR href",
    usedIn: ["DS-07"],
    spec: "molecule-specifications/listitem",
  },
  {
    name: "FilterPill",
    path: "@/components/filter-pill",
    category: "form",
    description:
      "Visual pill atom for filter rows. Single button with optional leading icon and count, active/inactive state colours from primary/secondary tokens.",
    props: "label, active, onClick, icon? (LucideIcon), count?",
    usedIn: ["DS-07"],
    spec: "molecule-specifications/filterpill",
  },
  {
    name: "FilterPillGroup",
    path: "@/components/filter-pill-group",
    category: "form",
    description:
      "Single-select state container for FilterPill. Renders an optional left label and a row of pills; one pill is active at a time.",
    props:
      "label?, value, onChange, options (FilterPillOption[] — { value, label, count?, icon? })",
    usedIn: ["DS-07"],
    spec: "molecule-specifications/filterpillgroup",
  },
  {
    name: "MultiFilterPillGroup",
    path: "@/components/multi-filter-pill-group",
    category: "form",
    description:
      "Multi-select state container for FilterPill. Promised by FilterPillGroup spec. Click any pill toggles inclusion in `values`.",
    props: "label?, values (string[]), onChange, options (MultiFilterPillOption[])",
    usedIn: ["OUT-02-P4a"],
    spec: "molecule-specifications/multifilterpillgroup",
  },
  {
    name: "ContentTypeCard",
    path: "@/components/content-type-card",
    category: "layout",
    description:
      "Picker tile for one content type — icon, title, description, category/channel TypeBadges, favourite-star toggle, locked-state with LockBadge + MissingPrereqDeeplink. Whole card is a Link when unlocked.",
    props: "data (ContentTypeCardData), onToggleFavourite",
    usedIn: ["OUT-02-P4a"],
    spec: "molecule-specifications/contenttypecard",
  },
  {
    name: "PickerFilterBar",
    path: "@/components/picker-filter-bar",
    category: "form",
    description:
      "Top filter bar for the launch-picker-grid pattern. Two MultiFilterPillGroups (categories, channels) + favourites toggle + Clear all.",
    props:
      "categories, channels, activeCategories, activeChannels, favouritesOnly, onCategoriesChange, onChannelsChange, onFavouritesChange, onClearAll",
    usedIn: ["OUT-02-P4a"],
    spec: "molecule-specifications/pickerfilterbar",
  },
  {
    name: "LockBadge",
    path: "@/components/lock-badge",
    category: "feedback",
    description:
      "Tiny 'Needs an X' pill with leading lock icon. Inline-flex, bg-muted + text-muted-foreground.",
    props: "label",
    usedIn: ["OUT-02-P4a"],
    spec: "molecule-specifications/lockbadge",
  },
  {
    name: "MissingPrereqDeeplink",
    path: "@/components/missing-prereq-deeplink",
    category: "feedback",
    description:
      "Inline '+ Add ${label} →' link styled for empty-state affordances under cards or cascade steps.",
    props: "label, href",
    usedIn: ["OUT-02-P4a"],
    spec: "molecule-specifications/missingprereqdeeplink",
  },
  {
    name: "StrategyField",
    path: "@/components/strategy-field",
    category: "form",
    description:
      "Declarative widget registry for content-creator Strategy panel fields. Switches on field.id to render Select (audience_segment / offer / knowledge_asset / platform / customer_journey_stage / tone_variation) or Input (sales_page_angle / cta_url).",
    props:
      "field ({ id: StrategyFieldId, required }), value, onChange, options? (StrategyFieldOption[]), placeholder?",
    usedIn: ["OUT-02-P4a"],
    spec: "molecule-specifications/strategyfield",
  },
  {
    name: "TopicCascadeStep",
    path: "@/components/topic-cascade-step",
    category: "form",
    description:
      "Single step in the topic engine cascade — single-select dropdown or multi-select checkbox list. Locked options dimmed with inline MissingPrereqDeeplink.",
    props:
      "label, required, allowMultiSelect, options (TopicCascadeStepOption[]), selectedKeys, onChange, loading?",
    usedIn: ["OUT-02-P4a"],
    spec: "molecule-specifications/topiccascadestep",
  },
  {
    name: "TopicCascade",
    path: "@/components/topic-cascade",
    category: "form",
    description:
      "Orchestrates 1..4 step Topic Engine cascade. Owns option fetching via server actions, step reveal, free-text branch, leaf-augment toggle, and the topic-clear confirm modal.",
    props: "value (TopicCascadeState), onChange",
    usedIn: ["OUT-02-P4a"],
    spec: "molecule-specifications/topiccascade",
  },
  {
    name: "NumberStepper",
    path: "@/components/number-stepper",
    category: "form",
    description:
      "Three-segment − / value / + stepper. IconButton bookends + read-only numeric display. Used for variant-count and other bounded numeric inputs.",
    props: "value, onChange, min?, max?, step?, label?",
    usedIn: ["OUT-02-P4a"],
    spec: "molecule-specifications/numberstepper",
  },
  {
    name: "AssembledPromptInspector",
    path: "@/components/assembled-prompt-inspector",
    category: "feedback",
    description:
      "Right-pane debug viewer for the assembled prompt — OUT-02-P4a only. Toolbar with run-id pill + Copy IconButton; <pre> body with monospace, whitespace-pre-wrap. Replaced by variant cards in 4b.",
    props: "runId, assembledPrompt",
    usedIn: ["OUT-02-P4a"],
    spec: "molecule-specifications/assembledpromptinspector",
  },
  {
    name: "ContentTypeSwitcher",
    path: "@/components/content-type-switcher",
    category: "form",
    description:
      "Compact dropdown switcher for the content-creator generation surface. Lists active content types; on change, consumer navigates to /content/create/[slug].",
    props: "currentSlug, options (ContentTypeSwitcherOption[]), onChange",
    usedIn: ["OUT-02-P4a"],
    spec: "molecule-specifications/contenttypeswitcher",
  },
  {
    name: "GenerationSettingsStrip",
    path: "@/components/generation-settings-strip",
    category: "form",
    description:
      "Inline Settings strip for the creator-workspace-three-region pattern. Compact Model + I/we + Tone + Variants controls in a bg-muted/40 row.",
    props: "value, onChange, aiModels, toneOptions, variantMin?, variantMax?",
    usedIn: ["OUT-02-P4a"],
    spec: "molecule-specifications/generationsettingsstrip",
  },
  {
    name: "SearchInput",
    path: "@/components/search-input",
    category: "form",
    description:
      "Search input atom-wrapper with leading magnifier icon. Use wherever a free-text search field needs the icon affordance.",
    props: "value, onChange, placeholder?, widthClass?",
    usedIn: ["OUT-02-P4a"],
    spec: "molecule-specifications/searchinput",
  },
  {
    name: "ConversationListRowIcon",
    path: "@/components/conversation-list-row-icon",
    category: "feedback",
    description:
      "Fixed-width icon slot for chat conversation list rows. MessageCircle for freeform conversations, Brain for skill conversations, with a Check or AlertTriangle adornment for completed/registry-miss states. Keeps title baselines aligned across the list.",
    props: "state ('freeform' | 'skill-active' | 'skill-completed' | 'registry-miss')",
    usedIn: ["OUT-01a"],
    spec: "molecule-specifications/conversationlistrowicon",
  },
  {
    name: "InlineWarningBanner",
    path: "@/components/inline-warning-banner",
    category: "feedback",
    description:
      "Single-line warning bar that sits above content in a page region — not a toast, not a centred empty state. Used for persistent state visibility (e.g. registry-miss warnings, state-extraction failures). Optional dismiss button when an onDismiss handler is provided.",
    props: "title, subtitle?, onDismiss?",
    usedIn: ["OUT-01a"],
    spec: "molecule-specifications/inlinewarningbanner",
  },
  {
    name: "SkillContinueBar",
    path: "@/components/skill-continue-bar",
    category: "form",
    description:
      "Staged-skill advance affordance below the latest assistant message: Continue button (with trailing arrow) plus a missing-items hint when the checklist isn't filled. Wraps ActionButton; consumes the runtime's missingItems list.",
    props: "missingItems (string[]), loading (boolean), onAdvance (() => void)",
    usedIn: ["OUT-01a"],
    spec: "molecule-specifications/skillcontinuebar",
  },
]
