import { PageHeader } from '@/components/page-header'

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="App configuration and preferences."
      />
      <div className="mt-8 text-sm text-muted-foreground">
        Settings coming in a future milestone.
      </div>
    </>
  )
}
