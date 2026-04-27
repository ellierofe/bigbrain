'use client'

import { useState, useTransition, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Lightbulb, History, Target, CircleHelp, MapPin, GraduationCap, Wrench,
  Presentation, Clock, RefreshCw, Award, Layers, Eye, Compass,
  FileType, LinkIcon, FileOutput, Users, Lock, LockOpen, Network, LayoutGrid, Plus, Archive, Sparkles, Loader2,
} from 'lucide-react'
import { PageChrome } from '@/components/page-chrome'
import { ContentPane } from '@/components/content-pane'
import { TabbedPane } from '@/components/tabbed-pane'
import { InlineField } from '@/components/inline-field'
import { SelectField } from '@/components/select-field'
import { InlineCellSelect } from '@/components/inline-cell-select'
import { InPageNav } from '@/components/in-page-nav'
import { StatusBadge } from '@/components/status-badge'
import { ItemSwitcher } from '@/components/item-switcher'
import { OrderedCardList, type CardField } from '@/components/ordered-card-list'
import { VocMapping } from '@/components/voc-mapping'
import { EntityOutcomesPanel } from '@/components/entity-outcomes-panel'
import { SourceMaterialsTable } from '@/components/source-materials-table'
import { CreateAssetModal } from '@/components/create-asset-modal'
import { ArchiveAssetModal } from '@/components/archive-asset-modal'
import { SectionDivider } from '@/components/section-divider'
import { ActionButton } from '@/components/action-button'
import { IconButton } from '@/components/icon-button'
import { saveAssetField, saveAssetJsonField, markAssetActive, linkAssetToGraph } from '@/app/actions/knowledge-assets'
import { toast } from 'sonner'
import type { KnowledgeAsset, KnowledgeAssetSummary, AssetKind, KeyComponent, FlowStep, AssetFaq, VocMapping as VocMappingType, MethodologyDetail, ToolDetail } from '@/lib/types/knowledge-assets'
import type { EntityOutcomeRow } from '@/lib/db/queries/entity-outcomes'

const BRAND_ID = 'ea444c72-d332-4765-afd5-8dda97f5cf6f'

interface AudienceSegmentForVoc {
  id: string
  segmentName: string
  status: string
  problems: unknown[]
  desires: unknown[]
  objections: unknown[]
  sharedBeliefs: unknown[]
}

interface KnowledgeAssetDetailViewProps {
  asset: KnowledgeAsset
  allAssets: KnowledgeAssetSummary[]
  activeCount: number
  defaultTab?: string
  audienceSegment: AudienceSegmentForVoc | null
  outcomes: EntityOutcomeRow[]
  allSegments: AudienceSegmentForVoc[]
}

const COMPONENT_FIELDS: CardField[] = [
  { key: 'title', label: 'Title', type: 'text', placeholder: 'Component name' },
  { key: 'description', label: 'Description', type: 'textarea', placeholder: 'Substantive description — 2-4 sentences', rows: 4 },
]

const FLOW_FIELDS: CardField[] = [
  { key: 'title', label: 'Title', type: 'text', placeholder: 'Step title' },
  { key: 'description', label: 'Description', type: 'textarea', placeholder: 'What happens in this step', rows: 3 },
  { key: 'clientExperience', label: 'Client Experience', type: 'textarea', placeholder: 'How the client/user experiences this', rows: 2 },
  { key: 'decisionPoints', label: 'Decision Points', type: 'textarea', placeholder: 'Any branching decisions or variations', rows: 2 },
]

export function KnowledgeAssetDetailView({
  asset,
  allAssets,
  activeCount,
  defaultTab,
  audienceSegment,
  outcomes,
  allSegments,
}: KnowledgeAssetDetailViewProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [createOpen, setCreateOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('foundations')
  const [generating, setGenerating] = useState(false)

  // Autosave helpers
  const makeFieldSaver = useCallback(
    (field: string) => async (value: string) => {
      return saveAssetField(asset.id, field, value)
    },
    [asset.id]
  )

  const makeJsonSaver = useCallback(
    (field: string) => async (value: unknown) => {
      return saveAssetJsonField(asset.id, field, value)
    },
    [asset.id]
  )

  async function handleStatusChange(status: string) {
    return saveAssetJsonField(asset.id, 'status', status)
  }

  async function handleKindChange(newKind: string): Promise<{ ok: boolean; error?: string }> {
    if (newKind === asset.kind) return { ok: true }

    if (asset.kind === 'methodology' && asset.graphNodeId) {
      if (!confirm('Changing kind from methodology will hide the graph link. Continue?')) {
        return { ok: false, error: 'Cancelled' }
      }
    }

    const result = await saveAssetJsonField(asset.id, 'kind', newKind as AssetKind)
    if (result?.ok !== false) router.refresh()
    return { ok: result?.ok !== false, error: result?.ok === false ? result.error : undefined }
  }

  async function handleProprietaryToggle() {
    await saveAssetJsonField(asset.id, 'proprietary', !asset.proprietary)
    router.refresh()
  }

  async function handleGraphLink() {
    const result = await linkAssetToGraph(asset.id)
    if (result.ok) {
      toast.success('Linked to knowledge graph')
      router.refresh()
    } else {
      toast.error(result.error)
    }
  }

  async function handleGenerate() {
    if (!audienceSegment) {
      toast.error('Select a primary audience before generating')
      return
    }

    setGenerating(true)
    try {
      const res = await fetch('/api/generate/knowledge-asset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          assetId: asset.id,
          name: asset.name,
          kind: asset.kind,
          proprietary: asset.proprietary,
          audienceSegmentId: audienceSegment.id,
          vocMapping: asset.vocMapping ?? { problems: [], desires: [], objections: [], beliefs: [] },
          sourceDocumentIds: asset.sourceDocumentIds ?? [],
        }),
      })

      if (!res.ok) throw new Error('Generation failed')

      const result = await res.json()
      if (result.success) {
        toast.success('Content generated successfully')
        router.refresh()
      } else {
        throw new Error(result.error || 'Generation failed')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  async function handleVocToggle(mapping: VocMappingType) {
    return saveAssetJsonField(asset.id, 'vocMapping', mapping)
  }

  async function handleSourceLink(ids: string[]) {
    return saveAssetJsonField(asset.id, 'sourceDocumentIds', ids)
  }

  async function handleSourceUnlink(unlinkId: string) {
    const updated = (asset.sourceDocumentIds ?? []).filter(id => id !== unlinkId)
    return saveAssetJsonField(asset.id, 'sourceDocumentIds', updated)
  }

  // Detail fields depend on kind
  const detail = (asset.detail ?? {}) as Record<string, unknown>
  async function saveDetailField(key: string, value: unknown) {
    const updated = { ...detail, [key]: value }
    return saveAssetJsonField(asset.id, 'detail', updated)
  }

  // Overview sections for InPageNav
  const overviewSections = [
    { id: 'foundations', label: 'Foundations' },
    { id: 'purpose', label: 'Purpose' },
    ...(asset.kind !== 'tool' ? [{ id: 'requirements', label: 'Requirements' }] : []),
    { id: 'details', label: 'Details' },
  ]

  const isDraft = asset.status === 'draft'
  const canArchive = activeCount > 1 || asset.status !== 'active'

  // Header actions
  const headerAction = (
    <div className="flex items-center gap-2">
      <StatusBadge status={asset.status} onChange={handleStatusChange} />
      <IconButton icon={LayoutGrid} label="Cards view" href="/dna/knowledge-assets/cards" />
      <ActionButton icon={Plus} variant="outline" onClick={() => setCreateOpen(true)}>
        New asset
      </ActionButton>
      {isDraft ? (
        <>
          <ActionButton
            icon={Sparkles}
            onClick={handleGenerate}
            disabled={!audienceSegment}
            loading={generating}
            tooltip={!audienceSegment ? 'Select a primary audience first' : undefined}
          >
            {generating ? 'Generating...' : 'Generate'}
          </ActionButton>
          <ActionButton
            variant="outline"
            onClick={() => startTransition(() => markAssetActive(asset.id).then(() => router.refresh()))}
            disabled={isPending}
          >
            Mark as active
          </ActionButton>
        </>
      ) : (
        <ActionButton
          icon={Archive}
          variant="outline"
          onClick={() => setArchiveOpen(true)}
          disabled={!canArchive}
          tooltip={!canArchive ? 'Cannot archive the last active knowledge asset' : undefined}
        >
          Archive
        </ActionButton>
      )}
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      <PageChrome
        title="Knowledge Assets"
        subtitle="Methodologies, frameworks, processes, tools, and templates."
        action={headerAction}
        subheader={
          <ItemSwitcher
            items={allAssets.filter((a) => a.status !== 'archived')}
            currentId={asset.id}
            label="Asset"
            getHref={(a) => `/dna/knowledge-assets/${a.id}`}
            getLabel={(a) => a.name}
            getFlag={(a) => (a.status === 'draft' ? 'Draft' : null)}
          />
        }
      />

      <ContentPane padding={false} className="flex flex-col">
        <div className="flex flex-1">
          {/* LEFT PANEL */}
          <aside className="w-64 shrink-0 overflow-y-auto border-r border-border/40 bg-muted/30 px-6 py-6 flex flex-col gap-4">
            {/* Avatar placeholder */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
              <span className="text-2xl font-display font-bold text-muted-foreground">
                {asset.name.charAt(0).toUpperCase()}
              </span>
            </div>

            {/* Name */}
            <InlineField
              variant="input"
              value={asset.name}
              onSave={makeFieldSaver('name')}
              label="Name"
              icon={Users}
              labelBg="bg-background"
            />

            <SelectField
              label="Kind"
              labelBg="bg-muted/30"
              value={asset.kind}
              options={[
                { value: 'methodology', label: 'Methodology' },
                { value: 'framework', label: 'Framework' },
                { value: 'process', label: 'Process' },
                { value: 'tool', label: 'Tool' },
                { value: 'template', label: 'Template' },
              ]}
              onSave={handleKindChange}
            />

            {/* Proprietary */}
            <button
              type="button"
              onClick={handleProprietaryToggle}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors self-start"
            >
              {asset.proprietary ? (
                <><Lock className="h-3.5 w-3.5" /> Proprietary IP</>
              ) : (
                <><LockOpen className="h-3.5 w-3.5" /> Not proprietary</>
              )}
            </button>

            {/* Summary */}
            <InlineField
              variant="textarea"
              value={asset.summary}
              onSave={makeFieldSaver('summary')}
              label="Summary"
              icon={Target}
              labelBg="bg-background"
              rows={4}
            />

            {/* Primary audience */}
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Primary Audience
              </label>
              {audienceSegment ? (
                <Link
                  href={`/dna/audience-segments/${audienceSegment.id}`}
                  className="text-sm text-foreground hover:underline"
                >
                  {audienceSegment.segmentName}
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground italic">None selected</span>
              )}
            </div>

            {/* Graph link — deferred to future build */}
          </aside>

          {/* RIGHT PANEL */}
          <div className="flex-1 px-6 py-6 overflow-y-auto">
            <TabbedPane
              defaultTab={defaultTab ?? 'overview'}
              tabs={[
                {
                  id: 'overview',
                  label: 'Overview',
                  content: (
                    <div className="flex gap-6">
                      {/* Mini-nav */}
                      <InPageNav
                        items={overviewSections}
                        activeId={activeSection}
                        onSelect={setActiveSection}
                      />

                      {/* Sections */}
                      <div className="flex-1 flex flex-col gap-6">
                        <div id="overview-foundations" className="flex flex-col gap-3">
                          <h3 className="text-sm font-display font-semibold">Foundations</h3>
                          <InlineField variant="textarea" value={asset.principles} onSave={makeFieldSaver('principles')} label="Principles" icon={Lightbulb} rows={4} />
                          <InlineField variant="textarea" value={asset.origin} onSave={makeFieldSaver('origin')} label="Origin" icon={History} rows={4} />
                        </div>

                        <div id="overview-purpose" className="flex flex-col gap-3">
                          <h3 className="text-sm font-display font-semibold">Purpose</h3>
                          <InlineField variant="textarea" value={asset.objectives} onSave={makeFieldSaver('objectives')} label="Objectives" icon={Target} rows={3} />
                          <InlineField variant="textarea" value={asset.problemsSolved} onSave={makeFieldSaver('problemsSolved')} label="Problems Solved" icon={CircleHelp} rows={3} />
                          <InlineField variant="textarea" value={asset.contexts} onSave={makeFieldSaver('contexts')} label="Contexts" icon={MapPin} rows={3} />
                        </div>

                        {asset.kind !== 'tool' && (
                          <div id="overview-requirements" className="flex flex-col gap-3">
                            <h3 className="text-sm font-display font-semibold">Requirements</h3>
                            <InlineField variant="textarea" value={asset.priorKnowledge} onSave={makeFieldSaver('priorKnowledge')} label="Prior Knowledge" icon={GraduationCap} rows={3} />
                            <InlineField variant="textarea" value={asset.resources} onSave={makeFieldSaver('resources')} label="Resources" icon={Wrench} rows={3} />
                          </div>
                        )}

                        <div id="overview-details" className="flex flex-col gap-3">
                          <h3 className="text-sm font-display font-semibold">Details</h3>
                          {(asset.kind === 'methodology' || asset.kind === 'process') && (
                            <>
                              <InlineField variant="input" value={(detail.deliveryFormat as string) ?? null} onSave={v => saveDetailField('deliveryFormat', v)} label="Delivery Format" icon={Presentation} />
                              <InlineField variant="input" value={(detail.duration as string) ?? null} onSave={v => saveDetailField('duration', v)} label="Duration" icon={Clock} />
                              <InlineField variant="input" value={(detail.repeatability as string) ?? null} onSave={v => saveDetailField('repeatability', v)} label="Repeatability" icon={RefreshCw} />
                            </>
                          )}
                          {asset.kind === 'framework' && (
                            <>
                              <InlineField variant="input" value={(detail.visualMetaphor as string) ?? null} onSave={v => saveDetailField('visualMetaphor', v)} label="Visual Metaphor" icon={Eye} />
                              <InlineField variant="textarea" value={(detail.applicationContext as string) ?? null} onSave={v => saveDetailField('applicationContext', v)} label="Application Context" icon={Compass} rows={3} />
                            </>
                          )}
                          {(asset.kind === 'tool' || asset.kind === 'template') && (
                            <>
                              <InlineField variant="input" value={(detail.format as string) ?? null} onSave={v => saveDetailField('format', v)} label="Format" icon={FileType} />
                              <InlineField variant="input" value={(detail.fileUrl as string) ?? null} onSave={v => saveDetailField('fileUrl', v)} label="File URL" icon={LinkIcon} />
                              <InlineField variant="input" value={(detail.fillTime as string) ?? null} onSave={v => saveDetailField('fillTime', v)} label="Fill Time" icon={Clock} />
                              <InlineField variant="input" value={(detail.outputFormat as string) ?? null} onSave={v => saveDetailField('outputFormat', v)} label="Output Format" icon={FileOutput} />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  id: 'components-flow',
                  label: 'Components & Flow',
                  content: (
                    <div className="flex flex-col gap-8">
                      <div>
                        <h3 className="text-sm font-display font-semibold mb-3">Key Components</h3>
                        <OrderedCardList
                          items={asset.keyComponents as unknown as Record<string, unknown>[]}
                          fields={COMPONENT_FIELDS}
                          onUpdate={items => makeJsonSaver('keyComponents')(items)}
                          emptyMessage={`No components yet. Add the core elements of this ${asset.kind}.`}
                          addLabel="Add component"
                          newItemDefaults={sortOrder => ({ title: '', description: '', sortOrder })}
                        />
                      </div>

                      {asset.kind !== 'tool' && (
                        <>
                          <SectionDivider />
                          <div>
                            <h3 className="text-sm font-display font-semibold mb-3">Flow</h3>
                            <OrderedCardList
                              items={asset.flow as unknown as Record<string, unknown>[]}
                              fields={FLOW_FIELDS}
                              onUpdate={items => makeJsonSaver('flow')(items)}
                              emptyMessage={`No flow steps yet. Describe how this ${asset.kind} works in practice.`}
                              addLabel="Add step"
                              newItemDefaults={step => ({ step, title: '', description: '', clientExperience: '', decisionPoints: '' })}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  ),
                },
                {
                  id: 'audience-voc',
                  label: 'Audience & VOC',
                  content: (
                    <VocMapping
                      segment={audienceSegment as Parameters<typeof VocMapping>[0]['segment']}
                      mapping={asset.vocMapping}
                      onToggle={handleVocToggle}
                    />
                  ),
                },
                {
                  id: 'value',
                  label: 'Value',
                  content: (
                    <div className="flex flex-col gap-8">
                      <EntityOutcomesPanel
                        outcomes={outcomes}
                        parentType="knowledgeAsset"
                        parentId={asset.id}
                        brandId={BRAND_ID}
                      />

                      <SectionDivider label="Frequently Asked Questions" />

                      <AssetFaqsSection
                        faqs={asset.faqs}
                        onUpdate={items => makeJsonSaver('faqs')(items)}
                      />
                    </div>
                  ),
                },
                {
                  id: 'sources',
                  label: 'Sources',
                  content: (
                    <SourceMaterialsTable
                      sourceDocumentIds={asset.sourceDocumentIds ?? []}
                      brandId={BRAND_ID}
                      onLink={handleSourceLink}
                      onUnlink={handleSourceUnlink}
                    />
                  ),
                },
              ]}
            />
          </div>
        </div>
      </ContentPane>

      <CreateAssetModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        brandId={BRAND_ID}
        segments={allSegments}
      />

      <ArchiveAssetModal
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        assetId={asset.id}
        assetName={asset.name}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Asset FAQs sub-component (inline in Value tab)
// ---------------------------------------------------------------------------

function AssetFaqsSection({
  faqs: initialFaqs,
  onUpdate,
}: {
  faqs: AssetFaq[]
  onUpdate: (faqs: AssetFaq[]) => Promise<{ ok: boolean; error?: string }>
}) {
  const [faqs, setFaqs] = useState(initialFaqs)

  function handleChange(index: number, key: keyof AssetFaq, value: string) {
    const updated = [...faqs]
    updated[index] = { ...updated[index], [key]: value }
    setFaqs(updated)
  }

  function handleBlur() {
    onUpdate(faqs)
  }

  function handleAdd() {
    const updated = [...faqs, { question: '', answer: '', type: 'application' as const }]
    setFaqs(updated)
    onUpdate(updated)
  }

  function handleDelete(index: number) {
    const updated = faqs.filter((_, i) => i !== index)
    setFaqs(updated)
    onUpdate(updated)
  }

  const FAQ_TYPES = ['differentiation', 'logistics', 'psychological', 'application'] as const

  if (faqs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <p className="text-sm text-muted-foreground">No FAQs yet.</p>
        <ActionButton icon={Plus} variant="outline" onClick={handleAdd}>
          Add FAQ
        </ActionButton>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {faqs.map((faq, i) => (
        <div key={i} className="group rounded-md border border-border/60 p-3 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={faq.question}
              onChange={e => handleChange(i, 'question', e.target.value)}
              onBlur={handleBlur}
              placeholder="Question..."
              className="flex-1 text-sm font-medium bg-transparent border-none p-0 focus:outline-none"
            />
            <InlineCellSelect
              value={faq.type}
              options={FAQ_TYPES.map(t => ({ value: t, label: t }))}
              onSave={(v) => {
                handleChange(i, 'type', v)
                onUpdate(faqs.map((f, idx) => idx === i ? { ...f, type: v as AssetFaq['type'] } : f))
                return Promise.resolve({ ok: true })
              }}
            />
            <button
              type="button"
              onClick={() => handleDelete(i)}
              className="opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 rounded p-1 transition-opacity"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <textarea
            value={faq.answer}
            onChange={e => handleChange(i, 'answer', e.target.value)}
            onBlur={handleBlur}
            placeholder="Answer..."
            rows={2}
            className="w-full resize-none bg-transparent text-sm border-none p-0 focus:outline-none"
          />
        </div>
      ))}

      <ActionButton icon={Plus} variant="outline" onClick={handleAdd} className="self-start">
        Add FAQ
      </ActionButton>
    </div>
  )
}
