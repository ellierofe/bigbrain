'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Globe,
  Link as LinkIcon,
  Target,
  Users,
  ArrowRight,
  Star,
  FileText,
  Clock,
  TrendingUp,
  MessageCircle,
  Hash,
  BarChart3,
  Activity,
  StickyNote,
  LayoutGrid,
  Plus,
  Archive,
  CheckCircle,
} from 'lucide-react'
import { PageChrome } from '@/components/page-chrome'
import { TabbedPane } from '@/components/tabbed-pane'
import { InPageNav } from '@/components/in-page-nav'
import { InlineField } from '@/components/inline-field'
import { ExpandableCardList } from '@/components/expandable-card-list'
import { StringListEditor } from '@/components/string-list-editor'
import { KeyValueEditor } from '@/components/key-value-editor'
import { ContentPane } from '@/components/content-pane'
import { SourceMaterialsTable } from '@/components/source-materials-table'
import { EmptyState } from '@/components/empty-state'
import { ItemSwitcher } from '@/components/item-switcher'
import { CreatePlatformModal } from '@/components/create-platform-modal'
import { ArchiveItemModal } from '@/components/archive-item-modal'
import {
  checkAndArchivePlatform,
  confirmArchivePlatform,
} from '@/app/actions/platforms'
import { StatusBadge } from '@/components/status-badge'
import { IconButton } from '@/components/icon-button'
import { ActionButton } from '@/components/action-button'
import { SelectField } from '@/components/select-field'
// DS-07 exception: Input + Textarea used inside ExpandableCardList renderExpanded callbacks
// (lines 265, 274, 287, 301, 378, 384, 454). Parent owns the save lifecycle (whole-list onSave),
// each input is `onChange→state`, not a saving field. A `FormField` molecule is the right
// long-term home for this pattern; tracked as DS-10 follow-up.
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  savePlatformField,
  savePlatformJsonField,
  markPlatformActive,
} from '@/app/actions/platforms'
import type { Platform, PlatformSummary, ContentFormat, SubtopicIdea, StructureAndFeatures, CharacterLimits } from '@/lib/types/platforms'
import { TypeBadge } from '@/components/type-badge'
import {
  CATEGORY_HUES,
  CATEGORY_LABELS,
  CHANNEL_LABELS,
  categoryHasField,
  categoryHasIdeasTab,
  categoryHasFormatsTab,
  postingFrequencyLabel,
  engagementApproachLabel,
  type Category,
  type Channel,
} from '@/lib/types/channels'
import { ChangeCategoryChannelModal } from '@/components/change-category-channel-modal'

const JOURNEY_STAGES = [
  { value: 'awareness', label: 'Awareness' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'conversion', label: 'Conversion' },
  { value: 'delight_advocacy', label: 'Delight & Advocacy' },
]

interface PlatformDetailViewProps {
  platform: Platform
  allPlatforms: PlatformSummary[]
  activeCount: number
  defaultTab: string
}

export function PlatformDetailView({
  platform,
  allPlatforms,
  activeCount,
  defaultTab,
}: PlatformDetailViewProps) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [changeOpen, setChangeOpen] = useState(false)

  const category = platform.category as Category
  const channel = platform.channel as Channel
  const isAudioOrVideo = channel === 'podcast' || channel === 'youtube_channel' || channel === 'youtube_social' || channel === 'tiktok'

  // InPageNav state
  const [activeStrategySection, setActiveStrategySection] = useState('audience')
  const [activeFormatsSection, setActiveFormatsSection] = useState('formats')

  function handleSectionSelect(id: string) {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Field saver
  const makeFieldSaver = useCallback(
    (field: string) => async (value: string) => {
      const result = await savePlatformField(platform.id, field, value || null)
      return { ok: result.ok, error: result.ok ? undefined : result.error }
    },
    [platform.id]
  )

  // JSON field saver
  const makeJsonSaver = useCallback(
    (field: string) => async (value: unknown) => {
      const result = await savePlatformJsonField(platform.id, field, value)
      return { ok: result.ok, error: result.ok ? undefined : result.error }
    },
    [platform.id]
  )

  async function handleMarkActive() {
    const result = await markPlatformActive(platform.id)
    if (result.ok) {
      toast.success('Channel activated')
    } else {
      toast.error(result.error)
    }
  }

  // Strategy tab sections
  const strategySections = [
    { id: 'audience', label: 'Audience & positioning' },
    { id: 'approach', label: 'Content approach' },
    { id: 'engagement', label: 'Engagement' },
  ]

  // Formats tab sections (filtered by category)
  const formatsSections = [
    categoryHasField(category, 'contentFormats') ? { id: 'formats', label: 'Content formats' } : null,
    categoryHasField(category, 'structureAndFeatures') ? { id: 'structure', label: 'Structure & features' } : null,
    categoryHasField(category, 'characterLimits') ? { id: 'constraints', label: 'Constraints' } : null,
  ].filter((s): s is { id: string; label: string } => s !== null)

  const strategyTab = (
    <div className="flex gap-6">
      <InPageNav items={strategySections} activeId={activeStrategySection} onSelect={(id) => { setActiveStrategySection(id); handleSectionSelect(id) }} />
      <div className="flex-1 min-w-0 flex flex-col gap-8 pb-16">
        {/* Audience & positioning */}
        <section id="audience">
          <SectionHeading>Audience & positioning</SectionHeading>
          <div className="flex flex-col gap-4">
          <InlineField
            variant="textarea"
            label="Audience"
            value={platform.audience}
            onSave={makeFieldSaver('audience')}
            icon={Users}
            rows={4}
            placeholder="Who is the audience on this channel?"
          />
          <SelectField
            label="Customer journey stage"
            icon={ArrowRight}
            value={platform.customerJourneyStage || ''}
            options={JOURNEY_STAGES}
            placeholder="Select stage…"
            labelBg="bg-muted/30"
            onSave={(v) => savePlatformField(platform.id, 'customerJourneyStage', v)}
          />
          <InlineField
            variant="textarea"
            label="USP"
            value={platform.usp}
            onSave={makeFieldSaver('usp')}
            icon={Star}
            rows={3}
            placeholder="What makes your presence on this channel distinct?"
          />
          </div>
        </section>

        {/* Content approach */}
        <section id="approach">
          <SectionHeading>Content approach</SectionHeading>
          <div className="flex flex-col gap-4">
          <InlineField
            variant="textarea"
            label="Content strategy"
            value={platform.contentStrategy}
            onSave={makeFieldSaver('contentStrategy')}
            icon={FileText}
            rows={4}
            placeholder="Overall approach to this channel"
          />
          <InlineField
            variant="input"
            label={postingFrequencyLabel(category)}
            value={platform.postingFrequency}
            onSave={makeFieldSaver('postingFrequency')}
            icon={Clock}
            placeholder="e.g. 3x per week"
          />
          <InlineField
            variant="textarea"
            label="Growth function"
            value={platform.growthFunction}
            onSave={makeFieldSaver('growthFunction')}
            icon={TrendingUp}
            rows={3}
            placeholder="How this channel helps the business grow"
          />
          </div>
        </section>

        {/* Engagement */}
        <section id="engagement">
          <SectionHeading>Engagement</SectionHeading>
          <div className="flex flex-col gap-4">
          <InlineField
            variant="textarea"
            label={engagementApproachLabel(category)}
            value={platform.engagementApproach}
            onSave={makeFieldSaver('engagementApproach')}
            icon={MessageCircle}
            rows={3}
            placeholder="How to engage with comments, DMs, community"
          />
          {categoryHasField(category, 'hashtagStrategy') && (
            <InlineField
              variant="textarea"
              label="Hashtag strategy"
              value={platform.hashtagStrategy}
              onSave={makeFieldSaver('hashtagStrategy')}
              icon={Hash}
              rows={2}
              placeholder="How hashtags are used on this channel"
            />
          )}
          </div>
        </section>
      </div>
    </div>
  )

  const formatsTab = (
    <div className="flex gap-6">
      <InPageNav items={formatsSections} activeId={activeFormatsSection} onSelect={(id) => { setActiveFormatsSection(id); handleSectionSelect(id) }} />
      <div className="flex-1 min-w-0 flex flex-col gap-8 pb-16">
        {/* Content formats */}
        {categoryHasField(category, 'contentFormats') && (
        <section id="formats">
          <SectionHeading>Content formats</SectionHeading>
          <ExpandableCardList<ContentFormat>
            items={(platform.contentFormats || []) as ContentFormat[]}
            onSave={makeJsonSaver('contentFormats')}
            renderCollapsed={(item) => ({
              primary: item.format || '(untitled format)',
              secondary: item.frequency,
            })}
            renderExpanded={(item, onChange) => (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Format name</label>
                  <Input
                    value={item.format}
                    onChange={(e) => onChange({ ...item, format: e.target.value })}
                    placeholder="e.g. Text post, Carousel, Interview episode"
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Description</label>
                  <Textarea
                    value={item.description}
                    onChange={(e) => onChange({ ...item, description: e.target.value })}
                    placeholder="How this format works on this platform"
                    rows={3}
                    className="mt-1 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">
                      {isAudioOrVideo ? 'Duration limit' : 'Character limit'}
                    </label>
                    <Input
                      type="number"
                      value={item.characterLimit ?? ''}
                      onChange={(e) =>
                        onChange({
                          ...item,
                          characterLimit: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Frequency</label>
                    <Input
                      value={item.frequency}
                      onChange={(e) => onChange({ ...item, frequency: e.target.value })}
                      placeholder="e.g. 2x per week"
                      className="mt-1 h-8 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Best for</label>
                  <StringListEditor
                    values={item.bestFor || []}
                    onSave={async (values) => {
                      onChange({ ...item, bestFor: values })
                      return { ok: true }
                    }}
                    placeholder="Add use case…"
                  />
                </div>
              </div>
            )}
            createEmpty={() => ({
              format: '',
              description: '',
              bestFor: [],
              frequency: '',
            })}
            addLabel="Add format"
            emptyMessage="No formats defined yet. Add your first content format."
          />
        </section>
        )}

        {/* Structure & features */}
        {categoryHasField(category, 'structureAndFeatures') && (
        <section id="structure">
          <SectionHeading>Structure & features</SectionHeading>
          {(() => {
            const sf = (platform.structureAndFeatures || {
              signatureFeatures: [],
              contentStructure: '',
              brandedComponents: [],
            }) as StructureAndFeatures

            const saveSf = async (updated: StructureAndFeatures) => {
              return makeJsonSaver('structureAndFeatures')(updated)
            }

            return (
              <div className="flex flex-col gap-4">
                <InlineField
                  variant="textarea"
                  label="Content structure"
                  value={sf.contentStructure}
                  onSave={async (value) => {
                    const result = await saveSf({ ...sf, contentStructure: value })
                    return { ok: result.ok }
                  }}
                  icon={FileText}
                  rows={3}
                  placeholder="e.g. Hook → Setup → Insight → CTA"
                />

                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Signature features
                  </p>
                  <ExpandableCardList<{ name: string; description: string }>
                    items={sf.signatureFeatures || []}
                    onSave={async (items) => {
                      return saveSf({ ...sf, signatureFeatures: items })
                    }}
                    renderCollapsed={(item) => ({
                      primary: item.name || '(untitled)',
                    })}
                    renderExpanded={(item, onChange) => (
                      <div className="space-y-2">
                        <Input
                          value={item.name}
                          onChange={(e) => onChange({ ...item, name: e.target.value })}
                          placeholder="Feature name"
                          className="h-8 text-sm"
                        />
                        <Textarea
                          value={item.description}
                          onChange={(e) => onChange({ ...item, description: e.target.value })}
                          placeholder="What this feature is and why it builds recognition"
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                    )}
                    createEmpty={() => ({ name: '', description: '' })}
                    addLabel="Add feature"
                    emptyMessage="No signature features yet."
                  />
                </div>

                <div>
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Branded components
                  </p>
                  <StringListEditor
                    values={sf.brandedComponents || []}
                    onSave={async (values) => {
                      return saveSf({ ...sf, brandedComponents: values })
                    }}
                    placeholder="Add branded component…"
                  />
                </div>
              </div>
            )
          })()}
        </section>
        )}

        {/* Constraints — character/duration limits only (do-not-do moved to Performance tab) */}
        {categoryHasField(category, 'characterLimits') && (
        <section id="constraints">
          <SectionHeading>Constraints</SectionHeading>
          <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {isAudioOrVideo ? 'Format constraints' : 'Character limits'}
            </p>
            <KeyValueEditor
              data={(platform.characterLimits || {}) as CharacterLimits}
              onSave={makeJsonSaver('characterLimits')}
            />
          </div>
          </div>
        </section>
        )}
      </div>
    </div>
  )

  const ideasTab = (
    <div className="flex flex-col gap-8 pb-16">
      {categoryHasField(category, 'subtopicIdeas') && (
      <section>
        <SectionHeading>Subtopic ideas</SectionHeading>
        <ExpandableCardList<SubtopicIdea>
          items={(platform.subtopicIdeas || []) as SubtopicIdea[]}
          onSave={makeJsonSaver('subtopicIdeas')}
          renderCollapsed={(item) => ({
            primary: item.subtopic || '(untitled topic)',
            secondary: `${(item.examples || []).length} ideas`,
          })}
          renderExpanded={(item, onChange) => (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Subtopic</label>
                <Input
                  value={item.subtopic}
                  onChange={(e) => onChange({ ...item, subtopic: e.target.value })}
                  placeholder="Content theme or angle"
                  className="mt-1 h-8 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Example ideas</label>
                <StringListEditor
                  values={item.examples || []}
                  onSave={async (values) => {
                    onChange({ ...item, examples: values })
                    return { ok: true }
                  }}
                  placeholder="Add a content idea…"
                />
              </div>
            </div>
          )}
          createEmpty={() => ({ subtopic: '', examples: [] })}
          addLabel="Add subtopic"
          emptyMessage="No subtopic ideas yet. Add a topic cluster to seed content generation."
        />
      </section>
      )}

      {categoryHasField(category, 'contentPillarThemes') && (
      <section>
        <SectionHeading>Content pillar themes</SectionHeading>
        <InlineField
          variant="textarea"
          label="Content pillar themes"
          value={platform.contentPillarThemes}
          onSave={makeFieldSaver('contentPillarThemes')}
          icon={FileText}
          rows={4}
          placeholder="How content pillars manifest on this channel — which themes get traction, which angles work"
          description="Freeform until content pillars are built."
        />
      </section>
      )}
    </div>
  )

  const performanceTab = (
    <div className="flex flex-col gap-4 pb-16">
      <InlineField
        variant="textarea"
        label="Analytics goals"
        value={platform.analyticsGoals}
        onSave={makeFieldSaver('analyticsGoals')}
        icon={BarChart3}
        rows={4}
        placeholder="What metrics matter on this channel?"
      />
      <InlineField
        variant="textarea"
        label="Performance summary"
        value={platform.performanceSummary}
        onSave={makeFieldSaver('performanceSummary')}
        icon={Activity}
        rows={4}
        placeholder="What's working and what isn't"
      />
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Do not do
        </p>
        <StringListEditor
          values={platform.doNotDo || []}
          onSave={async (values) => {
            const result = await savePlatformJsonField(platform.id, 'doNotDo', values)
            return { ok: result.ok }
          }}
          placeholder="Add an anti-pattern…"
        />
      </div>
      <InlineField
        variant="textarea"
        label="Notes"
        value={platform.notes}
        onSave={makeFieldSaver('notes')}
        icon={StickyNote}
        rows={4}
        placeholder="Any other channel-specific context"
      />
    </div>
  )

  const sourcesTab = (
    <SourceMaterialsTable
      sourceDocumentIds={platform.sourceDocumentIds ?? []}
      brandId={platform.brandId}
      onLink={async (ids) => {
        const allIds = [...new Set([...(platform.sourceDocumentIds ?? []), ...ids])]
        return savePlatformJsonField(platform.id, 'sourceDocumentIds', allIds)
      }}
      onUnlink={async (unlinkId) => {
        const updated = (platform.sourceDocumentIds ?? []).filter(id => id !== unlinkId)
        return savePlatformJsonField(platform.id, 'sourceDocumentIds', updated)
      }}
    />
  )

  const relatedTab = (
    <EmptyState
      heading="Related content"
      description="Coming soon — content created for this channel will appear here."
    />
  )

  const allTabs = [
    { id: 'strategy', label: 'Strategy', content: strategyTab, show: true },
    { id: 'formats', label: 'Formats & Output', content: formatsTab, show: categoryHasFormatsTab(category) },
    { id: 'ideas', label: 'Ideas', content: ideasTab, show: categoryHasIdeasTab(category) },
    { id: 'performance', label: 'Performance', content: performanceTab, show: true },
    { id: 'sources', label: 'Sources', content: sourcesTab, show: true },
    { id: 'related', label: 'Related Content', content: relatedTab, show: true },
  ]
  const tabs = allTabs.filter((t) => t.show).map(({ id, label, content }) => ({ id, label, content }))

  return (
    <div className="flex h-full flex-col">
      <PageChrome
        title="Channels"
        action={
          <div className="flex items-center gap-2">
            <IconButton
              icon={LayoutGrid}
              label="Card view"
              variant="ghost"
              onClick={() => router.push('/dna/platforms/cards')}
            />

            <ActionButton icon={Plus} onClick={() => setCreateOpen(true)}>
              New channel
            </ActionButton>

            {!platform.isActive ? (
              <ActionButton icon={CheckCircle} variant="outline" onClick={handleMarkActive}>
                Mark as active
              </ActionButton>
            ) : (
              <IconButton
                icon={Archive}
                label="Archive channel"
                variant="ghost"
                onClick={() => setArchiveOpen(true)}
                disabled={activeCount <= 1}
                tooltip={activeCount <= 1 ? 'You must have at least one active channel.' : 'Archive channel'}
              />
            )}
          </div>
        }
        subheader={
          <div className="flex items-center gap-2">
            {!platform.isActive && (
              <StatusBadge
                status="inactive"
                options={[{ value: 'inactive', label: 'Inactive', state: 'warning' }]}
              />
            )}
            <ItemSwitcher
              items={allPlatforms.filter((p) => p.isActive)}
              currentId={platform.id}
              label="Channel"
              getHref={(p) => `/dna/platforms/${p.id}`}
              getLabel={(p) => p.name}
              getGroup={(p) => p.category}
              getGroupLabel={(key) => CATEGORY_LABELS[key as Category] ?? key}
            />
          </div>
        }
      />

      <ContentPane padding={false} className="flex flex-col">
      {/* Two-column layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left sticky panel */}
        <aside className="w-64 shrink-0 flex flex-col gap-4 overflow-y-auto border-r border-border/40 bg-muted/30 px-6 py-6">
          {/* Category + channel badges */}
          <div className="flex flex-col items-start gap-1.5">
            <TypeBadge
              hue={CATEGORY_HUES[category]}
              label={CATEGORY_LABELS[category]}
              size="sm"
            />
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              {CHANNEL_LABELS[channel] ?? channel}
            </span>
            <button
              type="button"
              onClick={() => setChangeOpen(true)}
              className="text-[11px] text-muted-foreground hover:text-foreground hover:underline"
            >
              Change category / channel
            </button>
          </div>

          <InlineField
            variant="input"
            label="Channel name"
            value={platform.name}
            onSave={makeFieldSaver('name')}
            icon={Globe}
            labelBg="bg-muted/30"
          />

          <InlineField
            variant="input"
            label="Handle / URL"
            value={platform.handle}
            onSave={makeFieldSaver('handle')}
            icon={LinkIcon}
            labelBg="bg-muted/30"
            placeholder="Profile URL or handle"
          />

          <InlineField
            variant="textarea"
            label="Primary objective"
            value={platform.primaryObjective}
            onSave={makeFieldSaver('primaryObjective')}
            icon={Target}
            labelBg="bg-muted/30"
            rows={3}
            placeholder="What is this channel for?"
          />
        </aside>

        {/* Right content pane — tabs fixed, content scrolls */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0 px-6 py-6">
          <TabbedPane tabs={tabs} defaultTab={defaultTab} className="flex-1 min-h-0" />
        </div>
      </div>
      </ContentPane>

      {/* Modals */}
      <CreatePlatformModal open={createOpen} onOpenChange={setCreateOpen} />
      <ArchiveItemModal
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        itemName={platform.name}
        itemType="channel"
        dependencyCheck={() => checkAndArchivePlatform(platform.id)}
        onConfirm={() => confirmArchivePlatform(platform.id)}
        onArchived={(nextId) => {
          router.push(nextId ? `/dna/platforms/${nextId}` : '/dna/platforms')
        }}
      />
      <ChangeCategoryChannelModal
        open={changeOpen}
        onOpenChange={setChangeOpen}
        platformId={platform.id}
        currentCategory={category}
        currentChannel={channel}
      />
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </h3>
  )
}
