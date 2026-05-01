'use client'

import { Star } from 'lucide-react'
import { FilterPill } from '@/components/filter-pill'
import { MultiFilterPillGroup, type MultiFilterPillOption } from '@/components/multi-filter-pill-group'

interface PickerFilterBarProps {
  categories: MultiFilterPillOption[]
  channels: MultiFilterPillOption[]
  activeCategories: string[]
  activeChannels: string[]
  favouritesOnly: boolean
  onCategoriesChange: (vals: string[]) => void
  onChannelsChange: (vals: string[]) => void
  onFavouritesChange: (val: boolean) => void
  onClearAll: () => void
}

export function PickerFilterBar({
  categories,
  channels,
  activeCategories,
  activeChannels,
  favouritesOnly,
  onCategoriesChange,
  onChannelsChange,
  onFavouritesChange,
  onClearAll,
}: PickerFilterBarProps) {
  const hasActive =
    activeCategories.length > 0 || activeChannels.length > 0 || favouritesOnly

  return (
    <div className="mb-6 flex flex-col gap-3 border-b pb-4">
      {categories.length > 0 && (
        <MultiFilterPillGroup
          label="Group"
          values={activeCategories}
          onChange={onCategoriesChange}
          options={categories}
        />
      )}
      {channels.length > 0 && (
        <MultiFilterPillGroup
          label="Channel"
          values={activeChannels}
          onChange={onChannelsChange}
          options={channels}
        />
      )}
      <div className="flex items-center justify-between">
        <FilterPill
          label="Favourites only"
          active={favouritesOnly}
          onClick={() => onFavouritesChange(!favouritesOnly)}
          icon={Star}
        />
        {hasActive && (
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-medium text-muted-foreground hover:text-foreground hover:underline"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  )
}
