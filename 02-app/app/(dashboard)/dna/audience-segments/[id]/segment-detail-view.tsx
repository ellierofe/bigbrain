'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  LayoutGrid, Plus, Archive, CheckCircle,
  FileText, Users, AlertCircle, Sparkles,
  Calendar, User, Globe, User2, MapPin, Banknote,
  Home, GraduationCap, Briefcase, Building2,
  TrendingUp, LayoutGrid as LayoutGridIcon, Brain, Target,
  Fingerprint, Heart, Coffee,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PageHeader } from '@/components/page-header'
import { EmptyState } from '@/components/empty-state'
import { InlineField } from '@/components/inline-field'
import { VocTable } from '@/components/voc-table'
import { AudienceSegmentSwitcher } from '@/components/audience-segment-switcher'
import { CreateSegmentModal } from '@/components/create-segment-modal'
import { ArchiveSegmentModal } from '@/components/archive-segment-modal'
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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <PageHeader
        title="Audience Segments"
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/dna/audience-segments/cards" data-testid="cards-view-link" />}>
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              <span className="ml-1.5">New segment</span>
            </Button>
            {segment.status === 'draft' ? (
              <Button variant="outline" size="sm" onClick={handleActivate} className="gap-1.5">
                <CheckCircle className="h-4 w-4" />
                Mark as active
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger render={<span />}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setArchiveOpen(true)}
                    disabled={!canArchive}
                    className="gap-1.5 text-muted-foreground hover:text-destructive"
                    data-testid="archive-button"
                  >
                    <Archive className="h-4 w-4" />
                    Archive
                  </Button>
                </TooltipTrigger>
                {!canArchive && (
                  <TooltipContent>You must have at least one active audience segment.</TooltipContent>
                )}
              </Tooltip>
            )}
          </div>
        }
      />

      {/* Segment switcher */}
      <AudienceSegmentSwitcher segments={allSegments} currentId={segment.id} />

      {/* Draft badge */}
      {segment.status === 'draft' && (
        <div className="mt-3">
          <Badge variant="secondary" data-testid="draft-badge">Draft</Badge>
        </div>
      )}

      {/* Two-column layout */}
      <div className="mt-4 flex flex-1 gap-6 min-h-0">
        {/* Left sticky panel */}
        <aside className="w-56 shrink-0 flex flex-col gap-4 overflow-y-auto">
          {/* Avatar */}
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-2xl font-bold text-muted-foreground select-none">
              {segment.segmentName.charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Segment name */}
          <InlineField
            variant="input"
            label="Segment name"
            value={segment.segmentName}
            onSave={makeFieldSaver('segmentName')}
          />

          {/* Persona name */}
          <InlineField
            variant="input"
            label="Persona name"
            value={segment.personaName}
            placeholder="e.g. Sarah"
            onSave={makeFieldSaver('personaName')}
          />
        </aside>

        {/* Content pane */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <Tabs defaultValue={defaultTab} className="flex-1 min-h-0">
            <TabsList>
              <TabsTrigger value="persona">Persona</TabsTrigger>
              <TabsTrigger value="voc">VOC</TabsTrigger>
              <TabsTrigger value="related">Related Content</TabsTrigger>
            </TabsList>

            {/* PERSONA TAB */}
            <TabsContent value="persona" className="mt-4 overflow-y-auto min-h-0">
              <div className="flex gap-6">
                {/* Mini-nav */}
                <nav className="w-36 shrink-0 self-start sticky top-0">
                  <ul className="flex flex-col gap-1">
                    {PERSONA_SECTIONS.map(sec => (
                      <li key={sec.id}>
                        <a
                          href={`#persona-${sec.id}`}
                          className="block rounded px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          {sec.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </nav>

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
            </TabsContent>

            {/* VOC TAB */}
            <TabsContent value="voc" className="mt-4 overflow-y-auto min-h-0">
              <VocTable
                segmentId={segment.id}
                problems={segment.problems}
                desires={segment.desires}
                objections={segment.objections}
                sharedBeliefs={segment.sharedBeliefs}
              />
            </TabsContent>

            {/* RELATED CONTENT TAB */}
            <TabsContent value="related" className="mt-4 overflow-y-auto min-h-0">
              <EmptyState
                icon={FileText}
                heading="Related content coming soon"
                description="Content created for this segment will appear here once the content registry is built."
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modals */}
      <CreateSegmentModal open={createOpen} onOpenChange={setCreateOpen} />
      <ArchiveSegmentModal
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        segmentId={segment.id}
        segmentName={segment.segmentName}
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
