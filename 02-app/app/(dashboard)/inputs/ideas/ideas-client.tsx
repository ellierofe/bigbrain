'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { ContentPane } from '@/components/content-pane'
import { IdeasList } from '@/components/ideas-list'
import { IdeaCaptureModal } from '@/components/idea-capture-modal'
import { ActionButton } from '@/components/action-button'
import type { Idea, IdeaTag } from '@/lib/types/ideas'
import type { TaggableEntity } from '@/lib/db/queries/taggable-entities'

interface IdeasPageClientProps {
  ideas: Idea[]
  tagsMap: Record<string, IdeaTag[]>
  taggableEntities: TaggableEntity[]
}

export function IdeasPageClient({ ideas, tagsMap, taggableEntities }: IdeasPageClientProps) {
  const [captureOpen, setCaptureOpen] = useState(false)

  return (
    <>
      <div className="flex items-center justify-end -mt-2">
        <ActionButton icon={Plus} variant="outline" onClick={() => setCaptureOpen(true)}>
          Capture
        </ActionButton>
      </div>
      <ContentPane>
        <IdeasList
          ideas={ideas}
          tagsMap={tagsMap}
          taggableEntities={taggableEntities}
          onCaptureClick={() => setCaptureOpen(true)}
        />
      </ContentPane>
      <IdeaCaptureModal open={captureOpen} onOpenChange={setCaptureOpen} />
    </>
  )
}
