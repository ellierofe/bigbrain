'use client'

import { useState, useTransition } from 'react'
import { Plus, Trash2, ChevronDown } from 'lucide-react'
import { ActionButton } from '@/components/action-button'
import { ActionMenu } from '@/components/action-menu'
import { InPageNav } from '@/components/in-page-nav'
import { SectionDivider } from '@/components/section-divider'
import { InlineCellSelect } from '@/components/inline-cell-select'
import {
  addEntityOutcome,
  updateEntityOutcome,
  deleteEntityOutcome,
} from '@/app/actions/entity-outcomes'
import type { EntityOutcomeRow, EntityOutcomeKind } from '@/lib/db/queries/entity-outcomes'

const OUTCOME_KINDS: { value: EntityOutcomeKind; label: string }[] = [
  { value: 'outcome', label: 'Outcomes' },
  { value: 'benefit', label: 'Benefits' },
  { value: 'advantage', label: 'Advantages' },
  { value: 'feature', label: 'Features' },
  { value: 'bonus', label: 'Bonuses' },
  { value: 'faq', label: 'FAQs' },
]

const CATEGORIES = ['resources', 'skills', 'mindset', 'relationships', 'status']
const FAQ_TYPES = ['logistics', 'differentiation', 'psychological', 'pricing', 'timeline']

interface EntityOutcomesPanelProps {
  outcomes: EntityOutcomeRow[]
  parentType: 'knowledgeAsset' | 'offer'
  parentId: string
  brandId: string
}

export function EntityOutcomesPanel({
  outcomes: initialOutcomes,
  parentType,
  parentId,
  brandId,
}: EntityOutcomesPanelProps) {
  const [outcomes, setOutcomes] = useState(initialOutcomes)
  const [, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addingKind, setAddingKind] = useState<EntityOutcomeKind | null>(null)
  const [activeSection, setActiveSection] = useState<EntityOutcomeKind>('outcome')

  function outcomesByKind(kind: EntityOutcomeKind) {
    return outcomes.filter(o => o.kind === kind)
  }

  async function handleAdd(kind: EntityOutcomeKind) {
    setAddingKind(kind)

    const parentKey = parentType === 'knowledgeAsset' ? 'knowledgeAssetId' : 'offerId'
    const result = await addEntityOutcome({
      [parentKey]: parentId,
      kind,
      body: '',
    })

    if (result.ok) {
      const newOutcome: EntityOutcomeRow = {
        id: result.data.id,
        brandId,
        offerId: parentType === 'offer' ? parentId : null,
        knowledgeAssetId: parentType === 'knowledgeAsset' ? parentId : null,
        kind,
        body: '',
        question: null,
        faqType: null,
        objectionAddressed: null,
        valueStatement: null,
        category: null,
        sortOrder: outcomesByKind(kind).length + 1,
        createdAt: new Date(),
      }
      setOutcomes(prev => [...prev, newOutcome])
      setEditingId(result.data.id)
    }
    setAddingKind(null)
  }

  async function handleUpdate(id: string, data: Partial<Pick<EntityOutcomeRow, 'body' | 'question' | 'faqType' | 'objectionAddressed' | 'valueStatement' | 'category' | 'sortOrder'>>) {
    setOutcomes(prev =>
      prev.map(o => (o.id === id ? { ...o, ...data } : o))
    )
    startTransition(async () => {
      await updateEntityOutcome(id, data as Parameters<typeof updateEntityOutcome>[1])
    })
  }

  async function handleDelete(id: string) {
    setOutcomes(prev => prev.filter(o => o.id !== id))
    startTransition(async () => {
      await deleteEntityOutcome(id)
    })
  }

  function handleSectionSelect(id: string) {
    setActiveSection(id as EntityOutcomeKind)
    const el = document.getElementById(`value-gen-${id}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function renderKindSection(kind: EntityOutcomeKind, label: string) {
    const items = outcomesByKind(kind)
    const showCategory = kind === 'outcome' || kind === 'benefit'
    const isFaq = kind === 'faq'
    const isBonus = kind === 'bonus'

    return (
      <section id={`value-gen-${kind}`} className="flex flex-col gap-2">
        <div className="mb-1 flex items-center gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {label}
          </h3>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {items.length}
          </span>
        </div>

        {items.map(item => (
          <div
            key={item.id}
            className="group flex items-start gap-2 rounded-md border border-border/60 p-3"
          >
            <div className="flex-1 flex flex-col gap-1.5">
              {isFaq && (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.question ?? ''}
                    onChange={e =>
                      setOutcomes(prev =>
                        prev.map(o => (o.id === item.id ? { ...o, question: e.target.value } : o))
                      )
                    }
                    onBlur={() => handleUpdate(item.id, { question: item.question ?? '' })}
                    placeholder="Question..."
                    className="flex-1 text-sm font-medium bg-transparent border-none p-0 focus:outline-none"
                  />
                  <InlineCellSelect
                    value={item.faqType ?? ''}
                    options={[{ value: '', label: 'type' }, ...FAQ_TYPES.map(t => ({ value: t, label: t }))]}
                    onSave={(v) => {
                      handleUpdate(item.id, { faqType: v })
                      return Promise.resolve({ ok: true })
                    }}
                  />
                </div>
              )}

              <textarea
                value={item.body}
                onChange={e =>
                  setOutcomes(prev =>
                    prev.map(o => (o.id === item.id ? { ...o, body: e.target.value } : o))
                  )
                }
                onBlur={() => handleUpdate(item.id, { body: item.body })}
                placeholder={isFaq ? 'Answer...' : `${label.slice(0, -1)} description...`}
                rows={2}
                className="w-full resize-none bg-transparent text-sm border-none p-0 focus:outline-none"
              />

              {isBonus && (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={item.objectionAddressed ?? ''}
                    onChange={e =>
                      setOutcomes(prev =>
                        prev.map(o =>
                          o.id === item.id ? { ...o, objectionAddressed: e.target.value } : o
                        )
                      )
                    }
                    onBlur={() =>
                      handleUpdate(item.id, { objectionAddressed: item.objectionAddressed ?? '' })
                    }
                    placeholder="Objection addressed..."
                    className="flex-1 text-xs bg-transparent border-b border-border/40 pb-0.5 focus:outline-none focus:border-[var(--field-active)]"
                  />
                  <input
                    type="text"
                    value={item.valueStatement ?? ''}
                    onChange={e =>
                      setOutcomes(prev =>
                        prev.map(o =>
                          o.id === item.id ? { ...o, valueStatement: e.target.value } : o
                        )
                      )
                    }
                    onBlur={() =>
                      handleUpdate(item.id, { valueStatement: item.valueStatement ?? '' })
                    }
                    placeholder="Value statement..."
                    className="flex-1 text-xs bg-transparent border-b border-border/40 pb-0.5 focus:outline-none focus:border-[var(--field-active)]"
                  />
                </div>
              )}

              {showCategory && (
                <InlineCellSelect
                  className="self-start"
                  value={item.category ?? ''}
                  options={[{ value: '', label: 'category' }, ...CATEGORIES.map(c => ({ value: c, label: c }))]}
                  onSave={(v) => {
                    handleUpdate(item.id, { category: v || undefined })
                    return Promise.resolve({ ok: true })
                  }}
                />
              )}
            </div>

            <button
              type="button"
              onClick={() => handleDelete(item.id)}
              className="opacity-0 group-hover:opacity-100 transition-opacity rounded p-1 hover:bg-destructive/10"
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </button>
          </div>
        ))}
      </section>
    )
  }

  const navItems = OUTCOME_KINDS.map(kind => ({
    id: kind.value,
    label: `${kind.label} (${outcomesByKind(kind.value).length})`,
  }))

  return (
    <div className="flex gap-6">
      <InPageNav
        items={navItems}
        activeId={activeSection}
        onSelect={handleSectionSelect}
      />
      <div className="flex-1 min-w-0 flex flex-col gap-8">
        <div className="self-end">
          <ActionMenu
            trigger={
              <ActionButton variant="outline" disabled={!!addingKind}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add
                <ChevronDown className="ml-1 h-3 w-3" />
              </ActionButton>
            }
            minWidth="140px"
            items={OUTCOME_KINDS.map((kind) => ({
              type: 'action' as const,
              label: kind.label.slice(0, -1),
              onClick: () => handleAdd(kind.value),
            }))}
          />
        </div>

        {OUTCOME_KINDS.map((kind, idx) => (
          <div key={kind.value} className="flex flex-col gap-6">
            {idx > 0 && <SectionDivider />}
            {renderKindSection(kind.value, kind.label)}
          </div>
        ))}
      </div>
    </div>
  )
}
