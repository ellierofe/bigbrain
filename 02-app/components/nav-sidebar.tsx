'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { LogOut, Settings, ChevronDown, Search, Brain } from 'lucide-react'
import { navEntries, type NavEntry } from '@/lib/nav-config'
import { SectionDivider } from '@/components/section-divider'

interface NavSidebarProps {
  pendingInputsCount?: number
  inboxCount?: number
}

export function NavSidebar({ pendingInputsCount = 0, inboxCount = 0 }: NavSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    DNA: true,
  })

  function toggleSection(label: string) {
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }))
  }

  function isItemActive(href: string) {
    if (href === '/') return pathname === '/'
    if (href === '/dna') return pathname === '/dna'
    return pathname === href || pathname.startsWith(href + '/')
  }

  function isGroupActive(entry: Extract<NavEntry, { type: 'group' }>) {
    return entry.items.some((item) => isItemActive(item.href))
  }

  async function handleLogout() {
    await signOut({ redirect: false })
    router.push('/api/auth/signin')
  }

  return (
    <aside className="flex w-[220px] shrink-0 flex-col bg-sidebar text-sidebar-foreground h-full overflow-y-auto">
      {/* Header — logo mark + wordmark */}
      <div className="px-4 py-5 border-b border-sidebar-border">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-sm bg-sidebar-primary">
            <Brain className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <span className="font-heading text-[15px] font-bold text-sidebar-foreground">
            BigBrain
          </span>
        </Link>
      </div>

      {/* Search bar */}
      <div className="px-3 pt-3 pb-1">
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-sm bg-sidebar-foreground/[0.06] px-2.5 py-[7px] text-[12px] text-sidebar-foreground/40 transition-colors hover:bg-sidebar-foreground/[0.1]"
        >
          <Search className="h-3 w-3 shrink-0" />
          <span>Search knowledge…</span>
        </button>
      </div>

      {/* Nav entries */}
      <nav className="flex-1 py-2 px-1.5">
        {navEntries.map((entry, i) => {
          if (entry.type === 'divider') {
            return <SectionDivider key={`div-${i}`} className="-mx-0.5 my-1.5 [&_hr]:border-sidebar-border" />
          }

          if (entry.type === 'link') {
            const active = isItemActive(entry.href)
            return (
              <Link
                key={entry.href}
                href={entry.href}
                className={`flex items-center gap-2.5 rounded-sm px-3 py-2 text-[13px] font-medium transition-colors mb-0.5 ${
                  active
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                }`}
              >
                <entry.icon className="h-4 w-4 shrink-0" />
                <span>{entry.title}</span>
              </Link>
            )
          }

          // type === 'group'
          const groupActive = isGroupActive(entry)
          const isOpen = openSections[entry.label] ?? false

          return (
            <div key={entry.label} className="mb-0.5">
              <button
                type="button"
                onClick={() => toggleSection(entry.label)}
                className={`flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-[13px] font-medium transition-colors ${
                  groupActive
                    ? 'text-sidebar-foreground'
                    : 'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                }`}
              >
                <entry.icon className="h-4 w-4 shrink-0" />
                <span>{entry.label}</span>
                {/* Badge on the section level (e.g. Inputs badge) */}
                {entry.label === 'Inputs' && (pendingInputsCount > 0 || inboxCount > 0) && (
                  <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-sidebar-primary px-1 text-[10px] font-semibold text-sidebar-primary-foreground">
                    {(() => { const total = pendingInputsCount + inboxCount; return total > 99 ? '99+' : total })()}
                  </span>
                )}
                <ChevronDown
                  className={`ml-auto h-3 w-3 shrink-0 text-sidebar-foreground/40 transition-transform duration-200 ${
                    isOpen ? 'rotate-0' : '-rotate-90'
                  }`}
                />
              </button>

              {isOpen && (
                <div className="mt-0.5">
                  {entry.items.map((item, index) => {
                    const active = isItemActive(item.href)
                    const badgeValue =
                      item.badge === 'pending_inputs_count' ? pendingInputsCount
                      : item.badge === 'inbox_count' ? inboxCount
                      : 0

                    return (
                      <div key={item.href}>
                        {entry.dividerBefore?.includes(index) && (
                          <SectionDivider className="mx-2 my-1.5 [&_hr]:border-sidebar-border" />
                        )}
                        <Link
                          href={item.href}
                          className={`flex items-center gap-2 py-1.5 pl-10 pr-3 text-[12px] transition-colors ${
                            active
                              ? 'text-sidebar-primary font-medium'
                              : 'text-sidebar-foreground/45 hover:text-sidebar-foreground'
                          }`}
                        >
                          <span>{item.title}</span>
                          {badgeValue > 0 && (
                            <span className="ml-auto flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-sidebar-primary px-1 text-[10px] font-semibold text-sidebar-primary-foreground">
                              {badgeValue > 99 ? '99+' : badgeValue}
                            </span>
                          )}
                        </Link>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer: Settings + Logout */}
      <div className="mt-auto border-t border-sidebar-border py-2 px-1.5">
        <Link
          href="/settings"
          className={`flex items-center gap-2.5 rounded-sm px-3 py-2 text-[13px] transition-colors ${
            pathname === '/settings'
              ? 'text-sidebar-foreground font-medium'
              : 'text-sidebar-foreground/50 hover:text-sidebar-foreground'
          }`}
        >
          <Settings className="h-4 w-4 shrink-0" />
          <span>Settings</span>
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-[13px] text-sidebar-foreground/50 transition-colors hover:text-sidebar-foreground"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  )
}
