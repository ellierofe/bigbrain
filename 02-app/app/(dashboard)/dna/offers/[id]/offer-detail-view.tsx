'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Gem, MessageSquare, MousePointerClick, Image, CircleDollarSign, Banknote,
  Tag, StickyNote, RefreshCw, Shield, Type, FileText, Scale, AlertTriangle,
  Clock, Filter, Plus, Archive, LayoutGrid, LinkIcon, Unlink, ExternalLink,
  Sparkles,
} from 'lucide-react'
import { PageChrome } from '@/components/page-chrome'
import { ContentPane } from '@/components/content-pane'
import { TabbedPane } from '@/components/tabbed-pane'
import { InlineField } from '@/components/inline-field'
import { SelectField } from '@/components/select-field'
import { InPageNav } from '@/components/in-page-nav'
import { StatusBadge } from '@/components/status-badge'
import { ItemSwitcher } from '@/components/item-switcher'
import { VocMapping } from '@/components/voc-mapping'
import { EntityOutcomesPanel } from '@/components/entity-outcomes-panel'
import { CustomerJourneyPanel } from '@/components/customer-journey-panel'
import { CreateOfferModal } from '@/components/create-offer-modal'
import { ArchiveItemModal } from '@/components/archive-item-modal'
import { checkOfferDependents, archiveOfferAction } from '@/app/actions/offers'
import { SectionDivider } from '@/components/section-divider'
import { EmptyState } from '@/components/empty-state'
import { ActionButton } from '@/components/action-button'
import { IconButton } from '@/components/icon-button'
import { ListItem } from '@/components/list-item'
import { Modal } from '@/components/modal'
import { TypeBadge } from '@/components/type-badge'
import {
  saveOfferField,
  saveOfferJsonField,
  activateOfferAction,
} from '@/app/actions/offers'
import { toast } from 'sonner'
import type { Offer, OfferSummary, PricingData, GuaranteeData, CustomerJourneyStage } from '@/lib/types/offers'
import { OFFER_TYPE_LABELS, OFFER_STATUS_OPTIONS } from '@/lib/types/offers'
import type { VocMapping as VocMappingType } from '@/lib/types/knowledge-assets'
import type { KnowledgeAssetSummary } from '@/lib/types/knowledge-assets'
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

interface OfferDetailViewProps {
  offer: Offer
  allOffers: OfferSummary[]
  activeCount: number
  defaultTab?: string
  audienceSegment: AudienceSegmentForVoc | null
  outcomes: EntityOutcomeRow[]
  knowledgeAssets: KnowledgeAssetSummary[]
  allSegments: AudienceSegmentForVoc[]
}

export function OfferDetailView({
  offer,
  allOffers,
  activeCount,
  defaultTab,
  audienceSegment,
  outcomes,
  knowledgeAssets,
  allSegments,
}: OfferDetailViewProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [createOpen, setCreateOpen] = useState(false)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [assetPickerOpen, setAssetPickerOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('value-prop')

  // Local state for JSONB fields
  const [localPricing, setLocalPricing] = useState<PricingData>(offer.pricing ?? {})
  const [localGuarantee, setLocalGuarantee] = useState<GuaranteeData>(offer.guarantee ?? {})

  const isDraft = offer.status === 'draft'
  const linkedAsset = knowledgeAssets.find(a => a.id === offer.knowledgeAssetId)

  // Detect ungenerated drafts: status=draft, has vocMapping, but no LLM-populated content
  const needsGeneration =
    isDraft &&
    !!offer.vocMapping &&
    !!offer.targetAudienceIds?.[0] &&
    !offer.overview &&
    !offer.usp

  const [generating, setGenerating] = useState(false)

  async function handleGenerateFromInputs() {
    const audienceId = offer.targetAudienceIds?.[0]
    if (!audienceId || !offer.vocMapping) {
      toast.error('Missing inputs for generation')
      return
    }

    setGenerating(true)
    try {
      const res = await fetch('/api/generate/offer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate',
          offerId: offer.id,
          name: offer.name,
          offerType: offer.offerType,
          audienceSegmentId: audienceId,
          vocMapping: {
            problems: offer.vocMapping.problems ?? [],
            desires: offer.vocMapping.desires ?? [],
            objections: offer.vocMapping.objections ?? [],
            beliefs: offer.vocMapping.beliefs ?? [],
          },
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Generation failed')
      }

      toast.success('Offer generated')
      // Hard reload — router.refresh() doesn't reliably pick up DB changes
      // made directly inside the API route (no revalidatePath path triggers).
      window.location.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  // -------------------------------------------------------------------------
  // Save helpers
  // -------------------------------------------------------------------------

  async function handleSaveText(field: string, value: string) {
    const result = await saveOfferField(offer.id, field, value)
    if (!result.ok) toast.error(result.error)
    return result
  }

  async function handleSaveJson(field: string, value: unknown) {
    const result = await saveOfferJsonField(offer.id, field, value)
    if (!result.ok) toast.error(result.error)
    return result
  }

  async function handleStatusChange(status: string) {
    if (status === 'active') {
      const result = await activateOfferAction(offer.id)
      if (!result.ok) toast.error(result.error)
      else startTransition(() => router.refresh())
      return result
    }
    const result = await handleSaveJson('status', status)
    if (result.ok) startTransition(() => router.refresh())
    return result
  }

  async function handleVocToggle(mapping: VocMappingType) {
    return handleSaveJson('vocMapping', mapping)
  }

  async function handlePricingFieldChange(field: keyof PricingData, value: unknown) {
    const updated = { ...localPricing, [field]: value }
    setLocalPricing(updated)
    return handleSaveJson('pricing', updated)
  }

  async function handleGuaranteeFieldChange(field: keyof GuaranteeData, value: string) {
    const updated = { ...localGuarantee, [field]: value }
    setLocalGuarantee(updated)
    return handleSaveJson('guarantee', updated)
  }

  async function handleJourneySave(journey: CustomerJourneyStage[]) {
    return handleSaveJson('customerJourney', journey)
  }

  async function handleLinkAsset(assetId: string) {
    setAssetPickerOpen(false)
    const result = await handleSaveJson('knowledgeAssetId', assetId)
    if (result.ok) startTransition(() => router.refresh())
  }

  async function handleUnlinkAsset() {
    const result = await handleSaveJson('knowledgeAssetId', null)
    if (result.ok) startTransition(() => router.refresh())
  }

  // -------------------------------------------------------------------------
  // Tab: Positioning
  // -------------------------------------------------------------------------

  const positioningNavItems = [
    { id: 'value-prop', label: 'Value Proposition' },
    { id: 'cta', label: 'Call to Action' },
    { id: 'audience-alignment', label: 'Audience Alignment' },
  ]

  const positioningContent = (
    <div className="flex gap-6">
      <InPageNav
        items={positioningNavItems}
        activeId={activeSection}
        onSelect={setActiveSection}
      />
      <div className="flex-1 flex flex-col gap-8 min-w-0">
        <section id="value-prop">
          <SectionHeading>Value Proposition</SectionHeading>
          <div className="flex flex-col gap-3">
            <InlineField variant="textarea" value={offer.usp ?? ''} onSave={v => handleSaveText('usp', v)} label="USP" icon={Gem} rows={3} />
            <InlineField variant="textarea" value={offer.uspExplanation ?? ''} onSave={v => handleSaveText('uspExplanation', v)} label="USP Explanation" icon={MessageSquare} rows={3} />
          </div>
        </section>

        <SectionDivider />

        <section id="cta">
          <SectionHeading>Call to Action</SectionHeading>
          <div className="flex flex-col gap-3">
            <InlineField variant="input" value={offer.cta ?? ''} onSave={v => handleSaveText('cta', v)} label="CTA" icon={MousePointerClick} />
            <InlineField variant="textarea" value={offer.visualPrompt ?? ''} onSave={v => handleSaveText('visualPrompt', v)} label="Visual Prompt" icon={Image} rows={3} />
          </div>
        </section>

        <SectionDivider />

        <section id="audience-alignment">
          <SectionHeading>Audience Alignment</SectionHeading>
          <VocMapping
            segment={audienceSegment as Parameters<typeof VocMapping>[0]['segment']}
            mapping={offer.vocMapping}
            onToggle={handleVocToggle}
          />
        </section>
      </div>
    </div>
  )

  // -------------------------------------------------------------------------
  // Tab: Commercial
  // -------------------------------------------------------------------------

  const commercialNavItems = [
    { id: 'pricing', label: 'Pricing' },
    { id: 'guarantee', label: 'Guarantee' },
    { id: 'funnel', label: 'Funnel' },
  ]

  const commercialContent = (
    <div className="flex gap-6">
      <InPageNav
        items={commercialNavItems}
        activeId={activeSection}
        onSelect={setActiveSection}
      />
      <div className="flex-1 flex flex-col gap-8 min-w-0">
        <section id="pricing">
          <SectionHeading>Pricing</SectionHeading>
          <div className="flex flex-col gap-3">
            <InlineField variant="input" value={localPricing.currency ?? ''} onSave={v => handlePricingFieldChange('currency', v)} label="Currency" icon={CircleDollarSign} placeholder="GBP" />
            <InlineField variant="input" value={localPricing.mainPrice?.toString() ?? ''} onSave={v => handlePricingFieldChange('mainPrice', v ? Number(v) : null)} label="Price" icon={Banknote} placeholder="3500" />
            <InlineField variant="input" value={localPricing.displayPrice ?? ''} onSave={v => handlePricingFieldChange('displayPrice', v)} label="Display Price" icon={Tag} placeholder="£3,500" />
            <InlineField variant="textarea" value={localPricing.pricingNotes ?? ''} onSave={v => handlePricingFieldChange('pricingNotes', v)} label="Pricing Notes" icon={StickyNote} rows={3} />
            <InlineField variant="textarea" value={localPricing.reframingNote ?? ''} onSave={v => handlePricingFieldChange('reframingNote', v)} label="Price Reframing" icon={RefreshCw} rows={2} />
          </div>
        </section>

        <SectionDivider />

        <section id="guarantee">
          <SectionHeading>Guarantee</SectionHeading>
          <div className="flex flex-col gap-3">
            <InlineField variant="input" value={localGuarantee.type ?? ''} onSave={v => handleGuaranteeFieldChange('type', v)} label="Guarantee Type" icon={Shield} placeholder="satisfaction" />
            <InlineField variant="input" value={localGuarantee.headline ?? ''} onSave={v => handleGuaranteeFieldChange('headline', v)} label="Headline" icon={Type} />
            <InlineField variant="textarea" value={localGuarantee.description ?? ''} onSave={v => handleGuaranteeFieldChange('description', v)} label="Description" icon={FileText} rows={3} />
            <InlineField variant="textarea" value={localGuarantee.terms ?? ''} onSave={v => handleGuaranteeFieldChange('terms', v)} label="Terms" icon={Scale} rows={3} />
            <InlineField variant="textarea" value={localGuarantee.businessRiskNote ?? ''} onSave={v => handleGuaranteeFieldChange('businessRiskNote', v)} label="Business Risk Note" icon={AlertTriangle} rows={2} />
          </div>
        </section>

        <SectionDivider />

        <section id="funnel">
          <SectionHeading>Funnel</SectionHeading>
          <div className="flex flex-col gap-3">
            <InlineField variant="textarea" value={offer.scarcity ?? ''} onSave={v => handleSaveText('scarcity', v)} label="Scarcity / Urgency" icon={Clock} rows={2} />
            <InlineField variant="textarea" value={offer.salesFunnelNotes ?? ''} onSave={v => handleSaveText('salesFunnelNotes', v)} label="Sales Funnel Notes" icon={Filter} rows={3} />
          </div>
        </section>
      </div>
    </div>
  )

  // -------------------------------------------------------------------------
  // Tab: Value Gen
  // -------------------------------------------------------------------------

  const valueGenContent = (
    <EntityOutcomesPanel
      outcomes={outcomes}
      parentType="offer"
      parentId={offer.id}
      brandId={BRAND_ID}
    />
  )

  // -------------------------------------------------------------------------
  // Tab: Journey
  // -------------------------------------------------------------------------

  const journeyContent = (
    <CustomerJourneyPanel
      offerId={offer.id}
      journey={offer.customerJourney}
      onSaveField={handleJourneySave}
    />
  )

  // -------------------------------------------------------------------------
  // Tab: Related Content
  // -------------------------------------------------------------------------

  const relatedContent = (
    <EmptyState
      icon={FileText}
      heading="Related content coming soon"
      description="Content created using this offer will appear here once the content registry is built."
    />
  )

  // -------------------------------------------------------------------------
  // Tabs config
  // -------------------------------------------------------------------------

  const tabs = [
    { id: 'positioning', label: 'Positioning', content: positioningContent },
    { id: 'commercial', label: 'Commercial', content: commercialContent },
    { id: 'value-gen', label: 'Value Gen', content: valueGenContent },
    { id: 'journey', label: 'Journey', content: journeyContent },
    { id: 'related', label: 'Related Content', content: relatedContent },
  ]

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col h-full">
      <PageChrome
        title="Offers"
        action={
          <div className="flex items-center gap-2">
            <IconButton icon={LayoutGrid} label="Cards view" href="/dna/offers/cards" />
            <CreateOfferModal
              open={createOpen}
              onOpenChange={setCreateOpen}
              segments={allSegments}
            />
            <ActionButton icon={Plus} onClick={() => setCreateOpen(true)}>
              New offer
            </ActionButton>
            {isDraft ? (
              <ActionButton
                variant="outline"
                onClick={async () => {
                  const result = await activateOfferAction(offer.id)
                  if (result.ok) {
                    toast.success('Offer marked as active')
                    startTransition(() => router.refresh())
                  } else {
                    toast.error(result.error)
                  }
                }}
              >
                Mark as active
              </ActionButton>
            ) : (
              <ActionButton
                icon={Archive}
                variant="outline"
                onClick={() => setArchiveOpen(true)}
                disabled={activeCount <= 1 && offer.status === 'active'}
                tooltip={activeCount <= 1 && offer.status === 'active' ? 'You must have at least one active offer' : undefined}
              >
                Archive
              </ActionButton>
            )}
          </div>
        }
        subheader={
          <div className="flex items-center gap-3">
            <ItemSwitcher
              items={allOffers}
              currentId={offer.id}
              label="Offer"
              getHref={(o) => `/dna/offers/${o.id}`}
              getLabel={(o) => o.name}
            />
            <StatusBadge
              status={offer.status}
              onChange={handleStatusChange}
              options={OFFER_STATUS_OPTIONS}
            />
          </div>
        }
      />

      <ContentPane padding={false} className="flex flex-col">
        {needsGeneration && (
          <div className="mx-6 mt-4 flex items-center gap-3 rounded-md border border-primary/30 bg-primary/5 px-4 py-3">
            <Sparkles className="h-4 w-4 shrink-0 text-primary" />
            <div className="flex-1 text-sm">
              <p className="font-medium">This offer is ready to generate.</p>
              <p className="text-muted-foreground text-xs mt-0.5">
                Your inputs are saved. The AI will use the audience and VOC mapping to fill in the rest.
              </p>
            </div>
            <ActionButton
              icon={Sparkles}
              onClick={handleGenerateFromInputs}
              loading={generating}
            >
              {generating ? 'Generating…' : 'Generate offer'}
            </ActionButton>
          </div>
        )}

        <div className="flex flex-1 min-h-0">
          <aside className="w-64 shrink-0 flex flex-col gap-4 overflow-y-auto border-r border-border/40 bg-muted/30 px-6 py-6">
            <InlineField
              variant="input"
              value={offer.name}
              onSave={v => handleSaveText('name', v)}
              label="Name"
              icon={Tag}
              labelBg="bg-muted/30"
            />

            <SelectField
              label="Type"
              icon={Tag}
              labelBg="bg-muted/30"
              value={offer.offerType}
              options={Object.entries(OFFER_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
              onSave={async (v) => {
                await handleSaveJson('offerType', v)
                return { ok: true }
              }}
            />

            <InlineField
              variant="textarea"
              value={offer.overview ?? ''}
              onSave={v => handleSaveText('overview', v)}
              label="Overview"
              icon={FileText}
              rows={4}
              labelBg="bg-muted/30"
            />

            <SectionDivider />

            {/* Primary audience link */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold capitalize tracking-wide text-muted-foreground">Audience</span>
              {audienceSegment ? (
                <Link
                  href={`/dna/audience-segments/${audienceSegment.id}`}
                  className="text-sm hover:underline underline-offset-2 flex items-center gap-1"
                >
                  {audienceSegment.segmentName}
                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground italic">No audience linked</span>
              )}
            </div>

            {/* Knowledge asset link */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold capitalize tracking-wide text-muted-foreground">Knowledge Asset</span>
              {linkedAsset ? (
                <div className="flex items-center gap-1">
                  <Link
                    href={`/dna/knowledge-assets/${linkedAsset.id}`}
                    className="text-sm hover:underline underline-offset-2 flex items-center gap-1 flex-1 min-w-0"
                  >
                    <span className="truncate">{linkedAsset.name}</span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
                  </Link>
                  <button
                    type="button"
                    onClick={handleUnlinkAsset}
                    className="text-muted-foreground hover:text-destructive transition-colors p-0.5"
                    title="Unlink"
                  >
                    <Unlink className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <ActionButton
                  icon={LinkIcon}
                  variant="outline"
                  className="w-full justify-start text-xs"
                  onClick={() => setAssetPickerOpen(true)}
                >
                  Link IP
                </ActionButton>
              )}
            </div>
          </aside>

          <div className="flex-1 min-w-0 flex flex-col min-h-0 px-6 py-6">
            <TabbedPane
              className="flex-1 min-h-0"
              tabs={tabs}
              defaultTab={defaultTab ?? 'positioning'}
            />
          </div>
        </div>
      </ContentPane>

      {/* Knowledge asset picker modal */}
      <Modal open={assetPickerOpen} onOpenChange={setAssetPickerOpen} title="Link Knowledge Asset">
        {knowledgeAssets.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No knowledge assets yet —{' '}
            <Link href="/dna/knowledge-assets" className="underline underline-offset-2 hover:text-foreground">
              create one first
            </Link>
            .
          </p>
        ) : (
          <div className="flex flex-col max-h-[300px] overflow-y-auto">
            {knowledgeAssets.map(asset => (
              <ListItem
                key={asset.id}
                as="button"
                onClick={() => handleLinkAsset(asset.id)}
                divider={false}
                trailing={
                  <TypeBadge hue="neutral" label={asset.kind} />
                }
              >
                <span className="text-sm">{asset.name}</span>
              </ListItem>
            ))}
          </div>
        )}
      </Modal>

      <ArchiveItemModal
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        itemName={offer.name}
        itemType="offer"
        dependencyCheck={() => checkOfferDependents(offer.id)}
        onConfirm={async () => {
          const result = await archiveOfferAction(offer.id)
          if (!result.ok) return result
          // Adapt offer's redirectTo shape to the canonical nextId shape
          const nextId = result.data.redirectTo?.startsWith('/dna/offers/')
            ? result.data.redirectTo.slice('/dna/offers/'.length)
            : null
          return { ok: true as const, data: { nextId } }
        }}
        onArchived={(nextId) => {
          router.push(nextId ? `/dna/offers/${nextId}` : '/dna/offers')
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
