'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Type,
  AlignLeft,
  Sparkles,
  MoreHorizontal,
  RefreshCw,
  Trash2,
  Network,
  FileWarning,
  Loader2,
  type LucideIcon,
} from 'lucide-react'
import { toast } from 'sonner'

import { PageChrome } from '@/components/page-chrome'
import { ContentPane } from '@/components/content-pane'
import { InPageNav } from '@/components/in-page-nav'
import { SectionCard } from '@/components/section-card'
import { ActionButton } from '@/components/action-button'
import { ActionMenu, type ActionMenuItem } from '@/components/action-menu'
import { IconButton } from '@/components/icon-button'
import { InlineField } from '@/components/inline-field'
import { SelectField } from '@/components/select-field'
import { Modal } from '@/components/modal'
import { InlineWarningBanner } from '@/components/inline-warning-banner'
import { MarkdownRenderer } from '@/components/markdown-renderer'
import { EmptyState } from '@/components/empty-state'
import { StatusBadge } from '@/components/status-badge'

import { DateField } from '@/components/date-field'
import { TagListEditor } from '@/components/tag-list-editor'
import { ParticipantsPicker } from '@/components/participants-picker'
import { ChunkPreviewRow } from '@/components/chunk-preview-row'
import { InlineHint } from '@/components/inline-hint'
import { LinkButton } from '@/components/link-button'
import { SectionDivider } from '@/components/section-divider'
import { ListItem } from '@/components/list-item'

import { LensPickerModal } from '../lens-picker-modal'

import {
  updateSourceAction,
  deleteSourceAction,
  markSingleTriagedAction,
  resummariseSourceAction,
  searchPeopleAction,
  parkPersonAction,
} from '@/app/actions/sources'

import {
  getSourceTypeMeta,
  getAuthorityLabel,
  sourceTypeOptions,
  authorityOptions,
} from '@/lib/source-types'
import { LENS_META } from '@/lib/lens-meta'
import type {
  ChunkRowData,
  LinkedLensReportSummary,
  PersonSummary,
  SourceDetailData,
} from '@/lib/types/source-list'
import type { Authority, SourceType } from '@/lib/types/lens'

interface SourceDetailClientProps {
  source: SourceDetailData
  chunks: ChunkRowData[]
  linkedReports: LinkedLensReportSummary[]
  hydratedPeople: PersonSummary[]
}

const SECTION_IDS = ['metadata', 'summary', 'chunks', 'history', 'reports'] as const
type SectionId = (typeof SECTION_IDS)[number]

export function SourceDetailClient({
  source,
  chunks,
  linkedReports,
  hydratedPeople,
}: SourceDetailClientProps) {
  const router = useRouter()
  const [activeSection, setActiveSection] = useState<SectionId>('metadata')
  const [resummariseOpen, setResummariseOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [lensOpen, setLensOpen] = useState(false)
  const [resummarising, setResummarising] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const isDataset = source.sourceType === 'dataset'
  const typeMeta = getSourceTypeMeta(source.sourceType)
  const TypeIcon: LucideIcon = typeMeta.icon

  const navItems = useMemo(() => {
    const items: { id: SectionId; label: string }[] = [
      { id: 'metadata', label: 'Metadata' },
      { id: 'summary', label: isDataset ? 'Overview' : 'Summary' },
    ]
    if (!isDataset) items.push({ id: 'chunks', label: `Chunks (${chunks.length})` })
    items.push({ id: 'history', label: `Processing (${source.processingHistory.length})` })
    if (!isDataset) items.push({ id: 'reports', label: `Lens reports (${linkedReports.length})` })
    return items
  }, [chunks.length, isDataset, linkedReports.length, source.processingHistory.length])

  const handleMarkTriaged = async () => {
    const result = await markSingleTriagedAction(source.id)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('Marked as triaged')
    router.refresh()
  }

  const handleResummarise = async () => {
    setResummarising(true)
    const result = await resummariseSourceAction(source.id)
    setResummarising(false)
    setResummariseOpen(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('Summary regenerated')
    router.refresh()
  }

  const handleDelete = async () => {
    setDeleting(true)
    const result = await deleteSourceAction(source.id)
    setDeleting(false)
    setDeleteOpen(false)
    if (!result.ok) {
      toast.error(result.error)
      return
    }
    toast.success('Source deleted')
    router.push('/inputs/sources')
  }

  const menuItems: ActionMenuItem[] = [
    {
      type: 'action',
      label: 'Re-summarise',
      icon: RefreshCw,
      onClick: () => setResummariseOpen(true),
    },
    {
      type: 'disabled',
      label: 'Re-extract chunks',
      icon: FileWarning,
      hint: 'Coming soon',
    },
  ]
  if (isDataset) {
    menuItems.push({
      type: 'link',
      label: 'Open in graph',
      icon: Network,
      href: '/knowledge/graph',
    })
  }
  menuItems.push({ type: 'divider' })
  menuItems.push({
    type: 'action',
    label: 'Delete',
    icon: Trash2,
    destructive: true,
    onClick: () => setDeleteOpen(true),
  })

  return (
    <div className="flex flex-col h-full">
      <PageChrome
        title={source.title}
        subtitle={`${typeMeta.label} · ${getAuthorityLabel(source.authority)}${source.documentDate ? ` · ${source.documentDate}` : ''}${source.krispMeetingId ? ` · krisp:${source.krispMeetingId.slice(0, 8)}` : ''}`}
        icon={TypeIcon}
        action={
          <div className="flex items-center gap-2">
            {isDataset ? (
              <ActionButton icon={Network} href="/knowledge/graph">
                Open in graph
              </ActionButton>
            ) : (
              <ActionButton icon={Sparkles} onClick={() => setLensOpen(true)}>
                Run lens
              </ActionButton>
            )}
            <ActionMenu
              trigger={
                <IconButton
                  icon={MoreHorizontal}
                  label="More actions"
                  variant="ghost"
                  size="sm"
                  tooltip={false}
                />
              }
              items={menuItems}
            />
          </div>
        }
        subheader={
          <div className="flex items-center gap-3">
            <LinkButton href="/inputs/sources" tone="muted">
              <ArrowLeft className="w-3.5 h-3.5" /> All sources
            </LinkButton>
            {source.inboxStatus === 'new' && (
              <>
                <StatusBadge
                  status="new"
                  options={[{ value: 'new', label: 'NEW', state: 'info' }]}
                />
                <ActionButton variant="outline" onClick={handleMarkTriaged}>
                  Mark as triaged
                </ActionButton>
              </>
            )}
          </div>
        }
      />

      {isDataset && (
        <div className="mb-4">
          <InlineWarningBanner
            title="Datasets bypass lens processing"
            subtitle="Query the dataset through the graph view instead of running lenses on it."
            tone="info"
          />
        </div>
      )}

      <ContentPane>
        <div className="flex gap-6">
          <InPageNav
            items={navItems}
            activeId={activeSection}
            onSelect={(id) => {
              setActiveSection(id as SectionId)
              const el = document.getElementById(id)
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
          />

          <div className="flex-1 min-w-0 flex flex-col gap-8 pb-16">
            {/* Metadata */}
            <section id="metadata">
              <SectionCard title="Metadata">
                <div className="flex flex-col gap-4">
                  <InlineField
                    variant="input"
                    label="Title"
                    icon={Type}
                    value={source.title}
                    onSave={(v) => updateSourceAction(source.id, { title: v })}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <SelectField
                      label="Source type"
                      value={source.sourceType}
                      options={sourceTypeOptions()}
                      onSave={(v) => updateSourceAction(source.id, { sourceType: v as SourceType })}
                    />
                    <SelectField
                      label="Authority"
                      value={source.authority}
                      options={authorityOptions()}
                      onSave={(v) => updateSourceAction(source.id, { authority: v as Authority })}
                    />
                  </div>
                  <InlineField
                    variant="textarea"
                    label="Description"
                    icon={AlignLeft}
                    value={source.description}
                    onSave={(v) =>
                      updateSourceAction(source.id, { description: v.trim() === '' ? null : v })
                    }
                    rows={3}
                  />
                  <TagListEditor
                    value={source.tags}
                    onSave={async (next) => updateSourceAction(source.id, { tags: next })}
                    label="Tags"
                  />
                  <ParticipantsPicker
                    value={source.participantIds}
                    hydratedPeople={hydratedPeople}
                    onSave={async (next) =>
                      updateSourceAction(source.id, { participantIds: next })
                    }
                    searchPeople={searchPeopleAction}
                    onParkUnresolved={parkPersonAction}
                    label="Participants"
                  />
                  <DateField
                    label="Document date"
                    value={source.documentDate}
                    onSave={async (v) => updateSourceAction(source.id, { documentDate: v })}
                  />
                </div>
              </SectionCard>
            </section>

            {/* Summary / Overview */}
            <section id="summary">
              <SectionCard
                title={isDataset ? 'Overview' : 'Summary'}
                action={
                  source.summary && !isDataset ? (
                    <LinkButton onClick={() => setResummariseOpen(true)}>Re-summarise</LinkButton>
                  ) : undefined
                }
              >
                {source.summary ? (
                  <>
                    <MarkdownRenderer content={source.summary} />
                    {source.summaryGeneratedAt && (
                      <InlineHint align="left" className="mt-3">
                        Generated: {new Date(source.summaryGeneratedAt).toLocaleString('en-GB')}
                      </InlineHint>
                    )}
                  </>
                ) : source.extractedTextLength === 0 ? (
                  <EmptyState
                    icon={FileWarning}
                    heading="No extracted text yet"
                    description="Once text is available, the summary will generate automatically."
                  />
                ) : (
                  <InlineHint align="left">
                    <Loader2 className="w-3 h-3 animate-spin inline-block mr-1" /> Summary generating…
                  </InlineHint>
                )}
              </SectionCard>
            </section>

            {/* Chunks */}
            {!isDataset && (
              <section id="chunks">
                <SectionCard title={`Chunks (${chunks.length})`}>
                  {chunks.length === 0 ? (
                    source.extractedTextLength === 0 ? (
                      <InlineHint align="left">
                        Chunking will run when extracted text is available.
                      </InlineHint>
                    ) : (
                      <InlineHint align="left">
                        <Loader2 className="w-3 h-3 animate-spin inline-block mr-1" /> Chunking in progress…
                      </InlineHint>
                    )
                  ) : (
                    <div className="flex flex-col">
                      {chunks.map((c) => (
                        <ChunkPreviewRow key={c.id} chunk={c} truncateAt={1200} showPosition />
                      ))}
                    </div>
                  )}
                </SectionCard>
              </section>
            )}

            {/* Processing history */}
            <section id="history">
              <SectionCard title={`Processing history (${source.processingHistory.length})`}>
                {source.processingHistory.length === 0 ? (
                  <InlineHint align="left">
                    No processing yet. Run a lens above to extract knowledge or analyse this source.
                  </InlineHint>
                ) : (
                  <div className="flex flex-col">
                    {source.processingHistory.map((entry, idx) => (
                      <div key={entry.processingRunId} className="flex flex-col">
                        {idx > 0 && <SectionDivider />}
                        <div className="flex items-start gap-3 py-3">
                          <StatusBadge
                            status={entry.status}
                            options={[
                              { value: 'committed', label: 'Committed', state: 'success' },
                              { value: 'pending', label: 'Pending', state: 'warning' },
                              { value: 'failed', label: 'Failed', state: 'error' },
                            ]}
                          />
                          <div className="flex-1 min-w-0">
                            <p>
                              {new Date(entry.date).toLocaleDateString('en-GB')} ·{' '}
                              {LENS_META[entry.lens]?.name ?? entry.lens}
                            </p>
                            {entry.itemCount !== undefined && (
                              <InlineHint align="left">
                                {entry.itemCount} item{entry.itemCount === 1 ? '' : 's'}
                              </InlineHint>
                            )}
                            {entry.errorMessage && (
                              <InlineWarningBanner title="Failed" subtitle={entry.errorMessage} tone="warning" />
                            )}
                            {entry.lensReportId && (
                              <LinkButton href={`/inputs/lens-reports/${entry.lensReportId}`}>
                                Open report →
                              </LinkButton>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </SectionCard>
            </section>

            {/* Linked lens reports */}
            {!isDataset && (
              <section id="reports">
                <SectionCard title={`Linked lens reports (${linkedReports.length})`}>
                  {linkedReports.length === 0 ? (
                    <InlineHint align="left">No lens reports include this source yet.</InlineHint>
                  ) : (
                    <div className="flex flex-col">
                      {linkedReports.map((r) => (
                        <ListItem
                          key={r.id}
                          as="link"
                          href={`/inputs/lens-reports/${r.id}`}
                          density="default"
                          divider
                        >
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{r.title}</span>
                            <InlineHint align="left">
                              {LENS_META[r.lens]?.name ?? r.lens} · {r.status}
                              {r.committedAt &&
                                ` · ${new Date(r.committedAt).toLocaleDateString('en-GB')}`}
                              {r.committedItemCount > 0 && ` · ${r.committedItemCount} items`}
                            </InlineHint>
                            {r.summary && (
                              <InlineHint align="left" className="line-clamp-2">
                                {r.summary}
                              </InlineHint>
                            )}
                          </div>
                        </ListItem>
                      ))}
                    </div>
                  )}
                </SectionCard>
              </section>
            )}
          </div>
        </div>
      </ContentPane>

      {/* Re-summarise confirm */}
      <Modal
        open={resummariseOpen}
        onOpenChange={(o) => !resummarising && setResummariseOpen(o)}
        title="Re-summarise source?"
        description="This will replace the current summary with a freshly generated one. The previous summary is not retained."
        footer={
          <>
            <ActionButton
              variant="outline"
              onClick={() => setResummariseOpen(false)}
              disabled={resummarising}
            >
              Cancel
            </ActionButton>
            <ActionButton onClick={handleResummarise} loading={resummarising}>
              {resummarising ? 'Regenerating…' : 'Re-summarise'}
            </ActionButton>
          </>
        }
      >
        <div />
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={deleteOpen}
        onOpenChange={(o) => !deleting && setDeleteOpen(o)}
        title="Delete source?"
        description={`Permanently delete "${source.title}"? This will also delete ${chunks.length} chunk${chunks.length === 1 ? '' : 's'}. Lens reports referencing this source will break.`}
        footer={
          <>
            <ActionButton
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Cancel
            </ActionButton>
            <ActionButton variant="destructive" onClick={handleDelete} loading={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </ActionButton>
          </>
        }
      >
        <div />
      </Modal>

      {/* Lens picker */}
      <LensPickerModal
        open={lensOpen}
        onOpenChange={setLensOpen}
        sources={[{ id: source.id, title: source.title, sourceType: source.sourceType }]}
      />
    </div>
  )
}
