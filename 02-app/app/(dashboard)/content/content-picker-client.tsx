'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { ContentTypeCard, type ContentTypeCardData } from '@/components/content-type-card'
import { PickerFilterBar } from '@/components/picker-filter-bar'
import type { MultiFilterPillOption } from '@/components/multi-filter-pill-group'
import { SearchInput } from '@/components/search-input'
import { CATEGORY_HUES, CATEGORY_LABELS, CHANNEL_LABELS, CHANNELS_BY_CATEGORY, type Category } from '@/lib/types/channels'
import type { TagHue } from '@/components/type-badge'
import type { ContentTypeCardData as ServerCardData } from '@/lib/db/queries/content-creator'
import { toggleContentTypeFavouriteAction } from '@/app/actions/content-creator'

interface ContentPickerClientProps {
  initialItems: ServerCardData[]
}

const PICKER_GROUP_OPTIONS: MultiFilterPillOption[] = [
  { value: 'social', label: 'Social' },
  { value: 'email', label: 'Email' },
  { value: 'long_form', label: 'Long form' },
  { value: 'brainstorm', label: 'Brainstorm' },
  { value: 'sales', label: 'Sales' },
  { value: 'outreach', label: 'Outreach' },
]

// Build channel → category lookup once at module scope.
const CHANNEL_TO_CATEGORY: Record<string, Category> = {}
for (const [cat, channels] of Object.entries(CHANNELS_BY_CATEGORY)) {
  for (const ch of channels) {
    if (!(ch in CHANNEL_TO_CATEGORY)) CHANNEL_TO_CATEGORY[ch] = cat as Category
  }
}

function channelHue(channel: string): TagHue | 'neutral' {
  const cat = CHANNEL_TO_CATEGORY[channel]
  return cat ? CATEGORY_HUES[cat] : 'neutral'
}

function channelLabel(channel: string): string {
  return (CHANNEL_LABELS as Record<string, string>)[channel] ?? channel
}

export function ContentPickerClient({ initialItems }: ContentPickerClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Read filter state from URL
  const activeCategories = (searchParams.get('cat') ?? '').split(',').filter(Boolean)
  const activeChannels = (searchParams.get('ch') ?? '').split(',').filter(Boolean)
  const favouritesOnly = searchParams.get('fav') === '1'

  // Search is local state only — URL transitions during typing cause input value
  // to lag user keystrokes (each letter appears then is "deleted" by the previous
  // render's value before the new character commits). Filters tolerate this lag
  // because they're chip-based; a free-typed input doesn't.
  const [searchQuery, setSearchQuery] = useState('')

  // Local optimistic state for favourite toggles (server returns the new state)
  const [optimisticFavs, setOptimisticFavs] = useState<Record<string, boolean>>({})

  const items = initialItems.map((item) => ({
    ...item,
    isFavourite: optimisticFavs[item.id] ?? item.isFavourite,
  }))

  // Derive available channels from the loaded catalogue (only show filters with options)
  const availableChannels: MultiFilterPillOption[] = useMemo(() => {
    const seen = new Set<string>()
    const opts: MultiFilterPillOption[] = []
    for (const i of items) {
      if (i.platformType && !seen.has(i.platformType)) {
        seen.add(i.platformType)
        opts.push({ value: i.platformType, label: channelLabel(i.platformType) })
      }
    }
    return opts.sort((a, b) => a.label.localeCompare(b.label))
  }, [items])

  const filtered = items.filter((item) => {
    if (activeCategories.length > 0 && !activeCategories.includes(item.pickerGroup)) return false
    if (activeChannels.length > 0 && !activeChannels.includes(item.platformType)) return false
    if (favouritesOnly && !item.isFavourite) return false
    if (searchQuery && !item.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  // URL state updaters
  const setParam = (key: string, value: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value === null || value === '') params.delete(key)
    else params.set(key, value)
    startTransition(() => {
      router.replace(`/content${params.toString() ? '?' + params.toString() : ''}`)
    })
  }

  const handleCategoriesChange = (vals: string[]) => setParam('cat', vals.join(',') || null)
  const handleChannelsChange = (vals: string[]) => setParam('ch', vals.join(',') || null)
  const handleFavouritesChange = (val: boolean) => setParam('fav', val ? '1' : null)
  const handleClearAll = () => {
    setSearchQuery('')
    startTransition(() => {
      router.replace('/content')
    })
  }

  const handleToggleFavourite = (contentTypeId: string) => {
    const current = optimisticFavs[contentTypeId] ?? items.find((i) => i.id === contentTypeId)?.isFavourite ?? false
    setOptimisticFavs((prev) => ({ ...prev, [contentTypeId]: !current }))
    void (async () => {
      const result = await toggleContentTypeFavouriteAction(contentTypeId)
      if (!result.ok) {
        // Roll back on error
        setOptimisticFavs((prev) => ({ ...prev, [contentTypeId]: current }))
      }
    })()
  }

  const cardData = (item: typeof items[number]): ContentTypeCardData => ({
    id: item.id,
    slug: item.slug,
    name: item.name,
    description: item.description,
    icon: item.icon,
    pickerGroup: item.pickerGroup,
    channel: channelLabel(item.platformType),
    channelHue: channelHue(item.platformType),
    isFavourite: item.isFavourite,
    isLocked: item.isLocked,
    missingPrereq: item.missingPrereq,
  })

  return (
    <div>
      <PageHeader
        title="Create content"
        subtitle="Pick a content type to start. Filters narrow what's shown."
        action={
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search content types…"
          />
        }
      />

      <PickerFilterBar
        categories={PICKER_GROUP_OPTIONS}
        channels={availableChannels}
        activeCategories={activeCategories}
        activeChannels={activeChannels}
        favouritesOnly={favouritesOnly}
        onCategoriesChange={handleCategoriesChange}
        onChannelsChange={handleChannelsChange}
        onFavouritesChange={handleFavouritesChange}
        onClearAll={handleClearAll}
      />

      {filtered.length === 0 ? (
        favouritesOnly && items.filter((i) => i.isFavourite).length === 0 ? (
          <EmptyState
            icon={Sparkles}
            heading="No favourites yet"
            description="Star a content type to find it here later."
          />
        ) : (
          <EmptyState
            icon={Sparkles}
            heading="No content types match these filters"
            description="Try removing a filter or clearing search."
          />
        )
      ) : (
        <div
          className={`grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${isPending ? 'opacity-70 transition-opacity' : ''}`}
        >
          {filtered.map((item) => (
            <ContentTypeCard
              key={item.id}
              data={cardData(item)}
              onToggleFavourite={handleToggleFavourite}
            />
          ))}
        </div>
      )}
    </div>
  )
}
