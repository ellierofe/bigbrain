'use client'

import { useState, useMemo, useEffect } from 'react'
import { Lightbulb, Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { SectionCard } from '@/components/section-card'
import { IdeasList } from '@/components/ideas-list'
import { IdeaCaptureModal } from '@/components/idea-capture-modal'
import { Button } from '@/components/ui/button'
import type { Idea, IdeaTag, IdeaTagEntityType } from '@/lib/types/ideas'
import type { TaggableEntity } from '@/lib/db/queries/taggable-entities'

interface IdeasPanelProps {
  /** The entity this panel is scoped to */
  entityType: IdeaTagEntityType
  entityId: string
  /** Human-readable label: "this mission", "this project", etc. Shown in the capture modal and tabs. */
  entityLabel: string

  /** All ideas for the current brand */
  allIdeas: Idea[]
  /** Tags for every idea */
  tagsMap: Record<string, IdeaTag[]>
  /** All entities available for tagging (for the full tag picker) */
  taggableEntities: TaggableEntity[]

  /** Optional: override the default section title */
  title?: string
}

type PanelTab = 'this' | 'all'

export function IdeasPanel({
  entityType,
  entityId,
  entityLabel,
  allIdeas,
  tagsMap: initialTagsMap,
  taggableEntities,
  title = 'Ideas & Questions',
}: IdeasPanelProps) {
  const router = useRouter()
  const [tab, setTab] = useState<PanelTab>('this')
  const [captureOpen, setCaptureOpen] = useState(false)
  // Local tagsMap so tab counts stay in sync with in-place tag changes
  const [tagsMap, setTagsMap] = useState(initialTagsMap)

  useEffect(() => { setTagsMap(initialTagsMap) }, [initialTagsMap])

  // Ideas tagged to this entity
  const scopedIdeas = useMemo(() => {
    return allIdeas.filter((idea) => {
      const tags = tagsMap[idea.id] ?? []
      return tags.some((t) => t.entityType === entityType && t.entityId === entityId)
    })
  }, [allIdeas, tagsMap, entityType, entityId])

  const scopedCount = scopedIdeas.length
  const allCount = allIdeas.length

  const contextFilter = { entityType, entityId, entityLabel }

  const visibleIdeas = tab === 'this' ? scopedIdeas : allIdeas

  return (
    <>
      <SectionCard
        title={title}
        action={
          <div className="flex items-center gap-1">
            <div className="flex rounded-md bg-muted p-0.5 mr-2">
              <button
                type="button"
                onClick={() => setTab('this')}
                className={`rounded px-2 py-0.5 text-[12px] font-medium transition-colors ${
                  tab === 'this'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                This {entityLabel} ({scopedCount})
              </button>
              <button
                type="button"
                onClick={() => setTab('all')}
                className={`rounded px-2 py-0.5 text-[12px] font-medium transition-colors ${
                  tab === 'all'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All ideas ({allCount})
              </button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCaptureOpen(true)}
              className="gap-1 text-muted-foreground"
            >
              <Plus className="h-3.5 w-3.5" />
              Capture
            </Button>
          </div>
        }
      >
        {visibleIdeas.length === 0 && tab === 'this' ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Lightbulb className="h-5 w-5 text-muted-foreground/50" />
            <p className="text-[13px] text-muted-foreground">
              No ideas tagged to {entityLabel} yet.
            </p>
            <p className="text-[12px] text-muted-foreground/70">
              Capture one above, or switch to &quot;All ideas&quot; to link existing ones.
            </p>
          </div>
        ) : visibleIdeas.length === 0 && tab === 'all' ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <Lightbulb className="h-5 w-5 text-muted-foreground/50" />
            <p className="text-[13px] text-muted-foreground">No ideas captured yet.</p>
          </div>
        ) : (
          <IdeasList
            ideas={visibleIdeas}
            tagsMap={tagsMap}
            taggableEntities={taggableEntities}
            showFilters={true}
            contextFilter={tab === 'all' ? contextFilter : undefined}
            onTagsChange={setTagsMap}
          />
        )}
      </SectionCard>

      <IdeaCaptureModal
        open={captureOpen}
        onOpenChange={setCaptureOpen}
        autoTag={{ entityType, entityId, entityLabel }}
        onCaptured={() => router.refresh()}
      />
    </>
  )
}
