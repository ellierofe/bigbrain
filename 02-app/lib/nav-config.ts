import {
  Dna,
  Users,
  Building2,
  Heart,
  Lightbulb,
  Target,
  BookOpen,
  Magnet,
  LayoutGrid,
  Monitor,
  Fingerprint,
  FileText,
  Swords,
  PenLine,
  Upload,
  ListOrdered,
  Library,
  Network,
  Sparkles,
  BrainCircuit,
  MessageSquare,
  FolderKanban,
  Compass,
  Home,
  type LucideIcon,
} from 'lucide-react'

export type NavBadge = 'pending_inputs_count' | 'inbox_count'

export interface NavItem {
  title: string
  href: string
  icon: LucideIcon
  badge?: NavBadge
}

export interface NavSection {
  label: string
  icon: LucideIcon
  items: NavItem[]
  /** Visual divider indices — a divider is rendered BEFORE items[i] */
  dividerBefore?: number[]
}

/** Flat link rendered as a single nav item (no accordion) */
export interface NavLink {
  type: 'link'
  title: string
  href: string
  icon: LucideIcon
}

/** Accordion section with sub-items */
export interface NavGroup {
  type: 'group'
  label: string
  icon: LucideIcon
  items: NavItem[]
  dividerBefore?: number[]
}

/** A visual separator in the nav */
export interface NavDivider {
  type: 'divider'
}

export type NavEntry = NavLink | NavGroup | NavDivider

export const navEntries: NavEntry[] = [
  {
    type: 'link',
    title: 'Home',
    href: '/',
    icon: Home,
  },
  { type: 'divider' },
  {
    type: 'group',
    label: 'DNA',
    icon: Dna,
    dividerBefore: [1, 5, 9],
    items: [
      { title: 'DNA Overview',        href: '/dna',                      icon: Dna },
      { title: 'Business Overview',   href: '/dna/business-overview',    icon: Building2 },
      { title: 'Brand Meaning',       href: '/dna/brand-meaning',        icon: Heart },
      { title: 'Value Proposition',   href: '/dna/value-proposition',    icon: Lightbulb },
      { title: 'Brand Identity',      href: '/dna/brand-identity',       icon: Fingerprint },
      { title: 'Tone of Voice',       href: '/dna/tone-of-voice',        icon: PenLine },
      { title: 'Audience Segments',   href: '/dna/audience-segments',    icon: Users },
      { title: 'Offers',              href: '/dna/offers',               icon: Target },
      { title: 'Knowledge Assets',    href: '/dna/knowledge-assets',     icon: BookOpen },
      { title: 'Competitors',         href: '/dna/competitors',          icon: Swords },
      { title: 'Channels',            href: '/dna/platforms',            icon: Monitor },
      { title: 'Content Pillars',     href: '/dna/content-pillars',      icon: LayoutGrid },
      { title: 'Brand Intros',        href: '/dna/brand-intros',         icon: FileText },
      { title: 'Lead Magnets',        href: '/dna/lead-magnets',         icon: Magnet },
    ],
  },
  {
    type: 'group',
    label: 'Knowledge',
    icon: Library,
    items: [
      { title: 'Proof',   href: '/knowledge/proof',   icon: FileText },
      { title: 'Graph',   href: '/knowledge/graph',   icon: Network },
    ],
  },
  { type: 'divider' },
  {
    type: 'group',
    label: 'Inputs',
    icon: Upload,
    items: [
      { title: 'Sources', href: '/inputs/sources', icon: Library, badge: 'inbox_count' },
      { title: 'Results', href: '/inputs/results', icon: ListOrdered },
      { title: 'Process', href: '/inputs/process', icon: Upload },
      { title: 'Ideas',   href: '/inputs/ideas',   icon: Lightbulb },
    ],
  },
  {
    type: 'group',
    label: 'Ask BigBrain',
    icon: BrainCircuit,
    items: [
      { title: 'Chat',   href: '/chat',           icon: MessageSquare },
      { title: 'Create', href: '/content',  icon: Sparkles },
    ],
  },
  { type: 'divider' },
  {
    type: 'group',
    label: 'Projects',
    icon: FolderKanban,
    items: [
      { title: 'Client Projects', href: '/projects/clients',  icon: FolderKanban },
      { title: 'Missions',        href: '/projects/missions', icon: Compass },
    ],
  },
]

/**
 * Legacy export — used by the old sidebar.
 * @deprecated Use navEntries instead.
 */
export const navSections: NavSection[] = navEntries
  .filter((e): e is NavGroup => e.type === 'group')
  .map(({ label, icon, items, dividerBefore }) => ({ label, icon, items, dividerBefore }))
