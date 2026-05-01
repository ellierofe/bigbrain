'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { ContentTypeSwitcher } from '@/components/content-type-switcher'
import { ContentPane } from '@/components/content-pane'
import { SectionCard } from '@/components/section-card'
import { ActionButton } from '@/components/action-button'
import { EmptyState } from '@/components/empty-state'
import { StrategyField, type StrategyFieldOption } from '@/components/strategy-field'
import { TopicCascade, type TopicCascadeState } from '@/components/topic-cascade'
import {
  GenerationSettingsStrip,
  type GenerationSettingsStripValue,
} from '@/components/generation-settings-strip'
import { AssembledPromptInspector } from '@/components/assembled-prompt-inspector'
import { getIconByName } from '@/lib/icons/by-name'
import { assembleContentRunAction } from '@/app/actions/content-creator'
import type { GenerationInputs, StrategyFieldId } from '@/lib/llm/content/types'

interface ContentTypeMeta {
  id: string
  slug: string
  name: string
  description: string | null
  icon: string | null
  formatType: string
  defaultVariantCount: number
  topicBarEnabled: boolean
  strategyFields: { id: StrategyFieldId; required: boolean }[]
}

interface GenerationSurfaceClientProps {
  contentType: ContentTypeMeta
  fieldOptions: Partial<Record<StrategyFieldId, StrategyFieldOption[]>>
  aiModels: { slug: string; name: string }[]
  switcherOptions: { value: string; label: string }[]
  prefill: Record<string, string | null>
}

type RightPaneState =
  | { kind: 'empty' }
  | { kind: 'loading' }
  | { kind: 'success'; runId: string; assembledPrompt: string }
  | { kind: 'error'; message: string }

export function GenerationSurfaceClient({
  contentType,
  fieldOptions,
  aiModels,
  switcherOptions,
  prefill,
}: GenerationSurfaceClientProps) {
  const router = useRouter()
  const [strategy, setStrategy] = useState<Partial<Record<StrategyFieldId, string | null>>>(prefill)

  const [topicState, setTopicState] = useState<TopicCascadeState>({
    selections: [],
    freeTextAugment: '',
    resolved: null,
  })

  const [settings, setSettings] = useState<GenerationSettingsStripValue>({
    modelSlug: '',
    person: 'default',
    toneVariation: '',
    variantCount: contentType.defaultVariantCount,
  })

  const [rightPane, setRightPane] = useState<RightPaneState>({ kind: 'empty' })

  const Icon = getIconByName(contentType.icon) ?? FileText

  // Validation
  const requiredStrategyFilled = contentType.strategyFields
    .filter((f) => f.required)
    .every((f) => {
      const v = strategy[f.id]
      return v !== undefined && v !== null && v !== ''
    })

  const topicResolved =
    !contentType.topicBarEnabled ||
    topicState.resolved !== null ||
    (topicState.freeTextOnly !== undefined && topicState.freeTextOnly.trim().length > 0)

  const canGenerate = requiredStrategyFilled && topicResolved && rightPane.kind !== 'loading'

  // Tone options come from the field options (set up in the page server component)
  const toneOptions = fieldOptions.tone_variation ?? []

  const handleGenerate = async () => {
    setRightPane({ kind: 'loading' })

    const inputs: GenerationInputs = {
      strategy: {
        ...strategy,
        ...(settings.toneVariation ? { tone_variation: settings.toneVariation } : {}),
      },
      topic_chain: topicState.resolved,
      free_text_augments: topicState.freeTextAugment ? [topicState.freeTextAugment] : [],
      settings: {
        variant_count: settings.variantCount,
        model_override: settings.modelSlug || null,
        tone_variation: settings.toneVariation || null,
      },
    }

    const result = await assembleContentRunAction({
      contentTypeSlug: contentType.slug,
      inputs,
    })

    if (result.ok) {
      setRightPane({
        kind: 'success',
        runId: result.runId,
        assembledPrompt: result.assembledPrompt,
      })
    } else {
      setRightPane({ kind: 'error', message: result.error })
    }
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={contentType.name}
        subtitle={contentType.description ?? undefined}
        icon={Icon}
        action={
          <ContentTypeSwitcher
            currentSlug={contentType.slug}
            options={switcherOptions}
            onChange={(slug) => router.push(`/content/create/${slug}`)}
          />
        }
      />

      <ContentPane padding={false} className="flex">
        {/* Left rail */}
        <div className="flex w-[380px] shrink-0 flex-col gap-3 overflow-hidden border-r p-4">
          <div className="shrink-0 max-h-[40vh] overflow-auto">
            <SectionCard title="Content strategy">
              <div className="flex flex-col gap-3">
                {contentType.strategyFields.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No strategy fields for this content type.</p>
                ) : (
                  contentType.strategyFields.map((field) => (
                    <StrategyField
                      key={field.id}
                      field={field}
                      value={strategy[field.id] ?? null}
                      onChange={(v) => setStrategy((prev) => ({ ...prev, [field.id]: v }))}
                      options={fieldOptions[field.id] ?? []}
                    />
                  ))
                )}
              </div>
            </SectionCard>
          </div>

          {contentType.topicBarEnabled && (
            <div className="flex-1 min-h-0 overflow-auto">
              <SectionCard title="The Infinite Prompt Engine">
                <TopicCascade value={topicState} onChange={setTopicState} strategy={strategy} />
              </SectionCard>
            </div>
          )}

          <GenerationSettingsStrip
            value={settings}
            onChange={setSettings}
            aiModels={aiModels}
            toneOptions={toneOptions}
          />

          <ActionButton
            onClick={handleGenerate}
            disabled={!canGenerate}
            loading={rightPane.kind === 'loading'}
            icon={Sparkles}
            className="w-full"
          >
            {rightPane.kind === 'loading' ? 'Assembling…' : 'Generate'}
          </ActionButton>
        </div>

        {/* Right pane */}
        <div className="flex-1 min-h-0 overflow-auto">
          {rightPane.kind === 'empty' && (
            <EmptyState
              icon={Sparkles}
              heading="Ready when you are"
              description="Fill the panels on the left, then press Generate to see the assembled prompt."
            />
          )}
          {rightPane.kind === 'loading' && (
            <div className="flex h-full items-center justify-center">
              <p className="text-sm text-muted-foreground">Assembling prompt…</p>
            </div>
          )}
          {rightPane.kind === 'success' && (
            <AssembledPromptInspector
              runId={rightPane.runId}
              assembledPrompt={rightPane.assembledPrompt}
            />
          )}
          {rightPane.kind === 'error' && (
            <div className="m-6 rounded-md border border-destructive/40 bg-destructive/10 p-4">
              <p className="font-medium text-destructive">Couldn&apos;t assemble the prompt</p>
              <p className="mt-1 text-sm text-destructive/80">{rightPane.message}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                Edit your inputs on the left and try again.
              </p>
            </div>
          )}
        </div>
      </ContentPane>
    </div>
  )
}
