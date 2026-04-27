'use client'

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

interface Tab {
  id: string
  label: string
  content: React.ReactNode
}

interface TabbedPaneProps {
  tabs: Tab[]
  defaultTab?: string
  className?: string
}

/**
 * TabbedPane — canonical tab strip molecule.
 *
 * Always renders the `line` variant (underline indicator in --primary).
 * Tab strip sits above ContentPane as part of page chrome — organisms
 * compose TabbedPane and ContentPane separately.
 */
export function TabbedPane({ tabs, defaultTab, className }: TabbedPaneProps) {
  return (
    <Tabs defaultValue={defaultTab ?? tabs[0]?.id} className={className}>
      <TabsList variant="line">
        {tabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="mt-4 overflow-y-auto min-h-0">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  )
}
