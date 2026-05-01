'use client'

import { useEffect, useState, useTransition } from 'react'
import { Plus, Minus } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/modal'
import { ActionButton } from '@/components/action-button'
import { TopicCascadeStep, type TopicCascadeStepOption } from '@/components/topic-cascade-step'
import {
  listTopicCategoriesAction,
  listTopicChildrenAction,
  resolveTopicChainAction,
  resolveTopicFreeTextAction,
} from '@/app/actions/content-creator'
import type { TopicNode, TopicParams } from '@/lib/content/topic-engine'
import type { TopicChain } from '@/lib/llm/content/types'

export type TopicCascadeState = {
  /** Per-step user picks, in order. Each entry is the TopicNode from the engine. */
  selections: TopicNode[]
  freeTextAugment: string
  /** When the user picked the free-text category at step 1. */
  freeTextOnly?: string
  /** Resolved leaf chain — only set once cascade is complete. */
  resolved: TopicChain | null
}

interface TopicCascadeProps {
  value: TopicCascadeState
  onChange: (state: TopicCascadeState) => void
  /**
   * Strategy answers from the surrounding panel. When the user picks a category
   * whose entity-step matches a filled strategy field (audience/offer/asset/platform),
   * the cascade auto-skips that step rather than asking the user to pick again.
   */
  strategy?: Partial<Record<string, string | null>>
}

/** Map from topic-engine category → matching strategy field id. */
const CATEGORY_TO_STRATEGY_FIELD: Record<string, string> = {
  audience: 'audience_segment',
  offer: 'offer',
  knowledge_asset: 'knowledge_asset',
  platform: 'platform',
}

const FREE_TEXT_CATEGORY_LABELS = ['Free text', 'free text', 'Other / free text']

/**
 * Orchestrates the 1..4 step Topic Engine cascade. Owns option fetching,
 * step reveal, multi-select gating, free-text branch, leaf-augment toggle,
 * and the topic-clear confirm modal.
 *
 * Resolves the leaf chain (`prompt_template_resolved`) into `value.resolved`
 * whenever the cascade reaches a leaf with all required selections. Parent
 * (the generation-surface organism) consumes that for assembly.
 */
export function TopicCascade({ value, onChange, strategy }: TopicCascadeProps) {
  const [stepOptions, setStepOptions] = useState<TopicNode[][]>([])
  const [loadingStep, setLoadingStep] = useState<number | null>(null)
  const [, startTransition] = useTransition()

  const [confirmState, setConfirmState] = useState<{
    open: boolean
    stepIndex: number
    nextNode: TopicNode | null
  }>({ open: false, stepIndex: 0, nextNode: null })

  const [augmentVisible, setAugmentVisible] = useState(value.freeTextAugment.length > 0)

  // Fetch step 1 options on mount
  useEffect(() => {
    let cancelled = false
    setLoadingStep(0)
    listTopicCategoriesAction().then((nodes) => {
      if (cancelled) return
      setStepOptions([nodes])
      setLoadingStep(null)
    })
    return () => {
      cancelled = true
    }
  }, [])

  // Build TopicParams from accumulated selections
  const buildParams = (selections: TopicNode[]): TopicParams => {
    const params: TopicParams = {}
    for (const node of selections) {
      if (node.itemId) {
        const cat = node.topicPath?.category
        if (cat === 'audience') params.segment_id = node.itemId
        else if (cat === 'offer') params.offer_id = node.itemId
        else if (cat === 'knowledge_asset') params.asset_id = node.itemId
        else if (cat === 'platform') params.platform_id = node.itemId
        else if (cat === 'mission') params.mission_id = node.itemId
        else if (cat === 'own_research') params.research_id = node.itemId
        else if (cat === 'source_material') params.source_document_id = node.itemId
        else if (cat === 'idea') params.idea_id = node.itemId
      }
    }
    return params
  }

  const fetchNextStep = async (
    stepIndex: number,
    selections: TopicNode[],
  ): Promise<TopicNode[]> => {
    const last = selections[stepIndex - 1]
    if (!last) return []
    // Use the topicPath.id (structural parent) as the parent id for the next step
    const parentId = last.topicPath?.id ?? last.key
    return listTopicChildrenAction(parentId, buildParams(selections))
  }

  const isFreeTextCategory = (node: TopicNode): boolean =>
    FREE_TEXT_CATEGORY_LABELS.some((l) => node.label.toLowerCase() === l.toLowerCase()) ||
    node.topicPath?.category === 'free_text'

  const commitSelection = async (stepIndex: number, node: TopicNode) => {
    // Clear all selections at and below this step, then push the new one
    let newSelections = [...value.selections.slice(0, stepIndex), node]

    // Free-text branch at step 1 — skip rest of cascade
    if (stepIndex === 0 && isFreeTextCategory(node)) {
      onChange({
        ...value,
        selections: newSelections,
        freeTextOnly: value.freeTextOnly ?? '',
        resolved: null,
      })
      setStepOptions([stepOptions[0]])
      return
    }

    // If this is a leaf, resolve immediately
    if (node.isLeaf) {
      const leafPath = node.topicPath?.path ?? node.key
      const params = buildParams(newSelections)
      const selectedItems = node.itemId ? [node] : []
      try {
        const chain = await resolveTopicChainAction(leafPath, params, selectedItems)
        onChange({ ...value, selections: newSelections, freeTextOnly: undefined, resolved: chain })
        setStepOptions(stepOptions.slice(0, stepIndex + 1))
      } catch (err) {
        // Resolution failed — surface the error so the cascade isn't silently broken.
        const message = err instanceof Error ? err.message : 'Failed to resolve topic chain'
        onChange({ ...value, selections: newSelections, freeTextOnly: undefined, resolved: null })
        setStepOptions(stepOptions.slice(0, stepIndex + 1))
        console.error('Topic chain resolution failed:', err)
        // Re-throw so callers (handleStepChange) can surface to the user if needed
        throw new Error(message)
      }
      return
    }

    // Otherwise fetch next step's options
    onChange({ ...value, selections: newSelections, freeTextOnly: undefined, resolved: null })
    setLoadingStep(stepIndex + 1)
    let next = await fetchNextStep(stepIndex + 1, newSelections)
    let nextStepIndex = stepIndex + 1
    let nextOptions = [...stepOptions.slice(0, stepIndex + 1), next]

    // Auto-skip: when the just-committed node is a step-1 category whose entity
    // matches a filled strategy field, find the matching entity in the next step
    // and auto-commit it. Saves the user from picking the same audience/offer/etc twice.
    if (stepIndex === 0 && strategy) {
      const category = node.topicPath?.category
      const strategyField = category ? CATEGORY_TO_STRATEGY_FIELD[category] : null
      const strategyValue = strategyField ? strategy[strategyField] : null
      if (strategyValue && next.length > 0) {
        const matchingEntity = next.find((n) => n.itemId === strategyValue)
        if (matchingEntity) {
          newSelections = [...newSelections, matchingEntity]
          // Fetch the step AFTER the auto-picked entity
          const afterEntity = await fetchNextStep(nextStepIndex + 1, newSelections)
          nextOptions = [...nextOptions, afterEntity]
          nextStepIndex = nextStepIndex + 1
          onChange({ ...value, selections: newSelections, freeTextOnly: undefined, resolved: null })
        }
      }
    }

    setStepOptions(nextOptions)
    setLoadingStep(null)
  }

  const handleStepChange = (stepIndex: number, keys: string[]) => {
    const node = stepOptions[stepIndex]?.find((n) => n.key === keys[0])
    if (!node) {
      // Cleared selection
      onChange({ ...value, selections: value.selections.slice(0, stepIndex), resolved: null })
      setStepOptions(stepOptions.slice(0, stepIndex + 1))
      return
    }

    // If user is changing an upper step AND a leaf-augment exists below, confirm
    const hasAugmentBelow =
      stepIndex < value.selections.length - 1 && value.freeTextAugment.length > 0
    if (hasAugmentBelow) {
      setConfirmState({ open: true, stepIndex, nextNode: node })
      return
    }
    void commitSelection(stepIndex, node)
  }

  const handleConfirmClear = async () => {
    if (!confirmState.nextNode) return
    const { stepIndex, nextNode } = confirmState
    setConfirmState({ open: false, stepIndex: 0, nextNode: null })
    onChange({ ...value, freeTextAugment: '', resolved: null })
    setAugmentVisible(false)
    await commitSelection(stepIndex, nextNode)
  }

  const handleConfirmCancel = () => {
    setConfirmState({ open: false, stepIndex: 0, nextNode: null })
  }

  // Multi-select handler at the leaf step (when allow_multi_select is true)
  const handleLeafMultiSelect = async (keys: string[]) => {
    const stepIndex = stepOptions.length - 1
    const stepOpts = stepOptions[stepIndex]
    if (!stepOpts) return

    const selectedNodes = keys
      .map((k) => stepOpts.find((n) => n.key === k))
      .filter((n): n is TopicNode => n !== undefined)

    if (selectedNodes.length === 0) {
      onChange({ ...value, selections: value.selections.slice(0, stepIndex), resolved: null })
      return
    }

    // Pick the first as the leaf for resolveChain; pass all selected as items
    const leafNode = selectedNodes[0]
    const leafPath = leafNode.topicPath?.path ?? leafNode.key
    const params = buildParams([...value.selections.slice(0, stepIndex)])

    try {
      const chain = await resolveTopicChainAction(leafPath, params, selectedNodes)
      onChange({
        ...value,
        selections: [...value.selections.slice(0, stepIndex), ...selectedNodes],
        freeTextOnly: undefined,
        resolved: chain,
      })
    } catch (err) {
      console.error('Topic chain (multi) resolution failed:', err)
    }
  }

  // Render
  const isFreeTextOnly = value.selections[0] && isFreeTextCategory(value.selections[0])

  const setFreeTextOnly = (text: string) => {
    onChange({ ...value, freeTextOnly: text, resolved: null })
    if (text.trim().length > 0) {
      // Resolve free-text path as a TopicChain
      startTransition(async () => {
        try {
          const chain = await resolveTopicFreeTextAction(text)
          onChange({ ...value, freeTextOnly: text, resolved: chain })
        } catch (err) {
          console.error('Free-text resolution failed:', err)
        }
      })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {stepOptions.map((options, stepIndex) => {
        const stepLabel =
          stepIndex === 0
            ? 'What do you want to talk about?'
            : stepIndex === 1
              ? 'Choose the sub-category'
              : stepIndex === 2
                ? 'Pick the item'
                : 'Final selection'

        const selected = value.selections[stepIndex]
        const selectedKeys = selected ? [selected.key] : []

        // Determine if this is a multi-select leaf step
        const allowMulti =
          stepIndex === stepOptions.length - 1 &&
          options.length > 0 &&
          (options[0]?.topicPath?.multiSelect ?? false)

        // For multi-select leaves, the selectedKeys come from
        // value.selections[stepIndex..end] (all selected nodes at the leaf)
        const multiSelectedKeys = allowMulti
          ? value.selections.slice(stepIndex).filter((n) => n).map((n) => n.key)
          : []

        const stepOptionsForChild: TopicCascadeStepOption[] = options.map((node) => ({
          key: node.key,
          label: node.label,
          isLocked: node.hasData === false,
        }))

        return (
          <TopicCascadeStep
            key={stepIndex}
            label={stepLabel}
            required={true}
            allowMultiSelect={allowMulti}
            options={stepOptionsForChild}
            selectedKeys={allowMulti ? multiSelectedKeys : selectedKeys}
            onChange={(keys) =>
              allowMulti ? handleLeafMultiSelect(keys) : handleStepChange(stepIndex, keys)
            }
            loading={loadingStep === stepIndex}
          />
        )
      })}

      {/* Free-text only branch */}
      {isFreeTextOnly && (
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            What do you want to write about? <span className="ml-0.5 text-destructive">*</span>
          </label>
          <Textarea
            value={value.freeTextOnly ?? ''}
            onChange={(e) => setFreeTextOnly(e.target.value)}
            placeholder="Describe the topic in your own words…"
            rows={4}
          />
        </div>
      )}

      {/* Leaf-augment "+ Add a note" — only when cascade resolved (not free-text-only) */}
      {!isFreeTextOnly && value.resolved && (
        <div className="flex flex-col gap-1.5">
          {augmentVisible ? (
            <>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-muted-foreground">
                  Optional context for this generation
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setAugmentVisible(false)
                    onChange({ ...value, freeTextAugment: '' })
                  }}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Minus className="h-3 w-3" /> Remove note
                </button>
              </div>
              <Textarea
                value={value.freeTextAugment}
                onChange={(e) => onChange({ ...value, freeTextAugment: e.target.value })}
                placeholder="Add any extra angle, constraint, or detail…"
                rows={3}
              />
            </>
          ) : (
            <button
              type="button"
              onClick={() => setAugmentVisible(true)}
              className="inline-flex items-center gap-1 self-start text-xs font-medium text-primary hover:underline"
            >
              <Plus className="h-3 w-3" /> Add a note for this selection
            </button>
          )}
        </div>
      )}

      {/* Topic-clear confirm */}
      <Modal
        open={confirmState.open}
        onOpenChange={(open) => {
          if (!open) handleConfirmCancel()
        }}
        title="Change this step?"
        size="sm"
        footer={
          <>
            <ActionButton variant="outline" onClick={handleConfirmCancel}>
              Keep current
            </ActionButton>
            <ActionButton onClick={handleConfirmClear}>Change &amp; clear</ActionButton>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          You&apos;ve added a note for the current selection. Changing this step will clear both
          your selection below it and the note you wrote.
        </p>
      </Modal>
    </div>
  )
}
