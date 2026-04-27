'use client'

import {
  Building2, User, Briefcase, MapPin, Calendar,
  Globe, Mail, FileText, Link2, AtSign, NotebookPen,
} from 'lucide-react'
import { PageHeader } from '@/components/page-header'
import { ContentPane } from '@/components/content-pane'
import { SectionCard } from '@/components/section-card'
import { InlineField } from '@/components/inline-field'
import {
  saveBusinessOverviewField,
  saveBusinessOverviewJson,
} from '@/app/actions/dna-singular'
import type { DnaBusinessOverview } from '@/lib/db/schema/dna/business-overview'

interface BusinessOverviewViewProps {
  data: DnaBusinessOverview
}

export function BusinessOverviewView({ data }: BusinessOverviewViewProps) {
  function makeFieldSaver(field: string) {
    return async (value: string) => {
      const result = await saveBusinessOverviewField(field, value || null)
      return result
    }
  }

  const social = (data.socialHandles ?? {}) as Record<string, string>

  function makeSocialSaver(key: string) {
    return async (value: string) => {
      const current = (data.socialHandles ?? {}) as Record<string, string | null>
      const result = await saveBusinessOverviewJson('socialHandles', {
        ...current,
        [key]: value || null,
      })
      return result
    }
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Business Overview"
        subtitle="The factual foundation — what the business is, what it does, and where it operates."
      />

      <ContentPane>
        <div className="flex gap-6">
          {/* Left — summary card */}
          <aside className="w-72 shrink-0 self-start sticky top-0">
            <div className="rounded-lg border bg-card p-6 flex flex-col gap-4">
              {/* Business name — prominent */}
              <div>
                <h2 className="text-lg font-display font-semibold tracking-tight">
                  {data.businessName || <span className="text-muted-foreground/50">Business name</span>}
                </h2>
                {(data.vertical || data.specialism) && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {[data.vertical, data.specialism].filter(Boolean).join(' — ')}
                  </p>
                )}
              </div>

              {/* Quick facts */}
              <div className="flex flex-col gap-2 text-sm">
                {data.businessModel && (
                  <SummaryRow icon={Briefcase} label="Model" value={data.businessModel} />
                )}
                {data.stage && (
                  <SummaryRow icon={Briefcase} label="Stage" value={data.stage} />
                )}
                {data.foundingYear && (
                  <SummaryRow icon={Calendar} label="Founded" value={data.foundingYear.toString()} />
                )}
                {data.geographicFocus && (
                  <SummaryRow icon={MapPin} label="Focus" value={data.geographicFocus} />
                )}
                {data.ownerName && (
                  <SummaryRow icon={User} label="Owner" value={data.ownerName} />
                )}
              </div>

              {/* Short description */}
              {data.shortDescription && (
                <p className="text-[13px] text-muted-foreground leading-relaxed border-t pt-4">
                  {data.shortDescription}
                </p>
              )}

              {/* Links */}
              {(data.websiteUrl || data.primaryEmail) && (
                <div className="flex flex-col gap-1 text-[13px] border-t pt-4">
                  {data.websiteUrl && (
                    <a href={data.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors truncate">
                      {data.websiteUrl.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                  {data.primaryEmail && (
                    <span className="text-muted-foreground truncate">{data.primaryEmail}</span>
                  )}
                </div>
              )}

              {/* Empty state nudge */}
              {!data.businessName && !data.vertical && (
                <p className="text-xs text-muted-foreground/60 text-center py-2">
                  Edit the fields on the right to build your summary.
                </p>
              )}
            </div>
          </aside>

          {/* Right — editable sections */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">
            <SectionCard title="Core Identity">
              <div className="grid grid-cols-2 gap-4">
                <InlineField
                  variant="input"
                  label="Business name"
                  icon={Building2}
                  value={data.businessName}
                  placeholder="Trading name"
                  onSave={makeFieldSaver('businessName')}
                />
                <InlineField
                  variant="input"
                  label="Legal name"
                  icon={Building2}
                  value={data.legalName}
                  placeholder="If different from trading name"
                  onSave={makeFieldSaver('legalName')}
                />
                <InlineField
                  variant="input"
                  label="Owner name"
                  icon={User}
                  value={data.ownerName}
                  placeholder="Owner's name"
                  onSave={makeFieldSaver('ownerName')}
                />
                <InlineField
                  variant="input"
                  label="Founding year"
                  icon={Calendar}
                  value={data.foundingYear?.toString() ?? null}
                  placeholder="e.g. 2020"
                  onSave={makeFieldSaver('foundingYear')}
                />
              </div>
            </SectionCard>

            <SectionCard title="What It Does">
              <div className="flex flex-col gap-4">
                <InlineField
                  variant="input"
                  label="Vertical"
                  icon={Briefcase}
                  value={data.vertical}
                  placeholder="Industry or sector, e.g. Brand strategy consulting"
                  onSave={makeFieldSaver('vertical')}
                />
                <InlineField
                  variant="textarea"
                  label="Specialism"
                  icon={Briefcase}
                  value={data.specialism}
                  placeholder="What specifically the business does within that vertical"
                  rows={2}
                  onSave={makeFieldSaver('specialism')}
                />
                <div className="grid grid-cols-2 gap-4">
                  <InlineField
                    variant="input"
                    label="Business model"
                    icon={Briefcase}
                    value={data.businessModel}
                    placeholder="e.g. B2B service, SaaS, productised service"
                    onSave={makeFieldSaver('businessModel')}
                  />
                  <InlineField
                    variant="input"
                    label="Stage"
                    icon={Briefcase}
                    value={data.stage}
                    placeholder="e.g. bootstrapped solo, early growth"
                    onSave={makeFieldSaver('stage')}
                  />
                </div>
                <InlineField
                  variant="input"
                  label="Geographic focus"
                  icon={MapPin}
                  value={data.geographicFocus}
                  placeholder="e.g. UK-based, global clients"
                  onSave={makeFieldSaver('geographicFocus')}
                />
              </div>
            </SectionCard>

            <SectionCard title="Descriptions">
              <div className="flex flex-col gap-4">
                <InlineField
                  variant="textarea"
                  label="Short description"
                  icon={FileText}
                  value={data.shortDescription}
                  placeholder="1-2 sentence overview. Used in prompts as business context."
                  rows={2}
                  onSave={makeFieldSaver('shortDescription')}
                />
                <InlineField
                  variant="textarea"
                  label="Full description"
                  icon={FileText}
                  value={data.fullDescription}
                  placeholder="Longer background — origin story, context, what makes it distinct. Not marketing; factual context for the system."
                  rows={5}
                  onSave={makeFieldSaver('fullDescription')}
                />
              </div>
            </SectionCard>

            <SectionCard title="Contact & Social">
              <div className="grid grid-cols-2 gap-4">
                <InlineField
                  variant="input"
                  label="Website"
                  icon={Globe}
                  value={data.websiteUrl}
                  placeholder="https://..."
                  onSave={makeFieldSaver('websiteUrl')}
                />
                <InlineField
                  variant="input"
                  label="Primary email"
                  icon={Mail}
                  value={data.primaryEmail}
                  placeholder="hello@..."
                  onSave={makeFieldSaver('primaryEmail')}
                />
                <InlineField
                  variant="input"
                  label="LinkedIn"
                  icon={Link2}
                  value={social.linkedin ?? null}
                  placeholder="LinkedIn URL or handle"
                  onSave={makeSocialSaver('linkedin')}
                />
                <InlineField
                  variant="input"
                  label="Twitter / X"
                  icon={AtSign}
                  value={social.twitter ?? null}
                  placeholder="@handle"
                  onSave={makeSocialSaver('twitter')}
                />
                <InlineField
                  variant="input"
                  label="Instagram"
                  icon={AtSign}
                  value={social.instagram ?? null}
                  placeholder="@handle"
                  onSave={makeSocialSaver('instagram')}
                />
                <InlineField
                  variant="input"
                  label="Other"
                  icon={AtSign}
                  value={social.other ?? null}
                  placeholder="Any other social link"
                  onSave={makeSocialSaver('other')}
                />
              </div>
            </SectionCard>

            <SectionCard title="Notes">
              <InlineField
                variant="textarea"
                label="Internal notes"
                icon={NotebookPen}
                value={data.notes}
                placeholder="Anything that doesn't fit above — context, reminders, working notes."
                rows={4}
                onSave={makeFieldSaver('notes')}
              />
            </SectionCard>
          </div>
        </div>
      </ContentPane>
    </div>
  )
}

function SummaryRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="text-foreground truncate">{value}</span>
    </div>
  )
}
