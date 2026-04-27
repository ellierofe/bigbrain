# Dashboard Shell Brief
Feature ID: DASH-01
Status: approved
Last updated: 2026-04-12

## Summary
Build the app shell that wraps all dashboard views: a collapsible sidebar with grouped navigation, a main content area with floating card treatment, and the routing structure that all subsequent features live inside. This is the visual and structural foundation for the entire app — nothing else can be built without it.

## Use cases
- User lands on the dashboard after login (default post-auth destination)
- User navigates between sections via the sidebar
- User collapses the sidebar for focus mode (icon-only, ~60px)
- User expands the sidebar to see labels and section dropdowns (~240px)
- User expands a nav section (e.g. DNA) to reveal sub-items
- User clicks the BigBrain logo/name to return to the dashboard home
- User clicks Logout at the bottom of the sidebar to end their session
- App renders a loading skeleton while a page loads
- App renders an error state if a page crashes (sidebar stays intact)

## User journey
1. User authenticates → redirected to `/` (dashboard home)
2. Shell renders: collapsed sidebar (icon-only) + main content area
3. User hovers or clicks expand control → sidebar expands to full width with labels
4. User clicks a top-level nav item (e.g. DNA) → section expands to reveal sub-items
5. User clicks a sub-item (e.g. Audience Segments) → route changes, content area updates, active state shown
6. User clicks expand control again → sidebar collapses back to icon-only
7. User clicks Logout (bottom of sidebar) → session ends, redirected to login

## Navigation structure

### Sidebar sections and items

**DNA** (top-level, expandable)
- DNA Overview → `/dna`
- — *(divider)* —
- Business Overview → `/dna/business`
- Brand Meaning → `/dna/meaning`
- Value Proposition → `/dna/value-proposition`
- Brand Identity → `/dna/identity`
- Tone of Voice → `/dna/tone-of-voice`
- — *(divider)* —
- Audience Segments → `/dna/audiences`
- Offers → `/dna/offers`
- Knowledge Assets → `/dna/knowledge-assets`
- Competitors → `/dna/competitors`
- — *(divider)* —
- Platforms → `/dna/platforms`
- Content Pillars → `/dna/content-pillars`
- Brand Intros → `/dna/intros`
- Lead Magnets → `/dna/lead-magnets`



**Inputs** (top-level, expandable)
- Process → `/inputs/process`
- Queue → `/inputs/queue` *(badge: count of pending items)*

**Knowledge** (top-level, expandable)
- Sources → `/knowledge/sources`
- Proof → `/knowledge/proof`
- Graph → `/knowledge/graph`

**Content** (top-level, expandable)
- Create → `/content/create`
- Inbox → `/content/inbox`

**Bottom of sidebar (always visible)**
- Settings → `/settings` *(route placeholder only — no content in this iteration)*
- Logout → Auth.js signOut action, no confirmation dialog

### Sidebar states
- **Collapsed (default):** ~60px wide, icon only per section, no labels, no sub-items visible
- **Expanded:** ~240px wide, section labels visible, sections expand/collapse to show sub-items
- State persisted in `localStorage` so preference survives page reload
- Transition: smooth CSS transition (0.2s ease, per theme)

### Header area (top of sidebar)
- **Collapsed:** BigBrain logomark only
- **Expanded:** "BigBrain" (bold) + "by Nicely Put" (muted subtitle below)
- Clicking either navigates to `/` (dashboard home)

## Visual design

### Design tokens
Based on the NicelyPut brand theme (`04-documentation/reference/nicelyput_theme.js`):

| Token | Light value | Dark value (slot — wire later) |
|---|---|---|
| `--sidebar-bg` | `#2c2c2c` (charcoal) | `#1a1c24` |
| `--sidebar-border` | `rgba(255,255,255,0.08)` | `rgba(255,255,255,0.06)` |
| `--content-bg` | `#eae6e1` (bone) | `#2d303d` |
| `--content-pane-bg` | `#ffffff` | `#1e2030` |
| `--nav-text` | `#eae6e1` (bone) | `#eae6e1` |
| `--nav-text-muted` | `rgba(234,230,225,0.45)` | `rgba(234,230,225,0.35)` |
| `--nav-active` | `#c8553d` (terracotta) | `#c8553d` |
| `--nav-active-bg` | `rgba(200,85,61,0.18)` | `rgba(200,85,61,0.22)` |
| `--nav-hover-bg` | `rgba(255,255,255,0.06)` | `rgba(255,255,255,0.05)` |
| `--border` | `#939393` | `rgba(249,246,238,0.2)` |
| `--shadow-pane` | `0 4px 6px rgba(0,0,0,0.07)` | `0 4px 12px rgba(0,0,0,0.3)` |

Dark mode CSS variable slots defined now, values wired in a later design pass.

### Typography
- All shell/nav UI: IBM Plex Sans (body font from theme)
- Section labels (nav group headers): 0.75rem, uppercase, `--nav-text-muted`, letter-spacing 0.08em
- Nav items: 0.875rem, `--nav-text` (bone on charcoal)
- Active nav item: `--nav-active` (terracotta), medium weight, `--nav-active-bg` background
- App name "BigBrain": IBM Plex Sans bold, bone
- Brand subtitle "by Nicely Put": 0.75rem, `--nav-text-muted`

### Content pane treatment
- Main content area background: `--content-bg` (bone)
- Page content renders inside a white card (`--content-pane-bg`) with `--shadow-pane`
- Card has `border-radius: 0.5rem` (card radius from theme)
- Floating labels within pages use `--nav-active` (terracotta) — established here as the convention, implemented per-feature
- Field delineations: 1px `--border` (consistent with Moogul pattern)

### Spacing
- Sidebar padding: 16px horizontal
- Nav item height: 40px
- Section label top margin: 24px
- Content area padding: 32px

### Breakpoints
- ≥990px: full app shell renders normally
- <990px: full-page "Please view on a larger screen" message, no sidebar

## Data model / fields
No new database tables. Shell reads:
- Auth session (user identity, for logout)
- `pending_inputs` count (for Input Queue badge) — simple `COUNT` query, can be a server component

## Update behaviour
Freely editable — shell evolves as new sections are added. Nav items are defined in a single config array (not hardcoded per-route) so adding a new section is a one-line config change.

## Relationships
### Knowledge graph (FalkorDB)
None.
### Postgres
- Auth session table (Auth.js — already exists)
- `pending_inputs` table — read-only count query for badge

## Loading states
- Shell itself (sidebar + layout chrome) renders immediately — no loading state needed
- Page content area uses React `<Suspense>` with a `<PageSkeleton>` component
- `<PageSkeleton>`: full-content-area shimmer — header bar placeholder + two block placeholders. Generic enough to work for any page layout. Individual pages can define more specific skeletons later by passing a `skeleton` prop or replacing the default.
- `<Suspense>` boundaries defined at the `(dashboard)/layout.tsx` level

## Error boundaries
- `error.tsx` at the `(dashboard)/` segment level
- Catches page-level crashes; sidebar and shell remain intact
- Error state: full content-area message with a "Try again" button (`error.reset()`)
- Does not catch sidebar-level errors (those would bubble to root `error.tsx`)

## Route structure
```
app/
  layout.tsx                  — root layout (fonts, globals)
  (dashboard)/
    layout.tsx                — shell layout: sidebar + content area + Suspense boundary
    error.tsx                 — dashboard-level error boundary
    loading.tsx               — default PageSkeleton for all dashboard routes
    page.tsx                  — dashboard home (placeholder for now)
    dna/
      page.tsx                — DNA Overview
      audiences/page.tsx      — Audience Segments (already built)
      business/page.tsx       — (placeholder)
      ... (one directory per DNA type)
    inputs/
      process/page.tsx        — Process Text (already exists at inputs/process)
      queue/page.tsx          — Input Queue (placeholder)
    knowledge/
      sources/page.tsx        — (placeholder)
      graph/page.tsx          — (placeholder)
    content/
      create/page.tsx         — (placeholder)
      inbox/page.tsx          — (placeholder)
    settings/
      page.tsx                — (placeholder)
  api/
    auth/                     — Auth.js routes (already exists)
```

**Note:** The existing `inputs/process` route is already built. The shell must accommodate it — check current route location and reconcile if path differs.

## Components

### Existing components to extend (not replace)
- `components/nav-sidebar.tsx` — already exists and is wired into `(dashboard)/layout.tsx`. Extend this with the full nav config, dividers, badge, charcoal styling, and logout. Do not create a second sidebar component.
- `components/ui/sidebar.tsx` — shadcn sidebar primitive already in place. Handles collapsed/expanded state via cookie (`sidebar_state`). Use as-is.

**Route inconsistency to fix during build:** The existing `nav-sidebar.tsx` has stale routes with a `/dashboard/` prefix (e.g. `/dashboard/dna/audience-segments`). These are wrong — the `(dashboard)` route group means no prefix appears in URLs. Fix all hrefs to match the route structure in this brief.

### New components (to be registered in `components/registry.ts`)
| Component | File | Purpose |
|---|---|---|
| `PageSkeleton` | `components/page-skeleton.tsx` | Generic full-page loading shimmer |
| `ScreenSizeGate` | `components/screen-size-gate.tsx` | Renders children ≥990px, fallback message below |

### Existing primitives used
- `PageHeader` — used at the top of each page within the content pane (already stubbed per INF-01)
- `SectionCard` — used to wrap content sections within pages (already stubbed per INF-01)

### Nav config
Sidebar nav items defined as a typed config array in `lib/nav-config.ts` (not hardcoded in the component). Shape:
```typescript
type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  badge?: 'pending_inputs_count' | null
}
type NavSection = {
  label: string
  icon: LucideIcon
  items: NavItem[]
}
```

## Edge cases
- **No pending inputs:** badge on Input Queue not shown (not "0")
- **Sidebar state on first visit:** default to collapsed
- **Active state for nested routes:** `/dna/audiences` should mark both the "DNA" section and "Audience Segments" item as active
- **Settings route:** renders a placeholder page — no content. Nav item present and functional.
- **Screen <990px:** `ScreenSizeGate` renders a centred message: "BigBrain works best on a larger screen. Please view on a desktop or laptop." No sidebar, no nav.
- **Logout:** direct call to Auth.js `signOut()`, no confirmation, redirects to login page

## Out of scope
- Notifications (slot reserved in design language, not implemented)
- Credits / brand switcher / top-right status panel
- Mobile layout
- Design system token finalisation (CSS variable slots defined, values are defaults)
- Dark mode wiring (slots defined, values deferred)
- Settings page content
- Collapsible sidebar animation polish (functional first, refined later)
- Per-page custom skeletons (generic `PageSkeleton` only)

## Dashboard home (`/`)

The home page renders inside the standard content pane. Four zones, stacked vertically:

### Zone 1: Quick actions
Full-width row of 4 action cards/buttons at the top:

| Action | Route | State |
|---|---|---|
| Process text | `/inputs/process` | Active |
| Manage queue | `/inputs/queue` | Active |
| Chat | `/chat` | Disabled (M3) |
| Create content | `/content/create` | Disabled (M5) |

Disabled items render at reduced opacity with a tooltip on hover: "Coming soon" (no milestone detail needed). Not hidden — they show the system's direction.

### Zone 2: Input queue (left, ~60% width)
- Count of pending items (large, prominent)
- List of the 3 most recent `pending_inputs` rows: title, date, status pill
- CTA: "Review all" → `/inputs/queue`
- Empty state: "No items waiting. Run `/krisp-ingest` to pull in new meetings."

### Zone 3: System status (right, ~40% width)
"Your brain at a glance" — framed as progress, not gaps:
- DNA sections filled: X / 15 (count of DNA tables with at least one non-null row)
- Graph nodes: total count from `graph_nodes`
- Sources: count from `src_source_documents`
- Inputs processed (all-time): count from `src_source_documents` where `source_type = 'krisp-meeting'` or similar

Zones 2 and 3 sit side-by-side in a two-column layout.

### Zone 4: Recent activity (full width, bottom)
Chronological list of the last 10 write events across storage layers. Simple queries, no special event log table needed:
- Latest `pending_inputs` rows (by `created_at`)
- Latest `src_source_documents` rows (by `created_at`)
- Latest DNA table updates (by `updated_at` across DNA tables — union query)

Each row: icon indicating type + label + relative timestamp (e.g. "2 hours ago").

### Data queries (all server components, no client fetch needed)
```sql
-- Input queue count
SELECT COUNT(*) FROM pending_inputs WHERE brand_id = $brandId AND status = 'pending';

-- Recent pending inputs (3)
SELECT title, input_date, status FROM pending_inputs
WHERE brand_id = $brandId ORDER BY created_at DESC LIMIT 3;

-- Graph node count
SELECT COUNT(*) FROM graph_nodes WHERE brand_id = $brandId;

-- Source count
SELECT COUNT(*) FROM src_source_documents WHERE brand_id = $brandId;
```

DNA section fill count and recent activity are union queries across DNA tables — exact SQL deferred to build (depends on final table list from DNA-01).

## Open questions / TBDs
None — all questions resolved.

## Decisions log
- 2026-04-12: Brief approved. Key decisions: charcoal sidebar (not bone) for clear zone separation; "DNA" label (not "Strategy") throughout nav; extend existing `NavSidebar` component rather than replacing; Lucide icons confirmed; route inconsistency (`/dashboard/` prefix) to be fixed during build.
- 2026-04-13: Design system overhaul (DS-01) — colour palette changed from charcoal/terracotta/bone to forest/sage/paper. All design tokens in this brief superseded by `01-design/design-system.md`.
- 2026-04-14: Major dashboard rework. Changes:
  - Sidebar: permanently expanded (220px, no collapsible), plain `<aside>` instead of shadcn Sidebar, down-chevron accordions. Removed SidebarProvider.
  - New sidebar sections: Home (flat link), Projects (Client Projects, Missions). Ideas added to Inputs.
  - Active state: sage bg fill (flat links), sage text (sub-items). Matches style guide specimen.
  - Top toolbar: persistent in layout header, houses ideas lightbulb button (IDEA-01).
  - Dashboard home page: bento grid layout — stats row, two-column (current work + spark feed), bottom two-column (input queue + recent activity). "+New input" dropdown replaces quick-capture portal.
  - See dashboard zone map below for feature dependencies.

### Dashboard zone map

Each zone on the dashboard home (`/`) is owned by a feature. When that feature is built, the zone upgrades from empty state to live data.

| Zone | Current state | Upgrades when | Feature |
|---|---|---|---|
| Header greeting | Hardcoded "Welcome back, Ellie" | Session/auth lookup | INF-05 (done, just needs wiring) |
| Stats row (Knowledge Nodes) | Live — reads `graph_nodes` count | Already working | KG-02 (done) |
| Stats row (Sources) | Live — reads `src_source_documents` count | Already working | SRC-01 (done) |
| Stats row (Input Queue) | Live — reads `pending_inputs` count | Already working | INP-03 (done) |
| Current work — Client Projects | Empty state with disabled CTA | CLIENT-01 built + data exists | CLIENT-01 |
| Current work — Missions | Empty state with disabled CTA | MISSION-01 built + data exists | MISSION-01 |
| Quick actions — Process text | Live link to `/inputs/process` | Already working | INP-03 (done) |
| Quick actions — Manage queue | Live link to `/inputs/queue` | Already working | INP-03 (done) |
| Quick actions — Chat | Disabled with "Coming in M3" tooltip | OUT-01 (chat interface) built | OUT-01 |
| Quick actions — Create content | Disabled with "Coming in M5" tooltip | OUT-02 (content creator) built | OUT-02 |
| Spark feed | Empty state | RET-01 (unified retrieval) + IDEA-03 (AI-surfaced ideas) | RET-01, IDEA-03 |
| Input queue panel | Live — reads recent pending inputs | Already working | INP-03 (done) |
| Recent activity | Live — reads recent inputs + sources | Already working | INP-03, SRC-01 (done) |
| "+New input" dropdown — Text | Live link to `/inputs/process` | Already working | INP-03 (done) |
| "+New input" dropdown — Document | Disabled "Soon" | INP-05 (research doc ingestion) built | INP-05 |
| "+New input" dropdown — Audio | Disabled "Soon" | IDEA-02 (voice capture) or dedicated audio input feature | IDEA-02 |
| "+New input" dropdown — URL/Link | Disabled "Soon" | INP-06 or dedicated URL ingestion feature | TBD |
| Top toolbar — Ideas lightbulb | Modal opens, TODO stub for save | IDEA-01 server action + ideas table migration | IDEA-01 |
