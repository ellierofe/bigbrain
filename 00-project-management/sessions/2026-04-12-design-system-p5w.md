# Session log — 2026-04-12 — design system discovery
Session ID: 2026-04-12-design-system-p5w

## What we worked on
- DASH-01: Completed final placeholder routes (continuation of prior session)
- Design system: discovery, diagnosis, and planning

## What was done

**DASH-01 completion:**
- Created 7 missing placeholder route pages: `inputs/queue`, `knowledge/sources`,
  `knowledge/proof`, `knowledge/graph`, `content/create`, `content/inbox`, `settings`
- All nav items now have real routes — shell is fully wired

**Design review:**
- Took screenshots of current app (home collapsed, home expanded, DNA page) via gstack
- Reviewed against Moogul legacy reference (`04-documentation/reference/legacy_files/index.html`)
- Identified specific visual problems (see "What came up" below)

**Design system planning:**
- Diagnosed root cause: components are built with ad hoc Tailwind rather than a
  disciplined molecule hierarchy — visual decisions are made at point of use, not
  extracted into reusable components
- Agreed on the approach: build a proper component library (atoms → molecules →
  organisms) equivalent to the Webflow component system, before continuing to
  build new features
- Decision: DS-01 will be set up in a dedicated session using `/design-system-starter`

## Decisions made

- **DASH-01 is functionally complete** — placeholder routes created, all nav items
  resolve. Not yet marked `done` pending the design system work which will refactor
  shared components (PageHeader, InlineField, sidebar dividers etc.)
- **Design system before more features** — the current ad hoc approach will compound
  with every new feature. The right time to establish the component hierarchy is now,
  before DNA-02 and beyond are built on top of it.
- **DS-01 scoped as:** (1) proper token set, (2) molecule components (Field, SidePanel,
  TabbedPane, InPageNav, PageChrome, SectionDivider), (3) refactor existing rough
  components to use them, (4) `design-system` skill to prevent drift. Not a cosmetic
  pass — an architectural one.
- **A new `design-system` skill is needed** — `layout-design` covers feature UX, not
  design system work. The new skill would maintain `01-design/design-system.md` as
  source of truth, gate new component creation, and extract new patterns after builds.

## What came up that wasn't planned

**Visual problems diagnosed (to be fixed in DS-01):**
- Background bone too heavy; content pane shadow too light — poor zone separation
- `PageHeader`: no icon slot, floats bare on background with no visual containment
- Sidebar dividers rendering as icons (first sub-item wrapping onto divider line)
- Sidebar icons too small, spacing uneven in collapsed state
- `InlineField`: border transparent on idle — fields have no definition; label/icon
  placement not properly established
- Audience segments layout: left panel and content area not visually separated;
  segment switcher sitting where tab nav should be; tabs feel nested/confusing;
  persona section nav is a plain list with no indicator/line
- Buttons feel pinched; base font size slightly too small
- Dashboard home: content pane doesn't fill width; sidebar overlay vs push on expand

## Backlog status changes
- DASH-01: remains `in-progress` (functionally complete, held open pending DS-01 refactor)
- DS-01: to be added to backlog in next session

## What's next
1. **New session: `/design-system-starter`** — Ellie running this in a separate chat to
   set up DS-01 properly (brief, skill, component spec)
2. **DS-01 build** — once brief is approved from that session
3. **DASH-01 → done** — mark complete once DS-01 shared components are refactored
4. **INP-07: Input queue UI** — next feature after design system is in place

## Context for future sessions
- The design system session will produce: `01-design/briefs/DS-01-design-system.md`,
  a `design-system` skill in `.claude/skills/`, and `01-design/design-system.md` spec
- DASH-01 is held open deliberately — don't mark it done until DS-01 refactors
  PageHeader, InlineField, sidebar dividers, and ContentPane
- The Moogul legacy reference at `04-documentation/reference/legacy_files/index.html`
  is the visual benchmark — not to copy, but to match the level of component discipline
- Key architectural principle agreed: no Tailwind appearance classes below molecule
  level — organisms only compose, they don't style
- BRAND_ID still hardcoded as `ea444c72-d332-4765-afd5-8dda97f5cf6f` throughout
