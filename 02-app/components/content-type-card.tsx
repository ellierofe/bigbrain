'use client'

import Link from 'next/link'
import { FileText, Star } from 'lucide-react'
import { TypeBadge, type TagHue } from '@/components/type-badge'
import { LockBadge } from '@/components/lock-badge'
import { MissingPrereqDeeplink } from '@/components/missing-prereq-deeplink'
import { getIconByName } from '@/lib/icons/by-name'

export interface ContentTypeCardData {
  id: string
  slug: string
  name: string
  description: string | null
  icon: string | null
  pickerGroup: string
  channel: string
  channelHue: TagHue | 'neutral'
  isFavourite: boolean
  isLocked: boolean
  missingPrereq: { label: string; href: string } | null
}

interface ContentTypeCardProps {
  data: ContentTypeCardData
  onToggleFavourite: (id: string) => void
}

const PICKER_GROUP_LABELS: Record<string, string> = {
  sales: 'Sales',
  email: 'Email',
  social: 'Social',
  long_form: 'Long form',
  brainstorm: 'Brainstorm',
  outreach: 'Outreach',
  other: 'Other',
}

const PICKER_GROUP_HUES: Record<string, TagHue | 'neutral'> = {
  sales: 1,
  email: 2,
  social: 3,
  long_form: 4,
  brainstorm: 5,
  outreach: 6,
  other: 'neutral',
}

export function ContentTypeCard({ data, onToggleFavourite }: ContentTypeCardProps) {
  const Icon = getIconByName(data.icon) ?? FileText

  const groupLabel = PICKER_GROUP_LABELS[data.pickerGroup] ?? data.pickerGroup
  const groupHue = PICKER_GROUP_HUES[data.pickerGroup] ?? 'neutral'

  const handleFavourite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    onToggleFavourite(data.id)
  }

  const cardClasses = [
    'group relative flex h-full flex-col rounded-lg border bg-card p-4 transition-colors',
    data.isLocked ? 'opacity-60' : 'hover:border-foreground/20 hover:bg-muted/30',
  ].join(' ')

  const cardBody = (
    <>
      {/* Top row: favourite star (left) + icon (centred via spacer) */}
      <div className="mb-3 flex items-start justify-between">
        <button
          type="button"
          onClick={handleFavourite}
          className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label={data.isFavourite ? 'Remove from favourites' : 'Add to favourites'}
        >
          <Star
            className={`h-4 w-4 ${data.isFavourite ? 'fill-current text-amber-500' : ''}`}
          />
        </button>
        <Icon className="h-8 w-8 text-foreground/80" />
        <div className="w-6" aria-hidden />
      </div>

      <h3 className="font-medium text-base">{data.name}</h3>
      {data.description && (
        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{data.description}</p>
      )}

      <div className="mt-auto pt-3">
        {data.isLocked && data.missingPrereq ? (
          <div className="flex flex-col gap-2">
            <LockBadge label={`Needs ${data.missingPrereq.label}`} />
            <MissingPrereqDeeplink label={data.missingPrereq.label} href={data.missingPrereq.href} />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            <TypeBadge hue={groupHue} label={groupLabel} />
            {data.channel && <TypeBadge hue={data.channelHue} label={data.channel} />}
          </div>
        )}
      </div>
    </>
  )

  if (data.isLocked) {
    return <div className={cardClasses}>{cardBody}</div>
  }

  return (
    <Link href={`/content/create/${data.slug}`} className={cardClasses}>
      {cardBody}
    </Link>
  )
}
