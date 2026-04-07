/**
 * Component Registry
 *
 * Single source of truth for all shared UI components.
 *
 * RULES (enforced by feature-build and feature-update skills):
 * 1. Before creating a new component, check this registry.
 *    If something close enough exists, use or extend it — don't duplicate.
 * 2. After creating a new shared component, add it here.
 * 3. components/ui/ is reserved for shadcn/ui base components — do not add custom
 *    components there. Custom components live in components/ and are listed here.
 * 4. When a component is removed or renamed, update this registry first.
 *
 * DESIGN SYSTEM NOTE:
 * All components use CSS variables (--background, --foreground, --muted, etc.) defined
 * in app/globals.css. When a design scheme is applied, update those variables and
 * Tailwind design tokens — components update automatically without code changes.
 */

export type ComponentCategory =
  | "layout"    // Structural / page-level
  | "feedback"  // Empty states, errors, loading
  | "form"      // Form containers and field wrappers
  | "overlay"   // Modals, drawers, tooltips

export interface ComponentEntry {
  name: string
  path: string
  category: ComponentCategory
  description: string
  /** Props summary — enough to know if this component fits your use case */
  props: string
  /** Features that use this component (updated as the app grows) */
  usedIn: string[]
}

export const componentRegistry: ComponentEntry[] = [
  {
    name: "Modal",
    path: "@/components/modal",
    category: "overlay",
    description:
      "Standard modal dialog. Wraps shadcn Dialog. Use for all modal interactions: generation, confirmation, editing.",
    props: "open, onOpenChange, title, description?, children, size? (sm|md|lg|xl)",
    usedIn: [],
  },
  {
    name: "PageHeader",
    path: "@/components/page-header",
    category: "layout",
    description:
      "Consistent page title + optional subtitle + optional top-right action slot. Use at the top of every dashboard page.",
    props: "title, subtitle?, action?",
    usedIn: [],
  },
  {
    name: "EmptyState",
    path: "@/components/empty-state",
    category: "feedback",
    description:
      "Consistent empty state: icon, heading, description, optional CTA. Use when a list or section has no data yet.",
    props: "icon? (LucideIcon), heading, description?, action?",
    usedIn: [],
  },
  {
    name: "FormLayout",
    path: "@/components/form-layout",
    category: "form",
    description:
      "Consistent form wrapper: title, description, fields slot, footer with submit/cancel actions. Use for all DNA and source knowledge creation/edit forms.",
    props: "title?, description?, children, actions, onSubmit?",
    usedIn: [],
  },
  {
    name: "SectionCard",
    path: "@/components/section-card",
    category: "layout",
    description:
      "Card container with title, optional description, optional top-right action, and a content slot. Use for grouping related content in dashboard views.",
    props: "title, description?, action?, children",
    usedIn: [],
  },
  {
    name: "NavSidebar",
    path: "@/components/nav-sidebar",
    category: "layout",
    description:
      "App-wide left navigation sidebar. Sections: Strategy (all DNA types), Knowledge (Sources, Graph), Content (Create, Inbox). Active state driven by pathname. Used once in the dashboard layout.",
    props: "none — reads pathname internally",
    usedIn: ["DASH-01"],
  },
  {
    name: "InlineField",
    path: "@/components/inline-field",
    category: "form",
    description:
      "Inline-editable field (input or textarea variant). Autosaves on blur with 500ms debounce. Shows 'Saved ✓' on success, 'Save failed' in red on error. Accepts an async onSave callback.",
    props: "variant ('input'|'textarea'), value, onSave, label, placeholder?, icon? (LucideIcon), rows? (textarea only), debounceMs? (default 500)",
    usedIn: ["DNA-03"],
  },
  {
    name: "VocTable",
    path: "@/components/voc-table",
    category: "form",
    description:
      "Inline-editable table for VOC statements (problems, desires, objections, beliefs). Filter pills with count badges (amber below minimum). Add dropdown, multi-select delete with optimistic removal. Inline cell editing on click.",
    props: "segmentId, problems, desires, objections, sharedBeliefs",
    usedIn: ["DNA-03"],
  },
  {
    name: "CreateSegmentModal",
    path: "@/components/create-segment-modal",
    category: "overlay",
    description:
      "3-step creation modal for audience segments. Step 1: path selection + identity. Step 2: core VOC. Step 3: demographics. Generate button shows coming-soon toast. Save as draft submits to DB and navigates to new segment.",
    props: "open, onOpenChange",
    usedIn: ["DNA-03"],
  },
  {
    name: "ArchiveSegmentModal",
    path: "@/components/archive-segment-modal",
    category: "overlay",
    description:
      "Archive confirmation modal for audience segments. Checks dependents on open, shows warning if any exist. Redirects to next active segment or empty state on confirm.",
    props: "open, onOpenChange, segmentId, segmentName",
    usedIn: ["DNA-03"],
  },
  {
    name: "AudienceSegmentSwitcher",
    path: "@/components/audience-segment-switcher",
    category: "layout",
    description:
      "Pill strip switcher for navigating between audience segments. Only renders when 2+ non-archived segments exist. Active pill highlighted. Names truncated at 24 chars.",
    props: "segments (AudienceSegmentSummary[]), currentId",
    usedIn: ["DNA-03"],
  },
  {
    name: "ConfidenceBadge",
    path: "@/app/(dashboard)/inputs/process/confidence-badge",
    category: "feedback",
    description:
      "Coloured confidence level badge. HIGH (green) / MED (amber) / LOW (muted). Used in extraction results panel to indicate LLM confidence for each extracted item.",
    props: "confidence ('high' | 'medium' | 'low')",
    usedIn: ["INP-03"],
  },
]
