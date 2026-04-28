'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  LayoutGrid, Plus, Archive, CheckCircle,
  FileText, Users,
  Calendar, User, Globe, User2, MapPin, Banknote,
  Home, GraduationCap, Briefcase, Building2,
  TrendingUp, LayoutGrid as LayoutGridIcon, Brain, Target,
  Fingerprint, Heart, Coffee,
} from 'lucide-react'
import { IconButton } from '@/components/icon-button'
import { ActionButton } from '@/components/action-button'
import { PageChrome } from '@/components/page-chrome'
import { ContentPane } from '@/components/content-pane'
import { TabbedPane } from '@/components/tabbed-pane'
import { InPageNav } from '@/components/in-page-nav'
import { EmptyState } from '@/components/empty-state'
import { InlineField } from '@/components/inline-field'
import { VocTable } from '@/components/voc-table'
import { ItemSwitcher } from '@/components/item-switcher'
import { StatusBadge } from '@/components/status-badge'
import { CreateSegmentModal } from '@/components/create-segment-modal'
import { ArchiveItemModal } from '@/components/archive-item-modal'
import {
  checkAndArchiveSegment,
  confirmArchiveSegment,
} from '@/app/actions/audience-segments'
import {
  saveSegmentField,
  saveSegmentJsonField,
  markSegmentActive,
} from '@/app/actions/audience-segments'
import type { AudienceSegment, AudienceSegmentSummary } from '@/lib/types/audience-segments'

interface SegmentDetailViewProps {
  segment: AudienceSegment
  allSegments: AudienceSegmentSummary[]
  activeCount: number
  defaultTab: 'persona' | 'voc' | 'related'
}

const PERSONA_SECTIONS = [
  { id: 'overview', label: 'Overview' },
  { id: 'identity', label: 'Identity' },
  { id: 'lifecircs', label: 'Life Circs' },
  { id: 'business', label: 'Business' },
  { id: 'psychographics', label: 'Psychographics' },
]

export function SegmentDetailView({
  segment,
  allSegments,
  activeCount,
  defaultTab,
}: SegmentDetailViewProps) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [, startTransition] = useTransition()

  const canArchive = !(segment.status === 'active' && activeCount <= 1)

  function makeFieldSaver(field: string) {
    return async (value: string) => {
      const result = await saveSegmentField(segment.id, field, value)
      return result
    }
  }

  function makeDemoSaver(key: string) {
    return async (value: string) => {
      const current = (segment.demographics ?? {}) as Record<string, string | null>
      const result = await saveSegmentJsonField(segment.id, 'demographics', {
        ...current,
        [key]: value || null,
      })
      return result
    }
  }

  function makePsychoSaver(key: string) {
    return async (value: string) => {
      const current = (segment.psychographics ?? {}) as Record<string, string | null>
      const result = await saveSegmentJsonField(segment.id, 'psychographics', {
        ...current,
        [key]: value || null,
      })
      return result
    }
  }

  function handleActivate() {
    startTransition(async () => {
      const result = await markSegmentActive(segment.id)
      if (result.ok) {
        toast.success('Segment marked as active')
        router.refresh()
      } else {
        toast.error(result.error)
      }
    })
  }

  const demo = (segment.demographics ?? {}) as Record<string, string>
  const psycho = (segment.psychographics ?? {}) as Record<string, string>

  const [activeSection, setActiveSection] = useState('overview')

  function handleSectionSelect(id: string) {
    setActiveSection(id)
    const el = document.getElementById(`persona-${id}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <PageChrome
        title="Audience Segments"
        action={
          <div className="flex items-center gap-2">
            <IconButton
              icon={LayoutGrid}
              label="Cards view"
              href="/dna/audience-segments/cards"
              data-testid="cards-view-link"
            />
            <ActionButton icon={Plus} onClick={() => setCreateOpen(true)}>
              New segment
            </ActionButton>
            {segment.status === 'draft' ? (
              <ActionButton icon={CheckCircle} variant="outline" onClick={handleActivate}>
                Mark as active
              </ActionButton>
            ) : (
              <ActionButton
                icon={Archive}
                variant="outline"
                onClick={() => setArchiveOpen(true)}
                disabled={!canArchive}
                tooltip={!canArchive ? 'You must have at least one active audience segment.' : undefined}
                data-testid="archive-button"
              >
                Archive
              </ActionButton>
            )}
          </div>
        }
        subheader={
          <div className="flex items-center gap-3">
            <ItemSwitcher
              items={allSegments.filter((s) => s.status !== 'archived')}
              currentId={segment.id}
              label="Segment"
              getHref={(s) => `/dna/audience-segments/${s.id}`}
              getLabel={(s) => s.segmentName}
            />
            {segment.status === 'draft' && (
              <span data-testid="draft-badge">
                <StatusBadge
                  status="draft"
                  options={[{ value: 'draft', label: 'Draft', state: 'warning' }]}
                />
              </span>
            )}
          </div>
        }
      />

      <ContentPane padding={false} className="flex flex-col">
        {/* Two-column layout */}
        <div className="flex flex-1 min-h-0">
          {/* Left panel */}
          <aside className="w-64 shrink-0 flex flex-col gap-4 overflow-y-auto border-r border-border/40 bg-muted/30 px-6 py-6">
            {/* Avatar */}
            <div className="flex justify-center">
              {segment.avatarUrl ? (
                <img
                  src={segment.avatarUrl}
                  alt={segment.segmentName}
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-2xl font-bold text-muted-foreground select-none">
                  {segment.segmentName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {/* Segment name */}
            <InlineField
              variant="input"
              label="Segment name"
              icon={Users}
              value={segment.segmentName}
              labelBg="bg-background"
              onSave={makeFieldSaver('segmentName')}
            />

            {/* Persona name */}
            <InlineField
              variant="input"
              label="Persona name"
              icon={User}
              value={segment.personaName}
              placeholder="e.g. Sarah"
              labelBg="bg-background"
              onSave={makeFieldSaver('personaName')}
            />
          </aside>

          {/* Right panel — tabbed content */}
          <div className="flex-1 min-w-0 flex flex-col min-h-0 px-6 py-6">
            <TabbedPane
              className="flex-1 min-h-0"
              defaultTab={defaultTab}
              tabs={[
                {
                  id: 'persona',
                  label: 'Persona',
                  content: (
                    <div className="flex gap-6">
                      {/* In-page nav */}
                      <InPageNav
                        items={PERSONA_SECTIONS}
                        activeId={activeSection}
                        onSelect={handleSectionSelect}
                      />

                      {/* Fields */}
                      <div className="flex-1 min-w-0 flex flex-col gap-8 pb-16">
                        {/* Overview */}
                        <section id="persona-overview">
                          <SectionHeading>Overview</SectionHeading>
                          <div className="flex flex-col gap-4">
                            <InlineField
                              variant="textarea"
                              label="Overview / summary"
                              icon={FileText}
                              value={segment.summary}
                              placeholder="50–80 word overview starting 'This audience…'"
                              rows={3}
                              onSave={makeFieldSaver('summary')}
                            />
                            <InlineField
                              variant="textarea"
                              label="Role"
                              icon={Users}
                              value={segment.roleContext}
                              placeholder="Who are they for your business? e.g. A founder who needs to define their positioning before their next funding round"
                              rows={3}
                              onSave={makeFieldSaver('roleContext')}
                            />
                          </div>
                        </section>

                        {/* Identity */}
                        <section id="persona-identity">
                          <SectionHeading>Identity</SectionHeading>
                          <div className="grid grid-cols-2 gap-4">
                            <InlineField variant="input" label="Age range" icon={Calendar} value={demo.ageRange ?? null} onSave={makeDemoSaver('ageRange')} />
                            <InlineField variant="input" label="Sex" icon={User} value={demo.sex ?? null} onSave={makeDemoSaver('sex')} />
                            <InlineField variant="input" label="Ethnicity" icon={Globe} value={demo.ethnicity ?? null} onSave={makeDemoSaver('ethnicity')} />
                            <InlineField variant="input" label="Sexual orientation" icon={User2} value={demo.orientation ?? null} onSave={makeDemoSaver('orientation')} />
                          </div>
                        </section>

                        {/* Life Circs */}
                        <section id="persona-lifecircs">
                          <SectionHeading>Life Circs</SectionHeading>
                          <div className="grid grid-cols-2 gap-4">
                            <InlineField variant="input" label="Location" icon={MapPin} value={demo.location ?? null} onSave={makeDemoSaver('location')} />
                            <InlineField variant="input" label="Personal income" icon={Banknote} value={demo.income ?? null} onSave={makeDemoSaver('income')} />
                            <InlineField variant="input" label="Household income" icon={Banknote} value={demo.householdIncome ?? null} onSave={makeDemoSaver('householdIncome')} />
                            <InlineField variant="input" label="Family situation" icon={Home} value={demo.familySituation ?? null} onSave={makeDemoSaver('familySituation')} />
                            <InlineField variant="input" label="Education" icon={GraduationCap} value={demo.education ?? null} onSave={makeDemoSaver('education')} />
                            <InlineField variant="input" label="Occupation" icon={Briefcase} value={demo.occupation ?? null} onSave={makeDemoSaver('occupation')} />
                          </div>
                        </section>

                        {/* Business */}
                        <section id="persona-business">
                          <SectionHeading>Business</SectionHeading>
                          <div className="grid grid-cols-2 gap-4">
                            <InlineField variant="input" label="Industry" icon={Building2} value={demo.businessIndustry ?? null} onSave={makeDemoSaver('businessIndustry')} />
                            <InlineField variant="input" label="Stage" icon={TrendingUp} value={demo.businessStage ?? null} onSave={makeDemoSaver('businessStage')} />
                            <InlineField variant="input" label="Business model" icon={LayoutGridIcon} value={demo.businessModel ?? null} onSave={makeDemoSaver('businessModel')} />
                          </div>
                        </section>

                        {/* Psychographics */}
                        <section id="persona-psychographics">
                          <SectionHeading>Psychographics</SectionHeading>
                          <div className="flex flex-col gap-4">
                            <InlineField variant="textarea" label="Personality traits" icon={Brain} value={psycho.personalityTraits ?? null} rows={3} onSave={makePsychoSaver('personalityTraits')} />
                            <InlineField variant="textarea" label="Motivations" icon={Target} value={psycho.motivations ?? null} rows={3} onSave={makePsychoSaver('motivations')} />
                            <InlineField variant="textarea" label="Identity & self-perception" icon={Fingerprint} value={psycho.identity ?? null} rows={3} onSave={makePsychoSaver('identity')} />
                            <InlineField variant="textarea" label="Values & worldview" icon={Heart} value={psycho.valuesAndWorldview ?? null} rows={3} onSave={makePsychoSaver('valuesAndWorldview')} />
                            <InlineField variant="textarea" label="Lifestyle" icon={Coffee} value={psycho.lifestyle ?? null} rows={3} onSave={makePsychoSaver('lifestyle')} />
                          </div>
                        </section>
                      </div>
                    </div>
                  ),
                },
                {
                  id: 'voc',
                  label: 'VOC',
                  content: (
                    <VocTable
                      segmentId={segment.id}
                      problems={segment.problems}
                      desires={segment.desires}
                      objections={segment.objections}
                      sharedBeliefs={segment.sharedBeliefs}
                    />
                  ),
                },
                {
                  id: 'related',
                  label: 'Related Content',
                  content: (
                    <EmptyState
                      icon={FileText}
                      heading="Related content coming soon"
                      description="Content created for this segment will appear here once the content registry is built."
                    />
                  ),
                },
              ]}
            />
          </div>
        </div>
      </ContentPane>

      {/* Modals */}
      <CreateSegmentModal open={createOpen} onOpenChange={setCreateOpen} />
      <ArchiveItemModal
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        itemName={segment.segmentName}
        itemType="segment"
        dependencyCheck={() => checkAndArchiveSegment(segment.id)}
        onConfirm={() => confirmArchiveSegment(segment.id)}
        onArchived={(nextId) => {
          router.push(nextId ? `/dna/audience-segments/${nextId}` : '/dna/audience-segments')
        }}
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
