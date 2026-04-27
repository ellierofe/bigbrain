'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Eye, Rocket, Heart, Sparkles, NotebookPen,
  Plus, Trash2,
} from 'lucide-react'
import { ActionButton } from '@/components/action-button'
import { IconButton } from '@/components/icon-button'
import { PageHeader } from '@/components/page-header'
import { ContentPane } from '@/components/content-pane'
import { InlineField } from '@/components/inline-field'
import { ListRowField } from '@/components/list-row-field'
import {
  saveBrandMeaningField,
  saveBrandMeaningValues,
} from '@/app/actions/dna-singular'
import type { DnaBrandMeaning } from '@/lib/db/schema/dna/brand-meaning'

interface BrandMeaningViewProps {
  data: DnaBrandMeaning
}

interface BrandValue {
  name: string
  description: string
  behaviours: string[]
}

export function BrandMeaningView({ data }: BrandMeaningViewProps) {
  const initialValues = (data.values ?? []) as BrandValue[]
  const [values, setValues] = useState<BrandValue[]>(initialValues)

  function makeFieldSaver(field: string) {
    return async (value: string) => {
      const result = await saveBrandMeaningField(field, value || null)
      return result
    }
  }

  async function persistValues(updated: BrandValue[]) {
    setValues(updated)
    const result = await saveBrandMeaningValues(updated)
    if (!result.ok) {
      toast.error(result.error)
    }
    return result
  }

  function addValue() {
    if (values.length >= 6) {
      toast.error('Maximum 6 values — prioritise rather than adding more.')
      return
    }
    persistValues([...values, { name: '', description: '', behaviours: [] }])
  }

  function removeValue(index: number) {
    persistValues(values.filter((_, i) => i !== index))
  }

  function updateValueField(index: number, field: keyof BrandValue, val: string) {
    const updated = values.map((v, i) => {
      if (i !== index) return v
      if (field === 'behaviours') {
        return { ...v, behaviours: val.split('\n').filter(Boolean) }
      }
      return { ...v, [field]: val }
    })
    return persistValues(updated)
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Brand Meaning"
        subtitle="Vision, mission, purpose, and values — why the business exists."
      />

      <ContentPane>
        <div className="max-w-3xl mx-auto flex flex-col gap-10">
          {/* Vision */}
          <StatementBlock
            icon={Eye}
            title="Vision"
            description="The future state being worked toward. Long-horizon, aspirational."
            statement={data.vision}
            statementPlaceholder="Where are you going? What does the world look like if you succeed?"
            onSaveStatement={makeFieldSaver('vision')}
            notes={data.visionNotes}
            notesPlaceholder="Context, caveats, or working notes on the vision."
            onSaveNotes={makeFieldSaver('visionNotes')}
          />

          {/* Mission */}
          <StatementBlock
            icon={Rocket}
            title="Mission"
            description="What the business does to move toward the vision. Action-oriented."
            statement={data.mission}
            statementPlaceholder="What do you do, concretely, to make the vision real?"
            onSaveStatement={makeFieldSaver('mission')}
            notes={data.missionNotes}
            notesPlaceholder="Working notes on the mission."
            onSaveNotes={makeFieldSaver('missionNotes')}
          />

          {/* Purpose */}
          <StatementBlock
            icon={Heart}
            title="Purpose"
            description="Why it matters beyond commercial return. The deeper 'because'."
            statement={data.purpose}
            statementPlaceholder="Why does this work matter? What would be lost if you stopped?"
            onSaveStatement={makeFieldSaver('purpose')}
            notes={data.purposeNotes}
            notesPlaceholder="Working notes on the purpose."
            onSaveNotes={makeFieldSaver('purposeNotes')}
          />

          {/* Values */}
          <section>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-lg font-display font-semibold">Values</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Up to 6 core values. Actions, not adjectives — what you do, not what you claim to be.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              {values.map((val, i) => (
                <ValueCard
                  key={i}
                  index={i}
                  value={val}
                  onUpdate={(field, v) => updateValueField(i, field, v)}
                  onRemove={() => removeValue(i)}
                />
              ))}

              {values.length < 6 && (
                <ActionButton
                  icon={Plus}
                  variant="outline"
                  onClick={addValue}
                  className="self-start"
                >
                  Add value
                </ActionButton>
              )}

              {values.length === 0 && (
                <p className="text-sm text-muted-foreground/60 text-center py-6">
                  No values defined yet. Add your first to start building your brand foundation.
                </p>
              )}
            </div>
          </section>
        </div>
      </ContentPane>
    </div>
  )
}

/** Featured statement block — pull-quote style with accent border */
function StatementBlock({
  icon: Icon,
  title,
  description,
  statement,
  statementPlaceholder,
  onSaveStatement,
  notes,
  notesPlaceholder,
  onSaveNotes,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  statement: string | null
  statementPlaceholder: string
  onSaveStatement: (value: string) => Promise<{ ok: boolean; error?: string }>
  notes: string | null
  notesPlaceholder: string
  onSaveNotes: (value: string) => Promise<{ ok: boolean; error?: string }>
}) {
  return (
    <section className="rounded-lg border bg-card p-6 border-l-[3px] border-l-primary">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-lg font-display font-semibold">{title}</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-4">{description}</p>

      {/* The statement — larger, display type */}
      <InlineField
        variant="textarea"
        label=""
        value={statement}
        placeholder={statementPlaceholder}
        rows={3}
        className="text-base font-display leading-relaxed"
        onSave={onSaveStatement}
      />

      {/* Notes — secondary, muted treatment */}
      <div className="mt-4 pt-4 border-t border-border/40">
        <InlineField
          variant="textarea"
          label="Working notes"
          icon={NotebookPen}
          value={notes}
          placeholder={notesPlaceholder}
          rows={2}
          onSave={onSaveNotes}
        />
      </div>
    </section>
  )
}

function ValueCard({
  index,
  value,
  onUpdate,
  onRemove,
}: {
  index: number
  value: BrandValue
  onUpdate: (field: keyof BrandValue, value: string) => Promise<{ ok: boolean; error?: string }>
  onRemove: () => void
}) {
  return (
    <div className="rounded-lg border bg-card p-6 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <ListRowField
            variant="input"
            value={value.name}
            onSave={(v) => onUpdate('name', v)}
            placeholder={`Value ${index + 1}`}
            aria-label={`Value ${index + 1} name`}
            className="font-display font-semibold text-base"
          />
        </div>
        <IconButton
          icon={Trash2}
          label="Remove value"
          variant="ghost"
          onClick={onRemove}
          className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
        />
      </div>

      <ListRowField
        variant="textarea"
        value={value.description}
        onSave={(v) => onUpdate('description', v)}
        placeholder="What this value means in practice — not a dictionary definition."
        rows={2}
        aria-label={`Value ${index + 1} description`}
      />

      <div className="border-t border-border/40 pt-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Behaviours
        </span>
        <ListRowField
          variant="textarea"
          value={value.behaviours.join('\n')}
          onSave={(v) => onUpdate('behaviours', v)}
          placeholder="One per line — specific commitments that manifest this value."
          rows={3}
          aria-label={`Value ${index + 1} behaviours`}
          className="mt-1"
        />
      </div>
    </div>
  )
}
