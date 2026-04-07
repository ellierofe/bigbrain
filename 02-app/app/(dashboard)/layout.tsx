import { SidebarProvider } from '@/components/ui/sidebar'
import { NavSidebar } from '@/components/nav-sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-full w-full">
        <NavSidebar />
        <main className="flex-1 overflow-hidden flex flex-col p-8">
          {children}
        </main>
      </div>
    </SidebarProvider>
  )
}
