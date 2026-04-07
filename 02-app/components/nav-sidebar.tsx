'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
} from '@/components/ui/sidebar'
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
  FileText,
  Network,
  PenLine,
  Inbox,
  Upload,
  List,
} from 'lucide-react'

const navSections = [
  {
    label: 'Strategy',
    items: [
      { title: 'DNA Overview', href: '/dashboard/dna', icon: Dna },
      { title: 'Audience Segments', href: '/dashboard/dna/audience-segments', icon: Users },
      { title: 'Business Overview', href: '/dashboard/dna/business-overview', icon: Building2 },
      { title: 'Brand Meaning', href: '/dashboard/dna/brand-meaning', icon: Heart },
      { title: 'Value Proposition', href: '/dashboard/dna/value-proposition', icon: Lightbulb },
      { title: 'Offers', href: '/dashboard/dna/offers', icon: Target },
      { title: 'Knowledge Assets', href: '/dashboard/dna/knowledge-assets', icon: BookOpen },
      { title: 'Content Pillars', href: '/dashboard/dna/content-pillars', icon: LayoutGrid },
      { title: 'Lead Magnets', href: '/dashboard/dna/lead-magnets', icon: Magnet },
      { title: 'Platforms', href: '/dashboard/dna/platforms', icon: Monitor },
      { title: 'Brand Identity', href: '/dashboard/dna/brand-identity', icon: Dna },
      { title: 'Brand Intros', href: '/dashboard/dna/brand-intros', icon: FileText },
      { title: 'Competitors', href: '/dashboard/dna/competitors', icon: Target },
      { title: 'Tone of Voice', href: '/dashboard/dna/tone-of-voice', icon: PenLine },
    ],
  },
  {
    label: 'Inputs',
    items: [
      { title: 'Process text', href: '/inputs/process', icon: Upload },
      { title: 'Input queue', href: '/inputs', icon: List },
    ],
  },
  {
    label: 'Knowledge',
    items: [
      { title: 'Sources', href: '/dashboard/sources', icon: FileText },
      { title: 'Graph', href: '/dashboard/graph', icon: Network },
    ],
  },
  {
    label: 'Content',
    items: [
      { title: 'Create', href: '/create', icon: PenLine },
      { title: 'Inbox', href: '/dashboard/inbox', icon: Inbox },
    ],
  },
]

export function NavSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="px-4 py-4">
        <span className="text-base font-semibold tracking-tight">BigBrain</span>
        <span className="text-xs text-muted-foreground">NicelyPut</span>
      </SidebarHeader>
      <SidebarContent>
        {navSections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={pathname === item.href}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
