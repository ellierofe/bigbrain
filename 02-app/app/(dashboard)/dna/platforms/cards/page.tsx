import Link from 'next/link'
import { LayoutGrid } from 'lucide-react'
import { listPlatforms, listAllPlatforms } from '@/lib/db/queries/platforms'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { StatusBadge } from '@/components/status-badge'
import { ActionButton } from '@/components/action-button'
import { CreatePlatformButton } from '../create-platform-button'
import { TypeBadge } from '@/components/type-badge'
import {
  CATEGORIES,
  CATEGORY_HUES,
  CATEGORY_LABELS,
  CHANNEL_LABELS,
  type Category,
  type Channel,
} from '@/lib/types/channels'
import type { PlatformSummary } from '@/lib/types/platforms'

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

export default async function PlatformCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ showArchived?: string }>
}) {
  const params = await searchParams
  const showArchived = params.showArchived === 'true'
  const channels = showArchived
    ? await listAllPlatforms(BRAND_ID)
    : await listPlatforms(BRAND_ID)

  const hasAny = channels.length > 0
  const firstActive = channels.find(c => c.isActive)

  // Group by category, preserving canonical category order. Empty categories are omitted.
  const grouped: { category: Category; rows: PlatformSummary[] }[] = []
  for (const cat of CATEGORIES) {
    const rows = channels.filter((c) => c.category === cat)
    if (rows.length > 0) grouped.push({ category: cat, rows })
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <PageHeader
        title="Channels"
        subtitle="Your channel strategies at a glance."
        icon={LayoutGrid}
        action={
          <div className="flex items-center gap-2">
            {firstActive && (
              <ActionButton variant="outline" href={`/dna/platforms/${firstActive.id}`}>
                Detail view
              </ActionButton>
            )}
            <CreatePlatformButton />
          </div>
        }
      />

      {!hasAny ? (
        <EmptyState
          icon={LayoutGrid}
          heading="No channels yet"
          description="Add your first channel to define how your brand shows up."
          action={<CreatePlatformButton />}
        />
      ) : (
        <>
          <div className="flex flex-col gap-8">
            {grouped.map(({ category, rows }, idx) => (
              <section key={category} className="flex flex-col gap-4">
                {idx > 0 && <div className="border-t border-border/40" />}
                <div className="flex items-baseline gap-2 pt-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {CATEGORY_LABELS[category]}
                  </span>
                  <span className="text-[10px] text-muted-foreground">·</span>
                  <span className="text-[10px] text-muted-foreground">{rows.length}</span>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {rows.map(row => {
                    const isInactive = !row.isActive
                    const channelLabel = CHANNEL_LABELS[row.channel as Channel] ?? row.channel
                    const showSecondaryPill = channelLabel.toLowerCase() !== row.name.toLowerCase()
                    return (
                      <Link
                        key={row.id}
                        href={`/dna/platforms/${row.id}`}
                        className={`group flex flex-col gap-2 rounded-lg border border-border bg-card p-5 transition-colors hover:border-border/80 hover:bg-muted/30 ${
                          isInactive ? 'opacity-60' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 flex-wrap">
                          <TypeBadge
                            hue={CATEGORY_HUES[category]}
                            label={CATEGORY_LABELS[category]}
                          />
                          {showSecondaryPill && (
                            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                              {channelLabel}
                            </span>
                          )}
                          {isInactive && (
                            <StatusBadge
                              status="inactive"
                              options={[{ value: 'inactive', label: 'Inactive', state: 'warning' }]}
                            />
                          )}
                        </div>
                        <h3 className="font-display text-sm font-semibold truncate">
                          {row.name}
                        </h3>
                        {row.primaryObjective && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {row.primaryObjective}
                          </p>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>

          <div className="text-center">
            <Link
              href={showArchived ? '/dna/platforms/cards' : '/dna/platforms/cards?showArchived=true'}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {showArchived ? 'Hide inactive' : 'Show inactive'}
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
